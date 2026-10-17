import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { EnergyProvider } from './data/EnergyContext'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { LoadingState } from './components/Ui'
import { useEnergy } from './data/EnergyContext'

const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard: page }) => ({ default: page })))
const Optimization = lazy(() => import('./pages/Optimization').then(({ Optimization: page }) => ({ default: page })))
const Reports = lazy(() => import('./pages/Reports').then(({ Reports: page }) => ({ default: page })))

function AppRoutes() {
  const { user, authLoading } = useEnergy()

  if (authLoading) return <LoadingState />
  if (!user) return <AuthPage />

  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="optimization" element={<Optimization />} />
          <Route path="reports" element={<Reports />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <EnergyProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </EnergyProvider>
  )
}
