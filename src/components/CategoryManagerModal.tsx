import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';
import type { Task, Language } from '../types';
import {
  type CustomCategory,
  CATEGORY_PALETTE,
  createCategory,
  deleteCategoryAndReassign,
  getCategoryBadgeStyle,
} from '../utils/categoryUtils';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  tasks: Task[];
  onUpdateCategories: (categories: CustomCategory[]) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  lang?: Language;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  tasks,
  onUpdateCategories,
  onUpdateTasks,
  lang = 'en',
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_PALETTE[0].color);
  const [isCreating, setIsCreating] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CustomCategory | null>(null);

  if (!isOpen) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditingCategoryId(null);
    setNameInput('');
    setSelectedColor(CATEGORY_PALETTE[Math.floor(Math.random() * CATEGORY_PALETTE.length)].color);
  };

  const startEdit = (cat: CustomCategory) => {
    setIsCreating(false);
    setEditingCategoryId(cat.id);
    setNameInput(cat.name);
    setSelectedColor(cat.color);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    if (isCreating) {
      const newCat = createCategory(trimmed, selectedColor);
      onUpdateCategories([...categories, newCat]);
      setIsCreating(false);
      setNameInput('');
    } else if (editingCategoryId) {
      const updated = categories.map(c =>
        c.id === editingCategoryId ? { ...c, name: trimmed, color: selectedColor } : c
      );
      onUpdateCategories(updated);
      setEditingCategoryId(null);
      setNameInput('');
    }
  };

  const confirmDelete = () => {
    if (!categoryToDelete) return;
    const { updatedCategories, updatedTasks } = deleteCategoryAndReassign(
      categories,
      categoryToDelete.id,
      tasks
    );
    onUpdateCategories(updatedCategories);
    onUpdateTasks(updatedTasks);
    setCategoryToDelete(null);
    if (editingCategoryId === categoryToDelete.id) {
      setEditingCategoryId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {lang === 'am' ? 'የስራ ምድቦች አስተዳደር' : 'Manage Custom Categories'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'am' ? 'ምድቦችን ይፍጠሩ፣ ቀለሞችን ያብጁ' : 'Create, color-code, and organize your task tags'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create / Edit Form */}
        {(isCreating || editingCategoryId) && (
          <form onSubmit={handleSave} className="p-3.5 bg-slate-950/70 border border-blue-500/30 rounded-xl space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                {isCreating ? 'Create New Category' : 'Edit Category'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingCategoryId(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="e.g., Marketing, Client Work, Fitness"
                maxLength={24}
                required
                autoFocus
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Color Palette Picker */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Tag Color
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_PALETTE.map(opt => (
                  <button
                    key={opt.color}
                    type="button"
                    onClick={() => setSelectedColor(opt.color)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer ${
                      selectedColor === opt.color ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={opt.name}
                  >
                    {selectedColor === opt.color && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Tag Preview */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Tag Preview:</span>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                  style={getCategoryBadgeStyle(selectedColor)}
                >
                  {nameInput.trim() || 'Preview Tag'}
                </span>
              </div>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition cursor-pointer active:scale-95"
              >
                {isCreating ? 'Add Category' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Action Button to Add if not currently creating/editing */}
        {!isCreating && !editingCategoryId && (
          <button
            type="button"
            onClick={startCreate}
            className="w-full py-2 px-3 border border-dashed border-blue-500/40 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create New Category</span>
          </button>
        )}

        {/* Existing Categories List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[160px]">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Active Categories ({categories.length})
          </span>
          {categories.map(cat => {
            const taskCount = tasks.filter(t => t.categoryId === cat.id || (!t.categoryId && cat.id === 'cat-work' && t.category === 'deep_work')).length;
            const style = getCategoryBadgeStyle(cat.color);

            return (
              <div
                key={cat.id}
                className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="min-w-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold border inline-block"
                      style={style}
                    >
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-2">
                      {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Alert */}
        {categoryToDelete && (
          <div className="p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl space-y-2 shrink-0 animate-in fade-in">
            <div className="flex items-start gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Delete category "{categoryToDelete.name}"?
                </p>
                <p className="text-[11px] text-rose-200/80 mt-0.5">
                  Tasks currently under this category will be preserved and reassigned to <strong>Uncategorized</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
