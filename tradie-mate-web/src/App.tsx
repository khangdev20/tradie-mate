import { Routes, Route } from 'react-router-dom'
import { TrackPage } from './pages/TrackPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { EnterprisePortalPage } from './pages/EnterprisePortalPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { HomePage } from './pages/HomePage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/track/:token" element={<TrackPage />} />
      <Route path="/p/:slug" element={<PublicProfilePage />} />
      <Route path="/enterprise" element={<EnterprisePortalPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
    </Routes>
  )
}
