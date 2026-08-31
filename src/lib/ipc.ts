import { invoke } from "@tauri-apps/api/core";

// Typed wrappers over Tauri commands. The front never touches the DB directly;
// everything goes through the Rust backend.

export interface Health {
  ok: boolean;
  detail: string;
}

export type UiMode = "human" | "expert";

export function dbHealth(): Promise<Health> {
  return invoke<Health>("db_health");
}

export function aiHealth(): Promise<Health> {
  return invoke<Health>("ai_health");
}

export function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

export function setSetting(key: string, value: string): Promise<void> {
  return invoke<void>("set_setting", { key, value });
}

const MODE_KEY = "ui_mode";

export async function getMode(): Promise<UiMode> {
  const v = await getSetting(MODE_KEY);
  return v === "expert" ? "expert" : "human";
}

export async function setMode(mode: UiMode): Promise<void> {
  await setSetting(MODE_KEY, mode);
}

// --- Compass --------------------------------------------------------------

export type Priority = "must" | "should" | "may";

export interface Domain {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Intention {
  id: string;
  domain_id: string;
  statement: string;
  situation: string | null;
  action: string | null;
  priority: Priority;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Reformulation {
  statement: string | null;
  situation: string;
  action: string;
}

// Backend error shape (Result<_, ApiError>): `code` lets the UI branch.
export interface ApiError {
  code: string;
  message: string;
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "code" in e && "message" in e;
}

// Human façade for priorities — never show the engine terms in human mode.
export const PRIORITY_LABELS: Record<Priority, string> = {
  must: "ligne rouge",
  should: "j'aimerais",
  may: "bonus",
};

export const listDomains = () => invoke<Domain[]>("list_domains");
export const createDomain = (name: string) => invoke<Domain>("create_domain", { name });
export const renameDomain = (id: string, name: string) =>
  invoke<void>("rename_domain", { id, name });
export const archiveDomain = (id: string) => invoke<void>("archive_domain", { id });

export const listIntentions = (domainId: string) =>
  invoke<Intention[]>("list_intentions", { domainId });
export const createIntention = (
  domainId: string,
  statement: string,
  situation: string | null,
  action: string | null,
  priority: Priority,
) => invoke<Intention>("create_intention", { domainId, statement, situation, action, priority });
export const updateIntention = (
  id: string,
  statement: string,
  situation: string | null,
  action: string | null,
) => invoke<void>("update_intention", { id, statement, situation, action });
export const setIntentionPriority = (id: string, priority: Priority) =>
  invoke<void>("set_intention_priority", { id, priority });
export const archiveIntention = (id: string) => invoke<void>("archive_intention", { id });
export const reformulateIntention = (text: string) =>
  invoke<Reformulation>("reformulate_intention", { text });

// --- Guided decision ------------------------------------------------------

export interface DecisionFull {
  id: string;
  title: string;
  proposal: string | null;
  strategy: string | null;
  status: string;
  confidence: number | null;
  values_alignment_note: string | null;
  distance_10_10_10: string | null;
  review_at: string | null;
  emotional_context: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecisionOption {
  id: string;
  decision_id: string;
  label: string;
  is_null_option: boolean;
  premortem: string | null;
  chosen: boolean;
}

export interface DeltaRow {
  id: string;
  decision_id: string;
  op: string;
  target_intention_id: string | null;
  domain_id: string | null;
  payload_statement: string | null;
  payload_situation: string | null;
  payload_action: string | null;
  payload_priority: string | null;
  applied_at: string | null;
}

export interface StoryRow {
  id: string;
  decision_id: string | null;
  title: string;
  why: string | null;
  when_cue: string | null;
  done_when: string | null;
  status: string;
}

export interface DecisionDetail {
  decision: DecisionFull;
  options: DecisionOption[];
  deltas: DeltaRow[];
  stories: StoryRow[];
}

export interface DeltaInput {
  op: "added" | "modified" | "removed";
  target_intention_id?: string | null;
  domain_id?: string | null;
  payload_statement?: string | null;
  payload_situation?: string | null;
  payload_action?: string | null;
  payload_priority?: Priority | null;
}

export interface Decision {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const openDecision = (title: string) => invoke<DecisionFull>("open_decision", { title });
export const decisionSetReality = (id: string, text: string) =>
  invoke<void>("decision_set_reality", { id, text });
export const decisionSetDistance = (id: string, text: string) =>
  invoke<void>("decision_set_distance", { id, text });
export const decisionSetAlignment = (id: string, note: string) =>
  invoke<void>("decision_set_alignment", { id, note });
export const decisionSetWhy = (id: string, text: string) =>
  invoke<void>("decision_set_why", { id, text });
export const decisionSetConfidence = (id: string, confidence: number) =>
  invoke<void>("decision_set_confidence", { id, confidence });
export const decisionSetReviewAt = (id: string, date: string) =>
  invoke<void>("decision_set_review_at", { id, date });

export const decisionAddOption = (decisionId: string, label: string, isNullOption: boolean) =>
  invoke<DecisionOption>("decision_add_option", { decisionId, label, isNullOption });
export const decisionSetPremortem = (optionId: string, text: string) =>
  invoke<void>("decision_set_premortem", { optionId, text });
export const decisionChooseOption = (decisionId: string, optionId: string) =>
  invoke<void>("decision_choose_option", { decisionId, optionId });
export const decisionListOptions = (decisionId: string) =>
  invoke<DecisionOption[]>("decision_list_options", { decisionId });

export const decisionAddDelta = (decisionId: string, delta: DeltaInput) =>
  invoke<DeltaRow>("decision_add_delta", { decisionId, delta });
export const decisionAddStory = (
  decisionId: string,
  title: string,
  why: string | null,
  whenCue: string | null,
  doneWhen: string | null,
) => invoke<StoryRow>("decision_add_story", { decisionId, title, why, whenCue, doneWhen });

export const decisionDetail = (id: string) => invoke<DecisionDetail>("decision_detail", { id });
export const decisionFinalize = (id: string) => invoke<DecisionFull>("decision_finalize", { id });
export const listDecisions = () => invoke<Decision[]>("list_decisions");

export interface OptionSuggestions {
  options: string[];
}
export interface AlignmentNote {
  note: string;
}
export interface StorySuggestion {
  title: string;
  why: string | null;
  when_cue: string | null;
  done_when: string | null;
}

export const decisionSuggestOptions = (context: string) =>
  invoke<OptionSuggestions>("decision_suggest_options", { context });
export const decisionAlignValues = (option: string, intentions: string) =>
  invoke<AlignmentNote>("decision_align_values", { option, intentions });
export const decisionGenerateStory = (context: string) =>
  invoke<StorySuggestion>("decision_generate_story", { context });
