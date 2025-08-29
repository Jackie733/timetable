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
}
