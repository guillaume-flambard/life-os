import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import {
  applyDecision,
  capturesRecent,
  captureAdd,
  createDomain,
  createIntention,
  decisionAddOption,
  decisionAddStory,
  decisionChooseOption,
  decisionDetail,
  decisionFinalize,
  decisionSetAlignment,
  decisionSetConfidence,
  decisionSetDistance,
  decisionSetPremortem,
  decisionSetWhy,
  listDecisions,
  listDomains,
  listIntentions,
  listOpenStories,
  listProposedDecisions,
  openDecision,
  reformulateIntention,
  safetyScreen,
  setOnboarded,
  setStoryStatus,
  type DecisionFull,
  type OpenStory,
  type Reformulation,
} from "../lib/ipc";
import { Conversation } from "../guide/chat";
import { useFlow, type Flow } from "../guide/flow";
import { AlignFinder, OptionFinder, StepFinder } from "../guide/assists";
import { useReasoningStream } from "../lib/reasoning";
import { ReasoningPanel } from "../ui/Reasoning";
import { MotionBox } from "../ui/motion";
import { humanError } from "../ui/states";
import { navigate } from "../ui/router";
import { t } from "../i18n";

// The home IS the conversation. First run has no wizard: one warm line, then a
// single choice. Each branch does the smallest useful thing and hands back the
// wheel. The world (nav) is revealed after the first act, and the menu of what
// the user can do grows as their world fills — held by the hand, step by step.

const CONFIDENCE = [
  { label: "Very unsure", value: "20" },
  { label: "Hesitant", value: "40" },
  { label: "Fairly sure", value: "60" },
  { label: "Confident", value: "80" },
  { label: "Decided", value: "100" },
];

interface World {
  decisions: number;
  notes: number;
  domains: number;
  openStories: OpenStory[];
  proposed: DecisionFull[];
}

async function snapshot(): Promise<World> {
  const empty: World = { decisions: 0, notes: 0, domains: 0, openStories: [], proposed: [] };
  try {
    const [decisions, notes, domains, openStories, proposed] = await Promise.all([
      listDecisions().catch(() => []),
      capturesRecent(1).catch(() => []),
      listDomains().catch(() => []),
      listOpenStories().catch(() => []),
      listProposedDecisions().catch(() => []),
    ]);
    return {
      decisions: decisions.length,
      notes: notes.length,
      domains: domains.length,
      openStories,
      proposed,
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
        { name: "3114 — suicide prevention (France)", contact: "3114" },
        { name: "findahelpline.com — worldwide directory", contact: "findahelpline.com" },
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
          {t("I'm not a caregiver — but talking to someone can help, right now.")}
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
        { label: t("See the resources"), value: "yes", tone: "accent" },
        { label: t("I'm okay, let's continue"), value: "no" },
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
    await flow.say(t("Hi 👋"));
    await flow.say(t("I'm here to help you see what matters clearly — quietly, at your pace."));
    await flow.say(t("Everything stays on your machine. Nothing goes anywhere."));
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
      prompt: first ? (onboarded ? t("What brings you here?") : t("Where do we start?")) : t("And now?"),
    });
    first = false;

    if (choice === "note") await branchNote(flow, reveal);
    else if (choice === "compass") await branchCompass(flow, reveal);
    else if (choice === "decision") await branchDecision(flow, reveal);
    else if (choice === "step") await pickStep(flow, world.openStories);
    else if (choice === "review") await branchReview(flow, world);
    else if (choice === "carnet") return navigate("carnet");

    Object.assign(world, await snapshot());

    const again = await flow.ask([
      { label: t("One more thing"), value: "again", tone: "accent" },
      { label: t("That's all for now"), value: "stop" },
    ]);
    if (again === "stop") {
      await flow.say(t("Whenever you're ready. I'm here."));
      return;
    }
  }
}

function welcomeBack(w: World): string {
  if (w.decisions === 0 && w.notes === 0) return t("Hey again. We pick up wherever you like.");
  const bits: string[] = [];
  if (w.decisions) bits.push(w.decisions === 1 ? t("1 decision") : `${w.decisions} ${t("decisions")}`);
  if (w.domains) bits.push(w.domains === 1 ? t("1 life area") : `${w.domains} ${t("life areas")}`);
  return bits.length
    ? `${t("Good to see you. You have")} ${bits.join(` ${t("and")} `)}.`
    : t("Good to see you.");
}

