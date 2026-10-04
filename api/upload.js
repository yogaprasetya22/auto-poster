import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';
import dns from 'dns';

if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export const config = { api: { bodyParser: false } };

const folderCache = new Map();

async function getOrCreateSubfolder(drive, parentId, name) {
  const key = `${parentId}:${name}`;
  if (folderCache.has(key)) return folderCache.get(key);

  const list = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)', spaces: 'drive', pageSize: 1,
  });

  if (list.data.files?.length) {
    folderCache.set(key, list.data.files[0].id);
    return list.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  folderCache.set(key, created.data.id);
  return created.data.id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  try {
    const form = formidable({ keepExtensions: true, maxFileSize: 100 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    const file = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
    if (!file) return res.status(400).json({ success: false, error: 'No file' });

    let clientId = process.env.GDRIVE_CLIENT_ID;
    let clientSecret = process.env.GDRIVE_CLIENT_SECRET;
    let refreshToken = process.env.GDRIVE_REFRESH_TOKEN;
    let rootFolderId = process.env.GDRIVE_FOLDER_ID;

    // ponytail: fallback to local json (same as nfc-google-review)
    if (!refreshToken && fs.existsSync('gdrive_oauth.json')) {
      try {
        const local = JSON.parse(fs.readFileSync('gdrive_oauth.json', 'utf8'));
        clientId = clientId || local.client_id;
        clientSecret = clientSecret || local.client_secret;
        refreshToken = refreshToken || local.refresh_token;
        rootFolderId = rootFolderId || local.folder_id;
      } catch {}
    }

    if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
      return res.status(500).json({ success: false, error: 'GDrive credentials missing' });
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth: oauth2 });

    const isVideo = (file.mimetype || '').startsWith('video/');
    const folderId = await getOrCreateSubfolder(drive, rootFolderId, isVideo ? 'Videos' : 'Images');

    const driveRes = await drive.files.create({
      requestBody: { name: file.originalFilename || `media_${Date.now()}`, parents: [folderId] },
      media: { mimeType: file.mimetype || 'application/octet-stream', body: fs.createReadStream(file.filepath) },
      fields: 'id, name, size', supportsAllDrives: true,
    });

    const fileId = driveRes.data.id;
    await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
    return res.status(200).json({
      success: true,
      fileId,
      fileName: driveRes.data.name,
      fileSize: Number(driveRes.data.size || 0),
      mimeType: file.mimetype,
      streamUrl: `${appUrl}/api/gdrive-media?id=${fileId}`,
      lh3Url: `https://lh3.googleusercontent.com/d/${fileId}`,
    });
  } catch (err) {
    console.error('Upload Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
