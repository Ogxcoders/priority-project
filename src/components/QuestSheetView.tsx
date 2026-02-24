/* ===== QuestSheetView — Inline Everything ===== */
'use client';
import { useMemo } from 'react';
import SheetView, { type SheetColumn } from '@/components/SheetView';
import { useData } from '@/context/DataContext';
import { currSym, STATUS_OPTS, STATUS_LABELS } from '@/lib/constants';
import { t } from '@/lib/terms';

export default function QuestSheetView() {
    const { enrichedProjects, profile, toggleTask, toggleSubtask, updateTaskField, updateSubtaskField, addSubtask, addTask, removeSubtask, setModal, showToast } = useData();
    const gm = profile?.gameMode ?? true;
    const isEdu = profile?.theme === 'eduplex';
    const showLoot = profile?.showLoot ?? false;
    const cs = currSym(profile?.currency || 'USD');
    const showPri = profile?.showPriority ?? true;

    const flatData = useMemo(() => {
        const all: any[] = [];
        [...enrichedProjects].sort((a, b) => a.priority - b.priority).forEach(p => {
            p.tasks.filter((tk: any) => !tk.clonedFrom).forEach((tk: any) => {
                const subs = tk.subtasks || [];
                all.push({
                    ...tk, pName: p.name, pColor: p.color || '#FF4500',
                    pMoney: p.money || 0, pId: p.$id,
                    status: tk.status || 'default',
                    subsCount: subs.length, subsDone: subs.filter((s: any) => s.done).length,
                    _depth: 0, _hasChildren: subs.length > 0, _rowType: 'task',
                });
                subs.forEach((s: any) => {
                    all.push({
                        $id: s.$id, name: s.name, done: s.done,
                        pName: '', pColor: p.color || '#FF4500', pMoney: 0, pId: p.$id,
                        priority: 0, date: '', slot: null, subsCount: 0, subsDone: 0,
                        _depth: 1, _parentId: tk.$id, _hasChildren: false, _rowType: 'subtask', _taskId: tk.$id,
                    });
                });
            });
        });
        return all;
    }, [enrichedProjects]);

    const fmtSlot = (s: number) => `${s % 12 || 12}:00 ${s >= 12 ? 'PM' : 'AM'}`;
    const priOpts = [1, 2, 3, 4].map(n => ({ value: String(n), label: `P${n}` }));
    const slotOpts = Array.from({ length: 19 }, (_, i) => i + 5).map(h => ({ value: String(h), label: fmtSlot(h) }));

    const columns: SheetColumn[] = [
        {
            key: 'name', label: t('task', gm) + ' Name', width: '25%', minWidth: 130,
            sortable: true, editable: true, editType: 'text',
            render: (v: string, row: any) => {
                if (row._rowType === 'subtask') {
                    const clr = row.pColor || '#FF4500';
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: clr, flexShrink: 0, opacity: 0.4 }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: row.done ? 'var(--t-555)' : 'var(--t-bbb)', textDecoration: row.done ? 'line-through' : 'none' }}>{v || '—'}</span>
                        </span>
                    );
                }
                return <span style={{ fontWeight: 600, color: row.done ? 'var(--t-555)' : 'var(--t-eee)', fontSize: 13 }}>{v || '—'}</span>;
            },
        },
        {
            key: 'pName', label: t('project', gm), width: '13%', sortable: true, filterable: true,
            render: (v: string, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.pColor, flexShrink: 0, boxShadow: `0 0 6px ${row.pColor}` }} />
                        <span style={{ fontSize: 11, color: 'var(--t-bbb)' }}>{v}</span>
                    </span>
                );
            },
        },
        ...(showPri ? [{
            key: 'priority', label: t('priority', gm), width: '7%', sortable: true, align: 'center' as const, filterable: true,
            filterOptions: ['1', '2', '3', '4'],
            editable: true, editType: 'select' as const, editOptions: priOpts,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                const clr = row.pColor || '#FF4500';
                return <span className="sv-pri" style={{ background: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>#{v}</span>;
            },
        }] : []),
        {
            key: 'status', label: 'Status', width: '9%', sortable: true, align: 'center' as const,
            editable: true, editType: 'select' as const, editOptions: STATUS_OPTS,
            render: (_v: string, row: any) => {
                if (row._rowType === 'subtask') return <span className={`sv-status ${row.done ? 'done' : 'todo'}`}><span className="dot" />{row.done ? '✓' : '○'}</span>;
                const st = row.done ? 'done' : (row.status || 'default');
                const labels = STATUS_LABELS;
                return <span className={`sv-status ${st}`}><span className="dot" />{labels[st] || 'Default'}</span>;
            },
        },
        {
            key: 'date', label: 'Date', width: '10%', sortable: true, editable: true, editType: 'date',
            render: (v: string, row: any) => {
                if (row._rowType === 'subtask' || !v) return <span style={{ opacity: 0.15 }}>—</span>;
                const d = new Date(v + 'T00:00:00');
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: isToday ? 'var(--primary)' : 'var(--t-555)', fontWeight: isToday ? 700 : 500 }}>
                        <span className="material-icons-round" style={{ fontSize: 10 }}>event</span>
                        {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                );
            },
        },
        {
            key: 'slot', label: 'Time', width: '8%', sortable: true, align: 'center' as const,
            editable: true, editType: 'select' as const, editOptions: slotOpts,
            render: (v: number | null, row: any) => {
                if (row._rowType === 'subtask' || v == null) return <span style={{ opacity: 0.15 }}>—</span>;
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, color: 'var(--t-555)' }}>
                        <span className="material-icons-round" style={{ fontSize: 10 }}>schedule</span>
                        {fmtSlot(v)}{row.slotEnd != null ? <><span style={{ margin: '0 1px' }}>→</span>{fmtSlot(row.slotEnd)}</> : ''}
                    </span>
                );
            },
        },
        {
            key: 'subsCount', label: 'Subs', width: '6%', sortable: true, align: 'center' as const,
            expandOnClick: true,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                return v === 0 ? <span style={{ opacity: 0.15, cursor: 'default' }}>0</span> : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: row.subsDone === v ? '#4ade80' : 'var(--t-666)', cursor: 'pointer' }}>
                        <span className="material-icons-round" style={{ fontSize: 12, transition: 'transform .15s' }}>expand_more</span>
                        <span className="material-icons-round" style={{ fontSize: 10 }}>checklist</span>{row.subsDone}/{v}
                    </span>
                );
            },
        },
        ...(showLoot ? [{
            key: 'pMoney', label: gm ? t('money', gm) : 'Budget', width: '8%', sortable: true, align: 'right' as const,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                return <span className={gm ? 'text-gold' : ''} style={{ fontWeight: 700, fontSize: 13 }}>{cs}{(v || 0).toLocaleString()}</span>;
            },
        }] : []),
    ];

    /* Edit — routes to correct update function */
    const handleEdit = (id: string, field: string, value: any) => {
        const row = flatData.find(r => r.$id === id);
        if (!row) return;
        if (row._rowType === 'subtask') {
            updateSubtaskField(id, field, value);
            showToast('Subtask updated');
            return;
        }
        if (field === 'status') {
            if (value === 'done') { if (!row.done) toggleTask(id); }
            else { if (row.done) toggleTask(id); updateTaskField(id, 'status', value); }
            showToast('Status updated'); return;
        }
        if (field === 'slot') { updateTaskField(id, 'slot', parseInt(value) || null); showToast('Time updated'); return; }
        if (field === 'priority') { updateTaskField(id, 'priority', parseInt(value) || 1); showToast('Priority updated'); return; }
        if (field === 'date') { updateTaskField(id, 'date', value || null); showToast('Date updated'); return; }
        updateTaskField(id, field, value);
        showToast(`${t('task', gm)} updated`);
    };

    const handleToggle = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (row?._rowType === 'subtask') toggleSubtask(id);
        else toggleTask(id);
    };

    const handleRowClick = (row: any) => {
        if (row._rowType === 'subtask') setModal({ type: 'editTask', pid: row.pId, tid: row._taskId });
        else setModal({ type: 'editTask', pid: row.pId, tid: row.$id });
    };

    const handleDelete = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (!row) return;
        if (row._rowType === 'subtask') {
            removeSubtask(id);
            showToast('Subtask deleted');
        } else {
            setModal({ type: 'editTask', pid: row.pId, tid: id });
        }
    };

    /* Inline add — subtasks under tasks */
    const handleInlineAdd = (name: string, parentId: string | null, depth: number) => {
        if (depth === 1 && parentId) {
            addSubtask(parentId, name);
            showToast('Subtask added');
        } else if (depth === 0 && !parentId) {
            // Top-level task add — use first project as default
            const firstProject = enrichedProjects[0];
            if (firstProject) {
                addTask(firstProject.$id, name, 4, null, null, null);
                showToast(`${t('task', gm)} added to ${firstProject.name}`);
            } else {
                showToast('Create a project first!');
            }
        }
    };

    const topTasks = flatData.filter(r => r._depth === 0);
    const done = topTasks.filter(r => r.done).length;

    return (
        <SheetView
            columns={columns} data={flatData}
            title={gm ? 'Active Quests' : 'Active Tasks'} titleIcon="assignment" count={topTasks.length}
            onEdit={handleEdit} onRowClick={handleRowClick} onToggle={handleToggle}
            onDelete={handleDelete}
            onInlineAdd={handleInlineAdd}
            onInlineAddTop={(name) => {
                const firstProject = enrichedProjects[0];
                if (firstProject) {
                    addTask(firstProject.$id, name, 4, null, null, null);
                    showToast(`${t('task', gm)} added`);
                } else {
                    showToast('Create a project first!');
                    setModal({ type: 'addProject' });
                }
            }}
            addRowLabel={gm ? 'New Quest' : 'New Task'}
            selectable showActions hierarchical
            gameMode={gm} isEdu={isEdu}
            emptyMessage={t('empty', gm)} emptyIcon="assignment"
            compact={profile?.compactMode ?? false}
            footer={
                <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{done}/{topTasks.length} {t('tasks', gm)}</span>
                    <span style={{ color: '#4ade80' }}>✓ {done} {gm ? 'Cleared' : 'Done'}</span>
                    <span style={{ color: 'var(--primary)' }}>{topTasks.length - done} Pending</span>
                </div>
            }
        />
    );
}
