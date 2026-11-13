import { test } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_CUSTOM_CATEGORIES,
  UNCATEGORIZED_CATEGORY,
  createCategory,
  getCategoryById,
  getTaskCategory,
  deleteCategoryAndReassign,
  mapLegacyCategory,
  getCategoryBadgeStyle,
} from './categoryUtils';
import type { Task } from '../types';

test('load and getCategoryById returns expected categories', () => {
  const categories = [...DEFAULT_CUSTOM_CATEGORIES];
  const work = getCategoryById(categories, 'cat-work');
  assert.strictEqual(work.name, 'Work');
  assert.strictEqual(work.color, '#3b82f6');

  const unknown = getCategoryById(categories, 'cat-nonexistent');
  assert.strictEqual(unknown.id, UNCATEGORIZED_CATEGORY.id);
  assert.strictEqual(unknown.name, 'Uncategorized');
});

test('createCategory generates unique id with name and color', () => {
  const cat = createCategory('Client Meetings', '#ec4899');
  assert.ok(cat.id.startsWith('cat-'));
  assert.strictEqual(cat.name, 'Client Meetings');
  assert.strictEqual(cat.color, '#ec4899');
});

test('getTaskCategory resolves categoryId first, then falls back to legacy category', () => {
  const categories = [...DEFAULT_CUSTOM_CATEGORIES];

  // Case 1: Task with explicit custom categoryId
  const task1: Task = {
    id: 't-1',
    title: 'Code review',
    categoryId: 'cat-study',
    durationMinutes: 30,
    priority: 'high',
    energyLevel: 'high',
    completed: false,
    createdAt: Date.now(),
  };
  const res1 = getTaskCategory(task1, categories);
  assert.strictEqual(res1.id, 'cat-study');
  assert.strictEqual(res1.name, 'Study');

  // Case 2: Legacy task with no categoryId, but category: 'deep_work'
  const task2: Task = {
    id: 't-2',
    title: 'Focus block',
    category: 'deep_work',
    durationMinutes: 45,
    priority: 'high',
    energyLevel: 'high',
    completed: false,
    createdAt: Date.now(),
  };
  const res2 = getTaskCategory(task2, categories);
  assert.strictEqual(res2.id, 'cat-work');

  // Case 3: Empty task
  const task3: Task = {
    id: 't-3',
    title: 'Mystery task',
    durationMinutes: 15,
    priority: 'medium',
    energyLevel: 'medium',
    completed: false,
    createdAt: Date.now(),
  };
  const res3 = getTaskCategory(task3, categories);
  assert.strictEqual(res3.id, UNCATEGORIZED_CATEGORY.id);
});

test('deleteCategoryAndReassign removes category and moves tasks to uncategorized safely', () => {
  const categories = [...DEFAULT_CUSTOM_CATEGORIES];
  const tasks: Task[] = [
    {
      id: 't-1',
      title: 'Task in Study',
      categoryId: 'cat-study',
      durationMinutes: 30,
      priority: 'high',
      energyLevel: 'high',
      completed: false,
      createdAt: Date.now(),
    },
    {
      id: 't-2',
      title: 'Task in Work',
      categoryId: 'cat-work',
      durationMinutes: 45,
      priority: 'high',
      energyLevel: 'high',
      completed: false,
      createdAt: Date.now(),
    },
  ];

  const result = deleteCategoryAndReassign(categories, 'cat-study', tasks);
  assert.strictEqual(result.updatedCategories.some(c => c.id === 'cat-study'), false);
  assert.strictEqual(result.updatedTasks.find(t => t.id === 't-1')?.categoryId, UNCATEGORIZED_CATEGORY.id);
  assert.strictEqual(result.updatedTasks.find(t => t.id === 't-2')?.categoryId, 'cat-work');
});

test('getCategoryBadgeStyle formats color tokens properly', () => {
  const style = getCategoryBadgeStyle('#3b82f6');
  assert.strictEqual(style.color, '#3b82f6');
  assert.ok(style.backgroundColor.startsWith('#3b82f6'));
  assert.ok(style.borderColor.startsWith('#3b82f6'));
});
