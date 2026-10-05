export interface GDriveUploadResult {
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
  streamUrl: string
  lh3Url: string
}

/** Upload file to Google Drive (Direct Resumable Upload to bypass Vercel 4.5MB limit) */
export async function uploadToGDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<GDriveUploadResult> {
  // Step 1: Minta Resumable Upload Session URL dari serverless (~100 bytes payload)
  const initRes = await fetch('/api/upload?action=init-resumable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
    }),
  })

  const initData = await initRes.json().catch(() => ({}))
  if (!initRes.ok || !initData?.uploadUrl) {
    throw new Error(initData?.error || `Gagal inisialisasi sesi upload GDrive (${initRes.status})`)
  }

  const uploadUrl = initData.uploadUrl
  const accessToken = initData.accessToken

  // Step 2: Stream langsung file dari browser ke Google Drive (Bypass Vercel 4.5MB, kuota 1GB+)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)

    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    }
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100)
        onProgress(pct)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const driveData = JSON.parse(xhr.responseText || '{}')
          const fileId = driveData.id
          if (!fileId) return reject(new Error('Google Drive tidak mengembalikan ID file.'))

          const appOrigin = window.location.origin
          return resolve({
            fileId,
            fileName: driveData.name || file.name,
            mimeType: driveData.mimeType || file.type,
            fileSize: Number(driveData.size || file.size),
            streamUrl: `${appOrigin}/api/gdrive-media?id=${fileId}`,
            lh3Url: `https://lh3.googleusercontent.com/d/${fileId}`,
          })
        } catch (err: any) {
          return reject(new Error(`Gagal memproses respon Google Drive: ${err.message}`))
        }
      }

      reject(new Error(`Upload ke Google Drive gagal (${xhr.status}): ${xhr.responseText?.slice(0, 100)}`))
    }

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus saat mengunggah media ke Google Drive.'))
    }

    xhr.ontimeout = () => {
      reject(new Error('Waktu upload habis (Timeout).'))
    }

    xhr.send(file)
  })
}

/** Get video duration from File via browser Video element */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(Math.round(v.duration)) }
    v.onerror = () => resolve(0)
    v.src = URL.createObjectURL(file)
  })
}
