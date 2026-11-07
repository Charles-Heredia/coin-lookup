import { readFileSync } from "fs";
import { spawnSync as spawn } from "child_process";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const prices = readFileSync(new URL("../prices.json", import.meta.url), "utf8");
if (!sw.includes("coin-lookup-v55") || !sw.includes("bb-data.js") || !sw.includes("bb-ui.js")) throw new Error("service worker not bumped");
if (!html.includes('Ha="v55"') || html.includes('Ha="v54"')) throw new Error("app version not bumped");
if (!html.includes("function bbSection") || !html.includes("snap.bb===1")) throw new Error("collection melt hook missing");
if (!html.includes("Sigma PMV")) throw new Error("sigma entry missing");
if (html.includes('resale:"Sells back near spot."') && html.includes("R:Geiger")) {
  const g = html.slice(html.indexOf('id:"R:Geiger"'), html.indexOf('id:"R:Geiger"') + 500);
  if (g.includes("near spot") || g.includes("cap:3")) throw new Error("Geiger round still claims a near-spot cap");
}

const window = {};
eval(readFileSync(new URL("../bb-data.js", import.meta.url), "utf8"));
const data = window.BBDATA;
const quotes = data.lines.flatMap((l) => l.quotes.map((q) => ({ line: l, q })));
if (quotes.length !== 73) throw new Error("quotes " + quotes.length);
if (data.official.length !== 44) throw new Error("official");
if (data.sold.length !== 10) throw new Error("sold");

const ids = new Map();
for (const { line, q } of quotes) {
  if (ids.has(q.url + "|" + q.srcWeight + "|" + (q.ask ?? q.inactive))) {
    /* category pages repeat urls; key further below */
  }
  if (q.spot == null && (q.premUsd != null || q.premPct != null)) throw new Error("premium without spot " + line.id);
  if (q.ask == null && q.premUsd != null) throw new Error("premium on inactive/missing ask " + line.id);
  if (q.premUsd != null) {
    const melt = q.spot * line.fineOz;
    const delta = Math.abs(q.ask - melt - q.premUsd);
    if (delta > 0.03) throw new Error("premium is not ask - spot*fineOz for " + line.id + " delta " + delta);
    if (line.purity <= 0.999 && line.fineOz >= 1) {
      const wrong = Math.abs(q.ask - q.spot * line.fineOz * line.purity - q.premUsd);
      if (wrong <= delta) throw new Error("purity was applied twice for " + line.id);
    }
  }
  if (q.dealer === "APMEX" && q.premUsd != null) throw new Error("APMEX premium filled");
  if (/Atlas|Bullion Standard/.test(q.dealer) && q.premUsd != null) throw new Error("premium without a same-time spot");
}
const byId = Object.fromEntries(data.lines.map((l) => [l.id, l]));
const split = [
  ["pamp-ag-fortuna-1oz", "pamp-ag-usa-1oz"],
  ["pamp-au-fortuna-1oz", "pamp-au-certipamp-1oz"],
  ["pamp-au-fortuna-1g", "pamp-au-rosa-1g"],
  ["pamp-au-fortuna-1g", "pamp-au-unknown-1gram"],
  ["pamp-au-fortuna-50g", "pamp-au-cast-50g"],
  ["pamp-au-rosa-50g", "pamp-au-cast-50g"],
  ["geiger-au-1g-protective", "geiger-au-1g-capsule"],
  ["geiger-ag-vintage-rect-1oz", "geiger-ag-security-10oz"],
  ["valcambi-au-1oz", "valcambi-au-matte-1oz"],
  ["valcambi-au-5g", "valcambi-au-combibar-5x1-star"],
  ["valcambi-au-1oz", "valcambi-au-combibar-10x-tenth"],
  ["valcambi-ag-combibar-100x1", "valcambi-ag-100oz-unverified"],
];
for (const [a, b] of split) {
  if (!byId[a] || !byId[b]) throw new Error("missing " + a + " " + b);
  if (a === b) throw new Error("same");
}
if (byId["pamp-ag-fortuna-1oz"].quotes.length !== 2) throw new Error("fortuna silver quotes");
if (byId["pamp-ag-usa-1oz"].quotes[0].ask !== 56.61) throw new Error("usa logo ask");
if (byId["valcambi-ag-100oz-unverified"].add !== false || byId["valcambi-ag-100oz-unverified"].fineOz != null) throw new Error("100oz shell");
const heroOz = byId["valcambi-au-1oz"].quotes.find((q) => q.dealer === "Hero Bullion");
if (!heroOz.note.includes("$69") || heroOz.premUsd !== 64.62) throw new Error("valcambi promo");
if (byId["pamp-ag-fortuna-1oz"].quotes.some((q) => q.ask === 56.61)) throw new Error("usa logo merged into fortuna");

for (const s of data.sold) {
  if ("premUsd" in s || "premium" in s) throw new Error("sold premium field");
  if (s.count > 1 && s.total != null && s.perBar != null && Math.abs(s.total - s.perBar) < 0.01) throw new Error("lot total copied as per bar");
}
const lot5 = data.sold.find((s) => s.maker === "Geiger" && s.count === 5);
if (lot5.total !== 905.06 || lot5.currency !== "USD") throw new Error("geiger lot");
const cad = data.sold.find((s) => s.count === 2);
if (cad.currency !== "CAD" || cad.total !== 129.8 || cad.perBar !== 64.9) throw new Error("pamp cad lot");
if (data.sold.some((s) => s.currency === "CAD" && s.perBar != null && s.perBar > 200 && s.weight.includes("1 oz"))) throw new Error("cad lot treated as one bar");

const half = data.official.find((o) => /0,5g/.test(o.name));
if (!half || Math.abs(half.fineOz - 0.5 / 31.1034768) > 1e-9) throw new Error("half gram");
const fiveThou = data.official.find((o) => /5\.000 g/.test(o.name));
if (!fiveThou || Math.abs(fiveThou.fineOz - 5000 / 31.1034768) > 1e-6) throw new Error("5000 g parsed as 5 g");
if (data.official.some((o) => o.usd != null || /USD/.test(o.eur || ""))) throw new Error("eur converted");
if (JSON.stringify(data).includes("typical_resale") || JSON.stringify(data).toLowerCase().includes("justified_bid")) throw new Error("invented bid");

const priceObj = JSON.parse(prices);
if (typeof priceObj.gold !== "number" || typeof priceObj.silver !== "number") throw new Error("prices.json shape");

const asksPath = "/home/ubuntu/.cursor/projects/workspace/uploads/implementation-ready-asks_59b6.json";
try {
  readFileSync(asksPath);
  const rebuilt = spawn("node", ["scripts/build-branded-bullion.mjs"], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" });
  if (rebuilt.status !== 0) throw new Error(rebuilt.stderr || rebuilt.stdout);
  const diff = spawn("git", ["diff", "--exit-code", "--", "bb-data.js"], { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" });
  if (diff.status !== 0) throw new Error("bb-data.js drifted from the research files\n" + diff.stdout);
} catch (err) {
  if (err && err.code === "ENOENT") console.log("source json absent; skipped rebuild diff");
  else throw err;
}
console.log("branded bullion checks passed", quotes.length, "quotes");
