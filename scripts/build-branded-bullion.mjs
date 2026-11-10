/**
 * Build bb-data.js from the Nov 6, 2026 research files.
 * Check times are written as ISO instants with an offset (never an HST label).
 * Numbers are copied from those files. Premiums are not recomputed.
 * Run: node scripts/build-branded-bullion.mjs [asks.json] [inventory.json] [sold.json]
 */
import { readFileSync, writeFileSync } from "fs";


const ZONE_OFFSET = { HST: "-10:00", HDT: "-09:00", PST: "-08:00", PDT: "-07:00", MST: "-07:00", MDT: "-06:00", CST: "-06:00", CDT: "-05:00", EST: "-05:00", EDT: "-04:00" };
const pad2 = (n) => String(n).padStart(2, "0");
/** Convert HST/PST-labeled stamps to ISO instants with an offset. Date-only values are left as calendar dates. */
function toIsoInstant(s) {
  if (s == null || s === "") return s;
  if (typeof s !== "string") return s;
  let out = s;
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, date, h1, m1, h2, m2, z) => {
      const off = ZONE_OFFSET[z.toUpperCase()];
      return `~${date}T${pad2(h1)}:${m1}:00${off}/${date}T${pad2(h2)}:${m2}:00${off}`;
    }
  );
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})\s*~(\d{1,2}):(\d{2})\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b(?:\s*\([^)]*\bHST\b[^)]*\))?/gi,
    (_, date, h, m, z) => `~${date}T${pad2(h)}:${m}:00${ZONE_OFFSET[z.toUpperCase()]}`
  );
  out = out.replace(
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, iso, z) => iso + ZONE_OFFSET[z.toUpperCase()]
  );
  out = out.replace(
    /(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(HST|HDT|PST|PDT|MST|MDT|CST|CDT|EST|EDT)\b/gi,
    (_, date, h, m, sec, z) => `${date}T${pad2(h)}:${m}:${sec || "00"}${ZONE_OFFSET[z.toUpperCase()]}`
  );
  out = out.replace(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4})\s*HST\b/g, "$1");
  out = out.replace(/\b(\d{4}-\d{2}-\d{2})\s*HST\b/g, "$1");
  out = out.replace(/\s*\bHST\b/g, "");
  return out;
}


const asksPath = process.argv[2] || "/home/ubuntu/.cursor/projects/workspace/uploads/implementation-ready-asks_59b6.json";
const invPath = process.argv[3] || "/home/ubuntu/.cursor/projects/workspace/uploads/manufacturer-inventory-with-blanks_6e0d.json";
const soldPath = process.argv[4] || "/home/ubuntu/.cursor/projects/workspace/uploads/verified-auction-observations_6c3e.json";

const asks = JSON.parse(readFileSync(asksPath, "utf8"));
const inv = JSON.parse(readFileSync(invPath, "utf8"));
const soldFile = JSON.parse(readFileSync(soldPath, "utf8"));

const TROY_G = 31.1034768;

