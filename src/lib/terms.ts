/* ===== Centralized Terminology for Game Mode / Professional Mode ===== */

export function t(key: string, gameMode: boolean): string {
    const MAP: Record<string, [string, string]> = {
        // [gameMode ON, gameMode OFF]
        'task': ['Quest', 'Task'],
        'tasks': ['Quests', 'Tasks'],
        'project': ['Campaign', 'Project'],
        'projects': ['Campaigns', 'Projects'],
        'subtask': ['Subtask', 'Subtask'],
        'board': ['Bounty Board', 'Projects'],
        'map': ['Strategic Map', 'Calendar'],
        'profile': ['Commander', 'Profile'],
        'settings': ['System Config', 'Settings'],
        'create_task': ['Deploy Quest', 'Create Task'],
        'create_proj': ['New Campaign', 'New Project'],
        'create_sub': ['New Subtask', 'New Subtask'],
        'priority': ['Threat Level', 'Priority'],
        'money': ['Loot', 'Budget'],
        'streak': ['Streak 🔥', 'Streak'],
        'level': ['Commander Level', 'Level'],
        'xp': ['XP', 'Points'],
        'complete': ['Quest Complete! ⚔️', 'Task completed'],
        'delete': ['Abandon Quest', 'Delete Task'],
        'delete_proj': ['Disband Campaign', 'Delete Project'],
        'empty': ['No quests active, Commander!', 'No tasks yet'],
        'empty_proj': ['No campaigns deployed', 'No projects yet'],
        'loading': ['Loading data...', 'Loading...'],
        'daily': ['Daily Grind', 'Today'],
        'cal': ['Strategic Map', 'Calendar'],
        'quest_log': ['Quest Log', 'Tasks'],
        'bounty_board': ['Bounty Board', 'Projects'],
        'strategic_map': ['Strategic Map', 'Calendar'],
        'commander': ['Commander', 'Profile'],
        'system_config': ['System Config', 'Settings'],
        'deploy': ['Deploy', 'Add'],
        'grind_hours': ['Daily Grind Hours', 'Work Hours'],
        'combat_alert': ['Combat Alerts', 'Notifications'],
        'copy': ['Clone', 'Copy'],
        'slot': ['Time Slot', 'Time Block'],
        'active_quest': ['Active Quest', 'Current Task'],
        'quest_briefing': ['Quest Briefing', 'Day Summary'],
    };
    return MAP[key]?.[gameMode ? 0 : 1] || key;
}

/* ===== Dual Tab Labels ===== */
export const TABS_GAME = [
    { key: 'quests', icon: 'dashboard', label: 'Quests' },
    { key: 'board', icon: 'inventory_2', label: 'Board' },
    { key: 'map', icon: 'calendar_today', label: 'Map' },
    { key: 'profile', icon: 'person', label: 'Profile' },
];

export const TABS_PRO = [
    { key: 'quests', icon: 'assignment', label: 'Tasks' },
    { key: 'board', icon: 'folder', label: 'Projects' },
    { key: 'map', icon: 'calendar_month', label: 'Calendar' },
    { key: 'profile', icon: 'account_circle', label: 'Profile' },
];

export const HEADERS_GAME: Record<string, string> = {
    quests: 'Quest Log',
    board: 'Bounty Board',
    map: 'Strategic Map',
    profile: 'Commander',
    settings: 'System Config',
};

export const HEADERS_PRO: Record<string, string> = {
    quests: 'Tasks',
    board: 'Projects',
    map: 'Calendar',
    profile: 'Profile',
    settings: 'Settings',
};
