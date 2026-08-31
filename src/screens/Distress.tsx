import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { FadeIn } from "../ui/motion";
import { Btn } from "../ui/controls";
import { IconArrow } from "../ui/icons";
import { navigate } from "../ui/router";

// Safety-critical: static, always available, no dependency on the AI or DB.
// French support lines. Calm, non-clinical, no judgement.
const RESOURCES = [
  {
    name: "3114 — Numéro national de prévention du suicide",
    contact: "3114",
    note: "Gratuit, 24h/24, 7j/7. Des professionnels à l'écoute.",
  },
  {
    name: "SOS Amitié",
    contact: "09 72 39 40 50",
    note: "Écoute anonyme, jour et nuit, quoi que tu traverses.",
  },
  {
    name: "Urgence vitale",
    contact: "15 (SAMU) · 112",
    note: "Si le danger est immédiat, pour toi ou quelqu'un d'autre.",
  },
];

export function Distress() {
  return (
    <Flex minH="100vh" bg="canvas" align="center" justify="center" px="5" py="10">
      <Box w="full" maxW="lg">
        <FadeIn>
          <Stack gap="6">
            <Stack gap="2.5">
              <Text fontSize="2xl" fontWeight="semibold" letterSpacing="-0.02em">
                Tu n'es pas seul·e.
              </Text>
              <Text color="fg.muted" lineHeight="1.7">
                Life OS est un outil pour réfléchir — pas un soignant. Si c'est lourd en ce moment, parler à
                quelqu'un peut aider. Ces lignes sont là pour ça, tout de suite.
              </Text>
            </Stack>

            <Stack gap="3">
              {RESOURCES.map((r) => (
                <Box key={r.name} bg="surface" borderWidth="1px" borderColor="border" rounded="l3" p="5">
                  <Stack gap="1">
                    <Text fontWeight="semibold">{r.name}</Text>
                    <Text fontSize="xl" fontWeight="bold" color="fg" letterSpacing="0.01em">
                      {r.contact}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {r.note}
                    </Text>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <HStack>
              <Btn ghost onClick={() => navigate("home")}>
                <Box as="span" transform="rotate(180deg)" display="inline-flex">
                  <IconArrow boxSize="4" />
                </Box>
                Revenir
              </Btn>
              <Text ml="auto" fontSize="xs" color="fg.subtle">
                Rien de ce que tu écris ici n'est partagé.
              </Text>
            </HStack>
          </Stack>
        </FadeIn>
      </Box>
    </Flex>
  );
}
