/* ===== SheetView — Custom Notion-like UI ===== */
'use client';
import './sheet-view.css';
import {
    useState, useCallback, useRef, useEffect, useMemo, Fragment,
    type ReactNode,
} from 'react';

type SortItem = { id: string; desc: boolean };

/* ═══════════════════════════════════════════════════════
   Types — kept compatible with page-specific sheet views
   ═══════════════════════════════════════════════════════ */
export interface SheetColumn {
    key: string;
    label: string;
    width?: string;
    minWidth?: number;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    render?: (value: any, row: any) => ReactNode;
    editable?: boolean;
    editType?: 'text' | 'number' | 'select' | 'date';
    editOptions?: { value: string; label: string; color?: string }[];
    hidden?: boolean;
    filterable?: boolean;
    filterOptions?: string[];
    expandOnClick?: boolean;
}

export interface SheetProps {
    columns: SheetColumn[];
    data: any[];
    idKey?: string;
    onEdit?: (id: string, field: string, value: any) => void;
    onRowClick?: (row: any) => void;
    onToggle?: (id: string) => void;
    onDelete?: (id: string) => void;
    onInlineAdd?: (name: string, parentId: string | null, depth: number) => void;
    onAddTop?: () => void;
    onInlineAddTop?: (name: string) => void;
    addRowLabel?: string;
    selectable?: boolean;
    gameMode?: boolean;
    isEdu?: boolean;
    emptyMessage?: string;
    emptyIcon?: string;
    footer?: ReactNode;
    groupBy?: string;
    groupHeader?: (groupValue: string, rows: any[]) => ReactNode;
    compact?: boolean;
    doneKey?: string;
    title?: string;
    titleIcon?: string;
    count?: number;
    showActions?: boolean;
    hierarchical?: boolean;
    hideBottomAdd?: boolean;
}

/* ═══ Inline cell select dropdown ═══ */
function CellSelect({ options, value, onSelect, onClose }: {
    options: { value: string; label: string; color?: string }[];
    value: string; onSelect: (v: string) => void; onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, [onClose]);
    return (
        <div className="sv-cell-select" ref={ref}>
            {options.map(o => (
                <button key={o.value} className={`sv-cell-opt ${value === o.value ? 'active' : ''}`}
                    onClick={e => { e.stopPropagation(); onSelect(o.value); }}>
                    {o.color && <span className="sv-cell-opt-dot" style={{ background: o.color }} />}
                    <span className="sv-cell-opt-label">{o.label}</span>
                    {value === o.value && <span className="material-icons-round sv-cell-opt-check">check</span>}
                </button>
            ))}
        </div>
    );
}

