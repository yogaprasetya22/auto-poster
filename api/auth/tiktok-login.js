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

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(
    scope
  )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return res.redirect(302, authUrl);
}
