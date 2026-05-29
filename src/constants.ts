import type { AppData, Location, Member, ScheduleTask } from './types';

const names = [
  '刘红鑫',
  '陈韶辉',
  '吴继敏',
  '刘昌标',
  '胡志崴',
  '谢斯晗',
  '陈志鹏',
  '董西宏',
  '叶可',
  '卜红卫',
  '王彬',
  '刘香江',
  '陈海涛',
  '汪远泉',
  '李伟',
  '漆羕',
  '童志刚',
  '戴建国',
  '罗晨晨',
  '安城辉',
  '谭忆洲',
  '芦肇基',
  '李天赟',
  '张晟',
  '钱奕晨',
  '王建',
  '林智永',
  '张彧伟',
  '朱利荣',
  '陈金用',
  '陆洪文',
];

const locationNames = [
  '公司',
  '钱塘江站',
  '绍兴站',
  '金华站',
  '越州站',
  '安吉站',
  '兰江站',
  '莲都站',
  '实训基地建设',
  '比武竞赛',
  '厂内监造',
  '外出支撑',
  '参加会议',
  '应急人员取证',
  '调休/请假',
  '仓前基地',
];

export const STORAGE_KEY = 'team-scheduling-system-v2';
export const DEFAULT_BASE_NAME = '仓前基地';
export const DEFAULT_BASE_TASK_NAME = '基地办公';

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createDefaultMembers = (): Member[] =>
  names.map((name, index) => ({
    id: createId(),
    name,
    sortOrder: index + 1,
    enabled: true,
  }));

export const createDefaultLocations = (): Location[] =>
  locationNames.map((name, index) => ({
    id: createId(),
    name,
    sortOrder: index + 1,
    enabled: true,
    isDefaultBase: name === DEFAULT_BASE_NAME,
  }));

export const createInitialData = (): AppData => {
  const members = createDefaultMembers();
  const locations = createDefaultLocations();
  const memberId = (name: string) => members.find((member) => member.name === name)?.id ?? '';
  const locationId = (name: string) => locations.find((location) => location.name === name)?.id ?? '';
  const tasks: ScheduleTask[] = [
    {
      id: createId(),
      locationId: locationId('金华站'),
      taskName: '年检配合',
      startDate: '2026-05-25',
      endDate: '2026-05-26',
      memberIds: ['胡志崴', '陈志鹏', '叶可'].map(memberId).filter(Boolean),
    },
    {
      id: createId(),
      locationId: locationId('兰江站'),
      taskName: '开关检修',
      startDate: '2026-05-27',
      endDate: '2026-05-29',
      memberIds: ['王彬', '刘香江'].map(memberId).filter(Boolean),
    },
    {
      id: createId(),
      locationId: locationId('调休/请假'),
      taskName: '调休',
      startDate: '2026-05-25',
      endDate: '2026-05-25',
      memberIds: ['陆洪文'].map(memberId).filter(Boolean),
    },
  ];

  return { members, locations, tasks };
};
