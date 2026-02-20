'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(user ? '/quests' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center' }}>
        <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--primary)', animation: 'borderPulse 2s infinite' }}>rocket_launch</span>
        <p style={{ fontFamily: 'Orbitron', fontSize: 12, color: 'var(--t-666)', marginTop: 12, letterSpacing: 2 }}>INITIALIZING...</p>
      </div>
    </div>
  );
}
