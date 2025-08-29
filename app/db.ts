import Dexie, { type Table } from "dexie";
import { TimeUtils } from "./utils/timeUtils";

export type TimetableType = "teacher" | "student";

// 基础实体接口
export interface BaseEntity {
  id: string;
  createdAt?: string; // ISO date
  updatedAt?: string; // ISO date
  deletedAt?: string | null; // 软删除时间戳
}

export interface Timetable extends BaseEntity {
  name: string;
  type: TimetableType;
  timezone?: string;
  weekStart?: 0 | 1; // 0 Sun, 1 Mon
  termRange?: { start: string; end: string } | null; // ISO dates
  days?: number; // number of displayed days (e.g., 5 or 7)
  segments?: Array<{
    label?: string;
    startMinutes: number;
    endMinutes: number;
    // 可选：添加便于阅读的时间字符串
    startTime?: string; // HH:mm 格式，用于显示
    endTime?: string; // HH:mm 格式，用于显示
  }>;
}

export interface Course extends BaseEntity {
  timetableId: string;
  title: string;
  color?: string;
  teacherName?: string;
  location?: string;
  notes?: string;
}

export interface Session extends BaseEntity {
  timetableId: string;
  courseId: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startMinutes: number; // minutes since 00:00
  endMinutes: number;
  weeks?: number[];
  location?: string;
}

// 备份数据结构
export interface BackupData {
  id: string;
  name: string;
  createdAt: string;
  data: {
    timetables: Timetable[];
    courses: Course[];
    sessions: Session[];
  };
  metadata: {
    version: string;
    totalRecords: number;
  };
}

// 存储备份信息
export interface Backup extends BaseEntity {
  name: string;
  size: number; // bytes
  recordCount: number;
  metadata: {
    version: string;
    tables: string[];
  };
}

export class TimetableDB extends Dexie {
  timetables!: Table<Timetable, string>;
  courses!: Table<Course, string>;
  sessions!: Table<Session, string>;
  backups!: Table<Backup, string>;

  constructor() {
    super("timetable-db");

    // Version 1: Original schema
    this.version(1).stores({
      timetables: "id",
      courses: "id, timetableId, [timetableId+title]",
      sessions: "id, timetableId, courseId, [timetableId+dayOfWeek]",
    });

    // Version 2: Add soft delete and backup support
    this.version(2)
      .stores({
        timetables: "id, createdAt, updatedAt, deletedAt",
        courses:
          "id, timetableId, createdAt, updatedAt, deletedAt, [timetableId+title]",
        sessions:
          "id, timetableId, courseId, createdAt, updatedAt, deletedAt, [timetableId+dayOfWeek]",
        backups: "id, createdAt, name",
      })
      .upgrade(tx => {
        // 数据迁移：为现有记录添加时间戳
        return this.upgradeToV2(tx);
      });

    // Hook: 自动添加时间戳
    this.timetables.hook("creating", this.addTimestamps);
    this.courses.hook("creating", this.addTimestamps);
    this.sessions.hook("creating", this.addTimestamps);
    this.backups.hook("creating", this.addTimestamps);
  }

  private addTimestamps = (primKey: unknown, obj: BaseEntity) => {
    const now = new Date().toISOString();
    obj.createdAt = now;
    obj.updatedAt = now;
    obj.deletedAt = null;
  };

