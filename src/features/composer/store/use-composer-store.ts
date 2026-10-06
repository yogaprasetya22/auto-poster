import { create } from 'zustand'

export interface MediaAsset {
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
  streamUrl: string
  lh3Url: string
  durationSeconds?: number
}

export type PostFormat = 'VIDEO' | 'SINGLE_IMAGE' | 'CAROUSEL'

interface ComposerState {
  title: string
  contentText: string
  postFormat: PostFormat
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO'
  media: MediaAsset | null
  mediaItems: MediaAsset[]
  targetAccountIds: string[]
  scheduledAt: string // ISO
  isUploading: boolean
  uploadProgress: number
  isSimulationMode: boolean
  editingDraftId: string | null

  setTitle: (v: string) => void
  setContentText: (v: string) => void
  setPostFormat: (format: PostFormat) => void
  setMedia: (m: MediaAsset | null) => void
  addMediaItem: (m: MediaAsset) => void
  removeMediaItem: (index: number) => void
  setMediaItems: (items: MediaAsset[]) => void
  toggleTarget: (id: string) => void
  setScheduledAt: (v: string) => void
  setUploading: (v: boolean, pct?: number) => void
  setSimulationMode: (v: boolean) => void
  setEditingDraftId: (id: string | null) => void
  loadDraft: (post: any) => void
  reset: () => void
}

const init = {
  title: '',
  contentText: '',
  postFormat: 'VIDEO' as PostFormat,
  mediaType: 'VIDEO' as const,
  media: null,
  mediaItems: [] as MediaAsset[],
  targetAccountIds: [] as string[],
  scheduledAt: new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
  isUploading: false,
  uploadProgress: 0,
  isSimulationMode: false, // Default false agar postingan langsung terbit live ke platform
  editingDraftId: null as string | null,
}

export const useComposerStore = create<ComposerState>((set) => ({
  ...init,
  setTitle: (title) => set({ title }),
  setContentText: (contentText) => set({ contentText }),
  setPostFormat: (postFormat) =>
    set((s) => {
      // Jika switch ke single image saat ada banyak item, ambil item pertama
      let items = s.mediaItems
      if (postFormat === 'SINGLE_IMAGE' && items.length > 1) {
        items = [items[0]]
      }
      const mediaType = postFormat === 'VIDEO' ? 'VIDEO' : 'IMAGE'
      return {
        postFormat,
        mediaType,
        mediaItems: items,
        media: items[0] || null,
      }
    }),
  setMedia: (media) =>
    set({
      media,
      mediaItems: media ? [media] : [],
      mediaType: media ? (media.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE') : 'TEXT',
    }),
  addMediaItem: (item) =>
    set((s) => {
      const newItems = [...s.mediaItems, item]
      const hasVideo = newItems.some((i) => i.mimeType.startsWith('video/'))
      return {
        mediaItems: newItems,
        media: newItems[0] || null,
        mediaType: hasVideo ? 'VIDEO' : newItems.length > 0 ? 'IMAGE' : 'TEXT',
      }
    }),
  removeMediaItem: (index) =>
    set((s) => {
      const newItems = s.mediaItems.filter((_, i) => i !== index)
      const hasVideo = newItems.some((i) => i.mimeType.startsWith('video/'))
      return {
        mediaItems: newItems,
        media: newItems[0] || null,
        mediaType: hasVideo ? 'VIDEO' : newItems.length > 0 ? 'IMAGE' : 'TEXT',
      }
    }),
  setMediaItems: (items) =>
    set(() => {
      const hasVideo = items.some((i) => i.mimeType.startsWith('video/'))
      return {
        mediaItems: items,
        media: items[0] || null,
        mediaType: hasVideo ? 'VIDEO' : items.length > 0 ? 'IMAGE' : 'TEXT',
      }
    }),
  toggleTarget: (id) =>
    set((s) => ({
      targetAccountIds: s.targetAccountIds.includes(id)
        ? s.targetAccountIds.filter((x) => x !== id)
        : [...s.targetAccountIds, id],
    })),
  setScheduledAt: (scheduledAt) => set({ scheduledAt }),
  setUploading: (isUploading, uploadProgress = 0) => set({ isUploading, uploadProgress }),
  setSimulationMode: (isSimulationMode) => set({ isSimulationMode }),
  setEditingDraftId: (editingDraftId) => set({ editingDraftId }),
  loadDraft: (post: any) => {
    const rawGallery = post.media_metadata?.gallery_items || []
    let items: MediaAsset[] = []

    if (Array.isArray(rawGallery) && rawGallery.length > 0) {
      items = rawGallery.map((it: any) => ({
        fileId: it.file_id || it.fileId,
        fileName: it.file_name || it.fileName || 'Media Asset',
        mimeType: it.mime_type || it.mimeType || 'image/jpeg',
        fileSize: it.file_size || it.fileSize || 0,
        streamUrl: it.stream_url || it.streamUrl || '',
        lh3Url: it.lh3_url || it.lh3Url || '',
        durationSeconds: it.duration,
      }))
    } else if (post.gdrive_stream_url || post.gdrive_lh3_url) {
      items = [
        {
          fileId: post.gdrive_file_id || 'restored-file',
          fileName: post.title || 'Media',
          mimeType: post.media_type === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
          fileSize: post.media_metadata?.size || 0,
          streamUrl: post.gdrive_stream_url || '',
          lh3Url: post.gdrive_lh3_url || '',
          durationSeconds: post.media_metadata?.duration,
        },
      ]
    }

    const postFormat: PostFormat =
      post.media_type === 'VIDEO'
        ? 'VIDEO'
        : items.length > 1
        ? 'CAROUSEL'
        : 'SINGLE_IMAGE'

    const targetAccountIds =
      post.post_targets?.map((t: any) => t.account_id).filter(Boolean) || []

    const scheduledIso = post.scheduled_at
      ? new Date(post.scheduled_at).toISOString().slice(0, 16)
      : new Date(Date.now() + 3600_000).toISOString().slice(0, 16)

    set({
      editingDraftId: post.id,
      title: post.title || '',
      contentText: post.content_text || '',
      mediaType: post.media_type || (items.some((i) => i.mimeType.startsWith('video/')) ? 'VIDEO' : 'IMAGE'),
      postFormat,
      mediaItems: items,
      media: items[0] || null,
      targetAccountIds,
      scheduledAt: scheduledIso,
      isSimulationMode: Boolean(post.media_metadata?.is_simulation),
    })
  },
  reset: () => set(init),
}))

// Expose to window for lightweight Playwright e2e automation (/ponytail)
if (typeof window !== 'undefined') {
  ;(window as any).__COMPOSER_STORE__ = useComposerStore
}

