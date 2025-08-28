// Animation utilities following animations.mdc guidelines

// Spring presets for Motion
export const springPresets = {
  // Default spring - smooth and responsive
  default: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
    mass: 1,
  },

  // Gentle spring for modals and large elements
  gentle: {
    type: "spring" as const,
    stiffness: 200,
    damping: 25,
    mass: 1,
  },

  // Snappy spring for buttons and interactions
  snappy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
    mass: 0.8,
  },

  // Soft spring for subtle animations
  soft: {
    type: "spring" as const,
    stiffness: 150,
    damping: 20,
    mass: 1,
  },
} as const;

// Animation variants for common patterns
export const animationVariants = {
  // Modal animations - origin-aware
  modal: {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 10,
    },
  },

  // Slide animations for tabs and panels
  slideIn: {
    hidden: {
      opacity: 0,
      x: 20,
    },
    visible: {
      opacity: 1,
      x: 0,
    },
    exit: {
      opacity: 0,
      x: -20,
    },
  },

  // Fade animations for content
  fade: {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    },
    exit: {
      opacity: 0,
    },
  },

  // Scale animations for buttons
  scale: {
    rest: {
      scale: 1,
    },
    hover: {
      scale: 1.02,
    },
    tap: {
      scale: 0.98,
    },
  },

  // List item animations
  listItem: {
    hidden: {
      opacity: 0,
      x: -10,
    },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        ...springPresets.default,
        delay: index * 0.05,
      },
    }),
    exit: {
      opacity: 0,
      x: 10,
    },
  },

  // Tab content animations
  tabContent: {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
    },
    exit: {
      opacity: 0,
      y: -5,
    },
  },
} as const;

// Transition presets
export const transitions = {
  // Default spring transition
  spring: springPresets.default,

  // Quick hover transitions (following the 200ms rule)
  hover: {
    duration: 0.2,
    ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
  },

  // Smooth page transitions
  page: {
    duration: 0.3,
    ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
  },

  // Fast interactions
  fast: {
    duration: 0.15,
    ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
  },
} as const;

// Reduced motion support
export const reduceMotion = {
  modal: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    rest: { scale: 1 },
    hover: { scale: 1 },
    tap: { scale: 1 },
  },
  listItem: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  tabContent: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
} as const;

// Hook to check for reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Custom hook for origin-aware animations
export function useOriginAwareAnimation(
  triggerRef: React.RefObject<HTMLElement>
) {
  const [origin, setOrigin] = React.useState({ x: "50%", y: "50%" });

  React.useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const originX = (centerX / viewportWidth) * 100;
      const originY = (centerY / viewportHeight) * 100;

      setOrigin({
        x: `${Math.max(0, Math.min(100, originX))}%`,
        y: `${Math.max(0, Math.min(100, originY))}%`,
      });
    }
  }, [triggerRef]);

  return origin;
}

import React from "react";
