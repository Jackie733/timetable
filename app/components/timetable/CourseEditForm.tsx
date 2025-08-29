import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { ColorSelector } from "../common/ColorSelector";
import type { SessionFormData } from "../../hooks/useCourseEditing";

export interface CourseEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  formDefaults: SessionFormData | null;
  selectedColor: string;
  onColorChange: (color: string) => void;
  timetableId: string;
  existingSessionId?: string;
  onDeleteSession?: () => void;
  isBusy?: boolean;
  isMobile?: boolean;
}

export function CourseEditForm({
  isOpen,
  onClose,
  formDefaults,
  selectedColor,
  onColorChange,
  timetableId,
  existingSessionId,
  onDeleteSession,
  isBusy = false,
  isMobile = false,
}: CourseEditFormProps) {
  if (!formDefaults) return null;

  const isEditing = !!existingSessionId;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className={isMobile ? "w-[calc(100%-2rem)] max-w-none" : "max-w-md"}
      >
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-base" : "text-lg"}>
            {isEditing ? "编辑课时" : "添加课时"}
          </DialogTitle>
        </DialogHeader>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="update-cell" />
          <input type="hidden" name="timetableId" value={timetableId} />
          <input
            type="hidden"
            name="dayOfWeek"
            value={formDefaults.dayOfWeek}
          />
          <input
            type="hidden"
            name="startMinutes"
            value={formDefaults.startMinutes}
          />
          <input
            type="hidden"
            name="endMinutes"
            value={formDefaults.endMinutes}
          />
          <input type="hidden" name="color" value={selectedColor} />
          {existingSessionId && (
            <input
              type="hidden"
              name="existingSessionId"
              value={existingSessionId}
            />
          )}

          <div>
            <Label htmlFor="title" className={isMobile ? "text-sm" : ""}>
              课程名称
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={formDefaults.title}
              placeholder="请输入课程名称"
              required
              className={isMobile ? "mt-1" : ""}
            />
          </div>

          <div>
            <Label htmlFor="location" className={isMobile ? "text-sm" : ""}>
              上课地点（可选）
            </Label>
            <Input
              id="location"
              name="location"
              defaultValue={formDefaults.location}
              placeholder="请输入上课地点"
              className={isMobile ? "mt-1" : ""}
            />
          </div>

          <div>
            <Label className={`mb-2 block ${isMobile ? "text-sm" : ""}`}>
              课程颜色
            </Label>
            <ColorSelector
              selectedColor={selectedColor}
              onColorChange={onColorChange}
              isMobile={isMobile}
            />
          </div>

          <DialogFooter className={isMobile ? "flex-col gap-3" : ""}>
            <div className={isMobile ? "w-full" : ""}>
              {isEditing && onDeleteSession && (
                <Button
                  type="button"
                  variant="destructive"
                  size={isMobile ? "default" : "sm"}
                  className={isMobile ? "w-full" : ""}
                  onClick={onDeleteSession}
                >
                  删除
                </Button>
              )}
            </div>
            <div className={`flex gap-2 ${isMobile ? "w-full" : ""}`}>
              <Button
                type="button"
                onClick={onClose}
                variant="ghost"
                size={isMobile ? "default" : "sm"}
                className={isMobile ? "flex-1" : ""}
              >
                取消
              </Button>
              <Button
                disabled={isBusy}
                className={isMobile ? "flex-1" : ""}
                size={isMobile ? "default" : "sm"}
              >
                {isEditing ? "更新" : "保存"}
              </Button>
            </div>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
