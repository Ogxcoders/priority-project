import { ID, Query } from 'appwrite';
import { databases, DB_ID, COLLECTIONS } from './appwrite';
import type { Profile, Project, Task, Subtask } from './types';

/* ==========================================================
   PROFILES
========================================================== */
export async function getProfile(userId: string): Promise<Profile | null> {
    try {
        const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROFILES, [
            Query.equal('userId', userId),
            Query.limit(1),
        ]);
        return res.documents[0] as unknown as Profile ?? null;
    } catch { return null; }
}

export async function createProfile(data: Omit<Profile, '$id'>): Promise<Profile> {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.PROFILES, ID.unique(), data, [
        `read("user:${data.userId}")`,
        `update("user:${data.userId}")`,
        `delete("user:${data.userId}")`,
    ]);
    return doc as unknown as Profile;
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
    const { $id, ...rest } = data as Record<string, unknown>;
    void $id;
    await databases.updateDocument(DB_ID, COLLECTIONS.PROFILES, id, rest);
}

/* ==========================================================
   PROJECTS
========================================================== */
export async function getProjects(userId: string): Promise<Project[]> {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.PROJECTS, [
        Query.equal('userId', userId),
        Query.orderAsc('priority'),
        Query.limit(100),
    ]);
    return res.documents as unknown as Project[];
}

export async function createProject(data: Omit<Project, '$id'>): Promise<Project> {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.PROJECTS, ID.unique(), data, [
        `read("user:${data.userId}")`,
        `update("user:${data.userId}")`,
        `delete("user:${data.userId}")`,
    ]);
    return doc as unknown as Project;
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
    const { $id, ...rest } = data as Record<string, unknown>;
    void $id;
    await databases.updateDocument(DB_ID, COLLECTIONS.PROJECTS, id, rest);
}

export async function deleteProject(id: string): Promise<void> {
    await databases.deleteDocument(DB_ID, COLLECTIONS.PROJECTS, id);
}

/* ==========================================================
   TASKS
========================================================== */
export async function getTasks(userId: string): Promise<Task[]> {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.TASKS, [
        Query.equal('userId', userId),
        Query.limit(500),
    ]);
    return res.documents as unknown as Task[];
}

export async function createTask(data: Omit<Task, '$id'>): Promise<Task> {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.TASKS, ID.unique(), data, [
        `read("user:${data.userId}")`,
        `update("user:${data.userId}")`,
        `delete("user:${data.userId}")`,
    ]);
    return doc as unknown as Task;
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
    const { $id, ...rest } = data as Record<string, unknown>;
    void $id;
    await databases.updateDocument(DB_ID, COLLECTIONS.TASKS, id, rest);
}

export async function deleteTask(id: string): Promise<void> {
    await databases.deleteDocument(DB_ID, COLLECTIONS.TASKS, id);
}

/* ==========================================================
   SUBTASKS
========================================================== */
export async function getSubtasks(userId: string): Promise<Subtask[]> {
    const res = await databases.listDocuments(DB_ID, COLLECTIONS.SUBTASKS, [
        Query.equal('userId', userId),
        Query.limit(1000),
    ]);
    return res.documents as unknown as Subtask[];
}

export async function createSubtask(data: Omit<Subtask, '$id'>): Promise<Subtask> {
    const doc = await databases.createDocument(DB_ID, COLLECTIONS.SUBTASKS, ID.unique(), data, [
        `read("user:${data.userId}")`,
        `update("user:${data.userId}")`,
        `delete("user:${data.userId}")`,
    ]);
    return doc as unknown as Subtask;
}

export async function updateSubtask(id: string, data: Partial<Subtask>): Promise<void> {
    const { $id, ...rest } = data as Record<string, unknown>;
    void $id;
    await databases.updateDocument(DB_ID, COLLECTIONS.SUBTASKS, id, rest);
}

export async function deleteSubtask(id: string): Promise<void> {
    await databases.deleteDocument(DB_ID, COLLECTIONS.SUBTASKS, id);
}

/* ==========================================================
   BULK OPERATIONS (parallelized for speed)
========================================================== */
export async function deleteTasksForProject(userId: string, projectId: string): Promise<void> {
    const tasks = await databases.listDocuments(DB_ID, COLLECTIONS.TASKS, [
        Query.equal('userId', userId),
        Query.equal('projectId', projectId),
        Query.limit(500),
    ]);
    // Fetch all subtasks for all tasks in parallel
    const subResults = await Promise.all(
        tasks.documents.map(t =>
            databases.listDocuments(DB_ID, COLLECTIONS.SUBTASKS, [
                Query.equal('userId', userId),
                Query.equal('taskId', t.$id),
                Query.limit(500),
            ])
        )
    );
    // Delete all subtasks in parallel
    const allSubs = subResults.flatMap(r => r.documents);
    await Promise.all(allSubs.map(s => databases.deleteDocument(DB_ID, COLLECTIONS.SUBTASKS, s.$id)));
    // Delete all tasks in parallel
    await Promise.all(tasks.documents.map(t => databases.deleteDocument(DB_ID, COLLECTIONS.TASKS, t.$id)));
}

export async function deleteSubtasksForTask(userId: string, taskId: string): Promise<void> {
    const subs = await databases.listDocuments(DB_ID, COLLECTIONS.SUBTASKS, [
        Query.equal('userId', userId),
        Query.equal('taskId', taskId),
        Query.limit(500),
    ]);
    await Promise.all(subs.documents.map(s => databases.deleteDocument(DB_ID, COLLECTIONS.SUBTASKS, s.$id)));
}
