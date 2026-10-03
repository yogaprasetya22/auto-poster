import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MainLayout } from '@/shared/components/layout/MainLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ComposerPage } from '@/features/composer/ComposerPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { SettingsPage } from '@/features/accounts/SettingsPage'

import { TermsPage } from '@/features/legal/TermsPage'
import { PrivacyPage } from '@/features/legal/PrivacyPage'

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

