import { Box, Button, HStack, IconButton, Text } from "@chakra-ui/react";
import type { Ctx } from "../App";
import { useColorMode } from "../provider";
import { IconHeart, IconMoon, IconSun } from "./icons";
import { navigate, useRoute } from "./router";

const TITLES: Record<string, { title: string; sub: string }> = {
  home: { title: "Accueil", sub: "Une décision qui te trotte ?" },
  compass: { title: "Ta boussole", sub: "Ce qui compte, mis en mots" },
  daily: { title: "Aujourd'hui", sub: "Noter une pensée, avancer d'un pas" },
  carnet: { title: "Ton carnet", sub: "Les décisions que tu as explorées" },
  review: { title: "Le point", sub: "Regarder en arrière, sans se juger" },
  settings: { title: "Réglages", sub: "L'app, l'IA locale, tes données" },
};

export function Topbar({ ctx }: { ctx: Ctx }) {
  const route = useRoute();
  const { mode: color, toggle } = useColorMode();
  const t = TITLES[route] ?? TITLES.home;
  const expert = ctx.mode === "expert";

  return (
    <HStack
      as="header"
      px={{ base: "5", md: "8" }}
      py="4"
      borderBottomWidth="1px"
      borderColor="border"
      bg="canvas"
      position="sticky"
      top="0"
      zIndex="10"
      gap="4"
    >
      <Box minW="0">
        <Text fontSize="lg" fontWeight="semibold" letterSpacing="-0.01em" lineClamp="1">
          {t.title}
        </Text>
        <Text fontSize="sm" color="fg.muted" lineClamp="1">
          {t.sub}
        </Text>
      </Box>

      <HStack ml="auto" gap="2">
        <Button
          size="xs"
          variant="ghost"
          color="fg.muted"
          onClick={() => navigate("distress")}
          _hover={{ color: "accent.emphasis", bg: "accent.subtle" }}
        >
          <IconHeart boxSize="4" />
          <Box as="span" display={{ base: "none", sm: "inline" }}>
            Besoin de parler
          </Box>
        </Button>

        <Button
          size="xs"
          variant={expert ? "subtle" : "ghost"}
          color={expert ? "accent.emphasis" : "fg.muted"}
          onClick={() => ctx.setMode(expert ? "human" : "expert")}
          title="Mode expert : montre le vocabulaire du moteur (spec, delta, revue)"
        >
          {expert ? "Expert" : "Simple"}
        </Button>

        <IconButton
          size="xs"
          variant="ghost"
          color="fg.muted"
          aria-label="Thème clair / sombre"
          onClick={toggle}
        >
          {color === "dark" ? <IconSun boxSize="4" /> : <IconMoon boxSize="4" />}
        </IconButton>
      </HStack>
    </HStack>
  );
}
