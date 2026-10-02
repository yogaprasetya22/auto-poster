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
    return res.redirect(302, '/settings?error=' + encodeURIComponent(error || 'No code returned from Meta'));
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const encryptionKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!appId || !appSecret || !redirectUri || !encryptionKey) {
    return res.redirect(302, '/settings?error=' + encodeURIComponent('Konfigurasi Meta atau Enkripsi belum lengkap di server'));
  }

  try {
    // 1. Exchange authorization code for short-lived access token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Failed to exchange token');
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange short-lived token for long-lived user token (valid 60 days)
    const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();
    const userAccessToken = longLivedData.access_token || shortLivedToken;

    // Helper: encrypt secret
    async function encrypt(val) {
      try {
        const { data, error: encErr } = await supabase.rpc('encrypt_secret', {
          plain_text: val,
          secret_key: encryptionKey,
        });
        if (!encErr && data) return data;
      } catch {}
      return Buffer.from(val).toString('base64');
    }

    // 3. Fetch managed Facebook Pages & linked Instagram Business accounts
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${userAccessToken}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    const pages = accountsData.data || [];
    let connectedCount = 0;

    for (const page of pages) {
      // A. Save Facebook Page
      const encryptedPageToken = await encrypt(page.access_token);
      await supabase.from('connected_accounts').upsert(
        {
          platform: 'facebook_page',
          account_name: page.name,
          platform_user_id: page.id,
          access_token_encrypted: encryptedPageToken,
          is_active: true,
          token_expires_at: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
        },
        { onConflict: 'platform,platform_user_id' }
      );
      connectedCount++;

      // B. Save Instagram Business Account if linked to this Page
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        await supabase.from('connected_accounts').upsert(
          {
            platform: 'instagram',
            account_name: ig.username ? `@${ig.username}` : (ig.name || page.name),
            platform_user_id: ig.id,
            platform_parent_id: page.id,
            access_token_encrypted: encryptedPageToken, // Page token is used to publish to linked IG
            is_active: true,
            token_expires_at: new Date(Date.now() + 365 * 24 * 3600_000).toISOString(),
          },
          { onConflict: 'platform,platform_user_id' }
        );
        connectedCount++;
      }
    }

    return res.redirect(302, `/settings?success=connected&count=${connectedCount}`);
  } catch (err) {
    console.error('Meta OAuth Callback Error:', err);
    return res.redirect(302, '/settings?error=' + encodeURIComponent(err.message));
  }
}
