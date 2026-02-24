'use client';

export default function OfflinePage() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100dvh',
            background: '#050505',
            color: '#fff',
            fontFamily: 'Rajdhani, sans-serif',
            padding: 24,
            textAlign: 'center',
        }}>
            <span className="material-icons-round" style={{
                fontSize: 64,
                color: '#FF4500',
                filter: 'drop-shadow(0 0 20px rgba(255,69,0,0.6))',
                marginBottom: 24,
            }}>
                wifi_off
            </span>
            <h1 style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 24,
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 12,
                color: '#FF4500',
            }}>
                Connection Lost
            </h1>
            <p style={{
                fontSize: 16,
                color: '#999',
                maxWidth: 400,
                lineHeight: 1.6,
                marginBottom: 32,
            }}>
                You&apos;re currently offline. Your data is cached locally and will sync when you reconnect.
            </p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '12px 32px',
                    background: 'linear-gradient(135deg, #FF4500, #B34522)',
                    color: '#fff',
                    border: '1px solid rgba(255,140,66,0.5)',
                    borderRadius: 14,
                    fontFamily: 'Rajdhani, sans-serif',
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(255,69,0,0.3)',
                    transition: 'all .3s',
                }}
            >
                Try Again
            </button>
        </div>
    );
}
