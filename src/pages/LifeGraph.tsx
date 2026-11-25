import { useEffect, useState, useCallback, useRef } from 'react';
import {
  GitBranch, Plus, Trash2, X, ArrowRight, AlertTriangle, CheckCircle2,
  Circle, Clock, Mail, Lock,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { listTasks, listDependencies, addDependency, removeDependency } from '@/lib/services';
import { Task, TaskDependency, TaskStatus, TASK_STATUS_META } from '@/lib/types';
import { cn, daysUntil, formatDate } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  not_started: Circle,
  in_progress: Clock,
  waiting: Mail,
  completed: CheckCircle2,
};

interface GraphNode {
  task: Task;
  x: number;
  y: number;
  prereqs: string[];
  dependents: string[];
  blocked: boolean;
}

export function LifeGraph() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deps, setDeps] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [depMode, setDepMode] = useState(false);
  const [depTarget, setDepTarget] = useState<Task | null>(null);
  const [showAddDep, setShowAddDep] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, d] = await Promise.all([listTasks(), listDependencies()]);
      setTasks(t);
      setDeps(d);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not load graph.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Build graph layout
  const nodes: GraphNode[] = (() => {
    if (tasks.length === 0) return [];
    const prereqMap = new Map<string, string[]>();
    const dependentMap = new Map<string, string[]>();
    for (const d of deps) {
      const pArr = prereqMap.get(d.task_id) || [];
      pArr.push(d.prerequisite_task_id);
      prereqMap.set(d.task_id, pArr);
      const dArr = dependentMap.get(d.prerequisite_task_id) || [];
      dArr.push(d.task_id);
      dependentMap.set(d.prerequisite_task_id, dArr);
    }

    // Topological sort to determine levels
    const levelMap = new Map<string, number>();
    const visited = new Set<string>();
    function getLevel(id: string): number {
      if (levelMap.has(id)) return levelMap.get(id)!;
      if (visited.has(id)) return 0;
      visited.add(id);
      const prereqs = prereqMap.get(id) || [];
      if (prereqs.length === 0) { levelMap.set(id, 0); return 0; }
      const maxPrereqLevel = Math.max(...prereqs.map(p => getLevel(p)));
      const level = maxPrereqLevel + 1;
      levelMap.set(id, level);
      return level;
    }
    for (const t of tasks) getLevel(t.id);

    // Group by level
    const levels = new Map<number, string[]>();
    for (const t of tasks) {
      const lvl = levelMap.get(t.id) || 0;
      const arr = levels.get(lvl) || [];
      arr.push(t.id);
      levels.set(lvl, arr);
    }

    const maxLevel = Math.max(...Array.from(levels.keys()), 0);
    const colWidth = 240;
    const rowHeight = 100;
    const nodeMap = new Map<string, GraphNode>();

    for (const t of tasks) {
      const lvl = levelMap.get(t.id) || 0;
      const lvlTasks = levels.get(lvl) || [];
      const idx = lvlTasks.indexOf(t.id);
      const totalInLevel = lvlTasks.length;
      const yOffset = (idx - (totalInLevel - 1) / 2) * rowHeight;
      const prereqs = prereqMap.get(t.id) || [];
      const blocked = prereqs.some(pid => {
        const pt = tasks.find(tk => tk.id === pid);
        return pt && pt.status !== 'completed';
      });
      nodeMap.set(t.id, {
        task: t,
        x: 60 + lvl * colWidth,
        y: 200 + yOffset,
        prereqs,
        dependents: dependentMap.get(t.id) || [],
        blocked,
      });
    }
    return Array.from(nodeMap.values());
  })();

  const nodeById = new Map(nodes.map(n => [n.task.id, n]));

  async function handleAddDependency(taskId: string, prereqId: string) {
    if (taskId === prereqId) { toast('A task cannot depend on itself.', 'error'); return; }
    const exists = deps.some(d => d.task_id === taskId && d.prerequisite_task_id === prereqId);
    if (exists) { toast('This dependency already exists.', 'info'); return; }
    try {
      await addDependency(taskId, prereqId);
      await load();
      toast('Dependency added.', 'success');
      setShowAddDep(false);
      setDepTarget(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add dependency.', 'error');
    }
  }

  async function handleRemoveDependency(depId: string) {
    try {
      await removeDependency(depId);
      setDeps(prev => prev.filter(d => d.id !== depId));
      toast('Dependency removed.', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove dependency.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="card">
          <EmptyState
            icon={<GitBranch size={28} />}
            title="No tasks to graph"
            description="Create tasks in the Action Center first. Then you can visualize and manage their dependencies here."
          />
        </div>
      </div>
    );
  }

  const svgWidth = Math.max(...nodes.map(n => n.x)) + 220;
  const svgHeight = Math.max(...nodes.map(n => n.y)) + 120;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-espresso">LifeGraph</h2>
          <p className="text-taupe text-sm mt-1">Visualize task dependencies and identify blocked work.</p>
        </div>
        <button className="btn-gold" onClick={() => setShowAddDep(true)}>
          <Plus size={16} /> <span className="hidden sm:inline">Add dependency</span>
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap text-xs text-taupe">
        <span className="inline-flex items-center gap-1.5"><Circle size={12} /> Not started</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={12} className="text-sage" /> In progress</span>
        <span className="inline-flex items-center gap-1.5"><Mail size={12} className="text-champagne-dark" /> Waiting</span>
        <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={12} className="text-espresso" /> Completed</span>
        <span className="inline-flex items-center gap-1.5"><AlertTriangle size={12} className="text-rose" /> Blocked</span>
      </div>

      {/* Graph */}
      <div className="card p-2 sm:p-4 overflow-x-auto">
        <svg ref={svgRef} width={svgWidth} height={svgHeight} className="min-w-full" style={{ minWidth: svgWidth }}>
          {/* Edges */}
          {deps.map(dep => {
            const from = nodeById.get(dep.prerequisite_task_id);
            const to = nodeById.get(dep.task_id);
            if (!from || !to) return null;
            const isBlocking = from.task.status !== 'completed';
            const midX = (from.x + 160 + to.x) / 2;
            return (
              <g key={dep.id}>
                <path
                  d={`M ${from.x + 160} ${from.y + 28} C ${midX} ${from.y + 28}, ${midX} ${to.y + 28}, ${to.x} ${to.y + 28}`}
                  fill="none"
                  stroke={isBlocking ? '#C58F87' : '#A99C8B'}
                  strokeWidth={2}
                  strokeDasharray={isBlocking ? '5,3' : 'none'}
                  opacity={0.6}
                />
                <polygon
                  points={`${to.x - 2},${to.y + 24} ${to.x - 2},${to.y + 32} ${to.x + 6},${to.y + 28}`}
                  fill={isBlocking ? '#C58F87' : '#A99C8B'}
                  opacity={0.7}
                />
              </g>
            );
          })}
          {/* Nodes */}
          {nodes.map(n => {
            const Icon = STATUS_ICONS[n.task.status];
            const meta = TASK_STATUS_META[n.task.status];
            const days = daysUntil(n.task.deadline);
            return (
              <g
                key={n.task.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedTask(n.task)}
              >
                <rect
                  width={160}
                  height={56}
                  rx={12}
                  fill="white"
                  stroke={n.blocked ? '#C58F87' : '#E5E0D8'}
                  strokeWidth={n.blocked ? 2 : 1}
                  className="transition-filter"
                />
                <g transform="translate(12, 18)">
                  <Icon size={16} className={meta.color} />
                </g>
                <text x={36} y={24} className="fill-espresso" style={{ fontSize: 12, fontWeight: 600 }}>
                  {n.task.title.length > 20 ? n.task.title.slice(0, 20) + '…' : n.task.title}
                </text>
                <text x={36} y={40} className="fill-taupe" style={{ fontSize: 10 }}>
                  {days !== null && days < 0 ? `Overdue` : days !== null && days <= 7 ? `Due in ${days}d` : n.task.deadline ? formatDate(n.task.deadline) : 'No deadline'}
                </text>
                {n.blocked && (
                  <g transform="translate(140, 10)">
                    <AlertTriangle size={14} fill="#C58F87" stroke="white" strokeWidth={1.5} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dependency list */}
      {deps.length > 0 && (
        <div className="card p-5 mt-5">
          <h3 className="font-serif text-lg text-espresso mb-3">Dependencies ({deps.length})</h3>
          <div className="space-y-2">
            {deps.map(dep => {
              const task = tasks.find(t => t.id === dep.task_id);
              const prereq = tasks.find(t => t.id === dep.prerequisite_task_id);
              if (!task || !prereq) return null;
              const isBlocking = prereq.status !== 'completed';
              return (
                <div key={dep.id} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-ivory-2/40">
                  <span className="text-sm text-espresso truncate flex-1">{prereq.title}</span>
                  <ArrowRight size={14} className={cn('shrink-0', isBlocking ? 'text-rose' : 'text-taupe')} />
                  <span className="text-sm text-espresso truncate flex-1">{task.title}</span>
                  {isBlocking && <AlertTriangle size={14} className="text-rose shrink-0" />}
                  <button onClick={() => handleRemoveDependency(dep.id)} className="p-1 rounded text-taupe hover:text-rose transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task details" size="sm">
          <div className="space-y-3">
            <div>
              <p className="label">Title</p>
              <p className="text-sm text-espresso">{selectedTask.title}</p>
            </div>
            {selectedTask.description && (
              <div>
                <p className="label">Description</p>
                <p className="text-sm text-espresso/80">{selectedTask.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="label">Status</p>
                <p className="text-sm text-espresso">{TASK_STATUS_META[selectedTask.status].label}</p>
              </div>
              <div>
                <p className="label">Priority</p>
                <p className="text-sm text-espresso capitalize">{selectedTask.priority}</p>
              </div>
            </div>
            {selectedTask.deadline && (
              <div>
                <p className="label">Deadline</p>
                <p className="text-sm text-espresso">{formatDate(selectedTask.deadline)}</p>
              </div>
            )}
            {selectedTask.source_evidence && (
              <div className="rounded-lg bg-ivory-2/60 p-3">
                <p className="label">Source evidence</p>
                <p className="text-xs text-espresso/80 italic">{selectedTask.source_evidence}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add dependency modal */}
      <AddDependencyModal
        open={showAddDep}
        onClose={() => { setShowAddDep(false); setDepTarget(null); }}
        tasks={tasks}
        deps={deps}
        depTarget={depTarget}
        onSetTarget={setDepTarget}
        onAdd={handleAddDependency}
      />
    </div>
  );
}

function AddDependencyModal({ open, onClose, tasks, deps, depTarget, onSetTarget, onAdd }: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  deps: TaskDependency[];
  depTarget: Task | null;
  onSetTarget: (t: Task | null) => void;
  onAdd: (taskId: string, prereqId: string) => void;
}) {
  const [prereqId, setPrereqId] = useState('');

  useEffect(() => { if (open) setPrereqId(''); }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add dependency"
      size="sm"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!depTarget || !prereqId} onClick={() => depTarget && onAdd(depTarget.id, prereqId)}>
            Add dependency
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Task (the one that is blocked)</label>
          <select className="input" value={depTarget?.id || ''} onChange={e => {
            const t = tasks.find(t => t.id === e.target.value);
            onSetTarget(t || null);
          }}>
            <option value="">Select a task…</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Prerequisite (must be completed first)</label>
          <select className="input" value={prereqId} onChange={e => setPrereqId(e.target.value)}>
            <option value="">Select a prerequisite…</option>
            {tasks.filter(t => t.id !== depTarget?.id).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        {depTarget && prereqId && deps.some(d => d.task_id === depTarget.id && d.prerequisite_task_id === prereqId) && (
          <p className="text-xs text-champagne-dark inline-flex items-center gap-1.5"><AlertTriangle size={12} /> This dependency already exists.</p>
        )}
        <div className="rounded-lg bg-ivory-2/60 p-3 text-xs text-taupe">
          <p className="flex items-center gap-1.5"><Lock size={12} /> The task will be marked as blocked until its prerequisite is completed.</p>
        </div>
      </div>
    </Modal>
  );
}
