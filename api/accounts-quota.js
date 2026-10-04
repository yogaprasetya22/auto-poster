import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ponytail: Endpoint ringkas untuk cek live post count hari ini langsung dari masing-masing API platform
export default async function handler(req, res) {
  try {
    const { data: accounts, error } = await supabase
      .from('connected_accounts')
      .select('id, platform, platform_user_id, account_name, access_token_encrypted')
      .eq('is_active', true);

    if (error) throw error;

    // Hitung awal hari ini (00:00:00 lokal / UTC 24 jam terakhir)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTimestamp = Math.floor(startOfDay.getTime() / 1000);

    const results = {};

    await Promise.allSettled(
      (accounts || []).map(async (acc) => {
        const token = await decrypt(acc.access_token_encrypted);
        let countToday = 0;
        let limit = 5; // Default safety threshold aplikasi

        if (acc.platform === 'instagram') {
          limit = 25; // Batas resmi Meta Graph API per 24 jam
          // Query live published media dari Instagram Graph API
          const isIgUser = token.startsWith('IGAA');
          const host = isIgUser ? 'https://graph.instagram.com/v19.0' : 'https://graph.facebook.com/v19.0';
          const r = await fetch(`${host}/${acc.platform_user_id}/media?fields=id,timestamp&limit=25&access_token=${token}`);
          const d = await r.json();
          if (Array.isArray(d.data)) {
            countToday = d.data.filter((item) => {
              const itemTime = new Date(item.timestamp).getTime();
              return itemTime >= startOfDay.getTime();
            }).length;
          }
        } else if (acc.platform === 'facebook_page') {
          limit = 50;
          // Query live feed posts dari Facebook Page Graph API
          const r = await fetch(`https://graph.facebook.com/v19.0/${acc.platform_user_id}/feed?fields=id,created_time&limit=25&access_token=${token}`);
          const d = await r.json();
          if (Array.isArray(d.data)) {
            countToday = d.data.filter((item) => {
              const itemTime = new Date(item.created_time).getTime();
              return itemTime >= startOfDay.getTime();
            }).length;
          }
        } else if (acc.platform === 'tiktok') {
          limit = 5;
          // Query live video list dari TikTok Open API v2
          const r = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,create_time', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ max_count: 20 }),
          });
          const d = await r.json();
          if (Array.isArray(d.data?.videos)) {
            countToday = d.data.videos.filter((item) => {
              return (item.create_time || 0) >= startOfDayTimestamp;
            }).length;
          }
        }

        results[acc.id] = {
          countToday,
          limit,
          safeLimit: 5,
          isLiveApi: true,
        };
      })
    );

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function decrypt(ciphertext) {
  if (!ciphertext) return '';
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) return ciphertext;
  try {
    const { data, error } = await supabase.rpc('decrypt_secret', {
      ciphertext,
      secret_key: key,
    });
    if (!error && data) return data;
  } catch {}
  try {
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf8');
    if (decoded && /^EAA|IGAA|[a-zA-Z0-9_-]{20,}/.test(decoded)) return decoded;
  } catch {}
  return ciphertext;
}
