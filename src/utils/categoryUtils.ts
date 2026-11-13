import type { Task, TaskCategory } from '../types';

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface CategoryPaletteOption {
  name: string;
  color: string;
  bg: string;
  text: string;
  border: string;
}

export const CATEGORY_PALETTE: CategoryPaletteOption[] = [
  { name: 'Blue', color: '#3b82f6', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  { name: 'Emerald', color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  { name: 'Violet', color: '#8b5cf6', bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/40' },
  { name: 'Rose', color: '#f43f5e', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  { name: 'Amber', color: '#f59e0b', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  { name: 'Cyan', color: '#06b6d4', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  { name: 'Indigo', color: '#6366f1', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/40' },
  { name: 'Teal', color: '#14b8a6', bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/40' },
  { name: 'Pink', color: '#ec4899', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40' },
  { name: 'Orange', color: '#ea580c', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40' },
  { name: 'Slate', color: '#64748b', bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40' },
];

export const DEFAULT_CUSTOM_CATEGORIES: CustomCategory[] = [
  { id: 'cat-work', name: 'Work', color: '#3b82f6', isDefault: true },
  { id: 'cat-personal', name: 'Personal', color: '#10b981', isDefault: true },
  { id: 'cat-study', name: 'Study', color: '#8b5cf6', isDefault: true },
  { id: 'cat-important', name: 'Important', color: '#f43f5e', isDefault: true },
  { id: 'cat-projects', name: 'Projects', color: '#f59e0b', isDefault: true },
];

export const UNCATEGORIZED_CATEGORY: CustomCategory = {
  id: 'cat-uncategorized',
  name: 'Uncategorized',
  color: '#64748b',
};

const CATEGORIES_STORAGE_KEY = 'plandroid_custom_categories_v1';

/**
 * Loads custom categories from localStorage with fallback to default categories
 */
export function loadCategoriesFromStorage(): CustomCategory[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_CATEGORIES;
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOM_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom categories from storage:', err);
  }
  return DEFAULT_CUSTOM_CATEGORIES;
}

/**
 * Saves custom categories to localStorage
 */
export function saveCategoriesToStorage(categories: CustomCategory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.warn('Failed to save custom categories to storage:', err);
  }
}

/**
 * Finds a category by its ID with fallback to Uncategorized
 */
export function getCategoryById(categories: CustomCategory[], id?: string): CustomCategory {
  if (!id) return UNCATEGORIZED_CATEGORY;
  const found = categories.find(c => c.id === id);
  return found || UNCATEGORIZED_CATEGORY;
}

/**
 * Maps legacy TaskCategory values to corresponding CustomCategory
 */
export function mapLegacyCategory(legacy?: TaskCategory): string {
  switch (legacy) {
    case 'deep_work':
    case 'meeting':
      return 'cat-work';
    case 'personal':
    case 'break':
      return 'cat-personal';
    case 'review':
      return 'cat-study';
    case 'admin':
      return 'cat-projects';
    default:
      return 'cat-work';
  }
}

/**
 * Resolves the effective category for any task, supporting both new categoryId and legacy category
 */
export function getTaskCategory(task: Task, categories: CustomCategory[]): CustomCategory {
  if (task.categoryId) {
    const found = categories.find(c => c.id === task.categoryId);
    if (found) return found;
  }
  // Try mapping legacy category
  if (task.category) {
    const mappedId = mapLegacyCategory(task.category);
    const mapped = categories.find(c => c.id === mappedId);
    if (mapped) return mapped;
  }
  return UNCATEGORIZED_CATEGORY;
}

/**
 * Returns dynamic inline style object for category badge
 */
export function getCategoryBadgeStyle(color: string): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  return {
    backgroundColor: `${color}25`, // ~15% opacity hex
    color: color,
    borderColor: `${color}55`, // ~33% opacity hex
  };
}

/**
 * Creates a new category
 */
export function createCategory(name: string, color: string): CustomCategory {
  return {
    id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    color: color || '#3b82f6',
  };
}

/**
 * Deletes a category and safely reassigns tasks referencing it to Uncategorized or replacement ID
 */
export function deleteCategoryAndReassign(
  categories: CustomCategory[],
  categoryIdToDelete: string,
  tasks: Task[],
  replacementCategoryId?: string
): { updatedCategories: CustomCategory[]; updatedTasks: Task[] } {
  const updatedCategories = categories.filter(c => c.id !== categoryIdToDelete);
  const targetId = replacementCategoryId && replacementCategoryId !== categoryIdToDelete
    ? replacementCategoryId
    : UNCATEGORIZED_CATEGORY.id;

  const updatedTasks = tasks.map(task => {
    if (task.categoryId === categoryIdToDelete) {
      return {
        ...task,
        categoryId: targetId,
      };
    }
    return task;
  });

  return { updatedCategories, updatedTasks };
}
