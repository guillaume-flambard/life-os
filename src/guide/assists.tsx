import { Box, HStack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import {
  decisionAlignValues,
  decisionGenerateStory,
  decisionSuggestOptions,
} from "../lib/ipc";
import { useReasoningStream } from "../lib/reasoning";
import { ReasoningPanel } from "../ui/Reasoning";
import { MotionBox } from "../ui/motion";
import { t } from "../i18n";

// Small components that run one local-AI assist and stream its reasoning inline
// inside the conversation. Each calls `onDone` exactly once with its result
// (empty/undefined on failure — the flow always has a manual fallback).

function useOnce(fn: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function OptionFinder({
  context,
  onDone,
}: {
  context: string;
  onDone: (options: string[]) => void;
}) {
  const reasoning = useReasoningStream();
  useOnce(async () => {
    try {
      const r = await decisionSuggestOptions(context);
      onDone(r.options ?? []);
    } catch {
      onDone([]);
    }
  });
  return <AssistShell reasoning={reasoning} label={t("Looking for the doors that could open…")} />;
}

export function AlignFinder({
  option,
  intentions,
  onDone,
}: {
  option: string;
  intentions: string;
  onDone: (note: string | null) => void;
}) {
  const reasoning = useReasoningStream();
  useOnce(async () => {
    try {
      const r = await decisionAlignValues(option, intentions);
      onDone(r.note);
    } catch {
      onDone(null);
    }
  });
  return <AssistShell reasoning={reasoning} label={t("Checking whether it sounds like you…")} />;
}

export function StepFinder({
  context,
  onDone,
}: {
  context: string;
  onDone: (step: { title: string; why: string | null } | null) => void;
}) {
  const reasoning = useReasoningStream();
  useOnce(async () => {
    try {
      const s = await decisionGenerateStory(context);
      onDone({ title: s.title, why: s.why });
    } catch {
      onDone(null);
    }
  });
  return <AssistShell reasoning={reasoning} label={t("Looking for one very small first step…")} />;
}

function AssistShell({
  reasoning,
  label,
}: {
  reasoning: ReturnType<typeof useReasoningStream>;
  label: string;
}) {
  // Before the first thinking token, a warmup line; once tokens stream, the
  // live reasoning timeline takes over.
  const warming = reasoning.phase === "idle" && !reasoning.text;
  if (warming) {
    return (
      <Box alignSelf="stretch">
        <HStack gap="2.5" py="1">
          <MotionBox
            as="span"
            color="fg.subtle"
            display="inline-flex"
            animate={{ opacity: [0.55, 1, 0.55], scale: [0.92, 1, 0.92] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
            </svg>
          </MotionBox>
          <Text fontSize="sm" color="fg.muted">
            {label}
          </Text>
        </HStack>
      </Box>
    );
  }
  return <ReasoningPanel stream={reasoning} />;
}
