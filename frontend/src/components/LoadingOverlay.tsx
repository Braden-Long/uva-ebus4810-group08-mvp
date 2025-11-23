interface LoadingOverlayProps {
  show: boolean
}

export default function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner" />
        <h2>Waking up server...</h2>
        <p className="muted">This may take 30-60 seconds on first load</p>
      </div>
    </div>
  )
}
