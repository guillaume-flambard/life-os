import { Box, HStack, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { ReasoningStream } from "../lib/reasoning";
import { MotionBox } from "./motion";

// Live reasoning in the refined 2026 register (Claude 4 / MUI X / assistant-ui):
// the model's streamed thinking is shown as a vertical timeline of short steps
// on a hairline rail — the current step pulses, past ones settle and dim, a
// timer runs — then it folds to a quiet "Réfléchi pendant N s" you can re-open.

// Turn a raw streamed thinking blob into short, legible steps. Models emit
// reasoning as lines, numbered/bulleted lists, or run-on sentences — normalize
// all of it: break on hard newlines and sentence ends, strip list markers, and
// fold tiny fragments back into the previous step so the rail stays readable.
function splitSteps(text: string): string[] {
  const t = text.replace(/\r/g, "").trim();
  if (!t) return [];
  const parts = t
    .split(/\n+|(?<=[.!?…])\s+(?=[A-ZÀ-Ÿ0-9"«])/u)
    .map((s) => s.trim().replace(/^\s*(?:\d+[.)]|[-•*])\s+/, "").trim())
    .filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    if (p.length < 12 && merged.length) merged[merged.length - 1] += " " + p;
    else merged.push(p);
  }
  return merged.length ? merged : [t];
}

function ShimmerLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize="sm"
      fontWeight="medium"
      css={{
        backgroundImage:
          "linear-gradient(100deg, var(--chakra-colors-fg-subtle) 30%, var(--chakra-colors-fg) 50%, var(--chakra-colors-fg-subtle) 70%)",
        backgroundSize: "220% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        animation: "lo-shimmer 2.1s linear infinite",
      }}
    >
      {children}
    </Text>
  );
}

function Spark({ pulsing }: { pulsing?: boolean }) {
  const svg = (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
    </svg>
  );
  if (!pulsing)
    return (
      <Box as="span" color="accent.emphasis" display="inline-flex" flexShrink="0">
        {svg}
      </Box>
    );
  return (
    <MotionBox
      as="span"
      color="accent"
      display="inline-flex"
      flexShrink="0"
      animate={{ opacity: [0.55, 1, 0.55], scale: [0.92, 1, 0.92] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {svg}
    </MotionBox>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <Box as="span" color="fg.subtle" ml="1" display="inline-flex" transform={open ? "rotate(180deg)" : undefined} transition="transform 0.25s">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

function Step({ text, state }: { text: string; state: "active" | "done" }) {
  const active = state === "active";
  return (
    <Box position="relative" pl="6" py="1.5" display="flex">
      {/* node on the rail */}
      <Box position="absolute" left="0" top="2.5" w="3.5" h="3.5" display="grid" placeItems="center">
        {active ? (
          <MotionBox
            w="2"
            h="2"
            rounded="full"
            bg="canvas"
            borderWidth="1.5px"
            borderColor="accent"
            animate={{ boxShadow: ["0 0 0 3px rgba(51,172,137,0.22)", "0 0 0 6px rgba(51,172,137,0)"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <Box w="1.5" h="1.5" rounded="full" bg="fg.subtle" />
        )}
      </Box>
      <Text fontSize="sm" lineHeight="1.55" color={active ? "fg" : "fg.muted"} transition="color 0.5s">
        {text}
        {active && (
          <Box as="span" ml="0.5" color="accent" css={{ animation: "lo-blink 1.05s step-end infinite" }}>
            ▍
          </Box>
        )}
      </Text>
    </Box>
  );
}

export function ReasoningPanel({ stream }: { stream: ReasoningStream }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => splitSteps(stream.text), [stream.text]);
  const thinking = stream.phase === "thinking";
  const secs = Math.max(1, Math.round(stream.seconds));

  if (stream.phase === "idle" && !stream.text) return null;

  const showBody = thinking || open;

  return (
    <MotionBox
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      alignSelf="stretch"
    >
      <HStack
        as="button"
        gap="2.5"
        py="1"
        w="full"
        justify="start"
        cursor={thinking ? "default" : "pointer"}
        onClick={() => !thinking && setOpen((v) => !v)}
        aria-expanded={thinking ? undefined : open}
      >
        <Spark pulsing={thinking} />
        {thinking ? (
          <ShimmerLabel>Réflexion</ShimmerLabel>
        ) : (
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Réfléchi pendant {secs}&nbsp;s
          </Text>
        )}
        {thinking && (
          <Text fontSize="xs" color="fg.subtle" fontVariantNumeric="tabular-nums" letterSpacing="0.02em">
            {secs}&nbsp;s
          </Text>
        )}
        {!thinking && <Chevron open={open} />}
      </HStack>

      {showBody && steps.length > 0 && (
        <Box
          mt="1"
          ml="1.5"
          position="relative"
          maxH={thinking ? "none" : "80"}
          overflowY={thinking ? "visible" : "auto"}
          _before={{
            content: '""',
            position: "absolute",
            left: "6.75px",
            top: "3",
            bottom: "3",
            w: "1.5px",
            bg: "border",
          }}
        >
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            return <Step key={i} text={s} state={thinking && isLast ? "active" : "done"} />;
          })}
        </Box>
      )}
    </MotionBox>
  );
}
