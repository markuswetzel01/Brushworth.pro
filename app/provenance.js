// Brushworth.pro · Provenienz-Nachweis als Word-Datei (im Browser erzeugt)
'use strict';
let _docxLoading = null;
function loadDocx() {
  if (window.docx) return Promise.resolve();
  if (!_docxLoading) _docxLoading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/docx.iife.js'; s.onload = res; s.onerror = () => rej(new Error('docx')); document.head.append(s);
  });
  return _docxLoading;
}

// w = Werk (Schlüssel), s = Einstellungen, lang = 'de'|'en', photo = Blob|null
async function buildProvenance(w, s, lang, photo) {
  await loadDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, Footer, ShadingType, TabStopType, ImageRun } = window.docx;
  const L = I18N[lang], P_ = L.prov, artist = s.artist || '';
  const INK = '1D1C1A', MUTED = '78736B', ACC = '8A5A3C', LINE = 'BFB8AE', SOFT = 'F3F0EB', W = 9638;
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, noB = { top: none, bottom: none, left: none, right: none };
  const under = { top: none, left: none, right: none, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } };
  const grid = { style: BorderStyle.SINGLE, size: 4, color: LINE }, allB = { top: grid, bottom: grid, left: grid, right: grid };
  const t = (x, o = {}) => new TextRun({ text: String(x ?? ''), font: 'Arial', size: o.size || 19, color: o.color || INK, bold: o.bold, italics: o.it });
  const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { before: o.before || 0, after: o.after || 0 }, alignment: o.align, keepNext: o.keepNext });
  const H = x => new Paragraph({ children: [new TextRun({ text: x, font: 'Georgia', size: 24, color: ACC })], spacing: { before: 300, after: 120 }, keepNext: true, keepLines: true, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } } });
  const cell = (children, wd, o = {}) => new TableCell({ children, width: { size: wd, type: WidthType.DXA }, borders: o.b || noB, verticalAlign: o.v || VerticalAlign.BOTTOM, margins: { top: o.mt ?? 60, bottom: o.mb ?? 40, left: o.ml ?? 80, right: o.mr ?? 80 }, shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined });
  const fieldRows = (f, lw, vw) => f.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell([P(t(k, { color: MUTED, size: 17 }))], lw, { ml: 0 }), cell([P(t(v))], vw, { b: under })] }));
  const fieldTable = (f, lw) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [lw, W - lw], rows: fieldRows(f, lw, W - lw) });
  const gridTable = (head, widths, rowsVals) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [
    new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell([P(t(h, { size: 16, color: MUTED, bold: true }))], widths[i], { b: allB, fill: SOFT, v: VerticalAlign.CENTER })) }),
    ...rowsVals.map(vals => new TableRow({ cantSplit: true, height: { value: 520, rule: 'atLeast' }, children: vals.map((v, i) => cell([P(t(v, { size: 17 }))], widths[i], { b: allB, v: VerticalAlign.CENTER })) }))] });
  const lines = n => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: Array.from({ length: n }, () => new TableRow({ height: { value: 440, rule: 'exact' }, children: [cell([P(t(''))], W, { b: under, ml: 0 })] })) });
  const note = x => P(t(x, { size: 15, color: MUTED, it: true }), { before: 80 });
  const sigTable = (cols, widths) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [
    new TableRow({ height: { value: 700, rule: 'atLeast' }, children: cols.map((c, i) => cell([P(t(''))], widths[i], { b: i % 2 === 1 ? noB : under })) }),
    new TableRow({ children: cols.map((c, i) => cell([P(t(c, { size: 15, color: MUTED }))], widths[i], { mt: 40 })) })] });

  // Werte
  const num = v => v === '' || v == null ? '' : (lang === 'de' ? String(v).replace('.', ',') : String(v));
  const dims = [w.w, w.h, w.d].filter(v => v !== '' && v != null).map(num).join(' × ');
  const date = v => { if (!v) return ''; const d = new Date(v + 'T12:00:00'); return isNaN(d) ? String(v) : d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: lang === 'de' ? '2-digit' : 'short', year: 'numeric' }); };
  const sold = date(w.soldDate);
  const owner = w.buyer ? w.buyer : (w.status === 'sold' ? P_.privateColl : artist);
  const listed = (String(w.exh || '') + '\n' + String(w.pub || '')).split(/\n+/).map(x => x.trim()).filter(Boolean);
  const exh = [0, 1, 2, 3].map(i => ['', i < 3 ? (listed[i] || '') : listed.slice(3).join('; '), '']);
  const prov = [[P_.creation + sold, P_.studio(artist), '', '—', P_.catalog],
    w.buyer ? [sold ? P_.since + sold : '', w.buyer, '', '', ''] : ['', '', '', '', ''], ...Array.from({ length: 4 }, () => ['', '', '', '', ''])];
  const techLabel = L.opt.tech[w.tech] || w.tech || '';

  // Foto
  let photoChildren = [P(t(P_.photo, { size: 16, color: MUTED }), { align: AlignmentType.CENTER })];
  if (photo) {
    const bmp = await createImageBitmap(photo); const k = Math.min(180 / bmp.width, 230 / bmp.height, 1);
    photoChildren = [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'jpg', data: await photo.arrayBuffer(), transformation: { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) } })] })];
  }
  const PW = 2900, GAP = 280, FW = W - PW - GAP, LW = 2050, dash = { style: BorderStyle.DASHED, size: 4, color: LINE };
  const fvals = [w.id, w.title, artist, w.year, techLabel, w.support, dims ? dims + ' cm' : '', w.sign, P_.exec, P_.frame];
  const top = new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [PW, GAP, FW], rows: [new TableRow({ children: [
    new TableCell({ width: { size: PW, type: WidthType.DXA }, borders: photo ? noB : { top: dash, bottom: dash, left: dash, right: dash }, verticalAlign: VerticalAlign.CENTER, children: photoChildren }),
    cell([P(t(''))], GAP),
    new TableCell({ width: { size: FW, type: WidthType.DXA }, borders: noB, margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Table({ width: { size: FW, type: WidthType.DXA }, columnWidths: [LW, FW - LW], rows: fieldRows(P_.f.map((k, i) => [k, fvals[i]]), LW, FW - LW) })] })] })] });
  const sig7 = []; P_.sig7.forEach(([who, pd, sg]) => { sig7.push(P(t(who, { size: 18, bold: true }), { before: 200, after: 40, keepNext: true })); sig7.push(sigTable([P_.name, '', pd, '', sg], [3000, 280, 2400, 280, 3678])); });
  const sig6 = P_.sig6(artist);

  const doc = new Document({ creator: artist, title: P_.title + ' ' + w.id, styles: { default: { document: { run: { font: 'Arial', size: 19 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t(P_.foot(artist), { size: 14, color: MUTED }), t('\t' + w.id, { size: 14, color: MUTED })] })] }) },
      children: [P(new TextRun({ text: P_.title, font: 'Georgia', size: 40, color: INK })), P(t(P_.sub, { size: 20, color: MUTED, it: true }), { after: 160 }),
        H(P_.s1), top, H(P_.s2), fieldTable([[P_.f2[0], owner], [P_.f2[1], w.loc], [P_.f2[2], '']], 2600),
        H(P_.s3), gridTable(P_.h3, [1500, 2900, 1700, 1800, 1738], prov), note(P_.n3),
        H(P_.s4), gridTable(P_.h4, [1000, 5338, 3300], exh),
        H(P_.s5), lines(3), H(P_.s6), P(t(P_.t6), { after: 60 }), sigTable([sig6[0], '', sig6[1]], [3600, 400, 5638]),
        H(P_.s7), P(t(P_.t7)), ...sig7, note(P_.n7)] }] });
  return Packer.toBlob(doc);
}
