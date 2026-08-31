import { Box, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import {
  capturesRecent,
  captureAdd,
  createDomain,
  createIntention,
  decisionAddOption,
  decisionAddStory,
  decisionFinalize,
  decisionSetConfidence,
  listDecisions,
  listDomains,
  listIntentions,
  listOpenStories,
  openDecision,
  reformulateIntention,
  safetyScreen,
  setOnboarded,
  setStoryStatus,
  type OpenStory,
  type Reformulation,
} from "../lib/ipc";
import { Conversation } from "../guide/chat";
import { useFlow, type Flow } from "../guide/flow";
import { AlignFinder, OptionFinder, StepFinder } from "../guide/assists";
import { useReasoningStream } from "../lib/reasoning";
import { ReasoningPanel } from "../ui/Reasoning";
import { navigate } from "../ui/router";

// The home IS the conversation. First run has no wizard: one warm line, then a
// single choice. Each branch does the smallest useful thing and hands back the
// wheel. The world (nav) is revealed after the first act, and the menu of what
// the user can do grows as their world fills — held by the hand, step by step.

const CONFIDENCE = [
  { label: "Très incertain", value: "20" },
  { label: "Hésitant", value: "40" },
  { label: "Plutôt sûr", value: "60" },
  { label: "Confiant", value: "80" },
  { label: "Décidé", value: "100" },
];

interface World {
  decisions: number;
  notes: number;
  domains: number;
  openStories: OpenStory[];
}

async function snapshot(): Promise<World> {
  const empty: World = { decisions: 0, notes: 0, domains: 0, openStories: [] };
  try {
    const [decisions, notes, domains, openStories] = await Promise.all([
      listDecisions().catch(() => []),
      capturesRecent(1).catch(() => []),
      listDomains().catch(() => []),
      listOpenStories().catch(() => []),
    ]);
    return {
      decisions: decisions.length,
      notes: notes.length,
      domains: domains.length,
      openStories,
    };
  } catch {
    return empty;
  }
}

export function Guide({ onboarded, onReveal }: { onboarded: boolean; onReveal: () => void }) {
  const turns = useFlow((flow) => script(flow, onboarded, onReveal));
  return (
    <Box maxW="2xl" mx="auto" w="full" pt={{ base: "4", md: "10" }}>
      <Conversation turns={turns} />
    </Box>
  );
}

// --- The safety net: never a diagnosis, always a hand toward real help. -----
function ResourcesBubble({ resources }: { resources: { name: string; contact: string }[] }) {
  const list = resources.length
    ? resources
    : [
        { name: "3114 — prévention du suicide", contact: "3114" },
        { name: "SOS Amitié", contact: "09 72 39 40 50" },
      ];
  return (
    <Box
      bg="accent.subtle"
      borderWidth="1px"
      borderColor="transparent"
      rounded="l3"
      borderTopLeftRadius="sm"
      px="4"
      py="3.5"
      maxW="90%"
      alignSelf="start"
    >
      <Stack gap="2.5">
        <Text fontSize="md" fontWeight="medium">
          Je ne suis pas un soignant — mais parler à quelqu'un peut aider, là, maintenant.
        </Text>
        <Stack gap="1.5">
          {list.map((r) => (
            <HStack key={r.name} justify="space-between" gap="4">
              <Text fontSize="sm" color="fg.muted">
                {r.name}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="accent.emphasis">
                {r.contact}
              </Text>
            </HStack>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

// Screen free text locally; if there's distress, gently surface help in-thread.
async function safetyCheck(flow: Flow, text: string) {
  try {
    const r = await safetyScreen(text);
    if (r.distress) {
      await flow.say(<ResourcesBubble resources={r.resources ?? []} />);
      const go = await flow.ask([
        { label: "Voir les ressources", value: "yes", tone: "accent" },
        { label: "Ça va, je continue", value: "no" },
      ]);
      if (go === "yes") navigate("distress");
    }
  } catch {
    /* screening is best-effort; never block the user */
  }
}

async function script(flow: Flow, onboarded: boolean, onReveal: () => void) {
  let revealed = onboarded;
  const reveal = async () => {
    if (revealed) return;
    revealed = true;
    await setOnboarded().catch(() => {});
    onReveal();
  };

  const world = await snapshot();

  if (!onboarded) {
    await flow.say("Salut 👋");
    await flow.say("Je suis là pour t'aider à voir clair dans ce qui compte — tranquillement, à ton rythme.");
    await flow.say("Tout reste ici, sur ta machine. Rien ne part ailleurs.");
  } else {
    await flow.say(welcomeBack(world));
    // Follow-through first: a pending small step is the gentlest re-entry.
    if (world.openStories.length > 0) {
      const done = await pickStep(flow, world.openStories);
      if (done) Object.assign(world, await snapshot());
    }
  }

  let first = true;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const options = menuFor(world, first);
    const choice = await flow.ask(options, {
      prompt: first ? (onboarded ? "Qu'est-ce qui t'amène ?" : "On commence par quoi ?") : "Et maintenant ?",
    });
    first = false;

    if (choice === "note") await branchNote(flow, reveal);
    else if (choice === "compass") await branchCompass(flow, reveal);
    else if (choice === "decision") await branchDecision(flow, reveal);
    else if (choice === "step") await pickStep(flow, world.openStories);
    else if (choice === "carnet") return navigate("carnet");
    else if (choice === "review") return navigate("review");

    Object.assign(world, await snapshot());

    const again = await flow.ask([
      { label: "Encore une chose", value: "again", tone: "accent" },
      { label: "C'est bon pour l'instant", value: "stop" },
    ]);
    if (again === "stop") {
      await flow.say("Quand tu veux. Je reste là.");
      return;
    }
  }
}

function welcomeBack(w: World): string {
  if (w.decisions === 0 && w.notes === 0)
    return "Re. On reprend là où tu veux.";
  const bits: string[] = [];
  if (w.decisions) bits.push(`${w.decisions} décision${w.decisions > 1 ? "s" : ""}`);
  if (w.domains) bits.push(`${w.domains} pan${w.domains > 1 ? "s" : ""} de vie`);
  return bits.length ? `Content de te revoir. Tu as ${bits.join(" et ")}.` : "Content de te revoir.";
}

function menuFor(w: World, first: boolean): { label: string; value: string; hint?: string; tone?: "default" | "accent" }[] {
  const opts: { label: string; value: string; hint?: string; tone?: "default" | "accent" }[] = [
    { label: "Une décision me trotte", value: "decision", hint: "on la regarde ensemble", tone: "accent" },
    { label: "Poser ce qui compte pour moi", value: "compass", hint: "une chose, pour commencer" },
    { label: "Juste noter une pensée", value: "note", hint: "ça reste ici, chiffré" },
  ];
  // The field grows with the world.
  if (first && w.openStories.length > 0) {
    opts.push({ label: "Reprendre un petit pas", value: "step", hint: `${w.openStories.length} en attente` });
  }
  if (w.decisions > 0) {
    opts.push({ label: "Voir mon carnet", value: "carnet", hint: "tes décisions" });
  }
  return opts;
}

// --- Follow-through: tick a pending small step ------------------------------
async function pickStep(flow: Flow, stories: OpenStory[]): Promise<boolean> {
  if (stories.length === 0) return false;
  const s = stories[0];
  const ans = await flow.ask(
    [
      { label: "Fait ✓", value: "done", tone: "accent" },
      { label: "Pas encore", value: "later" },
      { label: "Laisse tomber", value: "drop" },
    ],
    {
      prompt: (
        <Stack gap="1">
          <Text>Un petit pas t'attend :</Text>
          <Text fontWeight="semibold">{s.title}</Text>
          {s.decision_title && (
            <Text fontSize="sm" color="fg.muted">
              pour « {s.decision_title} »
            </Text>
          )}
        </Stack>
      ),
    },
  );
  if (ans === "done") {
    await setStoryStatus(s.id, "done").catch(() => {});
    await flow.say("Bravo. Un pas, c'est un pas. 🌱");
    return true;
  }
  if (ans === "drop") {
    await setStoryStatus(s.id, "dropped").catch(() => {});
    await flow.say("Rangé. Aucun souci.");
    return true;
  }
  await flow.say("Ok, il t'attendra. Sans pression.");
  return false;
}

async function branchNote(flow: Flow, reveal: () => Promise<void>) {
  const txt = await flow.input({
    prompt: "Vas-y, écris. Ce qui te passe par la tête.",
    placeholder: "Une pensée, un ressenti, un truc à ne pas oublier…",
    multiline: true,
    cta: "Garder",
  });
  await captureAdd(txt).catch(() => {});
  await reveal();
  await flow.say("C'est gardé. Pour toi seul·e.");
  await safetyCheck(flow, txt);
}

async function branchCompass(flow: Flow, reveal: () => Promise<void>) {
  const thing = await flow.input({
    prompt: "Cite UNE chose qui compte pour toi, là, maintenant. Rien de plus.",
    placeholder: "Ex. ma santé · mes proches · apprendre · le temps pour moi",
    cta: "Noter",
  });
  let domainId: string | null = null;
  try {
    const d = await createDomain(thing);
    domainId = d.id;
  } catch {
    /* keep going even without persistence */
  }
  await reveal();
  await flow.say(
    <>
      Noté. <b>{thing}</b> compte pour toi.
    </>,
  );

  // Optional, one gentle deepening — turn it into a testable "when… I…".
  const precise = await flow.ask(
    [
      { label: "Oui, préciser", value: "yes", tone: "accent" },
      { label: "Plus tard", value: "no" },
    ],
    { prompt: "Tu veux le rendre concret — « quand… je… » ? Ça aide à s'y retrouver." },
  );
  if (precise === "yes") {
    const raw = await flow.input({
      prompt: <>En une phrase : qu'est-ce que « {thing} » veut dire concrètement pour toi ?</>,
      placeholder: "Ex. quand je rentre le soir, je coupe mon téléphone une heure",
      cta: "Voilà",
    });
    const box: { r: Reformulation | null } = { r: null };
    await flow.widget((done) => (
      <ReformulateInline
        text={raw}
        onDone={(r) => {
          box.r = r;
          done();
        }}
      />
    ));
    if (domainId && box.r) {
      await createIntention(domainId, thing, box.r.situation, box.r.action, "should").catch(() => {});
    } else if (domainId) {
      await createIntention(domainId, thing, null, raw, "should").catch(() => {});
    }
    if (box.r) {
      await flow.say(
        <>
          Quand <b>{box.r.situation}</b>, tu <b>{box.r.action}</b>. C'est posé.
        </>,
      );
    } else {
      await flow.say("Posé, avec tes mots.");
    }
  } else {
    await flow.say("On étoffera petit à petit. Pas besoin de tout poser d'un coup.");
  }
}

async function branchDecision(flow: Flow, reveal: () => Promise<void>) {
  const title = await flow.input({
    prompt: "Dis-moi la décision comme elle vient. Pas besoin de bien la formuler.",
    placeholder: "Ex. Est-ce que je change de job cette année ?",
    multiline: true,
    cta: "Explorer",
  });

  let decisionId: string | null = null;
  try {
    const d = await openDecision(title);
    decisionId = d.id;
  } catch {
    /* the flow still works without a persisted decision */
  }
  await reveal();
  await safetyCheck(flow, title);
  await flow.say("Ok. On respire, et on la prend par petits bouts.");

  // 1) Widen the options — with help, or by hand.
  const help = await flow.ask(
    [
      { label: "Aide-moi à trouver des pistes", value: "ai", tone: "accent" },
      { label: "Je les écris moi-même", value: "self" },
    ],
    { prompt: "Quelles portes s'ouvrent à toi ?" },
  );

  let options: string[] = [];
  if (help === "ai") {
    await flow.widget((done) => (
      <OptionFinder
        context={title}
        onDone={(opts) => {
          options = opts;
          done(opts.length ? undefined : "Rien trouvé — je les écris.");
        }}
      />
    ));
    if (options.length === 0) {
      await flow.say("L'assistant n'a rien sorti. Pas grave, tes mots valent mieux.");
    } else {
      await flow.say("Voilà quelques pistes. Choisis celle que tu veux peser — ou écris la tienne.");
    }
  }

  if (options.length === 0) {
    const own = await flow.input({
      prompt: "Écris une piste que tu envisages.",
      placeholder: "Ex. Rester encore un an et réévaluer",
      cta: "C'est ma piste",
    });
    options = [own];
  }

  const chosen = await flow.ask(
    options.map((o, i) => ({ label: o, value: String(i), tone: i === 0 ? "accent" : "default" })) as any,
  );
  const chosenLabel = options[Number(chosen)] ?? options[0];
  if (decisionId) await decisionAddOption(decisionId, chosenLabel, false).catch(() => {});

  // 2) Does it fit what matters? (only if the compass has something)
  try {
    const domains = await listDomains();
    const lists = await Promise.all(domains.map((d) => listIntentions(d.id)));
    const intentions = lists.flat().map((i) => i.statement).join("; ");
    if (intentions.trim()) {
      const noteBox: { v: string | null } = { v: null };
      await flow.widget((done) => (
        <AlignFinder
          option={chosenLabel}
          intentions={intentions}
          onDone={(n) => {
            noteBox.v = n;
            done();
          }}
        />
      ));
      if (noteBox.v) await flow.say(noteBox.v);
    }
  } catch {
    /* alignment is a bonus */
  }

  // 3) How much do you feel it?
  const conf = await flow.ask(CONFIDENCE, { prompt: "À quel point tu le sens ?" });
  if (decisionId) await decisionSetConfidence(decisionId, Number(conf)).catch(() => {});

  // 4) One tiny first step.
  const stepBox: { value: { title: string; why: string | null } | null } = { value: null };
  await flow.widget((done) => (
    <StepFinder
      context={`${title} — ${chosenLabel}`}
      onDone={(s) => {
        stepBox.value = s;
        done();
      }}
    />
  ));

  let stepTitle = stepBox.value?.title ?? "";
  if (stepTitle) {
    const keep = await flow.ask(
      [
        { label: "Oui, je garde ce pas", value: "yes", tone: "accent" },
        { label: "J'écris le mien", value: "mine" },
      ],
      { prompt: <>Un tout petit pas pour cette semaine : <b>{stepTitle}</b></> },
    );
    if (keep === "mine") stepTitle = "";
  }
  if (!stepTitle) {
    stepTitle = await flow.input({
      prompt: "Quel est le tout premier petit geste, faisable cette semaine ?",
      placeholder: "Ex. Envoyer un message à quelqu'un qui a fait ce choix",
      cta: "C'est mon pas",
    });
  }

  if (decisionId) {
    await decisionAddStory(decisionId, stepTitle, stepBox.value?.why ?? null, null, null).catch(() => {});
    await decisionFinalize(decisionId).catch(() => {});
  }
  await flow.say("C'est noté, avec ton pas. Tu le retrouveras dans ton carnet quand tu voudras faire le point. ✓");
}

// Inline reformulation assist (streams reasoning like the others).
function ReformulateInline({
  text,
  onDone,
}: {
  text: string;
  onDone: (r: Reformulation | null) => void;
}) {
  const reasoning = useReasoningStream();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    reformulateIntention(text)
      .then((r) => onDone(r))
      .catch(() => onDone(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Stack gap="2.5" alignSelf="start" maxW="90%">
      <Box bg="surface" borderWidth="1px" borderColor="border" rounded="l3" borderTopLeftRadius="sm" px="4" py="3">
        <HStack gap="2.5">
          <Spinner size="sm" color="accent" />
          <Text fontSize="sm" color="fg.muted">
            Je le mets en mots clairs…
          </Text>
        </HStack>
      </Box>
      <ReasoningPanel stream={reasoning} />
    </Stack>
  );
}