function gid(o) {
  const s = o.source || "";
  const p = o.product || "";
  const w = o.weight || "";
  const slug = s.replace(/\/$/, "").split("/").pop();
  if (s.includes("1-oz-pamp-suisse-lady-fortuna-silver-bar")) return "pamp-ag-fortuna-1oz";
  if (s.includes("pamp-suisse-1-ounce-silver-fortuna-bar")) return "pamp-ag-fortuna-1oz";
  if (s.includes("pamp-1-oz-silver-bar.html")) return "pamp-ag-usa-1oz";
  if (s.includes("100-oz-pamp-suisse-silver-cast-bar")) return "pamp-ag-cast-100oz";
  if (s.includes("pamp-suisse-1-kilo-silver-cast-bar")) return "pamp-ag-cast-kilo";
  if (s.includes("pamp-suisse-10-oz-silver-cast-bar")) return "pamp-ag-cast-10oz";
  if (s.includes("pamp-suisse-lady-of-liberty")) return "pamp-ag-liberty-1oz";
  if (s.includes("25x-1-gram-pamp-gold-bar-multigram")) return "pamp-au-multigram-25";
  if (s.includes("pamp-50-gram-cast-gold-bar")) return "pamp-au-cast-50g";
  if (s.includes("pamp-fortuna-1-2-oz-gold-bar")) return "pamp-au-fortuna-half-oz";
  if (s.includes("pamp-fortuna-1-gram-gold-bar")) return "pamp-au-fortuna-1g";
  if (s.includes("pamp-fortuna-1-oz-gold-bar")) return "pamp-au-fortuna-1oz";
  if (s.includes("pamp-fortuna-10-gram-gold-bar")) return "pamp-au-fortuna-10g";
  if (s.includes("pamp-fortuna-100-gram-gold-bar")) return "pamp-au-fortuna-100g";
  if (s.includes("pamp-fortuna-2-5-gram-gold-bar")) return "pamp-au-fortuna-2-5g";
  if (s.includes("pamp-fortuna-5-gram-gold-bar")) return "pamp-au-fortuna-5g";
  if (s.includes("pamp-fortuna-50-gram-gold-bar")) return "pamp-au-fortuna-50g";
  if (s.includes("pamp-rosa-1-gram-gold-bar")) return "pamp-au-rosa-1g";
  if (s.includes("pamp-rosa-10-gram-gold-bar")) return "pamp-au-rosa-10g";
  if (s.includes("pamp-rosa-100-gram-gold-bar")) return "pamp-au-rosa-100g";
  if (s.includes("pamp-rosa-50-gram-gold-bar")) return "pamp-au-rosa-50g";
  if (s.includes("pamp-suisse-1-kilo-cast-gold-bar")) return "pamp-au-cast-kilo";
  if (s.includes("pamp-suisse-1-oz-gold-bar-certipamp")) return "pamp-au-certipamp-1oz";
  if (s.includes("pamp-suisse-100-gram-cast-gold-bar")) return "pamp-au-cast-100g";
  if (s.includes("pamp-gold-bars.html")) {
    if (p.startsWith("PAMP Rosa")) {
      const map = { "2.5 gram": "pamp-au-rosa-2.5gram", "5 gram": "pamp-au-rosa-5gram", "10 gram": "pamp-au-rosa-10g", "20 gram": "pamp-au-rosa-20gram", "50 gram": "pamp-au-rosa-50g" };
      if (!map[w]) throw new Error("Unmapped Rosa weight " + w);
      return map[w];
    }
    if (p.includes("DO NOT map to Fortuna")) {
      const map = { "1 gram": "pamp-au-unknown-1gram", "2.5 gram": "pamp-au-unknown-2.5gram", "5 gram": "pamp-au-unknown-5gram" };
      if (!map[w]) throw new Error("Unmapped unknown PAMP weight " + w);
      return map[w];
    }
  }
  if (s.includes("valcambi-1-gram-gold-bar-in-assay")) return "valcambi-au-1g";
  if (s.includes("100-gram-silver-valcambi-bar")) return "valcambi-ag-combibar-100x1";
  if (s.includes("valcambi-suisse-100-oz-silver-bar")) return "valcambi-ag-100oz-unverified";
  if (slug === "valcambi-1-gram-gold-bar") return "valcambi-au-1g";
  if (slug === "valcambi-1-oz-gold-bar") return "valcambi-au-1oz";
  if (slug === "valcambi-10-gram-gold-bar") return "valcambi-au-10g";
  if (slug === "valcambi-10-oz-gold-bar") return "valcambi-au-10oz";
  if (slug === "valcambi-10-x-1-10-oz-gold-combibar") return "valcambi-au-combibar-10x-tenth";
  if (slug === "valcambi-100-gram-gold-bar") return "valcambi-au-100g";
  if (slug === "valcambi-100-x-1-gram-gold-combibar") return "valcambi-au-combibar-100x1";
  if (slug === "valcambi-2-5-gram-gold-bar") return "valcambi-au-2-5g";
  if (slug === "valcambi-20-gram-gold-bar") return "valcambi-au-20g";
  if (slug === "valcambi-20-x-1-gram-gold-combibar") return "valcambi-au-combibar-20x1";
  if (slug === "valcambi-5-gram-gold-bar") return "valcambi-au-5g";
  if (slug === "valcambi-5-x-1-gram-gold-combibar-star") return "valcambi-au-combibar-5x1-star";
  if (slug === "valcambi-50-gram-gold-bar") return "valcambi-au-50g";
  if (slug === "valcambi-50-x-1-gram-gold-combibar") return "valcambi-au-combibar-50x1";
  if (slug === "valcambi-cast-1-kilo-silver-bar") return "valcambi-ag-cast-kilo";
  if (slug === "valcambi-skyline-1-oz-silver-bar") return "valcambi-ag-skyline-1oz";
  if (slug === "valcambi-suisse-1-2-gram-gold-bar") return "valcambi-au-half-g";
  if (slug === "valcambi-suisse-matte-finish-1-oz-gold-bar") return "valcambi-au-matte-1oz";
  if (slug === "100x-1-gram-silver-bar-valcambi-silver-combibar") return "valcambi-ag-combibar-100x1";
  if (s.includes("valcambi-gold-bars.html")) {
    if (p.includes("5 x 1 gram")) return "valcambi-au-combibar-5x1-star";
    if (p.includes("20 x 1 gram")) return "valcambi-au-combibar-20x1";
    if (p.includes("50 x 1 gram")) return "valcambi-au-combibar-50x1";
    if (p.includes("10 x 1/10")) return "valcambi-au-combibar-10x-tenth";
    if (/(^|[^0-9])2\.5 gram/.test(p)) return "valcambi-au-2-5g";
    if (/(^|[^0-9])5 gram/.test(p)) return "valcambi-au-5g";
    if (/(^|[^0-9])10 gram/.test(p)) return "valcambi-au-10g";
    if (/(^|[^0-9])20 gram/.test(p)) return "valcambi-au-20g";
    if (/(^|[^0-9])1 oz/.test(p)) return "valcambi-au-1oz";
  }
  if (s.includes("geiger-edelmetalle-1-oz-silver-bar")) return "geiger-ag-vintage-rect-1oz";
  if (s.includes("/155934/")) return "geiger-au-1g-protective";
  if (s.includes("/155931/")) return "geiger-au-1oz-capsule";
  if (s.includes("/155930/")) return "geiger-au-20g-capsule";
  if (s.includes("geiger-gold-bars") && w === "1 gram") return "geiger-au-1g-capsule";
  if (s.includes("geiger-gold-bars") && w === "10 gram") return "geiger-au-10g-capsule";
  if (s.includes("geiger-silver-bars")) return "geiger-ag-security-10oz";
  if (s.includes("bullionstandard.com")) return "geiger-ag-bs-1g";
  if (s.includes("atlasbullion.com/product/1-gram-silver-bar-geiger-in-assay")) return "geiger-ag-atlas-1g";
  if (s.includes("atlasbullion.com/product/20-gram-silver-bar-geiger-in-assay")) return "geiger-ag-atlas-20g";
  throw new Error("Unmapped observation: " + o.dealer + " | " + p + " | " + w + " | " + s);
}

