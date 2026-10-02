import { google } from 'googleapis';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const urlObj = new URL(req.url, 'http://localhost');
  const fileId = req.query?.id || urlObj.searchParams.get('id');
  if (!fileId) return res.status(400).json({ success: false, error: 'File ID required' });

  try {
    let clientId = process.env.GDRIVE_CLIENT_ID;
    let clientSecret = process.env.GDRIVE_CLIENT_SECRET;
    let refreshToken = process.env.GDRIVE_REFRESH_TOKEN;

    if (!refreshToken && fs.existsSync('gdrive_oauth.json')) {
      try {
        const local = JSON.parse(fs.readFileSync('gdrive_oauth.json', 'utf8'));
        clientId = clientId || local.client_id;
        clientSecret = clientSecret || local.client_secret;
        refreshToken = refreshToken || local.refresh_token;
      } catch {}
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2 });

    const meta = await drive.files.get({ fileId, fields: 'id, mimeType, size' });
    const mimeType = meta.data.mimeType || 'application/octet-stream';
    const fileSize = parseInt(meta.data.size || '0', 10);

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    const range = req.headers.range;
    if (range && fileSize > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', end - start + 1);

      const stream = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
      );
      stream.data.pipe(res);
    } else {
      if (fileSize > 0) res.setHeader('Content-Length', fileSize);
      const stream = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
      stream.data.pipe(res);
    }
  } catch (err) {
    console.error('GDrive Media Proxy Error:', err);
    if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
  }
}
