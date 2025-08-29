import { Form, useNavigation } from "react-router";
import { useMobileDetection } from "../../hooks/useMobileDetection";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";

export interface CreateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTimetableModal({
  isOpen,
  onClose,
}: CreateTimetableModalProps) {
  const nav = useNavigation();
  const busy = nav.state === "submitting";
  const { isMobile } = useMobileDetection();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
      <Card className={`w-full p-4 ${isMobile ? "modal-mobile" : "max-w-md"}`}>
        <div
          className={`mb-3 font-medium ${isMobile ? "text-base" : "text-lg"}`}
        >
          创建新课表
        </div>
        <Form method="post" onSubmit={onClose} className="space-y-3">
          <div>
            <Label>名称</Label>
            <Input
              name="name"
              placeholder="例如：张老师-春季学期"
              required
              className={isMobile ? "text-base" : ""}
            />
          </div>
          <div>
            <Label>模式</Label>
            <select
              name="type"
              className={`select w-full ${isMobile ? "min-h-[44px] text-base" : ""}`}
            >
              <option value="teacher">老师课表</option>
              <option value="student">学生课表</option>
            </select>
          </div>
          <div
            className={`flex gap-2 ${isMobile ? "flex-col pt-2" : "justify-end"}`}
          >
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={isMobile ? "w-full" : ""}
            >
              取消
            </Button>
            <Button disabled={busy} className={isMobile ? "w-full" : ""}>
              {busy ? "创建中…" : "创建"}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
