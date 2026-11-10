/** Format stored instants in the viewer's local time zone (device/browser default). */

const ZONE_OFFSET: Record<string, string> = {
  HST: "-10:00",
  HDT: "-09:00",
  PST: "-08:00",
  PDT: "-07:00",
  MST: "-07:00",
  MDT: "-06:00",
  CST: "-06:00",
  CDT: "-05:00",
  EST: "-05:00",
  EDT: "-04:00",
  GMT: "+00:00",
  UTC: "+00:00",
};

const pad = (n: string | number) => String(n).padStart(2, "0");

/** Collapse ICU narrow/nbsp spaces so labels are stable in the UI and in tests. */
export const tidy = (s: string) => s.replace(/[\u202F\u00A0\u2009]/g, " ");

const dateOnlyRe = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(s: string): boolean {
  return dateOnlyRe.test(String(s).trim());
}

export function parseInstant(input: Date | number | string): number {
  if (input instanceof Date) return input.getTime();
  if (typeof input === "number") return Number(input);
  const s = String(input).trim();
  let m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}:\d{2})$/);
  if (m) return Date.parse(s);
  m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*([A-Z]{2,4})$/i);
  if (m && ZONE_OFFSET[m[2].toUpperCase()]) return Date.parse(m[1] + ZONE_OFFSET[m[2].toUpperCase()]);
  m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?\s*([A-Z]{2,4})$/i);
  if (m && ZONE_OFFSET[m[6].toUpperCase()]) {
    const frac = m[5] ? "." + m[5] : "";
    return Date.parse(`${m[1]}T${pad(m[2])}:${m[3]}:${m[4] || "00"}${frac}${ZONE_OFFSET[m[6].toUpperCase()]}`);
  }
  const n = Date.parse(s);
  return n;
}

export type FmtKind = "datetime" | "datetimeYear" | "time" | "date";

