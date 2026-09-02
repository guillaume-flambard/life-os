import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import type { Ctx } from "../App";
import {
  captureAdd,
  capturesRecent,
  listOpenStories,
  setStoryStatus,
  type Capture,
  type OpenStory,
} from "../lib/ipc";
import { FadeIn, MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { IconCheck } from "../ui/icons";
import { Btn, Area } from "../ui/controls";
import { Card, PageHeader, SectionTitle } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { toaster } from "../ui/toaster";
import { t } from "../i18n";

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function Daily({ ctx }: { ctx: Ctx }) {
  void ctx;
  const stories = useAsync(() => listOpenStories(), []);
  const captures = useAsync(() => capturesRecent(20), []);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await captureAdd(note.trim(), "note");
      setNote("");
      captures.reload();
    } catch (e) {
      toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="6">
      <PageHeader title={t("Today")} sub={t("Jot a thought, move a step.")} />
      <Card>
        <Stack gap="3">
          <Text fontWeight="semibold">{t("What's on your mind?")}</Text>
          <Area
            rows={2}
            placeholder={t("A thought, a feeling, something you don't want to forget…")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <HStack>
            <Text fontSize="xs" color="fg.subtle" mr="auto">
              {t("It stays here, encrypted. For your eyes only.")}
            </Text>
            <Btn primary onClick={save} loading={saving} disabled={!note.trim()}>
              {t("Note it")}
            </Btn>
          </HStack>
        </Stack>
      </Card>

      <Box>
        <SectionTitle hint={t("Tick when done — one step at a time.")}>{t("Your small steps")}</SectionTitle>
        <Async
          state={stories}
          empty={(s) =>
            s.length === 0 ? (
              <EmptyState icon="🌤️" title={t("Nothing forced to do")} hint={t("Your next steps will appear here as you explore a decision.")} />
            ) : false
          }
        >
          {(list: OpenStory[]) => (
            <MotionBox variants={staggerContainer} initial="initial" animate="animate">
              <Stack gap="2.5">
                {list.map((s) => (
                  <MotionBox key={s.id} variants={staggerItem}>
                    <StepRow story={s} onDone={() => stories.reload()} />
                  </MotionBox>
                ))}
              </Stack>
            </MotionBox>
          )}
        </Async>
      </Box>

      <Box>
        <SectionTitle>{t("Your latest notes")}</SectionTitle>
        <Async
          state={captures}
          empty={(c) => (c.length === 0 ? <Text fontSize="sm" color="fg.subtle" px="1">{t("No notes yet.")}</Text> : false)}
        >
          {(list: Capture[]) => (
            <Stack gap="2">
              {list.map((c) => (
                <HStack key={c.id} align="start" gap="3" px="1" py="1.5">
                  <Box w="1.5" h="1.5" rounded="full" bg="border" mt="2" flexShrink="0" />
                  <Stack gap="0" flex="1" minW="0">
                    <Text fontSize="sm" lineHeight="1.6" whiteSpace="pre-wrap">
                      {c.content}
                    </Text>
                    <Text fontSize="10px" color="fg.subtle">
                      {timeAgo(c.created_at)}
                    </Text>
                  </Stack>
                </HStack>
              ))}
            </Stack>
          )}
        </Async>
      </Box>
    </Stack>
  );
}

function StepRow({ story, onDone }: { story: OpenStory; onDone: () => void }) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current);
  }, []);
  const complete = async () => {
    setDone(true);
    try {
      await setStoryStatus(story.id, "done");
      timer.current = window.setTimeout(onDone, 350);
    } catch {
      setDone(false);
    }
  };
  return (
    <FadeIn>
      <HStack
        bg="surface"
        borderWidth="1px"
        borderColor="border"
        rounded="l2"
        px="4"
        py="3"
        gap="3"
        opacity={done ? 0.5 : 1}
        transition="opacity 0.3s"
      >
        <button type="button" className={"ui-check" + (done ? " on" : "")} onClick={complete}>
          {done && <IconCheck boxSize="4" />}
        </button>
        <Stack gap="0.5" flex="1" minW="0">
          <Text fontSize="sm" fontWeight="medium" textDecoration={done ? "line-through" : undefined}>
            {story.title}
          </Text>
          {story.decision_title && (
            <Text fontSize="xs" color="fg.subtle" lineClamp="1">
              {t("for")} \u201c{story.decision_title}\u201d
            </Text>
          )}
        </Stack>
      </HStack>
    </FadeIn>
  );
}
