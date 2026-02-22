'use client';
import { useState, useRef, useEffect } from 'react';

interface Option {
    value: string;
    label: string;
    icon?: string;
}

interface CustomSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: string;
    compact?: boolean;
    style?: React.CSSProperties;
}

export default function CustomSelect({ value, options, onChange, placeholder, icon, compact, style }: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Scroll to selected item when opening
    useEffect(() => {
        if (open && listRef.current) {
            const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement;
            if (active) active.scrollIntoView({ block: 'nearest' });
        }
    }, [open]);

    return (
        <div ref={ref} style={{ position: 'relative', ...style }}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="custom-select-trigger"
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: compact ? '6px 10px' : '12px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--g-08)',
                    background: 'var(--g-03)',
                    color: selected ? 'var(--t-eee)' : 'var(--t-444)',
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 600,
                    fontSize: compact ? 12 : 14,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    outline: 'none',
                    textAlign: 'left',
                }}
            >
                {icon && <span className="material-icons-round" style={{ fontSize: compact ? 14 : 16, color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected?.label || placeholder || 'Select...'}
                </span>
                <span className="material-icons-round" style={{ fontSize: 18, color: 'var(--t-555)', transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    expand_more
                </span>
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    ref={listRef}
                    className="custom-select-dropdown no-scrollbar"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        maxHeight: 220,
                        overflowY: 'auto',
                        borderRadius: 12,
                        border: '1.5px solid var(--g-08)',
                        background: 'var(--g-02)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        zIndex: 100,
                        padding: 4,
                        animation: 'dropdownSlide .15s ease-out',
                    }}
                >
                    {options.map(opt => {
                        const isActive = opt.value === value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                data-active={isActive}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: compact ? '6px 10px' : '10px 12px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: isActive ? 'rgba(var(--primary-rgb, 255,69,0), 0.1)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--t-ccc)',
                                    fontFamily: "'Rajdhani', sans-serif",
                                    fontWeight: isActive ? 700 : 600,
                                    fontSize: compact ? 12 : 13,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--g-04)';
                                }}
                                onMouseLeave={e => {
                                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                {opt.icon && <span className="material-icons-round" style={{ fontSize: 14, color: isActive ? 'var(--primary)' : 'var(--t-555)' }}>{opt.icon}</span>}
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                                {isActive && <span className="material-icons-round" style={{ fontSize: 16, color: 'var(--primary)' }}>check</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
