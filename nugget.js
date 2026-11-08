/* Raw nugget math. Purity is never assumed. 1 troy oz = 31.1034768 g exactly. */
(function (root) {
  var TROY_G = 31.1034768;
  var MAX_GRAMS = 1e7;

  function parseDecimal(text) {
    if (text == null) return { state: "empty" };
    var raw = String(text).trim();
    if (raw === "") return { state: "empty" };
    if (raw.indexOf(",") >= 0 && raw.indexOf(".") >= 0) return { state: "error", message: "Use a decimal point." };
    var s = raw.indexOf(",") >= 0 ? raw.replace(",", ".") : raw;
    if (!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s)) return { state: "error", message: "Enter a number." };
    var n = Number(s);
    if (!Number.isFinite(n)) return { state: "error", message: "Enter a finite number." };
    return { state: "ok", value: n };
  }

  function parseWeight(text) {
    var p = parseDecimal(text);
    if (p.state !== "ok") return p;
    if (p.value < 0) return { state: "error", message: "Weight cannot be negative." };
    if (p.value > MAX_GRAMS) return { state: "error", message: "Weight is out of range (over 10,000,000 g)." };
    return p;
  }

  function parsePercent(text) {
    var p = parseDecimal(text);
    if (p.state !== "ok") return p;
    if (p.value < 0) return { state: "error", message: "Purity cannot be negative." };
    if (p.value > 100) return { state: "error", message: "Purity cannot be over 100%." };
    return p;
  }

  function parseKarat(text) {
    var p = parseDecimal(text);
    if (p.state !== "ok") return p;
    if (p.value < 0) return { state: "error", message: "Karat cannot be negative." };
    if (p.value > 24) return { state: "error", message: "Karat cannot be over 24." };
    return { state: "ok", value: p.value, percent: (p.value / 24) * 100 };
  }

  function spotStatus(now, updatedMs, ok) {
    if (!ok) return { label: "Embedded snapshot", stale: true, detail: "Not a fresh market tick." };
    if (!updatedMs) return { label: "Time unknown", stale: true, detail: "No timestamp on this spot." };
    var ageMin = (now - updatedMs) / 60000;
    if (!Number.isFinite(ageMin) || ageMin < 0) return { label: "Time unknown", stale: true, detail: "Spot time could not be read." };
    if (ageMin > 60) return { label: "Stale", stale: true, detail: Math.round(ageMin) + " minutes old" };
    if (ageMin >= 15) return { label: "Aging", stale: false, detail: Math.round(ageMin) + " minutes old" };
    return { label: "Recent", stale: false, detail: Math.round(ageMin) + " minutes old" };
  }

  function formatUsd(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    var sign = n < 0 ? "−" : "";
    var abs = Math.abs(n);
    if (abs === 0) return "$0.00";
    if (abs >= 0.01) return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var digits = Math.min(6, Math.max(2, Math.ceil(-Math.log10(abs)) + 1));
    var s = abs.toFixed(digits);
    if (Number(s) === 0) return sign + "$" + abs.toExponential(2);
    return sign + "$" + s;
  }

  function formatQty(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    var digits = abs >= 1 ? 6 : Math.min(8, Math.max(4, Math.ceil(-Math.log10(abs)) + 2));
    var s = abs.toFixed(digits).replace(/\.?0+$/, "");
    if (Number(s) === 0) return (n < 0 ? "-" : "") + abs.toExponential(2);
    return (n < 0 ? "-" : "") + s;
  }

  function compute(input) {
    var metal = input.metal === "silver" ? "silver" : "gold";
    var weight = parseWeight(input.gramsText);
    var purityState = "unknown";
    var purityPercent = null;
    var karat = null;
    var purityError = null;
    var mode = input.purityMode || "unknown";
    if (mode === "karat") {
      var k = parseKarat(input.karatText);
      if (k.state === "empty") purityState = "unknown";
      else if (k.state === "error") { purityState = "error"; purityError = k.message; }
      else { purityState = "ok"; purityPercent = k.percent; karat = k.value; }
    } else if (mode === "percent") {
      var pc = parsePercent(input.purityText);
      if (pc.state === "empty") purityState = "unknown";
      else if (pc.state === "error") { purityState = "error"; purityError = pc.message; }
      else {
        purityState = "ok";
        purityPercent = pc.value;
        if (metal === "gold") karat = purityPercent / 100 * 24;
      }
    }
    var spot = input.spot;
    var spotOk = Number.isFinite(spot) && spot > 0 && spot < 1e9;
    var status = spotStatus(input.now || 0, input.spotUpdatedMs || 0, !!input.spotOk);
    var out = {
      metal: metal,
      troyG: TROY_G,
      weightState: weight.state,
      grams: weight.state === "ok" ? weight.value : null,
      gramsError: weight.state === "error" ? weight.message : null,
      purityState: purityState,
      purityPercent: purityPercent,
      karat: karat,
      purityError: purityError,
      fineGrams: null,
      fineTroyOz: null,
      melt: null,
      perGram: null,
      pureGrams: null,
      pureTroyOz: null,
      pureMelt: null,
      spot: spotOk ? spot : null,
      spotError: spotOk ? null : "Spot is unavailable.",
      spotStatus: status,
      spotLabel: input.spotLabel || "",
      spotSrc: input.spotSrc || ""
    };
    if (weight.state !== "ok") return out;
    out.pureGrams = weight.value;
    out.pureTroyOz = weight.value / TROY_G;
    if (spotOk) out.pureMelt = out.pureTroyOz * spot;
    if (purityState === "ok") {
      out.fineGrams = weight.value * (purityPercent / 100);
      out.fineTroyOz = out.fineGrams / TROY_G;
      if (spotOk) {
        out.melt = out.fineTroyOz * spot;
        out.perGram = weight.value > 0 ? out.melt / weight.value : 0;
      }
    }
    return out;
  }

  root.NuggetCalc = {
    TROY_G: TROY_G,
    MAX_GRAMS: MAX_GRAMS,
    WEIGHTS: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1],
    parseDecimal: parseDecimal,
    parseWeight: parseWeight,
    parsePercent: parsePercent,
    parseKarat: parseKarat,
    spotStatus: spotStatus,
    formatUsd: formatUsd,
    formatQty: formatQty,
    compute: compute
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
