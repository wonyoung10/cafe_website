import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[ErrorBoundary]', error, info.componentStack);
  }

  private handleRetry = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div role="alert" className="error-fallback">
        <p>화면을 불러오는 중 문제가 생겼어요.</p>
        <button type="button" onClick={this.handleRetry}>
          다시 시도
        </button>
      </div>
    );
  }
}
