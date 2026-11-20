// Quick search over the lists already loaded in the browser (G10).

export type SearchKind = "deal" | "contact" | "organization";
export type SearchItem = { kind: SearchKind; id: number; name: string; detail?: string | null };
export type SearchGroup = { kind: SearchKind; label: string; items: SearchItem[] };

export const MAX_RESULTS = 8;
const LABELS: Record<SearchKind, string> = { deal: "Deals", contact: "Contacts", organization: "Organizations" };
const ORDER: SearchKind[] = ["deal", "contact", "organization"];

/**
 * Up to 8 matches by name, ignoring case, grouped by type. Names that start with the
 * query come first; each type gets a fair share before any type gets more.
 */
export function quickSearch(query: string, items: SearchItem[]): SearchGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byKind = new Map<SearchKind, SearchItem[]>(ORDER.map((k) => [k, []]));
  for (const item of items) {
    const name = item.name.toLowerCase();
    if (name.includes(q)) byKind.get(item.kind)!.push(item);
  }
  for (const list of byKind.values()) {
    list.sort((a, b) => {
      const pa = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const pb = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return pa - pb || a.name.localeCompare(b.name);
    });
  }
  // Take one from each type in turn until 8 are chosen.
  const chosen = new Map<SearchKind, SearchItem[]>(ORDER.map((k) => [k, []]));
  let total = 0;
  for (let round = 0; total < MAX_RESULTS; round++) {
    let added = false;
    for (const kind of ORDER) {
      const next = byKind.get(kind)![round];
      if (next && total < MAX_RESULTS) {
        chosen.get(kind)!.push(next);
        total++;
        added = true;
      }
    }
    if (!added) break;
  }
  return ORDER.filter((k) => chosen.get(k)!.length).map((k) => ({ kind: k, label: LABELS[k], items: chosen.get(k)! }));
}
