import { createClient } from '@supabase/supabase-js';

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

    // Phase 2: Pick up scheduled posts or posts with pending targets
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
    }

    return res.status(200).json({ success: true, durationMs: Date.now() - start });
  } catch (err) {
    console.error('Dispatcher error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function initTarget(post, target) {
  const token = await decrypt(target.connected_accounts.access_token_encrypted);
  // Prioritaskan URL publik lh3.googleusercontent.com karena server Instagram/TikTok menolak localhost
  const mediaUrl = post.gdrive_lh3_url || post.gdrive_stream_url;

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
        bodyPayload.video_url = mediaUrl;
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
      const r = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          post_info: { title: post.content_text.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE' },
          source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
        }),
      });
      const d = await r.json();
      if (!d.data?.publish_id) throw new Error(JSON.stringify(d.error || d));
      await supabase.from('post_targets').update({
        status: 'IN_PROGRESS', async_container_id: d.data.publish_id, last_polled_at: new Date().toISOString(),
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
  const token = await decrypt(target.connected_accounts.access_token_encrypted);

  try {
    if (target.platform === 'instagram') {
      const isIgUserToken = token.startsWith('IGAA');
      const apiHost = isIgUserToken ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
      const r = await fetch(`${apiHost}/${target.async_container_id}?fields=status_code&access_token=${token}`);
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
          status: 'SUCCESS', external_post_id: pd.id, executed_at: new Date().toISOString(),
        }).eq('id', target.id);
      } else if (d.status_code === 'ERROR') {
        throw new Error('Meta transcoding failed');
      } else {
        if (target.polling_attempts >= 10) throw new Error('Transcoding timeout (50 min)');
        await supabase.from('post_targets').update({
          polling_attempts: target.polling_attempts + 1, last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
      }
    } else if (target.platform === 'tiktok') {
      const r = await fetch('https://open.tiktokapis.com/v2/post/publish/status_fetch/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish_id: target.async_container_id }),
      });
      const d = await r.json();
      const st = d.data?.status;
      if (st === 'PUBLISH_COMPLETE') {
        await supabase.from('post_targets').update({
          status: 'SUCCESS', external_post_id: d.data.publicaly_available_post_id?.[0] || '', executed_at: new Date().toISOString(),
        }).eq('id', target.id);
      } else if (st === 'FAILED') {
        throw new Error(d.data?.fail_reason || 'TikTok publish failed');
      } else {
        if (target.polling_attempts >= 10) throw new Error('TikTok transcoding timeout');
        await supabase.from('post_targets').update({
          polling_attempts: target.polling_attempts + 1, last_polled_at: new Date().toISOString(),
        }).eq('id', target.id);
      }
    }
  } catch (err) {
    await supabase.from('post_targets').update({
      status: 'FAILED', error_payload: { message: err.message }, executed_at: new Date().toISOString(),
    }).eq('id', target.id);
  }
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
