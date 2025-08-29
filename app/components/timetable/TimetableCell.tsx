import type { Course, Session } from "../../db";
import { CourseBlock } from "./CourseBlock";

export interface TimetableCellProps {
  dayOfWeek: number;
  segIndex: number;
  sessions: Session[];
  courseById: Map<string, Course>;
  onCellClick: (
    dayOfWeek: number,
    segIndex: number,
    session?: Session,
    course?: Course
  ) => void;
  isMobile?: boolean;
}

export function TimetableCell({
  dayOfWeek,
  segIndex,
  sessions,
  courseById,
  onCellClick,
  isMobile = false,
}: TimetableCellProps) {
  const handleClick = () => {
    const session = sessions[0];
    const course = session ? courseById.get(session.courseId) : undefined;
    onCellClick(dayOfWeek, segIndex, session, course);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMobile) {
      e.currentTarget.style.transform = "scale(0.98)";
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMobile) {
      e.currentTarget.style.transform = "scale(1)";
    }
  };

  return (
    <td className="h-full p-0">
      <div
        className={`touch-action-manipulation flex h-full cursor-pointer flex-col rounded-xs p-0.5 transition-colors hover:bg-gray-50/80 active:bg-gray-100/80 dark:hover:bg-gray-800/50 ${
          isMobile ? "min-h-8" : "min-h-16"
        }`}
        style={{
          height: "100%",
          minHeight: isMobile ? "2rem" : "4rem",
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {sessions.map(session => (
          <CourseBlock
            key={session.id}
            session={session}
            course={courseById.get(session.courseId)}
            isMobile={isMobile}
            showLocation={!isMobile}
          />
        ))}
      </div>
    </td>
  );
}
