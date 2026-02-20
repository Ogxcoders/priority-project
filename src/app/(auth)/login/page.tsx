'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const { user, loading, loginWithGoogle } = useAuth();
    const router = useRouter();

    // If already logged in, redirect to quests
    useEffect(() => {
        if (!loading && user) router.replace('/quests');
    }, [user, loading, router]);

    return (
        <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 360 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-glow))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(255,69,0,0.3)' }}>
                        <span className="material-icons-round" style={{ fontSize: 40, color: '#fff' }}>rocket_launch</span>
                    </div>
                    <h1 className="text-metallic" style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900, letterSpacing: 3 }}>PRIORITY</h1>
                    <h1 style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900, letterSpacing: 3, color: 'var(--primary)', marginTop: -4 }}>COMMANDER</h1>
                    <p style={{ fontSize: 11, color: 'var(--t-666)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 8 }}>Mission Control Access</p>
                </div>

                {/* Google Sign In Button */}
                <button
                    onClick={loginWithGoogle}
                    disabled={loading}
                    style={{
                        width: '100%', padding: '14px 20px', borderRadius: 14,
                        background: '#fff', color: '#1f1f1f',
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                        fontSize: 14, fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 1,
                        transition: 'all .2s', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {/* Google "G" logo */}
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    {loading ? 'Checking session...' : 'Continue with Google'}
                </button>

                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--t-555)', marginTop: 24, letterSpacing: 1 }}>
                    Secure authentication powered by Google
                </p>
            </div>
        </div>
    );
}
