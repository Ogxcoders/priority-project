/* ===== Unique ID Generator ===== */
export function uid(): string {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/* ===== Date to String (YYYY-MM-DD) ===== */
export function toDS(d: Date): string {
    return d.toISOString().split('T')[0];
}

/* ===== Format Date for Display ===== */
export function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ===== Format Hour to 12h ===== */
export function formatHour(h: number): { hr: number; ampm: string } {
    return { hr: h % 12 || 12, ampm: h >= 12 ? 'PM' : 'AM' };
}

/* ===== Compute Stats from Data ===== */
export function computeStats(
    totalCompleted: number,
    totalTasks: number,
    totalMoney: number,
    streak: number,
    projectCount: number
) {
    const totalXP = totalCompleted * 100;
    const level = Math.floor(totalXP / 500) + 1;
    const xpInLevel = totalXP % 500;
    const xpPct = Math.round((xpInLevel / 500) * 100);
    const completionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return {
        totalMoney,
        totalTasks,
        totalCompleted,
        totalXP,
        level,
        xpInLevel,
        xpPct,
        skills: {
            focus: Math.min(100, 20 + totalCompleted * 8),
            output: Math.min(100, completionRate),
            speed: Math.min(100, 20 + streak * 12),
            quality: Math.min(100, 20 + projectCount * 15),
            scope: Math.min(100, 20 + Math.round(totalMoney / 200)),
        },
    };
}

/* ===== Day Names ===== */
export const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
