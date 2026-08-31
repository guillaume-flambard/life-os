import { Box, Button, HStack, IconButton, Menu, Portal, Text } from "@chakra-ui/react";
import type { Ctx } from "../App";
import { useColorMode } from "../provider";
import { IconHeart, IconMoon, IconSun } from "./icons";
import { navigate, useRoute, type Route } from "./router";

function NeedleMark() {
  return (
    <Box
      as="button"
      onClick={() => navigate("home")}
      w="7"
      h="7"
      rounded="l2"
      bg="teal.700"
      display="grid"
      placeItems="center"
      flexShrink="0"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        <path d="M12 4 14 12 12 20 10 12z" fill="#eafaf4" />
        <path d="M12 20 10 12 12 12z" fill="#5fc9a8" />
      </svg>
    </Box>
  );
}

const SECTIONS: { route: Route; label: string; icon: string }[] = [
  { route: "home", label: "Le fil", icon: "💬" },
  { route: "compass", label: "Ma boussole", icon: "🧭" },
  { route: "daily", label: "Aujourd'hui", icon: "🌤️" },
  { route: "carnet", label: "Mon carnet", icon: "📖" },
  { route: "review", label: "Le point", icon: "🍃" },
  { route: "settings", label: "Réglages", icon: "⚙️" },
];

export function Header({ ctx, revealed }: { ctx: Ctx; revealed: boolean }) {
  const { mode: color, toggle } = useColorMode();
  const route = useRoute();
  const expert = ctx.mode === "expert";

  return (
    <HStack
      as="header"
      px={{ base: "4", md: "6" }}
      py="3"
      gap="3"
      position="sticky"
      top="0"
      zIndex="20"
      bg="canvas"
      borderBottomWidth={route === "home" ? "0" : "1px"}
      borderColor="border"
    >
      <NeedleMark />
      <Text fontFamily="serif" fontWeight="500" letterSpacing="0.01em" fontSize="17px">
        Life OS
      </Text>

      <HStack ml="auto" gap="1.5">
        <IconButton size="xs" variant="ghost" color="fg.muted" aria-label="Thème" onClick={toggle}>
          {color === "dark" ? <IconSun boxSize="4" /> : <IconMoon boxSize="4" />}
        </IconButton>

        {revealed && (
          <>
            <IconButton
              size="xs"
              variant="ghost"
              color="fg.muted"
              aria-label="Besoin de parler"
              onClick={() => navigate("distress")}
              _hover={{ color: "accent.emphasis", bg: "accent.subtle" }}
            >
              <IconHeart boxSize="4" />
            </IconButton>

            <Menu.Root>
              <Menu.Trigger asChild>
                <Button size="xs" variant="subtle">
                  Menu
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content bg="surface" borderColor="border" minW="52">
                    {SECTIONS.map((s) => (
                      <Menu.Item
                        key={s.route}
                        value={s.route}
                        onClick={() => navigate(s.route)}
                        bg={route === s.route ? "accent.subtle" : undefined}
                      >
                        <Box as="span" mr="2">
                          {s.icon}
                        </Box>
                        {s.label}
                      </Menu.Item>
                    ))}
                    <Menu.Separator />
                    <Menu.Item value="mode" onClick={() => ctx.setMode(expert ? "human" : "expert")}>
                      <Box as="span" mr="2">
                        {expert ? "🔧" : "🌱"}
                      </Box>
                      {expert ? "Repasser en simple" : "Mode expert"}
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </>
        )}
      </HStack>
    </HStack>
  );
}
