'use client';
import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';

export default function EditTaskModal({ pid, tid, returnTo }: { pid: string; tid: string; returnTo?: any }) {
    const { setModal, enrichedProjects, updateTaskField, removeTask, showToast, profile } = useData();
    const proj = enrichedProjects.find(p => p.$id === pid);
    const task = proj?.tasks.find(t => t.$id === tid);

    const [name, setName] = useState(task?.name || '');
    const [priority, setPriority] = useState(String(task?.priority || 1));
    const [slot, setSlot] = useState(task?.slot != null ? String(task.slot) : '');
    const [date, setDate] = useState(task?.date || '');
    const [projectId, setProjectId] = useState(pid);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setPriority(String(task.priority));
            setSlot(task.slot != null ? String(task.slot) : '');
            setDate(task.date || '');
        }
    }, [task]);

    if (!task) return null;

    const handleSave = async () => {
        if (!name.trim()) { showToast('Quest name is required!'); return; }
        setLoading(true);
        try {
            await updateTaskField(tid, 'name', name.trim());
            await updateTaskField(tid, 'priority', parseInt(priority) || 1);
            await updateTaskField(tid, 'slot', slot ? parseInt(slot) : null);
            await updateTaskField(tid, 'date', date || null);
            if (projectId !== pid) {
                await updateTaskField(tid, 'projectId', projectId);
            }
            showToast('Quest updated! ⚔️');
            setModal(returnTo || null);
        } catch {
            showToast('Failed to update quest');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (profile?.confirmTaskDelete !== false) {
            setConfirmDelete(true);
            return;
        }
        await performDelete();
    };

    const performDelete = async () => {
        setLoading(true);
        try {
            await removeTask(tid);
            showToast('Quest removed');
            setModal(returnTo || null);
        } catch {
            showToast('Failed to delete quest');
        } finally {
            setLoading(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            {confirmDelete && (
                <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setConfirmDelete(false)}>
                    <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ color: '#f43f5e' }}>warning</span>
                            </div>
                            <div>
                                <h3 style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: 'var(--t-fff)' }}>Confirm Deletion</h3>
                                <p style={{ fontSize: 12, color: 'var(--t-666)' }}>Delete <strong style={{ color: 'var(--t-eee)' }}>{task.name}</strong>?</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Cancel</button>
                            <button className="btn-fire" style={{ flex: 1, background: '#f43f5e', border: '1px solid rgba(244,63,94,0.4)', boxShadow: '0 0 15px rgba(244,63,94,0.3)', opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={performDelete}>
                                <span className="material-icons-round" style={{ fontSize: 16 }}>delete</span>
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)' }}>edit</span>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2 }}>EDIT QUEST</h2>
                    </div>
                    <button onClick={handleDelete} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Orbitron', letterSpacing: 1, transition: 'all .3s' }}>
                        DELETE
                    </button>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Quest Name</label>
                    <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Campaign</label>
                    <select className="input-field" value={projectId} onChange={e => setProjectId(e.target.value)}>
                        {enrichedProjects.map(p => (
                            <option key={p.$id} value={p.$id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Priority</label>
                        <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)}>
                            <option value="1">P1 — Critical</option>
                            <option value="2">P2 — High</option>
                            <option value="3">P3 — Medium</option>
                            <option value="4">P4 — Low</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Time Slot</label>
                        <select className="input-field" value={slot} onChange={e => setSlot(e.target.value)}>
                            <option value="">None</option>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{(i % 12 || 12) + (i >= 12 ? ' PM' : ' AM')}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label className="input-label">Date</label>
                    <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(returnTo || null)}>Cancel</button>
                    <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSave}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>save</span>
                        {loading ? 'Saving...' : 'Update Quest'}
                    </button>
                </div>
            </div>
        </div>
    );
}
