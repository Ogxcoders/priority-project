/* ===== Currency Codes ===== */
export type CurrencyCode =
    | 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY'
    | 'CNY' | 'AUD' | 'CAD' | 'BRL' | 'KRW'
    | 'RUB' | 'TRY';

/* ===== Profile ===== */
export interface Profile {
    $id: string;
    userId: string;
    name: string;
    streak: number;
    lastActiveDate: string | null;
    currency: CurrencyCode;
    theme: 'dark' | 'eduplex';
    notifications: boolean;
    stealth: boolean;
    sound: boolean;
    confirmTaskDelete: boolean;
    showLoot: boolean;
    startHour: number;
    endHour: number;

    // === PHASE 1: GAME MODE ===
    gameMode: boolean;

    // === VIEW PREFERENCES (per page) ===
    questView: 'card' | 'list' | 'sheet';
    boardView: 'card' | 'grid' | 'sheet';
    mapView: 'calendar' | 'timeline' | 'sheet';

    // === FEATURE TOGGLES ===
    showSubtasks: boolean;
    showPriority: boolean;
    showTimeBlocks: boolean;
    showProgress: boolean;
    showStats: boolean;
    showStreak: boolean;
    showXP: boolean;
    showAchievements: boolean;

    // === UI CUSTOMIZATION ===
    accentColor: string;
    cardStyle: 'glass' | 'flat' | 'outlined' | 'elevated';
    fontSize: 'small' | 'medium' | 'large';
    compactMode: boolean;
    animationsEnabled: boolean;
}

/* ===== Project ===== */
export interface Project {
    $id: string;
    userId: string;
    name: string;
    money: number;
    priority: number;
    color: string;
}

/* ===== Task ===== */
export type TaskStatus = 'default' | 'processing' | 'done' | 'ignore';

export interface Task {
    $id: string;
    userId: string;
    projectId: string;
    name: string;
    priority: number;
    done: boolean;
    status: TaskStatus | null;
    slot: number | null;
    slotEnd: number | null;
    date: string | null;
    clonedFrom: string | null;
}

/* ===== Subtask ===== */
export interface Subtask {
    $id: string;
    userId: string;
    taskId: string;
    name: string;
    done: boolean;
    order: number;
}

/* ===== Client-side enriched types ===== */
export interface TaskWithContext extends Task {
    projectName: string;
    projectColor: string;
    projectMoney: number;
    projectPriority: number;
    subtasks: Subtask[];
}

export interface ProjectWithTasks extends Project {
    tasks: TaskWithContext[];
    completedCount: number;
    pendingCount: number;
    progressPct: number;
}

/* ===== Stats (computed client-side) ===== */
export interface Stats {
    totalMoney: number;
    totalTasks: number;
    totalCompleted: number;
    totalXP: number;
    level: number;
    xpInLevel: number;
    xpPct: number;
    skills: {
        focus: number;
        output: number;
        speed: number;
        quality: number;
        scope: number;
    };
}

/* ===== Modal Types ===== */
export type ModalType =
    | { type: 'addProject' }
    | { type: 'addTask'; returnTo?: ModalType; preSlot?: number; preDate?: string }
    | { type: 'addSubtask' }
    | { type: 'editTask'; pid: string; tid: string; returnTo?: ModalType }
    | { type: 'projectDetail'; pid: string }
    | { type: 'assignTask'; preSlot?: number; preDate?: string }
    | { type: 'fabMenu' }
    | null;
