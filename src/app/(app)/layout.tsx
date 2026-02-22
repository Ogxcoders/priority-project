'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import Link from 'next/link';
import { TABS } from '@/lib/constants';
import ModalRouter from '@/components/modals/ModalRouter';

const TAB_HEADERS: Record<string, string> = {
    quests: 'Quest Log',
    board: 'Bounty Board',
    map: 'Strategic Map',
    profile: 'Commander',
    settings: 'System Config',
};

function AppShellInner({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, modal, setModal, toast, dataLoading, enrichedProjects } = useData();
    const router = useRouter();
    const pathname = usePathname();
    const isEdu = profile?.theme === 'eduplex';

    useEffect(() => {
        if (!authLoading && !user) router.replace('/login');
    }, [user, authLoading, router]);

    // Apply theme
    useEffect(() => {
        if (profile?.theme === 'eduplex') {
            document.documentElement.classList.add('theme-eduplex');
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.remove('theme-eduplex');
            document.documentElement.classList.add('dark');
        }
    }, [profile?.theme]);

    if (authLoading || !user) {
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

    if (dataLoading) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-icon-wrap">
                        <span className="material-icons-round" style={{ fontSize: 40, color: 'var(--primary)' }}>downloading</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--t-666)', marginTop: 14, letterSpacing: 1.5, fontWeight: 600 }}>Loading data<span className="loading-dots" /></p>
                    <div className="loading-bar"><div className="loading-bar-fill" /></div>
                </div>
            </div>
        );
    }

    const currentKey = pathname.split('/')[1] || 'quests';
    const currentTab = TABS.findIndex(t => pathname.startsWith('/' + t.key));
    const headerTitle = TAB_HEADERS[currentKey] || 'Quest Log';
    const isSettings = currentKey === 'settings';

    return (
        <div className="app" suppressHydrationWarning>
            {/* Background Effects (dark theme only) */}
            {!isEdu && (
                <div className="bg-effects">
                    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1, background: 'radial-gradient(circle at top center,#2a1510 0%,#050505 60%)', opacity: 0.8 }} />
                    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, background: 'rgba(255,69,0,0.1)', borderRadius: '50%', filter: 'blur(120px)' }} />
                        <div style={{ position: 'absolute', bottom: '10%', right: '-5%', width: 300, height: 300, background: 'rgba(255,69,0,0.05)', borderRadius: '50%', filter: 'blur(100px)' }} />
                        {[10, 30, 60, 80, 50].map((l, i) => (
                            <div key={i} className="floating-spark" style={{ left: l + '%', animationDelay: (i * 1.5) + 's', animationDuration: (6 + i) + 's' }} />
                        ))}
                        {[
                            { w: 4, h: 4, top: '20%', left: '10%', delay: '0s' },
                            { w: 6, h: 6, top: '60%', left: '80%', delay: '2s' },
                            { w: 3, h: 3, top: '40%', left: '40%', delay: '4s' },
                        ].map((p, i) => (
                            <div key={i} className="particle" style={{ width: p.w, height: p.h, top: p.top, left: p.left, animationDelay: p.delay }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="app-content no-scrollbar">
                {/* Top Header Bar */}
                <header style={{ padding: '48px 0 8px', position: 'relative', zIndex: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isSettings ? (
                                <button onClick={() => router.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--g-05)', border: '1px solid var(--g-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .3s' }}>
                                    <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: 20 }}>arrow_back</span>
                                </button>
                            ) : (
                                <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: 24, filter: isEdu ? 'none' : 'drop-shadow(0 0 8px rgba(255,69,0,0.8))' }}>local_fire_department</span>
                            )}
                            <h1 style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--t-fff,#fff)' }}>{headerTitle}</h1>
                        </div>
                        {!isSettings && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--g-05,rgba(255,255,255,0.05))', border: '1px solid var(--g-10,rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                                    <span className="material-icons-round" style={{ color: 'var(--t-999,#999)', fontSize: 18 }}>notifications</span>
                                </button>
                                <Link href="/settings" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--g-05,rgba(255,255,255,0.05))', border: '1px solid var(--g-10,rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all .3s', textDecoration: 'none' }}>
                                    <span className="material-icons-round" style={{ color: 'var(--t-999,#999)', fontSize: 18 }}>settings</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

                {children}
            </main>

            {/* FAB POPUP MENU */}
            {modal?.type === 'fabMenu' && (
                <div className="fab-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setModal(null)}>
                    <div className="fab-options" style={{ position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 6, animation: 'fadeIn .2s ease' }}>
                        {([
                            { type: 'addTask' as const, icon: 'assignment', label: 'New Quest', clr: '#FF4500', needsProject: true },
                            { type: 'addProject' as const, icon: 'inventory_2', label: 'New Campaign', clr: '#3b82f6', needsProject: false },
                            { type: 'addSubtask' as const, icon: 'checklist', label: 'New Subtask', clr: '#fbbf24', needsProject: true },
                        ]).filter(opt => !opt.needsProject || (enrichedProjects && enrichedProjects.length > 0)).map(opt => (
                            <button key={opt.type} onClick={e => { e.stopPropagation(); setModal({ type: opt.type }); }} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                                background: isEdu ? '#FFFFFF' : 'rgba(15,15,18,0.95)', backdropFilter: 'blur(20px)',
                                border: `1px solid ${opt.clr}30`, borderRadius: 14,
                                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s',
                                boxShadow: isEdu ? '0 4px 20px rgba(0,0,0,0.08)' : `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${opt.clr}15`,
                            }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: opt.clr }}>{opt.icon}</span>
                                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13, color: isEdu ? '#1A1B27' : 'var(--t-ddd,#ddd)', letterSpacing: 1, textTransform: 'uppercase' }}>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* NAVIGATION — bottom on mobile, left sidebar on desktop */}
            <nav className="bottom-nav">
                {/* Desktop brand logo — hidden on mobile via CSS */}
                <div className="sidebar-brand" style={{ display: 'none', padding: '20px 12px 16px', textAlign: 'center', borderBottom: '1px solid var(--g-06)', marginBottom: 8 }}>
                    <span className="material-icons-round" style={{ fontSize: 28, color: 'var(--primary)', filter: isEdu ? 'none' : 'drop-shadow(0 0 6px rgba(255,69,0,0.8))' }}>local_fire_department</span>
                </div>

                <div className="glass-morphism bottom-nav-inner">
                    {/* First 2 tabs */}
                    {TABS.slice(0, 2).map((tab, i) => (
                        <Link key={tab.key} href={`/${tab.key}`} className={`nav-item${currentTab === i ? ' active' : ''}`} style={{ order: i }}>
                            <span className="material-icons-round" style={{ fontSize: 18, filter: currentTab === i && !isEdu ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                            <div className="nav-dot" />
                        </Link>
                    ))}

                    {/* Last 2 tabs */}
                    {TABS.slice(2, 4).map((tab, i) => (
                        <Link key={tab.key} href={`/${tab.key}`} className={`nav-item${currentTab === i + 2 ? ' active' : ''}`} style={{ order: i + 3 }}>
                            <span className="material-icons-round" style={{ fontSize: 18, filter: currentTab === i + 2 && !isEdu ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                            <div className="nav-dot" />
                        </Link>
                    ))}

                    {/* FAB — order:2 on mobile (center), order:10 on desktop (bottom) */}
                    <button
                        className={`fab-create${modal?.type === 'fabMenu' ? ' active' : ''}`}
                        onClick={() => setModal(modal?.type === 'fabMenu' ? null : { type: 'fabMenu' })}
                        style={{
                            order: 2,
                            width: 34, height: 34, borderRadius: '50%',
                            background: isEdu
                                ? (modal?.type === 'fabMenu' ? 'linear-gradient(135deg,#A8D900,#6B8E00)' : 'linear-gradient(135deg,#C8F902,#A8D900)')
                                : (modal?.type === 'fabMenu' ? 'linear-gradient(135deg,#B34522,#8B0000)' : 'linear-gradient(135deg,var(--primary),#B34522)'),
                            color: isEdu ? '#1A1B27' : '#fff',
                            border: isEdu ? '1px solid rgba(200,249,2,0.5)' : '1px solid rgba(255,140,66,0.5)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .3s', flexShrink: 0, position: 'relative',
                            boxShadow: isEdu ? '0 0 12px rgba(200,249,2,0.4)' : '0 0 8px rgba(255,69,0,0.35)',
                            margin: '0 auto',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>add</span>
                        <span className="fab-label" style={{ display: 'none' }}>Create</span>
                    </button>
                </div>

                {/* Desktop settings link at bottom — hidden on mobile */}
                <div className="sidebar-footer" style={{ display: 'none', padding: '8px 12px 16px', marginTop: 'auto', borderTop: '1px solid var(--g-06)' }}>
                    <Link href="/settings" className={`nav-item${currentKey === 'settings' ? ' active' : ''}`} style={{ margin: 0 }}>
                        <span className="material-icons-round" style={{ fontSize: 20 }}>settings</span>
                        <span className="nav-label">Config</span>
                    </Link>
                </div>
            </nav>

            {/* Modals */}
            <ModalRouter />

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', top: 20, right: 20, left: 'auto', transform: 'none', background: isEdu ? '#1A1B27' : 'rgba(255,69,0,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 14, fontSize: 13, fontFamily: 'Rajdhani', fontWeight: 700, zIndex: 9999, pointerEvents: 'none', boxShadow: isEdu ? '0 4px 20px rgba(0,0,0,0.15)' : '0 8px 30px rgba(255,69,0,0.4)', animation: 'fadeIn .15s ease', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 340 }}>
                    <span className="material-icons-round" style={{ fontSize: 18 }}>check_circle</span>
                    {toast}
                </div>
            )}
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <DataProvider>
            <AppShellInner>{children}</AppShellInner>
        </DataProvider>
    );
}
