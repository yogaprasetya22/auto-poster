import { z } from 'zod';

export interface TargetAccountContext {
  id: string;
  platform: 'instagram' | 'tiktok' | 'facebook_page' | 'threads' | string;
  account_name?: string;
}

/**
 * Platform Constraints Matrix:
 * - TikTok: Video only (MP4/WebM/QuickTime), duration 3 - 600s, max title/caption 2200 chars.
 * - Instagram: Reels video requires MP4 (min 3s, max 900s), Single image JPEG/PNG. Caption max 2200 chars.
 * - Facebook Page: Video or Image or Text. Caption max 5000 chars.
 * - Threads: Video or Image or Text. Text max 500 chars.
 */

export const mediaAssetSchema = z.object({
  fileId: z.string().min(1, 'File ID Google Drive wajib ada'),
  fileName: z.string().min(1, 'Nama file wajib ada'),
  mimeType: z.string().min(1, 'Mime type wajib ada'),
  fileSize: z.number().positive('Ukuran file tidak boleh kosong'),
  streamUrl: z.string().min(1, 'URL stream video wajib ada'),
  lh3Url: z.string().min(1, 'URL akses publik wajib ada'),
  durationSeconds: z.number().optional(),
});

export const composerFormSchema = z
  .object({
    title: z.string().max(100, 'Judul internal maksimal 100 karakter').optional().or(z.literal('')),
    contentText: z
      .string()
      .min(1, 'Caption konten tidak boleh kosong')
      .max(5000, 'Caption konten maksimal 5000 karakter'),
    mediaType: z.enum(['TEXT', 'IMAGE', 'VIDEO']),
    media: mediaAssetSchema.nullable().optional(),
    mediaItems: z.array(mediaAssetSchema).optional(),
    targetAccounts: z
      .array(
        z.object({
          id: z.string().uuid('ID akun harus valid UUID'),
          platform: z.string(),
          account_name: z.string().optional(),
        })
      )
      .min(1, 'Pilih minimal satu akun tujuan postingan'),
    scheduledAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Format jadwal tanggal dan waktu tidak valid',
    }),
  })
  .superRefine((data, ctx) => {
    const selectedPlatforms = new Set(data.targetAccounts.map((a) => a.platform));
    const items = data.mediaItems?.length ? data.mediaItems : data.media ? [data.media] : [];

    // Validasi TikTok
    if (selectedPlatforms.has('tiktok')) {
      if (items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['media'],
          message: 'TikTok mewajibkan media (Video atau Gambar Foto). Tidak bisa teks saja.',
        });
      } else if (data.mediaType === 'VIDEO') {
        const dur = data.media?.durationSeconds;
        if (dur !== undefined && (dur < 3 || dur > 600)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['media', 'durationSeconds'],
            message: `Durasi video untuk TikTok harus antara 3 hingga 600 detik (durasi saat ini: ${dur.toFixed(1)}s).`,
          });
        }
      }
      if (data.contentText.length > 2200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentText'],
          message: 'Panjang caption untuk TikTok maksimal 2.200 karakter.',
        });
      }
    }

    // Validasi Instagram
    if (selectedPlatforms.has('instagram')) {
      if (data.mediaType === 'TEXT' || items.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['media'],
          message: 'Instagram mewajibkan konten visual (Foto, Carousel Slide, atau Video Reels).',
        });
      } else if (items.length > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['media'],
          message: 'Instagram Carousel maksimal 10 foto/video per postingan.',
        });
      } else if (data.mediaType === 'VIDEO') {
        const dur = data.media?.durationSeconds;
        if (dur !== undefined && dur < 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['media', 'durationSeconds'],
            message: `Video Instagram Reels minimal 3 detik (durasi saat ini: ${dur.toFixed(1)}s).`,
          });
        }
      }

      if (data.contentText.length > 2200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentText'],
          message: 'Panjang caption untuk Instagram maksimal 2.200 karakter.',
        });
      }
    }

    // Validasi Threads (jika ada)
    if (selectedPlatforms.has('threads')) {
      if (data.contentText.length > 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contentText'],
          message: 'Threads hanya mengizinkan maksimal 500 karakter per postingan.',
        });
      }
    }
  });

export type ComposerFormData = z.infer<typeof composerFormSchema>;
