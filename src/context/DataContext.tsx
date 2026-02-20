'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
    addProject: (name: string, money: number, priority: number, color: string) => Promise<void>;
    updateProjectField: (id: string, field: string, value: unknown) => Promise<void>;
    removeProject: (id: string) => Promise<void>;
    addTask: (projectId: string, name: string, priority: number, slot: number | null, date: string | null) => Promise<void>;
    updateTaskField: (id: string, field: string, value: unknown) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, fromProjectId: string, toProjectId: string) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    addSubtask: (taskId: string, name: string) => Promise<void>;
    toggleSubtask: (id: string) => Promise<void>;
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

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    /* ===== LOAD ALL DATA ===== */
    const refreshAll = useCallback(async () => {
        if (!user) return;

        // Optimistic Load from Cache for 0ms visual delay (App-like feel)
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
                setDataLoading(false); // Instantly dismiss loading screen
            } else {
                setDataLoading(true);
            }
        } catch (e) { }

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
                    startHour: 8,
                    endHour: 19,
                });
                setProfile(newProfile);
            } else {
                setProfile(p);
                localStorage.setItem(`cache_profile_${user.$id}`, JSON.stringify(p));
            }
            setProjects(projs);
            setTasks(tks);
            setSubtasks(subs);
            localStorage.setItem(`cache_proj_${user.$id}`, JSON.stringify(projs));
            localStorage.setItem(`cache_tasks_${user.$id}`, JSON.stringify(tks));
            localStorage.setItem(`cache_sub_${user.$id}`, JSON.stringify(subs));
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setDataLoading(false);
        }
    }, [user]);

    useEffect(() => { if (user) refreshAll(); }, [user, refreshAll]);

    /* ===== REALTIME ===== */
    useEffect(() => {
        if (!user) return;
        const channel = `databases.${DB_ID}.collections.*.documents`;
        const unsub = client.subscribe(channel, () => {
            refreshAll();
        });
        return () => { unsub(); };
    }, [user, refreshAll]);

    /* ===== ENRICHED DATA ===== */
    const enrichedProjects: ProjectWithTasks[] = projects
        .sort((a, b) => a.priority - b.priority)
        .map(proj => {
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
            return {
                ...proj,
                tasks: projTasks,
                completedCount: projTasks.filter(t => t.done).length,
                pendingCount: projTasks.filter(t => !t.done).length,
                progressPct: projTasks.length > 0 ? Math.round(projTasks.filter(t => t.done).length / projTasks.length * 100) : 0,
            };
        });

    const totalCompleted = tasks.filter(t => t.done).length;
    const totalMoney = projects.reduce((s, p) => s + p.money, 0);
    const stats = computeStats(totalCompleted, tasks.length, totalMoney, profile?.streak || 0, projects.length);

    /* ===== CRUD OPERATIONS ===== */
    const updateProfileField = async (field: string, value: unknown) => {
        if (!profile) return;
        await db.updateProfile(profile.$id, { [field]: value } as Partial<Profile>);
        setProfile(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const addProject = async (name: string, money: number, priority: number, color: string) => {
        if (!user) return;
        const proj = await db.createProject({ userId: user.$id, name, money, priority, color });
        setProjects(prev => [...prev, proj]);
    };

    const updateProjectField = async (id: string, field: string, value: unknown) => {
        await db.updateProject(id, { [field]: value } as Partial<Project>);
        setProjects(prev => prev.map(p => p.$id === id ? { ...p, [field]: value } : p));
    };

    const removeProject = async (id: string) => {
        if (!user) return;
        await db.deleteTasksForProject(user.$id, id);
        await db.deleteProject(id);
        setProjects(prev => prev.filter(p => p.$id !== id));
        setTasks(prev => prev.filter(t => t.projectId !== id));
        setSubtasks(prev => {
            const taskIds = new Set(tasks.filter(t => t.projectId === id).map(t => t.$id));
            return prev.filter(s => !taskIds.has(s.taskId));
        });
    };

    const addTask = async (projectId: string, name: string, priority: number, slot: number | null, date: string | null) => {
        if (!user) return;
        const task = await db.createTask({ userId: user.$id, projectId, name, priority, done: false, slot, date });
        setTasks(prev => [...prev, task]);
    };

    const updateTaskField = async (id: string, field: string, value: unknown) => {
        await db.updateTask(id, { [field]: value } as Partial<Task>);
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, [field]: value } : t));
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.$id === id);
        if (!task) return;
        const taskSubs = subtasks.filter(s => s.taskId === id);
        if (taskSubs.length > 0 && !task.done) {
            const allDone = taskSubs.every(s => s.done);
            if (!allDone) { showToast('Please complete all subtasks first!'); return; }
        }
        await db.updateTask(id, { done: !task.done });
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, done: !t.done } : t));
    };

    const moveTask = async (taskId: string, _fromProjectId: string, toProjectId: string) => {
        await db.updateTask(taskId, { projectId: toProjectId });
        setTasks(prev => prev.map(t => t.$id === taskId ? { ...t, projectId: toProjectId } : t));
    };

    const removeTask = async (id: string) => {
        if (!user) return;
        await db.deleteSubtasksForTask(user.$id, id);
        await db.deleteTask(id);
        setTasks(prev => prev.filter(t => t.$id !== id));
        setSubtasks(prev => prev.filter(s => s.taskId !== id));
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
        await db.updateSubtask(id, { done: !sub.done });
        setSubtasks(prev => prev.map(s => s.$id === id ? { ...s, done: !s.done } : s));
        // Auto-complete parent task if all subs done
        const taskSubs = subtasks.map(s => s.$id === id ? { ...s, done: !s.done } : s).filter(s => s.taskId === sub.taskId);
        const allDone = taskSubs.length > 0 && taskSubs.every(s => s.done);
        const task = tasks.find(t => t.$id === sub.taskId);
        if (task && task.done !== allDone) {
            await db.updateTask(sub.taskId, { done: allDone });
            setTasks(prev => prev.map(t => t.$id === sub.taskId ? { ...t, done: allDone } : t));
        }
    };

    const removeSubtask = async (id: string) => {
        await db.deleteSubtask(id);
        setSubtasks(prev => prev.filter(s => s.$id !== id));
    };

    const shiftPriorities = async (targetPri: number, excludeId: string | null) => {
        const toShift = projects.filter(p => p.priority >= targetPri && p.$id !== excludeId);
        for (const p of toShift) {
            await db.updateProject(p.$id, { priority: p.priority + 1 });
        }
        setProjects(prev => prev.map(p =>
            p.priority >= targetPri && p.$id !== excludeId ? { ...p, priority: p.priority + 1 } : p
        ));
    };

    return (
        <DataContext.Provider value={{
            profile, projects, tasks, subtasks,
            enrichedProjects, stats,
            refreshAll, updateProfileField,
            addProject, updateProjectField, removeProject,
            addTask, updateTaskField, toggleTask, moveTask, removeTask,
            addSubtask, toggleSubtask, removeSubtask,
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
