import type { Timetable } from "../../db";
import { TimeUtils } from "../../utils/timeUtils";

export interface TimetableSegmentRowProps {
  segment: NonNullable<Timetable["segments"]>[0];
  segIndex: number;
  isMobile?: boolean;
  children: React.ReactNode;
}

export function TimetableSegmentRow({
  segment,
  segIndex,
  isMobile = false,
  children,
}: TimetableSegmentRowProps) {
  return (
    <tr key={segIndex}>
      <td
        className={`sticky-col bg-background text-center align-top ${
          isMobile ? "p-1" : "p-2"
        }`}
      >
        <div
          className={`font-medium ${
            isMobile ? "text-xs leading-tight" : "text-sm"
          }`}
        >
          {segment.label || segIndex + 1}
        </div>
        <div
          className={`text-muted-foreground ${
            isMobile ? "text-[9px] leading-tight" : "text-[11px]"
          }`}
        >
          {segment.startMinutes !== undefined &&
          segment.endMinutes !== undefined
            ? isMobile
              ? TimeUtils.formatMinutes(segment.startMinutes)
              : TimeUtils.formatTimeRange(
                  segment.startMinutes,
                  segment.endMinutes
                )
            : ""}
        </div>
      </td>
      {children}
    </tr>
  );
}
