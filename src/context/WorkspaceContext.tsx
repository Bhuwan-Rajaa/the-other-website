import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Availability, Memory, Milestone, Status } from '../types';
import { today } from '../utils/dates';

export type Editor = { type: 'memory'; date: string; status: Status; memory?: Memory } |
  { type: 'availability'; date: string; entry?: Availability } |
  { type: 'milestone'; milestone?: Milestone } | null;
interface WorkspaceState {
  editor: Editor; closeEditor: () => void; revision: number; changed: (message: string) => void;
  openMemory: (date?: string, status?: Status, memory?: Memory) => void;
  openAvailability: (date?: string, entry?: Availability) => void;
  openMilestone: (milestone?: Milestone) => void;
  toast: string;
}
const WorkspaceContext = createContext<WorkspaceState>(null!);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState<Editor>(null);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 5000); return () => clearTimeout(id); }, [toast]);
  return <WorkspaceContext.Provider value={{ editor, closeEditor: () => setEditor(null), revision, toast,
    changed: message => { setRevision(n => n + 1); setToast(message); },
    openMemory: (date = today(), status = 'completed', memory) => setEditor({ type: 'memory', date, status, memory }),
    openAvailability: (date = today(), entry) => setEditor({ type: 'availability', date, entry }),
    openMilestone: milestone => setEditor({ type: 'milestone', milestone }),
  }}>{children}</WorkspaceContext.Provider>;
}
export const useWorkspace = () => useContext(WorkspaceContext);
