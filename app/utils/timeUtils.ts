export interface TimeFormatOptions {
  format?: "24h" | "12h";
  showSeconds?: boolean;
}

export class TimeUtils {
  /**
   * 将分钟数转换为时间字符串格式
   */
  static formatMinutes(
    minutes: number,
    options: TimeFormatOptions = {}
  ): string {
    const { format = "24h", showSeconds = false } = options;

    if (minutes < 0 || minutes >= 1440) return "00:00";

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (format === "12h") {
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const timeStr = `${displayHours}:${mins.toString().padStart(2, "0")}`;
      return showSeconds ? `${timeStr}:00 ${period}` : `${timeStr} ${period}`;
    }

    const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    return showSeconds ? `${timeStr}:00` : timeStr;
  }

  /**
   * 将时间字符串转换为分钟数
   */
  static parseTimeString(timeString: string): number {
    if (!timeString) return 0;

    // 处理 12 小时制格式
    const is12Hour =
      timeString.toLowerCase().includes("am") ||
      timeString.toLowerCase().includes("pm");
    const cleanTime = timeString.replace(/\s*(am|pm)\s*/gi, "");

    const [hoursStr, minutesStr] = cleanTime.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr || "0", 10);

    if (isNaN(hours) || isNaN(minutes)) return 0;

    if (is12Hour) {
      const isPM = timeString.toLowerCase().includes("pm");
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
    }

    return Math.max(0, Math.min(1439, hours * 60 + minutes));
  }

  /**
   * 格式化时间范围
   */
  static formatTimeRange(
    startMinutes: number,
    endMinutes: number,
    options: TimeFormatOptions = {}
  ): string {
    const start = this.formatMinutes(startMinutes, options);
    const end = this.formatMinutes(endMinutes, options);
    return `${start}–${end}`;
  }

  /**
   * 检查时间是否有效
   */
  static isValidTimeRange(startMinutes: number, endMinutes: number): boolean {
    return (
      startMinutes >= 0 &&
      startMinutes < 1440 &&
      endMinutes > 0 &&
      endMinutes <= 1440 &&
      endMinutes > startMinutes
    );
  }

  /**
   * 获取当前时间的分钟数
   */
  static getCurrentMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  /**
   * 计算两个时间点之间的持续时间（分钟）
   */
  static getDurationMinutes(startMinutes: number, endMinutes: number): number {
    if (endMinutes <= startMinutes) return 0;
    return endMinutes - startMinutes;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(durationMinutes: number): string {
    if (durationMinutes < 60) {
      return `${durationMinutes}分钟`;
    }

    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (minutes === 0) {
      return `${hours}小时`;
    }

    return `${hours}小时${minutes}分钟`;
  }

  /**
   * 将 HH:mm 格式转换为分钟数（更直观的接口）
   */
  static timeToMinutes(time: string): number {
    return this.parseTimeString(time);
  }

  /**
   * 将分钟数转换为 HH:mm 格式（更直观的接口）
   */
  static minutesToTime(minutes: number): string {
    return this.formatMinutes(minutes);
  }

  /**
   * 验证时间字符串格式是否正确
   */
  static isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  }

  /**
   * 在指定时间上添加分钟数
   */
  static addMinutes(time: string, minutesToAdd: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutesToAdd;
    // 处理跨天情况
    const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    return this.minutesToTime(normalizedMinutes);
  }

  /**
   * 检查时间是否在指定范围内
   */
  static isTimeInRange(
    time: string,
    startTime: string,
    endTime: string
  ): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    if (startMinutes <= endMinutes) {
      // 同一天内的时间范围
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    } else {
      // 跨天的时间范围（如 23:00 到 01:00）
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
  }

  /**
   * 将时间调整到最近的指定分钟间隔
   */
  static roundToInterval(time: string, interval: number): string {
    const minutes = this.timeToMinutes(time);
    const roundedMinutes = Math.round(minutes / interval) * interval;
    return this.minutesToTime(roundedMinutes % 1440);
  }

  /**
   * 检查两个时间段是否重叠
   */
  static isTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const start1Min = this.timeToMinutes(start1);
    const end1Min = this.timeToMinutes(end1);
    const start2Min = this.timeToMinutes(start2);
    const end2Min = this.timeToMinutes(end2);

    return start1Min < end2Min && start2Min < end1Min;
  }

  /**
   * 生成标准学校课表的时间段
   */
  static generateStandardSchoolSchedule(): Array<{
    label: string;
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
  }> {
    const schedule = [
      // 上午
      { label: "第1节", startTime: "08:00", endTime: "08:40" },
      { label: "第2节", startTime: "08:55", endTime: "09:35" },
      { label: "第3节", startTime: "09:50", endTime: "10:30" },
      // 下午
      { label: "第4节", startTime: "13:00", endTime: "13:40" },
      { label: "第5节", startTime: "13:55", endTime: "14:35" },
      { label: "第6节", startTime: "14:50", endTime: "15:30" },
    ];

    return schedule.map(item => ({
      ...item,
      startMinutes: this.timeToMinutes(item.startTime),
      endMinutes: this.timeToMinutes(item.endTime),
    }));
  }

  /**
   * 根据节次索引获取标准学校时间
   */
  static getStandardSchoolTime(segmentIndex: number): {
    startTime: string;
    endTime: string;
    startMinutes: number;
    endMinutes: number;
  } {
    const standardSchedule = this.generateStandardSchoolSchedule();

    if (segmentIndex < standardSchedule.length) {
      const segment = standardSchedule[segmentIndex];
      return {
        startTime: segment.startTime,
        endTime: segment.endTime,
        startMinutes: segment.startMinutes,
        endMinutes: segment.endMinutes,
      };
    } else {
      // 超出标准课表范围，按规律继续（以最后一节课时间为基础）
      const lastSegment = standardSchedule[standardSchedule.length - 1];
      const lastEndTime = lastSegment.endTime;
      const additionalSegments = segmentIndex - standardSchedule.length + 1;

      // 每节课40分钟，课间15分钟
      const startTime = this.addMinutes(
        lastEndTime,
        additionalSegments * 55 - 40
      );
      const endTime = this.addMinutes(startTime, 40);

      return {
        startTime,
        endTime,
        startMinutes: this.timeToMinutes(startTime),
        endMinutes: this.timeToMinutes(endTime),
      };
    }
  }

  /**
   * 星期数字转换为中文
   */
  static getDayName(dayOfWeek: number): string {
    const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return days[dayOfWeek] || "未知";
  }

  /**
   * 创建时间选择器的选项列表
   */
  static generateTimeOptions(
    startHour: number = 6,
    endHour: number = 22,
    interval: number = 5
  ): Array<{ value: number; label: string; time: string }> {
    const options: Array<{ value: number; label: string; time: string }> = [];

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const totalMinutes = hour * 60 + minute;
        const timeString = this.minutesToTime(totalMinutes);
        options.push({
          value: totalMinutes,
          label: timeString,
          time: timeString,
        });
      }
    }

    return options;
  }
}
