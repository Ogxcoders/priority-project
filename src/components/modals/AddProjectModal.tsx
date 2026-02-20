'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { PCOLS } from '@/lib/constants';

export default function AddProjectModal() {
    const { setModal, addProject, enrichedProjects, shiftPriorities, showToast, profile } = useData();
    const [name, setName] = useState('');
    const [money, setMoney] = useState('');
    const [priority, setPriority] = useState('');
    const [color, setColor] = useState(PCOLS[0]);
    const [loading, setLoading] = useState(false);
    const isEdu = profile?.theme === 'eduplex';

    const handleSubmit = async () => {
        if (!name.trim()) { showToast('Campaign name is required!'); return; }
        const p = parseInt(priority) || enrichedProjects.length + 1;
        setLoading(true);
        try {
            // Check priority conflict
            const conflict = enrichedProjects.find(proj => proj.priority === p);
            if (conflict) await shiftPriorities(p, null);
            await addProject(name.trim(), parseInt(money) || 0, p, color);
            showToast('Campaign created! ⚔️');
            setModal(null);
        } catch {
            showToast('Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()}>
                {/* Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: '#fbbf24' }}>campaign</span>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2 }}>NEW CAMPAIGN</h2>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Campaign Name</label>
                    <input className="input-field" placeholder="e.g. SaaS Dashboard" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Bounty Value</label>
                        <input className="input-field" type="number" placeholder="0" value={money} onChange={e => setMoney(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Priority</label>
                        <input className="input-field" type="number" min="1" placeholder={String(enrichedProjects.length + 1)} value={priority} onChange={e => setPriority(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label className="input-label">Color</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {PCOLS.map(c => (
                            <button key={c} onClick={() => setColor(c)} style={{
                                width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? '2px solid var(--t-fff)' : '2px solid transparent',
                                cursor: 'pointer', boxShadow: color === c ? `0 0 12px ${c}60` : 'none', transition: 'all .3s',
                            }} />
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSubmit}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                        {loading ? 'Creating...' : 'Deploy Campaign'}
                    </button>
                </div>
            </div>
        </div>
    );
}
