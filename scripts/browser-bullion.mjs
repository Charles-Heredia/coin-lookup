let puppeteer;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  puppeteer = (await import("/tmp/pw/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js")).default;
}
import { mkdirSync } from "fs";

const chrome = "/usr/local/bin/google-chrome";
const out = "/tmp/bullion-shots";
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--window-size=390,900"],
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle0", timeout: 30000 });
await page.waitForFunction(() => document.body.innerText.includes("v55"), { timeout: 15000 });

function overflow() {
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    body: document.body.scrollWidth,
  }));
}
async function assertNoScroll(label) {
  const o = await overflow();
  if (o.scroll > o.client + 1 || o.body > o.client + 1) {
    throw new Error(label + " horizontal overflow " + JSON.stringify(o));
  }
}

await assertNoScroll("home closed");
const opened = await page.evaluate(() => {
  const heads = [...document.querySelectorAll(".sh")];
  const h = heads.find((el) => el.textContent.includes("Branded bullion"));
  if (!h) return "missing heading";
  h.click();
  return "ok";
});
if (opened !== "ok") throw new Error(opened);
await page.waitForSelector("#branded-bullion .bbcard");
await assertNoScroll("asks open");

const text = await page.evaluate(() => document.querySelector("#branded-bullion").innerText);
for (const needle of ["77.43", "74.11", "56.61", "Same-time reference premium", "Vs today", "not a sold", "Lady Fortuna 1 oz silver", "USA-logo", "$69", "Purity is not applied again"]) {
  if (!text.includes(needle)) throw new Error("missing text: " + needle);
}
if (!text.includes("No typical resale range and no justified bid is established")) throw new Error("missing blank-bid caveat");
if (/justified bid:\s*\$/i.test(text)) throw new Error("invented bid shown");
const fortuna = text.split("Lady Fortuna 1 oz silver")[1].split("Lady of Liberty")[0];
if (fortuna.includes("56.61")) throw new Error("USA logo price inside Fortuna card");

await page.screenshot({ path: out + "/asks-390.png", fullPage: false });
const card = await page.evaluateHandle(() => [...document.querySelectorAll(".bbname")].find((el) => el.textContent.includes("Lady Fortuna 1 oz silver")));
await card.asElement().scrollIntoView();
await page.screenshot({ path: out + "/fortuna-390.png" });

await page.click("#branded-bullion .bbfilters button:nth-child(2)");
await page.waitForFunction(() => document.body.innerText.includes("Manufacturer EUR list"));
await assertNoScroll("eur");
if ((await page.evaluate(() => document.body.innerText)).includes("USD premium") === false) {
  /* the sentence says no USD premium; presence of the words is expected */
}
const eurText = await page.evaluate(() => document.querySelector("#branded-bullion").innerText);
if (!eurText.includes("€") || eurText.includes("Same-time premium: —") === false) throw new Error("eur block");
await page.screenshot({ path: out + "/eur-390.png" });

await page.click("#branded-bullion .bbfilters button:nth-child(3)");
await page.waitForFunction(() => document.body.innerText.includes("Historical premium"));
await assertNoScroll("sold");
const soldText = await page.evaluate(() => document.querySelector("#branded-bullion").innerText);
if (!soldText.includes("CAD 129.80") || !soldText.includes("USD 905.06")) throw new Error("sold totals " + soldText.slice(0, 400));
if (soldText.includes("CAD 129.80") && soldText.split("2 x 1 oz")[1].includes("not the price of a single bar") === false) throw new Error("lot warning missing");
await page.screenshot({ path: out + "/sold-390.png" });

await page.click("#branded-bullion .bbfilters button:nth-child(1)");
await page.waitForSelector(".bbadd");
const beforeRows = await page.evaluate(() => document.querySelectorAll(".collrow").length);
await page.evaluate(() => {
  const card = [...document.querySelectorAll(".bbcard")].find((el) => el.innerText.includes("USA-logo 1 oz silver"));
  card.querySelector(".bbadd").click();
});
await page.waitForSelector(".collsheet");
const sheet = await page.evaluate(() => document.querySelector(".collsheet").innerText);
if (!sheet.includes("USA-logo")) throw new Error("sheet " + sheet);
await page.evaluate(() => [...document.querySelectorAll(".collsheet button")].find((b) => b.textContent === "Add").click());
await page.waitForFunction(() => document.body.innerText.includes("Added to My Collection"));
if (await page.evaluate(() => document.querySelectorAll(".collrow").length) !== beforeRows) throw new Error("collection row leaked onto Coins");

await page.evaluate(() => [...document.querySelectorAll(".segtop button")].find((b) => b.textContent.startsWith("My Collection")).click());
await page.waitForSelector(".collrow");
const coll = await page.evaluate(() => document.querySelector(".collmain").innerText);
if (!coll.includes("USA-logo") || !coll.includes("melt")) throw new Error("collection row " + coll);
const melt1 = coll;
await page.click(".collacts .addb[aria-label='Increase qty']");
await page.waitForFunction(() => document.body.innerText.includes("×2"));
const coll2 = await page.evaluate(() => document.querySelector(".collmain").innerText);
if (coll2 === melt1) throw new Error("qty did not change melt text");
await page.screenshot({ path: out + "/collection-390.png" });
await assertNoScroll("collection");

await page.evaluate(() => [...document.querySelectorAll(".segtop button")].find((b) => b.textContent === "Coins").click());
await page.waitForFunction(() => !document.querySelector(".collrow"));
const home = await page.evaluate(() => document.body.innerText);
if (home.includes("×2")) throw new Error("collection content still on home");

await page.evaluate(() => {
  const input = document.querySelector("input[placeholder^='1970']");
  input.focus();
  input.value = "sigma";
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction(() => document.body.innerText.includes("Precious Metal Verifier"));
if (!(await page.evaluate(() => document.body.innerText.includes("resistivity")))) throw new Error("sigma text");
await page.screenshot({ path: out + "/sigma-390.png" });
await assertNoScroll("sigma");

if (errors.length) throw new Error("page errors\n" + errors.join("\n"));
console.log("browser checks passed");
console.log("collection before", melt1.replace(/\n/g, " | "));
console.log("collection after", coll2.replace(/\n/g, " | "));
await browser.close();
