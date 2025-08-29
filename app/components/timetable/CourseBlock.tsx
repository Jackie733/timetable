import type { Course, Session } from "../../db";

export interface CourseBlockProps {
  session: Session;
  course?: Course;
  onClick?: () => void;
  isMobile?: boolean;
  showLocation?: boolean;
  className?: string;
}

export function CourseBlock({
  session,
  course,
  onClick,
  isMobile = false,
  showLocation = true,
  className = "",
}: CourseBlockProps) {
  const backgroundColor = course?.color || "#6b7280";
  const title = course?.title || "未知课程";
  const location = session.location;

  return (
    <div
      className={`flex flex-1 cursor-pointer flex-col justify-center rounded-xs text-center font-medium text-white shadow-sm ${
        isMobile ? "px-1 py-0.5 text-[10px] leading-tight" : "px-2 py-1 text-xs"
      } ${className}`}
      style={{ backgroundColor }}
      onClick={onClick}
    >
      <div className="truncate" title={title}>
        {title}
      </div>
      {location && showLocation && !isMobile && (
        <div className="truncate text-[10px] opacity-90" title={location}>
          {location}
        </div>
      )}
    </div>
  );
}
