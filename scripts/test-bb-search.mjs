import { readFileSync } from "fs";

const window = {};
eval(readFileSync(new URL("../bb-data.js", import.meta.url), "utf8"));
eval(readFileSync(new URL("../bb-ui.js", import.meta.url), "utf8"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = readFileSync(new URL("../cl-build/app.tsx", import.meta.url), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const before = JSON.stringify(window.BBDATA);
for (const q of ["valcambi", "pamp", "geiger"]) {
  const hits = window.bbSearch(q);
  assert(hits.length >= 1, q + " returned no branded bullion");
  assert(hits.every((h) => h.meta.toLowerCase().includes(q)), q + " hit is not that maker");
}
const gold = window.bbSearch("valcambi gold");
assert(gold.length >= 1 && gold.every((h) => h.meta.startsWith("Valcambi · gold")), "valcambi gold");
for (const q of ["lady fortuna", "combibar", "rosa", "security line"]) {
  const hits = window.bbSearch(q);
  assert(hits.length >= 1, q + " returned nothing");
  const bad = hits.find((h) => !(h.title + " " + h.meta).toLowerCase().includes(q));
  assert(!bad, q + " mismatched " + (bad && bad.title));
}
assert(window.bbSearch("rosa").every((h) => /rosa/i.test(h.title)), "rosa matched a non-rosa title");
function weightOf(h) { return h.meta.split(" · ")[2]; }
for (const q of ["1 g", "1 gram"]) {
  const hits = window.bbSearch(q);
  assert(hits.length >= 1, q);
  assert(hits.every((h) => weightOf(h) === "1 gram" || weightOf(h) === "1 g"), q + " included " + hits.map(weightOf).filter((w) => w !== "1 gram" && w !== "1 g").slice(0, 3).join(","));
}
for (const q of ["0.5 g", "1/2 g", "half gram"]) {
  const hits = window.bbSearch(q);
  assert(hits.length >= 1, q);
  assert(hits.every((h) => weightOf(h) === "1/2 gram" || weightOf(h) === "0.5 g"), q + " included " + hits.map(weightOf).join(","));
}
assert(window.bbSearch("valcambi").some((h) => h.view === "asks" && h.meta.includes("Dealer ask")), "asks not labeled");
assert(JSON.stringify(window.BBDATA) === before || window.BBDATA.lines[0].quotes[0].ask === 193.22, "price data changed");
const v1 = window.BBDATA.lines.find((l) => l.id === "valcambi-au-1g");
assert(v1.quotes[0].ask === 158.09 && v1.quotes[1].ask === 153.92, "valcambi 1g asks changed");
assert(src.includes("dimes/mercury|1936 P|Proof"), "cl-build/app.tsx missing dimes/mercury|1936 P|Proof");
assert(src.includes("dimes/mercury|1938 P|Proof") && src.includes("dimes/mercury|1942 P|Proof"), "mercury 1938/1942 notes missing");
assert(src.includes("Proof rows (1936–42, Philadelphia, no mint mark)"), "mercury proof flag missing");
assert(src.includes('["1936 P", "Proof", "4,130"') && src.includes('["1942 P", "Proof", "22,329"'), "mercury proof rows missing");
assert(html.includes("dimes/mercury|1936 P|Proof") && html.includes('["1936 P","Proof","4,130"'), "index missing v65 mercury proof content");
assert(src.includes("window as any).bbSearch") && html.includes("window.bbSearch"), "search not wired");
assert(src.includes("__bbFocus") && html.includes("__bbFocus"), "result does not open the row");
assert(/[A-Za-z_$]{1,3}="v68"/.test(html) && src.includes('APP_VER = "v68"'), "version");
console.log("branded search checks passed", window.bbSearch("valcambi").length, "valcambi");
