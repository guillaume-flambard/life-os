import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { navigate, type Route } from "./router";
import {
  IconCarnet,
  IconCompass,
  IconDaily,
  IconHome,
  IconReview,
  IconSettings,
} from "./icons";
import type { ComponentType } from "react";
import type { IconProps } from "@chakra-ui/react";
import { MotionBox } from "./motion";

interface NavItem {
  route: Route;
  label: string;
  hint: string;
  Icon: ComponentType<IconProps>;
}

const ITEMS: NavItem[] = [
  { route: "home", label: "Accueil", hint: "une décision qui te trotte", Icon: IconHome },
  { route: "compass", label: "Boussole", hint: "ce qui compte pour toi", Icon: IconCompass },
  { route: "daily", label: "Aujourd'hui", hint: "noter, avancer", Icon: IconDaily },
  { route: "carnet", label: "Carnet", hint: "tes décisions", Icon: IconCarnet },
  { route: "review", label: "Le point", hint: "regarder en arrière", Icon: IconReview },
  { route: "settings", label: "Réglages", hint: "l'app, tes données", Icon: IconSettings },
];

function NeedleMark() {
  return (
    <Box w="8" h="8" rounded="l2" bg="teal.700" display="grid" placeItems="center" flexShrink="0">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <path d="M12 4 14 12 12 20 10 12z" fill="#eafaf4" />
        <path d="M12 20 10 12 12 12z" fill="#5fc9a8" />
      </svg>
    </Box>
  );
}

export function Sidebar({ route }: { route: Route }) {
  return (
    <Stack
      as="nav"
      w={{ base: "16", md: "60" }}
      flexShrink="0"
      bg="surface"
      borderRightWidth="1px"
      borderColor="border"
      py="4"
      px={{ base: "2", md: "3" }}
      gap="1"
      h="full"
    >
      <HStack px="2" py="2" mb="2" gap="2.5">
        <NeedleMark />
        <Text fontWeight="semibold" letterSpacing="-0.01em" display={{ base: "none", md: "block" }}>
          Life OS
        </Text>
      </HStack>

      {ITEMS.map((it) => {
        const active = route === it.route;
        return (
          <Box
            key={it.route}
            as="button"
            onClick={() => navigate(it.route)}
            position="relative"
            textAlign="left"
            rounded="l2"
            px="2.5"
            py="2.5"
            transition="background 0.15s, color 0.15s"
            color={active ? "fg" : "fg.muted"}
            bg={active ? "accent.subtle" : "transparent"}
            _hover={{ bg: active ? "accent.subtle" : "surface.muted", color: "fg" }}
          >
            {active && (
              <MotionBox
                layoutId="nav-active"
                position="absolute"
                left="0"
                top="2"
                bottom="2"
                w="0.5"
                rounded="full"
                bg="accent"
              />
            )}
            <HStack gap="3">
              <it.Icon boxSize="5" color={active ? "accent.emphasis" : "fg.subtle"} flexShrink="0" />
              <Stack gap="0" display={{ base: "none", md: "flex" }} minW="0">
                <Text fontSize="sm" fontWeight={active ? "semibold" : "medium"} lineHeight="1.2">
                  {it.label}
                </Text>
                <Text fontSize="xs" color="fg.subtle" lineClamp="1">
                  {it.hint}
                </Text>
              </Stack>
            </HStack>
          </Box>
        );
      })}
    </Stack>
  );
}
