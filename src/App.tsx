import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getMode, isOnboarded, setMode as saveMode, type UiMode } from "./lib/ipc";
import { PageTransition } from "./ui/motion";
import { navigate, useRoute, type Route } from "./ui/router";
import { Sidebar } from "./ui/Sidebar";
import { Topbar } from "./ui/Topbar";
import { Toaster } from "./ui/toaster";
import { Home } from "./screens/Home";
import { Compass } from "./screens/Compass";
import { Carnet } from "./screens/Carnet";
import { Review } from "./screens/Review";
import { Daily } from "./screens/Daily";
import { Settings } from "./screens/Settings";
import { Onboarding } from "./screens/Onboarding";
import { Distress } from "./screens/Distress";

export interface Ctx {
  mode: UiMode;
  setMode: (m: UiMode) => void;
}

function Screen({ route, ctx }: { route: Route; ctx: Ctx }) {
  switch (route) {
    case "home":
      return <Home ctx={ctx} />;
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
    case "distress":
      return <Distress />;
    default:
      return <Home ctx={ctx} />;
  }
}

export function App() {
  const route = useRoute();
  const [booted, setBooted] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [mode, setModeState] = useState<UiMode>("human");

  useEffect(() => {
    (async () => {
      try {
        const [ob, m] = await Promise.all([isOnboarded(), getMode()]);
        setOnboarded(ob);
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

  // Onboarding takes the whole window; nothing else is reachable until done.
  if (!onboarded || route === "onboarding") {
    return (
      <>
        <Onboarding
          onDone={() => {
            setOnboarded(true);
            navigate("home");
          }}
        />
        <Toaster />
      </>
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
    <Flex h="100vh" bg="canvas" overflow="hidden">
      <Sidebar route={route} />
      <Flex direction="column" flex="1" minW="0">
        <Topbar ctx={ctx} />
        <Box flex="1" overflowY="auto">
          <Box maxW="3xl" mx="auto" px={{ base: "5", md: "8" }} py={{ base: "6", md: "8" }}>
            <PageTransition key={route}>
              <Screen route={route} ctx={ctx} />
            </PageTransition>
          </Box>
        </Box>
      </Flex>
      <Toaster />
    </Flex>
  );
}
