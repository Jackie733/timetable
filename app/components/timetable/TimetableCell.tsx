import { useDroppable } from "@dnd-kit/core";
import { CourseBlock } from "./CourseBlock";
import type { Course, Session } from "~/db";
import { DragDropUtils } from "~/utils/dragDropUtils";

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
  canDrop?: boolean;
  isDropTarget?: boolean;
}

export function TimetableCell({
  dayOfWeek,
  segIndex,
  sessions,
  courseById,
  onCellClick,
  isMobile = false,
  canDrop = true,
  isDropTarget = false,
}: TimetableCellProps) {
  const dropId = DragDropUtils.createDropId(dayOfWeek, segIndex);

  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    disabled: !canDrop,
  });

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
    <td className="h-full border border-gray-200 p-0 dark:border-gray-700">
      <div
        ref={setNodeRef}
        className={`touch-action-manipulation flex h-full cursor-pointer flex-col rounded-xs p-0.5 transition-colors ${
          isMobile ? "min-h-8" : "min-h-16"
        } ${
          sessions.length === 0
            ? "hover:bg-gray-50/80 active:bg-gray-100/80 dark:hover:bg-gray-800/50"
            : ""
        } ${
          isOver && canDrop
            ? "border-2 border-dashed border-blue-300 bg-blue-50"
            : ""
        } ${
          isDropTarget && !canDrop
            ? "border-2 border-dashed border-red-300 bg-red-50"
            : ""
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
            dayOfWeek={dayOfWeek}
            segIndex={segIndex}
            isMobile={isMobile}
            showLocation={!isMobile}
          />
        ))}
      </div>
    </td>
  );
}
