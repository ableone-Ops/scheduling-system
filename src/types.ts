export type Member = {
  id: string;
  name: string;
  position?: string;
  sortOrder: number;
  enabled: boolean;
};

export type Location = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  isDefaultBase?: boolean;
};

export type ScheduleTask = {
  id: string;
  locationId: string;
  taskName: string;
  startDate: string;
  endDate: string;
  memberIds: string[];
};

export type AppData = {
  members: Member[];
  locations: Location[];
  tasks: ScheduleTask[];
};

export type Conflict = {
  date: string;
  memberId: string;
  memberName: string;
  locationNames: string[];
  message: string;
};

export type DayInfo = {
  date: string;
  label: string;
  weekday: string;
};

export type CellTask = {
  taskId: string;
  locationId: string;
  locationName: string;
  taskName: string;
  memberIds: string[];
  memberNames: string[];
  isAutoBase?: boolean;
};
