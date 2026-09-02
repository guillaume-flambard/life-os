import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getLang, getMode, isOnboarded, setMode as saveMode, setUiLang as saveLang, type UiMode } from "./lib/ipc";
import { PageTransition } from "./ui/motion";
import { useRoute, type Route } from "./ui/router";
import { Header } from "./ui/Header";
import { Toaster, toaster } from "./ui/toaster";
import { setLang, t, type Lang } from "./i18n";
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
  lang: Lang;
  setLang: (l: Lang) => void;
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
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    (async () => {
      try {
        const [ob, m, l] = await Promise.all([isOnboarded(), getMode(), getLang()]);
        setOnboarded(ob);
        setRevealed(ob);
        setModeState(m);
        setLangState(l);
        setLang(l);
      } catch (e) {
        console.error("boot failed", e);
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  const setMode = (m: UiMode) => {
    setModeState(m);
    saveMode(m).catch(() => {
      toaster.create({
        type: "error",
        title: t("Oops"),
        description: t("The mode couldn't be remembered."),
      });
    });
  };
  const changeLang = (l: Lang) => {
    setLangState(l);
    setLang(l);
    saveLang(l).catch(() => {
      toaster.create({
        type: "error",
        title: t("Oops"),
        description: t("The language couldn't be remembered."),
      });
    });
  };
  const ctx: Ctx = { mode, setMode, lang, setLang: changeLang };
  // Revealing also flips the onboarding state: without it, leaving home and
  // coming back would remount the guide with `onboarded=false` and replay the
  // whole first-run conversation.
  const reveal = () => {
    setRevealed(true);
    setOnboarded(true);
  };

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
