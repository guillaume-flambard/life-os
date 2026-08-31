import { Box, type BoxProps } from "@chakra-ui/react";
import { motion } from "framer-motion";
import type { ComponentType } from "react";

// framer-motion + Chakra Box. Used for page transitions and list stagger.
// Chakra's `transition` style prop and framer's `transition` prop share a name;
// typing as `any` sidesteps that collision while keeping runtime behaviour.
export const MotionBox = motion.create(Box) as ComponentType<any>;

export function FadeIn({
  children,
  delay = 0,
  y = 8,
  ...rest
}: BoxProps & { delay?: number; y?: number; children: React.ReactNode }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionBox>
  );
}

// Page-level wrapper: keyed by route so React remounts and the transition plays.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      h="full"
    >
      {children}
    </MotionBox>
  );
}

// Staggered list container + item, for lists of cards.
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.05 } },
};
export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
};
