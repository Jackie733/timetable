import { useState } from "react";
import type { Course, Session } from "../db";

export interface CourseFormData {
  title: string;
  location: string;
  color: string;
}

export interface SessionFormData extends CourseFormData {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

export interface UseCourseEditingOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface EditingCell {
  day: number;
  segIndex: number;
  session?: Session;
  course?: Course;
}

export function useCourseEditing(options: UseCourseEditingOptions = {}) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [formDefaults, setFormDefaults] = useState<SessionFormData | null>(
    null
  );
  const [selectedColor, setSelectedColor] = useState<string>("#a5b4fc");

  const openEdit = (
    day: number,
    segIndex: number,
    session?: Session,
    course?: Course,
    segmentStartMinutes?: number,
    segmentEndMinutes?: number
  ) => {
    setEditingCell({ day, segIndex, session, course });
    const defaultColor = "#a5b4fc";
    const defaults: SessionFormData = {
      title: course?.title || "",
      location: session?.location || "",
      color: course?.color || defaultColor,
      dayOfWeek: day,
      startMinutes: segmentStartMinutes || segIndex * 60 + 480,
      endMinutes: segmentEndMinutes || segIndex * 60 + 525,
    };
    setFormDefaults(defaults);
    setSelectedColor(course?.color || defaultColor);
  };

  const closeEdit = () => {
    setEditingCell(null);
    setFormDefaults(null);
    options.onSuccess?.();
  };

  const handleError = (error: string) => {
    options.onError?.(error);
  };

  return {
    editingCell,
    formDefaults,
    selectedColor,
    setSelectedColor,
    openEdit,
    closeEdit,
    handleError,
  };
}