const META = {
  "pamp-ag-fortuna-1oz": ["PAMP", "silver", "Lady Fortuna 1 oz silver", "1 oz", "New in CertiPAMP assay (Hero) or sealed serialized case and assay (Monument). Not the USA-logo bar. Hero: Swiss serial starts with C, US serial with U."],
  "pamp-ag-usa-1oz": ["PAMP", "silver", "USA-logo 1 oz silver", "1 oz", "Protective packaging. PAMP USA logo. Not Lady Fortuna."],
  "pamp-ag-cast-100oz": ["PAMP", "silver", "Cast 100 oz silver", "100 oz", "Cast bar, new. Not a minted Fortuna bar. Out of stock at the check; inactive price only."],
  "pamp-ag-cast-kilo": ["PAMP", "silver", "Cast 1 kilo silver", "1 kilo", "Cast bar, new. Not a minted Fortuna kilo. Out of stock; inactive price only. No separate in-stock Fortuna kilo ask was captured."],
  "pamp-ag-cast-10oz": ["PAMP", "silver", "Cast 10 oz silver", "10 oz", "Cast bar, new. Out of stock; inactive price only."],
  "pamp-ag-liberty-1oz": ["PAMP", "silver", "Lady of Liberty 1 oz silver", "1 oz", "Lady of Liberty design. Not Lady Fortuna and not the USA-logo bar. Out of stock; inactive price only."],
  "pamp-au-multigram-25": ["PAMP", "gold", "Multigram+25 gold, full sheet", "25 × 1 gram full sheet", "Full sheet of 25 connected 1 gram Lady Fortuna bars in CertiPAMP assay packaging. Not one loose gram and not 25 separate bought bars."],
  "pamp-au-cast-50g": ["PAMP", "gold", "Cast 50 gram gold", "50 gram", "Cast bar with certificate. Not the minted Fortuna or Rosa 50 gram bar."],
  "pamp-au-fortuna-half-oz": ["PAMP", "gold", "Lady Fortuna 1/2 oz gold", "1/2 oz", "Minted Fortuna, new in assay."],
  "pamp-au-fortuna-1g": ["PAMP", "gold", "Lady Fortuna 1 gram gold", "1 gram", "Veriscan, new in assay. Not Rosa and not an unidentified Monument design."],
  "pamp-au-fortuna-1oz": ["PAMP", "gold", "Lady Fortuna 1 oz gold", "1 oz", "Veriscan, new in assay. Out of stock at Hero; inactive price only. Not the separate CertiPAMP 1 oz listing."],
  "pamp-au-fortuna-10g": ["PAMP", "gold", "Lady Fortuna 10 gram gold", "10 gram", "Minted Fortuna, new in assay. Not Rosa."],
  "pamp-au-fortuna-100g": ["PAMP", "gold", "Lady Fortuna 100 gram gold", "100 gram", "Minted Fortuna, new in assay. Not Rosa and not the cast 100 gram bar."],
  "pamp-au-fortuna-2-5g": ["PAMP", "gold", "Lady Fortuna 2.5 gram gold", "2.5 gram", "Minted Fortuna, new in assay."],
  "pamp-au-fortuna-5g": ["PAMP", "gold", "Lady Fortuna 5 gram gold", "5 gram", "Minted Fortuna, new in assay."],
  "pamp-au-fortuna-50g": ["PAMP", "gold", "Lady Fortuna 50 gram gold", "50 gram", "Minted Fortuna, new in assay. Not Rosa and not the cast 50 gram bar."],
  "pamp-au-rosa-1g": ["PAMP", "gold", "Rosa 1 gram gold", "1 gram", "Rosa design, new in assay. Not Lady Fortuna."],
  "pamp-au-rosa-10g": ["PAMP", "gold", "Rosa 10 gram gold", "10 gram", "Rosa assay. Not Lady Fortuna."],
  "pamp-au-rosa-100g": ["PAMP", "gold", "Rosa 100 gram gold", "100 gram", "Rosa, new in assay. Not Lady Fortuna."],
  "pamp-au-rosa-50g": ["PAMP", "gold", "Rosa 50 gram gold", "50 gram", "Rosa assay. Not Lady Fortuna and not cast."],
  "pamp-au-rosa-2.5gram": ["PAMP", "gold", "Rosa 2.5 gram gold", "2.5 gram", "Rosa assay from a Monument category page. Stock was not shown. Not Lady Fortuna."],
  "pamp-au-rosa-5gram": ["PAMP", "gold", "Rosa 5 gram gold", "5 gram", "Rosa assay from a Monument category page. Stock was not shown. Not Lady Fortuna."],
  "pamp-au-rosa-20gram": ["PAMP", "gold", "Rosa 20 gram gold", "20 gram", "Rosa assay from a Monument category page. Stock was not shown. No Fortuna 20 gram cash ask was captured in this check."],
  "pamp-au-cast-kilo": ["PAMP", "gold", "Cast 1 kilo gold", "1 kilo", "Cast kilo. Out of stock; inactive price only. Not a minted Fortuna kilo."],
  "pamp-au-certipamp-1oz": ["PAMP", "gold", "1 oz gold in CertiPAMP assay", "1 oz", "Listed as PAMP Suisse 1 oz in CertiPAMP assay, not titled Lady Fortuna. Out of stock; inactive price only. Kept separate from the Fortuna 1 oz listing."],
  "pamp-au-cast-100g": ["PAMP", "gold", "Cast 100 gram gold", "100 gram", "Cast bar, new. Not minted Fortuna or Rosa."],
  "pamp-au-unknown-1gram": ["PAMP", "gold", "1 gram gold, design not identified", "1 gram", "Monument category assay. The design was not resolved. Do not treat this as Lady Fortuna or Rosa."],
  "pamp-au-unknown-2.5gram": ["PAMP", "gold", "2.5 gram gold, design not identified", "2.5 gram", "Monument category assay. Design not resolved. Not Fortuna and not the Rosa 2.5 gram row."],
  "pamp-au-unknown-5gram": ["PAMP", "gold", "5 gram gold, design not identified", "5 gram", "Monument category assay. Design not resolved. Not Fortuna and not Rosa."],
  "valcambi-au-1g": ["Valcambi", "gold", "1 gram gold bar in assay", "1 gram", "Standard bar, new in assay. Not a detached CombiBar gram. Monument’s product page confirmed this bar in stock; the category page is a different row and is not used here."],
  "valcambi-au-1oz": ["Valcambi", "gold", "1 oz gold bar in assay", "1 oz", "Standard 1 oz assay bar. Not the matte-finish 1 oz and not a 10 × 1/10 oz CombiBar."],
  "valcambi-au-10g": ["Valcambi", "gold", "10 gram gold bar in assay", "10 gram", "Standard bar, new in assay."],
  "valcambi-au-10oz": ["Valcambi", "gold", "10 oz gold bar in assay", "10 oz", "Standard bar, new in assay."],
  "valcambi-au-combibar-10x-tenth": ["Valcambi", "gold", "CombiBar 10 × 1/10 oz gold, full sheet", "10 × 1/10 oz full sheet", "Full CombiBar sheet. Not ten detached 1/10 oz pieces and not a single 1 oz bar."],
  "valcambi-au-100g": ["Valcambi", "gold", "100 gram gold bar in assay", "100 gram", "Standard bar, new in assay. Not a 100 × 1 gram CombiBar."],
  "valcambi-au-combibar-100x1": ["Valcambi", "gold", "CombiBar 100 × 1 gram gold, full sheet", "100 × 1 gram full sheet", "Full sheet. Detached grams were not quoted."],
  "valcambi-au-2-5g": ["Valcambi", "gold", "2.5 gram gold bar in assay", "2.5 gram", "Standard bar. Hero had it out of stock (inactive price). Monument’s category quote does not show stock."],
  "valcambi-au-20g": ["Valcambi", "gold", "20 gram gold bar in assay", "20 gram", "Standard bar, new in assay. Not a 20 × 1 gram CombiBar."],
  "valcambi-au-combibar-20x1": ["Valcambi", "gold", "CombiBar 20 × 1 gram gold, full sheet", "20 × 1 gram full sheet", "Full sheet. Not a 20 gram standard bar and not detached grams."],
  "valcambi-au-5g": ["Valcambi", "gold", "5 gram gold bar in assay", "5 gram", "Standard bar, new in assay. Not the 5 × 1 gram CombiBar star."],
  "valcambi-au-combibar-5x1-star": ["Valcambi", "gold", "CombiBar star 5 × 1 gram gold, full sheet", "5 × 1 gram full sheet (star)", "Full 5 × 1 gram star sheet. Not a 5 gram standard bar and not five loose grams."],
  "valcambi-au-50g": ["Valcambi", "gold", "50 gram gold bar in assay", "50 gram", "Standard bar, new in assay. Not a 50 × 1 gram CombiBar."],
  "valcambi-au-combibar-50x1": ["Valcambi", "gold", "CombiBar 50 × 1 gram gold, full sheet", "50 × 1 gram full sheet", "Full sheet. Not a 50 gram standard bar."],
  "valcambi-ag-combibar-100x1": ["Valcambi", "silver", "CombiBar 100 × 1 gram silver, full sheet", "100 × 1 gram full sheet", "Full .999 sheet in a presentation case with assay (Hero). Monument priced the full 100 × 1 g bar. Not detached grams."],
  "valcambi-ag-cast-kilo": ["Valcambi", "silver", "Cast 1 kilo silver", "1 kilo", "Cast bar, new. Out of stock; inactive price only. Not a Skyline minted bar."],
  "valcambi-ag-skyline-1oz": ["Valcambi", "silver", "Skyline 1 oz silver", "1 oz", "Skyline design. Out of stock; inactive price only."],
  "valcambi-au-half-g": ["Valcambi", "gold", "1/2 gram gold bar in assay", "1/2 gram", "Standard half-gram bar, new in assay."],
  "valcambi-au-matte-1oz": ["Valcambi", "gold", "Matte finish 1 oz gold", "1 oz", "Matte finish, new in assay. Not the standard 1 oz assay bar."],
  "valcambi-ag-100oz-unverified": ["Valcambi", "silver", "100 oz silver (page not verified)", "—", "The product URL responded with an HTML shell. No verified weight, purity, stock, or ask was captured. An older indexed snapshot was not promoted."],
  "geiger-ag-vintage-rect-1oz": ["Geiger", "silver", "Vintage rectangle 1 oz silver", "1 oz", "Secondary-market vintage rectangle (Schloss Güldengossa). Not the Security Line and not the current Original square assay bar. Hero listed these as used."],
  "geiger-au-1g-protective": ["Geiger", "gold", "Originals 1 gram gold, protective packaging", "1 gram", "Originals series in protective packaging. Not the capsule assay 1 gram."],
  "geiger-au-1oz-capsule": ["Geiger", "gold", "Original 1 oz gold, capsule assay", "1 oz", "Original square in capsule with assay. Stock was not shown on the page."],
  "geiger-au-20g-capsule": ["Geiger", "gold", "Original 20 gram gold, capsule assay", "20 gram", "Original capsule assay. Stock was not shown. APMEX tier text says any quantity for this check/wire figure; it is still not a card price."],
  "geiger-au-1g-capsule": ["Geiger", "gold", "Original 1 gram gold, capsule assay", "1 gram", "Original capsule assay from the APMEX category page. Not the protective-packaging 1 gram. Stock was not shown."],
  "geiger-au-10g-capsule": ["Geiger", "gold", "Original 10 gram gold, capsule assay", "10 gram", "Original capsule assay from the APMEX category page. Stock was not shown."],
  "geiger-ag-security-10oz": ["Geiger", "silver", "Security Line 10 oz silver rectangle", "10 oz", "Security Line rectangle. Not an Original square and not a cast bar. Stock was not shown. No same-time spot, so premium is blank."],
  "geiger-ag-atlas-1g": ["Geiger", "silver", "1 gram silver in assay (Atlas)", "1 gram", "Atlas says in assay. Page dimensions 15×8 mm conflict with Geiger’s official square, so this is not merged with the manufacturer 1 g square. December ship, not immediate delivery."],
  "geiger-ag-atlas-20g": ["Geiger", "silver", "20 gram silver in assay (Atlas)", "20 gram", "Atlas in-assay 20 g .999. Not proved to be the same SKU as the official square. December ship, not immediate delivery. No spot on the page."],
  "geiger-ag-bs-1g": ["Geiger", "silver", "1 gram silver, square assay card", "1 gram", "Bullion Standard describes a square in an assay card, 10.6×10.6 mm. Stock and spot were not supplied. An unlabeled lower 1+ row on that page was excluded."],
};

