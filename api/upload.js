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

  // Mode 1: Client meminta Resumable Upload Session URL (Payload cuma ~100 bytes, bypass Vercel 4.5MB limit)
  const isInitResumable = req.headers['content-type']?.includes('application/json') || req.url?.includes('action=init-resumable');
  if (isInitResumable) {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch {}
      } else if (!bodyData) {
        // Parse raw body stream if not auto-parsed
        const buffers = [];
        for await (const chunk of req) { buffers.push(chunk); }
        const raw = Buffer.concat(buffers).toString('utf8');
        try { bodyData = JSON.parse(raw); } catch { bodyData = {}; }
      }

      const { fileName = `media_${Date.now()}`, mimeType = 'video/mp4', fileSize = 0 } = bodyData || {};

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

      if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
        return res.status(500).json({ success: false, error: 'GDrive credentials missing' });
      }

      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      const tokenRes = await oauth2.getAccessToken();
      const accessToken = typeof tokenRes === 'string' ? tokenRes : tokenRes?.token;

      const drive = google.drive({ version: 'v3', auth: oauth2 });
      const isVideo = (mimeType || '').startsWith('video/');
      let folderId = rootFolderId;
      try {
        folderId = await getOrCreateSubfolder(drive, rootFolderId, isVideo ? 'Videos' : 'Images');
      } catch {
        folderId = rootFolderId;
      }

      // Ambil origin asli browser client agar Google mengizinkan CORS PUT dari domain tersebut
      const clientOrigin = req.headers.origin || req.headers.referer || 'https://auto-poster-blush.vercel.app';
      const cleanOrigin = clientOrigin.replace(/\/$/, '');

      // Request Resumable Session URL directly from Google Drive API with CORS Origin
      const metadata = {
        name: fileName,
        parents: [folderId],
      };

      const initHeaders = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(fileSize || 0),
        Origin: cleanOrigin,
      };

      const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: initHeaders,
        body: JSON.stringify(metadata),
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        return res.status(initRes.status).json({ success: false, error: `Google API init failed: ${errText}` });
      }

      const uploadUrl = initRes.headers.get('location');
      if (!uploadUrl) {
        return res.status(500).json({ success: false, error: 'Google did not return upload location' });
      }

      return res.status(200).json({
        success: true,
        resumable: true,
        uploadUrl,
        accessToken,
      });
    } catch (err) {
      console.error('Init Resumable Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Mode 2: Client selesai upload direct ke GDrive, minta server set public reader permission
  if (req.url?.includes('action=finalize-permissions') || req.headers['content-type']?.includes('application/json')) {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try { bodyData = JSON.parse(bodyData); } catch {}
      } else if (!bodyData) {
        const buffers = [];
        for await (const chunk of req) { buffers.push(chunk); }
        const raw = Buffer.concat(buffers).toString('utf8');
        try { bodyData = JSON.parse(raw); } catch { bodyData = {}; }
      }

      const { fileId } = bodyData || {};
      if (fileId) {
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

        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true,
        }).catch(() => {});

        return res.status(200).json({ success: true, fileId });
      }
    } catch (e) {
      // non-blocking
    }
  }

  // Mode 2: Direct Multipart Form Upload (Fallback untuk file kecil / dev lokal)
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

    // Ponytail: Auto-refresh token condition secara proaktif & retry saat terjadi network glitch
    let accessToken = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tokenRes = await oauth2.getAccessToken();
        accessToken = typeof tokenRes === 'string' ? tokenRes : tokenRes?.token;
        if (accessToken) break;
      } catch (tokenErr) {
        if (attempt === 3) {
          console.warn(`[GDRIVE AUTH] Refresh token attempt ${attempt} failed:`, tokenErr.message);
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (accessToken) {
      oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    }

    const drive = google.drive({ version: 'v3', auth: oauth2 });

    const isVideo = (file.mimetype || '').startsWith('video/');
    let folderId = rootFolderId;
    try {
      folderId = await getOrCreateSubfolder(drive, rootFolderId, isVideo ? 'Videos' : 'Images');
    } catch {
      folderId = rootFolderId; // fallback jika subfolder gagal dibuat
    }

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
