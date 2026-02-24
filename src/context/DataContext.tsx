'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { client, DB_ID } from '@/lib/appwrite';
import * as db from '@/lib/db';
import { computeStats } from '@/lib/utils';
import { cacheGet, cacheSetMulti, migrateFromLocalStorage, cachePrune } from '@/lib/idb-cache';
import { registerSyncListeners, registerBeaconOnUnload, createDebouncedSave } from '@/lib/background-sync';
import { registerServiceWorker } from '@/lib/sw-register';
import type { Profile, Project, Task, Subtask, ProjectWithTasks, TaskWithContext, Stats, ModalType } from '@/lib/types';

/* ===== Undo Queue Item ===== */
interface UndoItem {
    id: string;
    type: 'task' | 'project' | 'subtask';
    data: Task | Project | Subtask;
    relatedTasks?: Task[];
    relatedSubtasks?: Subtask[];
    timer: NodeJS.Timeout;
}

interface DataContextType {
    profile: Profile | null;
    projects: Project[];
    tasks: Task[];
    subtasks: Subtask[];
    // Enriched
    enrichedProjects: ProjectWithTasks[];
    stats: Stats;
    // SWR state
    isStale: boolean;
    isOnline: boolean;
    // CRUD
    refreshAll: () => Promise<void>;
    updateProfileField: (field: string, value: unknown) => Promise<void>;
    addProject: (name: string, money: number, priority: number, color: string) => Promise<string>;
    updateProjectField: (id: string, field: string, value: unknown) => Promise<void>;
    removeProject: (id: string) => Promise<void>;
    addTask: (projectId: string, name: string, priority: number, slot: number | null, slotEnd: number | null, date: string | null, clonedFrom?: string | null) => Promise<string>;
    updateTaskField: (id: string, field: string, value: unknown) => Promise<void>;
    updateTaskFieldDebounced: (id: string, field: string, value: unknown) => void;
    toggleTask: (id: string) => Promise<void>;
    moveTask: (taskId: string, fromProjectId: string, toProjectId: string) => Promise<void>;
    removeTask: (id: string) => Promise<void>;
    addSubtask: (taskId: string, name: string) => Promise<void>;
    toggleSubtask: (id: string) => Promise<void>;
    updateSubtaskField: (id: string, field: string, value: unknown) => Promise<void>;
    removeSubtask: (id: string) => Promise<void>;
    shiftPriorities: (targetPri: number, excludeId: string | null) => Promise<void>;
    // Undo
    undoDelete: (id: string) => void;
    pendingDeletes: Map<string, UndoItem>;
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
    const [isStale, setIsStale] = useState(false);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingDeletes, setPendingDeletes] = useState<Map<string, UndoItem>>(new Map());
    const initialLoadDone = useRef(false);
    // Bug #2 Fix: Track documents with in-flight writes to prevent stale overwrites
    const pendingWrites = useRef<Set<string>>(new Set());
    const lastWriteTime = useRef<number>(0);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    }, []);

    /* ===== SERVICE WORKER + BACKGROUND SYNC REGISTRATION ===== */
    useEffect(() => {
        registerServiceWorker();
        const unregisterSync = registerSyncListeners();

        // Online/offline tracking
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Prune expired cache entries periodically (every 30 min)
        const pruneInterval = setInterval(() => {
            cachePrune().catch(() => { /* ignore */ });
        }, 30 * 60 * 1000);

        return () => {
            unregisterSync();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(pruneInterval);
        };
    }, []);

    /* ===== BEACON ON UNLOAD — save pending state ===== */
    useEffect(() => {
        if (!user) return;
        const unregisterBeacon = registerBeaconOnUnload(
            () => '/api/sync', // beacon endpoint (future)
            () => {
                if (pendingWrites.current.size === 0) return null;
                return {
                    userId: user.$id,
                    pendingIds: Array.from(pendingWrites.current),
                    timestamp: Date.now(),
                };
            }
        );
        return unregisterBeacon;
    }, [user]);

    /* ===== IndexedDB CACHE HELPERS ===== */
    const saveCacheIDB = useCallback(async (userId: string, p: Project[], t: Task[], s: Subtask[], prof?: Profile | null) => {
        const entries: Array<{ key: string; value: unknown; ttl: number }> = [
            { key: `projects_${userId}`, value: p, ttl: 86400000 },
            { key: `tasks_${userId}`, value: t, ttl: 86400000 },
            { key: `subtasks_${userId}`, value: s, ttl: 86400000 },
        ];
        if (prof) {
            entries.push({ key: `profile_${userId}`, value: prof, ttl: 86400000 });
        }
        await cacheSetMulti(entries);
    }, []);

    /* ===== LOAD ALL DATA (SWR: Stale-While-Revalidate) ===== */
    const refreshAll = useCallback(async () => {
        if (!user) return;

        // Phase 1: Load from IndexedDB cache first for instant UI (only on first load)
        if (!initialLoadDone.current) {
            // One-time migration from localStorage → IndexedDB
            await migrateFromLocalStorage(user.$id);

            const [cachedProfile, cachedProj, cachedTasks, cachedSub] = await Promise.all([
                cacheGet<Profile>(`profile_${user.$id}`),
                cacheGet<Project[]>(`projects_${user.$id}`),
                cacheGet<Task[]>(`tasks_${user.$id}`),
                cacheGet<Subtask[]>(`subtasks_${user.$id}`),
            ]);

            if (cachedProfile && cachedProj && cachedTasks) {
                setProfile(cachedProfile);
                setProjects(cachedProj);
                setTasks(cachedTasks);
                setSubtasks(cachedSub || []);
                setDataLoading(false);
                setIsStale(true); // Mark as stale — background refresh coming
            } else {
                setDataLoading(true);
            }
        }

        // Phase 2: Fetch fresh data from Appwrite (background if cache was shown)
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
                    gameMode: true,
                    questView: 'card',
                    boardView: 'card',
                    mapView: 'calendar',
                    showSubtasks: true,
                    showPriority: true,
                    showTimeBlocks: true,
                    showProgress: true,
                    showStats: true,
                    showStreak: true,
                    showXP: true,
                    showAchievements: false,
                    accentColor: '#FF4500',
                    cardStyle: 'glass',
                    fontSize: 'medium',
                    compactMode: false,
                    animationsEnabled: true,
                });
                setProfile(newProfile);
            } else {
                setProfile(p);
            }
            // Bug #2 Fix: Don't overwrite data for entities with pending writes
            const hasPending = pendingWrites.current.size > 0;
            if (hasPending) {
                // Merge: keep local state for pending items, update everything else
                setProjects(prev => {
                    const pendingIds = new Set([...pendingWrites.current].filter(id => prev.some(p => p.$id === id)));
                    if (pendingIds.size === 0) return projs;
                    const kept = prev.filter(p => pendingIds.has(p.$id));
                    const fresh = projs.filter(p => !pendingIds.has(p.$id));
                    return [...fresh, ...kept].sort((a, b) => a.priority - b.priority);
                });
                setTasks(prev => {
                    const pendingIds = new Set([...pendingWrites.current].filter(id => prev.some(t => t.$id === id)));
                    if (pendingIds.size === 0) return tks;
                    const kept = prev.filter(t => pendingIds.has(t.$id));
                    const fresh = tks.filter(t => !pendingIds.has(t.$id));
                    return [...fresh, ...kept];
                });
                setSubtasks(prev => {
                    const pendingIds = new Set([...pendingWrites.current].filter(id => prev.some(s => s.$id === id)));
                    if (pendingIds.size === 0) return subs;
                    const kept = prev.filter(s => pendingIds.has(s.$id));
                    const fresh = subs.filter(s => !pendingIds.has(s.$id));
                    return [...fresh, ...kept];
                });
            } else {
                setProjects(projs);
                setTasks(tks);
                setSubtasks(subs);
            }
            initialLoadDone.current = true;
            setIsStale(false); // Data is now fresh
            // Cache in IndexedDB (background, non-blocking)
            saveCacheIDB(user.$id, projs, tks, subs, p || undefined).catch(() => { /* ignore */ });
        } catch (err) {
            console.error('Failed to load data:', err);
            // If we showed cached data, keep it — just mark as stale
            if (!initialLoadDone.current) {
                setIsStale(true);
            }
        } finally {
            setDataLoading(false);
        }
    }, [user, saveCacheIDB]);

    useEffect(() => { if (user) refreshAll(); }, [user, refreshAll]);

    /* ===== REALTIME — debounced, write-aware, with WebSocket error protection ===== */
    useEffect(() => {
        if (!user) return;
        const channel = `databases.${DB_ID}.collections.*.documents`;
        let debounceTimer: NodeJS.Timeout;
        let unsub: (() => void) | null = null;
        const setupSub = () => {
            try {
                unsub = client.subscribe(channel, () => {
                    clearTimeout(debounceTimer);
                    // Bug #2 Fix: Skip refresh entirely if a write happened very recently (< 2s ago)
                    const timeSinceWrite = Date.now() - lastWriteTime.current;
                    const delay = timeSinceWrite < 2000 ? 5000 : 4000; // longer delay if write just happened
                    debounceTimer = setTimeout(() => {
                        refreshAll();
                    }, delay);
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

    /* ===== AUTO-SAVE CACHE on any state change (IndexedDB) ===== */
    const cacheReady = useRef(false);
    useEffect(() => {
        if (!user || !initialLoadDone.current) return;
        if (!cacheReady.current) { cacheReady.current = true; return; }
        // Debounce cache writes to avoid thrashing
        const timer = setTimeout(() => {
            saveCacheIDB(user.$id, projects, tasks, subtasks, profile).catch(() => { /* ignore */ });
        }, 500);
        return () => clearTimeout(timer);
    }, [user, projects, tasks, subtasks, profile, saveCacheIDB]);

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
    // Bug #2 Fix: Helper to track write lifecycle
    const trackWrite = (docId: string, writePromise: Promise<void>) => {
        pendingWrites.current.add(docId);
        lastWriteTime.current = Date.now();
        writePromise
            .catch(() => {
                showToast('Failed to save — reverting');
                refreshAll();
            })
            .finally(() => {
                pendingWrites.current.delete(docId);
            });
    };

    const updateProfileField = async (field: string, value: unknown) => {
        if (!profile) return;
        // Optimistic
        setProfile(prev => prev ? { ...prev, [field]: value } : prev);
        // Background sync with write tracking
        trackWrite(profile.$id, db.updateProfile(profile.$id, { [field]: value } as Partial<Profile>));
    };

    const addProject = async (name: string, money: number, priority: number, color: string): Promise<string> => {
        if (!user) return '';
        const proj = await db.createProject({ userId: user.$id, name, money, priority, color });
        setProjects(prev => [...prev, proj]);
        return proj.$id;
    };

    const updateProjectField = async (id: string, field: string, value: unknown) => {
        setProjects(prev => prev.map(p => p.$id === id ? { ...p, [field]: value } : p));
        trackWrite(id, db.updateProject(id, { [field]: value } as Partial<Project>));
    };

    /* ===== OPTIMISTIC DELETE WITH UNDO ===== */
    const UNDO_DELAY = 3000; // 3 seconds to undo

    const removeProject = async (id: string) => {
        if (!user) return;
        const project = projects.find(p => p.$id === id);
        if (!project) return;

        const removedTasks = tasks.filter(t => t.projectId === id);
        const removedTaskIds = new Set(removedTasks.map(t => t.$id));
        const removedSubtasks = subtasks.filter(s => removedTaskIds.has(s.taskId));

        // Optimistic remove from UI
        setProjects(prev => prev.filter(p => p.$id !== id));
        setTasks(prev => prev.filter(t => t.projectId !== id));
        setSubtasks(prev => prev.filter(s => !removedTaskIds.has(s.taskId)));

        // Create undo entry
        const undoTimer = setTimeout(() => {
            // Actually delete from DB
            Promise.all([
                db.deleteTasksForProject(user.$id, id),
                db.deleteProject(id),
            ]).catch(() => {
                showToast('Failed to delete — reverting');
                refreshAll();
            });
            setPendingDeletes(prev => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        }, UNDO_DELAY);

        const undoItem: UndoItem = {
            id,
            type: 'project',
            data: project,
            relatedTasks: removedTasks,
            relatedSubtasks: removedSubtasks,
            timer: undoTimer,
        };

        setPendingDeletes(prev => {
            const next = new Map(prev);
            next.set(id, undoItem);
            return next;
        });

        showToast(`Project deleted — tap to undo`);
    };

    const removeTask = async (id: string) => {
        if (!user) return;
        const task = tasks.find(t => t.$id === id);
        if (!task) return;

        const removedSubtasks = subtasks.filter(s => s.taskId === id);

        // Optimistic remove
        setTasks(prev => prev.filter(t => t.$id !== id));
        setSubtasks(prev => prev.filter(s => s.taskId !== id));

        // Create undo entry
        const undoTimer = setTimeout(() => {
            Promise.all([
                db.deleteSubtasksForTask(user.$id, id),
                db.deleteTask(id),
            ]).catch(() => {
                showToast('Failed to delete');
                refreshAll();
            });
            setPendingDeletes(prev => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        }, UNDO_DELAY);

        const undoItem: UndoItem = {
            id,
            type: 'task',
            data: task,
            relatedSubtasks: removedSubtasks,
            timer: undoTimer,
        };

        setPendingDeletes(prev => {
            const next = new Map(prev);
            next.set(id, undoItem);
            return next;
        });

        showToast(`Task deleted — tap to undo`);
    };

    const removeSubtask = async (id: string) => {
        const sub = subtasks.find(s => s.$id === id);
        if (!sub) return;

        // Optimistic remove
        setSubtasks(prev => prev.filter(s => s.$id !== id));

        // Create undo entry
        const undoTimer = setTimeout(() => {
            db.deleteSubtask(id).catch(() => {
                showToast('Failed to delete');
                refreshAll();
            });
            setPendingDeletes(prev => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
        }, UNDO_DELAY);

        const undoItem: UndoItem = {
            id,
            type: 'subtask',
            data: sub,
            timer: undoTimer,
        };

        setPendingDeletes(prev => {
            const next = new Map(prev);
            next.set(id, undoItem);
            return next;
        });
    };

    /* ===== UNDO DELETE ===== */
    const undoDelete = useCallback((id: string) => {
        const item = pendingDeletes.get(id);
        if (!item) return;

        // Cancel the pending DB delete
        clearTimeout(item.timer);

        // Restore data to state
        if (item.type === 'project') {
            setProjects(prev => [...prev, item.data as Project].sort((a, b) => a.priority - b.priority));
            if (item.relatedTasks) {
                setTasks(prev => [...prev, ...item.relatedTasks!]);
            }
            if (item.relatedSubtasks) {
                setSubtasks(prev => [...prev, ...item.relatedSubtasks!]);
            }
        } else if (item.type === 'task') {
            setTasks(prev => [...prev, item.data as Task]);
            if (item.relatedSubtasks) {
                setSubtasks(prev => [...prev, ...item.relatedSubtasks!]);
            }
        } else if (item.type === 'subtask') {
            setSubtasks(prev => [...prev, item.data as Subtask]);
        }

        // Remove from pending
        setPendingDeletes(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });

        showToast('Restored!');
    }, [pendingDeletes, showToast]);

    const addTask = async (projectId: string, name: string, priority: number, slot: number | null, slotEnd: number | null, date: string | null, clonedFrom: string | null = null): Promise<string> => {
        if (!user) return '';
        const task = await db.createTask({ userId: user.$id, projectId, name, priority, done: false, status: 'default', slot, slotEnd, date, clonedFrom });
        setTasks(prev => [...prev, task]);
        return projectId;
    };

    const updateTaskField = async (id: string, field: string, value: unknown) => {
        // Optimistic — use prev => to get latest state (critical for rapid sequential calls)
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, [field]: value } : t));
        trackWrite(id, db.updateTask(id, { [field]: value } as Partial<Task>));
    };

    /* ===== DEBOUNCED TASK FIELD SAVE (for text inputs) ===== */
    const debouncedTaskSave = useMemo(
        () => createDebouncedSave(
            async (id: string, field: string, value: unknown) => {
                trackWrite(id, db.updateTask(id, { [field]: value } as Partial<Task>));
            },
            400
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const updateTaskFieldDebounced = useCallback((id: string, field: string, value: unknown) => {
        // Update UI immediately
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, [field]: value } : t));
        // Debounce the DB write
        debouncedTaskSave(id, field, value);
    }, [debouncedTaskSave]);

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.$id === id);
        if (!task) return;
        const taskSubs = subtasks.filter(s => s.taskId === id);
        if (taskSubs.length > 0 && !task.done) {
            const allDone = taskSubs.every(s => s.done);
            if (!allDone) { showToast('Please complete all subtasks first!'); return; }
        }
        setTasks(prev => prev.map(t => t.$id === id ? { ...t, done: !t.done } : t));
        trackWrite(id, db.updateTask(id, { done: !task.done }));
    };

    const moveTask = async (taskId: string, _fromProjectId: string, toProjectId: string) => {
        setTasks(prev => prev.map(t => t.$id === taskId ? { ...t, projectId: toProjectId } : t));
        trackWrite(taskId, db.updateTask(taskId, { projectId: toProjectId }));
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
        trackWrite(id, db.updateSubtask(id, { done: newDone }));
    };

    const updateSubtaskField = async (id: string, field: string, value: unknown) => {
        setSubtasks(prev => prev.map(s => s.$id === id ? { ...s, [field]: value } : s));
        trackWrite(id, db.updateSubtask(id, { [field]: value } as Partial<Subtask>));
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
            isStale, isOnline,
            refreshAll, updateProfileField,
            addProject, updateProjectField, removeProject,
            addTask, updateTaskField, updateTaskFieldDebounced, toggleTask, moveTask, removeTask,
            addSubtask, toggleSubtask, updateSubtaskField, removeSubtask,
            shiftPriorities,
            undoDelete, pendingDeletes,
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
