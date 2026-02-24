/* ===== BoardSheetView — 3-Level Inline Everything ===== */
'use client';
import { useMemo } from 'react';
import SheetView, { type SheetColumn } from '@/components/SheetView';
import { useData } from '@/context/DataContext';
import { currSym, STATUS_OPTS, STATUS_LABELS } from '@/lib/constants';
import { t } from '@/lib/terms';

export default function BoardSheetView() {
    const { enrichedProjects, profile, setModal, toggleTask, toggleSubtask, addSubtask, addTask, addProject, updateProjectField, updateTaskField, updateSubtaskField, removeSubtask, removeTask, showToast } = useData();
    const gm = profile?.gameMode ?? true;
    const isEdu = profile?.theme === 'eduplex';
    const showLoot = profile?.showLoot ?? false;
    const cs = currSym(profile?.currency || 'USD');

    const flatData = useMemo(() => {
        const all: any[] = [];
        [...enrichedProjects].sort((a, b) => a.priority - b.priority).forEach(p => {
            const orig = p.tasks.filter((tk: any) => !tk.clonedFrom);
            const total = orig.length;
            const doneCount = orig.filter((tk: any) => tk.done).length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            all.push({
                $id: p.$id, name: p.name, color: p.color || '#FF4500', priority: p.priority,
                total, doneCount, pending: total - doneCount, pct, money: p.money || 0,
                _depth: 0, _hasChildren: orig.length > 0, _rowType: 'project',
            });
            orig.forEach((tk: any) => {
                const subs = tk.subtasks || [];
                all.push({
                    $id: tk.$id, name: tk.name, done: tk.done, date: tk.date,
                    color: p.color || '#FF4500', priority: tk.priority,
                    status: tk.status || 'default',
                    total: subs.length, doneCount: subs.filter((s: any) => s.done).length,
                    pending: subs.filter((s: any) => !s.done).length,
                    pct: subs.length > 0 ? Math.round((subs.filter((s: any) => s.done).length / subs.length) * 100) : 0,
                    money: 0, pId: p.$id,
                    _depth: 1, _parentId: p.$id, _hasChildren: subs.length > 0, _rowType: 'task',
                });
                subs.forEach((sub: any) => {
                    all.push({
                        $id: sub.$id, name: sub.name, done: sub.done,
                        color: p.color || '#FF4500', priority: 0,
                        total: 0, doneCount: 0, pending: 0, pct: 0, money: 0,
                        date: '', pId: p.$id, _taskId: tk.$id,
                        _depth: 2, _parentId: tk.$id, _hasChildren: false, _rowType: 'subtask',
                    });
                });
            });
        });
        return all;
    }, [enrichedProjects]);

    const priOpts = [1, 2, 3, 4].map(n => ({ value: String(n), label: `P${n}` }));

    const columns: SheetColumn[] = [
        {
            key: 'priority', label: '#', width: '5%', sortable: true, align: 'center',
            editable: true, editType: 'select', editOptions: priOpts,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                const clr = row.color || '#FF4500';
                return <span className="sv-pri" style={{ background: `${clr}15`, color: clr, border: `1px solid ${clr}30` }}>{row._rowType === 'project' ? 'P' : '#'}{v}</span>;
            },
        },
        {
            key: 'name', label: 'Name', width: '24%', minWidth: 130,
            sortable: true, editable: true, editType: 'text',
            render: (v: string, row: any) => {
                const clr = row.color || '#FF4500';
                if (row._rowType === 'project') return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: 'var(--t-fff)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: clr, flexShrink: 0, boxShadow: `0 0 8px ${clr}` }} />{v}
                    </span>
                );
                if (row._rowType === 'subtask') return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: clr, opacity: 0.4, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: row.done ? 'var(--t-555)' : 'var(--t-bbb)', textDecoration: row.done ? 'line-through' : 'none' }}>{v}</span>
                    </span>
                );
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className="material-icons-round" style={{ fontSize: 12, color: clr, opacity: 0.7 }}>assignment</span>
                        <span style={{ fontWeight: 600, fontSize: 12, color: row.done ? 'var(--t-555)' : 'var(--t-eee)', textDecoration: row.done ? 'line-through' : 'none' }}>{v}</span>
                    </span>
                );
            },
        },
        {
            key: 'total', label: gm ? t('tasks', gm) : 'Items', width: '6%', sortable: true, align: 'center',
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                if (row._rowType === 'task' && v === 0) return <span style={{ opacity: 0.15 }}>0</span>;
                return <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>;
            },
        },
        {
            key: 'doneCount', label: 'Status', width: '8%', sortable: true, align: 'center',
            editable: true, editType: 'select', editOptions: STATUS_OPTS,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span className={`sv-status ${row.done ? 'done' : 'todo'}`}><span className="dot" />{row.done ? '✓' : '○'}</span>;
                if (row._rowType === 'task') {
                    const st = row.done ? 'done' : (row.status || 'default');
                    const labels = STATUS_LABELS;
                    return <span className={`sv-status ${st}`}><span className="dot" />{labels[st] || 'Default'}</span>;
                }
                return <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 13 }}>{v}</span>;
            },
        },
        {
            key: 'pending', label: 'Pending', width: '7%', sortable: true, align: 'center',
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                const clr = row.color || '#FF4500';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ fontSize: 11, color: clr }}>pending_actions</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>
                    </div>
                );
            },
        },
        {
            key: 'pct', label: 'Progress', width: '18%', sortable: true,
            render: (v: number, row: any) => {
                if (row._rowType === 'subtask') return <span style={{ opacity: 0.1 }}>—</span>;
                if (row._rowType === 'task' && row.total === 0) return <span style={{ opacity: 0.15 }}>—</span>;
                const clr = row.color || '#FF4500';
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                        <div style={{ flex: 1, height: row._rowType === 'project' ? 5 : 3, borderRadius: 3, overflow: 'hidden', background: 'var(--g-05)', border: '1px solid var(--g-06)' }}>
                            <div style={{ width: `${v}%`, height: '100%', background: `linear-gradient(to right,${clr}80,${clr})`, transition: 'width .5s ease' }} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, minWidth: 28, textAlign: 'right', letterSpacing: 1, color: v === 100 ? '#4ade80' : 'var(--t-fff)' }}>{v}%</span>
                    </div>
                );
            },
        },
        ...(showLoot ? [{
            key: 'money', label: gm ? 'Bounty' : 'Budget', width: '9%', sortable: true, align: 'right' as const,
            editable: true, editType: 'number' as const,
            render: (v: number, row: any) => {
                if (row._rowType !== 'project') return <span style={{ opacity: 0.1 }}>—</span>;
                return <span className={gm ? 'text-gold' : ''} style={{ fontWeight: 700, fontSize: 14 }}>{cs}{(v || 0).toLocaleString()}</span>;
            },
        }] : []),
    ];

    const handleEdit = (id: string, field: string, value: any) => {
        const row = flatData.find(r => r.$id === id);
        if (!row) return;
        if (row._rowType === 'subtask') { updateSubtaskField(id, field, value); showToast('Subtask updated'); return; }
        if (row._rowType === 'project') {
            if (field === 'priority') { updateProjectField(id, 'priority', parseInt(value) || 1); showToast('Priority updated'); return; }
            if (field === 'money') { updateProjectField(id, 'money', parseFloat(value) || 0); showToast('Budget updated'); return; }
            updateProjectField(id, field, value); showToast(`${t('project', gm)} updated`); return;
        }
        if (field === 'doneCount') {
            /* doneCount column edits are status changes for tasks */
            if (value === 'done') { if (!row.done) toggleTask(id); }
            else { if (row.done) toggleTask(id); updateTaskField(id, 'status', value); }
            showToast('Status updated'); return;
        }
        if (field === 'priority') { updateTaskField(id, 'priority', parseInt(value) || 1); showToast('Priority updated'); return; }
        updateTaskField(id, field, value); showToast(`${t('task', gm)} updated`);
    };

    const handleToggle = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (row?._rowType === 'subtask') toggleSubtask(id);
        else if (row?._rowType === 'task') toggleTask(id);
    };

    const handleRowClick = (row: any) => {
        if (row._rowType === 'project') setModal({ type: 'projectDetail', pid: row.$id });
        else if (row._rowType === 'task') setModal({ type: 'editTask', pid: row.pId, tid: row.$id });
        else if (row._rowType === 'subtask') setModal({ type: 'editTask', pid: row.pId, tid: row._taskId });
    };

    const handleDelete = (id: string) => {
        const row = flatData.find(r => r.$id === id);
        if (!row) return;
        if (row._rowType === 'project') setModal({ type: 'projectDetail', pid: id });
        else if (row._rowType === 'subtask') {
            removeSubtask(id);
            showToast('Subtask deleted');
        } else if (row._rowType === 'task') {
            removeTask(id);
            showToast(`${t('task', gm)} deleted`);
        }
    };

    /* Inline add */
    const handleInlineAdd = (name: string, parentId: string | null, depth: number) => {
        if (depth === 1 && parentId) {
            /* Adding task to project */
            addTask(parentId, name, 1, null, null, null);
            showToast(`${t('task', gm)} added`);
        } else if (depth === 2 && parentId) {
            /* Adding subtask to task */
            addSubtask(parentId, name);
            showToast('Subtask added');
        }
    };

    /* Inline top-level project add */
    const handleInlineAddTop = async (name: string) => {
        const colors = ['#FF4500', '#3b82f6', '#fbbf24', '#a78bfa', '#10b981', '#f43f5e', '#06b6d4'];
        const nextPri = enrichedProjects.length + 1;
        const color = colors[(enrichedProjects.length) % colors.length];
        await addProject(name, 0, nextPri, color);
        showToast(`${t('project', gm)} created`);
    };

    const projects = flatData.filter(r => r._depth === 0);
    const totalT = projects.reduce((s, r) => s + r.total, 0);
    const totalD = projects.reduce((s, r) => s + r.doneCount, 0);
    const avgPct = projects.length > 0 ? Math.round(projects.reduce((s, r) => s + r.pct, 0) / projects.length) : 0;

    return (
        <SheetView
            columns={columns} data={flatData} doneKey="done"
            title={t('projects', gm)} titleIcon="folder" count={projects.length}
            onEdit={handleEdit} onRowClick={handleRowClick} onToggle={handleToggle}
            onDelete={handleDelete}
            onInlineAdd={handleInlineAdd}
            onInlineAddTop={handleInlineAddTop}
            addRowLabel={gm ? 'New Guild' : 'New Project'}
            selectable showActions hierarchical
            gameMode={gm} isEdu={isEdu}
            emptyMessage={gm ? 'No guilds established' : 'No projects'} emptyIcon="folder_open"
            compact={profile?.compactMode ?? false}
            footer={
                <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{projects.length} {t('projects', gm)}</span>
                    <span>{totalD}/{totalT} {t('tasks', gm)} · {avgPct}%</span>
                    <span>{totalT - totalD} Pending</span>
                </div>
            }
        />
    );
}
