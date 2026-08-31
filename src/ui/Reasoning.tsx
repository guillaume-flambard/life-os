import { Box, HStack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import type { ReasoningStream } from "../lib/reasoning";
import { MotionBox } from "./motion";

// Live reasoning, in the Claude / ChatGPT register:
// - while thinking: a shimmering "Réflexion…" label and the thoughts streaming
//   in, dimmed, auto-scrolled, with the top gently faded out
// - when done: it folds to a quiet "Réfléchi pendant N s" you can re-open

function ShimmerLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="sm"
      fontWeight="medium"
      css={{
        backgroundImage:
          "linear-gradient(90deg, var(--chakra-colors-fg-subtle) 0%, var(--chakra-colors-fg-subtle) 35%, var(--chakra-colors-fg) 50%, var(--chakra-colors-fg-subtle) 65%, var(--chakra-colors-fg-subtle) 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        animation: "lo-shimmer 1.6s linear infinite",
      }}
    >
      {children}
    </Text>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <Box as="span" color="fg.subtle" transform={open ? "rotate(180deg)" : undefined} transition="transform 0.2s">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

export function ReasoningPanel({ stream }: { stream: ReasoningStream }) {
  const [openWhenDone, setOpenWhenDone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest thought while thinking.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [stream.text]);

  if (stream.phase === "idle" && !stream.text) return null;

  const thinking = stream.phase === "thinking";
  const secs = Math.max(1, Math.round(stream.seconds));
  const showBody = thinking || openWhenDone;

  return (
    <MotionBox
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      alignSelf="stretch"
    >
      {/* Header */}
      <HStack
        as="button"
        gap="2"
        py="1"
        cursor={thinking ? "default" : "pointer"}
        onClick={() => !thinking && setOpenWhenDone((v) => !v)}
        w="full"
        justify="start"
      >
        {thinking ? (
          <MotionBox
            w="2"
            h="2"
            rounded="full"
            bg="accent"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            flexShrink="0"
          />
        ) : (
          <Box as="span" color="accent.emphasis" flexShrink="0" fontSize="sm">
            ✦
          </Box>
        )}
        {thinking ? (
          <ShimmerLabel>Réflexion…</ShimmerLabel>
        ) : (
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Réfléchi pendant {secs}&nbsp;s
          </Text>
        )}
        {!thinking && <Chevron open={openWhenDone} />}
      </HStack>

      {/* Streaming thoughts */}
      {showBody && (
        <Box
          ref={bodyRef}
          mt="1"
          ml="1"
          pl="3"
          borderLeftWidth="2px"
          borderColor="border"
          maxH={thinking ? "36" : "72"}
          overflowY="auto"
          css={
            thinking
              ? {
                  maskImage: "linear-gradient(to bottom, transparent 0, #000 28px)",
                  WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 28px)",
                }
              : undefined
          }
        >
          <Text
            as="pre"
            fontFamily="body"
            fontSize="sm"
            color="fg.muted"
            whiteSpace="pre-wrap"
            lineHeight="1.7"
            py="1"
          >
            {stream.text || "…"}
            {thinking && (
              <Box as="span" ml="0.5" color="accent" css={{ animation: "lo-blink 1s step-end infinite" }}>
                ▍
              </Box>
            )}
          </Text>
        </Box>
      )}
    </MotionBox>
  );
}
