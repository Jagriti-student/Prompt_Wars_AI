import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#330000', color: 'white', height: '100vh', width: '100vw', overflow: 'auto', position: 'absolute', top: 0, left: 0, zIndex: 999999 }}>
          <h2 style={{color: '#ff6666'}}>Crash Detected</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 10, fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {this.state.error && this.state.error.toString()}
            <br /><br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}
