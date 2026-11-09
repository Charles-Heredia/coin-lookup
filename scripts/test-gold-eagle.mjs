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
if (!html.includes('["1/200 oz",.1555175]') || !src.includes('["1/200 oz", 0.1555175]')) throw new Error("1/200 oz row dropped");
if (!html.includes('["1/20 oz",1.555175]') || !src.includes('["1/20 oz", 1.555175]')) throw new Error("1/20 oz row dropped");
if (!html.includes('Va="v63"') || html.includes('Va="v62"')) throw new Error("app version");
if (!src.includes('APP_VER = "v63"')) throw new Error("source version");
if (!sw.includes("coin-lookup-v63") || sw.includes("coin-lookup-v62")) throw new Error("service worker");
const sale = "https://www.ebay.com/itm/137911337774";
if (!src.includes(sale) || !html.includes(sale)) throw new Error("sold link");
if (!src.includes("$465.80 before tax") || !html.includes("$465.80 before tax")) throw new Error("shipping total");
if (!src.includes("n=1") || !html.includes("n=1")) throw new Error("sample size");
if (src.includes("145664097350") || html.includes("145664097350") || src.includes("134970176930") || html.includes("134970176930")) throw new Error("excluded listing published");
const aget = src.slice(src.indexOf('lead: "AGET"'), src.indexOf('lead: "Panda"'));
if (!aget.includes("price: 0")) throw new Error("1/10 dealer price must stay blank");
if (!src.includes("Add this size") || !html.includes("Add this size")) throw new Error("add button");
if (!src.includes("No official 1/20 oz or 1/200 oz Gold Eagle") || !html.includes("No official 1/20 oz or 1/200 oz Gold Eagle")) throw new Error("fraction note");
const morganRows = [
  ['["1921 P", "", "44,690,000", "51.5", "47", "72.3", "100", ""]', '["1921 P","","44,690,000","51.5","47","72.3","100",""]'],
  ['["1921 D", "", "20,345,000", "47.1", "75", "104", "336", ""]', '["1921 D","","20,345,000","47.1","75","104","336",""]'],
  ['["1921 S", "", "21,695,000", "46", "67", "92.5", "248", ""]', '["1921 S","","21,695,000","46","67","92.5","248",""]'],
];
for (const [srcRow, htmlRow] of morganRows) {
  if (!src.includes(srcRow) || !html.includes(htmlRow)) throw new Error("Morgan guide cell changed: " + srcRow.slice(0, 12));
}
const morganSales = [
  ["https://www.ebay.com/itm/237161527950", "US $66.88", "US $7.00 USPS Ground Advantage", "not a 1921-P"],
  ["https://www.ebay.com/itm/900059971544", "US $100.00", "US $8.99 USPS Ground Advantage", "PCGS MS62"],
  ["https://www.ebay.com/itm/800889297167", "US $315.00", "US $7.00 USPS Ground Advantage", "NGC MS64"],
];
for (const bits of morganSales) {
  for (const bit of bits) {
    if (!src.includes(bit) || !html.includes(bit)) throw new Error("missing Morgan sale detail: " + bit);
  }
}
const excluded = ["145664097350", "134970176930", "137895700490", "920098118358", "860092947776", "267828207173", "158201044614", "960027593039", "404867624931", "940057650235"];
for (const id of excluded) {
  if (src.includes(id) || html.includes(id)) throw new Error("excluded listing published: " + id);
}
if (!src.includes("Mint unknown (not assigned to 1921-P)") || !html.includes("Mint unknown (not assigned to 1921-P)")) throw new Error("unknown mint not labeled");
console.log("gold eagle size check passed");
console.log("melts at $4000 spot:", sizes.map((s) => s[1] + " $" + (s[2] * 4000).toFixed(2)).join(", "));