function menuFor(w: World, first: boolean): { label: string; value: string; hint?: string; tone?: "default" | "accent" }[] {
  const opts: { label: string; value: string; hint?: string; tone?: "default" | "accent" }[] = [
    { label: t("A decision is on my mind"), value: "decision", hint: t("let's look at it together"), tone: "accent" },
    { label: t("Name what matters to me"), value: "compass", hint: t("one thing, to start") },
    { label: t("Just jot down a thought"), value: "note", hint: t("it stays here, encrypted") },
  ];
  // The field grows with the world.
  if (first && w.openStories.length > 0) {
    opts.push({ label: t("Pick up a small step"), value: "step", hint: `${w.openStories.length} ${t("waiting")}` });
  }
  if (w.proposed.length > 0) {
    opts.push({ label: t("Do a check-in"), value: "review", hint: `${w.proposed.length} ${t("to integrate")}` });
  }
  if (w.decisions > 0) {
    opts.push({ label: t("Open my notebook"), value: "carnet", hint: t("your decisions") });
  }
  return opts;
}

// The check-in, in-thread: integrate a ready decision into the compass, or
// simply write down what this week taught you.
async function branchReview(flow: Flow, world: World) {
  const proposed = world.proposed;
  if (proposed.length === 0) {
    const note = await flow.input({
      prompt: t("Checking in is looking — not judging. What are you taking away from this week?"),
      placeholder: t("What moved, what you learned…"),
      multiline: true,
      cta: t("Keep"),
    });
    try {
      await captureAdd(note, "reflection");
      await flow.say(t("Kept. That's already one step back."));
    } catch (e) {
      await flow.say(`${t("I couldn't keep it")}: ${humanError(e)}. ${t("We'll try again.")}`);
    }
    return;
  }

  const d = proposed[0];
  await flow.say(
    <Stack gap="1">
      <Text>{t("One decision is ready to join your compass:")}</Text>
      <Text fontWeight="semibold">{d.title}</Text>
    </Stack>,
  );
  if (d.values_alignment_note) await flow.say(d.values_alignment_note);

  const ans = await flow.ask([
    { label: t("Integrate into my compass"), value: "apply", tone: "accent" },
    { label: t("Later"), value: "later" },
  ]);
  if (ans !== "apply") {
    await flow.say(t("Okay, it will wait. No pressure."));
    return;
  }
  try {
    const detail = await decisionDetail(d.id);
    const resolutions = detail.deltas.map((dl) => ({
      delta_id: dl.id,
      domain_id: dl.domain_id,
      target_intention_id: dl.target_intention_id,
    }));
    await applyDecision(d.id, resolutions);
    await flow.say(t("Integrated. Your compass moved a little. 🧭"));
  } catch (e) {
    await flow.say(t("I couldn't integrate it this time. We'll try again."));
    void e;
  }
}

// --- Follow-through: tick a pending small step ------------------------------
async function pickStep(flow: Flow, stories: OpenStory[]): Promise<boolean> {
  if (stories.length === 0) return false;
  const s = stories[0];
  const ans = await flow.ask(
    [
      { label: t("Done ✓"), value: "done", tone: "accent" },
      { label: t("Not yet"), value: "later" },
      { label: t("Let it go"), value: "drop" },
    ],
    {
      prompt: (
        <Stack gap="1">
          <Text>{t("A small step is waiting:")}</Text>
          <Text fontWeight="semibold">{s.title}</Text>
          {s.decision_title && (
            <Text fontSize="sm" color="fg.muted">
              {t("for")} \u201c{s.decision_title}\u201d
            </Text>
          )}
        </Stack>
      ),
    },
  );
  if (ans === "done") {
    try {
      await setStoryStatus(s.id, "done");
      await flow.say(t("Well done. A step is a step. 🌱"));
      return true;
    } catch (e) {
      await flow.say(`${t("I couldn't record it")}: ${humanError(e)}. ${t("No worries, it'll wait.")}`);
      return false;
    }
  }
  if (ans === "drop") {
    try {
      await setStoryStatus(s.id, "dropped");
      await flow.say(t("Set aside. No worries."));
      return true;
    } catch (e) {
      await flow.say(`${t("I couldn't set it aside")}: ${humanError(e)}.`);
      return false;
    }
  }
  await flow.say(t("Okay, it'll wait. No pressure."));
  return false;
}

async function branchNote(flow: Flow, reveal: () => Promise<void>) {
  const txt = await flow.input({
    prompt: t("Go ahead, write. Whatever's on your mind."),
    placeholder: t("A thought, a feeling, something you don't want to forget…"),
    multiline: true,
    cta: t("Keep"),
  });
  await reveal();
  try {
    await captureAdd(txt);
    await flow.say(t("Kept. For your eyes only."));
  } catch (e) {
    await flow.say(`${t("I couldn't save it")}: ${humanError(e)}. ${t("Hold onto it, we'll try again.")}`);
  }
  await safetyCheck(flow, txt);
}

