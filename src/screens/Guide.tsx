import { Box, Text } from "@chakra-ui/react";
import {
  captureAdd,
  createDomain,
  decisionAddOption,
  decisionAddStory,
  decisionFinalize,
  decisionSetConfidence,
  listDomains,
  listIntentions,
  openDecision,
  setOnboarded,
} from "../lib/ipc";
import { Conversation } from "../guide/chat";
import { useFlow, type Flow } from "../guide/flow";
import { AlignFinder, OptionFinder, StepFinder } from "../guide/assists";

// The home IS the conversation. First run has no wizard: one warm line, then a
// single choice. Each branch does the smallest useful thing and hands back the
// wheel. The user's world (nav) is revealed by `onReveal` after the first act.

const CONFIDENCE = [
  { label: "Très incertain", value: "20" },
  { label: "Hésitant", value: "40" },
  { label: "Plutôt sûr", value: "60" },
  { label: "Confiant", value: "80" },
  { label: "Décidé", value: "100" },
];

export function Guide({ onboarded, onReveal }: { onboarded: boolean; onReveal: () => void }) {
  const turns = useFlow((flow) => script(flow, onboarded, onReveal));
  return (
    <Box maxW="2xl" mx="auto" w="full" pt={{ base: "4", md: "10" }}>
      <Conversation turns={turns} />
    </Box>
  );
}

async function script(flow: Flow, onboarded: boolean, onReveal: () => void) {
  let revealed = onboarded;
  const reveal = async () => {
    if (revealed) return;
    revealed = true;
    await setOnboarded().catch(() => {});
    onReveal();
  };

  if (!onboarded) {
    await flow.say("Salut 👋");
    await flow.say("Je suis là pour t'aider à voir clair dans ce qui compte — tranquillement, à ton rythme.");
    await flow.say("Tout reste ici, sur ta machine. Rien ne part ailleurs.");
  }

  let first = true;
  // The loop: one thing at a time, always a way back to this menu.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const choice = await flow.ask(
      [
        {
          label: "Une décision me trotte",
          value: "decision",
          hint: "on la regarde ensemble",
          tone: "accent",
        },
        { label: "Poser ce qui compte pour moi", value: "compass", hint: "une chose, pour commencer" },
        { label: "Juste noter une pensée", value: "note", hint: "ça reste ici, chiffré" },
      ],
      { prompt: first ? "On commence par quoi ?" : "Et maintenant ?" },
    );
    first = false;

    if (choice === "note") await branchNote(flow, reveal);
    else if (choice === "compass") await branchCompass(flow, reveal);
    else await branchDecision(flow, reveal);

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
}

async function branchCompass(flow: Flow, reveal: () => Promise<void>) {
  const thing = await flow.input({
    prompt: "Cite UNE chose qui compte pour toi, là, maintenant. Rien de plus.",
    placeholder: "Ex. ma santé · mes proches · apprendre · le temps pour moi",
    cta: "Noter",
  });
  await createDomain(thing).catch(() => {});
  await reveal();
  await flow.say(
    <>
      Noté. <b>{thing}</b> compte pour toi.
    </>,
  );
  await flow.say("On étoffera petit à petit. Pas besoin de tout poser d'un coup.");
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
      let note: string | null = null;
      await flow.widget((done) => (
        <AlignFinder
          option={chosenLabel}
          intentions={intentions}
          onDone={(n) => {
            note = n;
            done();
          }}
        />
      ));
      if (note) await flow.say(note);
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
  await flow.say(
    <Text as="span">
      C'est noté, avec ton pas. Tu le retrouveras dans ton carnet quand tu voudras faire le point. ✓
    </Text>,
  );
}
