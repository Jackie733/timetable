import type { Session } from "../db";

export interface DragData {
  type: "session";
  session: Session;
  originalDayOfWeek: number;
  originalSegIndex: number;
}

export interface DropData {
  targetDayOfWeek: number;
  targetSegIndex: number;
}

export interface DragSession {
  session: Session;
  fromDayOfWeek: number;
  fromSegIndex: number;
  toDayOfWeek: number;
  toSegIndex: number;
}

export class DragDropUtils {
  /**
   * 创建拖拽项的唯一 ID
   */
  static createDragId(
    session: Session,
    dayOfWeek: number,
    segIndex: number
  ): string {
    return `session-${session.id}-${dayOfWeek}-${segIndex}`;
  }

  /**
   * 创建放置区域的唯一 ID
   */
  static createDropId(dayOfWeek: number, segIndex: number): string {
    return `cell-${dayOfWeek}-${segIndex}`;
  }

  /**
   * 解析拖拽 ID 获取信息
   */
  static parseDragId(
    dragId: string
  ): { sessionId: string; dayOfWeek: number; segIndex: number } | null {
    const match = dragId.match(/^session-(.+)-(\d+)-(\d+)$/);
    if (!match) return null;

    return {
      sessionId: match[1],
      dayOfWeek: parseInt(match[2], 10),
      segIndex: parseInt(match[3], 10),
    };
  }

  /**
   * 解析放置 ID 获取信息
   */
  static parseDropId(
    dropId: string
  ): { dayOfWeek: number; segIndex: number } | null {
    const match = dropId.match(/^cell-(\d+)-(\d+)$/);
    if (!match) return null;

    return {
      dayOfWeek: parseInt(match[1], 10),
      segIndex: parseInt(match[2], 10),
    };
  }

  /**
   * 检查是否可以放置到目标位置
   */
  static canDrop(
    sessions: Session[],
    draggedSession: Session,
    targetDayOfWeek: number,
    targetSegIndex: number,
    segments: Array<{ startMinutes: number; endMinutes: number }>
  ): boolean {
    const targetSegment = segments[targetSegIndex];
    if (!targetSegment) return false;

    // 检查目标位置是否已有课程（排除正在拖拽的课程）
    const conflictingSessions = sessions.filter(
      s =>
        s.id !== draggedSession.id &&
        s.dayOfWeek === targetDayOfWeek &&
        s.startMinutes < targetSegment.endMinutes &&
        s.endMinutes > targetSegment.startMinutes
    );

    return conflictingSessions.length === 0;
  }

  /**
   * 计算新的课程时间
   */
  static calculateNewSessionTime(
    session: Session,
    targetSegIndex: number,
    segments: Array<{ startMinutes: number; endMinutes: number }>
  ): { startMinutes: number; endMinutes: number } {
    const targetSegment = segments[targetSegIndex];
    const originalDuration = session.endMinutes - session.startMinutes;

    // 如果原始时长能完全适应目标时间段，则使用目标时间段
    if (
      originalDuration <=
      targetSegment.endMinutes - targetSegment.startMinutes
    ) {
      return {
        startMinutes: targetSegment.startMinutes,
        endMinutes: targetSegment.endMinutes,
      };
    }

    // 否则保持原始时长，从目标时间段开始
    return {
      startMinutes: targetSegment.startMinutes,
      endMinutes: targetSegment.startMinutes + originalDuration,
    };
  }
}
