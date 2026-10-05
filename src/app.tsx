import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/auth-context'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { MainLayout } from '@/shared/components/layout/main-layout'

// Route-level code splitting for maximum PageSpeed & Core Web Vitals performance
const LoginPage = lazy(() => import('@/features/auth/login-page').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/dashboard-page').then((m) => ({ default: m.DashboardPage })))
const ComposerPage = lazy(() => import('@/features/composer/composer-page').then((m) => ({ default: m.ComposerPage })))
const HistoryPage = lazy(() => import('@/features/history/history-page').then((m) => ({ default: m.HistoryPage })))
const SchedulePage = lazy(() => import('@/features/schedule/schedule-page').then((m) => ({ default: m.SchedulePage })))
const SettingsPage = lazy(() => import('@/features/accounts/settings-page').then((m) => ({ default: m.SettingsPage })))
const TermsPage = lazy(() => import('@/features/legal/terms-page').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/features/legal/privacy-page').then((m) => ({ default: m.PrivacyPage })))

function PageLoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FA] dark:bg-[#090A0C]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
        <span className="font-mono text-xs text-[#6B7280]">Memuat halaman...</span>
      </div>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <Suspense fallback={<PageLoadingFallback />}>
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
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
