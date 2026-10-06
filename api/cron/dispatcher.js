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
  const cronKey = (process.env.CRON_SECRET_KEY || process.env.CRON_SECRET || '').trim();
  const urlMatches = req.url ? req.url.match(/[?&]key=([^&#]+)/) : null;
  const rawKeyFromUrl = urlMatches ? decodeURIComponent(urlMatches[1]).trim() : '';
  const queryKey = (req.query?.key || rawKeyFromUrl).trim();
  const authHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  const isAuth = (cronKey && (authHeader === cronKey || queryKey === cronKey));
  if (!isAuth && !isDev) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const start = Date.now();
  let processed = 0, polled = 0; // ponytail: diagnostic counters
  try {
    // Failsafe GC: sapu video usang (>1 jam) di bucket transit
    sweepOrphanedTransitVideos();

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
        polled++;
      }
    }

    // Phase 2 hanya jalan kalau masih ada time budget
    if (Date.now() - start > 7000) {
      return res.status(200).json({ success: true, durationMs: Date.now() - start, polled, skipped: 'phase2_time_budget' });
    }

    const { data: pendingTargets } = await supabase
      .from('post_targets')
      .select('*, connected_accounts(*), posts(*)')
      .eq('status', 'PENDING')
      .limit(2);

    if (pendingTargets && pendingTargets.length > 0) {
      const touchedPostIds = new Set();
      for (const t of pendingTargets) {
        if (Date.now() - start > 8000) break; // hard guard
        if (t.posts) {
          touchedPostIds.add(t.posts.id);
          await supabase.from('posts').update({ status: 'PROCESSING' }).eq('id', t.posts.id);
          await initTarget(t.posts, t);
          processed++;
          await sleep(500); // ponytail: 2s terlalu boros, 500ms cukup
        }
      }
      for (const pId of touchedPostIds) {
        await syncParentStatus(pId);
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
            processed++;
              await sleep(500);
          }
        }

        await syncParentStatus(post.id);
      }
    }

    return res.status(200).json({ success: true, durationMs: Date.now() - start, polled, processed });
  } catch (err) {
    console.error('Dispatcher error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

function logTag(target, level = 'info', msg = '', extra = '') {
  const prefix = `[TARGET:${target.id}][${(target.platform || '').toUpperCase()}]`;
  const text = `${prefix} ${msg} ${extra}`.trim();
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.log(text);
}

// ==========================================
// 1. RESOLVER & INITIALIZER
// ==========================================

function resolveLocalMedia(post, mediaUrl) {
  let localFilePath = null;
  if (mediaUrl && mediaUrl.startsWith('/')) {
    localFilePath = path.join(process.cwd(), 'public', mediaUrl.replace(/^\//, ''));
    if (!fs.existsSync(localFilePath)) {
      localFilePath = path.join(process.cwd(), mediaUrl.replace(/^\//, ''));
    }
  }
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    const promoDir = path.join(process.cwd(), 'public', 'generated-promo');
    if (fs.existsSync(promoDir)) {
      const files = fs.readdirSync(promoDir);
      const match = files.find((f) => mediaUrl?.includes(f) || (post.title && f.endsWith('.mp4')));
      if (match) localFilePath = path.join(promoDir, match);
    }
  }
  return localFilePath;
}

const TRANSIT_BUCKET = 'temp-reels';

async function uploadToTransitStorage(mediaUrl, postTitle = 'video') {
  try {
    const res = await fetch(mediaUrl);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const fileName = `transit-${Date.now()}-${postTitle.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;

    const { error } = await supabase.storage
      .from(TRANSIT_BUCKET)
      .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });

    if (error) {
      console.warn('[TRANSIT STORAGE] Upload failed:', error.message);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from(TRANSIT_BUCKET).getPublicUrl(fileName);
    return { publicUrl, storagePath: fileName };
  } catch (err) {
    console.warn('[TRANSIT STORAGE] Fallback to direct URL:', err.message);
    return null;
  }
}

async function deleteTransitStorage(storagePath) {
  if (!storagePath) return;
  try {
    await supabase.storage.from(TRANSIT_BUCKET).remove([storagePath]);
    console.log(`[TRANSIT STORAGE CLEANED] Removed: ${storagePath}`);
  } catch {}
}

async function sweepOrphanedTransitVideos() {
  try {
    const { data: files } = await supabase.storage.from(TRANSIT_BUCKET).list('', { limit: 50 });
    if (!files?.length) return;
    const oneHourAgo = Date.now() - 3600000;
    const toDelete = files
      .filter((f) => f.created_at && new Date(f.created_at).getTime() < oneHourAgo)
      .map((f) => f.name);
    if (toDelete.length > 0) {
      await supabase.storage.from(TRANSIT_BUCKET).remove(toDelete);
      console.log(`[TRANSIT SWEEPER GC] Removed ${toDelete.length} expired videos.`);
    }
  } catch {}
}

async function initInstagram(post, target, token, mediaUrl) {
  const isIgUserToken = token.startsWith('IGAA');
  const apiHost = isIgUserToken ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
  const userId = target.connected_accounts.platform_user_id;
  const galleryItems = post.media_metadata?.gallery_items || [];
  let transitPath = null;

  // JIKA POSTINGAN BERUPA CAROUSEL / SLIDE (> 1 item)
  if (galleryItems.length > 1) {
    logTag(target, 'info', `Creating Instagram Carousel with ${galleryItems.length} items...`);
    const childrenIds = [];

    for (let i = 0; i < galleryItems.length; i++) {
      const item = galleryItems[i];
      const itemUrl = item.lh3_url || item.stream_url;
      const isItemVideo = item.mime_type?.startsWith('video/');

      const itemPayload = {
        is_carousel_item: true,
        access_token: token,
      };

      if (isItemVideo) {
        itemPayload.media_type = 'VIDEO';
        let rawVideoUrl = itemUrl;
        if (item.file_id && !item.file_id.startsWith('local-')) {
          rawVideoUrl = `https://drive.usercontent.google.com/download?id=${item.file_id}&export=download&confirm=t`;
        }
        itemPayload.video_url = rawVideoUrl;
      } else {
        itemPayload.image_url = itemUrl;
      }

      const itemRes = await fetch(`${apiHost}/${userId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemPayload),
      });
      const itemData = await itemRes.json();
      if (!itemData.id) {
        throw new Error(`Failed to create carousel item ${i + 1}: ${JSON.stringify(itemData.error || itemData)}`);
      }
      childrenIds.push(itemData.id);
      logTag(target, 'info', `Carousel sub-item ${i + 1}/${galleryItems.length} created: ${itemData.id}`);
    }

    // Buat Parent Carousel Container
    const parentPayload = {
      caption: post.content_text,
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      access_token: token,
    };

    const parentRes = await fetch(`${apiHost}/${userId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parentPayload),
    });
    const parentData = await parentRes.json();
    if (!parentData.id) {
      throw new Error(`Failed to create parent carousel: ${JSON.stringify(parentData.error || parentData)}`);
    }

    logTag(target, 'info', `Parent Carousel container created: ${parentData.id}`);
    await supabase.from('post_targets').update({
      status: 'IN_PROGRESS',
      async_container_id: parentData.id,
      executed_at: new Date().toISOString(),
      last_polled_at: new Date().toISOString(),
      error_payload: null,
    }).eq('id', target.id);
    return;
  }

  // JIKA SINGLE MEDIA (VIDEO REELS ATAU SINGLE IMAGE)
  const bodyPayload = { caption: post.content_text, access_token: token };

  if (post.media_type === 'VIDEO') {
    bodyPayload.media_type = 'REELS';
    let rawVideoUrl = mediaUrl;
    if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
      rawVideoUrl = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download&confirm=t`;
    }

    // ponytail: Pola Zero-Footprint Transit. Upload ke Supabase Storage temp-reels untuk CDN Meta yang super cepat
    const transit = await uploadToTransitStorage(rawVideoUrl, post.title || 'reel');
    if (transit?.publicUrl) {
      bodyPayload.video_url = transit.publicUrl;
      transitPath = transit.storagePath;
      logTag(target, 'info', `Using Supabase Transit URL: ${transit.publicUrl}`);
    } else {
      bodyPayload.video_url = rawVideoUrl;
    }
    bodyPayload.share_to_feed = true;
  } else {
    bodyPayload.image_url = mediaUrl;
  }

  logTag(target, 'info', `Creating media container on ${apiHost}...`);
  const r = await fetch(`${apiHost}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  const d = await r.json();
  if (!d.id) {
    if (transitPath) await deleteTransitStorage(transitPath);
    throw new Error(JSON.stringify(d.error || d));
  }

  logTag(target, 'info', `Container created: ${d.id}`);
  await supabase.from('post_targets').update({
    status: 'IN_PROGRESS',
    async_container_id: d.id,
    executed_at: new Date().toISOString(),
    last_polled_at: new Date().toISOString(),
    // ponytail: Simpan transit storage path di error_payload sementara untuk tracking cleanup
    error_payload: transitPath ? { transit_storage_path: transitPath } : null,
  }).eq('id', target.id);
}

async function initTikTok(post, target, token, mediaUrl, localFilePath) {
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
    let videoRes;
    try {
      videoRes = await fetch(downloadUrl);
    } catch (netErr) {
      throw new Error(`gagal_download_video: ${netErr.message || 'koneksi terputus'}`);
    }
    if (!videoRes.ok) throw new Error(`gagal_unduh_media_http_${videoRes.status}`);
    videoBuffer = Buffer.from(await videoRes.arrayBuffer());
  }

  const videoSize = videoBuffer.length;
  logTag(target, 'info', `Requesting TikTok upload init (${videoSize} bytes)...`);
  let initR;
  try {
    initR = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_info: { title: post.content_text.slice(0, 150), privacy_level: 'SELF_ONLY' },
        source_info: { source: 'FILE_UPLOAD', video_size: videoSize, chunk_size: videoSize, total_chunk_count: 1 },
      }),
    });
  } catch (netErr) {
    throw new Error(`tiktok_init_network_error: ${netErr.message || 'koneksi terputus'}`);
  }
  const initData = await initR.json();
  if (!initData.data?.publish_id || !initData.data?.upload_url) {
    const apiErr = initData.error?.code || initData.error?.message || JSON.stringify(initData.error || initData);
    throw new Error(apiErr);
  }

  logTag(target, 'info', `Streaming video buffer to TikTok Gateway...`);
  let uploadR;
  try {
    uploadR = await fetch(initData.data.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes 0-${videoSize - 1}/${videoSize}` },
      body: videoBuffer,
    });
  } catch (netErr) {
    throw new Error(`tiktok_gateway_upload_error: ${netErr.message || 'koneksi terputus'}`);
  }
  if (!uploadR.ok && uploadR.status !== 201) {
    throw new Error(`tiktok_upload_gateway_http_${uploadR.status}`);
  }

  logTag(target, 'info', `Uploaded! Publish ID: ${initData.data.publish_id}`);
  await supabase.from('post_targets').update({
    status: 'IN_PROGRESS',
    async_container_id: initData.data.publish_id,
    executed_at: new Date().toISOString(),
    last_polled_at: new Date().toISOString(),
  }).eq('id', target.id);
}

async function initFacebook(post, target, token, mediaUrl) {
  const pageId = target.connected_accounts.platform_user_id;
  const galleryItems = post.media_metadata?.gallery_items || [];

  // Facebook multi-photo carousel / album
  if (galleryItems.length > 1) {
    logTag(target, 'info', `Uploading ${galleryItems.length} photos to Facebook Page...`);
    const attachedMedia = [];

    for (let i = 0; i < galleryItems.length; i++) {
      const item = galleryItems[i];
      let imgUrl = item.lh3_url || item.stream_url;
      if (item.file_id && !item.file_id.startsWith('local-')) {
        imgUrl = item.lh3_url || `https://drive.usercontent.google.com/download?id=${item.file_id}&export=download`;
      }

      const photoRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imgUrl,
          published: false,
          access_token: token,
        }),
      });
      const photoData = await photoRes.json();
      if (!photoData.id) {
        throw new Error(`Failed to upload Facebook photo ${i + 1}: ${JSON.stringify(photoData.error || photoData)}`);
      }
      attachedMedia.push({ media_fbid: photoData.id });
    }

    logTag(target, 'info', `Publishing Facebook multi-photo feed post...`);
    const feedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: post.content_text,
        attached_media: attachedMedia,
        access_token: token,
      }),
    });
    const feedData = await feedRes.json();
    if (!feedData.id) throw new Error(JSON.stringify(feedData.error || feedData));

    logTag(target, 'info', `Facebook multi-photo post SUCCESS id: ${feedData.id}`);
    await supabase.from('post_targets').update({
      status: 'SUCCESS',
      error_payload: null,
      external_post_id: feedData.id,
      external_post_url: `https://www.facebook.com/${feedData.id}`,
      executed_at: new Date().toISOString(),
    }).eq('id', target.id);
    return;
  }

  let postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
  let postBody = { message: post.content_text, access_token: token };

  if (post.media_type === 'VIDEO') {
    postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/videos`;
    let videoFileUrl = mediaUrl;
    if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
      videoFileUrl = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download&confirm=t`;
    }
    postBody = { description: post.content_text, file_url: videoFileUrl, access_token: token };
  } else if (post.media_type === 'IMAGE' && mediaUrl) {
    postEndpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
    let imgUrl = mediaUrl;
    if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
      imgUrl = post.gdrive_lh3_url || `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download`;
    }
    postBody = { caption: post.content_text, url: imgUrl, access_token: token };
  }

  logTag(target, 'info', `Posting direct to Facebook Page ${pageId}...`);
  const r = await fetch(postEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postBody),
  });
  const d = await r.json();
  if (!d.id) throw new Error(JSON.stringify(d.error || d));

  logTag(target, 'info', `Facebook post SUCCESS id: ${d.id}`);
  await supabase.from('post_targets').update({
    status: 'SUCCESS',
    error_payload: null,
    external_post_id: d.id,
    external_post_url: `https://www.facebook.com/${d.id}`,
    executed_at: new Date().toISOString(),
  }).eq('id', target.id);
}

