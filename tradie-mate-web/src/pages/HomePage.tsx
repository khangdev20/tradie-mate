import { AppCard, AppButton } from '@tradiemate/ui'
import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <AppCard>
        <h1>TradieMate Web</h1>
        <p>Customer tracking, public profiles, enterprise dispatch, and marketplace booking.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
          <Link to="/enterprise"><AppButton>Enterprise Portal</AppButton></Link>
          <Link to="/marketplace"><AppButton variant="secondary">Marketplace</AppButton></Link>
        </div>
      </AppCard>
    </div>
  )
}