function opts(kind: FmtKind): Intl.DateTimeFormatOptions {
  if (kind === "time") return { hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  if (kind === "date") return { month: "short", day: "numeric", year: "numeric", timeZoneName: "short" };
  if (kind === "datetimeYear") return { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
  return { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" };
}

/** Format an instant in the viewer's zone, e.g. "Nov 10, 6:46 AM PST". Date-only Y-M-D stays a calendar date (no shift, no zone). */
export function fmtLocal(when: Date | number | string, kind: FmtKind = "datetime", timeZone?: string): string {
  if (typeof when === "string" && isDateOnly(when)) {
    const m = when.trim().match(dateOnlyRe)!;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0));
    return tidy(new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(d));
  }
  const ms = parseInstant(when);
  if (isNaN(ms)) return String(when);
  const fmt: Intl.DateTimeFormatOptions = timeZone ? { ...opts(kind), timeZone } : opts(kind);
  return tidy(new Intl.DateTimeFormat("en-US", fmt).format(new Date(ms)));
}

function zoneOf(label: string): string {
  const m = label.trim().match(/([A-Z]{2,4}|GMT[+-]\d+)$/i);
  return m ? m[1] : "";
}

function stripZone(label: string): string {
  return label.replace(/,?\s*[A-Z]{2,4}$/i, "").replace(/,?\s*GMT[+-]\d+$/i, "").trim();
}

function formatRange(a: number, b: number, timeZone?: string, approx = false): string {
  const fa = fmtLocal(a, "datetimeYear", timeZone);
  const fb = fmtLocal(b, "datetimeYear", timeZone);
  const za = zoneOf(fa);
  const zb = zoneOf(fb);
  const zaOk = za && za === zb;
  const da = stripZone(fa);
  const db = stripZone(fb);
  const pre = approx ? "~" : "";
  // Same calendar date: "Nov 6, 2026, 9:57–10:00 PM PST" when meridiem matches
  const dateOf = (s: string) => (s.match(/^([A-Za-z]+ \d{1,2}, \d{4})/) || [, ""])[1];
  if (zaOk && dateOf(da) && dateOf(da) === dateOf(db)) {
    const ta = da.slice(dateOf(da).length).replace(/^,\s*/, "");
    const tb = db.slice(dateOf(db).length).replace(/^,\s*/, "");
    const ma = (ta.match(/\b(AM|PM)\b/i) || [])[1];
    const mb = (tb.match(/\b(AM|PM)\b/i) || [])[1];
    if (ma && ma.toUpperCase() === (mb || "").toUpperCase()) {
      const start = ta.replace(/\s*(AM|PM)\b/i, "").trim();
      return `${pre}${dateOf(da)}, ${start}–${tb} ${za}`;
    }
    return `${pre}${dateOf(da)}, ${ta}–${tb} ${za}`;
  }
  if (zaOk) return `${pre}${da} – ${db} ${za}`;
  return `${pre}${fa} – ${fb}`;
}

/**
 * Rewrite HST/offset timestamps inside a note or "checked" string into the viewer's local time.
 * Leaves surrounding wording in place.
 */
export function fmtLocalText(s: string, timeZone?: string): string {
  if (s == null || s === "") return s;
  let out = String(s);

  // Already-converted ISO range: ~2026-11-06T21:57:00-10:00/2026-11-06T22:00:00-10:00
  out = out.replace(
    /~?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))\s*\/\s*~?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))/g,
    (all, a, b) => formatRange(Date.parse(a), Date.parse(b), timeZone, all.trim().startsWith("~"))
  );

  // Date + time range with a zone label: 2026-11-06 ~21:57–22:00 HST
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, date, h1, m1, h2, m2, z) => formatRange(parseInstant(`${date} ${h1}:${m1} ${z}`), parseInstant(`${date} ${h2}:${m2} ${z}`), timeZone, true)
  );

  // Approximate single time with a redundant second-zone parenthetical:
  // 2026-11-09 ~23:00 PST (Nov 9, 2026 ~9:00 PM HST)
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b(?:\s*\([^)]*\bHST\b[^)]*\))?/gi,
    (_, date, h, m, z) => "~" + fmtLocal(`${date} ${h}:${m} ${z}`, "datetimeYear", timeZone)
  );

  // ISO instant + zone abbr: 2026-11-06T21:59:24.401253 HST
  out = out.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, iso, z) => fmtLocal(iso + " " + z, "datetimeYear", timeZone)
  );

  // ISO instant with offset or Z
  out = out.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/g,
    (iso) => fmtLocal(iso, "datetimeYear", timeZone)
  );

  // Date + time + zone: 2026-11-06 11:59 HST
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (whole) => fmtLocal(whole, "datetimeYear", timeZone)
  );

  // Date-only labels that were tagged HST: drop the zone, do not shift the calendar date
  out = out.replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4})\s*HST\b/g, "$1");
  out = out.replace(/\b(\d{4}-\d{2}-\d{2})\s*HST\b/g, (_, d) => fmtLocal(d));

  return out;
}

/** Turn a stored HST/PST-labeled stamp into an ISO instant (offset included). Leaves other wording in place. */
export function toIsoInstant(s: string): string {
  if (s == null || s === "") return s;
  let out = String(s);

  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, date, h1, m1, h2, m2, z) => {
      const off = ZONE_OFFSET[z.toUpperCase()];
      return `~${date}T${pad(h1)}:${m1}:00${off}/${date}T${pad(h2)}:${m2}:00${off}`;
    }
  );

  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b(?:\s*\([^)]*\bHST\b[^)]*\))?/gi,
    (_, date, h, m, z) => `~${date}T${pad(h)}:${m}:00${ZONE_OFFSET[z.toUpperCase()]}`
  );

  out = out.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, iso, z) => iso + ZONE_OFFSET[z.toUpperCase()]
  );

  out = out.replace(
    /(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, date, h, m, sec, z) => `${date}T${pad(h)}:${m}:${sec || "00"}${ZONE_OFFSET[z.toUpperCase()]}`
  );

  out = out.replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4})\s*HST\b/g, "$1");
  out = out.replace(/\b(\d{4}-\d{2}-\d{2})\s*HST\b/g, "$1");
  out = out.replace(/\s*\bHST\b/g, "");
  return out;
}
