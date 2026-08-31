import { Box, Button, HStack, Stack, Text, Textarea } from "@chakra-ui/react";
import { useState } from "react";
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
import { Card, PageHeader, SectionTitle } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { toaster } from "../ui/toaster";

export function Review({ ctx }: { ctx: Ctx }) {
  void ctx;
  const proposed = useAsync(() => listProposedDecisions(), []);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  const saveReflection = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await captureAdd(note.trim(), "reflection");
      setNote("");
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2500);
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
            <Textarea
              autoresize
              minH="28"
              placeholder="Sans filtre. Ce qui vient."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              bg="surface"
            />
            <HStack>
              {savedNote && (
                <FadeIn>
                  <HStack gap="1.5" color="accent.emphasis">
                    <IconCheck boxSize="4" />
                    <Text fontSize="sm">Gardé.</Text>
                  </HStack>
                </FadeIn>
              )}
              <Button ml="auto" onClick={saveReflection} loading={savingNote} disabled={!note.trim()} colorPalette="teal">
                Garder ce point
              </Button>
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
        <Button size="sm" colorPalette="teal" onClick={apply} loading={busy} flexShrink="0">
          Intégrer
        </Button>
      </HStack>
    </Card>
  );
}
