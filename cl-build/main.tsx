import { h, render } from "preact";
import App, { setSpot, SPOT, TK, fmtLocal } from "./app";
const root = document.getElementById("app")!;
root.textContent = "";
const draw = () => render(<App />, root);
draw();
const snap = SPOT;
const ok = (a: number, u: number) => a > 5 && a < 500 && u > 500 && u < 20000;
const tm = (u: string) => { const c = new AbortController(); setTimeout(() => c.abort(), 8000); return fetch(u, { signal: c.signal, cache: "no-store" }).then(r => { if (!r.ok) throw 0; return r.json(); }); };
const T = (d: any) => { const n = Date.parse(d); return isNaN(n) ? 0 : n; };
async function refresh() {
  TK.next = Date.now() + 600000;
  const [p, s, g] = await Promise.all([tm("prices.json?t=" + Date.now()).catch(() => null), tm("https://api.gold-api.com/price/XAG").catch(() => null), tm("https://api.gold-api.com/price/XAU").catch(() => null)]);
  const c: { a: number; u: number; t: number; src: string }[] = [];
  if (s && g && ok(+s.price, +g.price)) c.push({ a: Math.round(s.price * 100) / 100, u: Math.round(g.price * 100) / 100, t: Math.min(T(s.updatedAt), T(g.updatedAt)) || Date.now(), src: "gold-api.com live" });
  if (p && ok(+p.silver, +p.gold)) c.push({ a: +p.silver, u: +p.gold, t: T(p.updatedAt), src: p.source || "prices.json" });
  c.sort((x, y) => y.t - x.t);
  if (c[0]) setSpot(c[0].a, c[0].u, "as of " + fmtLocal(c[0].t) + " · " + c[0].src, c[0].t, c[0].src);
  draw();
}
refresh();
setInterval(refresh, 600000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
if ("serviceWorker" in navigator) {
  const had = !!navigator.serviceWorker.controller; let rl = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (had && !rl) { rl = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => { r.update().catch(() => {}); document.addEventListener("visibilitychange", () => { if (!document.hidden) r.update().catch(() => {}); }); }).catch(() => {});
}
