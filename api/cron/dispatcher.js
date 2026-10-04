import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

// Pastikan koneksi keluar ke Meta Graph API memprioritaskan IPv4 untuk menghindari ETIMEDOUT / EACCES pada IPv6
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = { maxDuration: 10 };

export default async function handler(req, res) {
  const isDev = process.env.NODE_ENV !== 'production';
  const cronKey = (process.env.CRON_SECRET_KEY || '').trim();
  const urlMatches = req.url ? req.url.match(/[?&]key=([^&#]+)/) : null;
  const rawKeyFromUrl = urlMatches ? decodeURIComponent(urlMatches[1]).trim() : '';
  const queryKey = (req.query?.key || rawKeyFromUrl).trim();
  const authHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  const isAuth = (cronKey && (authHeader === cronKey || queryKey === cronKey));
  if (!isAuth && !isDev) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const start = Date.now();
  try {
    // Phase 1: Poll active targets (max 2, hemat time budget 10s)
    const { data: active } = await supabase
      .from('post_targets')
      .select('*, connected_accounts(*), posts(*)')
      .eq('status', 'IN_PROGRESS')
      .limit(2);

    if (active?.length) {
      for (const t of active) {
        if (Date.now() - start > 7000) break; // time budget guard
        await pollTarget(t);
      }
    }

    // Phase 2 hanya jalan kalau masih ada time budget
    if (Date.now() - start > 7000) {
      return res.status(200).json({ success: true, durationMs: Date.now() - start, skipped: 'phase2_time_budget' });
    }

    const { data: pendingTargets } = await supabase
      .from('post_targets')
      .select('*, connected_accounts(*), posts(*)')
      .eq('status', 'PENDING')
      .limit(2);

    if (pendingTargets && pendingTargets.length > 0) {
      for (const t of pendingTargets) {
        if (Date.now() - start > 8000) break; // hard guard
        if (t.posts) {
          await supabase.from('posts').update({ status: 'PROCESSING' }).eq('id', t.posts.id);
          await initTarget(t.posts, t);
          await sleep(500); // ponytail: 2s terlalu boros, 500ms cukup
        }
      }
    } else {
      const { data: due } = await supabase
        .from('posts')
        .select('*, post_targets(*, connected_accounts(*))')
        .in('status', ['SCHEDULED', 'PROCESSING'])
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(1);

      if (due?.length) {
        const post = due[0];
        await supabase.from('posts').update({ status: 'PROCESSING' }).eq('id', post.id);

        for (const t of post.post_targets) {
          if (t.status === 'PENDING') {
            await initTarget(post, t);
              await sleep(500);
          }
        }

        await syncParentStatus(post.id);
      }
    }

    return res.status(200).json({ success: true, durationMs: Date.now() - start });
  } catch (err) {
    console.error('Dispatcher error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function initTarget(post, target) {
  const token = await getValidToken(target.connected_accounts);
  let mediaUrl = post.gdrive_lh3_url || post.gdrive_stream_url;

  // Jika URL media berupa relative path lokal atau memiliki file tersimpan di disk lokal
  let localFilePath = null;
  if (mediaUrl && mediaUrl.startsWith('/')) {
    localFilePath = path.join(process.cwd(), 'public', mediaUrl.replace(/^\//, ''));
    if (!fs.existsSync(localFilePath)) {
      localFilePath = path.join(process.cwd(), mediaUrl.replace(/^\//, ''));
    }
  }

  // Cek apakah ada file lokal di generated-promo yang cocok
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    const promoDir = path.join(process.cwd(), 'public', 'generated-promo');
    if (fs.existsSync(promoDir)) {
      const files = fs.readdirSync(promoDir);
      // Cocokkan berdasarkan nama file dari url jika ada
      const match = files.find((f) => mediaUrl?.includes(f) || (post.title && f.endsWith('.mp4')));
      if (match) {
        localFilePath = path.join(promoDir, match);
      }
    }
  }

  // 0. MODE DEVELOPMENT / DRY-RUN SIMULASI
  // Jika postingan di-flag sebagai simulasi atau env DISPATCHER_DRY_RUN=true,
  // maka jadwal, upload GDrive, dan riwayat dieksekusi 100% tanpa menembak endpoint live OpenAPI
  const isSimulation = Boolean(
    post.media_metadata?.is_simulation ||
    process.env.DISPATCHER_DRY_RUN === 'true'
  );

  if (isSimulation) {
    console.log(`[SIMULATION MODE] Target ${target.platform} di-simulate SUCCESS tanpa kirim ke platform nyata.`);
    await supabase.from('post_targets').update({
      status: 'SUCCESS',
      remote_post_id: `sim-${Date.now()}-${target.platform}`,
      executed_at: new Date().toISOString(),
      error_payload: {
        mode: 'SIMULATION_DEV_MODE',
        message: 'Mode simulasi pengujian aktif: File tersimpan di Google Drive & jadwal teruji tanpa menembak live API platform.',
        gdrive_file_id: post.gdrive_file_id,
        gdrive_stream_url: post.gdrive_stream_url,
      },
    }).eq('id', target.id);
    return;
  }

  try {
    if (target.platform === 'instagram') {
      const isIgUserToken = token.startsWith('IGAA');
      const apiHost = isIgUserToken ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
      const bodyPayload = {
        caption: post.content_text,
        access_token: token,
      };

      if (post.media_type === 'VIDEO') {
        bodyPayload.media_type = 'REELS';
        // Meta crawler tidak selalu mengikuti HTTP 303 redirect dari drive.google.com/uc.
        // Direct link drive.usercontent.google.com langsung mengembalikan HTTP 200 dengan header Content-Type: video/mp4!
        if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
          bodyPayload.video_url = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download&confirm=t`;
        } else {
          bodyPayload.video_url = mediaUrl;
        }
        bodyPayload.share_to_feed = true;
      } else {
        // Untuk single image, API Instagram Graph hanya menerima image_url (tidak boleh ada media_type: IMAGE)
        bodyPayload.image_url = mediaUrl;
      }

      const r = await fetch(`${apiHost}/${target.connected_accounts.platform_user_id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const d = await r.json();
      if (!d.id) throw new Error(JSON.stringify(d.error || d));
      await supabase.from('post_targets').update({
        status: 'IN_PROGRESS', async_container_id: d.id,
        executed_at: new Date().toISOString(),
        last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
    } else if (target.platform === 'tiktok') {
      // TikTok Open API: Ambil buffer video dari local path, direct Google Drive, atau streaming URL
      let videoBuffer;
      if (localFilePath && fs.existsSync(localFilePath)) {
        videoBuffer = fs.readFileSync(localFilePath);
      } else {
        let downloadUrl = mediaUrl;
        if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
          downloadUrl = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download&confirm=t`;
        } else if (mediaUrl && !mediaUrl.startsWith('http')) {
          downloadUrl = `http://localhost:5173${mediaUrl}`;
        }

        if (!downloadUrl) throw new Error('Video untuk TikTok tidak ditemukan');
        const videoRes = await fetch(downloadUrl);
        if (!videoRes.ok) throw new Error(`Gagal mengunduh video untuk TikTok (${videoRes.status})`);
        videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      }
      const videoSize = videoBuffer.length;

      const initR = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_info: {
            title: post.content_text.slice(0, 150),
            privacy_level: 'SELF_ONLY', // Mendukung akun Sandbox / Private
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize,
            chunk_size: videoSize,
            total_chunk_count: 1,
          },
        }),
      });
      const initData = await initR.json();
      if (!initData.data?.publish_id || !initData.data?.upload_url) {
        const errBody = initData.error || initData;
        const errStr = JSON.stringify(errBody);
        // ponytail: spam_risk bukan error permanen — retry nanti
        if (errStr.includes('spam_risk') || errStr.includes('rate_limit')) {
          await supabase.from('post_targets').update({
            status: 'PENDING',
            error_payload: { message: `TikTok rate limited, retry otomatis: ${errStr}`, retry_after: new Date(Date.now() + 3600000).toISOString() },
            last_polled_at: new Date().toISOString(),
          }).eq('id', target.id);
          return;
        }
        throw new Error(errStr);
      }

      // Upload file byte stream ke TikTok Upload Gateway
      const uploadR = await fetch(initData.data.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}`,
        },
        body: videoBuffer,
      });

      if (!uploadR.ok && uploadR.status !== 201) {
        throw new Error(`Gagal mengunggah video stream ke TikTok Gateway (${uploadR.status})`);
      }

      await supabase.from('post_targets').update({
        status: 'IN_PROGRESS',
        async_container_id: initData.data.publish_id,
        executed_at: new Date().toISOString(),
        last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
    } else if (target.platform === 'facebook_page') {
      const pageId = target.connected_accounts.platform_user_id;
      let postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      let postBody = { message: post.content_text, access_token: token };

      if (post.media_type === 'VIDEO') {
        postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/videos`;
        // Gunakan direct download URL Google Drive yang mengembalikan HTTP 200 stream MP4
        let videoFileUrl = mediaUrl;
        if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
          videoFileUrl = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download&confirm=t`;
        }
        postBody = {
          description: post.content_text,
          file_url: videoFileUrl,
          access_token: token,
        };
      } else if (post.media_type === 'IMAGE' && mediaUrl) {
        postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        let imgUrl = mediaUrl;
        if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
          imgUrl = post.gdrive_lh3_url || `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download`;
        }
        postBody = { caption: post.content_text, url: imgUrl, access_token: token };
      }

      const r = await fetch(postEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody),
      });
      const d = await r.json();
      if (!d.id) throw new Error(JSON.stringify(d.error || d));

      await supabase.from('post_targets').update({
        status: 'SUCCESS',
        error_payload: null,
        external_post_id: d.id,
        external_post_url: `https://www.facebook.com/${d.id}`,
        executed_at: new Date().toISOString(),
      }).eq('id', target.id);
    }
  } catch (err) {
    await supabase.from('post_targets').update({
      status: 'FAILED', error_payload: { message: err.message }, executed_at: new Date().toISOString(),
    }).eq('id', target.id);
  }
}

async function pollTarget(target) {
  // Cek apakah target baru saja dicek dalam interval backoff (minimal 15 detik) untuk menghemat rate limit & CPU
  if (target.last_polled_at) {
    const elapsedSinceLastPoll = Date.now() - new Date(target.last_polled_at).getTime();
    if (elapsedSinceLastPoll < 15000) {
      return; // Tunggu siklus heartbeat berikutnya
    }
  }

  const token = await getValidToken(target.connected_accounts);

  try {
    if (target.platform === 'instagram') {
      const isIgUserToken = token.startsWith('IGAA');
      const apiHost = isIgUserToken ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
      const r = await fetch(`${apiHost}/${target.async_container_id}?fields=status_code,status,error_message&access_token=${token}`);
      const d = await r.json();

      if (d.status_code === 'FINISHED') {
        const pub = await fetch(`${apiHost}/${target.connected_accounts.platform_user_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: target.async_container_id, access_token: token }),
        });
        const pd = await pub.json();
        if (!pd.id) throw new Error(JSON.stringify(pd.error || pd));
        await supabase.from('post_targets').update({
          status: 'SUCCESS', error_payload: null, external_post_id: pd.id, executed_at: new Date().toISOString(),
        }).eq('id', target.id);
      } else if (d.status_code === 'ERROR') {
        const errMsg = d.error_message || d.status || 'Meta transcoding failed';
        // Jika error karena URL tidak accessible, retry dengan lh3 URL jika tersedia
        if (errMsg.includes('not accessible') || errMsg.includes('download')) {
          await supabase.from('post_targets').update({
            status: 'PENDING',
            error_payload: { message: `URL retry: ${errMsg}`, retry_count: (target.polling_attempts || 0) + 1 },
            last_polled_at: new Date().toISOString(),
          }).eq('id', target.id);
          return;
        }
        throw new Error(errMsg);
      } else {
        // Hitung durasi nyata sejak container dibuat (executed_at di-set saat initTarget)
        const initiatedTime = target.executed_at || target.last_polled_at || new Date().toISOString();
        const minutesElapsed = (Date.now() - new Date(initiatedTime).getTime()) / 60000;
        
        // Timeout: 30 menit (video besar butuh waktu lama di Meta)
        if (minutesElapsed > 30) {
          // Final-check: cek sekali lagi sebelum mark FAILED
          const recheck = await fetch(`${apiHost}/${target.async_container_id}?fields=status_code&access_token=${token}`);
          const rc = await recheck.json();
          if (rc.status_code === 'FINISHED') {
            const pub = await fetch(`${apiHost}/${target.connected_accounts.platform_user_id}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: target.async_container_id, access_token: token }),
            });
            const pd = await pub.json();
            if (pd.id) {
              await supabase.from('post_targets').update({
                status: 'SUCCESS', error_payload: null, external_post_id: pd.id, executed_at: new Date().toISOString(),
              }).eq('id', target.id);
              return;
            }
          }
          throw new Error('Meta transcoding timeout (>30 menit waktu nyata)');
        }

        await supabase.from('post_targets').update({
          polling_attempts: (target.polling_attempts || 0) + 1,
          last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
      }
    } else if (target.platform === 'tiktok') {
      const r = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: target.async_container_id }),
      });
      const d = await r.json();

      // Jika terkena temporary rate limit, jangan gagalkan target — beri jeda sampai tick cron berikutnya
      if (d.error?.code === 'rate_limit_exceeded') {
        console.warn('[TIKTOK RATE LIMIT] Temporary rate limit exceeded, waiting for next heartbeat...');
        await supabase.from('post_targets').update({
          last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
        return;
      }

      const st = d.data?.status;
      if (st === 'PUBLISH_COMPLETE') {
        await supabase.from('post_targets').update({
          status: 'SUCCESS', error_payload: null, external_post_id: d.data.publicaly_available_post_id?.[0] || target.async_container_id, executed_at: new Date().toISOString(),
        }).eq('id', target.id);
      } else if (st === 'FAILED') {
        const reason = d.data?.fail_reason || 'TikTok publish failed';
        // ponytail: spam_risk = retry, bukan permanent fail
        if (reason.includes('spam_risk') || reason.includes('rate_limit')) {
          await supabase.from('post_targets').update({
            status: 'PENDING',
            error_payload: { message: `TikTok rate limited, retry otomatis: ${reason}`, retry_after: new Date(Date.now() + 3600000).toISOString() },
            last_polled_at: new Date().toISOString(),
          }).eq('id', target.id);
          return;
        }
        throw new Error(reason);
      } else {
        const initiatedTime = target.executed_at || target.last_polled_at || new Date().toISOString();
        const minutesElapsed = (Date.now() - new Date(initiatedTime).getTime()) / 60000;
        if (minutesElapsed > 30) {
          throw new Error('TikTok transcoding timeout (>30 menit waktu nyata)');
        }
        await supabase.from('post_targets').update({
          polling_attempts: (target.polling_attempts || 0) + 1,
          last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
      }
    }
  } catch (err) {
    // ponytail: JANGAN overwrite executed_at — itu timestamp creation, bukan error
    await supabase.from('post_targets').update({
      status: 'FAILED', error_payload: { message: err.message, failed_at: new Date().toISOString() },
    }).eq('id', target.id);
  }

  await syncParentStatus(target.post_id);
}

async function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error('ENCRYPTION_MASTER_KEY is not defined');
  try {
    const { data, error } = await supabase.rpc('decrypt_secret', {
      ciphertext, secret_key: key,
    });
    if (!error && data) return data;
  } catch (err) {
    console.warn('decrypt_secret RPC bypass:', err.message);
  }
  // Fallback: If not encrypted or base64
  try {
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf8');
    if (decoded && /^EAA|IGAA|[a-zA-Z0-9_-]{20,}/.test(decoded)) return decoded;
  } catch {}
  return ciphertext;
}

async function getValidToken(account) {
  let token = await decrypt(account.access_token_encrypted);
  if (!token) return '';

  // Khusus TikTok: Cek apakah token expired atau mendekati expired
  if (account.platform === 'tiktok' && account.refresh_token_encrypted) {
    const isExpired = account.token_expires_at && (new Date(account.token_expires_at).getTime() - Date.now() < 300_000); // <5 menit
    if (isExpired) {
      try {
        const refreshToken = await decrypt(account.refresh_token_encrypted);
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;

        if (refreshToken && clientKey && clientSecret) {
          const bodyParams = new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
          });

          const refRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });
          const refData = await refRes.json();
          const newAccessToken = refData.access_token || refData.data?.access_token;
          const newRefreshToken = refData.refresh_token || refData.data?.refresh_token || refreshToken;
          const expiresIn = refData.expires_in || refData.data?.expires_in || 86400;

          if (newAccessToken) {
            token = newAccessToken;
            let encToken = newAccessToken;
            let encRefToken = newRefreshToken;
            try {
              if (encryptionKey) {
                const { data: e1 } = await supabase.rpc('encrypt_secret', { plain_text: newAccessToken, secret_key: encryptionKey });
                if (e1) encToken = e1;
                const { data: e2 } = await supabase.rpc('encrypt_secret', { plain_text: newRefreshToken, secret_key: encryptionKey });
                if (e2) encRefToken = e2;
              }
            } catch {}

            await supabase.from('connected_accounts').update({
              access_token_encrypted: encToken,
              refresh_token_encrypted: encRefToken,
              token_expires_at: new Date(Date.now() + (expiresIn * 1000)).toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', account.id);
          }
        }
      } catch (refErr) {
        console.warn('[TIKTOK TOKEN REFRESH] Error refreshing token:', refErr.message);
      }
    }
  }

  return token;
}

async function syncParentStatus(postId) {
  try {
    const { data: targets } = await supabase
      .from('post_targets')
      .select('status')
      .eq('post_id', postId);
    if (!targets?.length) return;
    const stillActive = targets.some((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    if (stillActive) return;
    const anySuccess = targets.some((t) => t.status === 'SUCCESS');
    await supabase.from('posts').update({ status: anySuccess ? 'COMPLETED' : 'FAILED' }).eq('id', postId);
  } catch {}
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
