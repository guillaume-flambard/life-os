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
export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const mode = resolvedTheme === "dark" ? "dark" : "light";
  return {
    mode,
    toggle: () => setTheme(mode === "dark" ? "light" : "dark"),
    set: setTheme,
  };
}
