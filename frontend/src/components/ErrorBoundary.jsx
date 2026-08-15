import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const msg = String(error?.message || error || '');
    const isChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Failed to fetch dynamically');
    if (isChunkError && !sessionStorage.getItem('opencode_chunk_reload')) {
      sessionStorage.setItem('opencode_chunk_reload', '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Oops, terjadi kesalahan.</h2>
          <p style={{ color: '#666' }}>Gagal memuat halaman, mungkin karena koneksi terputus.</p>
          {this.state.error && (
            <p style={{ color: '#c0392b', fontSize: '13px', wordBreak: 'break-word', maxWidth: '480px', margin: '8px auto' }}>
              {this.state.error.message || String(this.state.error)}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Coba Lagi (Refresh)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
