import { db, type Course, type Session, type Timetable } from "../db";

// 批量操作工具类
export class BatchOperations {
  // 批量创建课时
  static async createSessions(
    sessions: Omit<Session, "id" | "createdAt" | "updatedAt" | "deletedAt">[]
  ): Promise<string[]> {
    return db.batchOperation(async () => {
      const sessionIds: string[] = [];
      for (const sessionData of sessions) {
        const session: Session = {
          ...sessionData,
          id: crypto.randomUUID(),
        };
        await db.sessions.add(session);
        sessionIds.push(session.id);
      }
      return sessionIds;
    });
  }

  // 批量删除课时（软删除）
  static async deleteSessions(sessionIds: string[]): Promise<void> {
    return db.batchOperation(async () => {
      for (const sessionId of sessionIds) {
        await db.softDeleteSession(sessionId);
      }
    });
  }

  // 批量更新课程信息
  static async updateCourses(
    courseUpdates: Array<{ id: string; updates: Partial<Course> }>
  ): Promise<void> {
    return db.batchOperation(async () => {
      for (const { id, updates } of courseUpdates) {
        await db.courses.update(id, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  // 复制课表及其所有相关数据
  static async duplicateTimetable(
    timetableId: string,
    newName: string
  ): Promise<string> {
    return db.batchOperation(async () => {
      // 获取原课表
      const originalTimetable = await db
        .getActive(db.timetables)
        .filter(t => t.id === timetableId)
        .first();
      if (!originalTimetable) {
        throw new Error("原课表不存在");
      }

      // 创建新课表
      const newTimetableId = crypto.randomUUID();
      const newTimetable: Timetable = {
        ...originalTimetable,
        id: newTimetableId,
        name: newName,
      };
      await db.timetables.add(newTimetable);

      // 获取并复制所有课程
      const originalCourses = await db
        .getActive(db.courses)
        .filter(c => c.timetableId === timetableId)
        .toArray();
      const courseIdMap = new Map<string, string>();

      for (const originalCourse of originalCourses) {
        const newCourseId = crypto.randomUUID();
        courseIdMap.set(originalCourse.id, newCourseId);

        const newCourse: Course = {
          ...originalCourse,
          id: newCourseId,
          timetableId: newTimetableId,
        };
        await db.courses.add(newCourse);
      }

      // 获取并复制所有课时
      const originalSessions = await db
        .getActive(db.sessions)
        .filter(s => s.timetableId === timetableId)
        .toArray();

      for (const originalSession of originalSessions) {
        const newCourseId = courseIdMap.get(originalSession.courseId);
        if (newCourseId) {
          const newSession: Session = {
            ...originalSession,
            id: crypto.randomUUID(),
            timetableId: newTimetableId,
            courseId: newCourseId,
          };
          await db.sessions.add(newSession);
        }
      }

      return newTimetableId;
    });
  }

  // 移动课时到其他时间段
  static async moveSessions(
    sessionIds: string[],
    newDayOfWeek: number,
    newStartMinutes: number
  ): Promise<void> {
    return db.batchOperation(async () => {
      for (const sessionId of sessionIds) {
        const session = await db
          .getActive(db.sessions)
          .filter(s => s.id === sessionId)
          .first();
        if (session) {
          const duration = session.endMinutes - session.startMinutes;
          await db.sessions.update(sessionId, {
            dayOfWeek: newDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startMinutes: newStartMinutes,
            endMinutes: newStartMinutes + duration,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });
  }

  // 合并重复课程
  static async mergeDuplicateCourses(
    timetableId: string
  ): Promise<{ mergedCount: number; removedCourseIds: string[] }> {
    return db.batchOperation(async () => {
      const courses = await db
        .getActive(db.courses)
        .filter(c => c.timetableId === timetableId)
        .toArray();
      const courseGroups = new Map<string, Course[]>();

      // 按标题分组
      for (const course of courses) {
        const key = course.title.toLowerCase().trim();
        if (!courseGroups.has(key)) {
          courseGroups.set(key, []);
        }
        courseGroups.get(key)!.push(course);
      }

      let mergedCount = 0;
      const removedCourseIds: string[] = [];

      // 合并重复课程
      for (const [, duplicates] of courseGroups) {
        if (duplicates.length > 1) {
          // 保留第一个课程，删除其他重复的
          const keepCourse = duplicates[0];
          const duplicateIds = duplicates.slice(1).map(c => c.id);

          // 将重复课程的课时转移到保留的课程
          for (const duplicateId of duplicateIds) {
            await db
              .getActive(db.sessions)
              .filter(s => s.courseId === duplicateId)
              .modify({
                courseId: keepCourse.id,
                updatedAt: new Date().toISOString(),
              });

            // 软删除重复课程
            await db.softDeleteCourse(duplicateId);
            removedCourseIds.push(duplicateId);
            mergedCount++;
          }
        }
      }

      return { mergedCount, removedCourseIds };
    });
  }
}

// 数据一致性修复工具
export class DataIntegrityTools {
  // 修复时间冲突
  static async fixTimeConflicts(timetableId: string): Promise<{
    conflictsFound: number;
    conflictsFixed: number;
  }> {
    const sessions = await db
      .getActive(db.sessions)
      .filter(s => s.timetableId === timetableId)
      .toArray();
    let conflictsFound = 0;
    let conflictsFixed = 0;

    // 按天和课程分组检查冲突
    const dayGroups = new Map<number, Session[]>();

    for (const session of sessions) {
      const key = session.dayOfWeek;
      if (!dayGroups.has(key)) {
        dayGroups.set(key, []);
      }
      dayGroups.get(key)!.push(session);
    }

    return db.batchOperation(async () => {
      for (const [, daySessions] of dayGroups) {
        // 按开始时间排序
        daySessions.sort((a, b) => a.startMinutes - b.startMinutes);

        for (let i = 0; i < daySessions.length - 1; i++) {
          const current = daySessions[i];
          const next = daySessions[i + 1];

          // 检查是否有时间重叠
          if (current.endMinutes > next.startMinutes) {
            conflictsFound++;

            // 自动修复：调整当前课时的结束时间
            await db.sessions.update(current.id, {
              endMinutes: next.startMinutes,
              updatedAt: new Date().toISOString(),
            });
            conflictsFixed++;
          }
        }
      }

      return { conflictsFound, conflictsFixed };
    });
  }

  // 标准化时间格式
  static async standardizeTimeFormats(timetableId: string): Promise<void> {
    return db.batchOperation(async () => {
      const sessions = await db
        .getActive(db.sessions)
        .filter(s => s.timetableId === timetableId)
        .toArray();

      for (const session of sessions) {
        // 确保时间是15分钟的倍数
        const roundedStart = Math.round(session.startMinutes / 15) * 15;
        const roundedEnd = Math.round(session.endMinutes / 15) * 15;

        if (
          roundedStart !== session.startMinutes ||
          roundedEnd !== session.endMinutes
        ) {
          await db.sessions.update(session.id, {
            startMinutes: roundedStart,
            endMinutes: roundedEnd,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });
  }
}

// 导入导出工具
export class ImportExportTools {
  // 导出为CSV格式
  static async exportToCSV(timetableId: string): Promise<string> {
    const [timetable, courses, sessions] = await Promise.all([
      db
        .getActive(db.timetables)
        .filter(t => t.id === timetableId)
        .first(),
      db
        .getActive(db.courses)
        .filter(c => c.timetableId === timetableId)
        .toArray(),
      db
        .getActive(db.sessions)
        .filter(s => s.timetableId === timetableId)
        .toArray(),
    ]);

    if (!timetable) throw new Error("课表不存在");

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    let csv = "课程名称,教师,地点,星期,开始时间,结束时间,备注\n";

    for (const session of sessions) {
      const course = courseMap.get(session.courseId);
      if (course) {
        const startTime = `${Math.floor(session.startMinutes / 60)
          .toString()
          .padStart(
            2,
            "0"
          )}:${(session.startMinutes % 60).toString().padStart(2, "0")}`;
        const endTime = `${Math.floor(session.endMinutes / 60)
          .toString()
          .padStart(
            2,
            "0"
          )}:${(session.endMinutes % 60).toString().padStart(2, "0")}`;

        csv += `"${course.title}","${course.teacherName || ""}","${session.location || course.location || ""}","${dayNames[session.dayOfWeek]}","${startTime}","${endTime}","${course.notes || ""}"\n`;
      }
    }

    return csv;
  }

  // 从CSV导入（简化版本）
  static async importFromCSV(
    timetableId: string,
    csvContent: string
  ): Promise<{
    imported: number;
    errors: string[];
  }> {
    const lines = csvContent.split("\n").slice(1); // 跳过标题行
    let imported = 0;
    const errors: string[] = [];

    return db.batchOperation(async () => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // 简单的CSV解析（在实际项目中应该使用专门的CSV解析库）
          const fields = line
            .split(",")
            .map(field => field.replace(/^"|"$/g, ""));

          if (fields.length < 6) {
            errors.push(`第${i + 2}行：字段不足`);
            continue;
          }

          const [
            courseName,
            teacherName,
            location,
            dayName,
            startTime,
            endTime,
            notes,
          ] = fields;

          // 解析星期
          const dayOfWeek = [
            "周日",
            "周一",
            "周二",
            "周三",
            "周四",
            "周五",
            "周六",
          ].indexOf(dayName);
          if (dayOfWeek === -1) {
            errors.push(`第${i + 2}行：无效的星期 "${dayName}"`);
            continue;
          }

          // 解析时间
          const parseTime = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
          };

          const startMinutes = parseTime(startTime);
          const endMinutes = parseTime(endTime);

          // 查找或创建课程
          let course = await db
            .getActive(db.courses)
            .filter(
              c => c.timetableId === timetableId && c.title === courseName
            )
            .first();

          if (!course) {
            course = {
              id: crypto.randomUUID(),
              timetableId,
              title: courseName,
              teacherName: teacherName || undefined,
              location: location || undefined,
              notes: notes || undefined,
            };
            await db.courses.add(course);
          }

          // 创建课时
          const session: Session = {
            id: crypto.randomUUID(),
            timetableId,
            courseId: course.id,
            dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            startMinutes,
            endMinutes,
            location: location || undefined,
          };

          await db.sessions.add(session);
          imported++;
        } catch (error) {
          errors.push(`第${i + 2}行：${error}`);
        }
      }

      return { imported, errors };
    });
  }
}
