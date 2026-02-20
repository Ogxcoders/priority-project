'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';

export default function AddSubtaskModal() {
    const { setModal, addSubtask, enrichedProjects, showToast } = useData();
    const [name, setName] = useState('');
    const [taskId, setTaskId] = useState('');
    const [loading, setLoading] = useState(false);

    const allTasks = enrichedProjects.flatMap(p => p.tasks.map(t => ({ ...t, projName: p.name })));

    const handleSubmit = async () => {
        if (!name.trim()) { showToast('Subtask name is required!'); return; }
        if (!taskId) { showToast('Select a quest first!'); return; }
        setLoading(true);
        try {
            await addSubtask(taskId, name.trim());
            showToast('Subtask added! ✅');
            setModal(null);
        } catch {
            showToast('Failed to add subtask');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: '#3b82f6' }}>playlist_add</span>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2 }}>NEW SUBTASK</h2>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Parent Quest</label>
                    <select className="input-field" value={taskId} onChange={e => setTaskId(e.target.value)}>
                        <option value="">Select a quest...</option>
                        {allTasks.map(t => (
                            <option key={t.$id} value={t.$id}>{t.projName} → {t.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label className="input-label">Subtask Name</label>
                    <input className="input-field" placeholder="e.g. Set up OAuth providers" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSubmit}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>check</span>
                        {loading ? 'Adding...' : 'Add Subtask'}
                    </button>
                </div>
            </div>
        </div>
    );
}
