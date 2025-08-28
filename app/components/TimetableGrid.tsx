import React from "react";
import type { Course, Session, Timetable } from "../db";

export interface TimetableGridProps {
  timetable: Timetable;
  courses: Course[];
  sessions: Session[];
  startHour?: number; // inclusive
  endHour?: number; // exclusive
}

const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function TimetableGrid({
  timetable,
  courses,
  sessions,
  startHour = 8,
  endHour = 20,
}: TimetableGridProps) {
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );
  const byDay = Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [d, [] as Session[]])
  ) as Record<number, Session[]>;
  for (const s of sessions) byDay[s.dayOfWeek].push(s);
  const courseById = new Map(courses.map(c => [c.id, c] as const));

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid"
        style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}
      >
        {/* Header Row */}
        <div />
        {Array.from({ length: 7 }).map((_, d) => (
          <div
            key={d}
            className="border-b px-2 py-1 text-center text-sm font-medium"
          >
            {dayNames[(timetable.weekStart ?? 1) === 1 ? (d + 1) % 7 : d]}
          </div>
        ))}

        {/* Time + Day columns */}
        {hours.map((h, idx) => (
          <React.Fragment key={h}>
            <div className="border-r px-2 py-1 text-xs text-gray-500">
              {String(h).padStart(2, "0")}:00
            </div>
            {Array.from({ length: 7 }).map((_, d) => (
              <div
                key={d}
                className={`relative border ${idx === hours.length - 1 ? "border-b" : "border-b-0"}`}
                style={{ minHeight: 48 }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Sessions as absolute blocks */}
        {Array.from({ length: 7 }).map((_, col) => {
          const day = (timetable.weekStart ?? 1) === 1 ? (col + 1) % 7 : col;
          const daySessions = byDay[day];
          return daySessions.map(s => {
            const start = Math.max(s.startMinutes, startHour * 60);
            const end = Math.min(s.endMinutes, endHour * 60);
            if (end <= start) return null;
            const totalMinutes = (endHour - startHour) * 60;
            const top = ((start - startHour * 60) / totalMinutes) * 100;
            const height = ((end - start) / totalMinutes) * 100;
            const course = courseById.get(s.courseId);
            return (
              <div
                key={s.id}
                className="pointer-events-none col-start-[2] col-end-[9]"
                style={{
                  gridRow: `2 / -1`,
                }}
              >
                <div
                  className="absolute left-0"
                  style={{
                    insetInlineStart: `calc(80px + ${col} * (100% - 80px) / 7)`,
                    width: `calc((100% - 80px) / 7 - 2px)`,
                    top: `calc(32px + ${top}% * (1))`,
                    height: `calc(${height}% * (1))`,
                  }}
                >
                  <div className="pointer-events-auto h-full rounded border bg-blue-50 p-1 text-xs dark:bg-blue-950/30">
                    <div className="truncate font-medium">
                      {course?.title ?? "课程"}
                    </div>
                    {s.location && (
                      <div className="truncate text-[10px] text-gray-600">
                        {s.location}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
