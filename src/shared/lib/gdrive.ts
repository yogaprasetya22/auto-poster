export interface GDriveUploadResult {
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
  streamUrl: string
  lh3Url: string
}

/** Upload file to Google Drive via serverless proxy */
export async function uploadToGDrive(
  file: File,
  onProgress?: (percent: number) => void
): Promise<GDriveUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100)
        onProgress(pct)
      }
    }

    xhr.onload = () => {
      const rawText = xhr.responseText || ''
      let data: any = null
      try {
        data = JSON.parse(rawText)
      } catch {
        // Handle non-JSON HTML error page (e.g. 504 / proxy / size limit)
        const cleanMsg = rawText.replace(/<[^>]*>?/gm, '').trim()
        const summary = cleanMsg.slice(0, 150) || `Server Error (${xhr.status})`
        return reject(new Error(`Upload GDrive gagal (${xhr.status}): ${summary}`))
      }

      if (xhr.status >= 200 && xhr.status < 300 && data?.success) {
        return resolve({
          fileId: data.fileId,
          fileName: data.fileName,
          mimeType: data.mimeType || file.type,
          fileSize: data.fileSize || file.size,
          streamUrl: data.streamUrl,
          lh3Url: data.lh3Url,
        })
      }

      reject(new Error(data?.error || `Upload gagal (${xhr.status})`))
    }

    xhr.onerror = () => {
      reject(new Error('Koneksi jaringan terputus saat mengunggah media.'))
    }

    xhr.ontimeout = () => {
      reject(new Error('Waktu upload habis (Timeout). Periksa koneksi internet.'))
    }

    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
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
