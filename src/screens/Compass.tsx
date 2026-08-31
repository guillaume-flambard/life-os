import { Box, Button, HStack, Input, Stack, Text, Wrap } from "@chakra-ui/react";
import { useState } from "react";
import type { Ctx } from "../App";
import {
  archiveIntention,
  createDomain,
  createIntention,
  listDomains,
  listIntentions,
  PRIORITY_LABELS,
  reformulateIntention,
  setIntentionPriority,
  type Domain,
  type Intention,
  type Priority,
} from "../lib/ipc";
import { FadeIn, MotionBox, staggerContainer, staggerItem } from "../ui/motion";
import { IconPlus, IconSparkle } from "../ui/icons";
import { Card, FieldLabel, PageHeader } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { toaster } from "../ui/toaster";

const PRIORITY_ORDER: Priority[] = ["must", "should", "may"];
const PRIORITY_COLOR: Record<Priority, string> = {
  must: "red",
  should: "teal",
  may: "gray",
};

export function Compass({ ctx }: { ctx: Ctx }) {
  const domains = useAsync(() => listDomains(), []);
  const [active, setActive] = useState<Domain>();
  const [newDomain, setNewDomain] = useState("");

  const current = active ?? domains.data?.[0];

  return (
    <>
      <PageHeader title="Ta boussole" sub="Ce qui compte pour toi, mis en mots — par pan de vie." />
      <Async
      state={domains}
      empty={(d) =>
        d.length === 0 ? (
          <EmptyState
            icon="🧭"
            title="Ta boussole est vierge"
            hint="Ajoute un premier pan de ta vie — santé, travail, proches… ce qui te vient."
            action={
              <AddDomainInline
                value={newDomain}
                onChange={setNewDomain}
                onAdd={async () => {
                  try {
                    await createDomain(newDomain.trim());
                    setNewDomain("");
                    domains.reload();
                  } catch (e) {
                    toaster.create({ type: "error", title: "Oups", description: humanError(e) });
                  }
                }}
              />
            }
          />
        ) : false
      }
    >
      {(list) => (
        <Stack gap="5">
          <Wrap gap="2">
            {list.map((d) => (
              <Button
                key={d.id}
                size="sm"
                variant={current?.id === d.id ? "solid" : "outline"}
                colorPalette={current?.id === d.id ? "teal" : "gray"}
                rounded="full"
                onClick={() => setActive(d)}
              >
                {d.name}
              </Button>
            ))}
            <AddDomainPopoverButton
              onAdd={async (name) => {
                try {
                  const d = await createDomain(name);
                  domains.reload();
                  setActive(d);
                } catch (e) {
                  toaster.create({ type: "error", title: "Oups", description: humanError(e) });
                }
              }}
            />
          </Wrap>

          {current && <IntentionList key={current.id} domain={current} ctx={ctx} />}
        </Stack>
      )}
      </Async>
    </>
  );
}

function IntentionList({ domain, ctx }: { domain: Domain; ctx: Ctx }) {
  const intentions = useAsync(() => listIntentions(domain.id), [domain.id]);
  const expert = ctx.mode === "expert";

  return (
    <Async
      state={intentions}
      empty={(list) =>
        list.length === 0 ? (
          <Card>
            <EmptyState
              icon="🌱"
              title={`Rien encore dans « ${domain.name} »`}
              hint="Qu'est-ce qui compte pour toi ici ? Écris-le simplement."
            />
            <AddIntention domainId={domain.id} onAdded={intentions.reload} />
          </Card>
        ) : false
      }
    >
      {(list) => (
        <Stack gap="4">
          <MotionBox variants={staggerContainer} initial="initial" animate="animate">
            <Stack gap="2.5">
              {[...list]
                .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
                .map((it) => (
                  <MotionBox key={it.id} variants={staggerItem}>
                    <IntentionRow
                      it={it}
                      expert={expert}
                      onChange={intentions.reload}
                    />
                  </MotionBox>
                ))}
            </Stack>
          </MotionBox>
          <Card>
            <AddIntention domainId={domain.id} onAdded={intentions.reload} />
          </Card>
        </Stack>
      )}
    </Async>
  );
}

