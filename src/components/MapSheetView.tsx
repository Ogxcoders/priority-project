/* ===== MapSheetView — Calendar-Sheet Hybrid with ALL Calendar Features ===== */
'use client';
import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SheetView, { type SheetColumn } from '@/components/SheetView';
import { useData } from '@/context/DataContext';
import { toDS, DAY_NAMES } from '@/lib/utils';
import { currSym, TASK_ICONS, STATUS_OPTS, STATUS_LABELS } from '@/lib/constants';
import { t } from '@/lib/terms';
import './calendar-sheet.css';

export default function MapSheetView() {
    const {
        tasks, enrichedProjects, profile,
        toggleTask, toggleSubtask, addSubtask, addTask,
        updateTaskField, updateSubtaskField,
        removeTask, removeSubtask,
        setModal, showToast,
    } = useData();

    /* ── Profile settings ── */
    const gm = profile?.gameMode ?? true;
    const isEdu = profile?.theme === 'eduplex';
    const showLoot = profile?.showLoot ?? false;
    const cs = currSym(profile?.currency || 'USD');
    const startH = profile?.startHour ?? 8;
    const endH = profile?.endHour ?? 19;

    /* ── View state ── */
    const [view, setView] = useState<'time' | 'cal'>('time');
    const [selDate, setSelDate] = useState(new Date());
    const [weekOff, setWeekOff] = useState(0);
    const [calMonth, setCalMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [editingSub, setEditingSub] = useState<string | null>(null);
    const [editSubName, setEditSubName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'task' | 'subtask'; id: string; name: string } | null>(null);
    const [showAllTasks, setShowAllTasks] = useState(false);

    /* ── Date helpers ── */
    const realToday = useMemo(() => new Date(), []);
    const todayStr = realToday.toDateString();
    const selDateStr = toDS(selDate);
    const isSelToday = selDate.toDateString() === todayStr;
    const fmtH = (h: number) => `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    const fmtHShort = (h: number) => `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;
    const toggleExpand = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

    /* ── Pick date → sync week offset + calendar month ── */
    const pickDate = useCallback((d: Date) => {
        setSelDate(d);
        const todayMonday = new Date(realToday);
        todayMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1);
        const targetMonday = new Date(d);
        targetMonday.setDate(d.getDate() - (d.getDay() || 7) + 1);
        setWeekOff(Math.round((targetMonday.getTime() - todayMonday.getTime()) / (7 * 86400000)));
        setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }, [realToday]);

    /* ── Week days ── */
    const weekDays = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1 + weekOff * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseMonday);
            d.setDate(baseMonday.getDate() + i);
            return { name: DAY_NAMES[d.getDay()], date: d.getDate(), isToday: d.toDateString() === todayStr, isSel: d.toDateString() === selDate.toDateString(), full: d };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff, selDate]);

    const weekMonth = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - (realToday.getDay() || 7) + 1 + weekOff * 7);
        return { month: baseMonday.toLocaleString('default', { month: 'long' }), year: baseMonday.getFullYear() };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff]);

    /* ── Calendar grid data ── */
    const calYear = calMonth.getFullYear();
    const calMon = calMonth.getMonth();
    const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
    const firstDay = (new Date(calYear, calMon, 1).getDay() || 7) - 1;

    /* ── All tasks flat ── */
    const allTasks = useMemo(() => {
        return enrichedProjects.flatMap((proj, pi) =>
            proj.tasks.filter((tk: any) => !tk.clonedFrom).map((tk: any) => ({
                ...tk,
                pName: proj.name,
                pColor: proj.color || '#FF4500',
                pMoney: proj.money || 0,
                pId: proj.$id,
                subs: tk.subtasks || [],
                _icon: TASK_ICONS[pi % TASK_ICONS.length],
            }))
        );
    }, [enrichedProjects]);

    /* ── Task dates for calendar dots ── */
    const taskDates = useMemo(() => {
        const s = new Set<string>();
        tasks.forEach((tk: any) => { if (tk.date) s.add(tk.date); });
        return s;
    }, [tasks]);

    /* ── Date-filtered tasks ── */
    const dateTasks = useMemo(() => allTasks.filter(tk => tk.date === selDateStr), [allTasks, selDateStr]);

    /* ── Build occupied time slot map ── */
    const hrsCount = startH <= endH ? (endH - startH + 1) : (24 - startH + endH + 1);
    const hrs = useMemo(() => Array.from({ length: Math.max(1, hrsCount) }, (_, i) => (startH + i) % 24), [hrsCount, startH]);

    const occupied = useMemo(() => {
        const set = new Set<number>();
        dateTasks.forEach(tk => {
            if (tk.slot != null) {
                set.add(tk.slot);
                if (tk.slotEnd != null && tk.slotEnd > tk.slot) {
                    for (let h = tk.slot + 1; h <= tk.slotEnd; h++) set.add(h);
                }
            }
        });
        return set;
    }, [dateTasks]);

    /* ── Date stats ── */
    const dateStats = useMemo(() => ({
        total: dateTasks.length,
        done: dateTasks.filter(tk => tk.done).length,
        scheduled: dateTasks.filter(tk => tk.slot != null).length,
        backlog: dateTasks.filter(tk => tk.slot == null).length,
    }), [dateTasks]);

    /* ── Flat data for SheetView (with subtask rows) ── */
    const flatData = useMemo(() => {
        const rows: any[] = [];

        if (view === 'time' && !showAllTasks) {
            /* ─── Day-planner mode: one row per hour ─── */
            // Map: hour → tasks starting at that hour
            const hourTasks = new Map<number, any[]>();
            const unslotted: any[] = [];
            dateTasks.forEach((tk: any) => {
                if (tk.slot != null) {
                    const list = hourTasks.get(tk.slot) || [];
                    list.push(tk);
                    hourTasks.set(tk.slot, list);
                } else {
                    unslotted.push(tk);
                }
            });

            // Build occupied-continuation set (mid-hours of multi-slot tasks)
            const contHours = new Map<number, any>(); // hour → the task that spans it
            dateTasks.forEach((tk: any) => {
                if (tk.slot != null && tk.slotEnd != null && tk.slotEnd > tk.slot) {
                    for (let h = tk.slot + 1; h <= tk.slotEnd; h++) contHours.set(h, tk);
                }
            });

            // For each configured hour, emit rows
            hrs.forEach(h => {
                const tasksAtHour = hourTasks.get(h);
                if (tasksAtHour && tasksAtHour.length > 0) {
                    // Task rows for this hour
                    tasksAtHour.forEach((tk: any) => {
                        const subs = tk.subs || [];
                        rows.push({
                            ...tk,
                            status: tk.status || 'default',
                            subsCount: subs.length,
                            subsDone: subs.filter((s: any) => s.done).length,
                            dateSort: tk.date || '9999-99-99',
                            slotSort: h,
                            _depth: 0, _hasChildren: subs.length > 0, _rowType: 'task',
                        });
                        subs.forEach((s: any) => {
                            rows.push({
                                $id: s.$id, name: s.name, done: s.done,
                                pName: '', pColor: tk.pColor, pMoney: 0, pId: tk.pId,
                                priority: 0, date: '', slot: null, slotEnd: null,
                                subsCount: 0, subsDone: 0,
                                dateSort: tk.date || '9999-99-99', slotSort: h + 0.5,
                                _icon: '', _taskId: tk.$id,
                                _depth: 1, _parentId: tk.$id, _hasChildren: false, _rowType: 'subtask',
                            });
                        });
                    });
                } else if (contHours.has(h)) {
                    // Continuation of a multi-hour task
                    const parent = contHours.get(h);
                    rows.push({
                        $id: `_cont_${h}`, name: '', done: false, status: 'default',
                        priority: 0, date: selDateStr, slot: h, slotEnd: null,
                        pName: parent?.pName || '', pColor: parent?.pColor || '#555', pMoney: 0, pId: '',
                        subsCount: 0, subsDone: 0, dateSort: selDateStr, slotSort: h,
                        _icon: '', _depth: 0, _hasChildren: false, _rowType: 'slot-cont',
                        _parentTaskName: parent?.name || '',
                    });
                } else {
                    // Free slot
                    rows.push({
                        $id: `_free_${h}`, name: '', done: false, status: 'default',
                        priority: 0, date: selDateStr, slot: h, slotEnd: null,
                        pName: '', pColor: '#555', pMoney: 0, pId: '',
                        subsCount: 0, subsDone: 0, dateSort: selDateStr, slotSort: h,
                        _icon: '', _depth: 0, _hasChildren: false, _rowType: 'free-slot',
                    });
                }
            });

            // Append unslotted (backlog) tasks at the end
            unslotted.forEach((tk: any) => {
                const subs = tk.subs || [];
                rows.push({
                    ...tk,
                    status: tk.status || 'default',
                    subsCount: subs.length,
                    subsDone: subs.filter((s: any) => s.done).length,
                    dateSort: tk.date || '9999-99-99',
                    slotSort: 99,
                    _depth: 0, _hasChildren: subs.length > 0, _rowType: 'task',
                });
                subs.forEach((s: any) => {
                    rows.push({
                        $id: s.$id, name: s.name, done: s.done,
                        pName: '', pColor: tk.pColor, pMoney: 0, pId: tk.pId,
                        priority: 0, date: '', slot: null, slotEnd: null,
                        subsCount: 0, subsDone: 0,
                        dateSort: tk.date || '9999-99-99', slotSort: 99.5,
                        _icon: '', _taskId: tk.$id,
                        _depth: 1, _parentId: tk.$id, _hasChildren: false, _rowType: 'subtask',
                    });
                });
            });
        } else {
            /* ─── Calendar / all-tasks mode: normal rows ─── */
            const source = allTasks;
            source.forEach((tk: any) => {
                const subs = tk.subs || [];
                rows.push({
                    ...tk,
                    status: tk.status || 'default',
                    subsCount: subs.length,
                    subsDone: subs.filter((s: any) => s.done).length,
                    dateSort: tk.date || '9999-99-99',
                    slotSort: tk.slot ?? 99,
                    _depth: 0, _hasChildren: subs.length > 0, _rowType: 'task',
                });
                subs.forEach((s: any) => {
                    rows.push({
                        $id: s.$id, name: s.name, done: s.done,
                        pName: '', pColor: tk.pColor, pMoney: 0, pId: tk.pId,
                        priority: 0, date: '', slot: null, slotEnd: null,
                        subsCount: 0, subsDone: 0,
                        dateSort: tk.date || '9999-99-99', slotSort: (tk.slot ?? 99) + 0.5,
                        _icon: '', _taskId: tk.$id,
                        _depth: 1, _parentId: tk.$id, _hasChildren: false, _rowType: 'subtask',
                    });
                });
            });
            /* Inject "add task" placeholder row for EVERY day of the month in cal view */
            if (view === 'cal') {
                for (let d = 1; d <= daysInMonth; d++) {
                    const dayDate = new Date(calYear, calMon, d);
                    const ds = toDS(dayDate);
                    rows.push({
                        $id: `_day_${ds}`, name: '', done: false, status: 'default',
                        priority: 0, date: ds, slot: null, slotEnd: null,
                        pName: '', pColor: '#555', pMoney: 0, pId: '',
                        subsCount: 0, subsDone: 0, dateSort: ds, slotSort: 998,
                        _icon: '', _depth: 0, _hasChildren: false, _rowType: 'empty-day',
                    });
                }
            }
            rows.sort((a, b) => a.dateSort.localeCompare(b.dateSort) || a.slotSort - b.slotSort);
        }

        return rows;
    }, [view, showAllTasks, dateTasks, allTasks, calYear, calMon, daysInMonth, selDateStr, hrs]);

    /* ── Slot & priority options ── */
    const slotOpts = useMemo(() =>
        Array.from({ length: 19 }, (_, i) => i + 5).map(h => ({ value: String(h), label: fmtH(h) }))
    , []);
    const priOpts = [1, 2, 3, 4].map(n => ({ value: String(n), label: `P${n}` }));

    /* ── Columns — adaptive to view mode ── */
    const isTimeView = view === 'time' && !showAllTasks;

    /* ── Free slots for column display ── */
    const freeSlots = useMemo(() => hrs.filter(h => !occupied.has(h)), [hrs, occupied]);

    const columns: SheetColumn[] = useMemo(() => [
        /* Date column — only in "all tasks" mode */
        ...(!isTimeView ? [{
            key: 'date', label: 'Date', width: '14%', sortable: true, editable: true, editType: 'date' as const,
            render: (v: string, row: any) => {
                if (row._rowType === 'subtask' || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return <span style={{ opacity: 0.1 }}>—</span>;
                if (!v) return <span style={{ fontStyle: 'italic', opacity: 0.3, fontSize: 10 }}>No date</span>;
                const d = new Date(v + 'T00:00:00');
                const isTod = d.toDateString() === todayStr;
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 11, fontWeight: isTod ? 700 : 500, color: isTod ? 'var(--primary)' : 'var(--t-eee)' }}>
                            {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        {isTod && <span className="cs-today-badge">TODAY</span>}
                    </span>
                );
            },
        }] : []),

        /* Time / Slot */
        {
            key: 'slot', label: 'Time', width: isTimeView ? '10%' : '10%', sortable: true, align: 'center',
            editable: true, editType: 'select', editOptions: slotOpts,
            render: (v: number | null, row: any) => {
                const nowH = new Date().getHours();
                /* Free slot — time gutter label */
                if (row._rowType === 'free-slot') {
                    const isCurrent = row.slot === nowH && isSelToday;
                    return (
                        <div className={`cs-time-gutter ${isCurrent ? 'cs-time-now' : ''}`}>
                            <span className="cs-time-hour">{fmtHShort(row.slot)}</span>
                            {isCurrent && <span className="cs-time-now-dot" />}
                        </div>
                    );
                }
                /* Continuation of a multi-hour task */
                if (row._rowType === 'slot-cont') {
                    const isCurrent = row.slot === nowH && isSelToday;
                    return (
                        <div className={`cs-time-gutter cs-time-cont ${isCurrent ? 'cs-time-now' : ''}`}>
                            <span className="cs-time-hour">{fmtHShort(row.slot)}</span>
                            {isCurrent && <span className="cs-time-now-dot" />}
                        </div>
                    );
                }
                if (row._rowType === 'subtask' || v == null) return <span style={{ opacity: 0.15 }}>—</span>;
                const duration = row.slotEnd != null ? row.slotEnd - v : 0;
                const isActive = row.date === selDateStr && !row.done && v <= nowH && (row.slotEnd ? row.slotEnd > nowH : v === nowH);
                const isCurrent = v === nowH && isSelToday;
                return (
                    <div className={`cs-time-gutter cs-time-task ${isActive ? 'cs-time-active' : ''} ${isCurrent ? 'cs-time-now' : ''}`}>
                        <span className="cs-time-hour">{fmtHShort(v)}</span>
                        {row.slotEnd != null && (
                            <span className="cs-time-end">→{fmtHShort(row.slotEnd)}</span>
                        )}
                        {duration > 0 && (
                            <span className="cs-time-duration">{duration}h</span>
                        )}
                        {isCurrent && <span className="cs-time-now-dot" />}
                    </div>
                );
            },
        },

        /* Task name with active badge + multi-slot badge */
        {
            key: 'name', label: t('task', gm), width: isTimeView ? '28%' : '22%', minWidth: 120,
            sortable: true, editable: true, editType: 'text',
            render: (v: string, row: any) => {
                /* Free slot — clickable "Add task" */
                if (row._rowType === 'free-slot') {
                    return (
                        <button className="cs-free-slot-add"
                            onClick={e => { e.stopPropagation(); setModal({ type: 'assignTask', preSlot: row.slot, preDate: selDateStr }); }}>
                            <span className="material-icons-round" style={{ fontSize: 13 }}>add_circle_outline</span>
                            Add {t('task', gm).toLowerCase()}
                        </button>
                    );
                }
                /* Continuation — show parent task name dimmed */
                if (row._rowType === 'slot-cont') {
                    return (
                        <span className="cs-cont-label" style={{ color: row.pColor }}>
                            <span className="cs-cont-bar" style={{ background: row.pColor }} />
                            {row._parentTaskName || 'continues'}
                        </span>
                    );
                }
                if (row._rowType === 'empty-day') {
                    return (
                        <button
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', opacity: 0.35, fontSize: 11, color: 'var(--t-bbb)' }}
                            onClick={e => { e.stopPropagation(); setModal({ type: 'assignTask', preDate: row.date }); }}>
                            <span className="material-icons-round" style={{ fontSize: 13 }}>add_circle_outline</span>
                            Add {t('task', gm).toLowerCase()}
                        </button>
                    );
                }
                if (row._rowType === 'subtask') {
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: row.pColor, opacity: 0.4, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 500, color: row.done ? 'var(--t-888)' : 'var(--t-bbb)', textDecoration: row.done ? 'line-through' : 'none' }}>{v}</span>
                        </span>
                    );
                }
                const nowH = new Date().getHours();
                const isActive = row.date === selDateStr && !row.done && row.slot != null && row.slot <= nowH && (row.slotEnd ? row.slotEnd > nowH : row.slot === nowH);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: `linear-gradient(135deg, ${row.pColor}25, var(--g-04))`, border: `1px solid ${row.pColor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons-round" style={{ color: row.pColor, fontSize: 12 }}>{row._icon || 'assignment'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: row.done ? 'var(--t-888)' : 'var(--t-fff)', textDecoration: row.done ? 'line-through' : 'none' }}>{v || '—'}</span>
                                {isActive && <span className="cs-active-badge">{t('active_quest', gm)}</span>}
                                {row.clonedFrom && <span className="cs-multi-badge">MULTI-SLOT</span>}
                            </div>
                        </div>
                    </div>
                );
            },
        },

        /* Project */
        {
            key: 'pName', label: t('project', gm), width: '11%', sortable: true, filterable: true,
            render: (v: string, row: any) => {
                if (row._rowType === 'subtask' || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return <span style={{ opacity: 0.1 }}>—</span>;
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: row.pColor, flexShrink: 0, boxShadow: `0 0 5px ${row.pColor}` }} />
                        <span style={{ fontSize: 10, color: 'var(--t-888)' }}>{v}</span>
                    </span>
                );
            },
        },

        /* Priority */
        {
            key: 'priority', label: 'Pri', width: '6%', sortable: true, align: 'center',
            editable: true, editType: 'select', editOptions: priOpts,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask' || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return <span style={{ opacity: 0.1 }}>—</span>;
                const clr = row.pColor || '#FF4500';
                return <span className="sv-pri" style={{ background: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>#{v}</span>;
            },
        },

        /* Status + subtask progress */
        {
            key: 'status', label: 'Status', width: '9%', sortable: true, align: 'center',
            editable: true, editType: 'select', editOptions: STATUS_OPTS,
            expandOnClick: false,
            render: (_v: string, row: any) => {
                if (row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return <span style={{ opacity: 0.1 }}>—</span>;
                if (row._rowType === 'subtask') return <span className={`sv-status ${row.done ? 'done' : 'todo'}`}><span className="dot" />{row.done ? '✓' : '○'}</span>;
                const st = row.done ? 'done' : (row.status || 'default');
                const labels = STATUS_LABELS;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <span className={`sv-status ${st}`}><span className="dot" />{labels[st] || 'Default'}</span>
                        {row.subsCount > 0 && (
                            <span className="cs-sub-progress" style={{ color: row.subsDone === row.subsCount ? '#4ade80' : 'var(--t-888)' }}>
                                <span className="material-icons-round" style={{ fontSize: 8 }}>checklist</span>
                                {row.subsDone}/{row.subsCount}
                            </span>
                        )}
                    </div>
                );
            },
        },

        /* Loot / Budget (conditional) */
        ...(showLoot ? [{
            key: 'pMoney', label: gm ? t('money', gm) : 'Budget', width: '8%', sortable: true, align: 'right' as const,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask' || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return <span style={{ opacity: 0.1 }}>—</span>;
                return <span className={gm ? 'text-gold' : ''} style={{ fontWeight: 700, fontSize: 13 }}>{cs}{(v || 0).toLocaleString()}</span>;
            },
        }] : []),


        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [isTimeView, gm, showLoot, cs, todayStr, selDateStr, slotOpts, flatData]);

    /* ══════════════════════════
       HANDLERS
       ══════════════════════════ */
    const handleEdit = (id: string, field: string, value: any) => {
        const row = flatData.find(r => r.$id === id);
        if (!row || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return;
        if (row._rowType === 'subtask') { updateSubtaskField(id, field, value); showToast('Subtask updated'); return; }
        if (field === 'status') {
            if (value === 'done') { if (!row.done) toggleTask(id); }
            else { if (row.done) toggleTask(id); updateTaskField(id, 'status', value); }
            showToast('Status updated'); return;
        }
        if (field === 'slot') { updateTaskField(id, 'slot', parseInt(value) || null); showToast('Time updated'); return; }
        if (field === 'priority') { updateTaskField(id, 'priority', parseInt(value) || 1); showToast('Priority updated'); return; }
        updateTaskField(id, field, value); showToast(`${t('task', gm)} updated`);
    };

    const handleToggle = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (!row || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return;
        if (row._rowType === 'subtask') toggleSubtask(id);
        else toggleTask(id);
    };

    const handleRowClick = (row: any) => {
        if (row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return;
        if (row._rowType === 'subtask') setModal({ type: 'editTask', pid: row.pId, tid: row._taskId });
        else setModal({ type: 'editTask', pid: row.pId, tid: row.$id });
    };

    const handleDelete = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (!row || row._rowType === 'empty-day' || row._rowType === 'free-slot' || row._rowType === 'slot-cont') return;
        if (row._rowType === 'subtask') {
            if (profile?.confirmTaskDelete !== false) setConfirmDelete({ type: 'subtask', id, name: row.name });
            else { removeSubtask(id); showToast('Subtask deleted'); }
        } else {
            if (profile?.confirmTaskDelete !== false) setConfirmDelete({ type: 'task', id, name: row.name });
            else { removeTask(id); showToast(gm ? 'Quest deleted' : 'Task deleted'); }
        }
    };

    const handleInlineAdd = (name: string, parentId: string | null, depth: number) => {
        if (depth === 1 && parentId) {
            addSubtask(parentId, name);
            showToast('Subtask added');
        } else if (depth === 0 && !parentId) {
            const firstProject = enrichedProjects[0];
            if (firstProject) {
                addTask(firstProject.$id, name, 4, null, null, view === 'time' ? selDateStr : null);
                showToast(`${t('task', gm)} added`);
            } else {
                showToast('Create a project first!');
            }
        }
    };

    /* ── Footer stats ── */
    const topTasks = flatData.filter(r => r._depth === 0 && r._rowType !== 'empty-day' && r._rowType !== 'free-slot' && r._rowType !== 'slot-cont');
    const sched = topTasks.filter(r => r.date);
    const backlog = topTasks.filter(r => !r.date);
    const doneTasks = topTasks.filter(r => r.done);

    /* ══════════════════════════
       RENDER
       ══════════════════════════ */
    return (
        <div className="cs-root">
            {/* ═══ 1. View Toggle ═══ */}
            <div className="cs-toggle">
                <button className={`cs-toggle-btn ${view === 'time' ? 'active' : ''}`} onClick={() => setView('time')}>
                    <span className="material-icons-round" style={{ fontSize: 14 }}>schedule</span>
                    {gm ? 'Daily Grind' : 'Daily View'}
                </button>
                <button className={`cs-toggle-btn ${view === 'cal' ? 'active' : ''}`} onClick={() => setView('cal')}>
                    <span className="material-icons-round" style={{ fontSize: 14 }}>calendar_month</span>
                    {gm ? 'Strategic Map' : 'Calendar'}
                </button>
            </div>

            {view === 'time' ? (
                /* ═══════════════════════════
                   DAILY GRIND VIEW
                   ═══════════════════════════ */
                <>
                    {/* 2. Month/Year header */}
                    <div className="cs-month-header">
                        <button className="cs-nav-btn" onClick={() => { const d = new Date(selDate.getFullYear(), selDate.getMonth() - 1, 1); pickDate(d); }}>
                            <span className="material-icons-round" style={{ fontSize: 20 }}>chevron_left</span>
                        </button>
                        <h2 className="cs-month-title">{weekMonth.month} {weekMonth.year}</h2>
                        <button className="cs-nav-btn" onClick={() => { const d = new Date(selDate.getFullYear(), selDate.getMonth() + 1, 1); pickDate(d); }}>
                            <span className="material-icons-round" style={{ fontSize: 20 }}>chevron_right</span>
                        </button>
                    </div>

                    {/* 3. Week date strip */}
                    <div className="cs-week-strip">
                        <button className="cs-nav-btn cs-nav-sm" onClick={() => setWeekOff(w => w - 1)}>
                            <span className="material-icons-round" style={{ fontSize: 18 }}>chevron_left</span>
                        </button>
                        <div className="cs-week-days">
                            {weekDays.map((d, i) => (
                                <div key={i} className={`cs-day ${d.isSel ? 'selected' : ''} ${d.isToday ? 'today' : ''}`} onClick={() => pickDate(d.full)}>
                                    <span className="cs-day-name">{d.name}</span>
                                    <span className="cs-day-num">{d.date}</span>
                                    {d.isToday && <div className="cs-day-dot" />}
                                </div>
                            ))}
                        </div>
                        <button className="cs-nav-btn cs-nav-sm" onClick={() => setWeekOff(w => w + 1)}>
                            <span className="material-icons-round" style={{ fontSize: 18 }}>chevron_right</span>
                        </button>
                    </div>

                    {/* 4. Selected date label + Today badge */}
                    <div className="cs-date-label">
                        <span>{selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        {isSelToday ? (
                            <span className="cs-today-tag">• Today</span>
                        ) : (
                            /* 5. Jump to Today button */
                            <button className="cs-jump-btn" onClick={() => pickDate(new Date())}>Today</button>
                        )}
                    </div>

                    {/* 26. Date stats summary */}
                    <div className="cs-stats">
                        <div className="cs-stat">
                            <span className="material-icons-round" style={{ fontSize: 12 }}>assignment</span>
                            <span>{dateStats.total} total</span>
                        </div>
                        <div className="cs-stat done">
                            <span className="material-icons-round" style={{ fontSize: 12 }}>check_circle</span>
                            <span>{dateStats.done} done</span>
                        </div>
                        <div className="cs-stat scheduled">
                            <span className="material-icons-round" style={{ fontSize: 12 }}>schedule</span>
                            <span>{dateStats.scheduled} scheduled</span>
                        </div>
                        <div className="cs-stat backlog">
                            <span className="material-icons-round" style={{ fontSize: 12 }}>inventory_2</span>
                            <span>{dateStats.backlog} unslotted</span>
                        </div>
                    </div>

                    {/* 19. Date filter toggle (date only / all tasks) */}
                    <div className="cs-view-toggle-row">
                        <button className={`cs-view-mode-btn ${!showAllTasks ? 'active' : ''}`} onClick={() => setShowAllTasks(false)}>
                            <span className="material-icons-round" style={{ fontSize: 13 }}>today</span>
                            {selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Only
                        </button>
                        <button className={`cs-view-mode-btn ${showAllTasks ? 'active' : ''}`} onClick={() => setShowAllTasks(true)}>
                            <span className="material-icons-round" style={{ fontSize: 13 }}>date_range</span>
                            All {gm ? 'Quests' : 'Tasks'}
                        </button>
                    </div>
                </>
            ) : (
                /* ═══════════════════════════
                   STRATEGIC MAP (CALENDAR) VIEW
                   ═══════════════════════════ */
                <>
                    <div className="cs-cal-desktop-layout">
                        {/* Left: Calendar sidebar */}
                        <div className="cs-cal-sidebar">
                            {/* 15. Monthly calendar grid header */}
                            <div className="cs-cal-header">
                                <button className="cs-nav-btn" onClick={() => setCalMonth(new Date(calYear, calMon - 1, 1))}>
                                    <span className="material-icons-round">chevron_left</span>
                                </button>
                                <h2 className="cs-month-title">{calMonth.toLocaleString('default', { month: 'long' })} {calYear}</h2>
                                <button className="cs-nav-btn" onClick={() => setCalMonth(new Date(calYear, calMon + 1, 1))}>
                                    <span className="material-icons-round">chevron_right</span>
                                </button>
                            </div>

                            {/* 15. Calendar grid with task dots */}
                            <div className="cs-cal-grid">
                                <div className="cs-cal-labels">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                        <span key={i} className="cs-cal-label">{d}</span>
                                    ))}
                                </div>
                                <div className="cs-cal-days">
                                    {Array.from({ length: firstDay }).map((_, i) => <div key={'e' + i} className="cs-cal-empty" />)}
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                                        const thisDate = new Date(calYear, calMon, d);
                                        const isTod = thisDate.toDateString() === todayStr;
                                        const isSel = thisDate.toDateString() === selDate.toDateString();
                                        const hasTask = taskDates.has(toDS(thisDate));
                                        return (
                                            <div key={d}
                                                className={`cs-cal-day ${isTod ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                                                onClick={() => pickDate(thisDate)}>
                                                <span>{d}</span>
                                                {hasTask && <div className="cs-cal-dot" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5. Jump to Today */}
                            {!isSelToday && (
                                <div className="cs-jump-row">
                                    <button className="cs-jump-btn" onClick={() => pickDate(new Date())}>
                                        <span className="material-icons-round" style={{ fontSize: 13 }}>today</span>
                                        Jump to Today
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right: Quest Briefing panel */}
                        <div className="cs-briefing">
                        <div className="cs-briefing-header">
                            <h3 className="cs-briefing-title">
                                {t('quest_briefing', gm)}
                                <span className="cs-briefing-date">
                                    // {selDate.getDate()} {selDate.toLocaleString('default', { month: 'short' })}
                                </span>
                            </h3>
                            <span className="cs-briefing-count">
                                {dateTasks.length} {t('task', gm)}{dateTasks.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {dateTasks.length > 0 ? (
                            <div className="cs-briefing-list">
                                {dateTasks.map((task, i) => {
                                    const icon = TASK_ICONS[i % TASK_ICONS.length];
                                    const taskSubs = task.subs || [];
                                    const subsDone = taskSubs.filter((s: any) => s.done).length;
                                    const isExp = expanded[task.$id];
                                    return (
                                        <div key={task.$id} className="cs-briefing-item">
                                            {/* 12. Task with action buttons */}
                                            <div className="cs-briefing-task" onClick={() => toggleExpand(task.$id)}>
                                                <div className="cs-briefing-icon" style={{ background: `linear-gradient(135deg, ${task.pColor}25, var(--g-04))`, border: `1px solid ${task.pColor}35` }}>
                                                    <span className="material-icons-round" style={{ color: task.pColor, fontSize: 18 }}>{icon}</span>
                                                </div>
                                                <div className="cs-briefing-info">
                                                    <h4 className={`cs-briefing-name ${task.done ? 'done' : ''}`}>{task.name}</h4>
                                                    <p className="cs-briefing-meta">
                                                        {task.pName}
                                                        {task.slot != null && ` • ${fmtHShort(task.slot)}`}
                                                        {task.slotEnd != null && task.slot != null && `→${fmtHShort(task.slotEnd)}`}
                                                        {taskSubs.length > 0 && ` • ${subsDone}/${taskSubs.length} subtasks`}
                                                        {task.done && <> • <span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2, color: '#22c55e' }}>check_circle</span>Done</>}
                                                    </p>
                                                </div>
                                                <div className="cs-briefing-actions">
                                                    <button className="cs-brief-btn" onClick={e => { e.stopPropagation(); setModal({ type: 'editTask', pid: task.pId, tid: task.$id }); }}>
                                                        <span className="material-icons-round">edit</span>
                                                    </button>
                                                    <button className="cs-brief-btn del" onClick={e => { e.stopPropagation(); handleDelete(task.$id); }}>
                                                        <span className="material-icons-round">close</span>
                                                    </button>
                                                    <button className={`cs-brief-check ${task.done ? 'checked' : ''}`}
                                                        onClick={e => { e.stopPropagation(); toggleTask(task.$id); }}>
                                                        {task.done && <span className="material-icons-round" style={{ fontSize: 14 }}>check</span>}
                                                    </button>
                                                </div>
                                                {/* 21. Loot/reward */}
                                                {showLoot && (
                                                    <div className="cs-briefing-loot">
                                                        <span className="text-gold">+{cs}{task.pMoney.toLocaleString()}</span>
                                                        <span className="cs-briefing-loot-label">{gm ? 'Reward' : 'Budget'}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 13/17. Expandable subtasks with toggles */}
                                            {taskSubs.length > 0 && (
                                                <div className="cs-subs-section">
                                                    <div className="cs-subs-header" onClick={() => toggleExpand(task.$id)}>
                                                        <span className={`material-icons-round cs-subs-chevron ${isExp ? 'open' : ''}`}>chevron_right</span>
                                                        <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--t-888)' }}>checklist</span>
                                                        <span className="cs-subs-count" style={{ color: subsDone === taskSubs.length ? '#4ade80' : 'var(--t-888)' }}>
                                                            {subsDone}/{taskSubs.length} Subtasks
                                                        </span>
                                                        {subsDone === taskSubs.length && taskSubs.length > 0 && <span style={{ fontSize: 9, color: '#4ade80' }}>✓</span>}
                                                    </div>
                                                    {isExp && (
                                                        <div className="cs-subs-list">
                                                            {taskSubs.map((sub: any) => (
                                                                <div key={sub.$id} className={`cs-sub-row ${sub.done ? 'done' : ''}`}>
                                                                    {editingSub === sub.$id ? (
                                                                        <input autoFocus className="cs-sub-edit"
                                                                            value={editSubName} onChange={e => setEditSubName(e.target.value)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onKeyDown={e => {
                                                                                e.stopPropagation();
                                                                                if (e.key === 'Enter' && editSubName.trim()) { updateSubtaskField(sub.$id, 'name', editSubName.trim()); setEditingSub(null); showToast('Subtask updated'); }
                                                                                else if (e.key === 'Escape') setEditingSub(null);
                                                                            }}
                                                                            onBlur={() => { if (editSubName.trim() && editSubName.trim() !== sub.name) { updateSubtaskField(sub.$id, 'name', editSubName.trim()); showToast('Subtask updated'); } setEditingSub(null); }}
                                                                        />
                                                                    ) : (
                                                                        <span className="cs-sub-name">{sub.name}</span>
                                                                    )}
                                                                    <button className="cs-sub-btn" onClick={e => { e.stopPropagation(); setEditingSub(sub.$id); setEditSubName(sub.name); }}>
                                                                        <span className="material-icons-round">edit</span>
                                                                    </button>
                                                                    <button className="cs-sub-btn del" onClick={e => {
                                                                        e.stopPropagation();
                                                                        if (profile?.confirmTaskDelete !== false) setConfirmDelete({ type: 'subtask', id: sub.$id, name: sub.name });
                                                                        else { removeSubtask(sub.$id); showToast('Subtask deleted'); }
                                                                    }}>
                                                                        <span className="material-icons-round">close</span>
                                                                    </button>
                                                                    <button className={`cs-sub-check ${sub.done ? 'checked' : ''}`}
                                                                        onClick={e => { e.stopPropagation(); toggleSubtask(sub.$id); }}>
                                                                        {sub.done && <span className="material-icons-round" style={{ fontSize: 10 }}>check</span>}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {/* 14. Inline subtask add input */}
                                                            <div className="cs-sub-add">
                                                                <input className="cs-sub-add-input"
                                                                    placeholder="+ Add subtask..."
                                                                    onClick={e => e.stopPropagation()}
                                                                    onKeyDown={e => {
                                                                        e.stopPropagation();
                                                                        const inp = e.target as HTMLInputElement;
                                                                        if (e.key === 'Enter' && inp.value.trim()) { addSubtask(task.$id, inp.value.trim()); inp.value = ''; showToast('Subtask added'); }
                                                                    }}
                                                                />
                                                                <button className="cs-sub-add-btn" onClick={e => {
                                                                    const inp = (e.target as HTMLElement).closest('.cs-sub-add')?.querySelector('input');
                                                                    if (inp && inp.value.trim()) { addSubtask(task.$id, inp.value.trim()); inp.value = ''; showToast('Subtask added'); }
                                                                }}>
                                                                    <span className="material-icons-round" style={{ fontSize: 12, color: 'var(--primary)' }}>add</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {/* Subtask add when no subtasks yet */}
                                            {taskSubs.length === 0 && isExp && (
                                                <div className="cs-subs-section">
                                                    <div className="cs-sub-add">
                                                        <input className="cs-sub-add-input"
                                                            placeholder="+ Add subtask..."
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={e => {
                                                                e.stopPropagation();
                                                                const inp = e.target as HTMLInputElement;
                                                                if (e.key === 'Enter' && inp.value.trim()) { addSubtask(task.$id, inp.value.trim()); inp.value = ''; showToast('Subtask added'); }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* 8. Empty state with add button */
                            <div className="cs-briefing-empty">
                                <span className="material-icons-round" style={{ fontSize: 32, color: 'var(--t-888)' }}>event_available</span>
                                <p>No {t('tasks', gm).toLowerCase()} scheduled for {isSelToday ? 'today' : selDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                <button className="cs-add-task-btn" onClick={() => setModal({ type: 'assignTask', preDate: selDateStr })}>
                                    <span className="material-icons-round" style={{ fontSize: 16 }}>add_task</span>
                                    {gm ? 'Add Quest' : 'Add Task'}
                                </button>
                            </div>
                        )}
                    </div>
                    </div>{/* close cs-cal-desktop-layout */}
                </>
            )}

            {/* ═══ Sheet Table (present in both views) ═══ */}
            <SheetView
                columns={columns} data={flatData}
                title={view === 'time'
                    ? (showAllTasks ? (gm ? 'All Quests' : 'All Tasks') : (gm ? 'Daily Quests' : "Today's Tasks"))
                    : (gm ? 'Strategic Map' : 'Schedule')
                }
                titleIcon={view === 'time' ? 'schedule' : 'calendar_today'}
                count={topTasks.length}
                onEdit={handleEdit} onRowClick={handleRowClick}
                onToggle={handleToggle} onDelete={handleDelete}
                onInlineAdd={handleInlineAdd}
                hideBottomAdd
                selectable showActions hierarchical
                gameMode={gm} isEdu={isEdu}
                emptyMessage={view === 'time' && !showAllTasks
                    ? (gm ? 'No quests for this day' : 'No tasks for this day')
                    : (gm ? 'No quests on the map' : 'No tasks scheduled')
                }
                emptyIcon="event_available"
                compact={profile?.compactMode ?? false}
                groupBy={isTimeView ? undefined : 'dateSort'}
                groupHeader={isTimeView ? undefined : (gv: string, gr: any[]) => {
                    if (gv === '9999-99-99') return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#a855f7' }}>
                            <span className="material-icons-round" style={{ fontSize: 12 }}>inventory_2</span>
                            Backlog ({gr.filter(r => (r._depth || 0) === 0).length})
                        </span>
                    );
                    const d = new Date(gv + 'T00:00:00');
                    const isTod = d.toDateString() === todayStr;
                    const isSel = d.toDateString() === selDate.toDateString();
                    const lbl = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                    const topCount = gr.filter(r => (r._depth || 0) === 0 && r._rowType !== 'empty-day').length;
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => pickDate(d)}>
                            {(isTod || isSel) && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />}
                            {lbl}
                            {isTod && <span style={{ color: 'var(--primary)', fontSize: 9, fontWeight: 700 }}>— Today</span>}
                            {topCount > 0 && <span style={{ opacity: 0.5, fontSize: 9 }}>({topCount})</span>}
                        </span>
                    );
                }}
                footer={
                    <div className="cs-footer">
                        <span>{topTasks.length} total</span>
                        <span style={{ color: '#4ade80' }}>✓ {doneTasks.length} done</span>
                        <span>{sched.length} scheduled</span>
                        <span style={{ color: '#a855f7' }}>
                            <span className="material-icons-round" style={{ fontSize: 10, verticalAlign: 'middle', marginRight: 2 }}>inventory_2</span>
                            {backlog.length} backlog
                        </span>
                    </div>
                }
            />

            {/* ═══ 18. Confirm Delete Portal ═══ */}
            {confirmDelete && typeof window !== 'undefined' && createPortal(
                <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="confirm-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons-round" style={{ fontSize: 18, color: '#f43f5e' }}>warning</span>
                            </div>
                            <div>
                                <h3 style={{ color: 'var(--t-fff)', fontWeight: 700 }}>Delete {confirmDelete.type === 'task' ? t('task', gm) : 'Subtask'}?</h3>
                                <p className="confirm-sub">This cannot be undone</p>
                            </div>
                        </div>
                        <p className="confirm-name">&ldquo;{confirmDelete.name}&rdquo;</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="confirm-delete" onClick={async () => {
                                if (confirmDelete.type === 'task') {
                                    await removeTask(confirmDelete.id);
                                    showToast(gm ? 'Quest deleted' : 'Task deleted');
                                } else {
                                    await removeSubtask(confirmDelete.id);
                                    showToast('Subtask deleted');
                                }
                                setConfirmDelete(null);
                            }}>
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
