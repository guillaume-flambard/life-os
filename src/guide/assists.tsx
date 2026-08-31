import { Box, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import {
  decisionAlignValues,
  decisionGenerateStory,
  decisionSuggestOptions,
} from "../lib/ipc";
import { useReasoningStream } from "../lib/reasoning";
import { ReasoningPanel } from "../ui/Reasoning";

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
  return <AssistShell reasoning={reasoning} label="Je cherche les portes qui s'ouvrent…" />;
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
  return <AssistShell reasoning={reasoning} label="Je regarde si ça te ressemble…" />;
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
  return <AssistShell reasoning={reasoning} label="Je cherche un tout petit premier pas…" />;
}

function AssistShell({
  reasoning,
  label,
}: {
  reasoning: ReturnType<typeof useReasoningStream>;
  label: string;
}) {
  return (
    <Stack gap="2.5" alignSelf="start" maxW="90%">
      <Box bg="surface" borderWidth="1px" borderColor="border" rounded="l3" borderTopLeftRadius="sm" px="4" py="3">
        <Stack direction="row" align="center" gap="2.5">
          <Spinner size="sm" color="accent" />
          <Text fontSize="sm" color="fg.muted">
            {label}
          </Text>
        </Stack>
      </Box>
      <ReasoningPanel stream={reasoning} />
    </Stack>
  );
}
