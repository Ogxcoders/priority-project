'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '@/context/DataContext';
import { currSym } from '@/lib/constants';

export default function QuestsPage() {
    const { enrichedProjects, profile, stats, toggleTask, toggleSubtask, addSubtask, removeTask, removeSubtask, setModal, showToast } = useData();
    const cs = currSym(profile?.currency || 'USD');
    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'subtask', id: string, name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const sp = [...enrichedProjects].sort((a, b) => a.priority - b.priority || b.money - a.money);
    const topTask = sp.flatMap(p => p.tasks.filter(t => !t.done).sort((a, b) => a.priority - b.priority).map(t => ({ ...t, pName: p.name }))).at(0);
    const totalPending = sp.reduce((s, p) => s + p.tasks.filter(t => !t.done).length, 0);

    const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    return (
        <div className="anim-entry">
            {mounted && confirmDelete && createPortal(
                <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setConfirmDelete(null)}>
                    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ color: '#f43f5e' }}>warning</span>
                            </div>
                            <div>
                                <h3 style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: 'var(--t-fff)' }}>Confirm Deletion</h3>
                                <p style={{ fontSize: 12, color: 'var(--t-666)' }}>Delete <strong style={{ color: 'var(--t-eee)' }}>{confirmDelete.name}</strong>?</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn-fire" style={{ flex: 1, background: '#f43f5e', border: '1px solid rgba(244,63,94,0.4)', boxShadow: '0 0 15px rgba(244,63,94,0.3)', opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={async () => {
                                setLoading(true);
                                try {
                                    if (confirmDelete.type === 'task') await removeTask(confirmDelete.id);
                                    if (confirmDelete.type === 'subtask') await removeSubtask(confirmDelete.id);
                                    showToast('Deleted successfully');
                                } catch {
                                    showToast('Deletion failed');
                                } finally {
                                    setLoading(false);
                                    setConfirmDelete(null);
                                }
                            }}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>delete</span>
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Oracle Card */}
            {topTask && (
                <div style={{ background: isEdu ? 'rgba(200,249,2,0.04)' : 'var(--card-gradient)', borderRadius: 24, border: isEdu ? '1px solid rgba(200,249,2,0.15)' : '1px solid var(--g-05,rgba(255,255,255,0.05))', padding: 16, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden', marginBottom: 14, boxShadow: isEdu ? '0 1px 8px rgba(0,0,0,0.03)' : '0 8px 32px rgba(0,0,0,0.5)' }}>
                    <div style={{ position: 'absolute', right: -16, top: -16, width: 80, height: 80, background: `${ac}0.1)`, borderRadius: '50%', filter: 'blur(30px)' }} />
                    <div className="avatar-pulse" style={{ width: 52, height: 52, borderRadius: '50%', border: `2px solid ${ac}0.5)`, overflow: 'hidden', flexShrink: 0, background: isEdu ? 'rgba(200,249,2,0.08)' : '#000' }}>
                        <div style={{ width: '100%', height: '100%', background: isEdu ? 'rgba(200,249,2,0.12)' : 'linear-gradient(135deg,#FF4500,#ff7b42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: isEdu ? '#6B8E00' : '#fff' }}>{(profile?.name || 'C')[0]}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: isEdu ? '#6B8E00' : 'var(--primary)', animation: isEdu ? 'none' : 'borderPulse 2s infinite' }} />
                            <span style={{ fontSize: 9, color: isEdu ? '#6B8E00' : 'var(--primary-glow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Oracle&apos;s Insight</span>
                        </div>
                        <p style={{ fontSize: 12, color: isEdu ? '#767B93' : 'var(--t-ccc,#ccc)', fontStyle: 'italic', lineHeight: 1.5 }}>&quot;Pursue the <span style={{ color: isEdu ? '#1A1B27' : 'var(--t-fff,#fff)', fontWeight: 700, borderBottom: isEdu ? '1px solid rgba(200,249,2,0.3)' : '1px solid rgba(255,69,0,0.5)', paddingBottom: 1 }}>{topTask.name}</span>. It holds the key.&quot;</p>
                    </div>
                </div>
            )}

            {/* Stats Bar */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 16 }}>
                {[
                    { l: 'Loot', v: cs + stats.totalMoney.toLocaleString(), cls: 'text-gold' },
                    { l: 'Level', v: String(stats.level), cls: '' },
                    { l: 'Streak', v: (profile?.streak || 0) + ' Days', cls: '', icon: 'local_fire_department' },
                ].map((s, i) => (
                    <div key={i} style={{ flex: 1, padding: 8, borderRadius: 12, background: 'var(--b-40,rgba(0,0,0,0.4))', border: '1px solid var(--g-05,rgba(255,255,255,0.05))', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, color: 'var(--t-666,#666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>{s.l}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }} className={s.cls}>
                            {s.icon && <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)', verticalAlign: 'middle', marginRight: 2 }}>{s.icon}</span>}
                            {s.v}
                        </span>
                    </div>
                ))}
            </div>

            {/* Active Quests Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '0 0 12px' }}>
                <h2 style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16, color: 'var(--t-fff,#fff)', letterSpacing: 1 }}>Active Quests</h2>
                <span style={{ fontSize: 11, color: 'var(--t-666,#666)', padding: '3px 10px', borderRadius: 20, background: 'var(--g-05,rgba(255,255,255,0.05))', border: '1px solid var(--g-05,rgba(255,255,255,0.05))' }}>{totalPending} Pending</span>
            </div>

            {/* Project Cards with Tasks */}
            {sp.filter(p => p.tasks.some(t => !t.done)).map((proj, pi) => {
                const clr = proj.color || '#FF4500';
                const pendingTasks = proj.tasks.filter(t => !t.done);
                const total = proj.tasks.length;
                const done = total - pendingTasks.length;
                const pct = total > 0 ? Math.round(done / total * 100) : 0;
                const isTop = pi === 0;

                return (
                    <div key={proj.$id} style={{ position: 'relative', marginBottom: 16 }}>
                        <div style={{ position: 'absolute', inset: -2, background: isEdu ? 'none' : `linear-gradient(to bottom,${clr}${isTop ? '60' : '30'},${clr}10)`, borderRadius: isTop ? 28 : 20, filter: 'blur(10px)', opacity: isTop ? 0.5 : 0.3 }} />

                        <div style={{ position: 'relative', borderRadius: isTop ? 24 : 16, overflow: 'hidden', background: isEdu ? (isTop ? `linear-gradient(135deg,${clr}08,#FFFFFF)` : '#FFFFFF') : (isTop ? `linear-gradient(135deg,${clr}15,rgba(10,10,12,0.95))` : 'var(--card-gradient)'), border: isEdu ? `1px solid ${clr}20` : `1px solid ${isTop ? clr + '40' : 'var(--g-08,rgba(255,255,255,0.08))'}`, boxShadow: isEdu ? '0 1px 8px rgba(0,0,0,0.04)' : (isTop ? 'inset 0 0 40px rgba(0,0,0,0.8)' : '0 4px 20px rgba(0,0,0,0.5)') }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, width: 128, height: 128, background: `${clr}10`, borderRadius: '50%', filter: 'blur(40px)', marginRight: -64, marginTop: -64, pointerEvents: 'none' }} />

                            {/* Project Header */}
                            <div style={{ padding: isTop ? '20px 20px 0' : '16px 16px 0', position: 'relative', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: clr, boxShadow: `0 0 8px ${clr}` }} />
                                            <span style={{ fontSize: 10, fontWeight: 700, color: clr, textTransform: 'uppercase', letterSpacing: 2 }}>Priority #{proj.priority}</span>
                                        </div>
                                        <h3 style={{ fontFamily: isTop ? 'Orbitron' : 'Rajdhani', fontWeight: 700, fontSize: isTop ? 20 : 18, color: 'var(--t-fff,#fff)', lineHeight: 1.2 }}>{proj.name}</h3>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: 9, color: 'var(--t-666,#666)', textTransform: 'uppercase', letterSpacing: 2 }}>Bounty</span>
                                        <p className={isTop ? 'text-gold' : ''} style={{ fontFamily: isTop ? 'Orbitron' : 'Rajdhani', fontWeight: 700, fontSize: isTop ? 22 : 18, color: isTop ? undefined : 'var(--t-ccc,#ccc)' }}>{cs}{proj.money.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, textTransform: 'uppercase', fontWeight: 700, color: 'var(--t-666,#666)', letterSpacing: 2, marginBottom: 4 }}>
                                        <span>{done}/{total} Quests</span><span style={{ color: 'var(--t-fff,#fff)' }}>{pct}%</span>
                                    </div>
                                    <div className="health-bar-bg" style={{ height: 6, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--g-06,rgba(255,255,255,0.06))' }}>
                                        <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(to right,${clr}80,${clr})`, boxShadow: `0 0 10px ${clr}50`, transition: 'width .5s ease' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Task List */}
                            <div style={{ padding: isTop ? '0 20px 16px' : '0 16px 12px', position: 'relative', zIndex: 10 }}>
                                {pendingTasks.map((task, ti) => {
                                    const subs = task.subtasks || [];
                                    const subsDone = subs.filter(s => s.done).length;
                                    const isOpen = expanded[task.$id];

                                    return (
                                        <div key={task.$id}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: ti > 0 ? '1px solid var(--g-04,rgba(255,255,255,0.04))' : 'none' }}>
                                                {subs.length > 0 ? (
                                                    <button onClick={() => toggleExpand(task.$id)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'var(--g-05,rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                        <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--t-888,#888)' }}>chevron_right</span>
                                                    </button>
                                                ) : (
                                                    <div style={{ width: 20, height: 20, flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(task.$id)}>
                                                    <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 14, color: 'var(--t-eee,#eee)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                        {task.slot != null && <span style={{ fontSize: 10, color: 'var(--t-555,#555)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>schedule</span>{task.slot}:00</span>}
                                                        {task.date && <span style={{ fontSize: 10, color: 'var(--t-555,#555)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>event</span>{new Date(task.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                                        {subs.length > 0 && <span style={{ fontSize: 10, color: subsDone === subs.length ? '#4ade80' : 'var(--t-666,#666)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>checklist</span>{subsDone}/{subs.length}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => {
                                                    if (!isOpen) toggleExpand(task.$id);
                                                    setTimeout(() => document.getElementById(`addSub_quest_${task.$id}`)?.focus(), 50);
                                                }} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-04,rgba(255,255,255,0.04))', border: `1px solid ${clr}30`, transition: 'all .3s' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14, color: clr }}>add</span>
                                                </button>
                                                <button onClick={() => setModal({ type: 'editTask', pid: proj.$id, tid: task.$id })} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-03,rgba(255,255,255,0.03))', border: '1px solid var(--g-06,rgba(255,255,255,0.06))' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 13, color: 'var(--t-666,#666)' }}>edit</span>
                                                </button>
                                                <button onClick={async () => {
                                                    if (profile?.confirmTaskDelete !== false) {
                                                        setConfirmDelete({ type: 'task', id: task.$id, name: task.name });
                                                    } else {
                                                        await removeTask(task.$id);
                                                        showToast('Quest deleted');
                                                    }
                                                }} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14, color: '#f43f5e' }}>close</span>
                                                </button>
                                                <button onClick={() => {
                                                    if (subs.length > 0 && !subs.every(s => s.done) && !task.done) {
                                                        showToast('Please complete all subtasks first!');
                                                        return;
                                                    }
                                                    toggleTask(task.$id);
                                                }} style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-04,rgba(255,255,255,0.04))', border: `2px solid ${clr}40`, transition: 'all .3s' }}>
                                                </button>
                                            </div>

                                            {/* Subtasks */}
                                            {isOpen && (
                                                <div style={{ marginLeft: 30, paddingBottom: 6, borderLeft: `2px solid ${clr}20`, marginBottom: 4 }}>
                                                    {subs.map(sub => (
                                                        <div key={sub.$id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 6px 12px', opacity: sub.done ? 0.5 : 1, transition: 'opacity .3s' }}>
                                                            <p style={{ flex: 1, fontFamily: 'Rajdhani', fontWeight: 500, fontSize: 13, color: sub.done ? 'var(--t-555,#555)' : 'var(--t-bbb,#bbb)', textDecoration: sub.done ? 'line-through' : 'none', lineHeight: 1.3 }}>{sub.name}</p>
                                                            <button onClick={async () => {
                                                                if (profile?.confirmTaskDelete !== false) {
                                                                    setConfirmDelete({ type: 'subtask', id: sub.$id, name: sub.name });
                                                                } else {
                                                                    await removeSubtask(sub.$id);
                                                                    showToast('Subtask deleted');
                                                                }
                                                            }} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                                                                <span className="material-icons-round" style={{ fontSize: 14, color: '#f43f5e' }}>close</span>
                                                            </button>
                                                            <button onClick={() => toggleSubtask(sub.$id)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sub.done ? `linear-gradient(135deg,${clr},${clr}cc)` : 'var(--g-03,rgba(255,255,255,0.03))', border: sub.done ? 'none' : `1.5px solid ${clr}30`, transition: 'all .3s', boxShadow: sub.done ? `0 0 8px ${clr}30` : 'none' }}>
                                                                {sub.done && <span className="material-icons-round" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {/* Inline add subtask */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 4px 12px', marginTop: 2 }}>
                                                        <input
                                                            id={`addSub_quest_${task.$id}`}
                                                            placeholder="+ Add subtask..."
                                                            onKeyDown={e => {
                                                                const inp = e.target as HTMLInputElement;
                                                                if (e.key === 'Enter' && inp.value.trim()) {
                                                                    addSubtask(task.$id, inp.value.trim());
                                                                    inp.value = '';
                                                                }
                                                            }}
                                                            style={{ flex: 1, background: 'var(--g-03,rgba(255,255,255,0.03))', border: '1px solid var(--g-06,rgba(255,255,255,0.06))', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'Rajdhani', fontWeight: 500, color: 'var(--t-bbb,#bbb)', outline: 'none' }}
                                                        />
                                                        <button onClick={e => {
                                                            const inp = (e.target as HTMLElement).closest('div')?.querySelector('input');
                                                            if (inp && inp.value.trim()) { addSubtask(task.$id, inp.value.trim()); inp.value = ''; }
                                                        }} style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${clr}30`, background: 'var(--g-03,rgba(255,255,255,0.03))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <span className="material-icons-round" style={{ fontSize: 14, color: clr }}>add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
