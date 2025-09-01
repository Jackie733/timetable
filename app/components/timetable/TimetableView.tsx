import { useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Timetable, Course, Session } from "~/db";
import { TimetableHeader } from "./TimetableHeader";
import { TimetableSegmentRow } from "./TimetableSegmentRow";
import { TimetableCell } from "./TimetableCell";
import { CourseBlock } from "./CourseBlock";
import { useDragDrop } from "~/hooks/useDragDrop";
import type { DragSession } from "~/utils/dragDropUtils";
import { TimeUtils } from "~/utils";

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
  onSessionMove?: (dragSession: DragSession) => void;
  isMobile?: boolean;
}

export function TimetableView({
  timetable,
  courses,
  sessions,
  onCellClick,
  onSessionMove,
  isMobile = false,
}: TimetableViewProps) {
  const standardSchedule = TimeUtils.generateStandardSchoolSchedule();
  const days = timetable.days ?? 5;
  const segments = (
    timetable.segments?.length
      ? timetable.segments
      : standardSchedule.map(item => ({
          label: item.label,
          startMinutes: item.startMinutes,
          endMinutes: item.endMinutes,
        }))
  )!;

  const courseById = new Map(courses.map(c => [c.id, c] as const));

  const {
    activeSession,
    dragOverlay,
    canDropAtPosition,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useDragDrop({
    sessions,
    segments,
    onSessionMove,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 设置打印时的动态行数
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--segments-count",
      segments.length.toString()
    );
  }, [segments.length]);

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`flex h-full flex-1 flex-col print:h-full ${
          isMobile ? "mobile-scroll-container overflow-x-auto pb-2" : ""
        }`}
      >
        <div
          className={`flex h-full flex-1 flex-col print:h-full ${isMobile ? "min-w-fit" : ""}`}
        >
          <table
            className={`timetable-grid h-full w-full border-collapse border-spacing-0 rounded border border-gray-200 dark:border-gray-700 print:h-full ${
              isMobile
                ? "table-ultra-compact text-xs"
                : "min-w-[720px] table-fixed"
            }`}
            style={
              isMobile
                ? {
                    minWidth: "100%",
                    width: "max-content",
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
                    const canDrop = canDropAtPosition(dayOfWeek, segIndex);

                    return (
                      <TimetableCell
                        key={day}
                        dayOfWeek={dayOfWeek}
                        segIndex={segIndex}
                        sessions={cellSessions}
                        courseById={courseById}
                        onCellClick={onCellClick}
                        isMobile={isMobile}
                        canDrop={canDrop}
                        isDropTarget={!!activeSession}
                      />
                    );
                  })}
                </TimetableSegmentRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DragOverlay>
        {dragOverlay ? (
          <div
            className={`flex flex-col p-0.5 ${
              isMobile ? "w-16" : "min-w-[120px]"
            }`}
            style={{
              minHeight: isMobile ? "2rem" : "4rem",
              height: isMobile ? "2rem" : "4rem",
            }}
          >
            <CourseBlock
              session={dragOverlay}
              course={courseById.get(dragOverlay.courseId)}
              dayOfWeek={0}
              segIndex={0}
              isMobile={isMobile}
              showLocation={!isMobile}
              isDragDisabled={true}
              className="shadow-2xl ring-2 ring-white/50"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
