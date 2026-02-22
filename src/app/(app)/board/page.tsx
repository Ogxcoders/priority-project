'use client';
import { useData } from '@/context/DataContext';
import { currSym, priCls } from '@/lib/constants';

export default function BoardPage() {
    const { enrichedProjects, profile, setModal } = useData();
    const cs = currSym(profile?.currency || 'USD');
    const isEdu = profile?.theme === 'eduplex';
    const showLoot = profile?.showLoot ?? false;

    return (
        <div className="anim-entry">
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 10, borderRadius: 12, background: 'var(--b-40)', border: '1px solid var(--g-05)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Campaigns</span>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Orbitron', color: 'var(--t-fff)' }}>{enrichedProjects.length}</span>
                </div>
                {showLoot && (
                    <div style={{ flex: 1, padding: 10, borderRadius: 12, background: 'var(--b-40)', border: '1px solid var(--g-05)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Total Loot</span>
                        <span className="text-gold" style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Orbitron' }}>{cs}{enrichedProjects.reduce((s, p) => s + p.money, 0).toLocaleString()}</span>
                    </div>
                )}
            </div>

            {enrichedProjects.map((p) => {
                const clr = p.color || '#FF4500';
                const pct = p.progressPct;
                return (
                    <div key={p.$id} style={{ position: 'relative', marginBottom: 14, cursor: 'pointer' }} onClick={() => setModal({ type: 'projectDetail', pid: p.$id })}>
                        <div style={{ position: 'absolute', inset: -2, background: isEdu ? 'none' : `linear-gradient(to right,${clr}30,${clr}10)`, borderRadius: 20, filter: 'blur(8px)', opacity: 0.3, transition: 'opacity .5s' }} />
                        <div className="glass-card" style={{ position: 'relative', borderRadius: 16, padding: 20, overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: 128, height: 128, background: `${clr}10`, borderRadius: '50%', filter: 'blur(40px)', marginRight: -64, marginTop: -64, pointerEvents: 'none' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative', zIndex: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, backgroundColor: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>Priority #{p.priority}</span>
                                </div>
                                <button onClick={e => { e.stopPropagation(); setModal({ type: 'projectDetail', pid: p.$id }); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--g-05)', border: '1px solid var(--g-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t-888)' }}>
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>more_horiz</span>
                                </button>
                            </div>

                            <div style={{ marginBottom: 16, position: 'relative', zIndex: 10 }}>
                                <h3 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 22, color: 'var(--t-fff)', marginBottom: 2 }}>{p.name}</h3>
                                <p style={{ fontSize: 11, color: 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 1 }}>{p.completedCount}/{p.tasks.length} QUESTS COMPLETE</p>
                            </div>

                            {/* Progress Bar */}
                            <div style={{ marginBottom: 14, position: 'relative', zIndex: 10 }}>
                                <div className="health-bar-bg" style={{ height: 6, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--g-06)' }}>
                                    <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(to right,${clr}80,${clr})`, boxShadow: `0 0 10px ${clr}50`, transition: 'width .5s ease' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                                    <span>{p.pendingCount} Pending</span>
                                    <span style={{ color: pct === 100 ? '#4ade80' : 'var(--t-fff)' }}>{pct}%</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--g-05)', paddingTop: 14, position: 'relative', zIndex: 10 }}>
                                {showLoot && (
                                    <div>
                                        <span style={{ fontSize: 10, color: 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Total Bounty</span>
                                        <p className="text-gold" style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 28 }}>{cs}{p.money.toLocaleString()}</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: 10, color: 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Pending</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--g-05)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--g-05)', marginTop: 4 }}>
                                        <span className="material-icons-round" style={{ fontSize: 14, color: clr }}>pending_actions</span>
                                        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 18, color: 'var(--t-fff)' }}>{p.pendingCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            <button className="btn-fire w-full" style={{ marginTop: 8 }} onClick={() => setModal({ type: 'addProject' })}>
                <span className="material-icons-round" style={{ fontSize: 16 }}>add</span> New Campaign
            </button>
        </div>
    );
}
