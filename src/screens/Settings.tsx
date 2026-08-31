import { Badge, Box, Button, HStack, Input, Stack, Text } from "@chakra-ui/react";
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
import { Card, FieldLabel, PageHeader, SectionTitle } from "../ui/primitives";
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
                <Button
                  key={t}
                  size="xs"
                  variant={setting === t ? "solid" : "outline"}
                  colorPalette="teal"
                  onClick={() => set(t)}
                >
                  {t === "light" ? "Clair" : t === "dark" ? "Sombre" : "Système"}
                </Button>
              ))}
            </HStack>
          </HStack>
        </Card>
      </Box>

      <Box>
        <SectionTitle hint="Le mode expert montre le vocabulaire du moteur (spec, delta, revue).">
          Niveau de détail
        </SectionTitle>
        <Card>
          <HStack>
            <Text fontSize="sm" flex="1">
              {ctx.mode === "expert" ? "Mode expert" : "Mode simple"}
            </Text>
            <Button size="sm" variant="subtle" colorPalette="teal" onClick={() => ctx.setMode(ctx.mode === "expert" ? "human" : "expert")}>
              Passer en {ctx.mode === "expert" ? "simple" : "expert"}
            </Button>
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
        <Async state={state} loading={<Badge variant="subtle">…</Badge>}>
          {(h) => (
            <Badge colorPalette={h.ok ? "green" : "gray"} variant="subtle">
              {h.ok ? okText : offText}
            </Badge>
          )}
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
      const md = await exportData();
      await navigator.clipboard.writeText(md).catch(() => {});
      toaster.create({ type: "success", title: "Export copié", description: "Tout ton contenu en Markdown, dans le presse-papier." });
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
          <Text fontSize="xs" color="fg.muted">Tout ton contenu en texte lisible, à toi.</Text>
        </Stack>
        <Button size="sm" variant="subtle" onClick={run} loading={busy}>
          Copier en Markdown
        </Button>
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
          <Input
            type="password"
            placeholder="Phrase secrète (min. 6 caractères)"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            bg="surface"
          />
          <Button size="sm" variant="subtle" onClick={run} loading={busy} disabled={pass.length < 6}>
            Créer
          </Button>
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
    <Card borderColor="red.200" _dark={{ borderColor: "red.800" }}>
      <Stack gap="3">
        <Stack gap="0.5">
          <Text fontSize="sm" fontWeight="medium" color="red.500">
            Tout effacer
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Efface définitivement toutes tes données de cet appareil. Sans retour possible.
          </Text>
        </Stack>
        {!open ? (
          <Button size="sm" variant="outline" colorPalette="red" alignSelf="start" onClick={() => setOpen(true)}>
            Effacer mes données
          </Button>
        ) : (
          <Stack gap="2">
            <FieldLabel>
              Écris <b>{WORD}</b> pour confirmer
            </FieldLabel>
            <HStack>
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} bg="surface" placeholder={WORD} />
              <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setConfirm(""); }}>
                Annuler
              </Button>
              <Button size="sm" colorPalette="red" onClick={run} loading={busy} disabled={confirm !== WORD}>
                Effacer
              </Button>
            </HStack>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
