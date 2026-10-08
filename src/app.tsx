import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
const AutoSchedulePage = lazy(() => import('@/features/schedule/auto-schedule-page').then((m) => ({ default: m.AutoSchedulePage })))
const ProductsPage = lazy(() => import('@/features/products/products-page').then((m) => ({ default: m.ProductsPage })))
const SettingsPage = lazy(() => import('@/features/accounts/settings-page').then((m) => ({ default: m.SettingsPage })))
const TermsPage = lazy(() => import('@/features/legal/terms-page').then((m) => ({ default: m.TermsPage })))
const PrivacyPage = lazy(() => import('@/features/legal/privacy-page').then((m) => ({ default: m.PrivacyPage })))

import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

function PageLoadingFallback() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <SkeletonContainer isLoading={true}>
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-9 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        </div>
      </SkeletonContainer>
    </div>
  )
}
import { ThemeProvider } from '@/shared/components/theme-provider'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="osm-ape-theme">
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
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="composer" element={<ComposerPage />} />
                  <Route path="auto-schedule" element={<AutoSchedulePage />} />
                  <Route path="drafts" element={<Navigate to="/composer" replace />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