async function branchCompass(flow: Flow, reveal: () => Promise<void>) {
  const thing = await flow.input({
    prompt: t("Name ONE thing that matters to you, right now. Nothing more."),
    placeholder: t("e.g. my health · my people · learning · time for myself"),
    cta: t("Save"),
  });
  let domainId: string | null = null;
  let problem: string | null = null;
  try {
    const d = await createDomain(thing);
    domainId = d.id;
  } catch (e) {
    problem = humanError(e);
  }
  await reveal();
  if (!domainId) {
    await flow.say(
      `${t("I couldn't save")} \u201c${thing}\u201d : ${problem}. ${t("We'll keep going anyway — you can retry from your compass.")}`,
    );
    return;
  }
  await flow.say(
    <>
      {t("Noted.")} <b>{thing}</b> {t("matters to you.")}
    </>,
  );

  // Optional, one gentle deepening — turn it into a testable "when… I…".
  const precise = await flow.ask(
    [
      { label: t("Yes, make it concrete"), value: "yes", tone: "accent" },
      { label: t("Later"), value: "no" },
    ],
    { prompt: t("Want to make it concrete — a when… I… pattern? It helps you find your way back.") },
  );
  if (precise === "yes") {
    const raw = await flow.input({
      prompt: (
        <>
          {t("In one sentence: what does")} \u201c{thing}\u201d {t("mean, concretely, for you?")}
        </>
      ),
      placeholder: t("e.g. when I get home in the evening, I put my phone away for an hour"),
      cta: t("There"),
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
      try {
        await createIntention(domainId, thing, box.r.situation, box.r.action, "should");
      } catch (e) {
        await flow.say(`${t("I couldn't place it on your compass")}: ${humanError(e)}.`);
        return;
      }
    } else if (domainId) {
      try {
        await createIntention(domainId, thing, null, raw, "should");
      } catch (e) {
        await flow.say(`${t("I couldn't place it on your compass")}: ${humanError(e)}.`);
        return;
      }
    }
    if (box.r) {
      await flow.say(
        <>
          {t("When")} <b>{box.r.situation}</b>, {t("you")} <b>{box.r.action}</b>. {t("It's set.")}
        </>,
      );
    } else {
      await flow.say(t("Set down, in your words."));
    }
  } else {
    await flow.say(t("We'll build it up bit by bit. No need to set everything at once."));
  }
}

async function branchDecision(flow: Flow, reveal: () => Promise<void>) {
  const title = await flow.input({
    prompt: t("Tell me the decision as it comes. It doesn't need to be well phrased."),
    placeholder: t("e.g. Should I change jobs this year?"),
    multiline: true,
    cta: t("Explore"),
  });

  let decisionId: string | null = null;
  try {
    decisionId = (await openDecision(title)).id;
  } catch (e) {
    await flow.say(`${t("I couldn't open that decision")}: ${humanError(e)}. ${t("We can try again later.")}`);
    return;
  }
  if (!decisionId) return;
  await reveal();
  await safetyCheck(flow, title);
  await flow.say(t("Okay. Let's breathe, and take it in small bites."));

  // 1) Widen the doors — at least two real ones, plus an explicit "none of these".
  let real: string[] = [];
  await flow.widget((done) => (
    <OptionFinder
      context={title}
      onDone={(opts) => {
        real = opts.filter((o) => o && o.trim()).slice(0, 5);
        done();
      }}
    />
  ));
  if (real.length === 0) {
    await flow.say(t("The assistant came up empty. No matter — your words are better. Give me one path."));
  } else {
    await flow.say(t("Here are a few doors that could open."));
  }
  while (real.length < 2) {
    const own = await flow.input({
      prompt:
        real.length === 0
          ? t("Write one path you're considering.")
          : t("One more path, so no doors close:"),
      placeholder: t("e.g. Stay one more year and reassess"),
      cta: t("Add"),
    });
    if (own.trim()) real.push(own.trim());
  }

  type Opt = { id: string; label: string; isNull: boolean };
  const opts: Opt[] = [];
  for (const label of real) {
    try {
      const o = await decisionAddOption(decisionId, label, false);
      opts.push({ id: o.id, label: o.label, isNull: false });
    } catch (e) {
      await flow.say(`${t("I couldn't keep")} \u201c${label}\u201d : ${humanError(e)}.`);
    }
  }
  try {
    const n = await decisionAddOption(decisionId, t("None of these — I keep my options open"), true);
    opts.push({ id: n.id, label: n.label, isNull: true });
  } catch (e) {
    await flow.say(`${t("I couldn't add the \"none of these\" option")}: ${humanError(e)}.`);
  }
  if (opts.length < 3) {
    await flow.say(t("I need at least two paths and one way out to move forward. Try again from your notebook."));
    return;
  }

  // 2) Weigh one of them.
  const pick = await flow.ask(
    opts.map((o, i) => ({
      label: o.label,
      value: String(i),
      tone: !o.isNull && i === 0 ? "accent" : "default",
    })) as any,
    { prompt: t("Which one do you want to weigh today?") },
  );
  const chosen = opts[Number(pick)] ?? opts[0];
  try {
    await decisionChooseOption(decisionId, chosen.id);
  } catch (e) {
    await flow.say(`${t("I couldn't hold onto it")}: ${humanError(e)}.`);
    return;
  }

  // 3) Debias — a pre-mortem, a little distance, and what really counts.
  const premortem = await flow.input({
    prompt: (
      <>
        {t("Let's weigh it. Imagine: a year from now")} <b>{chosen.label}</b> {t("has failed. What went wrong?")}
      </>
    ),
    placeholder: t("e.g. I underestimated the load, and I isolated myself"),
    cta: t("There"),
  });
  try {
    await decisionSetPremortem(chosen.id, premortem);
  } catch (e) {
    await flow.say(`${t("I couldn't write that down")}: ${humanError(e)}.`);
  }

  const distance = await flow.input({
    prompt: t("And with some distance — in 10 minutes, 10 months, 10 years, how will you see this choice?"),
    placeholder: t("e.g. 10 min: relieved. 10 months: unsure. 10 years: I'll know."),
    multiline: true,
    cta: "Ok",
  });
  try {
    await decisionSetDistance(decisionId, distance);
  } catch (e) {
    await flow.say(`${t("I couldn't keep it")}: ${humanError(e)}.`);
  }

  const why = await flow.input({
    prompt: t("Deep down, what really counts for you here?"),
    placeholder: t("e.g. My health, and not being bored"),
    cta: t("That's it"),
  });
  try {
    await decisionSetWhy(decisionId, why);
  } catch (e) {
    await flow.say(`${t("I couldn't note it")}: ${humanError(e)}.`);
  }

  // 4) Does it fit what matters? (only if the compass has something)
  try {
    const domains = await listDomains();
    const lists = await Promise.all(domains.map((d) => listIntentions(d.id)));
    const intentions = lists.flat().map((i) => i.statement).join("; ");
    if (intentions.trim()) {
      const noteBox: { v: string | null } = { v: null };
      await flow.widget((done) => (
        <AlignFinder
          option={chosen.label}
          intentions={intentions}
          onDone={(n) => {
            noteBox.v = n;
            done();
          }}
        />
      ));
      if (noteBox.v) {
        await flow.say(noteBox.v);
        try {
          await decisionSetAlignment(decisionId, noteBox.v);
        } catch {
          /* alignment is a bonus */
        }
      }
    }
  } catch {
    /* alignment is a bonus */
  }

  // 5) How much do you feel it?
  const conf = await flow.ask(CONFIDENCE, { prompt: t("How much do you feel it?") });
  try {
    await decisionSetConfidence(decisionId, Number(conf));
  } catch (e) {
    await flow.say(`${t("I couldn't hold onto your confidence")}: ${humanError(e)}.`);
  }

  // 6) One tiny first step.
  const stepBox: { value: { title: string; why: string | null } | null } = { value: null };
  await flow.widget((done) => (
    <StepFinder
      context={`${title} — ${chosen.label}`}
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
        { label: t("Yes, I'll keep this step"), value: "yes", tone: "accent" },
        { label: t("I'll write my own"), value: "mine" },
      ],
      { prompt: <>A very small step for this week: <b>{stepTitle}</b></> },
    );
    if (keep === "mine") stepTitle = "";
  }
  if (!stepTitle) {
    stepTitle = await flow.input({
      prompt: t("What's the very first small gesture, doable this week?"),
      placeholder: t("e.g. Message someone who has made this choice"),
      cta: t("That's my step"),
    });
  }

  try {
    await decisionAddStory(decisionId, stepTitle, stepBox.value?.why ?? null, null, null);
  } catch (e) {
    await flow.say(
      `${t("I couldn't save your step")}: ${humanError(e)}. ${t("We'll note it from your notebook.")}`,
    );
    return;
  }
  try {
    await decisionFinalize(decisionId);
  } catch (e) {
    await flow.say(
      `${t("Your step is kept, but I couldn't close the decision")}: ${humanError(e)}. ${t("We'll finish it from your notebook.")}`,
    );
    return;
  }
  await flow.say(
    t("It's set down, properly. You'll find it in your notebook whenever you want to check in. ✓"),
  );
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
  const warming = reasoning.phase === "idle" && !reasoning.text;
  if (warming) {
    return (
      <Box alignSelf="stretch">
        <HStack gap="2.5" py="1">
          <MotionBox
            as="span"
            color="fg.subtle"
            display="inline-flex"
            animate={{ opacity: [0.55, 1, 0.55], scale: [0.92, 1, 0.92] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />
            </svg>
          </MotionBox>
          <Text fontSize="sm" color="fg.muted">
            {t("Putting it into clear words…")}
          </Text>
        </HStack>
      </Box>
    );
  }
  return <ReasoningPanel stream={reasoning} />;
}
