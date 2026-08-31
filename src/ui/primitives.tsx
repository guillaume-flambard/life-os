import { Box, type BoxProps, Heading, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

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
