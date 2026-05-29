import * as XLSX from 'xlsx';
import type { DayInfo, Location, Member, ScheduleTask } from '../types';
import { getLocationCellText } from './schedule';
import { bySortOrder } from './sort';

const border = {
  top: { style: 'thin', color: { rgb: '999999' } },
  bottom: { style: 'thin', color: { rgb: '999999' } },
  left: { style: 'thin', color: { rgb: '999999' } },
  right: { style: 'thin', color: { rgb: '999999' } },
};

export const exportScheduleExcel = (
  days: DayInfo[],
  locations: Location[],
  members: Member[],
  tasks: ScheduleTask[],
) => {
  const enabledLocations = bySortOrder(locations).filter((location) => location.enabled);
  const rows = [
    ['工作地点', ...days.map((day) => day.label)],
    ...enabledLocations.map((location) => [
      location.name,
      ...days.map((day) => getLocationCellText(location, day.date, tasks, locations, members)),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:A1');

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[address]) continue;
      worksheet[address].s = {
        font: { bold: row === 0 || col === 0 },
        alignment: {
          horizontal: row === 0 ? 'center' : 'left',
          vertical: 'center',
          wrapText: true,
        },
        border,
      };
    }
  }

  worksheet['!cols'] = [
    { wch: 16 },
    ...days.map(() => ({ wch: 32 })),
  ];
  worksheet['!rows'] = rows.map((row, index) => ({
    hpt: index === 0 ? 28 : Math.max(32, Math.max(...row.map((cell) => String(cell).split('\n').length)) * 22),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '周排班表');
  const firstDay = days[0]?.date ?? 'schedule';
  const lastDay = days[days.length - 1]?.date ?? 'schedule';
  XLSX.writeFile(workbook, `班组排班表_${firstDay}_${lastDay}.xlsx`, { cellStyles: true });
};
