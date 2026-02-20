'use client';
import { useState } from 'react';
import { useData } from '@/context/DataContext';

export default function AssignTaskModal({ preSlot, preDate }: { preSlot?: number; preDate?: string }) {
    const { enrichedProjects, setModal, updateTaskField, showToast } = useData();
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const isEdu = false; // inherit from profile if needed

    // Get all unassigned tasks (no slot for Daily Grind, or any task for calendar)
    const allTasks = enrichedProjects.flatMap(p =>
        p.tasks.map(t => ({ ...t, projectName: p.name, projectColor: p.color || '#FF4500', projectId: p.$id }))
    );

    // Filter: show tasks that don't already have this slot/date combo
    const availableTasks = allTasks.filter(t => {
        // If assigning to a slot, exclude tasks already on that slot+date
        if (preSlot != null && preDate) {
            return !(t.slot === preSlot && t.date === preDate);
        }
        // If assigning to just a date, exclude tasks already on that date
        if (preDate) {
            return t.date !== preDate;
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
            if (preSlot != null) {
                await updateTaskField(task.$id, 'slot', preSlot);
            }
            if (preDate) {
                await updateTaskField(task.$id, 'date', preDate);
            }
            const slotLabel = preSlot != null ? ` at ${preSlot % 12 || 12}${preSlot >= 12 ? 'PM' : 'AM'}` : '';
            showToast(`Quest assigned${slotLabel}! ⚔️`);
            setModal(null);
        } catch {
            showToast('Failed to assign quest');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="modal-overlay" onClick={() => setModal(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '80dvh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--g-10)', margin: '0 auto 16px' }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span className="material-icons-round" style={{ fontSize: 20, color: 'var(--primary)' }}>assignment_add</span>
                    <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: 'var(--t-fff)', letterSpacing: 2, flex: 1 }}>ASSIGN QUEST</h2>
                    {preSlot != null && (
                        <span style={{ fontSize: 10, color: 'var(--primary)', background: 'rgba(255,69,0,0.1)', border: '1px solid rgba(255,69,0,0.3)', padding: '2px 8px', borderRadius: 6, fontWeight: 700, fontFamily: 'Rajdhani' }}>
                            {preSlot % 12 || 12}:00 {preSlot >= 12 ? 'PM' : 'AM'}
                        </span>
                    )}
                </div>

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
                                    {/* Project header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, padding: '4px 0' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: clr, boxShadow: `0 0 6px ${clr}60` }} />
                                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Rajdhani', color: 'var(--t-888)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{proj?.name}</span>
                                        <span style={{ fontSize: 9, color: 'var(--t-555)' }}>({tasks.length})</span>
                                    </div>
                                    {/* Tasks */}
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
