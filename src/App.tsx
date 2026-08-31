import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getMode, isOnboarded, setMode as saveMode, type UiMode } from "./lib/ipc";
import { PageTransition } from "./ui/motion";
import { useRoute, type Route } from "./ui/router";
import { Header } from "./ui/Header";
import { Toaster } from "./ui/toaster";
import { Guide } from "./screens/Guide";
import { Compass } from "./screens/Compass";
import { Carnet } from "./screens/Carnet";
import { Review } from "./screens/Review";
import { Daily } from "./screens/Daily";
import { Settings } from "./screens/Settings";
import { Distress } from "./screens/Distress";

export interface Ctx {
  mode: UiMode;
  setMode: (m: UiMode) => void;
}

function Screen({ route, ctx, onboarded, reveal }: {
  route: Route;
  ctx: Ctx;
  onboarded: boolean;
  reveal: () => void;
}) {
  switch (route) {
    case "home":
      return <Guide onboarded={onboarded} onReveal={reveal} />;
    case "compass":
      return <Compass ctx={ctx} />;
    case "carnet":
      return <Carnet ctx={ctx} />;
    case "review":
      return <Review ctx={ctx} />;
    case "daily":
      return <Daily ctx={ctx} />;
    case "settings":
      return <Settings ctx={ctx} />;
    default:
      return <Guide onboarded={onboarded} onReveal={reveal} />;
  }
}

export function App() {
  const route = useRoute();
  const [booted, setBooted] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [mode, setModeState] = useState<UiMode>("human");

  useEffect(() => {
    (async () => {
      try {
        const [ob, m] = await Promise.all([isOnboarded(), getMode()]);
        setOnboarded(ob);
        setRevealed(ob);
        setModeState(m);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const setMode = (m: UiMode) => {
    setModeState(m);
    void saveMode(m);
  };
  const ctx: Ctx = { mode, setMode };
  const reveal = () => setRevealed(true);

  if (!booted) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="canvas">
        <Stack align="center" gap="4">
          <Spinner size="xl" color="accent" borderWidth="3px" />
          <Text color="fg.muted" fontSize="sm">
            Life OS s'ouvre…
          </Text>
        </Stack>
      </Flex>
    );
  }

  if (route === "distress") {
    return (
      <>
        <Distress />
        <Toaster />
      </>
    );
  }

  return (
    <Flex direction="column" h="100vh" bg="canvas" overflow="hidden">
      <Header ctx={ctx} revealed={revealed} />
      <Box flex="1" overflowY="auto">
        <Box maxW="3xl" mx="auto" px={{ base: "4", md: "6" }} py={{ base: "3", md: "5" }}>
          <PageTransition key={route}>
            <Screen route={route} ctx={ctx} onboarded={onboarded} reveal={reveal} />
          </PageTransition>
        </Box>
      </Box>
      <Toaster />
    </Flex>
  );
}
