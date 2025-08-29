import type { Timetable } from "~/db";

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
  const weekStart = timetable.weekStart ?? 1;

  const displayDays = Array.from({ length: days }, (_, i) => {
    const dayIndex = weekStart === 1 ? (i + 1) % 7 : i;
    return DAY_LABELS[dayIndex];
  });

  return (
    <thead>
      <tr>
        <th
          className={`sticky-col border-r border-b border-gray-200 bg-gray-50 text-center align-middle dark:border-gray-700 dark:bg-gray-800 ${
            isMobile ? "w-10 p-1 text-xs" : "w-20 p-2"
          }`}
        >
          {isMobile ? "节" : "节次"}
        </th>
        {displayDays.map((dayLabel, i) => (
          <th
            key={i}
            className={`border-b border-gray-200 bg-gray-50 text-center align-middle dark:border-gray-700 dark:bg-gray-800 ${
              i < displayDays.length - 1 ? "border-r" : ""
            } ${isMobile ? "w-16 p-1 text-xs" : "p-2"}`}
          >
            {isMobile ? dayLabel.replace("星期", "") : dayLabel}
          </th>
        ))}
      </tr>
    </thead>
  );
}
