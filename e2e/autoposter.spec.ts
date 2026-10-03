import { test, expect } from '@playwright/test';

test.describe('Auto-Poster Full Feature Smoke Test (/ponytail)', () => {

  test('1. Dashboard Page loads metrics & navigation', async ({ page }) => {
    await page.goto('/');
    // Verifikasi navigasi utama sidebar
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/composer"]').first()).toBeVisible();
    await expect(page.locator('a[href="/history"]').first()).toBeVisible();
    await expect(page.locator('a[href="/settings"]').first()).toBeVisible();
  });

  test('2. Composer Page loads 1-Prompt Autopilot & Phone Canvas', async ({ page }) => {
    await page.goto('/composer');
    // Verifikasi Autopilot Command Bar
    await expect(page.locator('text=1-Prompt Studio Autopilot')).toBeVisible();
    await expect(page.locator('input[placeholder*="Ketik ide postingan"]')).toBeVisible();

    // Verifikasi Input Judul & Akun
    await expect(page.locator('input#campaign-title')).toBeVisible();
    await expect(page.locator('text=Target Platform & Akun Distribusi')).toBeVisible();

    // Verifikasi Phone Simulator Canvas
    await expect(page.locator('text=5G')).toBeVisible();
    await expect(page.locator('text=Canvas Preview 9:16')).toBeVisible();

    // Verifikasi Tab Media Uploader (Video Footage Promosi, Manual, Vision Clone, Kartun Pixabay)
    await expect(page.locator('text=Video Footage Promosi')).toBeVisible();
    await expect(page.locator('text=Manual')).toBeVisible();
    await expect(page.locator('text=Vision Clone')).toBeVisible();
    await expect(page.locator('text=Kartun Pixabay MP4')).toBeVisible();
  });

  test('3. Composer Input interaction & Form validation', async ({ page }) => {
    await page.goto('/composer');
    
    // Ketik judul konten
    const titleInput = page.locator('input#campaign-title');
    await titleInput.fill('E2E Test Automated Campaign');
    await expect(titleInput).toHaveValue('E2E Test Automated Campaign');

    // Ketik caption
    const captionInput = page.locator('textarea#caption-input');
    await captionInput.fill('Ini caption testing otomatis via Playwright. #TestJAGRES #Promo');
    await expect(captionInput).toHaveValue('Ini caption testing otomatis via Playwright. #TestJAGRES #Promo');

    // Phone simulator harus merefleksikan caption real-time di simulator paragraph
    await expect(page.locator('p:has-text("Ini caption testing otomatis via Playwright")')).toBeVisible();
  });

  test('4. History Page loads table & metrics', async ({ page }) => {
    await page.goto('/history');
    await expect(page.locator('h1:has-text("Riwayat Eksekusi")').first()).toBeVisible();
    await expect(page.locator('text=Total Dispatch')).toBeVisible();
    await expect(page.locator('text=Antrean Aktif')).toBeVisible();
    await expect(page.locator('text=Gagal Dispatch')).toBeVisible();

    // Verifikasi tombol aksi
    await expect(page.locator('button:has-text("Bersihkan Semua")')).toBeVisible();
    await expect(page.locator('button:has-text("Reload")')).toBeVisible();
  });

  test('5. Connected Accounts & Settings Page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1:has-text("Pengaturan & Koneksi Akun")').first()).toBeVisible();
    await expect(page.locator('text=Instagram')).toBeVisible();
    await expect(page.locator('text=TikTok')).toBeVisible();
    await expect(page.locator('text=Facebook Page')).toBeVisible();
  });

  test('6. Backend API health check', async ({ request }) => {
    // Check dispatcher endpoint response
    const res = await request.get('/api/cron/dispatcher');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('success');
  });

});
