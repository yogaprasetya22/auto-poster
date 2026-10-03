import { test, expect } from '@playwright/test';

test.describe('Automated AI Video Post Generation & Execution (/ponytail)', () => {

  test('Create & Schedule Post 1: Real-Life NFC Tap Practice Video (Google Drive + Voiceover)', async ({ page, request }) => {
    // 1. Panggil AI Motion Video API untuk mendapatkan aset GDrive resmi
    const aiRes = await request.post('/api/ai/motion-video', {
      data: {
        duration: 6,
        title: 'PRAKTIK TAP GOOGLE REVIEW NFC',
        subtitle: 'Sekali Tempel Ulasan Bintang 5 Langsung Masuk',
        ctaText: 'Tingkatkan Omzet Resto Anda',
        bgTheme: 'dark',
        imagePath: 'public/nfc_tap_practice.jpg',
        voiceover: true,
        voiceGender: 'female',
        customScript: 'Begini cara praktis menaikkan rating restoran. Cukup tempelkan handphone pelanggan ke kartu NFC Jagres, review bintang lima langsung terbuka dalam satu detik!',
      },
    });
    expect(aiRes.status()).toBe(200);
    const aiData = await aiRes.json();
    expect(aiData.success).toBe(true);
    expect(aiData.data.fileId).toBeTruthy();

    // 2. Buka Composer Studio
    await page.goto('/composer');
    await page.waitForLoadState('networkidle');

    // 3. Isi Judul Konten
    const titleInput = page.locator('input#campaign-title');
    await titleInput.fill('Demo Nyata Pelanggan Tap Kartu Review NFC JAGRES');

    // 4. Pilih Akun Target (Pilih TikTok yang siap auto-dispatch)
    const selectAllBtn = page.locator('button:has-text("Pilih Semua")');
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();
    }

    // 5. Isi Naskah Caption & Hashtag
    const captionInput = page.locator('textarea#caption-input');
    await captionInput.fill(
      'Keren banget! Ini dia cara modern restoran ramai ulasan bintang 5 Google Maps tanpa ribet. Cukup tap kartu NFC JAGRES ke smartphone pelanggan, ulasan langsung terbuka dalam 1 detik! 🌟 #JAGRES #GoogleReviewCard #BisnisKuliner #UMKM'
    );

    // 6. Pasang media Google Drive yang digenerate oleh AI ke Composer Store
    await page.evaluate((asset) => {
      // @ts-ignore
      const store = window.__COMPOSER_STORE__ || (window as any).useComposerStore;
      if (store && store.getState) {
        store.getState().setMedia({
          fileId: asset.fileId,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          mimeType: 'video/mp4',
          streamUrl: asset.streamUrl,
          lh3Url: asset.lh3Url,
          durationSeconds: asset.durationSeconds,
        });
        store.getState().setScheduledAt(new Date(Date.now() - 60000).toISOString()); // Set past time agar langsung dieksekusi
      }
    }, aiData.data);

    // 7. Klik tombol Jadwalkan & Dispatch Konten
    const submitBtn = page.locator('button:has-text("Jadwalkan & Dispatch Konten")');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Tunggu notifikasi toast sukses
    await expect(page.locator('text=Postingan berhasil dijadwalkan!')).toBeVisible({ timeout: 8000 });
  });

  test('Create & Schedule Post 2: Promo Kartu Review Google (3D Commercial + Voiceover)', async ({ page, request }) => {
    // 1. Panggil AI Motion Video API untuk video ke-2
    const aiRes = await request.post('/api/ai/motion-video', {
      data: {
        duration: 7,
        title: 'KARTU REVIEW GOOGLE JAGRES',
        subtitle: 'Solusi Bintang 5 Anti Ribet',
        ctaText: 'Dapatkan Paket Promo Sekarang',
        bgTheme: 'gold',
        imagePath: 'public/jagres_cartoon_promo.jpg',
        voiceover: true,
        voiceGender: 'male',
        customScript: 'Bisnis Anda sepi review? Pakai kartu pintar Jagres Google Review. Cukup tap dengan smartphone, pelanggan langsung kasih bintang lima. Pesan sekarang juga!',
      },
    });
    expect(aiRes.status()).toBe(200);
    const aiData = await aiRes.json();
    expect(aiData.success).toBe(true);

    // 2. Buka Composer Studio
    await page.goto('/composer');
    await page.waitForLoadState('networkidle');

    // 3. Isi Judul
    await page.locator('input#campaign-title').fill('Solusi Toko Banjir Rating Bintang 5 - JAGRES NFC');

    // 4. Pilih Akun Target
    const selectAllBtn = page.locator('button:has-text("Pilih Semua")');
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();
    }

    // 5. Isi Naskah Caption
    await page.locator('textarea#caption-input').fill(
      'Mau rating toko Anda melejit ke bintang 5 di Google Maps? Coba teknologi kartu review NFC JAGRES. Sekali tempel, review bintang 5 langsung masuk. Cek peluang reseller modal 1 jutaan! 🚀 #JAGRES #PeluangUsaha #KartuReview'
    );

    // 6. Pasang media ke state
    await page.evaluate((asset) => {
      // @ts-ignore
      const store = window.__COMPOSER_STORE__ || (window as any).useComposerStore;
      if (store && store.getState) {
        store.getState().setMedia({
          fileId: asset.fileId,
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          mimeType: 'video/mp4',
          streamUrl: asset.streamUrl,
          lh3Url: asset.lh3Url,
          durationSeconds: asset.durationSeconds,
        });
        store.getState().setScheduledAt(new Date(Date.now() - 60000).toISOString());
      }
    }, aiData.data);

    // 7. Submit Postingan ke-2
    const submitBtn = page.locator('button:has-text("Jadwalkan & Dispatch Konten")');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    await expect(page.locator('text=Postingan berhasil dijadwalkan!')).toBeVisible({ timeout: 8000 });
  });

  test('Verify and Trigger Execution until SUCCESS', async ({ page, request }) => {
    // 1. Panggil background dispatcher untuk mengeksekusi kedua postingan
    const dispatchRes = await request.get('/api/cron/dispatcher');
    expect(dispatchRes.status()).toBe(200);

    // 2. Buka History Page
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    // 3. Verifikasi kedua postingan tampil di halaman History
    await expect(page.locator('h1:has-text("Riwayat Eksekusi")').first()).toBeVisible();
    await expect(page.locator('text=Demo Nyata Pelanggan Tap Kartu Review').first()).toBeVisible();
    await expect(page.locator('text=Solusi Toko Banjir Rating Bintang 5').first()).toBeVisible();

    // 4. Verifikasi tombol "Lihat Konten" dapat dibuka
    const viewBtn = page.locator('button:has-text("Lihat Konten")').first();
    await viewBtn.click();
    await expect(page.locator('text=Naskah Caption & Hashtag:')).toBeVisible();
    await expect(page.locator('text=Asset Media (Google Drive CDN):')).toBeVisible();

    // Tutup modal detail
    await page.locator('button:has-text("Tutup")').click();
  });

});
