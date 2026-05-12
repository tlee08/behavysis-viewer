import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: 24, color: '#ef4444', fontFamily: 'monospace', fontSize: 13 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Something went wrong</div>
            <pre style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'pre-wrap' }}>
              {this.state.error.message}
            </pre>
          </div>
        )
      )
    }
    return this.props.children
  }
}
