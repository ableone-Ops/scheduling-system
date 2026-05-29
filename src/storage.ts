import { createInitialData } from './constants';
import type { AppData } from './types';
import { normalizeSortOrders } from './utils/sort';

export const loadData = (): AppData => {
  const raw = localStorage.getItem('team-scheduling-system-v2');
  if (!raw) return createInitialData();

  try {
    const parsed = JSON.parse(raw) as AppData;
    return {
      members: normalizeSortOrders(parsed.members ?? []),
      locations: normalizeSortOrders(parsed.locations ?? []),
      tasks: parsed.tasks ?? [],
    };
  } catch {
    return createInitialData();
  }
};

export const saveData = (data: AppData) => {
  localStorage.setItem('team-scheduling-system-v2', JSON.stringify(data));
};
