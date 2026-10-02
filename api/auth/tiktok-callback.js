import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  const code = req.query?.code || urlObj.searchParams.get('code');
  const error = req.query?.error || urlObj.searchParams.get('error');

  if (error || !code) {
    return res.redirect(302, '/settings?error=' + encodeURIComponent(error || 'No code returned from TikTok'));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!clientKey || !clientSecret || !redirectUri || !encryptionKey) {
    return res.redirect(302, '/settings?error=' + encodeURIComponent('Konfigurasi environment TikTok atau enkripsi belum lengkap di server'));
  }

  try {
    // 1. Exchange authorization code for TikTok User Access Token
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    const bodyParams = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token && !tokenData.data?.access_token) {
      throw new Error(tokenData.message || tokenData.error_description || 'Gagal menukar authorization code TikTok');
    }

    const accessToken = tokenData.access_token || tokenData.data.access_token;
    const openId = tokenData.open_id || tokenData.data?.open_id;
    const refreshToken = tokenData.refresh_token || tokenData.data?.refresh_token;
    const expiresIn = tokenData.expires_in || tokenData.data?.expires_in || 86400;

    // 2. Fetch User Profile Info
    let username = 'tiktok_user';
    let displayName = 'TikTok Account';
    let avatarUrl = '';

    try {
      const userRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const userData = await userRes.json();
      if (userData.data?.user) {
        displayName = userData.data.user.display_name || displayName;
        username = userData.data.user.username || displayName;
        avatarUrl = userData.data.user.avatar_url || '';
      }
    } catch (uErr) {
      console.warn('Gagal fetch TikTok user info:', uErr);
    }

    // Encrypt token
    let encryptedToken = accessToken;
    try {
      const { data: encData, error: encErr } = await supabase.rpc('encrypt_secret', {
        plain_text: accessToken,
        secret_key: encryptionKey,
      });
      if (!encErr && encData) encryptedToken = encData;
    } catch {}

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Upsert into Supabase connected_accounts
    const { error: upsertErr } = await supabase
      .from('connected_accounts')
      .upsert(
        {
          platform: 'tiktok',
          account_id: openId || `tiktok_${Date.now()}`,
          account_name: `@${username} (${displayName})`,
          encrypted_token: encryptedToken,
          token_expires_at: expiresAt,
          status: 'active',
          metadata: {
            open_id: openId,
            refresh_token: refreshToken,
            avatar_url: avatarUrl,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'platform,account_id' }
      );

    if (upsertErr) {
      console.error('Error inserting TikTok account:', upsertErr);
      return res.redirect(302, '/settings?error=' + encodeURIComponent('Gagal menyimpan akun TikTok ke database'));
    }

    return res.redirect(302, '/settings?connected=tiktok');
  } catch (err) {
    console.error('TikTok OAuth Exception:', err);
    return res.redirect(302, '/settings?error=' + encodeURIComponent(err.message));
  }
}