  private updateTimestamps = (modifications: Record<string, unknown>) => {
    modifications.updatedAt = new Date().toISOString();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async upgradeToV2(tx: { table: (name: string) => any }) {
    const tables = ["timetables", "courses", "sessions"];
    const now = new Date().toISOString();

    for (const tableName of tables) {
      const table = tx.table(tableName);
      await table.toCollection().modify((record: BaseEntity) => {
        record.createdAt = record.createdAt || now;
        record.updatedAt = record.updatedAt || now;
        record.deletedAt = null;
      });
    }
  }

  // 软删除方法
  async softDeleteTimetable(id: string): Promise<void> {
    await this.timetables.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async softDeleteCourse(id: string): Promise<void> {
    await this.courses.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async softDeleteSession(id: string): Promise<void> {
    await this.sessions.update(id, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 恢复软删除的记录
  async restoreTimetable(id: string): Promise<void> {
    await this.timetables.update(id, {
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  async restoreCourse(id: string): Promise<void> {
    await this.courses.update(id, {
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  async restoreSession(id: string): Promise<void> {
    await this.sessions.update(id, {
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    });
  }

  // 获取未删除的记录
  getActive<T extends BaseEntity>(table: Table<T, string>) {
    return table.filter(item => !item.deletedAt);
  }

  // 获取已删除的记录
  getDeleted<T extends BaseEntity>(table: Table<T, string>) {
    return table.filter(item => !!item.deletedAt);
  }

  // 永久删除（真正删除）
  async permanentDelete<T extends BaseEntity>(
    table: Table<T, string>,
    id: string
  ): Promise<void> {
    await table.delete(id);
  }

  // 批量操作事务处理
  async batchOperation<T>(operation: () => Promise<T>): Promise<T> {
    return this.transaction(
      "rw",
      this.timetables,
      this.courses,
      this.sessions,
      this.backups,
      operation
    );
  }

  // 数据一致性检查
  async checkDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    orphanedRecords: {
      courses: Course[];
      sessions: Session[];
    };
  }> {
    const issues: string[] = [];
    const orphanedCourses: Course[] = [];
    const orphanedSessions: Session[] = [];

    try {
      // 获取所有活跃记录
      const [timetables, courses, sessions] = await Promise.all([
        this.getActive(this.timetables).toArray(),
        this.getActive(this.courses).toArray(),
        this.getActive(this.sessions).toArray(),
      ]);

      const timetableIds = new Set(timetables.map(t => t.id));
      const courseIds = new Set(courses.map(c => c.id));

      // 检查孤立的课程（引用不存在的课表）
      for (const course of courses) {
        if (!timetableIds.has(course.timetableId)) {
          orphanedCourses.push(course);
          issues.push(
            `Course "${course.title}" (${course.id}) references non-existent timetable ${course.timetableId}`
          );
        }
      }

      // 检查孤立的课时（引用不存在的课程或课表）
      for (const session of sessions) {
        if (!timetableIds.has(session.timetableId)) {
          orphanedSessions.push(session);
          issues.push(
            `Session ${session.id} references non-existent timetable ${session.timetableId}`
          );
        }
        if (!courseIds.has(session.courseId)) {
          orphanedSessions.push(session);
          issues.push(
            `Session ${session.id} references non-existent course ${session.courseId}`
          );
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        orphanedRecords: {
          courses: orphanedCourses,
          sessions: orphanedSessions,
        },
      };
    } catch (error) {
      issues.push(`Integrity check failed: ${error}`);
      return {
        isValid: false,
        issues,
        orphanedRecords: {
          courses: [],
          sessions: [],
        },
      };
    }
  }

  // 清理孤立记录
  async cleanupOrphanedRecords(): Promise<{
    cleanedCourses: number;
    cleanedSessions: number;
  }> {
    const integrity = await this.checkDataIntegrity();
    let cleanedCourses = 0;
    let cleanedSessions = 0;

    if (integrity.orphanedRecords.courses.length > 0) {
      await this.batchOperation(async () => {
        for (const course of integrity.orphanedRecords.courses) {
          await this.softDeleteCourse(course.id);
          cleanedCourses++;
        }
      });
    }

    if (integrity.orphanedRecords.sessions.length > 0) {
      await this.batchOperation(async () => {
        for (const session of integrity.orphanedRecords.sessions) {
          await this.softDeleteSession(session.id);
          cleanedSessions++;
        }
      });
    }

    return { cleanedCourses, cleanedSessions };
  }

  // 创建备份
  async createBackup(name: string): Promise<string> {
    const backupId = crypto.randomUUID();

    const [timetables, courses, sessions] = await Promise.all([
      this.getActive(this.timetables).toArray(),
      this.getActive(this.courses).toArray(),
      this.getActive(this.sessions).toArray(),
    ]);

    const backupData: BackupData = {
      id: backupId,
      name,
      createdAt: new Date().toISOString(),
      data: { timetables, courses, sessions },
      metadata: {
        version: "2.0",
        totalRecords: timetables.length + courses.length + sessions.length,
      },
    };

    const backupString = JSON.stringify(backupData);
    const backup: Backup = {
      id: backupId,
      name,
      size: new Blob([backupString]).size,
      recordCount: backupData.metadata.totalRecords,
      metadata: {
        version: "2.0",
        tables: ["timetables", "courses", "sessions"],
      },
    };

    await this.backups.add(backup);

    // 将备份数据保存到 localStorage（或可以扩展为其他存储方式）
    localStorage.setItem(`backup_${backupId}`, backupString);

    return backupId;
  }

  // 恢复备份
  async restoreBackup(
    backupId: string,
    options: {
      clearExisting?: boolean;
      merge?: boolean;
    } = { clearExisting: false, merge: true }
  ): Promise<{
    success: boolean;
    restoredRecords: number;
    error?: string;
  }> {
    try {
      const backupString = localStorage.getItem(`backup_${backupId}`);
      if (!backupString) {
        return { success: false, restoredRecords: 0, error: "备份数据未找到" };
      }

      const backupData: BackupData = JSON.parse(backupString);

      return await this.batchOperation(async () => {
        let restoredCount = 0;

        if (options.clearExisting) {
          // 清空现有数据（软删除）
          await Promise.all([
            this.getActive(this.timetables).modify({
              deletedAt: new Date().toISOString(),
            }),
            this.getActive(this.courses).modify({
              deletedAt: new Date().toISOString(),
            }),
            this.getActive(this.sessions).modify({
              deletedAt: new Date().toISOString(),
            }),
          ]);
        }

        // 恢复课表
        for (const timetable of backupData.data.timetables) {
          if (options.merge) {
            await this.timetables.put({ ...timetable, deletedAt: null });
          } else {
            await this.timetables.add(timetable);
          }
          restoredCount++;
        }

        // 恢复课程
        for (const course of backupData.data.courses) {
          if (options.merge) {
            await this.courses.put({ ...course, deletedAt: null });
          } else {
            await this.courses.add(course);
          }
          restoredCount++;
        }

        // 恢复课时
        for (const session of backupData.data.sessions) {
          if (options.merge) {
            await this.sessions.put({ ...session, deletedAt: null });
          } else {
            await this.sessions.add(session);
          }
          restoredCount++;
        }

        return { success: true, restoredRecords: restoredCount };
      });
    } catch (error) {
      return {
        success: false,
        restoredRecords: 0,
        error: `恢复失败: ${error}`,
      };
    }
  }

  // 获取备份列表
  async getBackups(): Promise<Backup[]> {
    return this.getActive(this.backups).reverse().toArray();
  }

  // 删除备份
  async deleteBackup(backupId: string): Promise<void> {
    await this.backups.update(backupId, {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    localStorage.removeItem(`backup_${backupId}`);
  }

  // 导出备份为文件
  async exportBackup(backupId: string): Promise<Blob> {
    const backupString = localStorage.getItem(`backup_${backupId}`);
    if (!backupString) {
      throw new Error("备份数据未找到");
    }
    return new Blob([backupString], { type: "application/json" });
  }

  // 从文件导入备份
  async importBackup(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const backupData: BackupData = JSON.parse(e.target?.result as string);
          const newBackupId = crypto.randomUUID();

          // 更新备份ID和创建时间
          backupData.id = newBackupId;
          backupData.name = `导入: ${backupData.name}`;
          backupData.createdAt = new Date().toISOString();

          const backup: Backup = {
            id: newBackupId,
            name: backupData.name,
            size: file.size,
            recordCount: backupData.metadata.totalRecords,
            metadata: {
              version: backupData.metadata.version,
              tables: ["timetables", "courses", "sessions"],
            },
          };

          await this.backups.add(backup);
          localStorage.setItem(
            `backup_${newBackupId}`,
            JSON.stringify(backupData)
          );

          resolve(newBackupId);
        } catch (error) {
          reject(new Error(`导入失败: ${error}`));
        }
      };
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  }

  // 时间工具方法 - 为段落添加时间字符串
  async enrichTimetableWithTimeStrings(
    timetableId: string
  ): Promise<Timetable | undefined> {
    const timetable = await this.getActive(this.timetables)
      .filter(t => t.id === timetableId)
      .first();
    if (!timetable) return undefined;

    if (timetable.segments) {
      timetable.segments = timetable.segments.map(segment => ({
        ...segment,
        startTime: TimeUtils.minutesToTime(segment.startMinutes),
        endTime: TimeUtils.minutesToTime(segment.endMinutes),
      }));
    }

    return timetable;
  }

  // 创建带有标准学校时间表的课表
  async createStandardSchoolTimetable(
    name: string,
    type: TimetableType
  ): Promise<string> {
    const id = crypto.randomUUID();
    const standardSchedule = TimeUtils.generateStandardSchoolSchedule();

    const timetable: Timetable = {
      id,
      name,
      type,
      days: 5, // 工作日
      segments: standardSchedule.map(item => ({
        label: item.label,
        startMinutes: item.startMinutes,
        endMinutes: item.endMinutes,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
    };

    await this.timetables.add(timetable);
    return id;
  }

  // 验证时间表中的时间段是否有冲突
  async validateTimetableTimeSegments(timetableId: string): Promise<{
    isValid: boolean;
    conflicts: Array<{
      segment1: number;
      segment2: number;
      reason: string;
    }>;
  }> {
    const timetable = await this.getActive(this.timetables)
      .filter(t => t.id === timetableId)
      .first();
    if (!timetable?.segments) {
      return { isValid: true, conflicts: [] };
    }

    const conflicts: Array<{
      segment1: number;
      segment2: number;
      reason: string;
    }> = [];

    // 检查段落之间的重叠
    for (let i = 0; i < timetable.segments.length; i++) {
      for (let j = i + 1; j < timetable.segments.length; j++) {
        const seg1 = timetable.segments[i];
        const seg2 = timetable.segments[j];

        const start1 = TimeUtils.minutesToTime(seg1.startMinutes);
        const end1 = TimeUtils.minutesToTime(seg1.endMinutes);
        const start2 = TimeUtils.minutesToTime(seg2.startMinutes);
        const end2 = TimeUtils.minutesToTime(seg2.endMinutes);

        if (TimeUtils.isTimeOverlap(start1, end1, start2, end2)) {
          conflicts.push({
            segment1: i,
            segment2: j,
            reason: `时间段重叠：${seg1.label || `第${i + 1}节`} (${start1}-${end1}) 与 ${seg2.label || `第${j + 1}节`} (${start2}-${end2})`,
          });
        }
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }
}

export const db = new TimetableDB();
