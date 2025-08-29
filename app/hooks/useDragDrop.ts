import { useState, useCallback } from "react";
import type {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import type { Session } from "../db";
import { DragDropUtils, type DragSession } from "../utils/dragDropUtils";

export interface UseDragDropOptions {
  sessions: Session[];
  segments: Array<{ startMinutes: number; endMinutes: number }>;
  onSessionMove?: (dragSession: DragSession) => void;
}

export interface UseDragDropResult {
  activeSession: Session | null;
  dragOverlay: Session | null;
  isDragging: boolean;
  canDropAtPosition: (dayOfWeek: number, segIndex: number) => boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export function useDragDrop({
  sessions,
  segments,
  onSessionMove,
}: UseDragDropOptions): UseDragDropResult {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [dragOverlay, setDragOverlay] = useState<Session | null>(null);

  const isDragging = activeSession !== null;

  const canDropAtPosition = useCallback(
    (dayOfWeek: number, segIndex: number): boolean => {
      if (!activeSession) return true;

      return DragDropUtils.canDrop(
        sessions,
        activeSession,
        dayOfWeek,
        segIndex,
        segments
      );
    },
    [activeSession, sessions, segments]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const dragInfo = DragDropUtils.parseDragId(active.id as string);

      if (!dragInfo) return;

      const session = sessions.find(s => s.id === dragInfo.sessionId);
      if (session) {
        setActiveSession(session);
        setDragOverlay(session);
      }
    },
    [sessions]
  );

  const handleDragOver = useCallback(() => {
    // 可以在这里添加拖拽悬停时的视觉反馈
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveSession(null);
      setDragOverlay(null);

      if (!over || !activeSession) return;

      const dragInfo = DragDropUtils.parseDragId(active.id as string);
      const dropInfo = DragDropUtils.parseDropId(over.id as string);

      if (!dragInfo || !dropInfo) return;

      // 检查是否移动到了不同的位置
      if (
        dragInfo.dayOfWeek === dropInfo.dayOfWeek &&
        dragInfo.segIndex === dropInfo.segIndex
      ) {
        return; // 没有移动
      }

      // 检查是否可以放置
      if (!canDropAtPosition(dropInfo.dayOfWeek, dropInfo.segIndex)) {
        return; // 不能放置
      }

      // 执行移动
      const dragSession: DragSession = {
        session: activeSession,
        fromDayOfWeek: dragInfo.dayOfWeek,
        fromSegIndex: dragInfo.segIndex,
        toDayOfWeek: dropInfo.dayOfWeek,
        toSegIndex: dropInfo.segIndex,
      };

      onSessionMove?.(dragSession);
    },
    [activeSession, canDropAtPosition, onSessionMove]
  );

  return {
    activeSession,
    dragOverlay,
    isDragging,
    canDropAtPosition,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
