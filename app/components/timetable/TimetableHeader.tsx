import type { Timetable } from "../../db";

export interface TimetableHeaderProps {
  timetable: Timetable;
  isMobile?: boolean;
}

const DAY_LABELS = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
];

export function TimetableHeader({
  timetable,
  isMobile = false,
}: TimetableHeaderProps) {
  const days = timetable.days ?? 5;
  const weekStart = timetable.weekStart ?? 1; // 1 = Monday

  // 根据周开始日计算要显示的天数
  const displayDays = Array.from({ length: days }, (_, i) => {
    const dayIndex = weekStart === 1 ? (i + 1) % 7 : i; // 如果周一开始，则调整索引
    return DAY_LABELS[dayIndex];
  });

  return (
    <thead>
      <tr>
        <th
          className={`sticky-col text-center align-middle ${
            isMobile ? "w-10 p-1 text-xs" : "w-20 p-2"
          }`}
        >
          {isMobile ? "节" : "节次"}
        </th>
        {displayDays.map((dayLabel, i) => (
          <th
            key={i}
            className={`text-center align-middle ${
              isMobile ? "w-16 p-1 text-xs" : "p-2"
            }`}
          >
            {isMobile ? dayLabel.replace("星期", "") : dayLabel}
          </th>
        ))}
      </tr>
    </thead>
  );
}
