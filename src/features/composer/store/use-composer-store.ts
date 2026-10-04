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

interface ComposerState {
  title: string
  contentText: string
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO'
  media: MediaAsset | null
  targetAccountIds: string[]
  scheduledAt: string // ISO
  isUploading: boolean
  uploadProgress: number
  isSimulationMode: boolean

  setTitle: (v: string) => void
  setContentText: (v: string) => void
  setMedia: (m: MediaAsset | null) => void
  toggleTarget: (id: string) => void
  setScheduledAt: (v: string) => void
  setUploading: (v: boolean, pct?: number) => void
  setSimulationMode: (v: boolean) => void
  reset: () => void
}

const init = {
  title: '',
  contentText: '',
  mediaType: 'TEXT' as const,
  media: null,
  targetAccountIds: [] as string[],
  scheduledAt: new Date(Date.now() + 3600_000).toISOString().slice(0, 16),
  isUploading: false,
  uploadProgress: 0,
  isSimulationMode: false, // Default false agar postingan langsung terbit live ke platform
}

export const useComposerStore = create<ComposerState>((set) => ({
  ...init,
  setTitle: (title) => set({ title }),
  setContentText: (contentText) => set({ contentText }),
  setMedia: (media) =>
    set({
      media,
      mediaType: media ? (media.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE') : 'TEXT',
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
  reset: () => set(init),
}))

// Expose to window for lightweight Playwright e2e automation (/ponytail)
if (typeof window !== 'undefined') {
  ;(window as any).__COMPOSER_STORE__ = useComposerStore
}

