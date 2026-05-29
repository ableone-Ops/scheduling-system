import { DEFAULT_BASE_NAME, DEFAULT_BASE_TASK_NAME, createId } from '../constants';
import type { CellTask, Conflict, DayInfo, Location, Member, ScheduleTask } from '../types';
import { bySortOrder } from './sort';
import { enumerateDays, isDateInRange, shiftDate } from './date';

export const getBaseLocation = (locations: Location[]) =>
  locations.find((location) => location.isDefaultBase) ??
  locations.find((location) => location.name === DEFAULT_BASE_NAME);

export const getTaskDates = (task: ScheduleTask) =>
  enumerateDays(task.startDate, task.endDate).map((day) => day.date);

export const getTasksForDate = (tasks: ScheduleTask[], date: string) =>
  tasks.filter((task) => isDateInRange(date, task.startDate, task.endDate));

export const sortMemberIds = (memberIds: string[], members: Member[]) => {
  const order = new Map(members.map((member) => [member.id, member.sortOrder]));
  return [...memberIds].sort((a, b) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999));
};

export const sortTasks = (tasks: CellTask[], members: Member[]) =>
  [...tasks].map((task) => ({
    ...task,
    memberIds: sortMemberIds(task.memberIds, members),
    memberNames: sortMemberIds(task.memberIds, members)
      .map((id) => members.find((member) => member.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
  }));

export const getCellTasks = (
  locationId: string,
  date: string,
  tasks: ScheduleTask[],
  locations: Location[],
  members: Member[],
): CellTask[] => {
  const location = locations.find((item) => item.id === locationId);
  return getTasksForDate(tasks, date)
    .filter((task) => task.locationId === locationId)
    .map((task) => ({
      taskId: task.id,
      locationId,
      locationName: location?.name ?? '',
      taskName: task.taskName,
      memberIds: sortMemberIds(task.memberIds, members),
      memberNames: sortMemberIds(task.memberIds, members)
        .map((id) => members.find((member) => member.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    }));
};

export const getAssignedMemberIdsForDate = (tasks: ScheduleTask[], date: string) => {
  const ids = new Set<string>();
  getTasksForDate(tasks, date).forEach((task) => {
    task.memberIds.forEach((id) => ids.add(id));
  });
  return ids;
};

export const getUnassignedMembersForDate = (
  members: Member[],
  tasks: ScheduleTask[],
  date: string,
) => {
  const assigned = getAssignedMemberIdsForDate(tasks, date);
  return bySortOrder(members).filter((member) => member.enabled && !assigned.has(member.id));
};

export const getAutoBaseCellTask = (
  date: string,
  members: Member[],
  tasks: ScheduleTask[],
  locations: Location[],
): CellTask | undefined => {
  const base = getBaseLocation(locations);
  if (!base || !base.enabled) return undefined;
  const unassignedMembers = getUnassignedMembersForDate(members, tasks, date);

  return {
    taskId: `auto-base-${date}`,
    locationId: base.id,
    locationName: base.name,
    taskName: DEFAULT_BASE_TASK_NAME,
    memberIds: unassignedMembers.map((member) => member.id),
    memberNames: unassignedMembers.map((member) => member.name),
    isAutoBase: true,
  };
};

export const formatCellTasks = (cellTasks: CellTask[]) =>
  cellTasks
    .map((task) => `${task.taskName}：${task.memberNames.join('、')}`)
    .join('\n');

export const getLocationCellText = (
  location: Location,
  date: string,
  tasks: ScheduleTask[],
  locations: Location[],
  members: Member[],
) => {
  const manualTasks = getCellTasks(location.id, date, tasks, locations, members);
  const baseTask = location.isDefaultBase ? getAutoBaseCellTask(date, members, tasks, locations) : undefined;
  return formatCellTasks(baseTask ? [...manualTasks, baseTask] : manualTasks);
};

export const getMemberCellText = (
  memberId: string,
  date: string,
  tasks: ScheduleTask[],
  locations: Location[],
) => {
  const dailyTasks = getTasksForDate(tasks, date).filter((task) => task.memberIds.includes(memberId));
  if (dailyTasks.length) {
    return dailyTasks
      .map((task) => {
        const locationName = locations.find((location) => location.id === task.locationId)?.name ?? '';
        return task.taskName ? `${locationName}（${task.taskName}）` : locationName;
      })
      .join('\n');
  }
  return getBaseLocation(locations)?.name ?? DEFAULT_BASE_NAME;
};

export const detectConflicts = (
  tasks: ScheduleTask[],
  members: Member[],
  locations: Location[],
  days: DayInfo[],
): Conflict[] => {
  const memberMap = new Map(members.map((member) => [member.id, member]));
  const locationMap = new Map(locations.map((location) => [location.id, location]));
  const conflicts: Conflict[] = [];

  days.forEach((day) => {
    const assignments = new Map<string, Set<string>>();
    getTasksForDate(tasks, day.date).forEach((task) => {
      task.memberIds.forEach((memberId) => {
        if (!assignments.has(memberId)) assignments.set(memberId, new Set());
        assignments.get(memberId)?.add(task.locationId);
      });
    });

    assignments.forEach((locationIds, memberId) => {
      if (locationIds.size <= 1) return;
      const memberName = memberMap.get(memberId)?.name ?? '未知人员';
      const locationNames = [...locationIds]
        .map((locationId) => locationMap.get(locationId)?.name)
        .filter((name): name is string => Boolean(name));
      conflicts.push({
        date: day.date,
        memberId,
        memberName,
        locationNames,
        message: `${day.label.replace(/（.*）/, '')}：${memberName}同时安排在${locationNames.join('、')}。`,
      });
    });
  });

  return conflicts;
};

export const copyTask = (task: ScheduleTask): ScheduleTask => ({
  ...task,
  id: createId(),
});

export const copyTasksFromPreviousWeek = (
  tasks: ScheduleTask[],
  currentStartDate: string,
  currentEndDate: string,
) => {
  const previousStart = shiftDate(currentStartDate, -7);
  const previousEnd = shiftDate(currentEndDate, -7);
  const copied = tasks
    .filter((task) => isDateInRange(task.startDate, previousStart, previousEnd) || isDateInRange(task.endDate, previousStart, previousEnd))
    .map((task) => ({
      ...task,
      id: createId(),
      startDate: shiftDate(task.startDate, 7),
      endDate: shiftDate(task.endDate, 7),
    }));

  return [...tasks, ...copied];
};

export const copyMembersToNextDay = (
  sourceTask: ScheduleTask,
  tasks: ScheduleTask[],
) => {
  const nextStart = shiftDate(sourceTask.startDate, 1);
  const nextEnd = shiftDate(sourceTask.endDate, 1);
  return [
    ...tasks,
    {
      ...sourceTask,
      id: createId(),
      startDate: nextStart,
      endDate: nextEnd,
    },
  ];
};
