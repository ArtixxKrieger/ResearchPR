import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { EnergyProvider } from './data/EnergyContext'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { LoadingState } from './components/Ui'
import { useEnergy } from './data/EnergyContext'
import { ThemeProvider } from './components/ThemeContext'
import { LandingPage } from './pages/LandingPage'

const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard: page }) => ({ default: page })))
const Optimization = lazy(() => import('./pages/Optimization').then(({ Optimization: page }) => ({ default: page })))
const Reports = lazy(() => import('./pages/Reports').then(({ Reports: page }) => ({ default: page })))

function AppRoutes() {
  const { user, authLoading } = useEnergy()

  if (authLoading) return <LoadingState />

  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        {user ? (
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="login" element={<Navigate to="/" replace />} />
            <Route path="optimization" element={<Optimization />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Dashboard />} />
          </Route>
        ) : (
          <>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <EnergyProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </EnergyProvider>
    </ThemeProvider>
  )
}
