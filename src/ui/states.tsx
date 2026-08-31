import { Box, Button, Center, Spinner, Stack, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { isApiError } from "../lib/ipc";
import { FadeIn } from "./motion";

// --- Async state helper ---------------------------------------------------
// One hook every screen uses so loading / error / empty are handled the same
// way everywhere. Returns the data plus flags and a manual reload.

export type AsyncState<T> = {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
};

export function humanError(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Quelque chose n'a pas fonctionné.";
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [tick, setTick] = useState(0);

  const run = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(undefined);
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(humanError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  useEffect(run, [run]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}

// --- Visual states --------------------------------------------------------

export function LoadingState({ label = "Un instant…" }: { label?: string }) {
  return (
    <Center py="16" minH="40">
      <Stack align="center" gap="3">
        <Spinner size="lg" color="accent" borderWidth="3px" />
        <Text color="fg.muted" fontSize="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <FadeIn>
      <Center py="12">
        <Stack
          align="center"
          gap="3"
          maxW="sm"
          textAlign="center"
          bg="surface"
          borderWidth="1px"
          borderColor="border"
          rounded="l3"
          px="8"
          py="7"
        >
          <Text fontSize="2xl">🫧</Text>
          <Text fontWeight="medium" color="fg">
            Ça n'a pas marché
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {message}
          </Text>
          {onRetry && (
            <Button size="sm" variant="subtle" onClick={onRetry} mt="1">
              Réessayer
            </Button>
          )}
        </Stack>
      </Center>
    </FadeIn>
  );
}

export function EmptyState({
  icon = "🧭",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <FadeIn>
      <Center py="12">
        <Stack align="center" gap="3" maxW="sm" textAlign="center">
          <Box
            fontSize="3xl"
            w="14"
            h="14"
            rounded="full"
            bg="accent.subtle"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <span>{icon}</span>
          </Box>
          <Text fontWeight="medium" fontSize="md" color="fg">
            {title}
          </Text>
          {hint && (
            <Text fontSize="sm" color="fg.muted" lineHeight="1.6">
              {hint}
            </Text>
          )}
          {action && <Box pt="1">{action}</Box>}
        </Stack>
      </Center>
    </FadeIn>
  );
}

// Convenience: render the right state, or the children with loaded data.
export function Async<T>({
  state,
  loading,
  empty,
  children,
}: {
  state: AsyncState<T>;
  loading?: React.ReactNode;
  empty?: (data: T) => boolean | React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (state.loading && state.data === undefined) return <>{loading ?? <LoadingState />}</>;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (state.data === undefined) return <LoadingState />;
  if (empty) {
    const e = empty(state.data);
    if (e && e !== true) return <>{e}</>;
    if (e === true) return null;
  }
  return <>{children(state.data)}</>;
}
