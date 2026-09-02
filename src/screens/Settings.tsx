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

export function Settings({ ctx }: { ctx: Ctx }) {
  const db = useAsync(() => dbHealth(), []);
  const ai = useAsync(() => aiHealth(), []);
  const { setting, set } = useColorMode();

  return (
    <Stack gap="6">
      <PageHeader title="Réglages" sub="L'app, l'IA locale, tes données." />
      <Box>
        <SectionTitle hint="Ce qui fait tourner l'app, ici, sur ta machine.">État</SectionTitle>
        <Stack gap="2.5">
          <HealthCard label="Tes données (chiffrées)" state={db} okText="Prêtes et protégées" />
          <HealthCard
            label="Assistant local (optionnel)"
            state={ai}
            okText="Disponible"
            offText="Pas installé — l'app marche quand même"
          />
        </Stack>
      </Box>

      <Box>
        <SectionTitle>Apparence</SectionTitle>
        <Card>
          <HStack>
            <Stack gap="0.5" flex="1">
              <Text fontSize="sm" fontWeight="medium">Thème</Text>
              <Text fontSize="xs" color="fg.muted">Clair, sombre, ou selon ton système.</Text>
            </Stack>
            <HStack gap="1.5">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={"ui-chip" + (setting === t ? " on" : "")}
                  onClick={() => set(t)}
                >
                  {t === "light" ? "Clair" : t === "dark" ? "Sombre" : "Système"}
                </button>
              ))}
            </HStack>
          </HStack>
        </Card>
      </Box>

      <Box>
        <SectionTitle hint="Le mode expert affiche les rouages techniques, pour les curieux.">
          Niveau de détail
        </SectionTitle>
        <Card>
          <HStack>
            <Text fontSize="sm" flex="1">
              {ctx.mode === "expert" ? "Mode expert" : "Mode simple"}
            </Text>
            <Btn sm subtle onClick={() => ctx.setMode(ctx.mode === "expert" ? "human" : "expert")}>
              Passer en {ctx.mode === "expert" ? "simple" : "expert"}
            </Btn>
          </HStack>
        </Card>
      </Box>

      <Box>
        <SectionTitle>Tes données</SectionTitle>
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
  offText = "Indisponible",
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
        toaster.create({ type: "success", title: "Export créé", description: path });
      } catch (e) {
        toaster.create({ type: "error", title: "Oups", description: humanError(e) });
      } finally {
        setBusy(false);
      }
    };
    return (
      <Card>
        <HStack>
          <Stack gap="0.5" flex="1">
            <Text fontSize="sm" fontWeight="medium">Exporter</Text>
            <Text fontSize="xs" color="fg.muted">
              Tout ton contenu en texte lisible, sauvegardé dans Tes documents.
            </Text>
          </Stack>
          <Btn sm subtle onClick={run} loading={busy}>
            Exporter en Markdown
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
      toaster.create({ type: "success", title: "Sauvegarde chiffrée créée", description: path });
    } catch (e) {
      toaster.create({ type: "error", title: "Oups", description: humanError(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Stack gap="3">
        <Stack gap="0.5">
          <Text fontSize="sm" fontWeight="medium">Sauvegarde chiffrée</Text>
          <Text fontSize="xs" color="fg.muted">
            Un fichier protégé par une phrase secrète, pour transporter tes données. La phrase n'est stockée nulle part —
            garde-la.
          </Text>
        </Stack>
        <HStack>
          <Field
            type="password"
            placeholder="Phrase secrète (min. 6 caractères)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <Btn sm subtle onClick={run} loading={busy} disabled={pass.length < 6}>
            Créer
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
  const WORD = "SUPPRIMER";

  const run = async () => {
    setBusy(true);
    try {
      await eraseAll(confirm);
      toaster.create({ type: "success", title: "Tout a été effacé" });
      setOpen(false);
      setConfirm("");
    } catch (e) {
      toaster.create({ type: "error", title: "Impossible", description: humanError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack gap="3">
        <Stack gap="0.5">
          <Text fontSize="sm" fontWeight="medium" color="fg">
            Tout effacer
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Efface définitivement toutes tes données de cet appareil. Sans retour possible.
          </Text>
        </Stack>
        {!open ? (
          <Box>
            <Btn sm danger onClick={() => setOpen(true)}>
              Effacer mes données
            </Btn>
          </Box>
        ) : (
          <Stack gap="2">
            <FieldLabel>
              Écris <b>{WORD}</b> pour confirmer
            </FieldLabel>
            <HStack>
              <Field value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={WORD} />
              <Btn sm ghost onClick={() => { setOpen(false); setConfirm(""); }}>
                Annuler
              </Btn>
              <Btn sm danger primary onClick={run} loading={busy} disabled={confirm !== WORD}>
                Effacer
              </Btn>
            </HStack>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