async function initTarget(post, target) {
  // ── Simulation check FIRST — no token/media needed ──
  const isSimulation = Boolean(post.media_metadata?.is_simulation || process.env.DISPATCHER_DRY_RUN === 'true');
  if (isSimulation) {
    logTag(target, 'info', `Simulating SUCCESS (Dry-Run Mode)`);
    await supabase.from('post_targets').update({
      status: 'SUCCESS',
      external_post_id: `sim-${Date.now()}-${target.platform}`,
      executed_at: new Date().toISOString(),
      error_payload: {
        mode: 'SIMULATION_DEV_MODE',
        message: 'Mode simulasi pengujian aktif: File tersimpan & jadwal teruji.',
        gdrive_file_id: post.gdrive_file_id,
        gdrive_stream_url: post.gdrive_stream_url,
      },
    }).eq('id', target.id);
    return;
  }

  // ── Real post: resolve token & media ──
  const token = await getValidToken(target.connected_accounts);
  const mediaUrl = post.gdrive_lh3_url || post.gdrive_stream_url;
  const localFilePath = resolveLocalMedia(post, mediaUrl);

  try {
    if (target.platform === 'instagram') {
      await initInstagram(post, target, token, mediaUrl);
    } else if (target.platform === 'tiktok') {
      await initTikTok(post, target, token, mediaUrl, localFilePath);
    } else if (target.platform === 'facebook_page') {
      await initFacebook(post, target, token, mediaUrl);
    }
  } catch (err) {
    const errMsg = err?.message || String(err);
    logTag(target, 'error', `INIT FAILED: ${errMsg}`);

    // ponytail: TikTok spam_risk/rate_limit saat init jangan langsung di-mark FAILED permanen
    if (target.platform === 'tiktok' && (errMsg.includes('spam_risk') || errMsg.includes('rate_limit'))) {
      logTag(target, 'warn', `TikTok spam_risk / rate limit terdeteksi -> ditunda 1 jam.`);
      await supabase.from('post_targets').update({
        status: 'PENDING',
        error_payload: { message: `TikTok rate limited (spam_risk): ${errMsg}`, retry_after: new Date(Date.now() + 3600000).toISOString() },
        last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
      return;
    }

    // ponytail: JANGAN overwrite executed_at jika sudah ada
    await supabase.from('post_targets').update({
      status: 'FAILED',
      error_payload: { message: errMsg, step: 'initTarget', failed_at: new Date().toISOString() },
      ...(target.executed_at ? {} : { executed_at: new Date().toISOString() }),
    }).eq('id', target.id);
  }
}

// ==========================================
// 2. POLLING MONITORS
// ==========================================

async function pollInstagram(target, token) {
  const isIgUserToken = token.startsWith('IGAA');
  const apiHost = isIgUserToken ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
  const r = await fetch(`${apiHost}/${target.async_container_id}?fields=status_code,status,error_message&access_token=${token}`);
  const d = await r.json();

  const transitPath = target.error_payload?.transit_storage_path;

  if (d.status_code === 'FINISHED') {
    logTag(target, 'info', `Transcoding FINISHED! Publishing container ${target.async_container_id}...`);
    const pub = await fetch(`${apiHost}/${target.connected_accounts.platform_user_id}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: target.async_container_id, access_token: token }),
    });
    const pd = await pub.json();
    if (!pd.id) throw new Error(JSON.stringify(pd.error || pd));

    logTag(target, 'info', `Publish SUCCESS id: ${pd.id}`);
    await supabase.from('post_targets').update({
      status: 'SUCCESS', error_payload: null, external_post_id: pd.id, executed_at: new Date().toISOString(),
    }).eq('id', target.id);

    // ponytail: Zero-footprint cleanup langsung saat publish berhasil
    if (transitPath) await deleteTransitStorage(transitPath);
  } else if (d.status_code === 'ERROR') {
    const errMsg = d.error_message || d.status || 'Meta transcoding failed';
    if (transitPath) await deleteTransitStorage(transitPath);

    if (errMsg.includes('not accessible') || errMsg.includes('download')) {
      logTag(target, 'warn', `URL download issue on Meta, retry: ${errMsg}`);
      await supabase.from('post_targets').update({
        status: 'PENDING',
        error_payload: { message: `URL retry: ${errMsg}`, retry_count: (target.polling_attempts || 0) + 1 },
        last_polled_at: new Date().toISOString(),
      }).eq('id', target.id);
      return;
    }
    throw new Error(errMsg);
  } else {
    const initiatedTime = target.executed_at || target.last_polled_at || new Date().toISOString();
    const minutesElapsed = (Date.now() - new Date(initiatedTime).getTime()) / 60000;
    logTag(target, 'info', `Still IN_PROGRESS (${d.status_code || d.status || 'PROCESSING'}). Elapsed: ${minutesElapsed.toFixed(1)}m`);

    if (minutesElapsed > 30) {
      logTag(target, 'warn', `Container ${target.async_container_id} elapsed ${minutesElapsed.toFixed(1)}m > 30m. Checking final status...`);
      const recheck = await fetch(`${apiHost}/${target.async_container_id}?fields=status_code,status,error_message&access_token=${token}`);
      const rc = await recheck.json();
      if (rc.status_code === 'FINISHED') {
        const pub = await fetch(`${apiHost}/${target.connected_accounts.platform_user_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: target.async_container_id, access_token: token }),
        });
        const pd = await pub.json();
        if (pd.id) {
          logTag(target, 'info', `Final check published SUCCESS id: ${pd.id}`);
          await supabase.from('post_targets').update({
            status: 'SUCCESS', error_payload: null, external_post_id: pd.id, executed_at: new Date().toISOString(),
          }).eq('id', target.id);
          if (transitPath) await deleteTransitStorage(transitPath);
          return;
        }
      }
      if (transitPath) await deleteTransitStorage(transitPath);
      throw new Error(`Meta transcoding timeout (${minutesElapsed.toFixed(0)}m elapsed, container: ${target.async_container_id}, last_status: ${rc.status_code || rc.status || 'UNKNOWN'})`);
    }

    await supabase.from('post_targets').update({
      polling_attempts: (target.polling_attempts || 0) + 1,
      last_polled_at: new Date().toISOString(),
    }).eq('id', target.id);
  }
}

