'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DataProvider, useData } from '@/context/DataContext';
import Link from 'next/link';
import { t, TABS_GAME, TABS_PRO, HEADERS_GAME, HEADERS_PRO } from '@/lib/terms';
import ModalRouter from '@/components/modals/ModalRouter';
import { usePrefetch } from '@/lib/hooks';

/* ===== Prefetchable Link — prefetches route on hover/focus ===== */
function PrefetchLink({ href, className, style, children, order }: {
    href: string; className?: string; style?: React.CSSProperties;
    children: React.ReactNode; order?: number;
}) {
    const prefetchProps = usePrefetch(href);
    return (
        <Link href={href} className={className} style={{ ...style, order }} {...prefetchProps}>
            {children}
        </Link>
    );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, modal, setModal, toast, dataLoading, enrichedProjects, isStale, isOnline, undoDelete, pendingDeletes } = useData();
    const router = useRouter();
    const pathname = usePathname();
    const isEdu = profile?.theme === 'eduplex';
    const gm = profile?.gameMode ?? true;
    const TABS = gm ? TABS_GAME : TABS_PRO;
    const HEADERS = gm ? HEADERS_GAME : HEADERS_PRO;

    useEffect(() => {
        if (!authLoading && !user) router.replace('/login');
    }, [user, authLoading, router]);

    // Apply theme + game mode attribute
    useEffect(() => {
        const html = document.documentElement;
        if (profile?.theme === 'eduplex') {
            html.classList.add('theme-eduplex');
            html.classList.remove('dark');
        } else {
            html.classList.remove('theme-eduplex');
            html.classList.add('dark');
        }
        // Phase 2: Set data-game-mode attribute for CSS
        html.setAttribute('data-game-mode', gm ? 'on' : 'off');
    }, [profile?.theme, gm]);

    if (authLoading || !user) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-icon-wrap">
                        <span className="material-icons-round" style={{ fontSize: 40, color: 'var(--primary)' }}>{gm ? 'rocket_launch' : 'hourglass_empty'}</span>
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
                        <span className="material-icons-round" style={{ fontSize: 40, color: 'var(--primary)' }}>{gm ? 'downloading' : 'sync'}</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--t-666)', marginTop: 14, letterSpacing: 1.5, fontWeight: 600 }}>{t('loading', gm)}<span className="loading-dots" /></p>
                    <div className="loading-bar"><div className="loading-bar-fill" /></div>
                </div>
            </div>
        );
    }

    const currentKey = pathname.split('/')[1] || 'quests';
    const currentTab = TABS.findIndex(tab => pathname.startsWith('/' + tab.key));
    const headerTitle = HEADERS[currentKey] || HEADERS['quests'];
    const isSettings = currentKey === 'settings';

    return (
        <div className="app" suppressHydrationWarning>
            {/* Background Effects — game mode only (dark theme) */}
            {!isEdu && gm && (
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
                            ) : gm ? (
                                <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: 24, filter: isEdu ? 'none' : 'drop-shadow(0 0 8px rgba(255,69,0,0.8))' }}>local_fire_department</span>
                            ) : (
                                <span className="material-icons-round" style={{ color: 'var(--primary)', fontSize: 22 }}>widgets</span>
                            )}
                            <h1 style={{ fontFamily: gm ? 'Orbitron' : 'Inter', fontWeight: 700, fontSize: gm ? 16 : 18, letterSpacing: gm ? 3 : 0.5, textTransform: gm ? 'uppercase' : 'none', color: 'var(--t-fff,#fff)', transition: 'all .3s' }}>{headerTitle}</h1>
                        </div>
                        {!isSettings && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--g-05,rgba(255,255,255,0.05))', border: '1px solid var(--g-10,rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                                    <span className="material-icons-round" style={{ color: 'var(--t-999,#999)', fontSize: 18 }}>notifications</span>
                                </button>
                                <PrefetchLink href="/settings" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--g-05,rgba(255,255,255,0.05))', border: '1px solid var(--g-10,rgba(255,255,255,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'all .3s', textDecoration: 'none' }}>
                                    <span className="material-icons-round" style={{ color: 'var(--t-999,#999)', fontSize: 18 }}>settings</span>
                                </PrefetchLink>
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
                            { type: 'addTask' as const, icon: gm ? 'assignment' : 'add_task', label: t('create_task', gm), clr: '#FF4500', needsProject: true },
                            { type: 'addProject' as const, icon: gm ? 'inventory_2' : 'create_new_folder', label: t('create_proj', gm), clr: '#3b82f6', needsProject: false },
                            { type: 'addSubtask' as const, icon: 'checklist', label: t('create_sub', gm), clr: '#fbbf24', needsProject: true },
                        ]).filter(opt => !opt.needsProject || (enrichedProjects && enrichedProjects.length > 0)).map(opt => (
                            <button key={opt.type} onClick={e => { e.stopPropagation(); setModal({ type: opt.type }); }} style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                                background: isEdu ? '#FFFFFF' : 'rgba(15,15,18,0.95)', backdropFilter: 'blur(20px)',
                                border: `1px solid ${opt.clr}30`, borderRadius: 14,
                                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .2s',
                                boxShadow: isEdu ? '0 4px 20px rgba(0,0,0,0.08)' : `0 4px 20px rgba(0,0,0,0.5), 0 0 10px ${opt.clr}15`,
                            }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: opt.clr }}>{opt.icon}</span>
                                <span style={{ fontFamily: gm ? 'Rajdhani' : 'Inter', fontWeight: 700, fontSize: 13, color: isEdu ? '#1A1B27' : 'var(--t-ddd,#ddd)', letterSpacing: gm ? 1 : 0.3, textTransform: 'uppercase' }}>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* NAVIGATION — bottom on mobile, left sidebar on desktop */}
            <nav className="bottom-nav">
                {/* Desktop brand logo — hidden on mobile via CSS */}
                <div className="sidebar-brand" style={{ display: 'none', padding: '20px 12px 16px', textAlign: 'center', borderBottom: '1px solid var(--g-06)', marginBottom: 8 }}>
                    <span className="material-icons-round" style={{ fontSize: 28, color: 'var(--primary)', filter: isEdu || !gm ? 'none' : 'drop-shadow(0 0 6px rgba(255,69,0,0.8))' }}>{gm ? 'local_fire_department' : 'widgets'}</span>
                </div>

                <div className="glass-morphism bottom-nav-inner">
                    {/* First 2 tabs — with route prefetching on hover */}
                    {TABS.slice(0, 2).map((tab, i) => (
                        <PrefetchLink key={tab.key} href={`/${tab.key}`} className={`nav-item${currentTab === i ? ' active' : ''}`} order={i}>
                            <span className="material-icons-round" style={{ fontSize: 18, filter: currentTab === i && !isEdu && gm ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                            <div className="nav-dot" />
                        </PrefetchLink>
                    ))}

                    {/* Last 2 tabs — with route prefetching on hover */}
                    {TABS.slice(2, 4).map((tab, i) => (
                        <PrefetchLink key={tab.key} href={`/${tab.key}`} className={`nav-item${currentTab === i + 2 ? ' active' : ''}`} order={i + 3}>
                            <span className="material-icons-round" style={{ fontSize: 18, filter: currentTab === i + 2 && !isEdu && gm ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{tab.icon}</span>
                            <span className="nav-label">{tab.label}</span>
                            <div className="nav-dot" />
                        </PrefetchLink>
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
                                : gm
                                    ? (modal?.type === 'fabMenu' ? 'linear-gradient(135deg,#B34522,#8B0000)' : 'linear-gradient(135deg,var(--primary),#B34522)')
                                    : (modal?.type === 'fabMenu' ? 'var(--primary)' : 'var(--primary)'),
                            color: isEdu ? '#1A1B27' : '#fff',
                            border: isEdu ? '1px solid rgba(200,249,2,0.5)' : gm ? '1px solid rgba(255,140,66,0.5)' : '1px solid var(--primary)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all .3s', flexShrink: 0, position: 'relative',
                            boxShadow: isEdu ? '0 0 12px rgba(200,249,2,0.4)' : gm ? '0 0 8px rgba(255,69,0,0.35)' : '0 2px 8px rgba(0,0,0,0.3)',
                            margin: '0 auto',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 18 }}>add</span>
                        <span className="fab-label" style={{ display: 'none' }}>Create</span>
                    </button>
                </div>

                {/* Desktop settings link at bottom — hidden on mobile */}
                <div className="sidebar-footer" style={{ display: 'none', padding: '8px 12px 16px', marginTop: 'auto', borderTop: '1px solid var(--g-06)' }}>
                    <PrefetchLink href="/settings" className={`nav-item${currentKey === 'settings' ? ' active' : ''}`} style={{ margin: 0 }}>
                        <span className="material-icons-round" style={{ fontSize: 20 }}>settings</span>
                        <span className="nav-label">{gm ? 'Config' : 'Settings'}</span>
                    </PrefetchLink>
                </div>
            </nav>

            {/* Modals */}
            <ModalRouter />

            {/* Offline Indicator */}
            {!isOnline && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
                    background: 'linear-gradient(135deg, #B34522, #8B0000)',
                    color: '#fff', padding: '6px 16px', fontSize: 11,
                    fontFamily: gm ? 'Rajdhani' : 'Inter', fontWeight: 700,
                    textAlign: 'center', letterSpacing: 1.5, textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <span className="material-icons-round" style={{ fontSize: 14 }}>wifi_off</span>
                    Offline — changes will sync when reconnected
                </div>
            )}

            {/* Stale Data Indicator */}
            {isStale && isOnline && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
                    background: 'rgba(59,130,246,0.9)',
                    color: '#fff', padding: '4px 16px', fontSize: 10,
                    fontFamily: gm ? 'Rajdhani' : 'Inter', fontWeight: 600,
                    textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <span className="material-icons-round" style={{ fontSize: 12 }}>sync</span>
                    Syncing fresh data...
                </div>
            )}

            {/* Toast — with undo support for deletes */}
            {toast && (
                <div
                    onClick={() => {
                        // Check if this is an undo-able toast
                        if (toast.includes('undo') && pendingDeletes.size > 0) {
                            const lastDelete = Array.from(pendingDeletes.keys()).pop();
                            if (lastDelete) undoDelete(lastDelete);
                        }
                    }}
                    style={{
                        position: 'fixed', top: !isOnline ? 40 : 20, right: 20, left: 'auto', transform: 'none',
                        background: isEdu ? '#1A1B27' : gm ? 'rgba(255,69,0,0.95)' : 'var(--primary)',
                        color: '#fff', padding: '12px 24px', borderRadius: gm ? 14 : 10,
                        fontSize: 13, fontFamily: gm ? 'Rajdhani' : 'Inter', fontWeight: gm ? 700 : 600,
                        zIndex: 9999,
                        pointerEvents: toast.includes('undo') ? 'auto' : 'none',
                        cursor: toast.includes('undo') ? 'pointer' : 'default',
                        boxShadow: isEdu ? '0 4px 20px rgba(0,0,0,0.15)' : gm ? '0 8px 30px rgba(255,69,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
                        animation: 'fadeIn .15s ease',
                        display: 'flex', alignItems: 'center', gap: 8, maxWidth: 340,
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: 18 }}>
                        {toast.includes('undo') ? 'undo' : toast.includes('Failed') ? 'error' : 'check_circle'}
                    </span>
                    {toast}
                    {toast.includes('undo') && (
                        <span style={{
                            marginLeft: 8, padding: '2px 8px',
                            background: 'rgba(255,255,255,0.2)', borderRadius: 6,
                            fontSize: 11, fontWeight: 700, letterSpacing: 1,
                        }}>
                            UNDO
                        </span>
                    )}
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