function IntentionRow({
  it,
  expert,
  onChange,
}: {
  it: Intention;
  expert: boolean;
  onChange: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const cyclePriority = async () => {
    const next = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(it.priority) + 1) % 3];
    setSaving(true);
    try {
      await setIntentionPriority(it.id, next);
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <HStack
      align="start"
      bg="surface"
      borderWidth="1px"
      borderColor="border"
      rounded="l2"
      px="4"
      py="3"
      gap="3"
    >
      <Stack gap="0.5" flex="1" minW="0">
        <Text fontSize="sm" fontWeight="medium">
          {it.statement}
        </Text>
        {(it.situation || it.action) && (
          <Text fontSize="xs" color="fg.muted" lineHeight="1.5">
            {it.situation ? `Quand ${it.situation}, ` : ""}
            {it.action ? `je ${it.action}.` : ""}
          </Text>
        )}
        {expert && (
          <Text fontSize="10px" color="fg.subtle" fontFamily="mono" mt="0.5">
            intention · {it.priority}
          </Text>
        )}
      </Stack>
      <Button
        size="xs"
        variant="subtle"
        colorPalette={PRIORITY_COLOR[it.priority]}
        rounded="full"
        onClick={cyclePriority}
        loading={saving}
        flexShrink="0"
      >
        {PRIORITY_LABELS[it.priority]}
      </Button>
      <Button
        size="xs"
        variant="ghost"
        color="fg.subtle"
        onClick={async () => {
          await archiveIntention(it.id);
          onChange();
        }}
      >
        ✕
      </Button>
    </HStack>
  );
}

function AddIntention({ domainId, onAdded }: { domainId: string; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("should");
  const [busy, setBusy] = useState<"save" | "ai" | null>(null);
  const [reform, setReform] = useState<{ situation: string; action: string } | null>(null);

  const save = async () => {
    if (!text.trim()) return;
    setBusy("save");
    try {
      await createIntention(
        domainId,
        text.trim(),
        reform?.situation ?? null,
        reform?.action ?? null,
        priority,
      );
      setText("");
      setReform(null);
      setPriority("should");
      onAdded();
    } catch (e) {
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setBusy(null);
    }
  };

  const assist = async () => {
    if (!text.trim()) return;
    setBusy("ai");
    try {
      const r = await reformulateIntention(text.trim());
      setReform({ situation: r.situation, action: r.action });
      if (r.statement) setText(r.statement);
    } catch {
      toaster.create({ type: "info", title: "L'assistant n'a rien ajouté", description: "Ta phrase suffit." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="3" pt="1">
      <HStack>
        <Input
          placeholder="Ce qui compte pour toi ici…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          bg="surface"
        />
        <Button variant="ghost" onClick={assist} loading={busy === "ai"} disabled={!text.trim()} title="Reformuler">
          <IconSparkle boxSize="4" />
        </Button>
      </HStack>
      {reform && (
        <FadeIn>
          <Box bg="accent.subtle" rounded="l2" px="3.5" py="2.5">
            <Text fontSize="sm" color="fg.muted">
              Quand <b>{reform.situation}</b>, je <b>{reform.action}</b>.
            </Text>
          </Box>
        </FadeIn>
      )}
      <HStack>
        <Stack gap="1" flex="1">
          <FieldLabel>Importance</FieldLabel>
          <Wrap gap="1.5">
            {PRIORITY_ORDER.map((p) => (
              <Button
                key={p}
                size="xs"
                variant={priority === p ? "solid" : "outline"}
                colorPalette={priority === p ? PRIORITY_COLOR[p] : "gray"}
                rounded="full"
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABELS[p]}
              </Button>
            ))}
          </Wrap>
        </Stack>
        <Button alignSelf="end" onClick={save} loading={busy === "save"} disabled={!text.trim()} colorPalette="teal">
          <IconPlus boxSize="4" /> Ajouter
        </Button>
      </HStack>
    </Stack>
  );
}

function AddDomainInline({
  value,
  onChange,
  onAdd,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <HStack maxW="sm">
      <Input
        placeholder="Ex. Santé"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        bg="surface"
      />
      <Button onClick={onAdd} disabled={!value.trim()} colorPalette="teal">
        Ajouter
      </Button>
    </HStack>
  );
}

function AddDomainPopoverButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open)
    return (
      <Button size="sm" variant="ghost" color="fg.muted" rounded="full" onClick={() => setOpen(true)}>
        <IconPlus boxSize="4" /> Pan
      </Button>
    );
  return (
    <HStack>
      <Input
        size="sm"
        autoFocus
        placeholder="Nom du pan"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onAdd(name.trim());
            setName("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        bg="surface"
        w="36"
      />
      <Button
        size="sm"
        colorPalette="teal"
        onClick={() => {
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
            setOpen(false);
          }
        }}
      >
        OK
      </Button>
    </HStack>
  );
}
