import { Component, type ReactNode } from 'react'
import { Alert, Code } from '@mantine/core'

interface State { error: Error | null }

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
      return this.props.fallback ?? (
        <Alert color="red" title="Something went wrong" variant="light" m="md">
          <Code block style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </Code>
        </Alert>
      )
    }
    return this.props.children
  }
}
