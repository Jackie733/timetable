import { useEffect } from "react";
import type { Timetable, Course, Session } from "../../db";
import { TimetableHeader } from "./TimetableHeader";
import { TimetableSegmentRow } from "./TimetableSegmentRow";
import { TimetableCell } from "./TimetableCell";

export interface TimetableViewProps {
  timetable: Timetable;
  courses: Course[];
  sessions: Session[];
  onCellClick: (
    dayOfWeek: number,
    segIndex: number,
    session?: Session,
    course?: Course
  ) => void;
  isMobile?: boolean;
}

export function TimetableView({
  timetable,
  courses,
  sessions,
  onCellClick,
  isMobile = false,
}: TimetableViewProps) {
  const days = timetable.days ?? 5;
  const segments = (
    timetable.segments?.length
      ? timetable.segments
      : Array.from({ length: 6 }).map((_, i) => ({
          label: String(i + 1),
          startMinutes: i * 60 + 480, // 8:00 开始，每节课1小时
          endMinutes: (i + 1) * 60 + 480, // 9:00, 10:00, ...
        }))
  )!;

  // 创建课程查找映射
  const courseById = new Map(courses.map(c => [c.id, c] as const));

  // 设置打印时的动态行数
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--segments-count",
      segments.length.toString()
    );
  }, [segments.length]);

  // 获取指定单元格的课时
  const getCellSessions = (dayOfWeek: number, segIndex: number): Session[] => {
    const seg = segments[segIndex];
    return sessions.filter(
      s =>
        s.dayOfWeek === dayOfWeek &&
        s.startMinutes < seg.endMinutes &&
        s.endMinutes > seg.startMinutes
    );
  };

  return (
    <div
      className={`print:h-full ${
        isMobile ? "mobile-scroll-container overflow-x-auto pb-2" : ""
      }`}
    >
      <div className={`print:h-full ${isMobile ? "min-w-fit" : ""}`}>
        <table
          className={`table-clean w-full border-separate border-spacing-0 print:h-full ${
            isMobile
              ? "table-ultra-compact text-xs"
              : "min-w-[720px] table-fixed"
          }`}
          style={
            isMobile
              ? {
                  minWidth: "100%",
                  width: "max-content", // 让表格可以水平滚动
                }
              : {}
          }
        >
          <TimetableHeader timetable={timetable} isMobile={isMobile} />
          <tbody>
            {segments.map((seg, segIndex) => (
              <TimetableSegmentRow
                key={segIndex}
                segment={seg}
                segIndex={segIndex}
                isMobile={isMobile}
              >
                {Array.from({ length: days }).map((_, day) => {
                  const dayOfWeek = (day + 1) % 7; // 转换为 0-6 (周日为0)
                  const cellSessions = getCellSessions(dayOfWeek, segIndex);

                  return (
                    <TimetableCell
                      key={day}
                      dayOfWeek={dayOfWeek}
                      segIndex={segIndex}
                      sessions={cellSessions}
                      courseById={courseById}
                      onCellClick={onCellClick}
                      isMobile={isMobile}
                    />
                  );
                })}
              </TimetableSegmentRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
