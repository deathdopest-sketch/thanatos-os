import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThanatosDesktop } from './thanatos-desktop';
import './styles.css';

class ThanatosErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Thanatos OS render failure', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-shell">
          <section>
            <strong>THANATOS BOOT FAULT</strong>
            <p>The shell hit a browser runtime error instead of loading cleanly.</p>
            <code>{this.state.error.message}</code>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThanatosErrorBoundary>
      <ThanatosDesktop />
    </ThanatosErrorBoundary>
  </React.StrictMode>
);
