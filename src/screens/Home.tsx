import {
  Box,
  Button,
  HStack,
  Input,
  Stack,
  Text,
  Textarea,
  Wrap,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import type { Ctx } from "../App";
import {
  decisionAddOption,
  decisionAddStory,
  decisionAlignValues,
  decisionFinalize,
  decisionGenerateStory,
  decisionSetAlignment,
  decisionSetConfidence,
  decisionSetDistance,
  decisionSuggestOptions,
  listDomains,
  listIntentions,
  openDecision,
  type DecisionFull,
} from "../lib/ipc";
import { useReasoningStream } from "../lib/reasoning";
import { FadeIn, MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { IconArrow, IconCheck, IconSparkle } from "../ui/icons";
import { Card, FieldLabel } from "../ui/primitives";
import { humanError } from "../ui/states";
import { ReasoningPanel } from "../ui/Reasoning";
import { toaster } from "../ui/toaster";
import { navigate } from "../ui/router";

type Step = "start" | "options" | "weigh" | "step" | "done";

const CONFIDENCE = [
  { v: 20, label: "Très incertain" },
  { v: 40, label: "Hésitant" },
  { v: 60, label: "Plutôt sûr" },
  { v: 80, label: "Confiant" },
  { v: 100, label: "Décidé" },
];

export function Home({ ctx }: { ctx: Ctx }) {
  const reasoning = useReasoningStream();
  const [step, setStep] = useState<Step>("start");
  const [title, setTitle] = useState("");
  const [decision, setDecision] = useState<DecisionFull>();
  const [busy, setBusy] = useState<string | null>(null);

  // options
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string>();
  const [manual, setManual] = useState("");

  // weigh
  const [alignment, setAlignment] = useState<string>();
  const [confidence, setConfidence] = useState<number>();
  const [distance, setDistance] = useState("");

  // step
  const [story, setStory] = useState<{ title: string; why: string | null } | null>(null);

  const expert = ctx.mode === "expert";
  const canStart = title.trim().length > 2;

  const start = async () => {
    setBusy("start");
    try {
      const d = await openDecision(title.trim());
      setDecision(d);
      setStep("options");
    } catch (e) {
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setBusy(null);
    }
  };

  const suggest = async () => {
    reasoning.reset();
    setBusy("suggest");
    try {
      const r = await decisionSuggestOptions(title.trim());
      setSuggestions(r.options ?? []);
    } catch (e) {
      toaster.create({
        type: "warning",
        title: "L'assistant n'a pas répondu",
        description: "Tu peux écrire tes options toi-même, ça marche aussi.",
      });
      void e;
    } finally {
      setBusy(null);
    }
  };

  const addOption = async (label: string, isNull = false) => {
    if (!decision || !label.trim()) return;
    const l = label.trim();
    if (options.includes(l)) return;
    setOptions((o) => [...o, l]);
    setSuggestions((s) => s.filter((x) => x !== l));
    try {
      await decisionAddOption(decision.id, l, isNull);
    } catch {
      /* option kept locally; backend retry not critical for the flow */
    }
  };

  const weigh = async (option: string) => {
    setChosen(option);
    setStep("weigh");
    reasoning.reset();
    setBusy("align");
    try {
      const domains = await listDomains();
      const lists = await Promise.all(domains.map((d) => listIntentions(d.id)));
      const intentions = lists.flat().map((i) => i.statement).join("; ");
      const r = await decisionAlignValues(option, intentions);
      setAlignment(r.note);
      if (decision) await decisionSetAlignment(decision.id, r.note).catch(() => {});
    } catch (e) {
      void e; // alignment is an assist; absence is fine
    } finally {
      setBusy(null);
    }
  };

  const saveWeigh = async () => {
    if (!decision) return;
    setBusy("weigh");
    try {
      if (confidence) await decisionSetConfidence(decision.id, confidence);
      if (distance.trim()) await decisionSetDistance(decision.id, distance.trim());
      setStep("step");
      reasoning.reset();
      setBusy("story");
      try {
        const s = await decisionGenerateStory(`${title} — ${chosen}`);
        setStory({ title: s.title, why: s.why });
      } catch {
        setStory(null);
      }
    } catch (e) {
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setBusy(null);
    }
  };

  const finish = async () => {
    if (!decision) return;
    setBusy("finish");
    try {
      if (story?.title) {
        await decisionAddStory(decision.id, story.title, story.why, null, null).catch(() => {});
      }
      await decisionFinalize(decision.id);
      setStep("done");
    } catch (e) {
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setBusy(null);
    }
  };

  const progress = useMemo(() => ["start", "options", "weigh", "step", "done"].indexOf(step), [step]);

  return (
    <Stack gap="5">
      {step !== "done" && <ProgressDots active={progress} />}

      {step === "start" && (
        <FadeIn>
          <Card>
            <Stack gap="4">
              <Stack gap="1">
                <Text fontSize="lg" fontWeight="semibold" letterSpacing="-0.01em">
                  Une décision qui te trotte ?
                </Text>
                <Text color="fg.muted" fontSize="sm">
                  Écris-la comme elle vient. On va la regarder ensemble, tranquillement.
                </Text>
              </Stack>
              <Textarea
                autoresize
                minH="20"
                placeholder="Ex. Est-ce que je change de job cette année ?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                bg="surface"
                fontSize="md"
              />
              <HStack>
                {expert && (
                  <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                    → nouvelle decision (change proposal)
                  </Text>
                )}
                <Button ml="auto" onClick={start} loading={busy === "start"} disabled={!canStart} colorPalette="teal">
                  Explorer <IconArrow boxSize="4" />
                </Button>
              </HStack>
            </Stack>
          </Card>
        </FadeIn>
      )}

      {step === "options" && (
        <FadeIn>
          <Stack gap="4">
            <Card>
              <Text fontSize="sm" color="fg.muted">
                Ta décision
              </Text>
              <Text fontWeight="medium">{title}</Text>
            </Card>

            <Card>
              <Stack gap="4">
                <HStack>
                  <Stack gap="0.5">
                    <Text fontWeight="semibold">Quelles pistes s'offrent à toi ?</Text>
                    <Text fontSize="sm" color="fg.muted">
                      Vise au moins trois — sans oublier « et si je ne change rien ».
                    </Text>
                  </Stack>
                  <Button
                    ml="auto"
                    size="sm"
                    variant="subtle"
                    colorPalette="teal"
                    onClick={suggest}
                    loading={busy === "suggest"}
                  >
                    <IconSparkle boxSize="4" /> Aide-moi
                  </Button>
                </HStack>

                <ReasoningPanel stream={reasoning} />

                {suggestions.length > 0 && (
                  <MotionBox variants={staggerContainer} initial="initial" animate="animate">
                    <Stack gap="2">
                      {suggestions.map((s) => (
                        <MotionBox key={s} variants={staggerItem}>
                          <HStack
                            borderWidth="1px"
                            borderColor="border"
                            rounded="l2"
                            px="3.5"
                            py="2.5"
                            _hover={{ borderColor: "accent" }}
                            transition="border-color 0.15s"
                          >
                            <Text fontSize="sm">{s}</Text>
                            <Button ml="auto" size="xs" variant="ghost" onClick={() => addOption(s)}>
                              Garder
                            </Button>
                          </HStack>
                        </MotionBox>
                      ))}
                    </Stack>
                  </MotionBox>
                )}

                <HStack>
                  <Input
                    placeholder="Écrire une piste…"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addOption(manual);
                        setManual("");
                      }
                    }}
                    bg="surface"
                  />
                  <Button
                    variant="subtle"
                    onClick={() => {
                      addOption(manual);
                      setManual("");
                    }}
                    disabled={!manual.trim()}
                  >
                    Ajouter
                  </Button>
                </HStack>

                {options.length > 0 && (
                  <Stack gap="2" pt="1">
                    <FieldLabel>Tes pistes — choisis celle à peser</FieldLabel>
                    <Wrap gap="2">
                      {options.map((o) => (
                        <Button
                          key={o}
                          size="sm"
                          variant={chosen === o ? "solid" : "outline"}
                          colorPalette={chosen === o ? "teal" : "gray"}
                          rounded="full"
                          onClick={() => weigh(o)}
                        >
                          {o}
                        </Button>
                      ))}
                    </Wrap>
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>
        </FadeIn>
      )}

      {step === "weigh" && (
        <FadeIn>
          <Stack gap="4">
            <Card>
              <Text fontSize="sm" color="fg.muted">
                La piste que tu pèses
              </Text>
              <Text fontWeight="medium">{chosen}</Text>
            </Card>

            <Card>
              <Stack gap="4">
                <Text fontWeight="semibold">Est-ce que ça te ressemble ?</Text>
                <ReasoningPanel stream={reasoning} />
                {busy === "align" ? (
                  <Text fontSize="sm" color="fg.muted">
                    On compare avec ce qui compte pour toi…
                  </Text>
                ) : alignment ? (
                  <Box bg="accent.subtle" rounded="l2" px="4" py="3">
                    <Text fontSize="sm" lineHeight="1.7">
                      {alignment}
                    </Text>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="fg.subtle">
                    Pas d'avis de l'assistant — fie-toi à ton ressenti.
                  </Text>
                )}

                <Stack gap="2">
                  <FieldLabel>À quel point tu le sens ?</FieldLabel>
                  <Wrap gap="2">
                    {CONFIDENCE.map((c) => (
                      <Button
                        key={c.v}
                        size="sm"
                        variant={confidence === c.v ? "solid" : "outline"}
                        colorPalette={confidence === c.v ? "teal" : "gray"}
                        rounded="full"
                        onClick={() => setConfidence(c.v)}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </Wrap>
                </Stack>

                <Stack gap="1.5">
                  <FieldLabel>Dans 10 minutes, 10 mois, 10 ans — ça pèsera comment ?</FieldLabel>
                  <Textarea
                    autoresize
                    minH="16"
                    placeholder="Une phrase suffit."
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    bg="surface"
                  />
                </Stack>

                <HStack>
                  <Button variant="ghost" onClick={() => setStep("options")}>
                    Retour
                  </Button>
                  <Button ml="auto" onClick={saveWeigh} loading={busy === "weigh"} colorPalette="teal">
                    Un premier pas <IconArrow boxSize="4" />
                  </Button>
                </HStack>
              </Stack>
            </Card>
          </Stack>
        </FadeIn>
      )}

      {step === "step" && (
        <FadeIn>
          <Card>
            <Stack gap="4">
              <Stack gap="1">
                <Text fontWeight="semibold">Un tout petit pas, faisable cette semaine</Text>
                <Text fontSize="sm" color="fg.muted">
                  Pas le plan entier. Juste la première chose.
                </Text>
              </Stack>
              <ReasoningPanel stream={reasoning} />
              {busy === "story" ? (
                <Text fontSize="sm" color="fg.muted">
                  On cherche un pas simple…
                </Text>
              ) : (
                <Stack gap="1.5">
                  <Input
                    value={story?.title ?? ""}
                    placeholder="Ex. Envoyer un message à une personne qui a fait ce choix"
                    onChange={(e) => setStory((s) => ({ title: e.target.value, why: s?.why ?? null }))}
                    bg="surface"
                    fontSize="md"
                  />
                  {story?.why && (
                    <Text fontSize="xs" color="fg.subtle" px="1">
                      {story.why}
                    </Text>
                  )}
                </Stack>
              )}
              <HStack>
                <Button variant="ghost" onClick={() => setStep("weigh")}>
                  Retour
                </Button>
                <Button ml="auto" onClick={finish} loading={busy === "finish"} colorPalette="teal">
                  <IconCheck boxSize="4" /> Garder cette décision
                </Button>
              </HStack>
            </Stack>
          </Card>
        </FadeIn>
      )}

      {step === "done" && (
        <MotionBox initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <Card textAlign="center">
            <Stack gap="4" align="center" py="4">
              <Box w="14" h="14" rounded="full" bg="accent.subtle" display="grid" placeItems="center">
                <IconCheck boxSize="7" color="accent.emphasis" />
              </Box>
              <Stack gap="1">
                <Text fontSize="lg" fontWeight="semibold">
                  C'est noté.
                </Text>
                <Text color="fg.muted" fontSize="sm" maxW="sm">
                  Tu retrouveras cette décision dans ton carnet, avec ton petit pas. Reviens quand tu veux
                  faire le point.
                </Text>
              </Stack>
              <HStack pt="1">
                <Button variant="subtle" onClick={() => navigate("carnet")}>
                  Voir mon carnet
                </Button>
                <Button
                  colorPalette="teal"
                  onClick={() => {
                    setStep("start");
                    setTitle("");
                    setDecision(undefined);
                    setSuggestions([]);
                    setOptions([]);
                    setChosen(undefined);
                    setAlignment(undefined);
                    setConfidence(undefined);
                    setDistance("");
                    setStory(null);
                    reasoning.reset();
                  }}
                >
                  Une autre décision
                </Button>
              </HStack>
            </Stack>
          </Card>
        </MotionBox>
      )}
    </Stack>
  );
}

function ProgressDots({ active }: { active: number }) {
  const labels = ["La décision", "Les pistes", "Peser", "Un pas"];
  return (
    <HStack gap="2" px="1">
      {labels.map((l, i) => (
        <HStack key={l} gap="2" flex="1" minW="0">
          <Box
            w="6"
            h="6"
            rounded="full"
            flexShrink="0"
            display="grid"
            placeItems="center"
            fontSize="xs"
            fontWeight="semibold"
            bg={i <= active ? "accent" : "surface.muted"}
            color={i <= active ? "accent.fg" : "fg.subtle"}
            borderWidth="1px"
            borderColor={i <= active ? "accent" : "border"}
            transition="all 0.3s"
          >
            {i + 1}
          </Box>
          <Text fontSize="xs" color={i === active ? "fg" : "fg.subtle"} lineClamp="1" display={{ base: "none", sm: "block" }}>
            {l}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}