function noteFor(o) {
  const s = o.source || "";
  if (s.includes("valcambi-1-oz-gold-bar") && !s.includes("matte") && o.dealer === "Hero Bullion") {
    return "The same Hero page also says “For a Limited Time – Just $69 Over Spot Per Bar.” That slogan is not the premium. Ask minus the dealer header spot ($" + o.displayed_spot_usd_oz + ") is $" + o.reference_premium_usd + " (" + o.reference_premium_pct + "%).";
  }
  if (s.includes("apmex.com")) {
    return "APMEX also showed a spot of $4,081.80 timestamped 2026-11-06T11:59:00-10:00, older than this page check. That spot is not used. Premium stays blank. Stock was not asserted.";
  }
  if (s.includes("bullionstandard.com")) {
    return "An unlabeled 1+ price (lower than this check/wire ask) was excluded. It may be member or wholesale. Stock and numeric spot were not supplied.";
  }
  if (s.includes("atlasbullion.com/product/1-gram-silver-bar-geiger-in-assay")) {
    return "Dimensions on the Atlas page conflict with the official square. No spot was shown.";
  }
  if (s.includes("20-gram-silver-bar-geiger-in-assay")) {
    return "Ask is the price on the fetched Atlas page. No spot was shown, so premium is blank.";
  }
  return "";
}

function numOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const byId = new Map();
for (const o of asks.observations) {
  const id = gid(o);
  const meta = META[id];
  if (!meta) throw new Error("Missing META for " + id);
  const [maker, metal, name, weight, pack] = meta;
  if (o.maker !== maker || o.metal !== metal) throw new Error("Metal mismatch " + id + " " + o.maker + o.metal);
  let line = byId.get(id);
  if (!line) {
    line = {
      id, maker, metal, name, weight, pack,
      fineOz: id === "valcambi-ag-100oz-unverified" ? null : numOrNull(o.nominal_metal_troy_oz),
      purity: id === "valcambi-ag-100oz-unverified" ? null : numOrNull(o.purity),
      add: id !== "valcambi-ag-100oz-unverified",
      quotes: [],
    };
    byId.set(id, line);
  } else if (id !== "valcambi-ag-100oz-unverified") {
    const oz = numOrNull(o.nominal_metal_troy_oz);
    const pu = numOrNull(o.purity);
    if (Math.abs(oz - line.fineOz) > 1e-9) throw new Error("fineOz mismatch " + id + " " + oz + " vs " + line.fineOz);
    if (pu !== line.purity) throw new Error("purity mismatch " + id);
  }
  line.quotes.push({
    dealer: o.dealer,
    ask: numOrNull(o.cash_single_unit_ask_usd),
    inactive: numOrNull(o.inactive_displayed_ask_usd),
    stock: o.availability || "unknown",
    tier: o.tier || "",
    pay: o.payment || "",
    ship: o.shipping_tax || "",
    spot: numOrNull(o.displayed_spot_usd_oz),
    spotChecked: toIsoInstant(o.spot_checked_hst) || null,
    premUsd: numOrNull(o.reference_premium_usd),
    premPct: numOrNull(o.reference_premium_pct),
    premBasis: o.reference_premium_basis || null,
    checked: toIsoInstant(o.checked_hst),
    url: o.source,
    srcWeight: o.weight || "",
    note: noteFor(o),
  });
}

