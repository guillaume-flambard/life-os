import { Box, Flex, HStack, Stack, Text } from "@chakra-ui/react";
import { FadeIn } from "../ui/motion";
import { Btn } from "../ui/controls";
import { IconArrow } from "../ui/icons";
import { navigate } from "../ui/router";
import { t } from "../i18n";

// Safety-critical: static, always available, no dependency on the AI or DB.
// The French lines cover the app's home country; findahelpline.com routes to a
// local line anywhere else. Calm, non-clinical, no judgement.
const RESOURCES = [
  {
    name: () => t("3114 — the French national suicide-prevention line"),
    contact: "3114",
    note: () => t("Free, 24/7. Professionals who listen."),
  },
  {
    name: () => t("SOS Amitié"),
    contact: "09 72 39 40 50",
    note: () => t("Anonymous listening, day and night, whatever you're going through."),
  },
  {
    name: () => t("Anywhere in the world"),
    contact: "findahelpline.com",
    note: () => t("A directory of helplines, country by country."),
  },
  {
    name: () => t("Immediate danger"),
    contact: "15 (SAMU) · 112",
    note: () => t("If danger is immediate, for you or someone else."),
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
                {t("You are not alone.")}
              </Text>
              <Text color="fg.muted" lineHeight="1.7">
                {t(
                  "Life OS is a tool for thinking — not a caregiver. If things feel heavy right now, talking to someone can help. These lines are there for exactly that, right away.",
                )}
              </Text>
            </Stack>

            <Stack gap="3">
              {RESOURCES.map((r) => (
                <Box key={r.contact} bg="surface" borderWidth="1px" borderColor="border" rounded="l3" p="5">
                  <Stack gap="1">
                    <Text fontWeight="semibold">{r.name()}</Text>
                    <Text fontSize="xl" fontWeight="bold" color="fg" letterSpacing="0.01em">
                      {r.contact}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {r.note()}
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
                {t("Back")}
              </Btn>
              <Text ml="auto" fontSize="xs" color="fg.subtle">
                {t("Nothing you write here is ever shared.")}
              </Text>
            </HStack>
          </Stack>
        </FadeIn>
      </Box>
    </Flex>
  );
}