async function pollTikTok(target, token) {
  const r = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish_id: target.async_container_id }),
  });
  const d = await r.json();

  if (d.error?.code === 'rate_limit_exceeded') {
    logTag(target, 'warn', `Temporary rate limit exceeded on status fetch, waiting for next heartbeat...`);
    await supabase.from('post_targets').update({
      last_polled_at: new Date().toISOString(),
    }).eq('id', target.id);
    return;
  }

  const st = d.data?.status;
  if (st === 'PUBLISH_COMPLETE') {
    const extId = d.data.publicaly_available_post_id?.[0] || target.async_container_id;
    logTag(target, 'info', `Publish COMPLETE id: ${extId}`);
    await supabase.from('post_targets').update({
      status: 'SUCCESS', error_payload: null, external_post_id: extId, executed_at: new Date().toISOString(),
    }).eq('id', target.id);
  } else if (st === 'FAILED') {
    const reason = d.data?.fail_reason || 'TikTok publish failed';
    if (reason.includes('spam_risk') || reason.includes('rate_limit')) {
      logTag(target, 'warn', `TikTok rate limit / spam risk -> auto retry 1h: ${reason}`);
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
    logTag(target, 'info', `Still PROCESSING status: ${st || 'FETCHING'}. Elapsed: ${minutesElapsed.toFixed(1)}m`);

    if (minutesElapsed > 30) {
      throw new Error(`TikTok transcoding timeout (${minutesElapsed.toFixed(0)}m elapsed, publish_id: ${target.async_container_id})`);
    }
    await supabase.from('post_targets').update({
      polling_attempts: (target.polling_attempts || 0) + 1,
      last_polled_at: new Date().toISOString(),
    }).eq('id', target.id);
  }
}

async function pollTarget(target) {
  if (target.last_polled_at) {
    const elapsedSinceLastPoll = Date.now() - new Date(target.last_polled_at).getTime();
    if (elapsedSinceLastPoll < 15000) return;
  }

  const token = await getValidToken(target.connected_accounts);
  try {
    if (target.platform === 'instagram') {
      await pollInstagram(target, token);
    } else if (target.platform === 'tiktok') {
      await pollTikTok(target, token);
    }
  } catch (err) {
    const errMsg = err?.message || String(err);
    logTag(target, 'error', `POLL FAIL: ${errMsg}`);

    await supabase.from('post_targets').update({
      status: 'FAILED',
      error_payload: { message: errMsg, step: 'pollTarget', container_id: target.async_container_id, failed_at: new Date().toISOString() },
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
