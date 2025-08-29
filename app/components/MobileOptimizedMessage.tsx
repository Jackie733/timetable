import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useMobileDetection } from "../hooks/useMobileDetection";

export function MobileOptimizedMessage() {
  const [showMessage, setShowMessage] = useState(false);
  const { isMobile } = useMobileDetection();

  useEffect(() => {
    // 只在移动端且第一次访问时显示提示
    if (isMobile && !localStorage.getItem("mobile-tips-seen")) {
      setShowMessage(true);
    }
  }, [isMobile]);

  const handleDismiss = () => {
    setShowMessage(false);
    localStorage.setItem("mobile-tips-seen", "true");
  };

  if (!isMobile || !showMessage) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed right-4 bottom-4 left-4 z-50"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-blue-200 bg-blue-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📱</div>
            <div className="flex-1">
              <h3 className="mb-1 font-medium text-blue-900">移动端优化提示</h3>
              <p className="mb-3 text-sm text-blue-700">
                本应用已针对移动设备优化，支持横向滚动查看完整课表，点击课程卡片可快速编辑。
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDismiss}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  知道了
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
