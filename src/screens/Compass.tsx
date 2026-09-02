import { Box, HStack, Stack, Text, Wrap } from "@chakra-ui/react";
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
import { Btn, Field } from "../ui/controls";
import { Card, FieldLabel, PageHeader } from "../ui/primitives";
import { Async, EmptyState, humanError, useAsync } from "../ui/states";
import { toaster } from "../ui/toaster";
import { t } from "../i18n";

const PRIORITY_ORDER: Priority[] = ["must", "should", "may"];

export function Compass({ ctx }: { ctx: Ctx }) {
  const domains = useAsync(() => listDomains(), []);
  const [active, setActive] = useState<Domain>();
  const [newDomain, setNewDomain] = useState("");

  const current = active ?? domains.data?.[0];

  return (
    <>
      <PageHeader title={t("Your compass")} sub={t("What matters to you, put into words — one life area at a time.")} />
      <Async
      state={domains}
      empty={(d) =>
        d.length === 0 ? (
          <EmptyState
            icon="🧭"
            title={t("Your compass is blank")}
            hint={t("Add the first area of your life — health, work, the people you love… whatever comes.")}
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
                    toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
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
              <button
                key={d.id}
                type="button"
                className={"ui-chip" + (current?.id === d.id ? " on" : "")}
                onClick={() => setActive(d)}
              >
                {d.name}
              </button>
            ))}
            <AddDomainPopoverButton
              onAdd={async (name) => {
                try {
                  const d = await createDomain(name);
                  domains.reload();
                  setActive(d);
                } catch (e) {
                  toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
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
              title={`${t("Nothing here yet in")} "${domain.name}"`}
              hint={t("What matters to you here? Write it simply.")}
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
    } catch (e) {
      toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
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
            {it.situation ? `${t("When")} ${it.situation}, ` : ""}
            {it.action ? `${t("I")} ${it.action}.` : ""}
          </Text>
        )}
        {expert && (
          <Text fontSize="10px" color="fg.subtle" fontFamily="mono" mt="0.5">
            intention · {it.priority}
          </Text>
        )}
      </Stack>
      <button
        type="button"
        className={"ui-chip" + (it.priority === "must" ? " on" : "")}
        onClick={cyclePriority}
        disabled={saving}
        style={{ flexShrink: 0 }}
      >
        {PRIORITY_LABELS[it.priority]}
      </button>
      <Btn
        sm
        ghost
        onClick={async () => {
          try {
            await archiveIntention(it.id);
            onChange();
          } catch (e) {
            toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
          }
        }}
      >
        ✕
      </Btn>
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
      toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
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
      toaster.create({ type: "info", title: t("The assistant added nothing"), description: t("Your sentence is enough.") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="3" pt="1">
      <HStack>
        <Field
          placeholder={t("What matters to you here…")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <Btn ghost onClick={assist} loading={busy === "ai"} disabled={!text.trim()} title={t("Rephrase")}>
          <IconSparkle boxSize="4" />
        </Btn>
      </HStack>
      {reform && (
        <FadeIn>
          <Box bg="surface.muted" rounded="l2" px="3.5" py="2.5">
            <Text fontSize="sm" color="fg.muted">
              {t("When")} <b>{reform.situation}</b>, {t("I")} <b>{reform.action}</b>.
            </Text>
          </Box>
        </FadeIn>
      )}
      <HStack>
        <Stack gap="1" flex="1">
          <FieldLabel>{t("Weight")}</FieldLabel>
          <Wrap gap="1.5">
            {PRIORITY_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                className={"ui-chip" + (priority === p ? " on" : "")}
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </Wrap>
        </Stack>
        <Box alignSelf="end">
          <Btn primary onClick={save} loading={busy === "save"} disabled={!text.trim()}>
            <IconPlus boxSize="4" /> {t("Add")}
          </Btn>
        </Box>
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
      <Field
        placeholder={t("e.g. Health")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
      />
      <Btn primary onClick={onAdd} disabled={!value.trim()}>
        {t("Add")}
      </Btn>
    </HStack>
  );
}

function AddDomainPopoverButton({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  if (!open)
    return (
      <Btn sm ghost onClick={() => setOpen(true)}>
        <IconPlus boxSize="4" /> {t("Area")}
      </Btn>
    );
  return (
    <HStack>
      <Field
        autoFocus
        placeholder={t("Area name")}
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
        style={{ width: "140px" }}
      />
      <Btn
        sm
        primary
        onClick={() => {
          if (name.trim()) {
            onAdd(name.trim());
            setName("");
            setOpen(false);
          }
        }}
      >
        OK
      </Btn>
    </HStack>
  );
}
