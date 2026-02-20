'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { toDS } from '@/lib/utils';

export default function AddTaskModal({ returnTo, preSlot, preDate }: { returnTo?: any; preSlot?: number; preDate?: string }) {
    const { setModal, addTask, enrichedProjects, showToast } = useData();
    const [name, setName] = useState('');
    const [projectId, setProjectId] = useState(enrichedProjects[0]?.$id || '');
    const [priority, setPriority] = useState('1');
    const [slot, setSlot] = useState(preSlot != null ? String(preSlot) : '');
    const [date, setDate] = useState(preDate || toDS(new Date()));
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) { showToast('Quest name is required!'); return; }
        if (!projectId) { showToast('Select a campaign first!'); return; }
        setLoading(true);
        try {
            await addTask(projectId, name.trim(), parseInt(priority) || 1, slot ? parseInt(slot) : null, date || null);
            showToast('Quest deployed! ⚔️');
            setModal(returnTo || null);
        } catch {
            showToast('Failed to create quest');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => setModal(returnTo || null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)' }}>add_task</span>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2 }}>NEW QUEST</h2>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Quest Name</label>
                    <input className="input-field" placeholder="e.g. Build Auth System" value={name} onChange={e => setName(e.target.value)} autoFocus />
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
                    <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSubmit}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>bolt</span>
                        {loading ? 'Deploying...' : 'Deploy Quest'}
                    </button>
                </div>
            </div>
        </div>
    );
}
