'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { toDS } from '@/lib/utils';
import { t } from '@/lib/terms';
import { STATUS_OPTS } from '@/lib/constants';

export default function AddTaskModal({ returnTo, preSlot, preDate }: { returnTo?: any; preSlot?: number; preDate?: string }) {
    const { setModal, addTask, enrichedProjects, showToast, profile, updateTaskField } = useData();
    const gm = profile?.gameMode ?? true;
    const fh = gm ? 'Orbitron' : 'Inter';
    const [name, setName] = useState('');
    const [projectId, setProjectId] = useState(enrichedProjects[0]?.$id || '');
    const [priority, setPriority] = useState('1');
    const [slot, setSlot] = useState(preSlot != null ? String(preSlot) : '');
    const [slotEnd, setSlotEnd] = useState('');
    const [date, setDate] = useState(preDate || toDS(new Date()));
    const [status, setStatus] = useState('default');
    const [loading, setLoading] = useState(false);

    const fmtH = (h: number) => `${h % 12 || 12}${h >= 12 ? ' PM' : ' AM'}`;

    const handleSubmit = async () => {
        if (!name.trim()) { showToast(`${t('task', gm)} name is required!`); return; }
        if (!projectId) { showToast(`Select a ${t('project', gm).toLowerCase()} first!`); return; }
        const slotVal = slot ? parseInt(slot) : null;
        const slotEndVal = slotEnd ? parseInt(slotEnd) : null;
        // Validate slotEnd > slot
        if (slotVal != null && slotEndVal != null && slotEndVal <= slotVal) {
            showToast('End time must be after start time!');
            return;
        }
        setLoading(true);
        try {
            const pid = await addTask(projectId, name.trim(), parseInt(priority) || 1, slotVal, slotEndVal, date || null);
            // If status is not default, update it after creation
            if (status !== 'default' && pid) {
                const createdTask = enrichedProjects.find(p => p.$id === projectId)?.tasks.slice(-1)[0];
                if (createdTask) await updateTaskField(createdTask.$id, 'status', status);
            }
            showToast(t('complete', gm));
            setModal(pid ? { type: 'projectDetail', pid } : (returnTo || null));
        } catch {
            showToast(`Failed to create ${t('task', gm).toLowerCase()}`);
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
                    <h2 style={{ fontFamily: fh, fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: gm ? 2 : 0.5 }}>{gm ? 'NEW QUEST' : 'NEW TASK'}</h2>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">{t('task', gm)} Name</label>
                    <input className="input-field" placeholder="e.g. Build Auth System" value={name} onChange={e => setName(e.target.value)} autoFocus />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">{t('project', gm)}</label>
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
                        <label className="input-label">Status</label>
                        <select className="input-field" value={status} onChange={e => setStatus(e.target.value)}>
                            {STATUS_OPTS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Start Time</label>
                        <select className="input-field" value={slot} onChange={e => { setSlot(e.target.value); if (!e.target.value) setSlotEnd(''); }}>
                            <option value="">None</option>
                            {Array.from({ length: 24 }, (_, i) => (
                                <option key={i} value={i}>{fmtH(i)}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Date</label>
                        <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>

                {/* Time Block End - only show when a start slot is selected */}
                {slot && (
                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>timelapse</span>
                            End Time (Time Block)
                        </label>
                        <select className="input-field" value={slotEnd} onChange={e => setSlotEnd(e.target.value)}>
                            <option value="">Single hour only</option>
                            {Array.from({ length: 24 - parseInt(slot) - 1 }, (_, i) => parseInt(slot) + 1 + i).map(h => (
                                <option key={h} value={h}>{fmtH(h)} ({h - parseInt(slot)}h block)</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(returnTo || null)}>Cancel</button>
                    <button className="btn-fire" style={{ flex: 2, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleSubmit}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>bolt</span>
                        {loading ? 'Creating...' : t('create_task', gm)}
                    </button>
                </div>
            </div>
        </div>
    );
}
