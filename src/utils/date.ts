import dayjs, { type Dayjs } from 'dayjs';

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export const toDateString = (date: Dayjs | Date | string) => dayjs(date).format('YYYY-MM-DD');

export const getWeekRange = (date: Dayjs) => {
  const day = date.day();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = date.add(offsetToMonday, 'day');
  return {
    start: toDateString(start),
    end: toDateString(start.add(6, 'day')),
  };
};

export const enumerateDays = (startDate: string, endDate: string) => {
  const days = [];
  let cursor = dayjs(startDate);
  const end = dayjs(endDate);

  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    days.push({
      date: toDateString(cursor),
      label: `${cursor.month() + 1}月${cursor.date()}日（${weekdays[cursor.day()]}）`,
      weekday: weekdays[cursor.day()],
    });
    cursor = cursor.add(1, 'day');
  }

  return days;
};

export const isDateInRange = (date: string, startDate: string, endDate: string) => {
  const current = dayjs(date);
  return (current.isAfter(dayjs(startDate)) || current.isSame(dayjs(startDate), 'day')) &&
    (current.isBefore(dayjs(endDate)) || current.isSame(dayjs(endDate), 'day'));
};

export const shiftDate = (date: string, days: number) => toDateString(dayjs(date).add(days, 'day'));

export const rangesOverlap = (
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) => dayjs(firstStart).isBefore(dayjs(secondEnd).add(1, 'day')) &&
  dayjs(secondStart).isBefore(dayjs(firstEnd).add(1, 'day'));
