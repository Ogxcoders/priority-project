'use client';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '@/context/DataContext';
import { toDS, DAY_NAMES } from '@/lib/utils';
import { currSym, TASK_ICONS, TASK_COLORS } from '@/lib/constants';

export default function MapPage() {
    const { tasks, subtasks, enrichedProjects, profile, setModal, toggleTask, toggleSubtask, updateTaskField, addSubtask, removeTask, removeSubtask, updateSubtaskField, showToast } = useData();
    const [view, setView] = useState<'time' | 'cal'>('time');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [editingSub, setEditingSub] = useState<string | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'subtask'; id: string; name: string } | null>(null);
    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    const realToday = new Date();
    const [selDate, setSelDate] = useState(new Date());
    const [weekOff, setWeekOff] = useState(0);
    const [calMonth, setCalMonth] = useState(new Date(realToday.getFullYear(), realToday.getMonth(), 1));
    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';
    const cs = currSym(profile?.currency || 'USD');
    const showLoot = profile?.showLoot ?? false;

    const startH = profile?.startHour ?? 8;
    const endH = profile?.endHour ?? 19;
    const hrsCount = startH <= endH ? (endH - startH + 1) : (24 - startH + endH + 1);
    const hrs = Array.from({ length: Math.max(1, hrsCount) }, (_, i) => (startH + i) % 24);

    // Week days
    const weekDays = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1 + weekOff * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseMonday);
            d.setDate(baseMonday.getDate() + i);
            return { name: DAY_NAMES[d.getDay()], date: d.getDate(), isToday: d.toDateString() === realToday.toDateString(), isSel: d.toDateString() === selDate.toDateString(), full: d };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff, selDate]);

    const weekMonth = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1 + weekOff * 7);
        return { month: baseMonday.toLocaleString('default', { month: 'long' }), year: baseMonday.getFullYear() };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff]);

    const isSelToday = selDate.toDateString() === realToday.toDateString();
    const selDateStr = toDS(selDate);

    // All tasks flat with subtask info
    const allTasks = useMemo(() => {
        return enrichedProjects.flatMap(proj =>
            proj.tasks.map(t => ({
                ...t,
                pName: proj.name,
                pColor: proj.color || '#FF4500',
                pMoney: proj.money || 0,
                pId: t.projectId,
                subs: t.subtasks || [],
            }))
        );
    }, [enrichedProjects]);

    const dateTasks = allTasks.filter(t => t.date === selDateStr && t.slot != null);
    // Build a map of slot -> task, only for the START slot (not continuations)
    const dateTm: Record<number, typeof dateTasks[0]> = {};
    const blockOccupied = new Set<number>(); // all hours occupied by any time block
    dateTasks.forEach(t => {
        if (t.slot != null) {
            dateTm[t.slot] = t;
            blockOccupied.add(t.slot);
            if (t.slotEnd != null && t.slotEnd > t.slot) {
                for (let h = t.slot + 1; h <= t.slotEnd; h++) {
                    blockOccupied.add(h);
                }
            }
        }
    });
    const dateAllTasks = allTasks.filter(t => t.date === selDateStr);

    const taskDates = useMemo(() => {
        const s = new Set<string>();
        tasks.forEach(t => { if (t.date) s.add(t.date); });
        return s;
    }, [tasks]);

    const pickDate = (d: Date) => {
        setSelDate(d);
        const todayMonday = new Date(realToday);
        todayMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1);
        const targetMonday = new Date(d);
        targetMonday.setDate(d.getDate() - (d.getDay() || 7) + 1);
        setWeekOff(Math.round((targetMonday.getTime() - todayMonday.getTime()) / (7 * 86400000)));
        setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    };

    // Calendar
    const calYear = calMonth.getFullYear();
    const calMon = calMonth.getMonth();
    const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
    const firstDay = (new Date(calYear, calMon, 1).getDay() || 7) - 1;
    const btnArrow: React.CSSProperties = { color: 'var(--t-888,#888)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' };

    const fmtH = (h: number) => `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;

    return (
        <div>
            {/* View Toggle */}
            <div className="glass-panel" style={{ borderRadius: 16, padding: 4, display: 'flex', marginBottom: 16 }}>
                <button onClick={() => setView('time')} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, border: 'none', cursor: 'pointer', borderRadius: 12, transition: 'all .3s', background: view === 'time' ? 'var(--primary)' : 'transparent', color: view === 'time' ? (isEdu ? '#1A1B27' : '#fff') : 'var(--t-888)', boxShadow: view === 'time' ? `0 0 15px ${ac}0.5)` : 'none' }}>Daily Grind</button>
                <button onClick={() => setView('cal')} style={{ flex: 1, padding: 10, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, border: 'none', cursor: 'pointer', borderRadius: 12, transition: 'all .3s', background: view === 'cal' ? 'var(--primary)' : 'transparent', color: view === 'cal' ? (isEdu ? '#1A1B27' : '#fff') : 'var(--t-888)', boxShadow: view === 'cal' ? `0 0 15px ${ac}0.5)` : 'none' }}>Strategic Map</button>
            </div>

            {view === 'time' ? (
                <div>
                    {/* Month Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <button style={btnArrow} onClick={() => { const d = new Date(selDate.getFullYear(), selDate.getMonth() - 1, 1); pickDate(d); }}><span className="material-icons-round" style={{ fontSize: 20 }}>chevron_left</span></button>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t-fff)' }}>{weekMonth.month} {weekMonth.year}</h2>
                        <button style={btnArrow} onClick={() => { const d = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 1); pickDate(d); }}><span className="material-icons-round" style={{ fontSize: 20 }}>chevron_right</span></button>
                    </div>

                    {/* Week Date Strip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                        <button style={{ ...btnArrow, flexShrink: 0 }} onClick={() => setWeekOff(w => w - 1)}><span className="material-icons-round" style={{ fontSize: 18 }}>chevron_left</span></button>
                        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                            {weekDays.map((d, i) => (
                                <div key={i} onClick={() => pickDate(d.full)} style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 2px',
                                    borderRadius: 12, cursor: 'pointer', transition: 'background .2s, border-color .2s, box-shadow .2s',
                                    background: d.isSel ? `linear-gradient(135deg, ${ac}0.25), ${ac}0.08))` : d.isToday ? `${ac}0.06)` : 'var(--g-03)',
                                    border: d.isSel ? `1.5px solid ${ac}0.6)` : d.isToday ? `1px solid ${ac}0.2)` : '1px solid var(--g-04)',
                                    boxShadow: d.isSel ? `0 0 14px ${ac}0.25)` : 'none',
                                }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: d.isSel ? 'var(--primary)' : d.isToday ? (isEdu ? '#6B8E00' : '#FF8C00') : 'var(--t-555)', letterSpacing: 1 }}>{d.name}</span>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: d.isSel ? 'var(--t-fff)' : d.isToday ? 'var(--t-ccc)' : 'var(--t-888)', marginTop: 2 }}>{d.date}</span>
                                    {d.isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--primary)', marginTop: 3, boxShadow: `0 0 6px ${ac}0.8)` }} />}
                                </div>
                            ))}
                        </div>
                        <button style={{ ...btnArrow, flexShrink: 0 }} onClick={() => setWeekOff(w => w + 1)}><span className="material-icons-round" style={{ fontSize: 18 }}>chevron_right</span></button>
                    </div>

                    {/* Selected date label */}
                    <div style={{ fontSize: 10, color: 'var(--t-666)', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        {selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        {isSelToday && <span style={{ color: 'var(--primary)' }}>• Today</span>}
                        {!isSelToday && <button onClick={() => pickDate(new Date())} style={{ padding: '2px 10px', borderRadius: 6, border: `1px solid ${ac}0.3)`, background: `${ac}0.08)`, color: 'var(--primary)', fontSize: 9, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Today</button>}
                    </div>

                    {/* Timeline */}
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 52, top: 0, bottom: 0, width: 1, background: 'linear-gradient(to bottom,transparent,var(--t-333),transparent)' }} />
                        <div className="map-timeline-rows" style={{ display: 'flex', flexDirection: 'column', paddingTop: 8 }}>
                            {hrs.map(h => {
                                const t = dateTm[h]; // only START slots are in dateTm
                                const isOccupiedByCont = !t && blockOccupied.has(h); // continuation hour — skip rendering
                                const isActive = !!t;
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const hr = h % 12 || 12;
                                const blockDuration = t && t.slotEnd != null && t.slot != null ? t.slotEnd - t.slot : 0;
                                const taskSubs = t ? t.subs : [];
                                const subsDone = taskSubs.filter(s => s.done).length;

                                // Skip continuation hours — they are absorbed into the unified block
                                if (isOccupiedByCont) return null;

                                return (
                                    <div key={h} style={{ display: 'flex', position: 'relative' }}>
                                        <div style={{ width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 20, paddingTop: isActive ? 16 : 6 }}>
                                            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: isActive ? 18 : 14, color: isActive ? 'var(--primary)' : 'var(--t-888)', filter: isActive && !isEdu ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{hr}:00</span>
                                            <span style={{ fontSize: 10, color: isActive ? 'var(--primary)' : 'var(--t-666)', fontWeight: isActive ? 700 : 400 }}>{ampm}</span>
                                            {blockDuration > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 3 }}>
                                                    <span className="material-icons-round" style={{ fontSize: 10, color: 'var(--primary)' }}>arrow_downward</span>
                                                    <span style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'Rajdhani', fontWeight: 700 }}>
                                                        {fmtH(t!.slotEnd!)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ position: 'absolute', left: 49, top: isActive ? 20 : 10, width: isActive ? 12 : 6, height: isActive ? 12 : 6, marginLeft: isActive ? -3 : 0, borderRadius: '50%', background: isActive ? 'var(--primary)' : 'var(--t-444)', border: isActive ? '2px solid var(--t-fff)' : '1px solid var(--t-000)', boxShadow: isActive ? `0 0 15px ${ac}0.8)` : 'none', zIndex: 20, animation: isActive && !isEdu ? 'borderPulse 2s infinite' : '' }} />
                                        <div style={{ flex: 1 }}>
                                            {isActive ? (
                                                <div className="active-quest-glow" style={{ borderRadius: 16, padding: 16, transition: 'transform .2s', position: 'relative' }}>
                                                    {/* Action buttons */}
                                                    <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4, zIndex: 20 }}>
                                                        <button onClick={(e) => { e.stopPropagation(); if (!expanded[t!.$id]) toggleExpand(t!.$id); setTimeout(() => document.getElementById(`addSub_map_${t!.$id}`)?.focus(), 50); }} style={{ width: 24, height: 24, borderRadius: '50%', background: `${ac}0.1)`, border: `1px solid ${ac}0.2)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--primary)' }}>add</span>
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'editTask', pid: t!.pId, tid: t!.$id }); }} style={{ width: 24, height: 24, borderRadius: '50%', background: `${ac}0.1)`, border: `1px solid ${ac}0.2)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--primary)' }}>edit</span>
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); if (profile?.confirmTaskDelete !== false) { setConfirmDelete({ type: 'task', id: t!.$id, name: t!.name }); } else { removeTask(t!.$id); showToast('Quest deleted'); } }} style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span className="material-icons-round" style={{ fontSize: 12, color: '#f43f5e' }}>close</span>
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); if (taskSubs.length > 0 && !taskSubs.every(s => s.done) && !t!.done) { showToast('Complete all subtasks first!'); return; } toggleTask(t!.$id); }} style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t!.done ? `linear-gradient(135deg, var(--primary), var(--primary))` : `${ac}0.08)`, border: t!.done ? 'none' : `2px solid ${ac}0.3)`, transition: 'all .3s', boxShadow: t!.done ? `0 0 10px ${ac}0.5)` : 'none' }}>
                                                            {t!.done && <span className="material-icons-round" style={{ fontSize: 16, color: '#fff' }}>check</span>}
                                                        </button>
                                                    </div>
                                                    <div style={{ position: 'relative', zIndex: 10 }} onClick={() => toggleExpand(t!.$id)}>
                                                        {/* Badge row */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: `${ac}0.15)`, color: 'var(--t-ffcba4)', border: `1px solid ${ac}0.3)` }}>
                                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', animation: isEdu ? 'none' : 'borderPulse 2s infinite' }} />Active Quest
                                                            </div>
                                                            {blockDuration > 0 && (
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${ac}0.1)`, border: `1px solid ${ac}0.2)`, color: 'var(--primary)' }}>
                                                                    <span className="material-icons-round" style={{ fontSize: 11 }}>timelapse</span>
                                                                    {blockDuration}h block
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Task name */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                            <h3 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 18, color: t!.done ? 'var(--t-555)' : 'var(--t-fff)', textDecoration: t!.done ? 'line-through' : 'none', margin: 0 }}>{t!.name}</h3>
                                                            {t!.clonedFrom && (
                                                                <span style={{ fontSize: 8, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', padding: '1px 5px', borderRadius: 4, fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 1, whiteSpace: 'nowrap' }}>MULTI-SLOT</span>
                                                            )}
                                                        </div>

                                                        {/* Time range */}
                                                        {blockDuration > 0 ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '6px 10px', borderRadius: 8, background: `${ac}0.08)`, border: `1px solid ${ac}0.15)` }}>
                                                                <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>schedule</span>
                                                                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, color: 'var(--t-fff)' }}>{fmtH(t!.slot!)}</span>
                                                                <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>arrow_forward</span>
                                                                <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, color: 'var(--t-fff)' }}>{fmtH(t!.slotEnd!)}</span>
                                                            </div>
                                                        ) : null}

                                                        {/* Project info */}
                                                        <p style={{ fontSize: 11, color: 'var(--t-888)', marginTop: 2 }}>
                                                            {t!.pName}{showLoot ? ` • ${cs}${t!.pMoney.toLocaleString()}` : ''}
                                                        </p>
                                                    </div>

                                                    {/* Subtasks — expandable */}
                                                    {taskSubs.length > 0 && (
                                                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${ac}0.15)` }}>
                                                            <div onClick={() => toggleExpand(t!.$id)} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, cursor: 'pointer' }}>
                                                                <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--t-666)', transition: 'transform .2s', transform: expanded[t!.$id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>chevron_right</span>
                                                                <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--t-666)' }}>checklist</span>
                                                                <span style={{ fontSize: 9, fontFamily: 'Rajdhani', fontWeight: 700, color: subsDone === taskSubs.length ? '#4ade80' : 'var(--t-666)', letterSpacing: 1, textTransform: 'uppercase' }}>
                                                                    {subsDone}/{taskSubs.length} Subtasks
                                                                </span>
                                                                {subsDone === taskSubs.length && taskSubs.length > 0 && (
                                                                    <span style={{ fontSize: 9, color: '#4ade80' }}>✓</span>
                                                                )}
                                                            </div>
                                                            {expanded[t!.$id] && (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                                    {taskSubs.map(sub => (
                                                                        <div key={sub.$id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 6, opacity: sub.done ? 0.5 : 1, transition: 'all .15s' }}>
                                                                            {editingSub === sub.$id ? (
                                                                                <input autoFocus value={editSubName} onChange={e => setEditSubName(e.target.value)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && editSubName.trim()) { updateSubtaskField(sub.$id, 'name', editSubName.trim()); setEditingSub(null); showToast('Subtask updated'); } else if (e.key === 'Escape') setEditingSub(null); }}
                                                                                    onBlur={() => { if (editSubName.trim() && editSubName.trim() !== sub.name) { updateSubtaskField(sub.$id, 'name', editSubName.trim()); showToast('Subtask updated'); } setEditingSub(null); }}
                                                                                    style={{ flex: 1, background: 'var(--g-03)', border: '1px solid var(--g-06)', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'Rajdhani', fontWeight: 500, color: 'var(--t-bbb)', outline: 'none' }}
                                                                                />
                                                                            ) : (
                                                                                <span style={{ flex: 1, fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 500, color: sub.done ? 'var(--t-555)' : 'var(--t-bbb)', textDecoration: sub.done ? 'line-through' : 'none', lineHeight: 1.3 }}>{sub.name}</span>
                                                                            )}
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingSub(sub.$id); setEditSubName(sub.name); }} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-03)', border: '1px solid var(--g-06)' }}>
                                                                                <span className="material-icons-round" style={{ fontSize: 11, color: 'var(--t-666)' }}>edit</span>
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); if (profile?.confirmTaskDelete !== false) { setConfirmDelete({ type: 'subtask', id: sub.$id, name: sub.name }); } else { removeSubtask(sub.$id); showToast('Subtask deleted'); } }} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
                                                                                <span className="material-icons-round" style={{ fontSize: 12, color: '#f43f5e' }}>close</span>
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); toggleSubtask(sub.$id); }} style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sub.done ? `linear-gradient(135deg,var(--primary),var(--primary))` : 'var(--g-03)', border: sub.done ? 'none' : `1.5px solid ${ac}0.3)`, transition: 'all .15s', boxShadow: sub.done ? `0 0 8px ${ac}0.4)` : 'none' }}>
                                                                                {sub.done && <span className="material-icons-round" style={{ fontSize: 12, color: isEdu ? '#1A1B27' : '#fff' }}>check</span>}
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', marginTop: 2 }}>
                                                                        <input id={`addSub_map_${t!.$id}`} placeholder="+ Add subtask..." onClick={e => e.stopPropagation()}
                                                                            onKeyDown={e => { e.stopPropagation(); const inp = e.target as HTMLInputElement; if (e.key === 'Enter' && inp.value.trim()) { addSubtask(t!.$id, inp.value.trim()); inp.value = ''; } }}
                                                                            style={{ flex: 1, background: 'var(--g-03)', border: '1px solid var(--g-06)', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 500, color: 'var(--t-bbb)', outline: 'none' }}
                                                                        />
                                                                        <button onClick={e => { e.stopPropagation(); const inp = (e.target as HTMLElement).closest('div')?.querySelector('input'); if (inp && inp.value.trim()) { addSubtask(t!.$id, inp.value.trim()); inp.value = ''; } }} style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${ac}0.3)`, background: 'var(--g-03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                            <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--primary)' }}>add</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Add subtask when no subtasks exist */}
                                                    {taskSubs.length === 0 && expanded[t!.$id] && (
                                                        <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${ac}0.1)` }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
                                                                <input id={`addSub_map_${t!.$id}`} placeholder="+ Add subtask..." onClick={e => e.stopPropagation()}
                                                                    onKeyDown={e => { e.stopPropagation(); const inp = e.target as HTMLInputElement; if (e.key === 'Enter' && inp.value.trim()) { addSubtask(t!.$id, inp.value.trim()); inp.value = ''; } }}
                                                                    style={{ flex: 1, background: 'var(--g-03)', border: '1px solid var(--g-06)', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 500, color: 'var(--t-bbb)', outline: 'none' }}
                                                                />
                                                                <button onClick={e => { e.stopPropagation(); const inp = (e.target as HTMLElement).closest('div')?.querySelector('input'); if (inp && inp.value.trim()) { addSubtask(t!.$id, inp.value.trim()); inp.value = ''; } }} style={{ width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${ac}0.3)`, background: 'var(--g-03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--primary)' }}>add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="glass-panel" onClick={() => setModal({ type: 'assignTask', preSlot: h, preDate: selDateStr })} style={{ borderRadius: 16, padding: 12, minHeight: 40, border: '1px dashed var(--g-08)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--t-555)' }}>add_circle_outline</span>
                                                    <span style={{ fontSize: 12, color: 'var(--t-555)' }}>Add quest to this slot</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Calendar Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <button style={btnArrow} onClick={() => { const d = new Date(calYear, calMon - 1, 1); pickDate(d); }}><span className="material-icons-round">chevron_left</span></button>
                        <h2 style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{calMonth.toLocaleString('default', { month: 'long' })} {calYear}</h2>
                        <button style={btnArrow} onClick={() => { const d = new Date(calYear, calMon + 1, 1); pickDate(d); }}><span className="material-icons-round">chevron_right</span></button>
                    </div>

                    {/* Day labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, textAlign: 'center', marginBottom: 6 }}>
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 700, color: i === 2 ? 'var(--primary)' : 'var(--t-666)', padding: 4 }}>{d}</div>)}
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 20 }}>
                        {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                            const thisDate = new Date(calYear, calMon, d);
                            const isTod = thisDate.toDateString() === realToday.toDateString();
                            const isSel = thisDate.toDateString() === selDate.toDateString();
                            const hasTask = taskDates.has(toDS(thisDate));
                            return (
                                <div key={d} onClick={() => pickDate(thisDate)} className={`cal-day${isTod ? ' active' : ''}`} style={{ cursor: 'pointer', transition: 'all .2s', outline: isSel && !isTod ? `1.5px solid ${ac}0.5)` : 'none', background: isSel && !isTod ? `${ac}0.08)` : undefined, borderRadius: 10 }}>
                                    {d}
                                    {hasTask && <div className={`orb ${d % 2 === 0 ? 'orb-blue' : 'orb-orange'}`} style={isTod ? { animation: 'borderPulse 2s infinite' } : {}} />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Today button */}
                    {!isSelToday && <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <button onClick={() => pickDate(new Date())} style={{ padding: '4px 14px', borderRadius: 8, border: `1px solid ${ac}0.3)`, background: `${ac}0.08)`, color: 'var(--primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>Jump to Today</button>
                    </div>}

                    {/* Quest Briefing */}
                    <div style={{ position: 'relative', marginTop: 8 }}>
                        <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 128, height: 24, background: `${ac}0.15)`, filter: isEdu ? 'none' : 'blur(16px)', borderRadius: '50%', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', borderRadius: 16, padding: 20, overflow: 'hidden', background: isEdu ? '#FFFFFF' : 'linear-gradient(145deg, var(--g-08), var(--g-02))', border: `1px solid ${ac}0.25)`, backdropFilter: 'blur(12px)', boxShadow: isEdu ? '0 1px 8px rgba(0,0,0,0.04)' : 'none' }}>
                            {/* Corner accents */}
                            {[
                                { top: 0, left: 0, borderTop: `2px solid ${ac}0.4)`, borderLeft: `2px solid ${ac}0.4)`, borderRadius: '4px 0 0 0' },
                                { top: 0, right: 0, borderTop: `2px solid ${ac}0.4)`, borderRight: `2px solid ${ac}0.4)`, borderRadius: '0 4px 0 0' },
                                { bottom: 0, left: 0, borderBottom: `2px solid ${ac}0.4)`, borderLeft: `2px solid ${ac}0.4)`, borderRadius: '0 0 0 4px' },
                                { bottom: 0, right: 0, borderBottom: `2px solid ${ac}0.4)`, borderRight: `2px solid ${ac}0.4)`, borderRadius: '0 0 4px 0' },
                            ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 12, height: 12, ...s }} />)}

                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--t-fff)' }}>
                                    Quest Briefing <span style={{ color: 'var(--primary)', fontSize: 12, marginLeft: 6 }}>// {selDate.getDate()} {selDate.toLocaleString('default', { month: 'short' })}</span>
                                </h3>
                                <div style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--b-40)', border: '1px solid var(--g-08)', fontSize: 9, color: 'var(--t-888)', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    {dateAllTasks.length} Quest{dateAllTasks.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {/* Task list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {dateAllTasks.length > 0 ? dateAllTasks.map((t, i) => {
                                    const clr = t.pColor;
                                    const icon = TASK_ICONS[i % TASK_ICONS.length];
                                    const taskSubs = t.subs;
                                    const subsDone = taskSubs.filter(s => s.done).length;
                                    return (
                                        <div key={t.$id} style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--g-02)', border: '1px solid var(--g-04)', transition: 'all .2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, cursor: 'pointer' }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isEdu ? `linear-gradient(135deg, ${clr}15, #FFFFFF)` : `linear-gradient(135deg, ${clr}25, rgba(0,0,0,0.5))`, border: `1px solid ${clr}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isEdu ? 'none' : 'inset 0 0 10px rgba(0,0,0,0.3)' }}>
                                                    <span className="material-icons-round" style={{ color: clr, fontSize: 20 }}>{icon}</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h4 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 14, color: t.done ? 'var(--t-555)' : 'var(--t-fff)', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h4>
                                                    <p style={{ fontSize: 10, color: 'var(--t-666)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {t.pName}
                                                        {t.slot != null ? ` • ${fmtH(t.slot)}` : ''}
                                                        {t.slotEnd != null && t.slot != null ? `→${fmtH(t.slotEnd)}` : ''}
                                                        {taskSubs.length > 0 && ` • ${subsDone}/${taskSubs.length} subtasks`}
                                                        {t.done && <> • <span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2, color: '#22c55e' }}>check_circle</span>Done</>}
                                                    </p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'editTask', pid: t.pId, tid: t.$id }); }} style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-04)', border: '1px solid var(--g-08)', transition: 'all .2s' }}>
                                                    <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--t-666)' }}>edit</span>
                                                </button>
                                                {showLoot && (
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div className="text-gold" style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+{cs}{t.pMoney.toLocaleString()}</div>
                                                        <div style={{ fontSize: 8, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>Reward</div>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Subtasks in Quest Briefing */}
                                            {taskSubs.length > 0 && (
                                                <div style={{ padding: '0 10px 10px 62px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {taskSubs.map(sub => (
                                                        <div key={sub.$id} onClick={() => toggleSubtask(sub.$id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', borderRadius: 4, cursor: 'pointer', transition: 'all .15s' }}>
                                                            <div style={{
                                                                width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                                                                background: sub.done ? clr : 'var(--g-05)',
                                                                border: sub.done ? 'none' : `1px solid ${clr}40`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            }}>
                                                                {sub.done && <span className="material-icons-round" style={{ fontSize: 9, color: '#fff' }}>check</span>}
                                                            </div>
                                                            <span style={{ fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 500, color: sub.done ? 'var(--t-555)' : 'var(--t-999)', textDecoration: sub.done ? 'line-through' : 'none' }}>{sub.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div style={{ textAlign: 'center', padding: 20 }}>
                                        <span className="material-icons-round" style={{ fontSize: 32, color: 'var(--t-333)', marginBottom: 8 }}>event_available</span>
                                        <p style={{ fontSize: 12, color: 'var(--t-555)', fontFamily: 'Rajdhani', fontWeight: 600 }}>No quests scheduled for {isSelToday ? 'today' : selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                        <button onClick={() => setModal({ type: 'assignTask', preDate: selDateStr })} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 10, border: `1px solid ${ac}0.3)`, background: `${ac}0.1)`, color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                                            <span className="material-icons-round" style={{ fontSize: 16 }}>add_task</span>
                                            Add Quest
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Confirm Delete Portal */}
            {confirmDelete && typeof window !== 'undefined' && createPortal(
                <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="confirm-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: '#f43f5e' }}>warning</span>
                            </div>
                            <div>
                                <h3>Delete {confirmDelete.type === 'task' ? 'Quest' : 'Subtask'}?</h3>
                                <p className="confirm-sub">This cannot be undone</p>
                            </div>
                        </div>
                        <p className="confirm-name">&ldquo;{confirmDelete.name}&rdquo;</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="confirm-delete" onClick={async () => { if (confirmDelete.type === 'task') { await removeTask(confirmDelete.id); showToast('Quest deleted'); } else { await removeSubtask(confirmDelete.id); showToast('Subtask deleted'); } setConfirmDelete(null); }}>
                                <span className="material-icons-round" style={{ fontSize: 14 }}>delete</span>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
