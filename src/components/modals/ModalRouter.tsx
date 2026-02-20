'use client';
import { useData } from '@/context/DataContext';
import AddProjectModal from '@/components/modals/AddProjectModal';
import AddTaskModal from '@/components/modals/AddTaskModal';
import AddSubtaskModal from '@/components/modals/AddSubtaskModal';
import EditTaskModal from '@/components/modals/EditTaskModal';
import ProjectDetailModal from '@/components/modals/ProjectDetailModal';
import AssignTaskModal from '@/components/modals/AssignTaskModal';

export default function ModalRouter() {
    const { modal } = useData();

    if (!modal) return null;
    if (modal.type === 'fabMenu') return null; // FAB menu is handled in layout

    switch (modal.type) {
        case 'addProject':
            return <AddProjectModal />;
        case 'addTask':
            return <AddTaskModal returnTo={modal.returnTo} preSlot={modal.preSlot} preDate={modal.preDate} />;
        case 'addSubtask':
            return <AddSubtaskModal />;
        case 'editTask':
            return <EditTaskModal pid={modal.pid} tid={modal.tid} returnTo={modal.returnTo} />;
        case 'projectDetail':
            return <ProjectDetailModal pid={modal.pid} />;
        case 'assignTask':
            return <AssignTaskModal preSlot={modal.preSlot} preDate={modal.preDate} />;
        default:
            return null;
    }
}
