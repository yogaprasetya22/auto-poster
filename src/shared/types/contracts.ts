import { z } from 'zod';

export const MediaTypeSchema = z.enum(['TEXT', 'IMAGE', 'VIDEO']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const PlatformSchema = z.enum([
  'facebook_page',
  'instagram',
  'threads',
  'tiktok'
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const PostStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'PROCESSING',
  'COMPLETED',
  'PARTIALLY_FAILED',
  'FAILED'
]);
export type PostStatus = z.infer<typeof PostStatusSchema>;

export const TargetStatusSchema = z.enum([
  'PENDING',
  'CONTAINER_INITIALIZED',
  'IN_PROGRESS',
  'SUCCESS',
  'FAILED'
]);
export type TargetStatus = z.infer<typeof TargetStatusSchema>;

// Media Asset Contract (Google Drive)
export const GDriveMediaAssetSchema = z.object({
  fileId: z.string().min(1, 'Google Drive File ID diperlukan'),
  fileName: z.string().min(1, 'Nama file tidak boleh kosong'),
  mimeType: z.string(),
  fileSize: z.number().positive().max(100 * 1024 * 1024, 'Maksimal ukuran file adalah 100 MB'),
  streamUrl: z.string(),
  lh3Url: z.string(),
  durationSeconds: z.number().min(1).max(600).optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional()
});
export type GDriveMediaAsset = z.infer<typeof GDriveMediaAssetSchema>;

// Connected Account Contract
export const ConnectedAccountSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  platform: PlatformSchema,
  account_name: z.string().min(1),
  account_avatar_url: z.string().nullable().optional(),
  platform_user_id: z.string().min(1),
  platform_parent_id: z.string().nullable().optional(),
  token_expires_at: z.string().nullable().optional(),
  scopes: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

// Post Creation Payload Contract
export const CreatePostPayloadSchema = z.object({
  title: z.string().max(200, 'Judul internal maksimal 200 karakter').optional(),
  contentText: z.string().min(1, 'Konten teks tidak boleh kosong').max(63206, 'Melebihi batas maksimal teks FB'),
  mediaType: MediaTypeSchema.default('TEXT'),
  mediaAsset: GDriveMediaAssetSchema.optional().nullable(),
  scheduledAt: z.string(),
  targetAccountIds: z.array(z.string()).min(1, 'Pilih minimal satu akun tujuan'),
  selectedPlatforms: z.array(PlatformSchema).min(1, 'Minimal satu target platform harus dipilih')
}).superRefine((data, ctx) => {
  if (data.selectedPlatforms.includes('threads') && data.contentText.length > 500) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contentText'],
      message: `Teks untuk Threads maksimal 500 karakter (saat ini: ${data.contentText.length} karakter)`
    });
  }

  if (data.selectedPlatforms.includes('instagram') && data.mediaType === 'VIDEO') {
    if (!data.mediaAsset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaAsset'],
        message: 'Instagram Reels memerlukan file video yang telah diunggah ke Google Drive'
      });
    } else if (data.mediaAsset.durationSeconds && data.mediaAsset.durationSeconds > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaAsset', 'durationSeconds'],
        message: `Durasi video Instagram Reels maksimal 90 detik (terdeteksi: ${data.mediaAsset.durationSeconds} detik)`
      });
    }
  }

  if (data.selectedPlatforms.includes('tiktok')) {
    if (data.mediaType !== 'VIDEO' || !data.mediaAsset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaType'],
        message: 'TikTok Direct Post hanya mendukung publikasi video'
      });
    } else if (data.mediaAsset.durationSeconds && data.mediaAsset.durationSeconds < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mediaAsset', 'durationSeconds'],
        message: 'Durasi video TikTok minimal 3 detik'
      });
    }
  }
});
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>;
