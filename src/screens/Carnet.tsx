import { Box, Collapsible, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { Btn } from "../ui/controls";
import { useState } from "react";
import type { Ctx } from "../App";
import {
  decisionDetail,
  listDecisions,
  type Decision,
  type DecisionDetail,
} from "../lib/ipc";
import { MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { Card, PageHeader, Pill } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { navigate } from "../ui/router";
import { IconCheck, IconPlus } from "../ui/icons";
import { t } from "../i18n";

const STATUS: Record<string, { label: () => string; active: boolean }> = {
  draft: { label: () => t("draft"), active: false },
  exploring: { label: () => t("exploring"), active: false },
  proposed: { label: () => t("ready"), active: true },
  applied: { label: () => t("integrated"), active: true },
  archived: { label: () => t("set aside"), active: false },
};

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

export function Carnet({ ctx }: { ctx: Ctx }) {
  const decisions = useAsync(() => listDecisions(), []);
  const expert = ctx.mode === "expert";

  return (
    <>
      <PageHeader title={t("Your notebook")} sub={t("The decisions you explored, with their small step.")} />
      <Async
        state={decisions}
        empty={(d) =>
          d.length === 0 ? (
            <EmptyState
              icon="📖"
              title={t("Your notebook is empty")}
              hint={t("Every decision you explore lands here, with its small step.")}
              action={
                <Btn primary onClick={() => navigate("home")}>
                  <IconPlus boxSize="4" /> {t("Explore a decision")}
                </Btn>
              }
            />
          ) : false
        }
      >
        {(list: Decision[]) => (
          <MotionBox variants={staggerContainer} initial="initial" animate="animate">
            <Stack gap="3">
              {list.map((d) => (
                <MotionBox key={d.id} variants={staggerItem}>
                  <DecisionCard decision={d} expert={expert} />
                </MotionBox>
              ))}
            </Stack>
          </MotionBox>
        )}
      </Async>
    </>
  );
}

function DecisionCard({ decision: d, expert }: { decision: Decision; expert: boolean }) {
  const s = STATUS[d.status] ?? STATUS.draft;
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DecisionDetail>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setError(undefined);
      try {
        setDetail(await decisionDetail(d.id));
      } catch (e) {
        setError(humanError(e));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card
      p="0"
      overflow="hidden"
      _hover={{ borderColor: open ? "border" : "accent" }}
      transition="border-color 0.15s"
    >
      <HStack
        as="button"
        align="start"
        gap="3"
        w="full"
        textAlign="left"
        p={{ base: "4", md: "5" }}
        onClick={toggle}
        aria-expanded={open}
      >
        <Box w="1" alignSelf="stretch" rounded="full" bg="accent" flexShrink="0" />
        <Stack gap="1.5" flex="1" minW="0">
          <Text fontWeight="medium" lineClamp={open ? undefined : 2}>
            {d.title}
          </Text>
          <HStack gap="2">
            <Pill active={s.active}>{s.label()}</Pill>
            <Text fontSize="xs" color="fg.subtle">
              {when(d.updated_at)}
            </Text>
            {expert && (
              <Text fontSize="10px" color="fg.subtle" fontFamily="mono">
                {d.status}
              </Text>
            )}
          </HStack>
        </Stack>
        <Box color="fg.subtle" flexShrink="0" transform={open ? "rotate(180deg)" : undefined} transition="transform 0.2s">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>
      </HStack>

      <Collapsible.Root open={open}>
        <Collapsible.Content>
          <Box px={{ base: "4", md: "5" }} pb="5" pl={{ base: "7", md: "8" }}>
            {loading && (
              <HStack gap="2.5" py="2" color="fg.muted">
                <Spinner size="sm" color="accent" />
                <Text fontSize="sm">{t("One moment…")}</Text>
              </HStack>
            )}
            {error && (
              <Text fontSize="sm" color="fg.muted" py="2">
                {error}
              </Text>
            )}
            {detail && <DecisionBody detail={detail} expert={expert} />}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Card>
  );
}

function DecisionBody({ detail, expert }: { detail: DecisionDetail; expert: boolean }) {
  const { decision, options, stories } = detail;
  const chosen = options.find((o) => o.chosen);

  return (
    <Stack gap="4" pt="1" borderTopWidth="1px" borderColor="border.subtle">
      {decision.proposal && (
        <Section title={t("Why")}>
          <Text fontSize="sm" color="fg.muted" lineHeight="1.6" whiteSpace="pre-wrap">
            {decision.proposal}
          </Text>
        </Section>
      )}

      {options.length > 0 && (
        <Section title={t("The paths")}>
          <Stack gap="1.5">
            {options.map((o) => (
              <HStack key={o.id} gap="2" align="start">
                <Box
                  mt="1.5"
                  w="1.5"
                  h="1.5"
                  rounded="full"
                  flexShrink="0"
                  bg={o.chosen ? "accent" : "fg.subtle"}
                />
                <Text fontSize="sm" color={o.chosen ? "fg" : "fg.muted"} fontWeight={o.chosen ? "medium" : "normal"}>
                  {o.label}
                  {o.is_null_option && (
                    <Text as="span" color="fg.subtle">
                      {" "}
                      · {t('the \'change nothing\' option')}
                    </Text>
                  )}
                </Text>
              </HStack>
            ))}
          </Stack>
        </Section>
      )}

      {decision.values_alignment_note && (
        <Section title={t("Does it sound like you")}>
          <Box bg="accent.subtle" rounded="l2" px="3.5" py="2.5">
            <Text fontSize="sm" lineHeight="1.6">
              {decision.values_alignment_note}
            </Text>
          </Box>
        </Section>
      )}

      {decision.distance_10_10_10 && (
        <Section title={t("10 minutes · 10 months · 10 years")}>
          <Text fontSize="sm" color="fg.muted" lineHeight="1.6" whiteSpace="pre-wrap">
            {decision.distance_10_10_10}
          </Text>
        </Section>
      )}

      {stories.length > 0 && (
        <Section title={t("Your small steps")}>
          <Stack gap="1.5">
            {stories.map((st) => (
              <HStack key={st.id} gap="2.5" align="start">
                <Box
                  mt="0.5"
                  color={st.status === "done" ? "accent.emphasis" : "fg.subtle"}
                  flexShrink="0"
                >
                  {st.status === "done" ? (
                    <IconCheck boxSize="4" />
                  ) : (
                    <Box w="4" h="4" rounded="full" borderWidth="1.5px" borderColor="fg.subtle" />
                  )}
                </Box>
                <Text
                  fontSize="sm"
                  color={st.status === "done" ? "fg.muted" : "fg"}
                  textDecoration={st.status === "done" ? "line-through" : undefined}
                >
                  {st.title}
                </Text>
              </HStack>
            ))}
          </Stack>
        </Section>
      )}

      {chosen?.premortem && (
        <Section title={t("If, a year on, it had failed")}>
          <Text fontSize="sm" color="fg.muted" lineHeight="1.6" whiteSpace="pre-wrap">
            {chosen.premortem}
          </Text>
        </Section>
      )}

      {expert && (
        <Text fontSize="10px" color="fg.subtle" fontFamily="mono">
          {detail.deltas.length} delta{detail.deltas.length > 1 ? "s" : ""} ·{" "}
          {decision.confidence != null ? `confidence ${decision.confidence}` : "no confidence"}
        </Text>
      )}
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="1.5">
      <Text fontSize="xs" fontWeight="medium" color="fg.muted" textTransform="none" letterSpacing="0.01em">
        {title}
      </Text>
      {children}
    </Stack>
  );
}