if (byId.size !== Object.keys(META).length) {
  const missing = Object.keys(META).filter((id) => !byId.has(id));
  throw new Error("Unused META: " + missing.join(", "));
}

const makerOrder = { Geiger: 0, PAMP: 1, Valcambi: 2 };
const lines = [...byId.values()].sort((a, b) =>
  makerOrder[a.maker] - makerOrder[b.maker] ||
  (a.metal === b.metal ? 0 : a.metal === "gold" ? -1 : 1) ||
  (a.fineOz ?? 99) - (b.fineOz ?? 99) ||
  a.name.localeCompare(b.name)
);

function euroNumber(s) {
  if (/,/.test(s)) return parseFloat(s.replace(",", "."));
  if (/^\d+\.\d{3}$/.test(s)) return parseFloat(s.replace(".", ""));
  return parseFloat(s);
}
function toOz(amount, unit) {
  if (unit === "oz") return amount;
  if (unit === "g") return amount / TROY_G;
  if (unit === "kg") return (amount * 1000) / TROY_G;
  throw new Error("unit " + unit);
}
function parseOfficial(name) {
  const purity = /\.9999/.test(name) ? 0.9999 : /\.999/.test(name) ? 0.999 : null;
  const metal = /Gold/i.test(name) ? "gold" : /Silver/i.test(name) ? "silver" : null;
  const multi = name.match(/(?:tube|Multicard)\s+(\d+)\s*x\s*([0-9]+(?:[.,][0-9]+)?)\s*(g|kg|oz)/i);
  let count = 1, amount, unit, each;
  if (multi) {
    count = +multi[1];
    each = euroNumber(multi[2]);
    unit = multi[3].toLowerCase();
    amount = count * each;
  } else {
    const one = name.match(/([0-9]+(?:[.,][0-9]+)?)\s*(g|kg|oz)/i) || name.match(/([0-9]+,[0-9]+)(g|kg|oz)/i);
    if (!one) throw new Error("No weight in " + name);
    amount = euroNumber(one[1]);
    unit = one[2].toLowerCase();
    each = amount;
  }
  if (!purity || !metal || !Number.isFinite(amount)) throw new Error("Parse failed " + name);
  let form = "Original";
  if (/cast/i.test(name)) form = "Cast";
  else if (/tube/i.test(name)) form = "Tube";
  else if (/Multicard/i.test(name)) form = "Multicard";
  else if (/square/i.test(name)) form = "Original square";
  const extras = [];
  if (/capsule/i.test(name)) extras.push("capsule");
  if (/vaccum|vacuum/i.test(name)) extras.push("vacuum sealed");
  if (/christmas/i.test(name)) extras.push("christmas edition");
  if (/birth edition/i.test(name)) extras.push("birth edition");
  if (/love edition/i.test(name)) extras.push("love edition");
  if (/christian edition/i.test(name)) extras.push("christian edition");
  if (/depot/i.test(name)) extras.push("storage in a precious-metal depot");
  if (/Bonded warehouse/i.test(name)) extras.push("bonded warehouse Switzerland");
  const unitLabel = unit === "oz" ? "oz" : unit;
  const weight = count > 1 ? (count + " × " + each + " " + unitLabel) : (amount + " " + unitLabel);
  return { metal, purity, fineOz: toOz(amount, unit), form, extras, weight, count };
}

