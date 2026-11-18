// Brushworth.pro · Preis-Engine v10 (Logik unverändert aus brushworth-engine.js)
'use strict';
const BW = {
  qmBase: 950,
  comp: { skizze: 0.6, standard: 1.0, medium: 1.6, hoch: 2.5, meister: 4.0 },
  edit: { original: 1.0, ed5: 0.45, ed20: 0.25, ed50: 0.15 },
  tech: { drawing: 1.0, acrylic: 1.5, pastel: 1.8, watercolor: 2.5, oil: 2.8, mixed: 3.2 },
  mkt: { emerging: 1.0, established: 2.2, collected: 3.0, international: 5.0, museum: 10, bluechip: 25 },
  geoUplift: { regional: 0, national: 0.25, international: 0.60, artbasel: 1.20 },
  sizeCurve(qm) { if (qm < 0.15) return 1.5; if (qm < 0.50) return 1.0; if (qm < 1.50) return 0.65; if (qm < 4.0) return 0.40; return 0.28; },
  // i: {w,h (cm), tech, comp, mkt, geo, edit, mat, frm, vat, gall, infl, mult, round}
  calc(i) {
    const qm = (i.w * i.h) / 10000, cF = this.comp[i.comp] || 1, eF = this.edit[i.edit] || 1, sz = this.sizeCurve(qm);
    const tech = this.tech[i.tech] || 1, mkt = this.mkt[i.mkt] || 1;
    const geoUp = this.geoUplift[i.geo] || 0, g = (1 + i.infl / 100) * i.mult;
    const baseEff = qm * this.qmBase * sz;
    const eurBase = baseEff * g, eurComp = baseEff * (cF - 1) * g, eurTech = baseEff * cF * (tech - 1) * g;
    const craft = baseEff * cF * tech * g, eurName = craft * (mkt - 1), eurGeo = eurName * geoUp;
    const subtotal = craft + eurName + eurGeo, eurEdit = subtotal * (eF - 1), artNet = subtotal * eF;
    const fixed = i.mat + i.frm, vatM = 1 + i.vat / 100;
    let gross = (artNet + fixed) * vatM;
    if (i.round === '10') gross = Math.ceil(gross / 10) * 10;
    if (i.round === '100') gross = Math.ceil(gross / 100) * 100;
    const netAfterFixed = gross / vatM - fixed, gallFee = i.gall > 0 ? netAfterFixed * (i.gall / 100) : 0;
    const refCraft = baseEff * this.comp.medium * tech * g;
    const refGross = (refCraft * (1 + (mkt - 1) + (mkt - 1) * geoUp) * eF + fixed) * vatM;
    const rating = qm > 0 ? (refGross <= 0 ? 'good' : (gross / refGross < 0.38 ? 'low' : gross / refGross > 2.6 ? 'high' : 'good')) : 'small';
    const lines = [['bdQm', 'var(--ink)', eurBase], ['bdComp', '#4a3d2d', eurComp], ['bdTech', '#6b5942', eurTech], ['bdMarket', '#9c6e1f', eurName], ['bdGeo', '#b89968', eurGeo]]
      .map(([k, c, e]) => ({ k, c, e: e * vatM }));
    if (Math.abs(eurEdit) > 0.5) lines.push({ k: 'bdEdit', c: '#7a5230', e: eurEdit * vatM });
    if (fixed > 0) lines.push({ k: 'bdFixed', c: '#536b5d', e: fixed * vatM });
    if (i.vat > 0) lines.push({ k: 'bdVat', c: '#a89682', e: (artNet + fixed) * (i.vat / 100) });
    const corr = gross / (lines.reduce((s, l) => s + l.e, 0) || 1);
    return { qm, gross, artNet, gallFee, profit: netAfterFixed - gallFee, rating, lo: gross * 0.82, hi: gross * 1.18, bd: lines.map(l => ({ ...l, e: l.e * corr })) };
  }
};
