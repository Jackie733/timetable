import { useDraggable } from "@dnd-kit/core";
import type { Course, Session } from "../../db";
import { DragDropUtils } from "../../utils/dragDropUtils";

export interface CourseBlockProps {
  session: Session;
  course?: Course;
  dayOfWeek: number;
  segIndex: number;
  onClick?: () => void;
  isMobile?: boolean;
  showLocation?: boolean;
  className?: string;
  isDragDisabled?: boolean;
}

export function CourseBlock({
  session,
  course,
  dayOfWeek,
  segIndex,
  onClick,
  isMobile = false,
  showLocation = true,
  className = "",
  isDragDisabled = false,
}: CourseBlockProps) {
  const backgroundColor = course?.color || "#6b7280";
  const title = course?.title || "未知课程";
  const location = session.location;

  const dragId = DragDropUtils.createDragId(session, dayOfWeek, segIndex);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      disabled: isDragDisabled || isMobile, // 移动端禁用拖拽
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`session-cell relative flex flex-1 flex-col justify-center rounded-xs text-center font-medium text-white shadow-sm transition-all ${
        isMobile ? "px-1 py-0.5 text-[10px] leading-tight" : "px-2 py-1 text-xs"
      } ${isDragging ? "opacity-50 shadow-lg" : "cursor-pointer"} ${
        !isDragDisabled && !isMobile ? "hover:shadow-md active:scale-95" : ""
      } ${className}`}
      style={{ backgroundColor, ...style }}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="session-title truncate" title={title}>
        {title}
      </div>
      {location && showLocation && !isMobile && (
        <div
          className="session-location truncate text-[10px] opacity-90"
          title={location}
        >
          {location}
        </div>
      )}
      {!isDragDisabled && !isMobile && (
        <div className="no-print absolute top-0 right-0 opacity-0 transition-opacity hover:opacity-100">
          <svg
            className="h-3 w-3 text-white/70"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      )}
    </div>
  );
}
