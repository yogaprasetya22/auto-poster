import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainLayout } from '@/shared/components/layout/main-layout'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { ComposerPage } from '@/features/composer/composer-page'
import { HistoryPage } from '@/features/history/history-page'
import { SettingsPage } from '@/features/accounts/settings-page'

import { TermsPage } from '@/features/legal/terms-page'
import { PrivacyPage } from '@/features/legal/privacy-page'

export function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="composer" element={<ComposerPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

