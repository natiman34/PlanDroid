import React, { useState } from 'react';
import type { Task } from '../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Pin,
  Timer,
  Trash2,
  Tag,
  Filter,
  X,
  Plus,
  Edit3,
  GripVertical,
  ChevronDown,
} from 'lucide-react';
import { playSuccess } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  type CustomCategory,
  getTaskCategory,
  getCategoryBadgeStyle,
  UNCATEGORIZED_CATEGORY,
} from '../utils/categoryUtils';

interface KanbanViewProps {
  tasks: Task[];
  categories: CustomCategory[];
  onToggleComplete: (taskId: string) => void;
  onPinAsActive: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenFocusModal: (task: Task) => void;
  onUpdateTaskCategory?: (taskId: string, categoryId: string) => void;
  onMoveTaskStatus?: (taskId: string, targetStatus: 'active' | 'queued' | 'completed') => void;
  onOpenCategoryManager?: () => void;
  onEditTask?: (task: Task) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  categories,
  onToggleComplete,
  onPinAsActive,
  onDeleteTask,
  onOpenFocusModal,
  onUpdateTaskCategory,
  onMoveTaskStatus,
  onOpenCategoryManager,
  onEditTask,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeCategoryDropdownTaskId, setActiveCategoryDropdownTaskId] = useState<string | null>(null);

  // Filter tasks by category if selected
  const filteredTasks = selectedCategoryId
    ? tasks.filter(t => {
        const cat = getTaskCategory(t, categories);
        return cat.id === selectedCategoryId;
      })
    : tasks;

  // Separate columns
  const activeTask = filteredTasks.find(t => !t.completed && t.startTime) || null;
  const queuedTasks = filteredTasks.filter(t => !t.completed && t.id !== activeTask?.id);
  const completedTasks = filteredTasks.filter(t => t.completed);

  const handleComplete = (taskId: string) => {
    playSuccess();
    try {
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    } catch {}
    onToggleComplete(taskId);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'active' | 'queued' | 'completed') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    if (!taskId) return;

    if (onMoveTaskStatus) {
      onMoveTaskStatus(taskId, targetStatus);
    } else {
      // Fallback status adjustment
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      if (targetStatus === 'completed' && !task.completed) {
        handleComplete(taskId);
      } else if (targetStatus !== 'completed' && task.completed) {
        onToggleComplete(taskId);
      }
      if (targetStatus === 'active') {
        onPinAsActive(taskId);
      }
    }
  };

  const renderCard = (task: Task, isHighlighted = false) => {
    const taskCat = getTaskCategory(task, categories);
    const tagStyle = getCategoryBadgeStyle(taskCat.color);
    const isDropdownOpen = activeCategoryDropdownTaskId === task.id;

    return (
      <div
        key={task.id}
        draggable
        onDragStart={e => handleDragStart(e, task.id)}
        className={`group rounded-xl p-3 border transition-all duration-150 relative cursor-grab active:cursor-grabbing select-none ${
          isHighlighted
            ? 'bg-blue-950/40 border-blue-600/60 shadow-lg shadow-blue-900/20'
            : task.completed
            ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
            : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-sm'
        }`}
      >
        {/* Header row: Category tag + Duration/Priority */}
        <div className="flex items-center justify-between text-[11px] mb-2 gap-2">
          {/* Color-Coded Category Tag */}
          <div className="relative">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryDropdownTaskId(isDropdownOpen ? null : task.id);
              }}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-all hover:brightness-110 cursor-pointer shadow-xs"
              style={tagStyle}
              title={`Category: ${taskCat.name}. Click to change.`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: taskCat.color }} />
              <span className="truncate max-w-[90px]">{taskCat.name}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </button>

            {/* Quick Category Selector Popup */}
            {isDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-30 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1.5 space-y-0.5 animate-in fade-in"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Assign Category
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (onUpdateTaskCategory) {
                          onUpdateTaskCategory(task.id, c.id);
                        }
                        setActiveCategoryDropdownTaskId(null);
                      }}
                      className={`w-full px-2.5 py-1 text-left text-xs flex items-center justify-between hover:bg-slate-800 transition cursor-pointer ${
                        taskCat.id === c.id ? 'text-white font-semibold' : 'text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      {taskCat.id === c.id && <span className="text-[10px] text-blue-400">✓</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateTaskCategory) {
                        onUpdateTaskCategory(task.id, UNCATEGORIZED_CATEGORY.id);
                      }
                      setActiveCategoryDropdownTaskId(null);
                    }}
                    className="w-full px-2.5 py-1 text-left text-xs flex items-center gap-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                    <span>Uncategorized</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[10px] text-blue-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {task.startTime || `${task.durationMinutes}m`}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                task.priority === 'urgent'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                  : task.priority === 'high'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {task.priority}
            </span>
          </div>
        </div>

        {/* Title */}
        <h5
          onClick={() => onEditTask && onEditTask(task)}
          className={`text-xs font-semibold text-slate-200 line-clamp-2 cursor-pointer hover:text-blue-300 transition ${
            task.completed ? 'line-through text-slate-500' : ''
          }`}
          title={task.title}
        >
          {task.title}
        </h5>

        {/* Card Actions Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!task.completed) {
                  handleComplete(task.id);
                } else {
                  onToggleComplete(task.id);
                }
              }}
              className="text-slate-400 hover:text-emerald-400 p-1 rounded transition cursor-pointer"
              title={task.completed ? 'Mark pending' : 'Mark complete'}
            >
              {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
            </button>
            {!task.completed && (
              <button
                onClick={() => onOpenFocusModal(task)}
                className="text-slate-400 hover:text-blue-400 p-1 rounded transition cursor-pointer"
                title="Focus timer"
              >
                <Timer className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onEditTask && (
              <button
                onClick={() => onEditTask(task)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded transition cursor-pointer"
                title="Edit task details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {!task.completed && (
              <button
                onClick={() => onPinAsActive(task.id)}
                className="text-slate-400 hover:text-blue-400 p-1 rounded transition cursor-pointer"
                title="Pin to Android Notification Bar"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDeleteTask(task.id)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded transition cursor-pointer"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Category Filter Bar & Category Manager Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold px-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filter:</span>
          </div>

          {/* All chip */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({tasks.length})
          </button>

          {/* Individual Category Chips */}
          {categories.map(cat => {
            const count = tasks.filter(t => getTaskCategory(t, categories).id === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;
            const badgeStyle = getCategoryBadgeStyle(cat.color);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-white/50 shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800'
                }`}
                style={isSelected ? badgeStyle : undefined}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className={isSelected ? '' : 'text-slate-300'}>{cat.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Clear Filter / Manage Categories Action */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Filter</span>
            </button>
          )}
          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>Categories</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Three-Column Interactive Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Active In-Progress / Pinned */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'active')}
          className="bg-slate-900/60 rounded-2xl border border-blue-900/40 p-3.5 flex flex-col transition hover:border-blue-700/60"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-900/40">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Active / Pinned
              </h4>
            </div>
            <span className="text-[11px] font-mono font-semibold text-blue-400 bg-blue-950 px-2 py-0.5 rounded">
              {activeTask ? '1 Active' : '0'}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 min-h-[140px]">
            {activeTask ? (
              renderCard(activeTask, true)
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Drag a task here or pin to notification bar.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Queued Tasks */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'queued')}
          className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3.5 flex flex-col transition hover:border-slate-700"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Queued Tasks
              </h4>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {queuedTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 max-h-[600px] overflow-y-auto pr-1 min-h-[140px]">
            {queuedTasks.length > 0 ? (
              queuedTasks.map(t => renderCard(t))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                {selectedCategoryId ? 'No tasks match this category.' : 'No tasks waiting in queue.'}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'completed')}
          className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3.5 flex flex-col transition hover:border-slate-700"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Completed
              </h4>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
              {completedTasks.length}
            </span>
          </div>

          <div className="space-y-2.5 flex-1 max-h-[600px] overflow-y-auto pr-1 min-h-[140px]">
            {completedTasks.length > 0 ? (
              completedTasks.map(t => renderCard(t))
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Completed tasks appear here. Drag tasks here to complete!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
