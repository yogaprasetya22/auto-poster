import { google } from 'googleapis';
import dns from 'dns';
import fs from 'fs';

if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    let clientId = process.env.GDRIVE_CLIENT_ID;
    let clientSecret = process.env.GDRIVE_CLIENT_SECRET;
    let refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
    let rootFolderId = process.env.GDRIVE_FOLDER_ID;

    if (!refreshToken && fs.existsSync('gdrive_oauth.json')) {
      try {
        const local = JSON.parse(fs.readFileSync('gdrive_oauth.json', 'utf8'));
        clientId = clientId || local.client_id;
        clientSecret = clientSecret || local.client_secret;
        refreshToken = refreshToken || local.refresh_token;
        rootFolderId = rootFolderId || local.folder_id;
      } catch {}
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2 });

    const listRes = await drive.files.list({
      q: `'${rootFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    const files = (listRes.data.files || []).map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: Number(f.size || 0),
      createdTime: f.createdTime,
      directUrl: `/api/gdrive-media?id=${f.id}`,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${f.id}=s200`,
    }));

    return res.status(200).json({ success: true, files });
  } catch (err) {
    console.error('GDrive Files Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
