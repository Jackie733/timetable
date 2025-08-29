import { useState, useEffect } from "react";

export interface MobileDetectionHook {
  isMobile: boolean;
  isTablet: boolean;
  screenWidth: number;
}

export function useMobileDetection(): MobileDetectionHook {
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    handleResize(); // 初始设置
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: screenWidth < 768,
    isTablet: screenWidth >= 768 && screenWidth < 1024,
    screenWidth,
  };
}
