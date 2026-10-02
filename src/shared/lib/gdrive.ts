export interface GDriveUploadResult {
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
  streamUrl: string
  lh3Url: string
}

/** Upload file to Google Drive via serverless proxy */
export async function uploadToGDrive(file: File): Promise<GDriveUploadResult> {
  const fd = new FormData()
  fd.append('file', file)

  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || 'Upload gagal')

  return {
    fileId: data.fileId,
    fileName: data.fileName,
    mimeType: data.mimeType || file.type,
    fileSize: data.fileSize || file.size,
    streamUrl: data.streamUrl,
    lh3Url: data.lh3Url,
  }
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
