import { Box, Button, Flex, HStack, Input, Stack, Text, Wrap } from "@chakra-ui/react";
import { useState } from "react";
import { createDomain, setOnboarded } from "../lib/ipc";
import { FadeIn, MotionBox } from "../ui/motion";
import { IconArrow } from "../ui/icons";
import { toaster } from "../ui/toaster";
import { humanError } from "../ui/states";

const SUGGESTED = [
  "Santé",
  "Travail",
  "Proches",
  "Argent",
  "Apprendre",
  "Temps pour moi",
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const addCustom = () => {
    const v = custom.trim();
    if (v && !picked.includes(v)) setPicked((p) => [...p, v]);
    setCustom("");
  };

  const finish = async () => {
    setSaving(true);
    try {
      for (const name of picked) await createDomain(name);
      await setOnboarded();
      onDone();
    } catch (e) {
      toaster.create({ type: "error", title: "Impossible d'enregistrer", description: humanError(e) });
      setSaving(false);
    }
  };

  return (
    <Flex h="100vh" bg="canvas" align="center" justify="center" px="5">
      <Box w="full" maxW="lg">
        <MotionBox
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <Stack gap="6" textAlign="center" align="center">
              <Box w="16" h="16" rounded="l3" bg="teal.700" display="grid" placeItems="center">
                <svg width="34" height="34" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                  <path d="M12 4 14 12 12 20 10 12z" fill="#eafaf4" />
                  <path d="M12 20 10 12 12 12z" fill="#5fc9a8" />
                </svg>
              </Box>
              <Stack gap="2">
                <Text fontSize="2xl" fontWeight="semibold" letterSpacing="-0.02em">
                  Bienvenue.
                </Text>
                <Text color="fg.muted" lineHeight="1.7">
                  Life OS t'aide à voir clair dans les décisions qui comptent — à ton rythme,
                  sans jargon. Tout reste sur ton ordinateur.
                </Text>
              </Stack>
              <Button size="lg" onClick={() => setStep(1)} colorPalette="teal">
                Commencer <IconArrow boxSize="4" />
              </Button>
            </Stack>
          )}

          {step === 1 && (
            <Stack gap="6">
              <Stack gap="2">
                <Text fontSize="xl" fontWeight="semibold" letterSpacing="-0.01em">
                  Deux choses à savoir
                </Text>
              </Stack>
              <Stack gap="4">
                {[
                  ["🔒", "C'est privé", "Tes données vivent dans un fichier chiffré, ici. Rien n'est envoyé sur Internet."],
                  ["✨", "L'IA est optionnelle", "Un assistant local peut t'aider à formuler. L'app marche très bien sans lui."],
                  ["🌱", "Pas un thérapeute", "Un outil pour réfléchir. Si ça va vraiment mal, on t'orientera vers de l'aide."],
                ].map(([icon, title, body]) => (
                  <HStack key={title} align="start" gap="3.5">
                    <Text fontSize="xl">{icon}</Text>
                    <Stack gap="0.5">
                      <Text fontWeight="medium">{title}</Text>
                      <Text fontSize="sm" color="fg.muted" lineHeight="1.6">
                        {body}
                      </Text>
                    </Stack>
                  </HStack>
                ))}
              </Stack>
              <HStack>
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Retour
                </Button>
                <Button ml="auto" onClick={() => setStep(2)} colorPalette="teal">
                  Suite <IconArrow boxSize="4" />
                </Button>
              </HStack>
            </Stack>
          )}

          {step === 2 && (
            <Stack gap="6">
              <Stack gap="2">
                <Text fontSize="xl" fontWeight="semibold" letterSpacing="-0.01em">
                  Qu'est-ce qui compte pour toi ?
                </Text>
                <Text color="fg.muted" fontSize="sm" lineHeight="1.6">
                  Choisis quelques pans de ta vie. Tu pourras en ajouter, en retirer, en renommer
                  à tout moment.
                </Text>
              </Stack>

              <Wrap gap="2">
                {SUGGESTED.map((name) => {
                  const on = picked.includes(name);
                  return (
                    <Button
                      key={name}
                      size="sm"
                      variant={on ? "solid" : "outline"}
                      colorPalette={on ? "teal" : "gray"}
                      onClick={() => toggle(name)}
                      rounded="full"
                    >
                      {name}
                    </Button>
                  );
                })}
              </Wrap>

              <HStack>
                <Input
                  placeholder="Autre chose…"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustom()}
                  bg="surface"
                />
                <Button variant="subtle" onClick={addCustom} disabled={!custom.trim()}>
                  Ajouter
                </Button>
              </HStack>

              {picked.filter((p) => !SUGGESTED.includes(p)).length > 0 && (
                <FadeIn>
                  <Wrap gap="2">
                    {picked
                      .filter((p) => !SUGGESTED.includes(p))
                      .map((p) => (
                        <Button key={p} size="sm" variant="solid" colorPalette="teal" rounded="full" onClick={() => toggle(p)}>
                          {p} ✕
                        </Button>
                      ))}
                  </Wrap>
                </FadeIn>
              )}

              <HStack>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button
                  ml="auto"
                  onClick={finish}
                  loading={saving}
                  disabled={picked.length === 0}
                  colorPalette="teal"
                >
                  C'est parti
                </Button>
              </HStack>
              <Text fontSize="xs" color="fg.subtle" textAlign="center">
                {picked.length === 0
                  ? "Choisis au moins un pan pour continuer."
                  : `${picked.length} pan${picked.length > 1 ? "s" : ""} choisi${picked.length > 1 ? "s" : ""}.`}
              </Text>
            </Stack>
          )}
        </MotionBox>
      </Box>
    </Flex>
  );
}
