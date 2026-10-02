export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    return res.status(500).json({
      error: 'Missing TIKTOK_CLIENT_KEY or TIKTOK_REDIRECT_URI environment variables'
    });
  }

  const crypto = await import('crypto');

  // Generate PKCE code_verifier & code_challenge (S256)
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Scope sesuai konfigurasi Login Kit & Content Posting API
  const scope = process.env.TIKTOK_SCOPE || 'user.info.basic,video.publish';
  const stateObj = {
    nonce: crypto.randomBytes(8).toString('hex'),
    cv: codeVerifier,
  };
  const state = Buffer.from(JSON.stringify(stateObj)).toString('base64url');

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(
    scope
  )}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  return res.redirect(302, authUrl);
}
