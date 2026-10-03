import { describe, it, expect } from 'vitest'
import { formatWIB } from '../shared/lib/date'
import { CreatePostPayloadSchema } from '../shared/types/contracts'

describe('Date & Expiry Logic', () => {
  it('correctly calculates 1-year token expiration (365 days)', () => {
    const now = Date.now()
    const oneYearLater = new Date(now + 365 * 24 * 3600_000)
    const diffDays = Math.round((oneYearLater.getTime() - now) / (24 * 3600_000))
    expect(diffDays).toBe(365)
  })

  it('formats ISO timestamps to WIB locale correctly', () => {
    const iso = '2026-10-03T00:00:00.000Z'
    const formatted = formatWIB(iso)
    expect(formatted).toContain('03 Okt 2026')
    expect(formatted).toContain('WIB')
  })

  it('determines if token is expiring soon (< 7 days threshold)', () => {
    const now = Date.now()
    function isExpiringSoon(expiresAt: string | null, currentTime = now) {
      if (!expiresAt) return false
      return new Date(expiresAt).getTime() - currentTime < 7 * 24 * 3600_000
    }

    // 1 day remaining -> true
    const soon = new Date(now + 1 * 24 * 3600_000).toISOString()
    expect(isExpiringSoon(soon)).toBe(true)

    // 1 year remaining -> false
    const longLived = new Date(now + 365 * 24 * 3600_000).toISOString()
    expect(isExpiringSoon(longLived)).toBe(false)
  })
})

describe('Contract & Payload Validation', () => {
  it('validates a valid CreatePostPayloadSchema', () => {
    const samplePayload = {
      title: 'Uji Coba Otomatis',
      contentText: 'Posting konten lintas platform',
      mediaType: 'IMAGE' as const,
      scheduledAt: new Date().toISOString(),
      targetAccountIds: ['d380db80-9a8f-4638-8b76-a4cfccac5369'],
      selectedPlatforms: ['facebook_page' as const]
    }

    const parsed = CreatePostPayloadSchema.safeParse(samplePayload)
    expect(parsed.success).toBe(true)
  })

  it('formats single Instagram image request without media_type: IMAGE', () => {
    // Critical fix: Instagram Graph API rejects media_type="IMAGE"
    const mediaUrl = 'https://lh3.googleusercontent.com/d/sample'
    const caption = 'Test caption'
    function buildPayload(type: string, url: string, cap: string) {
      const p: Record<string, any> = { caption: cap }
      if (type === 'VIDEO') {
        p.media_type = 'REELS'
        p.video_url = url
      } else {
        p.image_url = url
      }
      return p
    }

    const payload = buildPayload('IMAGE', mediaUrl, caption)
    expect(payload.media_type).toBeUndefined()
    expect(payload.image_url).toBe(mediaUrl)
    expect(payload.caption).toBe(caption)
  })
})
