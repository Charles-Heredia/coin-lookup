let puppeteer;
try { puppeteer = (await import("puppeteer-core")).default; }
catch { puppeteer = (await import("/tmp/pw/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js")).default; }
import { mkdirSync } from "fs";
mkdirSync("/tmp/nugget-shots", { recursive: true });
const browser = await puppeteer.launch({ executablePath: "/usr/local/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
await page.goto("http://127.0.0.1:8765/?t=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(() => document.body.innerText.includes("v57"));
async function overflow(label) {
  const o = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  if (o.scroll > o.client + 1) throw new Error(label + " overflow " + JSON.stringify(o));
}
await overflow("home");
const onCoins = await page.evaluate(() => !!document.querySelector("#nugget-calc"));
if (!onCoins) throw new Error("calculator missing on Coins");
await page.evaluate(() => [...document.querySelectorAll(".segtop button")].find((b) => b.textContent.startsWith("My Collection")).click());
await page.waitForFunction(() => document.body.innerText.includes("Tap + on a year") || document.body.innerText.includes("My Collection"));
if (await page.evaluate(() => !!document.querySelector("#nugget-calc"))) throw new Error("calculator leaked onto My Collection");
await page.evaluate(() => [...document.querySelectorAll(".segtop button")].find((b) => b.textContent === "Coins").click());
await page.waitForSelector("#nugget-calc");
await page.evaluate(() => document.querySelector("#nugget-calc").open = true);
await page.waitForSelector("#ng-grams");
const keypad = await page.evaluate(() => ({
  grams: document.querySelector("#ng-grams").getAttribute("inputmode"),
  purity: document.querySelector("#ng-purity").getAttribute("inputmode"),
  gramLabel: document.querySelector("label[for=ng-grams]").textContent,
  purLabel: document.querySelector("label[for=ng-purity]").textContent
}));
if (keypad.grams !== "decimal" || keypad.purity !== "decimal") throw new Error("keypad " + JSON.stringify(keypad));
if (!keypad.gramLabel.includes("Scale weight") || !keypad.purLabel.includes("unknown until assay")) throw new Error("labels " + JSON.stringify(keypad));
await overflow("open empty");

await page.click("#nugget-calc button[aria-label], #nugget-calc .ngchips button");
await page.evaluate(() => {
  const silver = [...document.querySelectorAll("#nugget-calc .ngchips button")].find((b) => b.textContent === "Silver");
  silver.click();
  const w = [...document.querySelectorAll("#nugget-calc .ngchips button")].find((b) => b.textContent === ".001 g");
  w.click();
});
await page.waitForFunction(() => document.querySelector("#ng-grams").value === "0.001");
let text = await page.evaluate(() => document.querySelector("#nugget-calc").innerText);
if (!text.includes("unknown until assay")) throw new Error("default purity not unknown");
const mainBox = await page.evaluate(() => document.querySelector("#nugget-calc .ngbox").innerText);
if (/\$\d/.test(mainBox)) throw new Error("main result priced without purity: " + mainBox);
const pureBox = await page.evaluate(() => document.querySelector("#nugget-calc .compare").innerText);
if (!pureBox.includes("Not this nugget") || !/\$0\./.test(pureBox)) throw new Error("pure comparison " + pureBox);
if (pureBox.includes("$0.00") && !pureBox.match(/\$0\.00[1-9]/) && pureBox.includes("$0.00\n") ) {
  /* $0.00 would be wrong for .001g pure silver unless spot is tiny; flag exact $0.00 line */
}
if (/\$0\.00\b/.test(pureBox) && !/\$0\.00[1-9]/.test(pureBox)) throw new Error("pure comparison rounded to zero " + pureBox);

await page.screenshot({ path: "/opt/cursor/artifacts/nugget-unknown-390.png" });
await page.evaluate(() => [...document.querySelectorAll("#nugget-calc .ngchips button")].find((b) => b.textContent === "Assume .999").click());
await page.waitForFunction(() => /Intrinsic estimate/.test(document.querySelector("#nugget-calc .ngbox").innerText) && /\$0\.00[1-9]|\$0\.000/.test(document.querySelector("#nugget-calc .ngbox").innerText));
const assumed = await page.evaluate(() => document.querySelector("#nugget-calc .ngbox").innerText);
if (assumed.includes("$0.00") && !/\$0\.00[1-9]|\$0\.000/.test(assumed)) throw new Error("assumed tiny shown as $0 " + assumed);
await page.evaluate(() => document.querySelector("#nugget-calc .ngbox").scrollIntoView({ block: "center" }));
await page.screenshot({ path: "/opt/cursor/artifacts/nugget-silver-fraction-390.png" });

await page.evaluate(() => {
  const one = [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "1 g");
  one.click();
  [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "Sterling (.925)").click();
});
await page.waitForFunction(() => document.querySelector("#ng-purity").value === "92.5");
const sterling = await page.evaluate(() => {
  const NC = window.NuggetCalc;
  const spot = Number(document.querySelector("#nugget-calc .ngspot .ngbig").textContent.replace(/[^0-9.]/g, ""));
  const grams = document.querySelector("#ng-grams").value;
  const est = NC.compute({ metal: "silver", gramsText: grams, purityText: "92.5", purityMode: "percent", spot, now: 1, spotUpdatedMs: 1, spotOk: true });
  const pure = NC.compute({ metal: "silver", gramsText: grams, purityText: "100", purityMode: "percent", spot, now: 1, spotUpdatedMs: 1, spotOk: true });
  const shown = [...document.querySelectorAll("#nugget-calc .ngbox .ngbig")].map((el) => el.textContent.trim());
  return { purity: document.querySelector("#ng-purity").value, grams, factor: est.melt / pure.melt, shownEst: shown.includes(NC.formatUsd(est.melt)), est: NC.formatUsd(est.melt), pure: NC.formatUsd(pure.melt) };
});
if (sterling.purity !== "92.5" || sterling.grams !== "1" || Math.abs(sterling.factor - 0.925) > 1e-12 || !sterling.shownEst) throw new Error("sterling factor " + JSON.stringify(sterling));
await page.evaluate(() => [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "Gold").click());
await page.waitForFunction(() => !document.querySelector("#nugget-calc").innerText.includes("Sterling"));
await page.evaluate(() => [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "Silver").click());
await page.waitForFunction(() => document.querySelector("#nugget-calc").innerText.includes("Sterling (.925)"));
await page.evaluate(() => document.querySelector("#nugget-calc .ngbox").scrollIntoView({ block: "center" }));
await page.screenshot({ path: "/opt/cursor/artifacts/nugget-sterling-390.png" });

await page.evaluate(() => {
  const input = document.querySelector("#ng-grams");
  input.focus();
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(input, "-1");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction(() => document.body.innerText.includes("cannot be negative"));
const neg = await page.evaluate(() => document.querySelector("#nugget-calc .ngbox").innerText);
if (/\$\d/.test(neg)) throw new Error("negative weight still priced " + neg);

await page.evaluate(() => [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "Gold").click());
await page.waitForSelector("#ng-karat");
await page.evaluate(() => {
  const input = document.querySelector("#ng-grams");
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(input, "10");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  [...document.querySelectorAll("#nugget-calc button")].find((b) => b.textContent.trim() === "Assume 22k").click();
});
await page.waitForFunction(() => document.querySelector("#nugget-calc").innerText.includes("22k"));
const goldText = await page.evaluate(() => document.querySelector("#nugget-calc").innerText);
if (!goldText.includes("assumption, not an assay")) throw new Error("karat not labeled as assumption");
if (!goldText.includes("91.666")) throw new Error("22k percent missing " + goldText.slice(0, 500));
await overflow("filled");
await page.evaluate(() => document.querySelector("#nugget-calc").scrollIntoView({ block: "start" }));
await page.screenshot({ path: "/opt/cursor/artifacts/nugget-gold-22k-390.png" });

await page.evaluate(() => {
  const input = document.querySelector("input[placeholder^='1970']");
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(input, "nugget");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForFunction(() => document.body.innerText.includes("Grading: nugget"));
await page.evaluate(() => [...document.querySelectorAll("section, div, h2, b")].find((el) => el.textContent.trim().startsWith("Grading: nugget"))?.scrollIntoView({ block: "start" }));
await page.screenshot({ path: "/opt/cursor/artifacts/nugget-learning-390.png" });
await overflow("search");
if (errors.length) throw new Error(errors.join("\n"));
console.log("browser nugget checks passed");
await browser.close();
