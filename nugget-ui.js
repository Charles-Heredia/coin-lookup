/* Raw nugget calculator UI. Purity stays unknown until the user enters an assumption. */
window.renderNugget = function (api) {
  var a = api.a, D = api.D, NC = window.NuggetCalc;
  var metalState = D("gold");
  var metal = metalState[0], setMetal = metalState[1];
  var gramsState = D("");
  var grams = gramsState[0], setGrams = gramsState[1];
  var purityState = D("");
  var purity = purityState[0], setPurity = purityState[1];
  var karatState = D("");
  var karat = karatState[0], setKarat = karatState[1];
  var modeState = D("unknown");
  var mode = modeState[0], setMode = modeState[1];

  function pickMetal(next) {
    if (next === "silver" && mode === "karat") {
      var parsed = NC.parseKarat(karat);
      if (parsed.state === "ok") setPurity(String(Math.round(parsed.percent * 1e8) / 1e8));
      setKarat("");
      setMode(parsed.state === "ok" || String(purity).trim() !== "" ? "percent" : "unknown");
    }
    setMetal(next);
  }
  function onPurity(v) {
    setPurity(v);
    setKarat("");
    setMode(String(v).trim() === "" ? "unknown" : "percent");
  }
  function onKarat(v) {
    setKarat(v);
    setMode(String(v).trim() === "" ? "unknown" : "karat");
  }
  function assume(preset) {
    if (preset.mode === "karat") {
      setKarat(preset.value);
      setPurity("");
      setMode("karat");
    } else {
      setPurity(preset.value);
      setKarat("");
      setMode("percent");
    }
  }

  var spot = metal === "silver" ? api.ag : api.au;
  var r = NC.compute({
    metal: metal,
    gramsText: grams,
    purityText: purity,
    karatText: karat,
    purityMode: mode,
    spot: spot,
    now: Date.now(),
    spotUpdatedMs: api.spotUpdated || 0,
    spotOk: !!api.spotOk,
    spotSrc: api.spotSrc || "",
    spotLabel: api.spotLabel || ""
  });

  function chip(on, label, click) {
    return a("button", { type: "button", class: on ? "on" : "", "aria-pressed": on ? "true" : "false", onClick: click, children: label });
  }
  var weights = NC.WEIGHTS.map(function (w) {
    var text = String(w);
    return chip(grams === text, (w < 1 ? String(w).replace(/^0/, "") : text) + " g", function () { setGrams(text); });
  });
  var presets = metal === "gold"
    ? [{ mode: "percent", value: "50", label: "Assume 50%" }, { mode: "percent", value: "75", label: "Assume 75%" }, { mode: "percent", value: "90", label: "Assume 90%" }, { mode: "karat", value: "10", label: "Assume 10k" }, { mode: "karat", value: "14", label: "Assume 14k" }, { mode: "karat", value: "18", label: "Assume 18k" }, { mode: "karat", value: "22", label: "Assume 22k" }, { mode: "karat", value: "24", label: "Assume 24k" }]
    : [{ mode: "percent", value: "50", label: "Assume 50%" }, { mode: "percent", value: "75", label: "Assume 75%" }, { mode: "percent", value: "90", label: "Assume 90%" }, { mode: "percent", value: "99.9", label: "Assume .999" }];

  var assumed = "Assumed purity: unknown until assay";
  if (r.purityState === "error") assumed = r.purityError;
  else if (r.purityState === "ok" && mode === "karat") assumed = "Assumed purity: " + NC.formatQty(r.karat) + "k (" + NC.formatQty(r.karat) + "/24 = " + NC.formatQty(r.purityPercent) + "%). This is an assumption, not an assay.";
  else if (r.purityState === "ok") assumed = "Assumed purity: " + NC.formatQty(r.purityPercent) + "%" + (metal === "gold" && r.karat != null ? " · about " + NC.formatQty(r.karat) + "k" : "") + ". This is an assumption, not an assay.";

  var meltBlock;
  if (r.weightState === "empty") meltBlock = a("p", { class: "ngsub", children: "Enter a weight in grams. No value is shown yet." });
  else if (r.weightState === "error") meltBlock = a("p", { class: "ngerr", role: "alert", children: r.gramsError });
  else if (r.purityState === "unknown") meltBlock = a("div", { children: [
    a("div", { class: "ngsub", children: "Intrinsic estimate at assumed purity" }),
    a("div", { class: "ngbig", children: "—" }),
    a("p", { class: "ngsub", children: "Fine metal: — until you enter an assumed purity." })
  ] });
  else if (r.purityState === "error") meltBlock = a("p", { class: "ngerr", role: "alert", children: r.purityError });
  else meltBlock = a("div", { children: [
    a("div", { class: "ngsub", children: "Fine metal at the assumed purity" }),
    a("div", { class: "ngbig", children: NC.formatQty(r.fineGrams) + " g" }),
    a("p", { class: "ngsub", children: NC.formatQty(r.fineTroyOz) + " troy oz · ÷ " + NC.TROY_G }),
    a("div", { class: "ngsub", children: "Intrinsic estimate for this weight" }),
    a("div", { class: "ngbig", children: r.spotError ? "—" : NC.formatUsd(r.melt) }),
    a("p", { class: "ngsub", children: r.grams > 0 && r.melt != null ? "Per gram of scale weight: " + NC.formatUsd(r.perGram) : (r.grams === 0 ? "Scale weight is 0 g, so the estimate is $0.00 at this assumption." : "") }),
    r.spotError ? a("p", { class: "ngerr", children: r.spotError }) : null
  ] });

  var pure = null;
  if (r.weightState === "ok" && r.pureMelt != null) {
    pure = a("div", { class: "ngbox compare", children: [
      a("div", { class: "ngsub", children: "Pure-metal comparison. Not this nugget." }),
      a("div", { class: "ngbig", children: NC.formatUsd(r.pureMelt) }),
      a("p", { class: "ngnote", children: "If the entire " + NC.formatQty(r.grams) + " g were 100% " + metal + " with no rock, melt at the spot above would be " + NC.formatUsd(r.pureMelt) + " (" + NC.formatQty(r.pureTroyOz) + " troy oz). A raw nugget is not that." })
    ] });
  }

  return a("details", { id: "nugget-calc", class: "ng", children: [
    a("summary", { children: "Raw nugget calculator" }),
    a("p", { class: "ngnote", children: "Gold or silver in grams. Natural nuggets are not pure until assayed. The estimate uses only a purity you enter. It is not an appraisal, a dealer bid, or a collectible premium." }),
    a("div", { class: "ngchips", role: "group", "aria-label": "Nugget metal", children: [
      chip(metal === "gold", "Gold", function () { pickMetal("gold"); }),
      chip(metal === "silver", "Silver", function () { pickMetal("silver"); })
    ] }),
    a("div", { class: "ngspot", children: [
      a("div", { class: "ngsub", children: (metal === "gold" ? "Gold" : "Silver") + " spot" }),
      a("div", { class: "ngbig", children: r.spot == null ? "—" : NC.formatUsd(r.spot) + " / oz" }),
      a("p", { class: "ngsub", children: r.spotLabel || "Spot time not available" }),
      a("p", { class: "ngsub", children: r.spotStatus.label + " · " + r.spotStatus.detail })
    ] }),
    a("label", { for: "ng-grams", children: "Scale weight (grams)" }),
    a("input", { id: "ng-grams", inputMode: "decimal", enterKeyHint: "done", autoComplete: "off", placeholder: "grams, such as .25", value: grams, onInput: function (ev) { setGrams(ev.target.value); } }),
    a("div", { class: "ngchips", role: "group", "aria-label": "Quick weights", children: weights }),
    a("label", { for: "ng-purity", children: "Assumed purity (%) — unknown until assay" }),
    a("input", { id: "ng-purity", inputMode: "decimal", enterKeyHint: "done", autoComplete: "off", placeholder: "leave blank if unknown", value: mode === "karat" ? "" : purity, onInput: function (ev) { onPurity(ev.target.value); } }),
    metal === "gold" ? a("label", { for: "ng-karat", children: "Or assume karat (24k = 100%). Not a measurement." }) : null,
    metal === "gold" ? a("input", { id: "ng-karat", inputMode: "decimal", enterKeyHint: "done", autoComplete: "off", placeholder: "blank unless you assume a karat", value: mode === "karat" ? karat : "", onInput: function (ev) { onKarat(ev.target.value); } }) : null,
    a("div", { class: "ngchips", role: "group", "aria-label": "Purity assumptions", children: presets.map(function (p) {
      var on = p.mode === "karat" ? mode === "karat" && karat === p.value : mode === "percent" && purity === p.value;
      return chip(on, p.label, function () { assume(p); });
    }) }),
    a("p", { class: r.purityState === "error" ? "ngerr" : "ngnote", children: assumed }),
    a("div", { class: "ngbox", children: meltBlock }),
    pure,
    a("p", { class: "ngnote", children: "Fine grams = scale grams × assumed purity ÷ 100. Troy ounces = fine grams ÷ 31.1034768. Intrinsic estimate = troy ounces × the spot above. If the scale weight includes quartz, rock, or dirt, that is gross weight and this estimate is high. Enter metal weight only." }),
    a("p", { class: "ngnote", children: "Refining, shipping, and a buyer’s discount mean a purchase price or a resale price can differ from melt. Nothing here adds a nugget premium or a dealer bid." })
  ] });
};
