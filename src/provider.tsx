import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { system } from "./theme";

// Wraps the app in Chakra + next-themes (class-based light/dark on <html>).
export function Provider({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <ThemeProvider attribute="class" disableTransitionOnChange defaultTheme="system">
        {children}
      </ThemeProvider>
    </ChakraProvider>
  );
}

// Small hook the shell uses for the light/dark toggle.
// `mode` is the resolved appearance (light|dark); `setting` is the user's choice
// (light|dark|system) so the Settings screen can highlight the active option.
export function useColorMode() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  return {
    mode,
    setting: (theme ?? "system") as "light" | "dark" | "system",
    toggle: () => setTheme(mode === "dark" ? "light" : "dark"),
    set: setTheme,
  };
}
