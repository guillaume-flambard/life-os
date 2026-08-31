import { Box, Collapsible, HStack, Icon, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import type { ReasoningStream } from "../lib/reasoning";
import { MotionBox } from "./motion";

// Shows the local model's reasoning as it streams — a calm, collapsible
// disclosure in the Claude-Code register. Opens itself while thinking,
// stays available (collapsed) once the answer lands.

function ThinkingDot() {
  return (
    <MotionBox
      w="1.5"
      h="1.5"
      rounded="full"
      bg="accent"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function ReasoningPanel({ stream }: { stream: ReasoningStream }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-open while thinking; auto-scroll to the newest line.
  useEffect(() => {
    if (stream.active) setOpen(true);
  }, [stream.active]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [stream.text]);

  if (!stream.text && !stream.active) return null;

  return (
    <MotionBox
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      borderWidth="1px"
      borderColor="border"
      bg="surface.muted"
      rounded="l2"
      overflow="hidden"
    >
      <Collapsible.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Collapsible.Trigger asChild>
          <HStack
            as="button"
            w="full"
            px="3.5"
            py="2.5"
            gap="2.5"
            cursor="pointer"
            _hover={{ bg: "border.subtle" }}
            transition="background 0.15s"
          >
            {stream.active ? (
              <ThinkingDot />
            ) : (
              <Box w="1.5" h="1.5" rounded="full" bg="fg.subtle" />
            )}
            <Text fontSize="sm" fontWeight="medium" color="fg.muted">
              {stream.active ? "Réflexion en cours…" : "Comment j'y suis arrivé"}
            </Text>
            <Icon ml="auto" color="fg.subtle" transform={open ? "rotate(180deg)" : undefined} transition="transform 0.2s">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Icon>
          </HStack>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box
            ref={bodyRef}
            px="3.5"
            pb="3"
            maxH="44"
            overflowY="auto"
            borderTopWidth="1px"
            borderColor="border.subtle"
          >
            <Text
              as="pre"
              fontFamily="mono"
              fontSize="xs"
              color="fg.muted"
              whiteSpace="pre-wrap"
              lineHeight="1.7"
              pt="3"
            >
              {stream.text}
              {stream.active && <Box as="span" color="accent" animation="pulse">▋</Box>}
            </Text>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </MotionBox>
  );
}
