import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import type { Ctx } from "../App";
import { listDecisions, type Decision } from "../lib/ipc";
import { MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { Card, PageHeader, Pill } from "../ui/primitives";
import { Async, EmptyState, useAsync } from "../ui/states";
import { navigate } from "../ui/router";
import { IconPlus } from "../ui/icons";

const STATUS: Record<string, { label: string; active: boolean }> = {
  draft: { label: "brouillon", active: false },
  exploring: { label: "en réflexion", active: false },
  proposed: { label: "prête", active: true },
  applied: { label: "intégrée", active: true },
  archived: { label: "rangée", active: false },
};

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

export function Carnet({ ctx }: { ctx: Ctx }) {
  const decisions = useAsync(() => listDecisions(), []);
  const expert = ctx.mode === "expert";

  return (
    <>
      <PageHeader title="Ton carnet" sub="Les décisions que tu as explorées, avec leur petit pas." />
      <Async
        state={decisions}
        empty={(d) =>
          d.length === 0 ? (
            <EmptyState
              icon="📖"
              title="Ton carnet est vide"
              hint="Chaque décision que tu explores atterrit ici, avec son petit pas."
              action={
                <Button colorPalette="teal" onClick={() => navigate("home")}>
                  <IconPlus boxSize="4" /> Explorer une décision
                </Button>
              }
            />
          ) : false
        }
      >
        {(list: Decision[]) => (
          <MotionBox variants={staggerContainer} initial="initial" animate="animate">
            <Stack gap="3">
            {list.map((d) => {
              const s = STATUS[d.status] ?? STATUS.draft;
              return (
                <MotionBox key={d.id} variants={staggerItem}>
                  <Card
                    _hover={{ borderColor: "accent" }}
                    transition="border-color 0.15s"
                    cursor="default"
                  >
                    <HStack align="start" gap="3">
                      <Box w="1" alignSelf="stretch" rounded="full" bg="accent" flexShrink="0" />
                      <Stack gap="1.5" flex="1" minW="0">
                        <Text fontWeight="medium" lineClamp="2">
                          {d.title}
                        </Text>
                        <HStack gap="2">
                          <Pill active={s.active}>{s.label}</Pill>
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
                    </HStack>
                  </Card>
                </MotionBox>
              );
            })}
            </Stack>
          </MotionBox>
        )}
      </Async>
    </>
  );
}
