'use client';
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { toDS, DAY_NAMES } from '@/lib/utils';
import { currSym, TASK_ICONS, TASK_COLORS } from '@/lib/constants';

export default function MapPage() {
    const { tasks, enrichedProjects, profile, setModal, toggleTask, updateTaskField } = useData();
    const [view, setView] = useState<'time' | 'cal'>('time');
    const realToday = new Date();
    const [selDate, setSelDate] = useState(new Date());
    const [weekOff, setWeekOff] = useState(0);
    const [calMonth, setCalMonth] = useState(new Date(realToday.getFullYear(), realToday.getMonth(), 1));
    const isEdu = profile?.theme === 'eduplex';
    const ac = isEdu ? 'rgba(200,249,2,' : 'rgba(255,69,0,';
    const cs = currSym(profile?.currency || 'USD');

    const startH = profile?.startHour ?? 8;
    const endH = profile?.endHour ?? 19;
    const hrsCount = startH <= endH ? (endH - startH + 1) : (24 - startH + endH + 1);
    const hrs = Array.from({ length: Math.max(1, hrsCount) }, (_, i) => (startH + i) % 24);

    // Week days
    const weekDays = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - realToday.getDay() + 1 + weekOff * 7);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(baseMonday);
            d.setDate(baseMonday.getDate() + i);
            return { name: DAY_NAMES[d.getDay()], date: d.getDate(), isToday: d.toDateString() === realToday.toDateString(), isSel: d.toDateString() === selDate.toDateString(), full: d };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff, selDate]);

    const weekMonth = useMemo(() => {
        const baseMonday = new Date(realToday);
        baseMonday.setDate(realToday.getDate() - realToday.getDay() + 1 + weekOff * 7);
        return { month: baseMonday.toLocaleString('default', { month: 'long' }), year: baseMonday.getFullYear() };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekOff]);

    const isSelToday = selDate.toDateString() === realToday.toDateString();
    const selDateStr = toDS(selDate);

    // All tasks flat
    const allTasks = useMemo(() => {
        return tasks.map(t => {
            const proj = enrichedProjects.find(p => p.$id === t.projectId);
            return { ...t, pName: proj?.name || '', pColor: proj?.color || '#FF4500', pMoney: proj?.money || 0, pId: t.projectId };
        });
    }, [tasks, enrichedProjects]);

    const dateTasks = allTasks.filter(t => t.date === selDateStr && t.slot != null);
    const dateTm: Record<number, typeof dateTasks[0]> = {};
    dateTasks.forEach(t => { if (t.slot != null) dateTm[t.slot] = t; });
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
                                    borderRadius: 12, cursor: 'pointer', transition: 'all .3s',
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                            {hrs.map(h => {
                                const t = dateTm[h];
                                const isActive = !!t;
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const hr = h % 12 || 12;
                                return (
                                    <div key={h} style={{ display: 'flex', position: 'relative' }}>
                                        <div style={{ width: 64, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 20, paddingTop: isActive ? 16 : 6 }}>
                                            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: isActive ? 18 : 14, color: isActive ? 'var(--primary)' : 'var(--t-888)', filter: isActive && !isEdu ? 'drop-shadow(0 0 5px rgba(255,69,0,0.8))' : '' }}>{hr}:00</span>
                                            <span style={{ fontSize: 10, color: isActive ? 'var(--primary)' : 'var(--t-666)', fontWeight: isActive ? 700 : 400 }}>{ampm}</span>
                                        </div>
                                        <div style={{ position: 'absolute', left: 49, top: isActive ? 20 : 10, width: isActive ? 12 : 6, height: isActive ? 12 : 6, marginLeft: isActive ? -3 : 0, borderRadius: '50%', background: isActive ? 'var(--primary)' : 'var(--t-444)', border: isActive ? '2px solid var(--t-fff)' : '1px solid var(--t-000)', boxShadow: isActive ? `0 0 15px ${ac}0.8)` : 'none', zIndex: 20, animation: isActive && !isEdu ? 'borderPulse 2s infinite' : '' }} />
                                        <div style={{ flex: 1 }}>
                                            {isActive ? (
                                                <div className="active-quest-glow" style={{ borderRadius: 16, padding: 16, cursor: 'pointer', transition: 'transform .2s', position: 'relative' }}>
                                                    {/* Remove button */}
                                                    <button onClick={(e) => { e.stopPropagation(); updateTaskField(t!.$id, 'slot', null); }} style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, transition: 'all .2s' }}>
                                                        <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--t-888)' }}>close</span>
                                                    </button>
                                                    <div style={{ position: 'relative', zIndex: 10 }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, background: `${ac}0.15)`, color: 'var(--t-ffcba4)', border: `1px solid ${ac}0.3)`, marginBottom: 6 }}>
                                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', animation: isEdu ? 'none' : 'borderPulse 2s infinite' }} />Active Quest
                                                        </div>
                                                        <h3 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 18, color: 'var(--t-fff)' }}>{t!.name}</h3>
                                                        <p style={{ fontSize: 11, color: 'var(--t-888)', marginTop: 2 }}>{t!.pName} • {cs}{t!.pMoney.toLocaleString()}</p>
                                                    </div>
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
                                    return (
                                        <div key={t.$id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, transition: 'all .2s', cursor: 'pointer', background: 'var(--g-02)', border: '1px solid var(--g-04)' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: isEdu ? `linear-gradient(135deg, ${clr}15, #FFFFFF)` : `linear-gradient(135deg, ${clr}25, rgba(0,0,0,0.5))`, border: `1px solid ${clr}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isEdu ? 'none' : 'inset 0 0 10px rgba(0,0,0,0.3)' }}>
                                                <span className="material-icons-round" style={{ color: clr, fontSize: 20 }}>{icon}</span>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 14, color: 'var(--t-fff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h4>
                                                <p style={{ fontSize: 10, color: 'var(--t-666)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.pName}{t.slot != null ? ` • ${t.slot % 12 || 12}${t.slot >= 12 ? 'PM' : 'AM'}` : ''}
                                                    {t.done && <> • <span className="material-icons-round" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 2, color: '#22c55e' }}>check_circle</span>Done</>}
                                                </p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'editTask', pid: t.pId, tid: t.$id }); }} style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-04)', border: '1px solid var(--g-08)', transition: 'all .2s' }}>
                                                <span className="material-icons-round" style={{ fontSize: 14, color: 'var(--t-666)' }}>edit</span>
                                            </button>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div className="text-gold" style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+{cs}{t.pMoney.toLocaleString()}</div>
                                                <div style={{ fontSize: 8, color: 'var(--t-555)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>Reward</div>
                                            </div>
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
        </div>
    );
}
