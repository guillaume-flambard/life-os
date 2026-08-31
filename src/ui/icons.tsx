import { Icon, type IconProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

// Small stroke icon set (no icon-lib dependency). 24px grid, currentColor.
function Glyph({ children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <Icon {...rest}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </Icon>
  );
}

export const IconHome = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Glyph>
);

export const IconCompass = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </Glyph>
);

export const IconCarnet = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M5 4h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z" />
    <path d="M9 8h6M9 12h4" />
  </Glyph>
);

export const IconReview = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M21 12a9 9 0 1 1-3.2-6.9" />
    <path d="M21 4v5h-5" />
    <path d="m9 12 2 2 4-4" />
  </Glyph>
);

export const IconDaily = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
  </Glyph>
);

export const IconSettings = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </Glyph>
);

export const IconSun = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
  </Glyph>
);

export const IconMoon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Glyph>
);

export const IconHeart = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 5a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
  </Glyph>
);

export const IconArrow = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Glyph>
);

export const IconPlus = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M12 5v14M5 12h14" />
  </Glyph>
);

export const IconSparkle = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5 9 9M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5" />
  </Glyph>
);

export const IconCheck = (p: IconProps) => (
  <Glyph {...p}>
    <path d="m5 12 5 5L20 7" />
  </Glyph>
);
