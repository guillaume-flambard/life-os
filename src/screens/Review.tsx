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
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <Stack gap="6">
      <PageHeader title="Le point" sub="Regarder en arrière, sans se juger." />
      <Card bg="accent.subtle" borderColor="transparent">
        <Stack gap="1.5">
          <Text fontWeight="semibold">Faire le point, c'est regarder — pas se juger.</Text>
          <Text fontSize="sm" color="fg.muted" lineHeight="1.6">
            Ce que tu voulais, ce qui s'est passé, ce que tu en apprends. Rien de plus.
          </Text>
        </Stack>
      </Card>

      <Box>
        <SectionTitle hint="Tu les as explorées. Prêtes à rejoindre ta boussole ?">
          Décisions à intégrer
        </SectionTitle>
        <Async
          state={proposed}
          empty={(d) =>
            d.length === 0 ? (
              <EmptyState icon="🍃" title="Rien en attente" hint="Quand une décision est prête, elle apparaît ici pour l'intégrer." />
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
        <SectionTitle>Écrire pour faire le point</SectionTitle>
        <Card>
          <Stack gap="3">
            <Area
              rows={3}
              placeholder="Sans filtre. Ce qui vient."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <HStack>
              {savedNote && (
                <FadeIn>
                  <HStack gap="1.5" color="fg.muted">
                    <IconCheck boxSize="4" />
                    <Text fontSize="sm">Gardé.</Text>
                  </HStack>
                </FadeIn>
              )}
              <Box ml="auto">
                <Btn primary onClick={saveReflection} loading={savingNote} disabled={!note.trim()}>
                  Garder ce point
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
      toaster.create({ type: "success", title: "Intégré à ta boussole" });
      onApplied();
    } catch (e) {
      toaster.create({ type: "error", title: "Impossible d'intégrer", description: humanError(e) });
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
            Intégrer
          </Btn>
        </Box>
      </HStack>
    </Card>
  );
}