const official = [];
for (const row of inv) {
  if (!row.product) continue;
  if (row.maker !== "Geiger") throw new Error("Unexpected official maker " + row.maker);
  const parsed = parseOfficial(row.product);
  const euros = [...(row.official_cells || []).join(" | ").matchAll(/€\s*([0-9][0-9.,]*)/g)].map((m) => "€" + m[1]);
  const regular = ((row.official_cells || []).join(" | ").match(/Regular price:\s*(€\s*[0-9][0-9.,]*)/) || [])[1] || null;
  official.push({
    id: "geiger-eur-" + official.length + "-" + row.product.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60),
    maker: "Geiger",
    metal: parsed.metal,
    name: row.product,
    weight: parsed.weight,
    fineOz: parsed.fineOz,
    purity: parsed.purity,
    form: parsed.form,
    extras: parsed.extras,
    eur: euros[0] || null,
    eurRegular: regular ? regular.replace(/\s+/g, "") : (euros[1] || null),
    url: row.official_source,
    checked: toIsoInstant(row.checked_hst),
    add: true,
  });
}
if (official.length !== 44) throw new Error("Expected 44 official rows, got " + official.length);
const ids = new Set(official.map((r) => r.id));
if (ids.size !== official.length) throw new Error("Official id collision");
official.sort((a, b) => (a.metal === b.metal ? 0 : a.metal === "gold" ? -1 : 1) || a.fineOz - b.fineOz || a.name.localeCompare(b.name));

function near(a, b) { return Math.abs(a - b) < 0.02; }
const sold = soldFile.observations.map((o) => {
  const weight = o.weight || "";
  const count = /^(\d+)\s*x/i.test(weight) ? +RegExp.$1 : 1;
  const hammerLot = numOrNull(o.hammer_lot ?? o.hammer);
  const bpAmt = numOrNull(o.buyer_premium_lot);
  const bpPct = numOrNull(o.buyer_premium_pct);
  let total = null, totalLabel = null;
  if (o.all_in_lot_ex_shipping_tax != null) {
    total = numOrNull(o.all_in_lot_ex_shipping_tax);
    totalLabel = "All-in for the lot, buyer premium included, shipping and tax excluded";
  } else if (o.total_ex_shipping_tax != null) {
    total = numOrNull(o.total_ex_shipping_tax);
    totalLabel = "Lot total excluding shipping and tax";
  } else if (o.total_ex_shipping_tax_before_optional_cash_discount != null) {
    total = numOrNull(o.total_ex_shipping_tax_before_optional_cash_discount);
    totalLabel = "Lot total before an optional cash discount, which is not assumed. Shipping and tax excluded";
  } else if (o.total_lot != null) {
    total = numOrNull(o.total_lot);
    totalLabel = hammerLot != null && bpAmt != null && near(hammerLot + bpAmt, o.total_lot)
      ? "Lot total (hammer + buyer premium on this lot)"
      : "Lot total as archived";
  } else if (o.total != null) {
    total = numOrNull(o.total);
    totalLabel = hammerLot != null && bpPct != null && near(hammerLot * (1 + bpPct / 100), o.total)
      ? "Lot total (hammer plus the stated buyer premium). Shipping and tax not included"
      : "Archived total";
  }
  return {
    maker: o.maker,
    metal: o.metal || (/silver/i.test(o.line || "") ? "silver" : /gold/i.test(o.line || "") ? "gold" : null),
    line: o.line || null,
    weight,
    count,
    date: toIsoInstant(o.date || o.date_hst || null),
    currency: o.currency,
    lot: o.lot ?? null,
    hammerLot,
    buyerPremiumPct: bpPct,
    buyerPremiumAmt: bpAmt,
    total,
    totalLabel,
    perBar: numOrNull(o.all_in_per_bar ?? o.total_per_bar),
    hammerPerBar: numOrNull(o.hammer_per_bar),
    condition: o.condition || null,
    status: o.status || o.evidence || "",
    url: o.source,
  };
});
if (sold.length !== 10) throw new Error("Expected 10 sold lots");

