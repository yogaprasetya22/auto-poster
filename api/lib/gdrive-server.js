import { google } from 'googleapis';
import dns from 'dns';
import fs from 'fs';

if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

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

/**
 * Upload buffer atau file stream ke Google Drive dan return direct link lh3 + stream url
 */
export async function uploadBufferToGDrive({ filename, buffer, filePath, mimeType = 'video/mp4' }) {
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
    throw new Error('Kredensial Google Drive belum lengkap');
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
        console.warn(`[GDRIVE SERVER AUTH] Refresh token attempt ${attempt} failed:`, tokenErr.message);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  if (accessToken) {
    oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  }

  const drive = google.drive({ version: 'v3', auth: oauth2 });

  const isVideo = mimeType.startsWith('video/');
  let folderId = rootFolderId;
  try {
    folderId = await getOrCreateSubfolder(drive, rootFolderId, isVideo ? 'Videos' : 'Images');
  } catch {
    folderId = rootFolderId;
  }

  let mediaBody;
  if (filePath && fs.existsSync(filePath)) {
    mediaBody = fs.createReadStream(filePath);
  } else if (buffer) {
    const { Readable } = await import('stream');
    mediaBody = Readable.from(buffer);
  } else {
    throw new Error('Tidak ada file atau buffer yang diunggah');
  }

  const driveRes = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: mediaBody },
    fields: 'id, name, size',
    supportsAllDrives: true,
  });

  const fileId = driveRes.data.id;
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';
  return {
    fileId,
    fileName: driveRes.data.name,
    fileSize: Number(driveRes.data.size || 0),
    mimeType,
    streamUrl: `${appUrl}/api/gdrive-media?id=${fileId}`,
    lh3Url: `https://lh3.googleusercontent.com/d/${fileId}`,
  };
}
