'use client';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { currSym } from '@/lib/constants';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler);

export default function ProfilePage() {
    const { profile, stats } = useData();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const cs = currSym(profile?.currency || 'USD');
    const isEdu = profile?.theme === 'eduplex';
    const acBase = isEdu ? '200,249,2' : '255,69,0';
    const hc = isEdu ? '#C8F902' : '#FF4500';
    const showLoot = profile?.showLoot ?? false;

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d')!;
        const g = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
        g.addColorStop(0, `rgba(${acBase},0.5)`);
        g.addColorStop(1, `rgba(${acBase},0.05)`);
        chartRef.current = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['FOCUS', 'OUTPUT', 'SPEED', 'QUAL', 'SCOPE'],
                datasets: [{
                    data: [stats.skills.focus, stats.skills.output, stats.skills.speed, stats.skills.quality, stats.skills.scope],
                    backgroundColor: g, borderColor: hc, borderWidth: 2,
                    pointBackgroundColor: isEdu ? '#FFFFFF' : '#000', pointBorderColor: hc, pointRadius: 4, pointBorderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: isEdu ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                        grid: { color: isEdu ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                        pointLabels: {
                            color: isEdu ? '#4A5568' : 'rgba(255,255,255,0.6)',
                            font: { size: 10, weight: 500 as const },
                        },
                        ticks: { display: false },
                        suggestedMin: 0,
                        suggestedMax: 100,
                    },
                },
                plugins: { legend: { display: false } },
            },
        });
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [stats.skills, isEdu, acBase, hc]);

    return (
        <div className="anim-entry">
            {/* Avatar Hero */}
            <div style={{ textAlign: 'center', paddingTop: 16, marginBottom: 24, position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-70%)', width: 200, height: 200, background: `rgba(${acBase},0.1)`, borderRadius: '50%', filter: isEdu ? 'none' : 'blur(60px)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 16px' }}>
                    <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: `linear-gradient(to top, rgba(${acBase},0.4), transparent)`, opacity: 0.6, filter: 'blur(20px)', animation: isEdu ? 'none' : 'borderPulse 3s infinite' }} />
                    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', border: `3px solid rgba(${acBase},0.5)`, boxShadow: isEdu ? `0 0 8px rgba(${acBase},0.2)` : `0 0 10px rgba(${acBase},0.5), 0 0 20px rgba(${acBase},0.3)`, overflow: 'hidden', background: isEdu ? '#F4F6F9' : '#000', zIndex: 10 }}>
                        <div style={{ width: '100%', height: '100%', background: isEdu ? `linear-gradient(135deg, rgba(${acBase},0.15), rgba(${acBase},0.08))` : 'linear-gradient(135deg,#FF4500,#ff7b42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 44, color: isEdu ? '#6B8E00' : '#fff' }}>{(profile?.name || 'C')[0]}</div>
                    </div>
                    <div style={{ position: 'absolute', bottom: -6, right: -6, zIndex: 20, background: isEdu ? 'var(--primary)' : 'linear-gradient(to right,#FF4500,#FF8C00)', color: isEdu ? '#1A1B27' : '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: isEdu ? '1px solid rgba(200,249,2,0.3)' : '1px solid rgba(255,255,255,0.2)', boxShadow: isEdu ? '0 2px 8px rgba(200,249,2,0.2)' : '0 4px 12px rgba(0,0,0,0.5)', transform: 'rotate(-2deg)' }}>LVL {stats.level}</div>
                </div>
                <h1 className="text-metallic" style={{ fontSize: 28, fontFamily: 'Orbitron', fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase' }}>{profile?.name}</h1>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ height: 1, width: 32, background: 'linear-gradient(to right,transparent,var(--primary))' }} />
                    <p style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Task Commander</p>
                    <span style={{ height: 1, width: 32, background: 'linear-gradient(to left,transparent,var(--primary))' }} />
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
                {[
                    { l: 'Rank', v: '#' + stats.level, extra: 'LVL ' + stats.level, ec: '#4ade80', highlight: false },
                    { l: 'Completed', v: stats.totalCompleted, extra: 'Tasks', ec: 'var(--primary)', highlight: true },
                    ...(showLoot ? [{ l: 'Revenue', v: cs + stats.totalMoney.toLocaleString(), extra: 'Total Loot', ec: '#4ade80', highlight: false }] : []),
                ].map((s, i) => (
                    <div key={i} className="glass-card glow-border" style={{ borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden', transition: 'all .3s', cursor: 'pointer' }}>
                        {s.highlight && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(${acBase},0.1), transparent)` }} />}
                        <span style={{ fontSize: 10, color: s.highlight ? 'var(--primary)' : 'var(--t-666)', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4, position: 'relative', zIndex: 10 }}>{s.l}</span>
                        <span style={{ fontSize: 22, fontFamily: 'Orbitron', fontWeight: 700, color: s.highlight ? 'var(--primary)' : 'var(--t-fff)', position: 'relative', zIndex: 10 }}>{s.v}</span>
                        <span style={{ fontSize: 10, color: s.ec, marginTop: 4, background: `${s.ec}15`, padding: '2px 6px', borderRadius: 4, position: 'relative', zIndex: 10 }}>{s.extra}</span>
                    </div>
                ))}
            </div>

            {/* Skill Matrix */}
            <div className="glass-card" style={{ borderRadius: 16, padding: 16, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ width: 3, height: 20, background: 'var(--primary)', borderRadius: 2, marginRight: 10, boxShadow: '0 0 5px rgba(255,69,0,0.5)' }} />
                    <h3 style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: 14, color: 'var(--t-fff)' }}>Skill Matrix</h3>
                </div>
                <div style={{ height: 180 }}><canvas ref={canvasRef} /></div>
            </div>

            {/* XP Bar */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--t-888)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
                    <span>XP Progress (Lvl {stats.level} → {stats.level + 1})</span>
                    <span style={{ color: 'var(--primary)', background: `rgba(${acBase},0.1)`, padding: '2px 8px', borderRadius: 6, border: `1px solid rgba(${acBase},0.2)`, fontFamily: 'monospace' }}>{stats.xpInLevel} / 500</span>
                </div>
                <div className="xp-bar"><div className="xp-fill" style={{ width: stats.xpPct + '%', background: isEdu ? 'linear-gradient(to right,#A8D900,var(--primary))' : 'linear-gradient(to right,#8B0000,var(--primary),#FFA500)' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--t-555)' }}>
                    <span>Total XP: {stats.totalXP.toLocaleString()}</span>
                    <span>+100 XP per quest</span>
                </div>
            </div>

            {/* Settings Link */}
            <Link href="/settings" className="btn-ghost w-full" style={{ marginTop: 8, textDecoration: 'none' }}>
                <span className="material-icons-round" style={{ fontSize: 14 }}>settings</span> System Config
            </Link>
        </div>
    );
}
