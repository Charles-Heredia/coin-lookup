/* Branded bullion reference. Data is window.BBDATA from the Nov 6, 2026 HST check. */
window.bbRender = function (api) {
  const { a, W, He, D, U, ag, au, spotLabel, spotSrc } = api;
  const data = window.BBDATA;
  if (!data) return a(W, { heading: "Branded bullion", children: "Branded bullion data did not load." });
  const [view, setView] = D("asks");
  const [metal, setMetal] = D("all");
  const [maker, setMaker] = D("all");

  function money(n) {
    if (n == null || !Number.isFinite(+n)) return "—";
    return U(+n);
  }
  function signed(n) {
    if (n == null || !Number.isFinite(+n)) return "—";
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + U(Math.abs(+n));
  }
  function pct(n) {
    if (n == null || !Number.isFinite(+n)) return "—";
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + Math.abs(+n).toFixed(2) + "%";
  }
  function pur(p) {
    if (p == null) return "—";
    if (Math.abs(p - 0.9999) < 1e-9) return ".9999";
    if (Math.abs(p - 0.999) < 1e-9) return ".999";
    return String(p);
  }
  function kids(list) { return list.filter((x) => x != null && x !== false); }
  function liveMelt(fineOz, metalName) {
    if (fineOz == null) return null;
    return fineOz * (metalName === "gold" ? au : ag);
  }
  function chip(id, current, set, label) {
    return a("button", {
      type: "button",
      class: current === id ? "on" : "",
      "aria-pressed": current === id ? "true" : "false",
      onClick: () => set(id),
      children: label,
    });
  }
  function addBtn(item) {
    if (!item.add || !(item.fineOz > 0) || !(item.purity > 0)) return null;
    return a("button", {
      type: "button",
      class: "bbadd",
      "aria-label": "Add " + item.name + " to collection",
      onClick: (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        dispatchEvent(new CustomEvent("cl-coll-add", {
          detail: {
            sid: "bb:" + item.id,
            lab: item.name,
            iss: item.weight,
            coin: item.maker + " bullion",
            grades: { bb: 1, metal: item.metal, fineOz: item.fineOz, purity: item.purity },
          },
        }));
      },
      children: "+",
    });
  }
  function meltBlock(fineOz, metalName) {
    const melt = liveMelt(fineOz, metalName);
    return a("div", { class: "bbmelt", children: [
      a("div", { class: "bbsub", children: "Melt now" }),
      a("div", { class: "bbbig", children: money(melt) }),
      a("div", { class: "bbsub", children: fineOz == null
        ? "No verified fine weight, so melt is blank."
        : "Labeled fine weight " + trimOz(fineOz) + " troy oz × app spot. Purity is not applied again." }),
    ] });
  }
  function trimOz(n) {
    const s = n.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }
  function vsBlock(price, fineOz, metalName, inactive) {
    if (price == null || fineOz == null) {
      return a("p", { class: "bbnote", children: "Vs today’s app spot: —" });
    }
    const melt = liveMelt(fineOz, metalName);
    const d = price - melt;
    const p = melt > 0 ? (d / melt) * 100 : null;
    return a("p", { class: "bbnote", children: (inactive ? "Inactive displayed price" : "Dated ask") + " vs today’s app spot (" + spotLabel + ", " + spotSrc + "): " + signed(d) + " (" + pct(p) + "). This follows the ticker, which can be cached. It is not the same-time dealer premium and not a sold premium." });
  }
  function sameTime(q) {
    if (q.premUsd == null && q.premPct == null) {
      return a("p", { class: "bbnote", children: "Same-time reference premium: —" + (q.spot == null ? " No dealer spot was captured with this ask, so none is calculated." : " Not calculated for this quote.") });
    }
    return a("p", { class: "bbnote", children: "Same-time reference premium: " + signed(q.premUsd) + " (" + pct(q.premPct) + ") against displayed spot " + money(q.spot) + (q.spotChecked ? " checked " + q.spotChecked : "") + ". " + (q.premBasis || "Ask minus labeled fine weight times that spot.") });
  }
  function quoteBlock(line, q) {
    const price = q.ask != null ? q.ask : null;
    const inactive = q.ask == null && q.inactive != null;
    const shown = price != null ? price : q.inactive;
    return a("div", { class: "bbquote", children: kids([
      a("div", { class: "bbsub bbcenter", children: q.dealer + " · " + (q.stock || "Stock unknown") }),
      a("div", { class: "bbsub bbcenter", children: price != null ? "Cash single-unit ask" : inactive ? "Inactive displayed price (not an available ask)" : "Ask" }),
      a("div", { class: "bbbig", children: shown == null ? "—" : money(shown) }),
      sameTime(q),
      vsBlock(shown, line.fineOz, line.metal, inactive || price == null && shown != null),
      q.tier ? a("p", { class: "bbnote", children: "Tier: " + q.tier }) : null,
      q.pay ? a("p", { class: "bbnote", children: "Payment: " + q.pay }) : null,
      q.ship ? a("p", { class: "bbnote", children: "Shipping and tax: " + q.ship }) : null,
      a("p", { class: "bbnote", children: "Checked: " + q.checked }),
      q.note ? a("p", { class: "bbnote", children: q.note }) : null,
      a("a", { class: "bblink", href: q.url, target: "_blank", rel: "noopener noreferrer", children: "Source · " + q.dealer }),
    ]) });
  }
  function rangeBlock(quotes) {
    const asks = quotes.filter((q) => q.ask != null);
    if (asks.length < 2) return null;
    const vals = asks.map((q) => q.ask);
    const lo = Math.min.apply(null, vals);
    const hi = Math.max.apply(null, vals);
    const allIn = asks.every((q) => q.stock === "In stock");
    return a("p", { class: "bbnote", children: "Observed cash asks: " + money(lo) + " – " + money(hi) + " (" + asks.length + " quotes). Not a sold range and not a typical price." + (allIn ? " Each of these was in stock at the check." : " Stock is not the same on every quote.") });
  }
  function lineCard(line) {
    return a("article", { class: "bbcard", children: kids([
      a("div", { class: "bbhead", children: [
        a("div", { children: [
          a("div", { class: "bbname", children: line.name }),
          a("div", { class: "bbmeta", children: line.maker + " · " + (line.metal === "gold" ? "Gold" : "Silver") + " · " + line.weight + " · " + pur(line.purity) }),
        ] }),
        addBtn(line),
      ] }),
      a("p", { class: "bbnote", children: line.pack }),
      meltBlock(line.fineOz, line.metal),
      rangeBlock(line.quotes),
      ...line.quotes.map((q) => quoteBlock(line, q)),
    ]) });
  }
  function matches(item) {
    if (metal !== "all" && item.metal !== metal) return false;
    if (maker !== "all" && item.maker !== maker) return false;
    return true;
  }
  function withHeads(items, render) {
    const out = [];
    let prev = "";
    items.forEach((item) => {
      const key = item.maker + " · " + (item.metal === "gold" ? "Gold" : item.metal === "silver" ? "Silver" : "Metal not stated");
      if (key !== prev) {
        prev = key;
        out.push(a("h2", { class: "bbh", children: key }));
      }
      out.push(render(item));
    });
    return out;
  }
  function cur(code, n) {
    if (n == null || !Number.isFinite(+n)) return "—";
    const body = Math.abs(+n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? "−" : "") + code + " " + body;
  }
  function soldCard(s) {
    return a("article", { class: "bbcard", children: kids([
      a("div", { class: "bbname", children: s.maker + (s.metal ? " " + s.metal : "") + " · " + s.weight }),
      s.line ? a("p", { class: "bbnote", children: s.line }) : null,
      s.condition ? a("p", { class: "bbnote", children: s.condition }) : null,
      a("div", { class: "bbsub bbcenter", children: "Lot total · " + (s.date || "date not stated") + (s.lot != null ? " · lot " + s.lot : "") }),
      a("div", { class: "bbbig", children: cur(s.currency, s.total) }),
      a("p", { class: "bbnote", children: s.totalLabel || "Lot total as archived" }),
      s.count > 1 ? a("p", { class: "bbnote", children: "This is one lot of " + s.count + ". The lot total is not the price of a single bar, and it is not " + s.count + " separate sales." }) : null,
      s.hammerLot != null ? a("p", { class: "bbnote", children: "Hammer for the lot: " + cur(s.currency, s.hammerLot) }) : null,
      s.buyerPremiumAmt != null ? a("p", { class: "bbnote", children: "Buyer premium on the lot: " + cur(s.currency, s.buyerPremiumAmt) }) : null,
      s.buyerPremiumPct != null ? a("p", { class: "bbnote", children: "Buyer premium: " + s.buyerPremiumPct + "%" }) : null,
      s.hammerPerBar != null ? a("p", { class: "bbnote", children: "Archived hammer per bar inside this lot: " + cur(s.currency, s.hammerPerBar) + ". Not a separate sale." }) : null,
      s.perBar != null ? a("p", { class: "bbnote", children: "Archived per-bar figure inside this lot: " + cur(s.currency, s.perBar) + ". Not a separate sale and not a market rate." }) : null,
      a("p", { class: "bbnote", children: "Historical premium: — Sale-date spot was not captured, so no premium is calculated." }),
      a("p", { class: "bbnote", children: s.status }),
      a("a", { class: "bblink", href: s.url, target: "_blank", rel: "noopener noreferrer", children: "Source · " + s.maker + " sold lot" }),
    ]) });
  }
  function officialCard(o) {
    return a("article", { class: "bbcard", children: kids([
      a("div", { class: "bbhead", children: [
        a("div", { children: [
          a("div", { class: "bbname", children: o.name }),
          a("div", { class: "bbmeta", children: [o.form, o.weight, pur(o.purity)].concat(o.extras).filter(Boolean).join(" · ") }),
        ] }),
        addBtn(o),
      ] }),
      meltBlock(o.fineOz, o.metal),
      a("div", { class: "bbsub bbcenter", children: "Manufacturer EUR list (not converted to USD)" }),
      a("div", { class: "bbbig", children: o.eur || "—" }),
      o.eurRegular ? a("p", { class: "bbnote bbcenter", children: "Regular price on the list: " + o.eurRegular }) : null,
      a("p", { class: "bbnote", children: "No USD ask is matched to this row. EUR is not turned into a dollar premium. Same-time premium: —" }),
      a("p", { class: "bbnote", children: "Checked: " + o.checked }),
      a("a", { class: "bblink", href: o.url, target: "_blank", rel: "noopener noreferrer", children: "Source · Geiger price list" }),
    ]) });
  }

  const shownLines = data.lines.filter(matches);
  const shownOfficial = data.official.filter(matches);
  const shownSold = data.sold.filter(matches);
  let body;
  if (view === "asks") {
    body = shownLines.length ? withHeads(shownLines, lineCard) : [a(He, { children: "No dealer-ask rows for that filter." })];
  } else if (view === "eur") {
    body = shownOfficial.length ? withHeads(shownOfficial, officialCard) : [a(He, { children: "No manufacturer EUR rows for that filter. Empty PAMP and Valcambi inventory rows were not turned into products." })];
  } else {
    body = shownSold.length ? withHeads(shownSold, soldCard) : [a(He, { children: "No sold lots for that filter." })];
  }

  return a("div", { id: "branded-bullion", children: a(W, {
    heading: "Branded bullion",
    collapsible: true,
    defaultOpen: false,
    caption: "Geiger, PAMP, Valcambi · dated asks, not sold prices",
    children: [
      a(He, { children: "Dealer prices are asks observed on 2026-11-06 HST (" + data.lines.reduce((n, l) => n + l.quotes.length, 0) + " quotes). They are not sold prices and may be gone. Card, crypto, and quantity tiers are not substituted for the cash single-unit figure. Shipping and tax are excluded. A blank means that value was not established." }),
      a(He, { children: "Melt uses the labeled fine weight times the app’s live spot (the ticker). A 1 oz .999 bar is already one troy ounce of metal, so purity is not discounted again. “Same-time reference premium” uses only a dealer spot captured with that ask. “Vs today’s app spot” moves when the ticker moves and is not that historical premium. The ticker can be cached." }),
      a(He, { children: "Brand, fractional size, and assay packaging can put an ask far above melt. Nothing here shows a buyback. Paying the ask does not mean that premium comes back on resale. Dealer bids can be much lower." }),
      a(He, { children: "Geiger Original square, cast, Security Line, and the vintage rectangle are different bars. PAMP Lady Fortuna, Rosa, cast, and the USA-logo bar are different products. A Valcambi CombiBar price is for the full sheet, not a detached gram." }),
      a("div", { class: "bbfilters", role: "group", "aria-label": "Bullion view", children: [
        chip("asks", view, setView, "Dealer asks"),
        chip("eur", view, setView, "Geiger EUR list"),
        chip("sold", view, setView, "Sold lots"),
      ] }),
      a("div", { class: "bbfilters", role: "group", "aria-label": "Metal", children: [
        chip("all", metal, setMetal, "All metals"),
        chip("gold", metal, setMetal, "Gold"),
        chip("silver", metal, setMetal, "Silver"),
      ] }),
      a("div", { class: "bbfilters", role: "group", "aria-label": "Maker", children: [
        chip("all", maker, setMaker, "All makers"),
        chip("Geiger", maker, setMaker, "Geiger"),
        chip("PAMP", maker, setMaker, "PAMP"),
        chip("Valcambi", maker, setMaker, "Valcambi"),
        chip("Johnson Matthey", maker, setMaker, "JM sold"),
      ] }),
      ...body,
      view === "asks" ? a("div", { class: "bbcard", children: [
        a("div", { class: "bbname", children: "Not established in this check" }),
        ...data.gaps.map((g) => a("p", { class: "bbnote", children: g })),
      ] }) : null,
      view === "sold" ? a(He, { children: data.soldRule }) : null,
      a(He, { children: "Bar checks: Sigma Metalytics Precious Metal Verifier is under Grading basics. It screens electrical resistivity. It is not a guarantee, and weight and size still matter." }),
    ],
  }) });
};
