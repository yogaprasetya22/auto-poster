import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/auth-context'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { LoginPage } from '@/features/auth/login-page'
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
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Protected Routes (Wajib Login Supabase) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="composer" element={<ComposerPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
