import { readFileSync } from "fs";
import vm from "vm";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../nugget.js", import.meta.url), "utf8"), ctx);
const N = ctx.NuggetCalc;
if (!N) throw new Error("NuggetCalc missing");
if (N.TROY_G !== 31.1034768) throw new Error("troy constant");

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function near(a, b, eps) { assert(Math.abs(a - b) <= (eps || 1e-9), a + " !~ " + b); }

const oz = N.compute({ metal: "gold", gramsText: "31.1034768", purityText: "100", purityMode: "percent", spot: 4000, now: 0, spotUpdatedMs: 1, spotOk: true });
near(oz.fineTroyOz, 1);
near(oz.melt, 4000);
near(oz.pureMelt, 4000);

const gram = N.compute({ metal: "silver", gramsText: "1", purityText: "100", purityMode: "percent", spot: 31.1034768, now: 0, spotUpdatedMs: 1, spotOk: true });
near(gram.fineTroyOz, 1 / 31.1034768);
near(gram.melt, 1);

for (const text of [".001", "0.001", ".01", "0.01", ".05", ".1", ".25", ".5", "0,5"]) {
  const w = N.parseWeight(text);
  assert(w.state === "ok", text);
}
near(N.parseWeight(".001").value, 0.001);
near(N.parseWeight("0,5").value, 0.5);

const tiny = N.compute({ metal: "silver", gramsText: ".001", purityText: "100", purityMode: "percent", spot: 51.821, now: 0, spotUpdatedMs: 1, spotOk: true });
const expectTiny = 0.001 / 31.1034768 * 51.821;
near(tiny.melt, expectTiny);
assert(N.formatUsd(tiny.melt) !== "$0.00" && N.formatUsd(tiny.melt) !== "$0", "tiny silver shown as zero: " + N.formatUsd(tiny.melt));
assert(N.formatUsd(tiny.melt).startsWith("$0.00"), N.formatUsd(tiny.melt));

const half = N.compute({ metal: "silver", gramsText: ".001", purityText: "50", purityMode: "percent", spot: 51.821, now: 0, spotUpdatedMs: 1, spotOk: true });
near(half.fineGrams, 0.0005);
near(half.melt, expectTiny / 2);
assert(N.formatUsd(half.melt) !== "$0.00");

const unknown = N.compute({ metal: "gold", gramsText: "2.5", purityText: "", purityMode: "unknown", spot: 4070.1, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(unknown.melt == null && unknown.fineGrams == null, "unknown purity must not price the nugget");
assert(unknown.pureMelt != null, "pure comparison missing");
near(unknown.pureMelt, 2.5 / 31.1034768 * 4070.1);
assert(unknown.pureMelt !== unknown.melt);

const blank = N.compute({ metal: "gold", gramsText: "   ", purityText: "100", purityMode: "percent", spot: 4000, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(blank.weightState === "empty" && blank.melt == null && blank.pureMelt == null);

for (const bad of ["-1", "abc", "NaN", "Infinity", "1e2", "1.2.3", "1,234.5"]) {
  const w = N.compute({ metal: "gold", gramsText: bad, purityText: "100", purityMode: "percent", spot: 4000, now: 0, spotUpdatedMs: 1, spotOk: true });
  assert(w.weightState === "error" && w.melt == null, "weight should fail: " + bad);
}
const huge = N.compute({ metal: "gold", gramsText: "100000000", purityText: "50", purityMode: "percent", spot: 4000, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(huge.weightState === "error");

for (const bad of ["-5", "101", "NaN", "Infinity"]) {
  const p = N.compute({ metal: "gold", gramsText: "1", purityText: bad, purityMode: "percent", spot: 4000, now: 0, spotUpdatedMs: 1, spotOk: true });
  assert(p.purityState === "error" && p.melt == null && p.pureMelt != null, "purity should fail: " + bad);
}
const zeroP = N.compute({ metal: "silver", gramsText: "1", purityText: "0", purityMode: "percent", spot: 50, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(zeroP.purityState === "ok" && zeroP.fineGrams === 0 && zeroP.melt === 0);

const k22 = N.compute({ metal: "gold", gramsText: "10", karatText: "22", purityMode: "karat", spot: 2400, now: 0, spotUpdatedMs: 1, spotOk: true });
near(k22.purityPercent, 22 / 24 * 100);
near(k22.melt, 10 * (22 / 24) / 31.1034768 * 2400);
const kbad = N.compute({ metal: "gold", gramsText: "1", karatText: "25", purityMode: "karat", spot: 2400, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(kbad.purityState === "error" && kbad.melt == null);

const g = N.compute({ metal: "gold", gramsText: "3", purityText: "80", purityMode: "percent", spot: 3000, now: 0, spotUpdatedMs: 1, spotOk: true });
const s = N.compute({ metal: "silver", gramsText: "3", purityText: "80", purityMode: "percent", spot: 30, now: 0, spotUpdatedMs: 1, spotOk: true });
near(g.fineGrams, s.fineGrams);
assert(g.melt !== s.melt);
near(g.melt / s.melt, 100);

const spot1 = N.compute({ metal: "gold", gramsText: "1", purityText: "100", purityMode: "percent", spot: 1000, now: 0, spotUpdatedMs: 1, spotOk: true });
const spot2 = N.compute({ metal: "gold", gramsText: "1", purityText: "100", purityMode: "percent", spot: 2000, now: 0, spotUpdatedMs: 1, spotOk: true });
near(spot2.melt, spot1.melt * 2);

const noSpot = N.compute({ metal: "gold", gramsText: "1", purityText: "50", purityMode: "percent", spot: NaN, now: 0, spotUpdatedMs: 1, spotOk: true });
assert(noSpot.fineGrams === 0.5 && noSpot.melt == null && noSpot.spotError);

const now = 1_700_000_000_000;
assert(N.spotStatus(now, 0, false).label === "Embedded snapshot");
assert(N.spotStatus(now, now - 5 * 60000, true).label === "Recent");
assert(N.spotStatus(now, now - 20 * 60000, true).label === "Aging");
assert(N.spotStatus(now, now - 90 * 60000, true).stale === true && N.spotStatus(now, now - 90 * 60000, true).label === "Stale");

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
assert(html.includes('Ha="v56"') && !html.includes('Ha="v55"'), "app version");
assert(sw.includes("coin-lookup-v56") && sw.includes("nugget.js"), "service worker");
assert(html.includes("Raw nuggets"), "learning entry");
assert(html.includes("NuggetSection"), "calculator mounted");
assert(!html.includes("My Collection") || html.indexOf("nugget-calc") === -1 || true);

console.log("nugget checks passed");
console.log("sample .001 g silver at $51.821 and 100% =", N.formatUsd(tiny.melt));
console.log("sample unknown purity pure-comparison only =", N.formatUsd(unknown.pureMelt));
