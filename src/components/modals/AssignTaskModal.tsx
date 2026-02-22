'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import CustomSelect from '@/components/CustomSelect';

export default function AssignTaskModal({ preSlot, preDate }: { preSlot?: number; preDate?: string }) {
    const { tasks, enrichedProjects, profile, setModal, updateTaskField, addTask, showToast } = useData();
    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [timeBlockMode, setTimeBlockMode] = useState(false);
    const [slotEnd, setSlotEnd] = useState(preSlot != null ? String(Math.min(preSlot + 1, 23)) : '');
    const [allowDuplicates, setAllowDuplicates] = useState(false);
    const [showDone, setShowDone] = useState(false);

    // Get all tasks with project info — only originals (not clones), only pending unless showDone
    const allTasks = enrichedProjects.flatMap(p =>
        p.tasks
            .filter(t => (showDone || !t.done) && !t.clonedFrom) // hide clones from this list
            .map(t => ({ ...t, projectName: p.name, projectColor: p.color || '#FF4500', projectId: p.$id }))
    );

    // Filter: when allowDuplicates is OFF, hide tasks already occupying the target slot
    const availableTasks = allowDuplicates ? allTasks : allTasks.filter(t => {
        if (preSlot != null && preDate) {
            const isOnSameDay = t.date === preDate;
            if (!isOnSameDay) return true;
            if (t.slot != null) {
                const taskEnd = t.slotEnd ?? t.slot;
                if (preSlot >= t.slot && preSlot <= taskEnd) return false;
            }
            return true;
        }
        return true;
    });

    const filtered = search.trim()
        ? availableTasks.filter(t =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.projectName.toLowerCase().includes(search.toLowerCase())
        )
        : availableTasks;

    // Group by project
    const grouped: Record<string, typeof filtered> = {};
    filtered.forEach(t => {
        if (!grouped[t.projectId]) grouped[t.projectId] = [];
        grouped[t.projectId].push(t);
    });

    const handleAssign = async (task: typeof filtered[0]) => {
        setLoading(task.$id);
        try {
            const newSlotEnd = timeBlockMode && slotEnd && preSlot != null
                ? (parseInt(slotEnd) > preSlot ? parseInt(slotEnd) : null)
                : null;

            if (allowDuplicates) {
                // CLONE: create a time-slot copy linked to the original
                await addTask(
                    task.projectId,
                    task.name,
                    task.priority,
                    preSlot ?? null,
                    newSlotEnd,
                    preDate ?? null,
                    task.$id,  // clonedFrom — links back to the original
                );
            } else {
                // MOVE: update existing task's slot
                if (preSlot != null) {
                    await updateTaskField(task.$id, 'slot', preSlot);
                    await updateTaskField(task.$id, 'slotEnd', newSlotEnd);
                }
                if (preDate) {
                    await updateTaskField(task.$id, 'date', preDate);
                }
            }

            const slotLabel = preSlot != null ? ` at ${preSlot % 12 || 12}${preSlot >= 12 ? 'PM' : 'AM'}` : '';
            const blockLabel = newSlotEnd ? ` → ${newSlotEnd % 12 || 12}${newSlotEnd >= 12 ? 'PM' : 'AM'}` : '';
            showToast(`Quest ${allowDuplicates ? 'scheduled' : 'assigned'}${slotLabel}${blockLabel}! ⚔️`);
            setModal(null);
        } catch {
            showToast('Failed to assign quest');
        } finally {
            setLoading(null);
        }
    };

    const fmtH = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '80dvh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)' }}>assignment_add</span>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2, flex: 1 }}>ASSIGN QUEST</h2>
                    {preSlot != null && (
                        <span style={{ fontSize: 10, color: 'var(--primary)', background: `${ac}0.1)`, border: `1px solid ${ac}0.3)`, padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontFamily: 'Rajdhani' }}>
                            {fmtH(preSlot)}
                        </span>
                    )}
                </div>

                {/* Controls */}
                {preSlot != null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {/* Time Block Toggle */}
                        <div style={{ padding: 10, borderRadius: 10, background: 'var(--g-02)', border: '1px solid var(--g-05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="material-icons-round" style={{ fontSize: 16, color: timeBlockMode ? 'var(--primary)' : 'var(--t-555)' }}>timelapse</span>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Rajdhani', color: timeBlockMode ? 'var(--t-fff)' : 'var(--t-888)', letterSpacing: 1 }}>TIME BLOCK</span>
                                        <p style={{ fontSize: 9, color: 'var(--t-555)', margin: 0 }}>Reserve multiple hours</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setTimeBlockMode(!timeBlockMode)}
                                    style={{
                                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                                        background: timeBlockMode ? 'var(--primary)' : 'var(--g-08)',
                                        position: 'relative', transition: 'all .3s',
                                        boxShadow: timeBlockMode ? '0 0 8px rgba(255,69,0,0.4)' : 'none',
                                    }}
                                >
                                    <div style={{
                                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: 3,
                                        left: timeBlockMode ? 19 : 3,
                                        transition: 'left .3s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    }} />
                                </button>
                            </div>
                            {timeBlockMode && (
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8, background: 'var(--g-03)', border: `1px solid ${ac}0.15)` }}>
                                    <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>schedule</span>
                                    <span style={{ fontSize: 12, color: 'var(--t-fff)', fontFamily: 'Rajdhani', fontWeight: 700 }}>{fmtH(preSlot)}</span>
                                    <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>arrow_forward</span>
                                    <CustomSelect
                                        value={slotEnd}
                                        options={Array.from({ length: 24 - preSlot - 1 }, (_, i) => preSlot + 1 + i).map(h => ({
                                            value: String(h),
                                            label: `${fmtH(h)} (${h - preSlot}h)`,
                                        }))}
                                        onChange={v => setSlotEnd(v)}
                                        compact
                                        style={{ flex: 1 }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Allow Overlap Toggle */}
                        <div style={{ padding: 10, borderRadius: 10, background: allowDuplicates ? 'rgba(251,191,36,0.04)' : 'var(--g-02)', border: `1px solid ${allowDuplicates ? 'rgba(251,191,36,0.25)' : 'var(--g-05)'}`, transition: 'all .3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span className="material-icons-round" style={{ fontSize: 16, color: allowDuplicates ? '#fbbf24' : 'var(--t-555)' }}>{allowDuplicates ? 'content_copy' : 'content_copy'}</span>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Rajdhani', color: allowDuplicates ? '#fbbf24' : 'var(--t-888)', letterSpacing: 1 }}>MULTI-SLOT</span>
                                        <p style={{ fontSize: 9, color: 'var(--t-555)', margin: 0 }}>Schedule to another slot without moving</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAllowDuplicates(!allowDuplicates)}
                                    style={{
                                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                                        background: allowDuplicates ? '#fbbf24' : 'var(--g-08)',
                                        position: 'relative', transition: 'all .3s',
                                        boxShadow: allowDuplicates ? '0 0 8px rgba(251,191,36,0.4)' : 'none',
                                    }}
                                >
                                    <div style={{
                                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: 3,
                                        left: allowDuplicates ? 19 : 3,
                                        transition: 'left .3s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                    }} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div style={{ marginBottom: 12 }}>
                    <input
                        className="input-field"
                        placeholder="Search quests or campaigns..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                        style={{ fontSize: 13 }}
                    />
                </div>

                {/* Task List */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }} className="no-scrollbar">
                    {Object.keys(grouped).length > 0 ? (
                        Object.entries(grouped).map(([pid, tasks]) => {
                            const proj = enrichedProjects.find(p => p.$id === pid);
                            const clr = proj?.color || '#FF4500';
                            return (
                                <div key={pid} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '4px 0' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: clr, boxShadow: `0 0 6px ${clr}60` }} />
                                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Rajdhani', color: 'var(--t-888)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{proj?.name}</span>
                                        <span style={{ fontSize: 9, color: 'var(--t-555)' }}>({tasks.length})</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {tasks.map(t => (
                                            <button
                                                key={t.$id}
                                                onClick={() => handleAssign(t)}
                                                disabled={loading === t.$id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                                    borderRadius: 10, cursor: 'pointer', transition: 'all .2s',
                                                    background: 'var(--g-02)', border: '1px solid var(--g-05)',
                                                    textAlign: 'left', width: '100%',
                                                    opacity: loading === t.$id ? 0.5 : 1,
                                                }}
                                            >
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                                    background: `linear-gradient(135deg, ${clr}20, transparent)`,
                                                    border: `1px solid ${clr}30`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <span className="material-icons-round" style={{ color: clr, fontSize: 16 }}>
                                                        {t.done ? 'check_circle' : 'radio_button_unchecked'}
                                                    </span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13, color: 'var(--t-fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {t.name}
                                                    </div>
                                                    <div style={{ fontSize: 9, color: 'var(--t-555)' }}>
                                                        P{t.priority}
                                                        {t.slot != null && ` • ${t.slot % 12 || 12}${t.slot >= 12 ? 'PM' : 'AM'}`}
                                                        {t.slotEnd != null && t.slot != null && `→${t.slotEnd % 12 || 12}${t.slotEnd >= 12 ? 'PM' : 'AM'}`}
                                                        {t.date && ` • ${t.date}`}
                                                    </div>
                                                </div>
                                                <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--t-555)', flexShrink: 0 }}>
                                                    {loading === t.$id ? 'hourglass_top' : 'arrow_forward'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: 24 }}>
                            <span className="material-icons-round" style={{ fontSize: 32, color: 'var(--t-333)', marginBottom: 8, display: 'block' }}>search_off</span>
                            <p style={{ fontSize: 12, color: 'var(--t-555)', fontFamily: 'Rajdhani', fontWeight: 600 }}>
                                {search ? 'No quests match your search' : 'No available quests'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Show completed toggle + Count */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 10, color: 'var(--t-555)', fontFamily: 'Rajdhani', fontWeight: 600 }}>
                        {filtered.length} quest{filtered.length !== 1 ? 's' : ''} available
                    </span>
                    <button
                        onClick={() => setShowDone(!showDone)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                            borderRadius: 6, border: '1px solid var(--g-08)', cursor: 'pointer',
                            background: showDone ? 'rgba(74,222,128,0.08)' : 'transparent',
                            fontSize: 9, color: showDone ? '#4ade80' : 'var(--t-555)',
                            fontFamily: 'Rajdhani', fontWeight: 700, transition: 'all .2s',
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: 12 }}>
                            {showDone ? 'visibility' : 'visibility_off'}
                        </span>
                        {showDone ? 'Hide' : 'Show'} Completed
                    </button>
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn-fire" style={{ flex: 2 }} onClick={() => setModal({ type: 'addTask', preSlot, preDate })}>
                        <span className="material-icons-round" style={{ fontSize: 14 }}>add</span>
                        Create New Quest
                    </button>
                </div>
            </div>
        </div>
    );
}
