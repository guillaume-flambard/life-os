import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Life OS design system — calm, focused, "Claude Code / ChatGPT" register.
// A quiet neutral canvas with one deep-teal accent (the compass needle).
// Everything reads through semantic tokens so light/dark stay in lockstep.

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: {
          value:
            'ui-sans-serif, -apple-system, "Segoe UI", Inter, system-ui, sans-serif',
        },
        body: {
          value:
            'ui-sans-serif, -apple-system, "Segoe UI", Inter, system-ui, sans-serif',
        },
        mono: {
          value:
            'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
        },
      },
      colors: {
        // Deep-teal brand ramp (the needle).
        teal: {
          50: { value: "#eafaf4" },
          100: { value: "#c9f0e1" },
          200: { value: "#98e0c8" },
          300: { value: "#5fc9a8" },
          400: { value: "#33ac89" },
          500: { value: "#237a61" },
          600: { value: "#1c6650" },
          700: { value: "#185849" },
          800: { value: "#12463a" },
          900: { value: "#0d362d" },
        },
        // Warm-cool paper neutrals.
        sand: {
          50: { value: "#faf9f7" },
          100: { value: "#f3f1ec" },
          200: { value: "#e7e3db" },
          300: { value: "#d4cfc4" },
          400: { value: "#a8a294" },
          500: { value: "#7c766a" },
          600: { value: "#5b564d" },
          700: { value: "#403c35" },
          800: { value: "#292620" },
          900: { value: "#1a1815" },
        },
      },
      radii: {
        l1: { value: "8px" },
        l2: { value: "12px" },
        l3: { value: "16px" },
      },
    },
    semanticTokens: {
      colors: {
        // Surfaces
        canvas: {
          value: { base: "{colors.sand.50}", _dark: "{colors.sand.900}" },
        },
        surface: {
          value: { base: "white", _dark: "{colors.sand.800}" },
        },
        "surface.muted": {
          value: { base: "{colors.sand.100}", _dark: "{colors.sand.700}" },
        },
        border: {
          value: { base: "{colors.sand.200}", _dark: "{colors.sand.700}" },
        },
        "border.subtle": {
          value: { base: "{colors.sand.100}", _dark: "{colors.sand.800}" },
        },
        // Text
        fg: {
          value: { base: "{colors.sand.800}", _dark: "{colors.sand.100}" },
        },
        "fg.muted": {
          value: { base: "{colors.sand.500}", _dark: "{colors.sand.400}" },
        },
        "fg.subtle": {
          value: { base: "{colors.sand.400}", _dark: "{colors.sand.500}" },
        },
        // Accent
        accent: {
          value: { base: "{colors.teal.500}", _dark: "{colors.teal.400}" },
        },
        "accent.fg": {
          value: { base: "white", _dark: "{colors.sand.900}" },
        },
        "accent.subtle": {
          value: { base: "{colors.teal.50}", _dark: "{colors.teal.900}" },
        },
        "accent.emphasis": {
          value: { base: "{colors.teal.600}", _dark: "{colors.teal.300}" },
        },
      },
    },
  },
  globalCss: {
    "html, body, #root": {
      height: "100%",
    },
    body: {
      bg: "canvas",
      color: "fg",
      fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
    },
    "*::selection": {
      bg: "accent.subtle",
    },
    "::-webkit-scrollbar": { width: "10px", height: "10px" },
    "::-webkit-scrollbar-thumb": {
      bg: "border",
      borderRadius: "full",
      border: "2px solid transparent",
      backgroundClip: "content-box",
    },
  },
});

export const system = createSystem(defaultConfig, config);
