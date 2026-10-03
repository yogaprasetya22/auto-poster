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
  const isAuth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET_KEY}`;
  if (!isAuth && !isDev) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const start = Date.now();
  try {
    // Phase 1: Poll active targets
    const { data: active } = await supabase
      .from('post_targets')
      .select('*, connected_accounts(*), posts(*)')
      .eq('status', 'IN_PROGRESS')
      .limit(4);

    if (active?.length) {
      for (const t of active) await pollTarget(t);
    }

    // Phase 2: Pick up scheduled posts or any targets that are currently PENDING (e.g. from Retry)
    const { data: pendingTargets } = await supabase
      .from('post_targets')
      .select('*, connected_accounts(*), posts(*)')
      .eq('status', 'PENDING')
      .limit(4);

    if (pendingTargets && pendingTargets.length > 0) {
      for (const t of pendingTargets) {
        if (t.posts) {
          await supabase.from('posts').update({ status: 'PROCESSING' }).eq('id', t.posts.id);
          await initTarget(t.posts, t);
          await sleep(2000); // stagger jitter
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
            await sleep(2000); // stagger jitter
          }
        }

        // Sync status parent post jika seluruh target sudah selesai
        const { data: updatedTargets } = await supabase
          .from('post_targets')
          .select('status')
          .eq('post_id', post.id);

        if (updatedTargets && updatedTargets.length > 0) {
          const stillPending = updatedTargets.some(
            (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
          );
          if (!stillPending) {
            const anySuccess = updatedTargets.some((t) => t.status === 'SUCCESS');
            await supabase
              .from('posts')
              .update({ status: anySuccess ? 'COMPLETED' : 'FAILED' })
              .eq('id', post.id);
          }
        }
      }
    }

    return res.status(200).json({ success: true, durationMs: Date.now() - start });
  } catch (err) {
    console.error('Dispatcher error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function initTarget(post, target) {
  const token = await decrypt(target.connected_accounts.access_token_encrypted);
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

  // 0. Safety Guard: Cek Batasan Posting Harian (Maksimal 5 posting/hari per akun untuk mencegah spam risk OpenAPI)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dailyCount } = await supabase
    .from('post_targets')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', target.account_id)
    .in('status', ['SUCCESS', 'IN_PROGRESS'])
    .gte('executed_at', oneDayAgo);

  const DAILY_MAX = 5;
  if (dailyCount && dailyCount >= DAILY_MAX) {
    throw new Error(
      `Batas aman posting harian tercapai (${dailyCount}/${DAILY_MAX} posting dalam 24 jam). Eksekusi ditahan untuk mencegah pemblokiran spam oleh ${target.platform.toUpperCase()}.`
    );
  }

  // 0.1 MODE DEVELOPMENT / DRY-RUN SIMULASI
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
          bodyPayload.video_url = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download`;
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
        status: 'IN_PROGRESS', async_container_id: d.id, last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
    } else if (target.platform === 'tiktok') {
      // TikTok Open API: Ambil buffer video dari local path atau via fetch URL
      let videoBuffer;
      if (localFilePath && fs.existsSync(localFilePath)) {
        videoBuffer = fs.readFileSync(localFilePath);
      } else if (mediaUrl) {
        const fetchUrl = mediaUrl.startsWith('http') ? mediaUrl : `http://localhost:5173${mediaUrl}`;
        const videoRes = await fetch(fetchUrl);
        if (!videoRes.ok) throw new Error(`Gagal mengunduh video untuk TikTok (${videoRes.status})`);
        videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      } else {
        throw new Error('Video untuk TikTok tidak ditemukan');
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
        throw new Error(JSON.stringify(initData.error || initData));
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
        last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
    } else if (target.platform === 'facebook_page') {
      const pageId = target.connected_accounts.platform_user_id;
      let postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      let postBody = { message: post.content_text, access_token: token };

      if (post.media_type === 'IMAGE' && mediaUrl) {
        postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
        postBody = { caption: post.content_text, url: mediaUrl, access_token: token };
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

  const token = await decrypt(target.connected_accounts.access_token_encrypted);

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
        const errMsg = d.error_message || d.status || 'Meta transcoding failed (Spesifikasi video tidak didukung atau URL tidak dapat diunduh server Meta)';
        throw new Error(errMsg);
      } else {
        // Hitung durasi nyata sejak container dibuat / diproses
        const initiatedTime = target.executed_at || target.created_at || new Date().toISOString();
        const minutesElapsed = (Date.now() - new Date(initiatedTime).getTime()) / 60000;
        
        // Timeout realistis: 15 menit waktu nyata Meta
        if (minutesElapsed > 15) {
          throw new Error('Meta transcoding timeout (>15 menit waktu nyata)');
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
      const st = d.data?.status;
      if (st === 'PUBLISH_COMPLETE') {
        await supabase.from('post_targets').update({
          status: 'SUCCESS', error_payload: null, external_post_id: d.data.publicaly_available_post_id?.[0] || target.async_container_id, executed_at: new Date().toISOString(),
        }).eq('id', target.id);
      } else if (st === 'FAILED') {
        throw new Error(d.data?.fail_reason || 'TikTok publish failed');
      } else {
        const initiatedTime = target.executed_at || target.created_at || new Date().toISOString();
        const minutesElapsed = (Date.now() - new Date(initiatedTime).getTime()) / 60000;
        if (minutesElapsed > 15) {
          throw new Error('TikTok transcoding timeout (>15 menit waktu nyata)');
        }
        await supabase.from('post_targets').update({
          polling_attempts: (target.polling_attempts || 0) + 1,
          last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
      }
    }
  } catch (err) {
    await supabase.from('post_targets').update({
      status: 'FAILED', error_payload: { message: err.message }, executed_at: new Date().toISOString(),
    }).eq('id', target.id);
  }

  // Sinkronkan status parent post
  try {
    const { data: updatedTargets } = await supabase
      .from('post_targets')
      .select('status')
      .eq('post_id', target.post_id);

    if (updatedTargets && updatedTargets.length > 0) {
      const stillPending = updatedTargets.some(
        (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS'
      );
      if (!stillPending) {
        const anySuccess = updatedTargets.some((t) => t.status === 'SUCCESS');
        await supabase
          .from('posts')
          .update({ status: anySuccess ? 'COMPLETED' : 'FAILED' })
          .eq('id', target.post_id);
      }
    }
  } catch {}
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

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
