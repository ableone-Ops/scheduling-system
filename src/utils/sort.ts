type Sortable = {
  sortOrder: number;
};

export const bySortOrder = <T extends Sortable>(items: T[]) =>
  [...items].sort((a, b) => a.sortOrder - b.sortOrder);

export const normalizeSortOrders = <T extends Sortable>(items: T[]): T[] =>
  bySortOrder(items).map((item, index) => ({ ...item, sortOrder: index + 1 }));

export const moveItemToPosition = <T extends Sortable>(
  items: T[],
  currentSortOrder: number,
  targetPosition: number,
) => {
  const ordered = bySortOrder(items);
  const currentIndex = ordered.findIndex((item) => item.sortOrder === currentSortOrder);
  if (currentIndex < 0) return normalizeSortOrders(items);

  const [moving] = ordered.splice(currentIndex, 1);
  const nextIndex = Math.max(0, Math.min(targetPosition - 1, ordered.length));
  ordered.splice(nextIndex, 0, moving);
  return normalizeSortOrders(ordered);
};
