import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { Ctx } from "../App";
import {
  aiHealth,
  dbHealth,
  eraseAll,
  exportData,
  syncExport,
  type Health,
} from "../lib/ipc";
import { useColorMode } from "../provider";
import { Btn, Field } from "../ui/controls";
import { Card, FieldLabel, PageHeader, Pill, SectionTitle } from "../ui/primitives";
import { Async, useAsync, humanError } from "../ui/states";
import { toaster } from "../ui/toaster";
import { t } from "../i18n";

export function Settings({ ctx }: { ctx: Ctx }) {
  const db = useAsync(() => dbHealth(), []);
  const ai = useAsync(() => aiHealth(), []);
  const { setting, set } = useColorMode();

  return (
    <Stack gap="6">
      <PageHeader title={t("Settings")} sub={t("The app, the local AI, your data.")} />
      <Box>
        <SectionTitle hint={t("What keeps the app running, right here, on your machine.")}>
          {t("Status")}
        </SectionTitle>
        <Stack gap="2.5">
          <HealthCard label={t("Your data (encrypted)")} state={db} okText={t("Ready and protected")} />
          <HealthCard
            label={t("Local assistant (optional)")}
            state={ai}
            okText={t("Available")}
            offText={t("Not installed — the app works without it")}
          />
        </Stack>
      </Box>

      <Box>
        <SectionTitle>{t("Appearance")}</SectionTitle>
        <Card>
          <Stack gap="3">
            <HStack>
              <Stack gap="0.5" flex="1">
                <Text fontSize="sm" fontWeight="medium">{t("Theme")}</Text>
                <Text fontSize="xs" color="fg.muted">{t("Light, dark, or follow your system.")}</Text>
              </Stack>
              <HStack gap="1.5">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={"ui-chip" + (setting === mode ? " on" : "")}
                    onClick={() => set(mode)}
                  >
                    {mode === "light" ? t("Light") : mode === "dark" ? t("Dark") : t("System")}
                  </button>
                ))}
              </HStack>
            </HStack>
            <HStack>
              <Stack gap="0.5" flex="1">
                <Text fontSize="sm" fontWeight="medium">{t("Language")}</Text>
                <Text fontSize="xs" color="fg.muted">{t("English, or French.")}</Text>
              </Stack>
              <HStack gap="1.5">
                {(["en", "fr"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={"ui-chip" + (ctx.lang === l ? " on" : "")}
                    onClick={() => ctx.setLang(l)}
                  >
                    {l === "en" ? "English" : "Français"}
                  </button>
                ))}
              </HStack>
            </HStack>
          </Stack>
        </Card>
      </Box>

      <Box>
        <SectionTitle hint={t("Expert mode shows the technical gears, for the curious.")}>
          {t("Level of detail")}
        </SectionTitle>
        <Card>
          <HStack>
            <Text fontSize="sm" flex="1">
              {ctx.mode === "expert" ? t("Expert mode") : t("Simple mode")}
            </Text>
            <Btn sm subtle onClick={() => ctx.setMode(ctx.mode === "expert" ? "human" : "expert")}>
              {t("Switch to")} {ctx.mode === "expert" ? t("simple") : t("expert")}
            </Btn>
          </HStack>
        </Card>
      </Box>

      <Box>
        <SectionTitle>{t("Your data")}</SectionTitle>
        <Stack gap="2.5">
          <ExportCard />
          <SyncCard />
          <EraseCard />
        </Stack>
      </Box>
    </Stack>
  );
}

function HealthCard({
  label,
  state,
  okText,
  offText = t("Unavailable"),
}: {
  label: string;
  state: ReturnType<typeof useAsync<Health>>;
  okText: string;
  offText?: string;
}) {
  return (
    <Card>
      <HStack>
        <Text fontSize="sm" fontWeight="medium" flex="1">
          {label}
        </Text>
        <Async state={state} loading={<Pill>…</Pill>}>
          {(h) => <Pill active={h.ok}>{h.ok ? okText : offText}</Pill>}
        </Async>
      </HStack>
    </Card>
  );
}

function ExportCard() {
    const [busy, setBusy] = useState(false);
    const run = async () => {
      setBusy(true);
      try {
        const path = await exportData();
        toaster.create({ type: "success", title: t("Export created"), description: path });
      } catch (e) {
        toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
      } finally {
        setBusy(false);
      }
    };
    return (
      <Card>
        <HStack>
          <Stack gap="0.5" flex="1">
            <Text fontSize="sm" fontWeight="medium">{t("Export")}</Text>
            <Text fontSize="xs" color="fg.muted">
              {t("All your content as readable text, saved to your Documents folder.")}
            </Text>
          </Stack>
          <Btn sm subtle onClick={run} loading={busy}>
            {t("Export as Markdown")}
          </Btn>
        </HStack>
      </Card>
    );
  }

function SyncCard() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (pass.length < 6) return;
    setBusy(true);
    try {
      const path = await syncExport(pass);
      toaster.create({ type: "success", title: t("Encrypted snapshot created"), description: path });
    } catch (e) {
      toaster.create({ type: "error", title: t("Oops"), description: humanError(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Stack gap="3">
        <Stack gap="0.5">
          <Text fontSize="sm" fontWeight="medium">{t("Encrypted snapshot")}</Text>
          <Text fontSize="xs" color="fg.muted">
            {t(
              "A file protected by a passphrase, to carry your data across devices. The passphrase is stored nowhere — keep it.",
            )}
          </Text>
        </Stack>
        <HStack>
          <Field
            type="password"
            placeholder={t("Passphrase (min. 6 characters)")}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <Btn sm subtle onClick={run} loading={busy} disabled={pass.length < 6}>
            {t("Create")}
          </Btn>
        </HStack>
      </Stack>
    </Card>
  );
}

function EraseCard() {
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const WORD = "ERASE";

  const run = async () => {
    setBusy(true);
    try {
      await eraseAll(confirm);
      toaster.create({ type: "success", title: t("Everything was erased") });
      setOpen(false);
      setConfirm("");
    } catch (e) {
      toaster.create({ type: "error", title: t("Couldn't erase"), description: humanError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack gap="3">
        <Stack gap="0.5">
          <Text fontSize="sm" fontWeight="medium" color="fg">
            {t("Erase everything")}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {t("Permanently erases all your data on this device. There is no way back.")}
          </Text>
        </Stack>
        {!open ? (
          <Box>
            <Btn sm danger onClick={() => setOpen(true)}>
              {t("Erase my data")}
            </Btn>
          </Box>
        ) : (
          <Stack gap="2">
            <FieldLabel>
              {t("Type")} <b>{WORD}</b> {t("to confirm")}
            </FieldLabel>
            <HStack>
              <Field value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={WORD} />
              <Btn sm ghost onClick={() => { setOpen(false); setConfirm(""); }}>
                {t("Cancel")}
              </Btn>
              <Btn sm danger primary onClick={run} loading={busy} disabled={confirm !== WORD}>
                {t("Erase")}
              </Btn>
            </HStack>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
