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
        <div className="loading-icon-wrap">
          <span className="material-icons-round" style={{ fontSize: 40, color: 'var(--primary)' }}>rocket_launch</span>
        </div>
        <div className="loading-bar"><div className="loading-bar-fill" /></div>
      </div>
    </div>
  );
}
