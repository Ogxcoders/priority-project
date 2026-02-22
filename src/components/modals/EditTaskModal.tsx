'use client';
import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import CustomSelect from '@/components/CustomSelect';

export default function EditTaskModal({ pid, tid, returnTo }: { pid: string; tid: string; returnTo?: any }) {
    const { setModal, enrichedProjects, updateTaskField, toggleTask, removeTask, showToast, profile } = useData();
    const proj = enrichedProjects.find(p => p.$id === pid);
    const task = proj?.tasks.find(t => t.$id === tid);

    const [name, setName] = useState(task?.name || '');
    const [priority, setPriority] = useState(String(task?.priority || 1));
    const [slot, setSlot] = useState(task?.slot != null ? String(task.slot) : '');
    const [slotEnd, setSlotEnd] = useState(task?.slotEnd != null ? String(task.slotEnd) : '');
    const [date, setDate] = useState(task?.date || '');
    const [projectId, setProjectId] = useState(pid);
    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isDone, setIsDone] = useState(task?.done ?? false);

    useEffect(() => {
        if (task) {
            setName(task.name);
            setPriority(String(task.priority));
            setSlot(task.slot != null ? String(task.slot) : '');
            setSlotEnd(task.slotEnd != null ? String(task.slotEnd) : '');
            setDate(task.date || '');
            setIsDone(task.done);
        }
    }, [task]);

    if (!task) return null;

    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';
    const fmtH = (h: number) => `${h % 12 || 12}${h >= 12 ? ' PM' : ' AM'}`;

    const priorityOptions = [
        { value: '1', label: 'P1 — Critical', icon: 'priority_high' },
        { value: '2', label: 'P2 — High', icon: 'arrow_upward' },
        { value: '3', label: 'P3 — Medium', icon: 'remove' },
        { value: '4', label: 'P4 — Low', icon: 'arrow_downward' },
    ];

    const campaignOptions = enrichedProjects.map(p => ({
        value: p.$id,
        label: p.name,
    }));

    const timeOptions = [
        { value: '', label: 'None' },
        ...Array.from({ length: 24 }, (_, i) => ({
            value: String(i),
            label: fmtH(i),
            icon: i >= 6 && i < 18 ? 'light_mode' : 'dark_mode',
        })),
    ];

    const endTimeOptions = slot ? [
        { value: '', label: 'Single hour only' },
        ...Array.from({ length: 24 - parseInt(slot) - 1 }, (_, i) => parseInt(slot) + 1 + i).map(h => ({
            value: String(h),
            label: `${fmtH(h)} (${h - parseInt(slot)}h block)`,
        })),
    ] : [];

    const handleSave = async () => {
        if (!name.trim()) { showToast('Quest name is required!'); return; }
        const slotVal = slot ? parseInt(slot) : null;
        const slotEndVal = slotEnd ? parseInt(slotEnd) : null;
        if (slotVal != null && slotEndVal != null && slotEndVal <= slotVal) {
            showToast('End time must be after start time!');
            return;
        }
        setLoading(true);
        try {
            await updateTaskField(tid, 'name', name.trim());
            await updateTaskField(tid, 'priority', parseInt(priority) || 1);
            await updateTaskField(tid, 'slot', slotVal);
            await updateTaskField(tid, 'slotEnd', slotVal != null ? slotEndVal : null);
            await updateTaskField(tid, 'date', date || null);
            // Handle done toggle
            if (isDone !== task.done) {
                await toggleTask(tid);
            }
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
                <div className="confirm-overlay" onClick={() => setConfirmDelete(false)}>
                    <div className="confirm-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: '#f43f5e' }}>warning</span>
                            </div>
                            <div>
                                <h3>Confirm Deletion</h3>
                                <p className="confirm-sub">Delete <strong style={{ color: 'var(--t-eee)' }}>{task.name}</strong>?</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <button className="confirm-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
                            <button className="confirm-delete" style={{ opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={performDelete}>
                                <span className="material-icons-round" style={{ fontSize: 14 }}>delete</span>
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

                {/* Done Checkbox */}
                <div
                    onClick={() => setIsDone(!isDone)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 16,
                        borderRadius: 10, cursor: 'pointer', transition: 'all .3s',
                        background: isDone ? `${ac}0.06)` : 'var(--g-02)',
                        border: `1.5px solid ${isDone ? `${ac}0.3)` : 'var(--g-08)'}`,
                    }}
                >
                    <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isDone ? 'var(--primary)' : 'transparent',
                        border: isDone ? 'none' : '2px solid var(--t-444)',
                        transition: 'all .2s',
                        boxShadow: isDone ? '0 0 10px rgba(255,69,0,0.4)' : 'none',
                    }}>
                        {isDone && <span className="material-icons-round" style={{ fontSize: 16, color: '#fff' }}>check</span>}
                    </div>
                    <div>
                        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 14, color: isDone ? 'var(--primary)' : 'var(--t-ccc)' }}>
                            {isDone ? 'Completed' : 'Mark as Complete'}
                        </span>
                        <p style={{ fontSize: 10, color: 'var(--t-555)', margin: 0 }}>
                            {isDone ? 'This quest is done!' : 'Check to mark quest as done'}
                        </p>
                    </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Quest Name</label>
                    <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label">Campaign</label>
                    <CustomSelect
                        value={projectId}
                        options={campaignOptions}
                        onChange={v => setProjectId(v)}
                    />
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Priority</label>
                        <CustomSelect
                            value={priority}
                            options={priorityOptions}
                            onChange={v => setPriority(v)}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="input-label">Start Time</label>
                        <CustomSelect
                            value={slot}
                            options={timeOptions}
                            onChange={v => { setSlot(v); if (!v) setSlotEnd(''); }}
                            icon="schedule"
                        />
                    </div>
                </div>

                {/* Time Block End */}
                {slot && (
                    <div style={{ marginBottom: 16 }}>
                        <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>timelapse</span>
                            End Time (Time Block)
                        </label>
                        <CustomSelect
                            value={slotEnd}
                            options={endTimeOptions}
                            onChange={v => setSlotEnd(v)}
                            icon="timelapse"
                        />
                    </div>
                )}

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
