'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { currSym, PCOLS } from '@/lib/constants';

export default function ProjectDetailModal({ pid }: { pid: string }) {
    const { setModal, enrichedProjects, updateProjectField, removeProject, showToast, profile, toggleTask, toggleSubtask, addSubtask, removeTask, removeSubtask, addTask } = useData();
    const proj = enrichedProjects.find(p => p.$id === pid);
    const cs = currSym(profile?.currency || 'USD');
    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';

    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(proj?.name || '');
    const [money, setMoney] = useState(String(proj?.money || 0));
    const [priority, setPriority] = useState(String(proj?.priority || 1));
    const [color, setColor] = useState(proj?.color || PCOLS[0]);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'project' | 'task' | 'subtask', id: string, name: string } | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    if (!proj) return null;
    const clr = proj.color || '#FF4500';

    const handleSave = async () => {
        if (!name.trim()) { showToast('Campaign name is required!'); return; }
        setLoading(true);
        try {
            await updateProjectField(pid, 'name', name.trim());
            await updateProjectField(pid, 'money', parseInt(money) || 0);
            await updateProjectField(pid, 'priority', parseInt(priority) || 1);
            await updateProjectField(pid, 'color', color);
            showToast('Campaign updated!');
            setEditing(false);
        } catch {
            showToast('Failed to update campaign');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!window.confirm("Are you sure you want to delete this Campaign? This will delete all its quests as well.")) return;
        setLoading(true);
        try {
            await removeProject(pid);
            showToast('Campaign removed');
            setModal(null);
        } catch {
            showToast('Failed to delete campaign');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            {confirmDelete && (
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
                            <button className="btn-fire" style={{ flex: 1, background: '#f43f5e', border: '1px solid rgba(244,63,94,0.4)', boxShadow: '0 0 15px rgba(244,63,94,0.3)' }} onClick={async () => {
                                setLoading(true);
                                try {
                                    if (confirmDelete.type === 'project') { await removeProject(confirmDelete.id); setModal(null); }
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
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                {!editing ? (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: clr, boxShadow: `0 0 12px ${clr}60`, flexShrink: 0 }} />
                            <h2 style={{ fontFamily: 'Rajdhani', fontSize: 22, fontWeight: 700, color: 'var(--t-fff)', flex: 1 }}>{proj.name}</h2>
                            <button onClick={() => setEditing(true)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--g-05)', border: '1px solid var(--g-08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t-888)' }}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>edit</span>
                            </button>
                        </div>

                        {/* Stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                            <div className="glass-panel" style={{ borderRadius: 10, padding: 10, textAlign: 'center' }}>
                                <p className="text-gold" style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16 }}>{cs}{proj.money.toLocaleString()}</p>
                                <p style={{ fontSize: 9, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Bounty</p>
                            </div>
                            <div className="glass-panel" style={{ borderRadius: 10, padding: 10, textAlign: 'center' }}>
                                <p style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16, color: clr }}>P{proj.priority}</p>
                                <p style={{ fontSize: 9, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Priority</p>
                            </div>
                            <div className="glass-panel" style={{ borderRadius: 10, padding: 10, textAlign: 'center' }}>
                                <p style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 16, color: '#4ade80' }}>{proj.progressPct}%</p>
                                <p style={{ fontSize: 9, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Done</p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ marginBottom: 16 }}>
                            <div className="health-bar-bg" style={{ height: 6, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--g-06)' }}>
                                <div style={{ height: '100%', width: proj.progressPct + '%', background: `linear-gradient(to right,${clr}80,${clr})`, boxShadow: `0 0 10px ${clr}50`, transition: 'width .5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                                <span>{proj.completedCount}/{proj.tasks.length} Quests</span>
                                <span>{proj.pendingCount} Pending</span>
                            </div>
                        </div>

                        {/* Task List with subtasks */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: 'var(--t-666)', letterSpacing: 2, textTransform: 'uppercase' }}>Quests ({proj.tasks.length})</span>
                            </div>

                            {proj.tasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 20 }}>
                                    <span className="material-icons-round" style={{ fontSize: 32, color: 'var(--t-333)', marginBottom: 8 }}>assignment</span>
                                    <p style={{ fontSize: 12, color: 'var(--t-444)' }}>No quests yet. Add one below!</p>
                                </div>
                            ) : (
                                proj.tasks.map((task, ti) => {
                                    const subs = task.subtasks || [];
                                    const subsDone = subs.filter(s => s.done).length;
                                    const isOpen = expanded[task.$id];

                                    return (
                                        <div key={task.$id}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: ti > 0 ? '1px solid var(--g-04)' : 'none' }}>
                                                {subs.length > 0 ? (
                                                    <button onClick={() => toggleExpand(task.$id)} style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'var(--g-05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                                        <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--t-888)' }}>chevron_right</span>
                                                    </button>
                                                ) : (
                                                    <div style={{ width: 20, height: 20, flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(task.$id)}>
                                                    <p style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 14, color: task.done ? 'var(--t-555)' : 'var(--t-eee)', textDecoration: task.done ? 'line-through' : 'none', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                        {task.slot != null && <span style={{ fontSize: 10, color: 'var(--t-555)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>schedule</span>{task.slot}:00</span>}
                                                        {task.date && <span style={{ fontSize: 10, color: 'var(--t-555)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>event</span>{new Date(task.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                                        {subs.length > 0 && <span style={{ fontSize: 10, color: subsDone === subs.length ? '#4ade80' : 'var(--t-666)', display: 'flex', alignItems: 'center', gap: 3 }}><span className="material-icons-round" style={{ fontSize: 11 }}>checklist</span>{subsDone}/{subs.length}</span>}
                                                    </div>
                                                </div>
                                                <button onClick={() => {
                                                    if (!isOpen) toggleExpand(task.$id);
                                                    setTimeout(() => document.getElementById(`addSub_${task.$id}`)?.focus(), 50);
                                                }} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-04)', border: `1px solid ${proj.color || 'var(--primary)'}30`, transition: 'all .3s' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14, color: proj.color || 'var(--primary)' }}>add</span>
                                                </button>
                                                <button onClick={() => setModal({ type: 'editTask', pid, tid: task.$id, returnTo: { type: 'projectDetail', pid } })} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-03)', border: '1px solid var(--g-06)' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 13, color: 'var(--t-666)' }}>edit</span>
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
                                                        showToast('Complete all subtasks first!');
                                                        return;
                                                    }
                                                    toggleTask(task.$id);
                                                }} style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: task.done ? `linear-gradient(135deg, ${proj.color || 'var(--primary)'}, ${proj.color || 'var(--primary)'}cc)` : 'var(--g-04)', border: task.done ? 'none' : `2px solid ${proj.color || 'var(--primary)'}40`, transition: 'all .3s', boxShadow: task.done ? `0 0 10px ${proj.color || 'var(--primary)'}40` : 'none' }}>
                                                    {task.done && <span className="material-icons-round" style={{ fontSize: 16, color: '#fff' }}>check</span>}
                                                </button>
                                            </div>

                                            {/* Subtasks */}
                                            {isOpen && (
                                                <div style={{ marginLeft: 30, paddingBottom: 6, borderLeft: `2px solid ${clr}20`, marginBottom: 4 }}>
                                                    {subs.map(sub => (
                                                        <div key={sub.$id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 6px 12px', opacity: sub.done ? 0.5 : 1, transition: 'opacity .3s' }}>
                                                            <p style={{ flex: 1, fontFamily: 'Rajdhani', fontWeight: 500, fontSize: 13, color: sub.done ? 'var(--t-555)' : 'var(--t-bbb)', textDecoration: sub.done ? 'line-through' : 'none', lineHeight: 1.3 }}>{sub.name}</p>
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
                                                            <button onClick={() => toggleSubtask(sub.$id)} style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sub.done ? `linear-gradient(135deg,${clr},${clr}cc)` : 'var(--g-03)', border: sub.done ? 'none' : `1.5px solid ${clr}30`, transition: 'all .3s', boxShadow: sub.done ? `0 0 8px ${clr}30` : 'none' }}>
                                                                {sub.done && <span className="material-icons-round" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {/* Inline add subtask */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 4px 12px', marginTop: 2 }}>
                                                        <input
                                                            id={`addSub_${task.$id}`}
                                                            placeholder="+ Add subtask..."
                                                            onKeyDown={e => {
                                                                const inp = e.target as HTMLInputElement;
                                                                if (e.key === 'Enter' && inp.value.trim()) {
                                                                    addSubtask(task.$id, inp.value.trim());
                                                                    inp.value = '';
                                                                }
                                                            }}
                                                            style={{ flex: 1, background: 'var(--g-03)', border: '1px solid var(--g-06)', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'Rajdhani', fontWeight: 500, color: 'var(--t-bbb)', outline: 'none' }}
                                                        />
                                                        <button onClick={e => {
                                                            const inp = (e.target as HTMLElement).closest('div')?.querySelector('input');
                                                            if (inp && inp.value.trim()) { addSubtask(task.$id, inp.value.trim()); inp.value = ''; }
                                                        }} style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${clr}30`, background: 'var(--g-03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <span className="material-icons-round" style={{ fontSize: 14, color: clr }}>add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                                <input
                                    id="addQuest"
                                    placeholder="Add new quest + press Enter..."
                                    onKeyDown={async e => {
                                        const inp = e.target as HTMLInputElement;
                                        if (e.key === 'Enter' && inp.value.trim()) {
                                            const val = inp.value.trim();
                                            inp.value = '';
                                            await addTask(proj.$id, val, 1, null, null);
                                            showToast('Quest deployed!');
                                        }
                                    }}
                                    style={{ flex: 1, background: 'var(--g-04)', border: '1px solid var(--g-06)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'Rajdhani', fontWeight: 600, color: 'var(--t-fff)', outline: 'none' }}
                                />
                                <button onClick={async e => {
                                    const inp = document.getElementById('addQuest') as HTMLInputElement;
                                    if (inp && inp.value.trim()) {
                                        const val = inp.value.trim();
                                        inp.value = '';
                                        await addTask(proj.$id, val, 1, null, null);
                                        showToast('Quest deployed!');
                                    }
                                }} style={{ width: 38, height: 38, borderRadius: 8, background: `linear-gradient(135deg, ${clr}, ${clr}cc)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 10px ${clr}40` }}>
                                    <span className="material-icons-round" style={{ fontSize: 18, color: '#fff' }}>add</span>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Close</button>
                            <button style={{ flex: 1, padding: '10px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }} onClick={() => setConfirmDelete({ type: 'project', id: pid, name: proj.name })}>
                                Delete Campaign
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Edit Mode */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                            <span className="material-icons-round" style={{ fontSize: 20, color: '#fbbf24' }}>edit</span>
                            <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2 }}>EDIT CAMPAIGN</h2>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label className="input-label">Campaign Name</label>
                            <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label className="input-label">Bounty Value</label>
                                <input className="input-field" type="number" value={money} onChange={e => setMoney(e.target.value)} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="input-label">Priority</label>
                                <input className="input-field" type="number" min="1" value={priority} onChange={e => setPriority(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label">Color</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {PCOLS.map(c => (
                                    <button key={c} onClick={() => setColor(c)} style={{
                                        width: 32, height: 32, borderRadius: 8, background: c,
                                        border: color === c ? '2px solid var(--t-fff)' : '2px solid transparent',
                                        cursor: 'pointer', boxShadow: color === c ? `0 0 12px ${c}60` : 'none', transition: 'all .3s',
                                    }} />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSave}>
                                <span className="material-icons-round" style={{ fontSize: 14 }}>save</span>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
