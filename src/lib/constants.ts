import type { CurrencyCode } from './types';

/* ===== Project Colors ===== */
export const PCOLS = ['#FF4500', '#3b82f6', '#fbbf24', '#a78bfa', '#10b981', '#f43f5e', '#06b6d4'];

/* ===== Currencies ===== */
export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

/* ===== Currency Symbol Lookup ===== */
export function currSym(code: string): string {
    return CURRENCIES.find(c => c.code === code)?.symbol || '$';
}

/* ===== Priority CSS Class ===== */
export function priCls(p: number): string {
    if (p === 1) return 'pri-1';
    if (p === 2) return 'pri-2';
    if (p === 3) return 'pri-3';
    return 'pri-low';
}

/* ===== Navigation Tabs ===== */
export const TABS = [
    { key: 'quests', icon: 'dashboard', label: 'Quests' },
    { key: 'board', icon: 'inventory_2', label: 'Board' },
    { key: 'map', icon: 'calendar_today', label: 'Map' },
    { key: 'profile', icon: 'person', label: 'Profile' },
] as const;

/* ===== Task Icons & Colors for Calendar ===== */
export const TASK_ICONS = ['emoji_events', 'verified', 'rocket_launch', 'star', 'bolt', 'diamond', 'military_tech', 'workspace_premium'];
export const TASK_COLORS = ['#fbbf24', '#3b82f6', '#FF4500', '#a78bfa', '#22c55e', '#06b6d4', '#f43f5e', '#10b981'];