const same = (a, b) => gid(asks.observations.find((o) => o.source.includes(a))) === gid(asks.observations.find((o) => o.source.includes(b)));
const diff = (a, b) => gid(asks.observations.find((o) => o.source.includes(a))) !== gid(asks.observations.find((o) => o.source.includes(b)));
if (!same("lady-fortuna-silver-bar", "silver-fortuna-bar-new-w-assay")) throw new Error("Fortuna silver should group");
if (!diff("silver-fortuna-bar-new-w-assay", "pamp-1-oz-silver-bar.html")) throw new Error("USA logo must split");
if (!diff("pamp-fortuna-1-oz-gold-bar", "certipamp-assay")) throw new Error("CertiPAMP must split");
if (!diff("155934", "geiger-gold-bars")) throw new Error("protective vs capsule");
if (!diff("valcambi-1-oz-gold-bar", "matte-finish")) throw new Error("matte split");
if (!diff("valcambi-5-gram-gold-bar", "combibar-star")) throw new Error("5g vs star");
if (!diff("pamp-rosa-1-gram", "pamp-fortuna-1-gram")) throw new Error("rosa vs fortuna");
if (!diff("pamp-50-gram-cast", "pamp-fortuna-50-gram")) throw new Error("cast vs fortuna 50");
if (!diff("geiger-edelmetalle-1-oz-silver-bar", "geiger-silver-bars")) throw new Error("vintage vs security");

const quoteCount = lines.reduce((n, l) => n + l.quotes.length, 0);
if (quoteCount !== 73) throw new Error("quote count " + quoteCount);

for (const line of lines) {
  for (const q of line.quotes) {
    if (q.spot == null && (q.premUsd != null || q.premPct != null)) throw new Error("Premium without spot " + line.id);
    if (q.ask == null && q.premUsd != null) throw new Error("Premium without ask " + line.id);
    if (q.premUsd != null && q.ask != null && q.spot != null && line.fineOz != null) {
      const melt = q.spot * line.fineOz;
      if (Math.abs(q.ask - melt - q.premUsd) > 0.03) throw new Error("Stored premium != ask - spot*fineOz (no purity discount) " + line.id);
      if (line.purity != null && line.purity <= 0.999 && line.fineOz >= 1) {
        const wrong = q.ask - q.spot * line.fineOz * line.purity;
        if (Math.abs(wrong - q.premUsd) <= Math.abs(q.ask - melt - q.premUsd)) throw new Error("Looks double-discounted " + line.id);
      }
    }
  }
}

const data = {
  checked: toIsoInstant(asks.checked_hst),
  labels: asks.labels,
  soldRule: soldFile.rule,
  lines,
  official,
  sold,
  gaps: [
    "Geiger Original silver sizes on the manufacturer list do not have a same-time USD premium in this check. Atlas and Bullion Standard asks are shown separately and are not treated as proof of the official square SKU.",
    "Geiger gold sizes that appear only on the EUR list (including 0.5 g, 2.5 g, 5 g, 50 g, 100 g, and the 25 × 1 g multicard) have no USD ask here. No gold kilo was on that list.",
    "PAMP Lady Fortuna gold has no exact current cash ask here for a standard 20 g bar, or for 250 g, 500 g, kilo, 5 oz, or 10 oz minted bars. The kilo that was captured is the cast bar, and it was out of stock.",
    "PAMP silver has no in-stock Fortuna kilo ask. Cast 10 oz, kilo, and 100 oz were out of stock. Small gram silver sizes were not added.",
    "Valcambi detached grams have no exact quote. Full CombiBar sheets are priced only as intact sheets. A gold kilo had no usable USD quote. Silver Skyline 1 oz and the cast kilo were out of stock. The 100 oz silver URL did not yield a verified ask.",
    "Manufacturer mentions of Valcambi silver 10 × 10 g, 3 × 1 oz Skyline, and 16 × 1/4 oz stayed without a usable USD ask, so no price is shown.",
    "No typical resale range and no justified bid is established for these lines. Dealer asks are not sold prices.",
  ],
};

const out = "window.BBDATA=" + JSON.stringify(data) + ";\n";
writeFileSync(new URL("../bb-data.js", import.meta.url), out);
console.log("wrote bb-data.js", "lines", lines.length, "quotes", quoteCount, "official", official.length, "sold", sold.length, "bytes", out.length);
