import { readFileSync } from "fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = readFileSync(new URL("../cl-build/app.tsx", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const sizes = [
  ["AGE", "1 oz", 1, "$50"],
  ["AGEH", "1/2 oz", 0.5, "$25"],
  ["AGEQ", "1/4 oz", 0.25, "$10"],
  ["AGET", "1/10 oz", 0.1, "$5"],
];
for (const [lead, label, oz, face] of sizes) {
  if (!html.includes('lead:"' + lead + '"') || !src.includes('lead: "' + lead + '"')) throw new Error("missing " + lead);
  if (!html.includes(label) || !src.includes("American Gold Eagle " + label)) throw new Error("label " + label);
  if (!html.includes(face) || !src.includes("Face value " + face)) throw new Error("face " + face);
}
if (!html.includes("oz:1") || !src.includes("oz: 1,")) throw new Error("1 oz fine");
if (!html.includes("oz:.5") || !src.includes("oz: 0.5")) throw new Error("half fine");
if (!html.includes("oz:.25") || !src.includes("oz: 0.25")) throw new Error("quarter fine");
if (!html.includes("oz:.1,") || !src.includes("oz: 0.1")) throw new Error("tenth fine");
const spot = 4000;
for (const [, , oz] of sizes) {
  const melt = oz * spot;
  const wrong = oz * 0.9167 * spot;
  if (Math.abs(melt - wrong) < 1) throw new Error("22k discount collided");
  if (melt !== oz * spot) throw new Error("melt");
}
if (!html.includes('["1/200 oz",0.1555175]') || !src.includes('["1/200 oz", 0.1555175]')) throw new Error("1/200 oz row dropped");
if (!html.includes('["1/20 oz",1.555175]') || !src.includes('["1/20 oz", 1.555175]')) throw new Error("1/20 oz row dropped");
if (!html.includes('Va="v61"') || html.includes('Va="v60"')) throw new Error("app version");
if (!src.includes('APP_VER = "v61"')) throw new Error("source version");
if (!sw.includes("coin-lookup-v61") || sw.includes("coin-lookup-v60")) throw new Error("service worker");
if (!src.includes("Add this size") || !html.includes("Add this size")) throw new Error("add button");
if (!src.includes("No official 1/20 oz or 1/200 oz Gold Eagle") || !html.includes("No official 1/20 oz or 1/200 oz Gold Eagle")) throw new Error("fraction note");
console.log("gold eagle size check passed");
console.log("melts at $4000 spot:", sizes.map((s) => s[1] + " $" + (s[2] * 4000).toFixed(2)).join(", "));
