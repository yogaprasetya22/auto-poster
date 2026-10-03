import fs from 'fs';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const env = dotenv.parse(fs.readFileSync('.env', 'utf8'));

let clientId = env.GDRIVE_CLIENT_ID;
let clientSecret = env.GDRIVE_CLIENT_SECRET;
let refreshToken = env.GDRIVE_REFRESH_TOKEN;
let rootFolderId = env.GDRIVE_FOLDER_ID;

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
  console.error('Kredensial Google Drive tidak lengkap di .env atau gdrive_oauth.json');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
oauth2.setCredentials({ refresh_token: refreshToken });
const drive = google.drive({ version: 'v3', auth: oauth2 });

async function cleanGDrive() {
  console.log('🔍 Mencari file di Google Drive (Folder ID:', rootFolderId, ')...');
  try {
    const query = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const subfolders = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
    });

    const targetFolderIds = [rootFolderId, ...(subfolders.data.files || []).map((f) => f.id)];

    let totalDeleted = 0;
    for (const fId of targetFolderIds) {
      const qFiles = `'${fId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
      const list = await drive.files.list({
        q: qFiles,
        fields: 'files(id, name)',
      });

      for (const file of list.data.files || []) {
        console.log(`🗑️  Menghapus file: ${file.name} (${file.id})`);
        await drive.files.delete({ fileId: file.id });
        totalDeleted++;
      }
    }

    console.log(`✅ Selesai! Sebanyak ${totalDeleted} file di Google Drive berhasil dibersihkan.`);
  } catch (err) {
    console.error('❌ Gagal membersihkan file Google Drive:', err.message);
    process.exit(1);
  }
}

cleanGDrive();
