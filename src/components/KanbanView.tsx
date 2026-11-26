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
import { t } from '../utils/i18n';
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
            ? 'bg-blue-900/30 border-blue-500/60 shadow-lg shadow-blue-500/20'
            : task.completed
            ? 'bg-surface-hover border-border-default opacity-60'
            : 'bg-surface-panel border-border-default hover:border-border-focused hover:shadow-md'
        }`}
      >
        {/* Header row: Category tag + Duration/Priority */}
        <div className="flex items-center justify-between text-[9px] mb-1.5 gap-2">
          {/* Color-Coded Category Tag */}
          <div className="relative">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveCategoryDropdownTaskId(isDropdownOpen ? null : task.id);
              }}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 transition-all hover:brightness-110 cursor-pointer"
              style={tagStyle}
              title={`Category: ${taskCat.name}. Click to change.`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: taskCat.color }} />
              <span className="truncate max-w-[80px]">{taskCat.name}</span>
              <ChevronDown className="w-2 h-2 opacity-60 shrink-0" />
            </button>

            {/* Quick Category Selector Popup */}
            {isDropdownOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-30 w-44 rounded-xl border border-border-default bg-surface-panel shadow-xl py-1.5 space-y-0.5 animatefadein"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-2.5 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider border-b border-border-default">
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
                      className={`w-full px-2.5 py-1 text-left text-[9px] flex items-center justify-between transition cursor-pointer ${
                        taskCat.id === c.id ? 'text-emerald-400 font-semibold bg-emerald-900/20' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </span>
                      {taskCat.id === c.id && <span className="text-[9px] text-emerald-400">✓</span>}
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
                    className="w-full px-2.5 py-1 text-left text-[9px] flex items-center gap-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-text-muted shrink-0" />
                    <span>Uncategorized</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="font-mono text-[9px] text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-500/30">
              {task.startTime || `${task.durationMinutes}m`}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                task.priority === 'urgent'
                  ? 'bg-rose-900 text-rose-400 border border-rose-800/50'
                  : task.priority === 'high'
                  ? 'bg-amber-900 text-amber-400 border border-amber-800/50'
                  : 'bg-surface-hover text-text-muted border border-border-default'
              }`}
            >
              {task.priority}
            </span>
          </div>
        </div>

        {/* Title */}
        <h5
          onClick={() => onEditTask && onEditTask(task)}
          className={`text-sm font-semibold text-text-primary line-clamp-2 cursor-pointer hover:text-blue-400 transition ${
            task.completed ? 'line-through text-text-muted' : ''
          }`}
          title={task.title}
        >
          {task.title}
        </h5>

        {/* Card Actions Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-border-default text-[9px]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (!task.completed) {
                  handleComplete(task.id);
                } else {
                  onToggleComplete(task.id);
                }
              }}
              className="text-text-muted hover:text-emerald-400 p-1.5 rounded transition cursor-pointer"
              title={task.completed ? 'Mark pending' : 'Mark complete'}
            >
              {task.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
            </button>
            {!task.completed && (
              <button
                onClick={() => onOpenFocusModal(task)}
                className="text-text-muted hover:text-blue-400 p-1.5 rounded transition cursor-pointer"
                title={t('focusTimer', 'en')}
              >
                <Timer className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onEditTask && (
              <button
                onClick={() => onEditTask(task)}
                className="text-text-muted hover:text-text-primary p-1.5 rounded transition cursor-pointer"
                title="Edit task details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {!task.completed && (
              <button
                onClick={() => onPinAsActive(task.id)}
                className="text-text-muted hover:text-blue-400 p-1.5 rounded transition cursor-pointer"
                title="Pin to notification bar"
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDeleteTask(task.id)}
              className="text-text-muted hover:text-rose-400 p-1.5 rounded transition cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border-default bg-surface-elevated p-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 text-text-muted text-[10px] font-semibold px-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>{t('filter', 'en')}</span>
          </div>

          {/* All chip */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition shrink-0 cursor-pointer ${
              selectedCategoryId === null
                ? 'btnprimary'
                : 'btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover'
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
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                    : 'btnghost text-text-muted hover:text-text-primary hover:bg-surface-hover'
                }`}
                style={badgeStyle}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span>{cat.name}</span>
                <span className="text-[9px] opacity-80 font-mono">({count})</span>
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
              className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 rounded-lg bg-surface-hover cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>{t('clearFilter', 'en')}</span>
            </button>
          )}
          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={onOpenCategoryManager}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-surface-hover text-text-secondary border border-border-default text-[10px] font-medium flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>{t('categories', 'en')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Three-Column Interactive Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Column 1: Active In-Progress / Pinned */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'active')}
          className="rounded-xl border border-blue-500/40 bg-blue-900/10 p-3 flex flex-col transition hover:border-blue-500/60"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-500/30">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animateandroidpulse" />
              <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">{t('activePinned', 'en')}</h4>
            </div>
            <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/40">
              {activeTask ? '1 Active' : '0'}
            </span>
          </div>

          <div className="space-y-2 flex-1 min-h-[120px]">
            {activeTask ? (
              renderCard(activeTask, true)
            ) : (
              <div className="text-center py-6 text-[9px] text-text-muted border border-dashed border-border-default rounded-lg">
                Drag a task here or pin to notification bar.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Queued Tasks */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'queued')}
          className="rounded-xl border border-border-default bg-surface-panel p-3 flex flex-col transition hover:border-border-focused"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('queuedTasks', 'en')}</h4>
            </div>
            <span className="text-[9px] font-mono font-bold text-text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border-default">
              {queuedTasks.length}
            </span>
          </div>

          <div className="space-y-2 flex-1 max-h-[560px] overflow-y-auto pr-1 min-h-[120px]">
            {queuedTasks.length > 0 ? (
              queuedTasks.map(t => renderCard(t))
            ) : (
              <div className="text-center py-6 text-[9px] text-text-muted border border-dashed border-border-default rounded-lg">
                {selectedCategoryId ? t('noTasksMatch', 'en') : t('noTasksWaiting', 'en')}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, 'completed')}
          className="rounded-xl border border-border-default bg-surface-panel p-3 flex flex-col transition hover:border-border-focused"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-default">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{t('completed', 'en')}</h4>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/40">
              {completedTasks.length}
            </span>
          </div>

          <div className="space-y-2 flex-1 max-h-[560px] overflow-y-auto pr-1 min-h-[120px]">
            {completedTasks.length > 0 ? (
              completedTasks.map(t => renderCard(t))
            ) : (
              <div className="text-center py-6 text-[9px] text-text-muted border border-dashed border-border-default rounded-lg">
                {t('completedAppearHere', 'en')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanView;
