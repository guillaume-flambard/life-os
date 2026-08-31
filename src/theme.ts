import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Design system tuned to the register the user asks for — ChatGPT / Claude /
// Perplexity: clean, cool, near-monochrome, sans-serif, with a single restrained
// teal accent used only on interactive affordances. No warm paper, no serif.

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: {
          value:
            '-apple-system, "SF Pro Text", "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
        },
        body: {
          value:
            '-apple-system, "SF Pro Text", "Segoe UI", Inter, ui-sans-serif, system-ui, sans-serif',
        },
        mono: {
          value:
            'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
        },
      },
      colors: {
        // Cool neutral gray ramp (the whole UI lives here).
        gray: {
          50: { value: "#fafafa" },
          100: { value: "#f4f4f5" },
          200: { value: "#e9e9ec" },
          300: { value: "#d6d6db" },
          400: { value: "#9b9ba6" },
          500: { value: "#6e6e7a" },
          600: { value: "#52525b" },
          700: { value: "#3a3a41" },
          800: { value: "#26262a" },
          850: { value: "#1f1f23" },
          900: { value: "#161619" },
        },
        // A single restrained teal (Perplexity-ish), used sparingly.
        teal: {
          50: { value: "#f0fdfa" },
          100: { value: "#ccfbef" },
          200: { value: "#99f6e0" },
          300: { value: "#5eead4" },
          400: { value: "#2dd4bf" },
          500: { value: "#14b8a6" },
          600: { value: "#0d9488" },
          700: { value: "#0f766e" },
          800: { value: "#115e59" },
          900: { value: "#134e4a" },
        },
      },
      radii: {
        l1: { value: "8px" },
        l2: { value: "12px" },
        l3: { value: "18px" },
      },
    },
    semanticTokens: {
      colors: {
        canvas: {
          value: { base: "#ffffff", _dark: "{colors.gray.900}" },
        },
        surface: {
          value: { base: "#ffffff", _dark: "{colors.gray.850}" },
        },
        "surface.muted": {
          value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" },
        },
        border: {
          value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" },
        },
        "border.subtle": {
          value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" },
        },
        fg: {
          value: { base: "#1a1a1e", _dark: "{colors.gray.100}" },
        },
        "fg.muted": {
          value: { base: "{colors.gray.500}", _dark: "{colors.gray.400}" },
        },
        "fg.subtle": {
          value: { base: "{colors.gray.400}", _dark: "{colors.gray.500}" },
        },
        accent: {
          value: { base: "{colors.teal.600}", _dark: "{colors.teal.400}" },
        },
        "accent.fg": {
          value: { base: "white", _dark: "{colors.gray.900}" },
        },
        "accent.subtle": {
          value: { base: "{colors.teal.50}", _dark: "{colors.teal.900}" },
        },
        "accent.emphasis": {
          value: { base: "{colors.teal.700}", _dark: "{colors.teal.300}" },
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
