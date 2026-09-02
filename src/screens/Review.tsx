import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState, useRef, useEffect } from "react";
import type { Ctx } from "../App";
import {
  applyDecision,
  captureAdd,
  decisionDetail,
  listProposedDecisions,
  type DecisionFull,
} from "../lib/ipc";
import { FadeIn, MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { IconCheck } from "../ui/icons";
import { Btn, Area } from "../ui/controls";
import { Card, PageHeader, SectionTitle } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { toaster } from "../ui/toaster";
import { t } from "../i18n";

export function Review({ ctx }: { ctx: Ctx }) {
  void ctx;
  const proposed = useAsync(() => listProposedDecisions(), []);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const noteTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (noteTimer.current != null) window.clearTimeout(noteTimer.current);
  }, []);

  const saveReflection = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await captureAdd(note.trim(), "reflection");
      setNote("");
      setSavedNote(true);
      noteTimer.current = window.setTimeout(() => setSavedNote(false), 2500);
    } catch (e) {
      toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Stack gap="6">
      <PageHeader title={t("The check-in")} sub={t("Looking back, without judging.")} />
      <Card bg="accent.subtle" borderColor="transparent">
        <Stack gap="1.5">
          <Text fontWeight="semibold">{t("Checking in is looking — not judging.")}</Text>
          <Text fontSize="sm" color="fg.muted" lineHeight="1.6">
            {t("What you hoped for, what happened, what it teaches you. Nothing more.")}
          </Text>
        </Stack>
      </Card>

      <Box>
        <SectionTitle hint={t("You explored them. Ready to join your compass?")}>
          {t("Decisions to integrate")}
        </SectionTitle>
        <Async
          state={proposed}
          empty={(d) =>
            d.length === 0 ? (
              <EmptyState icon="🍃" title={t("Nothing waiting")} hint={t("When a decision is ready, it appears here to be integrated.")} />
            ) : false
          }
        >
          {(list: DecisionFull[]) => (
            <MotionBox variants={staggerContainer} initial="initial" animate="animate">
              <Stack gap="3">
                {list.map((d) => (
                  <MotionBox key={d.id} variants={staggerItem}>
                    <ProposedRow decision={d} onApplied={() => proposed.reload()} />
                  </MotionBox>
                ))}
              </Stack>
            </MotionBox>
          )}
        </Async>
      </Box>

      <Box>
        <SectionTitle>{t("Write it down to check in")}</SectionTitle>
        <Card>
          <Stack gap="3">
            <Area
              rows={3}
              placeholder={t("No filter. Whatever comes.")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <HStack>
              {savedNote && (
                <FadeIn>
                  <HStack gap="1.5" color="fg.muted">
                    <IconCheck boxSize="4" />
                    <Text fontSize="sm">{t("Kept.")}</Text>
                  </HStack>
                </FadeIn>
              )}
              <Box ml="auto">
                <Btn primary onClick={saveReflection} loading={savingNote} disabled={!note.trim()}>
                  {t("Keep this check-in")}
                </Btn>
              </Box>
            </HStack>
          </Stack>
        </Card>
      </Box>
    </Stack>
  );
}

function ProposedRow({ decision, onApplied }: { decision: DecisionFull; onApplied: () => void }) {
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const detail = await decisionDetail(decision.id);
      const resolutions = detail.deltas.map((dl) => ({
        delta_id: dl.id,
        domain_id: dl.domain_id,
        target_intention_id: dl.target_intention_id,
      }));
      await applyDecision(decision.id, resolutions);
      toaster.create({ type: "success", title: t("Integrated into your compass") });
      onApplied();
    } catch (e) {
      toaster.create({ type: "error", title: t("Couldn't integrate"), description: humanError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <HStack align="start" gap="3">
        <Stack gap="1" flex="1" minW="0">
          <Text fontWeight="medium" lineClamp="2">
            {decision.title}
          </Text>
          {decision.values_alignment_note && (
            <Text fontSize="sm" color="fg.muted" lineClamp="2">
              {decision.values_alignment_note}
            </Text>
          )}
        </Stack>
        <Box flexShrink="0">
          <Btn sm primary onClick={apply} loading={busy}>
            {t("Integrate")}
          </Btn>
        </Box>
      </HStack>
    </Card>
  );
}
