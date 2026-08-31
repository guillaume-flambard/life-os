import { Badge, Box, type BoxProps, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

// Editorial page header: a tight, low-key title over one muted line. Every
// screen opens the same calm way (ChatGPT/Claude/Perplexity register).
export function PageHeader({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <Stack gap="1" mb="6">
      <Heading as="h1" fontSize="2xl" fontWeight="semibold" letterSpacing="-0.02em" lineHeight="1.15">
        {title}
      </Heading>
      {sub && (
        <Text fontSize="md" color="fg.muted" lineHeight="1.5">
          {sub}
        </Text>
      )}
    </Stack>
  );
}

// Monochrome status pill — neutral by default, teal when it's the live/positive
// state. The palette stays disciplined: one accent, everything else quiet.
export function Pill({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Badge
      variant="subtle"
      colorPalette={active ? "teal" : "gray"}
      rounded="full"
      px="2.5"
      fontWeight="medium"
      textTransform="none"
    >
      {children}
    </Badge>
  );
}

// A soft surface card — the base container for every panel.
export function Card({ children, ...rest }: BoxProps & { children: ReactNode }) {
  return (
    <Box
      bg="surface"
      borderWidth="1px"
      borderColor="border"
      rounded="l3"
      p={{ base: "4", md: "5" }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Stack gap="0.5" mb="3">
      <Heading size="sm" fontWeight="semibold" letterSpacing="-0.01em">
        {children}
      </Heading>
      {hint && (
        <Text fontSize="sm" color="fg.muted">
          {hint}
        </Text>
      )}
    </Stack>
  );
}

// A quiet inline label above a field.
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb="1.5" textTransform="none">
      {children}
    </Text>
  );
}
