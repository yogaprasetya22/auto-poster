export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY || 'awodif1ekfi8ijp2';
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://auto-poster-blush.vercel.app/api/auth/tiktok-callback';
  const scope = 'user.info.basic,video.upload,video.publish';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${encodeURIComponent(
    scope
  )}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return res.redirect(302, authUrl);
}
