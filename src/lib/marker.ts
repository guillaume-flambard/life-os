// Compose a testable marker from its parts. The compass form asks the user to
// complete "quand …" and "je …", but people often re-type the leading word;
// strip it so templates never double it ("je je décroche", "Quand quand …").

function stripLead(text: string, leads: string[]): string {
  const t = text.trim();
  for (const lead of leads) {
    if (t.toLowerCase().startsWith(lead)) return t.slice(lead.length).trimStart();
  }
  return t;
}

export function cleanSituation(s: string): string {
  return stripLead(s, ["quand ", "lorsque ", "lorsqu'", "quand qu'"]);
}

export function cleanAction(a: string): string {
  return stripLead(a, ["je ", "j'", "je’"]);
}
