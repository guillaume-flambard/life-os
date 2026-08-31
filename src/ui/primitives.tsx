import { Box, type BoxProps, Stack } from "@chakra-ui/react";
import type { ReactNode } from "react";
import "./ui.css";

// Surface card (bespoke; Box only for layout overrides).
export function Card({ children, className, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box className={["ui-card", className].filter(Boolean).join(" ")} p={{ base: "4", md: "5" }} {...rest}>
      {children}
    </Box>
  );
}

// Editorial page header — the same calm opening on every screen.
export function PageHeader({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <Stack gap="1" mb="6">
      <h1 className="ui-h1">{title}</h1>
      {sub && <p className="ui-sub">{sub}</p>}
    </Stack>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <Stack gap="0.5" mb="3">
      <span className="ui-section-title">{children}</span>
      {hint && <span className="ui-sub" style={{ fontSize: "13.5px" }}>{hint}</span>}
    </Stack>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="ui-label" style={{ marginBottom: "6px", display: "block" }}>
      {children}
    </span>
  );
}

// Monochrome status pill.
export function Pill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return <span className={"ui-pill" + (active ? " active" : "")}>{children}</span>;
}
