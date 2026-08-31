import { Box, Button, HStack, Input, Stack, Text, Textarea, Wrap } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { MotionBox } from "../ui/motion";
import type { Choice, Turn } from "./flow";

// The visible conversation — the elevated, épuré register: the assistant speaks
// as plain text on the canvas (no bubble), and only the user's own words get a
// quiet tinted pill. One interactive turn is live at a time.

function TypingDots() {
  return (
    <HStack gap="1.5" py="1.5">
      {[0, 1, 2].map((i) => (
        <MotionBox
          key={i}
          w="1.5"
          h="1.5"
          rounded="full"
          bg="fg.subtle"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </HStack>
  );
}

function Say({ children }: { children: React.ReactNode }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      alignSelf="start"
      maxW="92%"
    >
      <Text fontSize="17px" lineHeight="1.62" color="fg">
        {children}
      </Text>
    </MotionBox>
  );
}

function Echo({ text }: { text: string }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      alignSelf="end"
      maxW="82%"
    >
      <Box
        bg="accent.subtle"
        color="accent.emphasis"
        rounded="l3"
        borderBottomRightRadius="sm"
        px="4"
        py="2.5"
        fontSize="15.5px"
        lineHeight="1.5"
        fontWeight="medium"
      >
        {text}
      </Box>
    </MotionBox>
  );
}

function Choices({
  options,
  answered,
  onPick,
}: {
  options: Choice[];
  answered?: string;
  onPick: (v: string, label: string) => void;
}) {
  if (answered) return null;
  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
      alignSelf="stretch"
    >
      <Wrap gap="2.5" justify="end">
        {options.map((o) => (
          <Button
            key={o.value}
            variant={o.tone === "accent" ? "solid" : "outline"}
            colorPalette="teal"
            size="lg"
            rounded="full"
            h="auto"
            py="2.5"
            px="5"
            whiteSpace="normal"
            textAlign="left"
            fontWeight="medium"
            borderColor={o.tone === "accent" ? undefined : "border"}
            onClick={() => onPick(o.value, o.label)}
            _hover={{ transform: "translateY(-1px)" }}
            transition="transform 0.15s, border-color 0.15s"
          >
            <Stack gap="0" align="start">
              <Text>{o.label}</Text>
              {o.hint && (
                <Text
                  fontSize="xs"
                  fontWeight="normal"
                  color={o.tone === "accent" ? "whiteAlpha.800" : "fg.subtle"}
                >
                  {o.hint}
                </Text>
              )}
            </Stack>
          </Button>
        ))}
      </Wrap>
    </MotionBox>
  );
}

function Composer({
  placeholder,
  multiline,
  cta,
  answered,
  onSubmit,
}: {
  placeholder?: string;
  multiline?: boolean;
  cta?: string;
  answered?: boolean;
  onSubmit: (t: string) => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!answered) ref.current?.focus();
  }, [answered]);
  if (answered) return null;

  const send = () => {
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <MotionBox
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      alignSelf="stretch"
    >
      <HStack
        align="end"
        bg="surface"
        borderWidth="1px"
        borderColor="border"
        rounded="l3"
        p="1.5"
        _focusWithin={{ borderColor: "accent" }}
        transition="border-color 0.15s"
      >
        {multiline ? (
          <Textarea
            ref={ref as any}
            autoresize
            maxH="40"
            variant="subtle"
            bg="transparent"
            border="none"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            _focus={{ boxShadow: "none" }}
          />
        ) : (
          <Input
            ref={ref as any}
            variant="subtle"
            bg="transparent"
            border="none"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            _focus={{ boxShadow: "none" }}
          />
        )}
        <Button colorPalette="teal" rounded="l2" onClick={send} disabled={!value.trim()} px="4">
          {cta ?? "Envoyer"}
        </Button>
      </HStack>
    </MotionBox>
  );
}

export function Conversation({ turns }: { turns: Turn[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  return (
    <Stack gap="4" pb="8">
      {turns.map((t) => {
        switch (t.kind) {
          case "assistant":
            return <Say key={t.id}>{t.content}</Say>;
          case "user":
            return <Echo key={t.id} text={t.text} />;
          case "typing":
            return (
              <MotionBox key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} alignSelf="start">
                <TypingDots />
              </MotionBox>
            );
          case "choices":
            return <Choices key={t.id} options={t.options} answered={t.answered} onPick={t.onPick} />;
          case "input":
            return (
              <Composer
                key={t.id}
                placeholder={t.placeholder}
                multiline={t.multiline}
                cta={t.cta}
                answered={t.answered}
                onSubmit={t.onSubmit}
              />
            );
          case "widget":
            if (t.answered) return null;
            return (
              <MotionBox
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                alignSelf="stretch"
              >
                {t.render(t.done)}
              </MotionBox>
            );
          default:
            return null;
        }
      })}
      <div ref={endRef} />
    </Stack>
  );
}
