'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { client, DB_ID } from '@/lib/appwrite';
import * as db from '@/lib/db';
import { computeStats } from '@/lib/utils';
import type { Profile, Project, Task, Subtask, ProjectWithTasks, TaskWithContext, Stats, ModalType } from '@/lib/types';

interface DataContextType {
    profile: Profile | null;
    projects: Project[];
    tasks: Task[];
    subtasks: Subtask[];
    // Enriched
    enrichedProjects: ProjectWithTasks[];
    stats: Stats;
    // CRUD
    refreshAll: () => Promise<void>;
    updateProfileField: (field: string, value: unknown) => Promise<void>;
    addProject: (name: string, money: number, priority: number, color: string) => Promise<string>;
    updateProjectField: (id: string, field: string, value: unknown) => Promise<void>;
    removeProject: (id: string) => Promise<void>;
    addTask: (projectId: string, name: string, priority: number, slot: number | null, slotEnd: number | null, date: string | null, clonedFrom?: string | null) => Promise<string>;
    updateTaskField: (id: string, field: string, value: unknown) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, fromProjectId: string, toProjectId: string) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    addSubtask: (taskId: string, name: string) => Promise<void>;
    toggleSubtask: (id: string) => Promise<void>;
    updateSubtaskField: (id: string, field: string, value: unknown) => Promise<void>;
    removeSubtask: (id: string) => Promise<void>;
    shiftPriorities: (targetPri: number, excludeId: string | null) => Promise<void>;
    // Modal
    modal: ModalType;
    setModal: (m: ModalType) => void;
    // Toast
    toast: string | null;
    showToast: (msg: string) => void;
    // Loading
    dataLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [modal, setModal] = useState<ModalType>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const initialLoadDone = useRef(false);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Helper: save cache in background (debounced, non-blocking)
    const cacheTimer = useRef<NodeJS.Timeout | null>(null);
    const saveCache = useCallback((userId: string, p: Project[], t: Task[], s: Subtask[], prof?: Profile | null) => {
        if (cacheTimer.current) clearTimeout(cacheTimer.current);
        cacheTimer.current = setTimeout(() => {
            try {
                localStorage.setItem(`cache_proj_${userId}`, JSON.stringify(p));
                localStorage.setItem(`cache_tasks_${userId}`, JSON.stringify(t));
                localStorage.setItem(`cache_sub_${userId}`, JSON.stringify(s));
                if (prof) localStorage.setItem(`cache_profile_${userId}`, JSON.stringify(prof));
            } catch { /* quota exceeded - ignore */ }
        }, 500);
    }, []);

    /* ===== LOAD ALL DATA ===== */
    const refreshAll = useCallback(async () => {
        if (!user) return;

        // Load from cache first for instant UI (only on first load)
        if (!initialLoadDone.current) {
            try {
                const cachedProfile = localStorage.getItem(`cache_profile_${user.$id}`);
                const cachedProj = localStorage.getItem(`cache_proj_${user.$id}`);
                const cachedTasks = localStorage.getItem(`cache_tasks_${user.$id}`);
                const cachedSub = localStorage.getItem(`cache_sub_${user.$id}`);

                if (cachedProfile && cachedProj && cachedTasks) {
                    setProfile(JSON.parse(cachedProfile));
                    setProjects(JSON.parse(cachedProj));
                    setTasks(JSON.parse(cachedTasks));
                    setSubtasks(cachedSub ? JSON.parse(cachedSub) : []);
                    setDataLoading(false);
                } else {
                    setDataLoading(true);
                }
            } catch { /* corrupt cache */ }
        }

        try {
            const [p, projs, tks, subs] = await Promise.all([
                db.getProfile(user.$id),
                db.getProjects(user.$id),
                db.getTasks(user.$id),
                db.getSubtasks(user.$id),
            ]);
            if (!p) {
                const newProfile = await db.createProfile({
                    userId: user.$id,
                    name: user.name || 'Commander',
                    streak: 0,
                    lastActiveDate: null,
                    currency: 'USD',
                    theme: 'dark',
                    notifications: true,
                    stealth: false,
                    sound: true,
                    confirmTaskDelete: true,
                    showLoot: false,
                    startHour: 8,
                    endHour: 19,
                });
                setProfile(newProfile);
            } else {
                setProfile(p);
            }
            setProjects(projs);
            setTasks(tks);
            setSubtasks(subs);
            initialLoadDone.current = true;
            // Cache in background
            saveCache(user.$id, projs, tks, subs, p || undefined);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setDataLoading(false);
        }
    }, [user, saveCache]);

    useEffect(() => { if (user) refreshAll(); }, [user, refreshAll]);

    /* ===== REALTIME — debounced, with WebSocket error protection ===== */
    useEffect(() => {
        if (!user) return;
        const channel = `databases.${DB_ID}.collections.*.documents`;
        let debounceTimer: NodeJS.Timeout;
        let unsub: (() => void) | null = null;
        const setupSub = () => {
            try {
                unsub = client.subscribe(channel, () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        refreshAll();
                    }, 2000);
                });
            } catch (err) {
                console.warn('Realtime subscription failed, retrying in 5s:', err);
                setTimeout(setupSub, 5000);
            }
        };
        // Delay initial subscription to let WebSocket connect
        const initTimer = setTimeout(setupSub, 1000);
        return () => { clearTimeout(initTimer); unsub?.(); clearTimeout(debounceTimer); };
    }, [user, refreshAll]);

    /* ===== AUTO-SAVE CACHE on any state change ===== */
    const cacheReady = useRef(false);
    useEffect(() => {
        // Skip the first render (initial load from cache — don't re-save stale data)
        if (!user || !initialLoadDone.current) return;
        if (!cacheReady.current) { cacheReady.current = true; return; }
        saveCache(user.$id, projects, tasks, subtasks, profile);
    }, [user, projects, tasks, subtasks, profile, saveCache]);

    /* ===== ENRICHED DATA (properly memoized) ===== */
    const enrichedProjects = useMemo<ProjectWithTasks[]>(() => {
        const sorted = [...projects].sort((a, b) => a.priority - b.priority);
        return sorted.map(proj => {
            const projTasks: TaskWithContext[] = tasks
                .filter(t => t.projectId === proj.$id)
                .sort((a, b) => a.priority - b.priority)
                .map(t => ({
                    ...t,
                    projectName: proj.name,
                    projectColor: proj.color,
                    projectMoney: proj.money,
                    projectPriority: proj.priority,
                    subtasks: subtasks.filter(s => s.taskId === t.$id).sort((a, b) => a.order - b.order),
                }));
            const originals = projTasks.filter(t => !t.clonedFrom);
            return {
                ...proj,
                tasks: projTasks,
                completedCount: originals.filter(t => t.done).length,
                pendingCount: originals.filter(t => !t.done).length,
                progressPct: originals.length > 0 ? Math.round(originals.filter(t => t.done).length / originals.length * 100) : 0,
            };
        });
    }, [projects, tasks, subtasks]);

    const stats = useMemo(() => {
        const originalTasks = tasks.filter(t => !t.clonedFrom);
        const totalCompleted = originalTasks.filter(t => t.done).length;
        const totalMoney = projects.reduce((s, p) => s + p.money, 0);
        return computeStats(totalCompleted, originalTasks.length, totalMoney, profile?.streak || 0, projects.length);
    }, [tasks, projects, profile?.streak]);

    /* ===== OPTIMISTIC CRUD — Update UI first, sync DB in background ===== */
    const updateProfileField = async (field: string, value: unknown) => {
        if (!profile) return;
        // Optimistic
        setProfile(prev => prev ? { ...prev, [field]: value } : prev);
        // Background sync
        db.updateProfile(profile.$id, { [field]: value } as Partial<Profile>).catch(() => {
            showToast('Failed to save — reverting');
            refreshAll();
        });
    };

    const addProject = async (name: string, money: number, priority: number, color: string): Promise<string> => {
        if (!user) return '';
        const proj = await db.createProject({ userId: user.$id, name, money, priority, color });
        setProjects(prev => [...prev, proj]);
        return proj.$id;
    };

    const updateProjectField = async (id: string, field: string, value: unknown) => {
        setProjects(prev => prev.map(p => p.$id === id ? { ...p, [field]: value } : p));
        db.updateProject(id, { [field]: value } as Partial<Project>).catch(() => {
            showToast('Failed to save');
            refreshAll();
        });
    };

    const removeProject = async (id: string) => {
        if (!user) return;
        const removedTaskIds = new Set(tasks.filter(t => t.projectId === id).map(t => t.$id));
        setProjects(prev => prev.filter(p => p.$id !== id));
        setTasks(prev => prev.filter(t => t.projectId !== id));
        setSubtasks(prev => prev.filter(s => !removedTaskIds.has(s.taskId)));
        Promise.all([
            db.deleteTasksForProject(user.$id, id),
            db.deleteProject(id),
        ]).catch(() => {
            showToast('Failed to delete — reverting');
            refreshAll();
        });
    };

    const addTask = async (projectId: string, name: string, priority: number, slot: number | null, slotEnd: number | null, date: string | null, clonedFrom: string | null = null): Promise<string> => {
        if (!user) return '';
        const task = await db.createTask({ userId: user.$id, projectId, name, priority, done: false, slot, slotEnd, date, clonedFrom });
        setTasks(prev => [...prev, task]);
        return projectId;
    };

    const updateTaskField = async (id: string, field: string, value: unknown) => {
        // Optimistic — use prev => to get latest state (critical for rapid sequential calls)
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, [field]: value } : t));
        db.updateTask(id, { [field]: value } as Partial<Task>).catch(() => {
            showToast('Failed to save');
            refreshAll();
        });
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.$id === id);
        if (!task) return;
        const taskSubs = subtasks.filter(s => s.taskId === id);
        if (taskSubs.length > 0 && !task.done) {
            const allDone = taskSubs.every(s => s.done);
            if (!allDone) { showToast('Please complete all subtasks first!'); return; }
        }
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, done: !t.done } : t));
        db.updateTask(id, { done: !task.done }).catch(() => {
            showToast('Failed to update');
            refreshAll();
        });
    };

    const moveTask = async (taskId: string, _fromProjectId: string, toProjectId: string) => {
        setTasks(prev => prev.map(t => t.$id === taskId ? { ...t, projectId: toProjectId } : t));
        db.updateTask(taskId, { projectId: toProjectId }).catch(() => {
            showToast('Failed to move');
            refreshAll();
        });
    };

    const removeTask = async (id: string) => {
        if (!user) return;
        setTasks(prev => prev.filter(t => t.$id !== id));
        setSubtasks(prev => prev.filter(s => s.taskId !== id));
        Promise.all([
            db.deleteSubtasksForTask(user.$id, id),
            db.deleteTask(id),
        ]).catch(() => {
            showToast('Failed to delete');
            refreshAll();
        });
    };

    const addSubtask = async (taskId: string, name: string) => {
        if (!user) return;
        const order = subtasks.filter(s => s.taskId === taskId).length;
        const sub = await db.createSubtask({ userId: user.$id, taskId, name, done: false, order });
        setSubtasks(prev => [...prev, sub]);
    };

    const toggleSubtask = async (id: string) => {
        const sub = subtasks.find(s => s.$id === id);
        if (!sub) return;
        const newDone = !sub.done;
        setSubtasks(prev => prev.map(s => s.$id === id ? { ...s, done: newDone } : s));
        db.updateSubtask(id, { done: newDone }).catch(() => {
            showToast('Failed to update');
            refreshAll();
        });
    };

    const removeSubtask = async (id: string) => {
        setSubtasks(prev => prev.filter(s => s.$id !== id));
        db.deleteSubtask(id).catch(() => {
            showToast('Failed to delete');
            refreshAll();
        });
    };

    const updateSubtaskField = async (id: string, field: string, value: unknown) => {
        setSubtasks(prev => prev.map(s => s.$id === id ? { ...s, [field]: value } : s));
        db.updateSubtask(id, { [field]: value } as Partial<Subtask>).catch(() => {
            showToast('Failed to save');
            refreshAll();
        });
    };

    const shiftPriorities = async (targetPri: number, excludeId: string | null) => {
        // Optimistic
        setProjects(prev => prev.map(p =>
            p.priority >= targetPri && p.$id !== excludeId ? { ...p, priority: p.priority + 1 } : p
        ));
        const toShift = projects.filter(p => p.priority >= targetPri && p.$id !== excludeId);
        Promise.all(toShift.map(p => db.updateProject(p.$id, { priority: p.priority + 1 }))).catch(() => refreshAll());
    };

    return (
        <DataContext.Provider value={{
            profile, projects, tasks, subtasks,
            enrichedProjects, stats,
            refreshAll, updateProfileField,
            addProject, updateProjectField, removeProject,
            addTask, updateTaskField, toggleTask, moveTask, removeTask,
            addSubtask, toggleSubtask, updateSubtaskField, removeSubtask,
            shiftPriorities,
            modal, setModal,
            toast, showToast,
            dataLoading,
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be within DataProvider');
    return ctx;
}
