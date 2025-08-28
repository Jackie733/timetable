import React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface TimePickerProps {
  name: string;
  value?: number; // 分钟数
  defaultValue?: number; // 分钟数
  label?: string;
  className?: string;
  required?: boolean;
  min?: string; // HH:mm 格式
  max?: string; // HH:mm 格式
  placeholder?: string;
  compact?: boolean; // 紧凑模式
}

export function TimePicker({
  name,
  value,
  defaultValue,
  label,
  className = "",
  required = false,
  min,
  max,
  placeholder,
  compact = false,
}: TimePickerProps) {
  // 将分钟数转换为 HH:mm 格式
  const minutesToTime = (minutes: number): string => {
    if (minutes < 0 || minutes > 1439) return "08:00";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // 将 HH:mm 格式转换为分钟数
  const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return Math.max(0, Math.min(1439, hours * 60 + minutes));
  };

  const initialTime = React.useMemo(() => {
    if (value !== undefined) return minutesToTime(value);
    if (defaultValue !== undefined) return minutesToTime(defaultValue);
    return "08:00";
  }, [value, defaultValue]);

  const [timeValue, setTimeValue] = React.useState(initialTime);

  // 处理时间变化
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
  };

  return (
    <div className={className}>
      {label && (
        <Label className={cn(compact ? "py-1 text-xs" : "")}>{label}</Label>
      )}
      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        className={cn(compact ? "h-8" : "")}
        required={required}
        min={min}
        max={max}
        step="300" // 5分钟间隔
        placeholder={placeholder}
      />
      {/* 隐藏的输入字段，提交时转换为分钟数 */}
      <input type="hidden" name={name} value={timeToMinutes(timeValue)} />
    </div>
  );
}
