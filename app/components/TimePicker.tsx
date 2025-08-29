import React from "react";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { TimeUtils } from "../utils/timeUtils";

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
  const { isMobile } = useMobileDetection();

  const initialTime = React.useMemo(() => {
    if (value !== undefined) return TimeUtils.formatMinutes(value);
    if (defaultValue !== undefined)
      return TimeUtils.formatMinutes(defaultValue);
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
        <Label
          className={cn(
            compact ? "py-1 text-xs" : "",
            isMobile ? "text-sm" : ""
          )}
        >
          {label}
        </Label>
      )}
      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        className={cn(
          compact && !isMobile ? "h-8" : "",
          isMobile ? "h-10 text-base" : ""
        )}
        required={required}
        min={min}
        max={max}
        step="300" // 5分钟间隔
        placeholder={placeholder}
      />
      {/* 隐藏的输入字段，提交时转换为分钟数 */}
      <input
        type="hidden"
        name={name}
        value={TimeUtils.parseTimeString(timeValue)}
      />
    </div>
  );
}