/* ═══ Main SheetView ═══ */
export default function SheetView({
    columns: rawColumns, data, idKey = '$id',
    onEdit, onRowClick, onToggle, onDelete,
    onInlineAdd, onAddTop, onInlineAddTop, addRowLabel = 'Add item',
    selectable = false, gameMode = true, isEdu = false,
    emptyMessage = 'No data', emptyIcon = 'table_chart',
    footer, groupBy, groupHeader,
    compact = false, doneKey = 'done',
    title, titleIcon, count,
    showActions = false, hierarchical = false, hideBottomAdd = false,
}: SheetProps) {
    const cols = useMemo(() => rawColumns.filter(c => !c.hidden), [rawColumns]);

    /* ── Sort state ── */
    const [sorting, setSorting] = useState<SortItem[]>([]);

    /* ── Local UI state ── */
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [editCell, setEditCell] = useState<{ id: string; key: string } | null>(null);
    const [editVal, setEditVal] = useState('');
    const [addingAt, setAddingAt] = useState<string | null>(null);
    const [addingDepth, setAddingDepth] = useState(0);
    const [addingName, setAddingName] = useState('');
    const [colWidths, setColWidths] = useState<Record<string, number>>({});
    const [filters, setFilters] = useState<Record<string, string>>({});

    const editRef = useRef<HTMLInputElement>(null);
    const addRef = useRef<HTMLInputElement>(null);
    const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(null);
    const tableRef = useRef<HTMLTableElement>(null);
    const tableWrapRef = useRef<HTMLDivElement>(null);

    /* ── Compute initial column widths from header text ── */
    const initWidths = useMemo(() => {
        if (typeof document === 'undefined') return {} as Record<string, number>;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return {} as Record<string, number>;
        ctx.font = '600 11px Inter, system-ui, -apple-system, sans-serif';
        const widths: Record<string, number> = {};
        cols.forEach(col => {
            const textW = ctx.measureText(col.label.toUpperCase()).width;
            // letter-spacing ~0.5px per char + padding (12*2) + sort icon (20) + resize handle (12)
            const headerW = Math.ceil(textW * 1.06 + col.label.length * 0.5) + 56;
            widths[col.key] = Math.max(headerW, col.minWidth || 80);
        });
        return widths;
    }, [cols]);

    /* ── Helper: effective width for a column ── */
    const getW = useCallback((key: string) => colWidths[key] || initWidths[key] || 120, [colWidths, initWidths]);

    /* ── Reset widths when columns change (e.g. view switch) ── */
    const colKeysRef = useRef('');
    useEffect(() => {
        const k = cols.map(c => c.key).join(',');
        if (colKeysRef.current && colKeysRef.current !== k) setColWidths({});
        colKeysRef.current = k;
    }, [cols]);

    useEffect(() => { if (editCell) setTimeout(() => editRef.current?.focus(), 30); }, [editCell]);
    useEffect(() => { if (addingAt) setTimeout(() => addRef.current?.focus(), 30); }, [addingAt]);

    /* ── Auto-expand column when editing ── */
    useEffect(() => {
        if (!editCell) return;
        const w = colWidths[editCell.key] || initWidths[editCell.key] || 120;
        const minEditW = 160;
        if (w < minEditW) setColWidths(p => ({ ...p, [editCell.key]: minEditW }));
    }, [editCell, initWidths]);

    /* ── Auto-expand name column when inline-adding ── */
    useEffect(() => {
        if (!addingAt) return;
        const nameKey = cols[0]?.key;
        if (!nameKey) return;
        const w = colWidths[nameKey] || initWidths[nameKey] || 120;
        if (w < 200) setColWidths(p => ({ ...p, [nameKey]: 200 }));
    }, [addingAt, cols, initWidths]);

    /* ── Shift+scroll → horizontal scroll ── */
    useEffect(() => {
        const wrap = tableWrapRef.current;
        if (!wrap) return;
        const onWheel = (e: WheelEvent) => {
            if (e.shiftKey && wrap.scrollWidth > wrap.clientWidth) {
                e.preventDefault();
                wrap.scrollLeft += e.deltaY || e.deltaX;
            }
        };
        wrap.addEventListener('wheel', onWheel, { passive: false });
        return () => wrap.removeEventListener('wheel', onWheel);
    }, []);

    /* ── Hierarchy-safe data processing ── */
    const processed = useMemo(() => {
        let result = [...data];
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (hierarchical) {
                const topIds = new Set<string>();
                result.filter(r => (r._depth || 0) === 0 && String(r[key]) === val).forEach(r => topIds.add(r[idKey]));
                result = result.filter(r => (r._depth || 0) === 0 ? topIds.has(r[idKey]) : hasAnc(r, result, topIds, idKey));
            } else {
                result = result.filter(r => String(r[key]) === val);
            }
        });
        return result;
    }, [data, filters, hierarchical, idKey]);

    /* ── Sort helper ── */
    const sortCompare = useCallback((a: any, b: any, key: string, dir: 'asc' | 'desc') => {
        let av = a[key], bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
        if (typeof av === 'number') return dir === 'asc' ? av - bv : bv - av;
        return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    }, []);

    const sortedData = useMemo(() => {
        if (sorting.length === 0) return processed;
        const { id: sKey, desc: isDesc } = sorting[0];
        const dir = isDesc ? 'desc' : 'asc';
        if (hierarchical) {
            const grps: { parent: any; children: any[] }[] = [];
            let cur: any = null, ch: any[] = [];
            for (const r of processed) {
                if ((r._depth || 0) === 0) {
                    if (cur) grps.push({ parent: cur, children: ch });
                    cur = r; ch = [];
                } else { ch.push(r); }
            }
            if (cur) grps.push({ parent: cur, children: ch });
            grps.sort((a, b) => sortCompare(a.parent, b.parent, sKey, dir));
            const out: any[] = [];
            grps.forEach(g => { out.push(g.parent); g.children.sort((a, b) => sortCompare(a, b, sKey, dir)); out.push(...g.children); });
            return out;
        }
        return [...processed].sort((a, b) => sortCompare(a, b, sKey, dir));
    }, [processed, sorting, hierarchical, sortCompare]);

    /* ── Visibility (expand/collapse) ── */
    const visibleRows = useMemo(() => {
        if (!hierarchical) return sortedData;
        const vis: any[] = [];
        const exp = new Set<string>();
        for (const r of sortedData) {
            const d = r._depth || 0;
            if (d === 0) {
                vis.push(r);
                if (expandedRows[r[idKey]]) exp.add(r[idKey]);
            } else if (r._parentId && exp.has(r._parentId)) {
                vis.push(r);
                if (expandedRows[r[idKey]]) exp.add(r[idKey]);
            }
        }
        return vis;
    }, [sortedData, expandedRows, hierarchical, idKey]);

    /* ── Grouping ── */
    type G = { key: string; rows: any[] };
    const groups: G[] = useMemo(() => {
        if (!groupBy) return [{ key: '_', rows: visibleRows }];
        const map: Record<string, any[]> = {}; const order: string[] = [];
        visibleRows.forEach(r => { const g = String(r[groupBy] ?? '—'); if (!map[g]) { map[g] = []; order.push(g); } map[g].push(r); });
        return order.map(k => ({ key: k, rows: map[k] }));
    }, [visibleRows, groupBy]);

    /* ── Edit helpers ── */
    const startEdit = (id: string, col: SheetColumn, val: any) => {
        if (!col.editable || !onEdit) return;
        setEditCell({ id, key: col.key }); setEditVal(val != null ? String(val) : '');
    };
    const commitEdit = () => {
        if (editCell && onEdit) {
            const col = cols.find(c => c.key === editCell.key);
            onEdit(editCell.id, editCell.key, col?.editType === 'number' ? (parseFloat(editVal) || 0) : editVal);
        }
        setEditCell(null);
    };
    const commitSelect = (val: string) => { if (editCell && onEdit) onEdit(editCell.id, editCell.key, val); setEditCell(null); };

    /* ── Inline add helpers ── */
    const startAddingChild = (parentId: string, parentDepth: number) => {
        setAddingAt(parentId); setAddingDepth(parentDepth + 1); setAddingName('');
        if (!expandedRows[parentId]) setExpandedRows(p => ({ ...p, [parentId]: true }));
    };

    const submitAdd = () => {
        const trimmed = addingName.trim();
        if (!trimmed) return;
        if (addingAt === '__top__' || addingAt === '__bottom__') {
            if (onInlineAddTop) onInlineAddTop(trimmed);
            else if (onInlineAdd) onInlineAdd(trimmed, null, 0);
        } else if (onInlineAdd) {
            onInlineAdd(trimmed, addingAt, addingDepth);
        }
        setAddingName('');
        setTimeout(() => addRef.current?.focus(), 30);
    };
    const cancelAdd = () => { setAddingAt(null); setAddingName(''); };

    /* ── Column resize — drag ── */
    const onResizeStart = (e: React.MouseEvent | React.TouchEvent, key: string) => {
        e.preventDefault(); e.stopPropagation();
        const th = (e.target as HTMLElement).closest('th');
        const startW = th?.offsetWidth || 100;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        resizeRef.current = { key, startX: clientX, startW };

        const onMove = (me: MouseEvent | TouchEvent) => {
            if (!resizeRef.current) return;
            const cx = 'touches' in me ? me.touches[0].clientX : (me as MouseEvent).clientX;
            const ref = resizeRef.current;
            setColWidths(p => ({ ...p, [key]: Math.max(40, ref.startW + (cx - ref.startX)) }));
        };
        const onUp = () => {
            resizeRef.current = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onUp);
            document.body.style.cursor = '';
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onUp);
        document.body.style.cursor = 'col-resize';
    };

    /* ── Auto-resize column ── */
    const autoResizeCol = (key: string) => {
        if (!tableRef.current) return;
        const ci = cols.findIndex(c => c.key === key);
        if (ci === -1) return;
        const offset = (selectable ? 1 : 0) + (hasExpand ? 1 : 0);
        const cellIdx = offset + ci;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let maxW = 50;
        const headerRow = tableRef.current.querySelector('thead tr');
        if (headerRow) {
            const th = (headerRow as HTMLTableRowElement).cells?.[cellIdx];
            if (th) {
                const s = getComputedStyle(th);
                ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
                maxW = Math.max(maxW, ctx.measureText(th.textContent || '').width + 48);
            }
        }
        tableRef.current.querySelectorAll('tbody tr').forEach(tr => {
            const td = (tr as HTMLTableRowElement).cells?.[cellIdx];
            if (td) {
                const s = getComputedStyle(td);
                ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
                maxW = Math.max(maxW, ctx.measureText(td.innerText || td.textContent || '').width + 40);
            }
        });
        const col = cols[ci];
        const min = col.minWidth || 50;
        setColWidths(p => ({ ...p, [key]: Math.min(Math.max(maxW, min), 800) }));
    };

    const hasExpand = hierarchical && data.some(r => r._hasChildren);
    const totalCols = cols.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0) + (showActions ? 1 : 0);
    const filterableCols = cols.filter(c => c.filterable);
    const hasActiveFilters = Object.values(filters).some(v => v);

    /* ── Dynamic table width — exact pixel sum, columns are fully independent.
         No min-width:100% so resizing one column never affects others.
         When total exceeds container → horizontal scroll ── */
    const tableStyle = useMemo(() => {
        const total = cols.reduce((sum, c) => sum + getW(c.key), 0);
        const extra = (selectable ? 40 : 0) + (hasExpand ? 32 : 0) + (showActions ? 100 : 0);
        return { width: `${total + extra}px` } as React.CSSProperties;
    }, [cols, getW, selectable, hasExpand, showActions]);

    /* ── Inline add row after index ── */
    const addRowAfterIdx = useMemo(() => {
        if (!addingAt || addingAt === '__top__') return -1;
        let lastIdx = visibleRows.findIndex(r => r[idKey] === addingAt);
        if (lastIdx === -1) return -1;
        for (let i = lastIdx + 1; i < visibleRows.length; i++) {
            if (visibleRows[i]._parentId === addingAt) lastIdx = i;
            else break;
        }
        return lastIdx;
    }, [addingAt, visibleRows, idKey]);

    /* ── Inline add row renderer ── */
    const renderAddRow = (depth: number) => {
        const indent = depth * 24;
        return (
            <tr className={`sv-row sv-add-row depth-${depth}`}>
                {selectable && <td className="sv-td sv-cell-check" />}
                {hasExpand && <td className="sv-td sv-cell-expand"><span className="material-icons-round" style={{ fontSize: 14, color: 'var(--primary)' }}>subdirectory_arrow_right</span></td>}
                {cols.map((col, ci) => (
                    <td key={col.key} className="sv-td" style={ci === 0 && indent > 0 ? { paddingLeft: `${12 + indent}px` } : undefined}>
                        {ci === 0 ? (
                            <div className="sv-add-input-wrap">
                                <input ref={addRef} className="sv-add-input" placeholder={addRowLabel}
                                    value={addingName} onChange={e => setAddingName(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') cancelAdd(); }}
                                    onBlur={() => { if (!addingName.trim()) setTimeout(cancelAdd, 150); }}
                                />
                                {addingName.trim() && (
                                    <button className="sv-add-confirm" onClick={submitAdd} title="Add">
                                        <span className="material-icons-round">arrow_forward</span>
                                    </button>
                                )}
                            </div>
                        ) : <span className="sv-muted">—</span>}
                    </td>
                ))}
                {showActions && (
                    <td className="sv-td sv-cell-actions">
                        <button className="sv-icon-btn" onClick={cancelAdd} title="Cancel">
                            <span className="material-icons-round">close</span>
                        </button>
                    </td>
                )}
            </tr>
        );
    };

    /* ── Empty state ── */
    if (data.length === 0 && !onInlineAdd && !onAddTop && !onInlineAddTop) {
        return (
            <div className={`sv-root ${compact ? 'sv-compact' : ''}`}>
                <div className="sv-empty">
                    <span className="material-icons-round">{emptyIcon}</span>
                    <p>{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`sv-root ${compact ? 'sv-compact' : ''}`}>
            {/* ── Toolbar ── */}
            {title && (
                <div className="sv-toolbar">
                    <div className="sv-toolbar-left">
                        {titleIcon && (
                            <div className="sv-toolbar-icon">
                                <span className="material-icons-round">{titleIcon}</span>
                            </div>
                        )}
                        <h3 className="sv-toolbar-title">{title}</h3>
                        {count != null && <span className="sv-toolbar-badge">{count}</span>}
                    </div>
                    <div className="sv-toolbar-right">
                        {sorting.length > 0 && (
                            <button className="sv-chip" onClick={() => setSorting([])}>
                                <span className="material-icons-round">close</span> Clear sort
                            </button>
                        )}
                        {hasActiveFilters && (
                            <button className="sv-chip" onClick={() => setFilters({})}>
                                <span className="material-icons-round">filter_alt_off</span> Clear filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Filter bar ── */}
            {filterableCols.length > 0 && (
                <div className="sv-filters">
                    <span className="material-icons-round sv-filters-icon">filter_list</span>
                    {filterableCols.map(col => {
                        const topD = hierarchical ? data.filter(r => (r._depth || 0) === 0) : data;
                        const vals = col.filterOptions || [...new Set(topD.map(r => String(r[col.key] ?? '—')))].sort();
                        return (
                            <FilterDropdown key={col.key} label={col.label} options={vals}
                                value={filters[col.key] || ''} onChange={v => setFilters(f => ({ ...f, [col.key]: v }))} />
                        );
                    })}
                </div>
            )}

            {/* ── Table ── */}
            <div className="sv-table-wrap" ref={tableWrapRef}>
                <table className="sv-table" ref={tableRef} style={tableStyle}>
                    <thead>
                        <tr>
                            {selectable && (
                                <th className="sv-th sv-th-check">
                                    <span className="material-icons-round" style={{ fontSize: 16, opacity: 0.3 }}>check_box_outline_blank</span>
                                </th>
                            )}
                            {hasExpand && <th className="sv-th sv-th-expand" />}
                            {cols.map(col => {
                                const isSorted = sorting.length > 0 && sorting[0].id === col.key;
                                const sortDir = isSorted ? (sorting[0].desc ? 'desc' : 'asc') : null;
                                return (
                                    <th key={col.key}
                                        className={`sv-th ${col.sortable ? 'sv-th-sortable' : ''} ${isSorted ? 'sv-th-sorted' : ''}`}
                                        style={{
                                            width: `${getW(col.key)}px`,
                                            minWidth: `${getW(col.key)}px`,
                                            maxWidth: `${getW(col.key)}px`,
                                            textAlign: col.align || 'left',
                                        }}
                                        onClick={() => {
                                            if (!col.sortable) return;
                                            setSorting(prev => {
                                                if (prev.length > 0 && prev[0].id === col.key) {
                                                    if (!prev[0].desc) return [{ id: col.key, desc: true }];
                                                    return [];
                                                }
                                                return [{ id: col.key, desc: false }];
                                            });
                                        }}>
                                        <span className="sv-th-content">
                                            {col.label}
                                            {isSorted && (
                                                <span className="material-icons-round sv-sort-icon">
                                                    {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                            {col.sortable && !isSorted && (
                                                <span className="material-icons-round sv-sort-hint">unfold_more</span>
                                            )}
                                        </span>
                                        <span className="sv-resize"
                                            onMouseDown={e => onResizeStart(e, col.key)}
                                            onTouchStart={e => onResizeStart(e, col.key)}
                                            onDoubleClick={e => { e.stopPropagation(); autoResizeCol(col.key); }}
                                            onClick={e => e.stopPropagation()} />
                                    </th>
                                );
                            })}
                            {showActions && <th className="sv-th sv-th-actions">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map(g => {
                            const showGH = !!groupBy && g.key !== '_';
                            return (
                                <Fragment key={g.key}>
                                    {showGH && (
                                        <tr className="sv-group-row">
                                            <td colSpan={totalCols} className="sv-group-cell">
                                                {groupHeader ? groupHeader(g.key, g.rows) : g.key}
                                            </td>
                                        </tr>
                                    )}
                                    {g.rows.map((row: any, ri: number) => {
                                        const id = row[idKey];
                                        const globalIdx = visibleRows.indexOf(row);
                                        const showAdd = addingAt && addingAt !== '__top__' && globalIdx === addRowAfterIdx;
                                        const isDone = doneKey ? !!row[doneKey] : false;
                                        const depth = row._depth || 0;
                                        const hasChildren = row._hasChildren || false;
                                        const rowType = row._rowType || 'default';
                                        const indent = depth * 24;
                                        const isExpanded = expandedRows[id];

                                        const rowCls = [
                                            'sv-row',
                                            onRowClick ? 'sv-row-click' : '',
                                            isDone ? 'sv-row-done' : '',
                                            depth > 0 ? `sv-row-child depth-${depth}` : 'sv-row-parent',
                                            rowType === 'subtask' ? 'sv-row-sub' : '',
                                            rowType !== 'default' ? `sv-rowtype-${rowType}` : '',
                                        ].filter(Boolean).join(' ');

                                        return (
                                            <Fragment key={id ?? ri}>
                                                <tr className={rowCls} onClick={() => onRowClick?.(row)}>
                                                    {/* Checkbox */}
                                                    {selectable && (
                                                        <td className="sv-td sv-cell-check" onClick={e => { e.stopPropagation(); onToggle?.(id); }}>
                                                            <div className={`sv-check ${isDone ? 'checked' : ''}`}>
                                                                {isDone && <span className="material-icons-round">check</span>}
                                                            </div>
                                                        </td>
                                                    )}
                                                    {/* Expand */}
                                                    {hasExpand && (
                                                        <td className="sv-td sv-cell-expand" onClick={e => { e.stopPropagation(); if (hasChildren) setExpandedRows(p => ({ ...p, [id]: !p[id] })); }}>
                                                            {hasChildren && (
                                                                <span className={`sv-chevron ${isExpanded ? 'open' : ''}`}>
                                                                    <span className="material-icons-round">chevron_right</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                    {/* Data cells */}
                                                    {cols.map((col, ci) => {
                                                        const val = row[col.key];
                                                        const isEditing = editCell?.id === id && editCell?.key === col.key;
                                                        const isFirst = ci === 0;
                                                        const isSelectEdit = col.editType === 'select' && col.editOptions;
                                                        const isDateEdit = col.editType === 'date';

                                                        return (
                                                            <td key={col.key}
                                                                className={`sv-td ${col.editable ? 'sv-td-edit' : ''} ${col.key === 'name' ? 'sv-td-name' : ''} ${col.expandOnClick ? 'sv-td-expand-click' : ''}`}
                                                                style={{
                                                                    textAlign: col.align || 'left',
                                                                    paddingLeft: isFirst && indent > 0 ? `${12 + indent}px` : undefined,
                                                                    position: isSelectEdit && isEditing ? 'relative' : undefined,
                                                                }}
                                                                onClick={e => {
                                                                    if (col.expandOnClick && hasChildren) { e.stopPropagation(); setExpandedRows(p => ({ ...p, [id]: !p[id] })); return; }
                                                                    if ((isSelectEdit || isDateEdit) && col.editable) { e.stopPropagation(); startEdit(id, col, val); }
                                                                }}
                                                                onDoubleClick={e => { e.stopPropagation(); col.editable && startEdit(id, col, val); }}>
                                                                {isEditing ? (
                                                                    isSelectEdit ? (
                                                                        <CellSelect options={col.editOptions!} value={String(val ?? '')}
                                                                            onSelect={v => commitSelect(v)} onClose={commitEdit} />
                                                                    ) : (
                                                                        <input ref={editRef} className="sv-edit-input"
                                                                            type={col.editType === 'number' ? 'number' : col.editType === 'date' ? 'date' : 'text'}
                                                                            value={editVal} onChange={e => setEditVal(e.target.value)}
                                                                            onBlur={commitEdit} onClick={e => e.stopPropagation()}
                                                                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditVal(''); commitEdit(); } }} />
                                                                    )
                                                                ) : col.render ? col.render(val, row) : (val != null ? String(val) : <span className="sv-muted">—</span>)}
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Actions */}
                                                    {showActions && (
                                                        <td className="sv-td sv-cell-actions" onClick={e => e.stopPropagation()}>
                                                            <div className="sv-actions">
                                                                {onInlineAdd && (
                                                                    <button className="sv-icon-btn sv-icon-add" title="Add child" onClick={() => startAddingChild(id, depth)}>
                                                                        <span className="material-icons-round">add</span>
                                                                    </button>
                                                                )}
                                                                <button className="sv-icon-btn sv-icon-edit" title="Edit" onClick={() => onRowClick?.(row)}>
                                                                    <span className="material-icons-round">edit</span>
                                                                </button>
                                                                {onDelete && (
                                                                    <button className="sv-icon-btn sv-icon-del" title="Delete" onClick={() => onDelete(id)}>
                                                                        <span className="material-icons-round">delete_outline</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                                {showAdd && renderAddRow(addingDepth)}
                                            </Fragment>
                                        );
                                    })}
                                </Fragment>
                            );
                        })}
                        {addingAt === '__top__' && renderAddRow(0)}
                        {/* ── Always-visible bottom add row ── */}
                        {(onInlineAdd || onInlineAddTop) && !hideBottomAdd && addingAt !== '__top__' && (
                            <tr className="sv-row sv-add-row sv-add-row-bottom">
                                {selectable && <td className="sv-td sv-cell-check" />}
                                {hasExpand && <td className="sv-td sv-cell-expand" />}
                                {cols.map((col, ci) => (
                                    <td key={col.key} className="sv-td">
                                        {ci === 0 ? (
                                            <div className="sv-add-input-wrap sv-add-bottom-wrap"
                                                onClick={() => { if (addingAt !== '__bottom__') { setAddingAt('__bottom__'); setAddingDepth(0); setAddingName(''); } }}>
                                                {addingAt === '__bottom__' ? (
                                                    <>
                                                        <input ref={addRef} className="sv-add-input" placeholder={addRowLabel}
                                                            value={addingName} onChange={e => setAddingName(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') { submitAdd(); }
                                                                if (e.key === 'Escape') cancelAdd();
                                                            }}
                                                            onBlur={() => { if (!addingName.trim()) setTimeout(cancelAdd, 150); }}
                                                        />
                                                        {addingName.trim() && (
                                                            <button className="sv-add-confirm" onClick={submitAdd} title="Add">
                                                                <span className="material-icons-round">arrow_forward</span>
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="sv-add-placeholder">
                                                        <span className="material-icons-round">add</span>
                                                        {addRowLabel}
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                    </td>
                                ))}
                                {showActions && <td className="sv-td sv-cell-actions" />}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Footer ── */}
            {footer && <div className="sv-footer">{footer}</div>}
        </div>
    );
}

/* ═══ Filter Dropdown ═══ */
function FilterDropdown({ label, options, value, onChange }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        if (open) document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
        <div className="sv-filter-wrap" ref={ref}>
            <button className={`sv-filter-btn ${value ? 'active' : ''}`} onClick={() => setOpen(!open)}>
                <span className="material-icons-round">filter_list</span>
                {value ? `${label}: ${value}` : label}
                <span className="material-icons-round sv-filter-arrow">expand_more</span>
            </button>
            {open && (
                <div className="sv-filter-menu">
                    <button className={`sv-filter-opt ${!value ? 'active' : ''}`} onClick={() => { onChange(''); setOpen(false); }}>
                        <span className="material-icons-round">select_all</span> All
                    </button>
                    <div className="sv-filter-div" />
                    {options.map(o => (
                        <button key={o} className={`sv-filter-opt ${value === o ? 'active' : ''}`} onClick={() => { onChange(o); setOpen(false); }}>
                            {value === o && <span className="material-icons-round" style={{ color: 'var(--primary)' }}>check</span>}
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══ Utility ═══ */
function hasAnc(row: any, all: any[], ids: Set<string>, idKey: string): boolean {
    if (!row._parentId) return false;
    if (ids.has(row._parentId)) return true;
    const p = all.find(r => r[idKey] === row._parentId);
    return p ? hasAnc(p, all, ids, idKey) : false;
}
