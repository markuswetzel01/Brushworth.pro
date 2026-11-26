// Brushworth.pro · Leihvertrag als Word-Datei (im Browser erzeugt)
'use strict';
// w = Werk, s = Einstellungen, lang = 'de'|'en', photo = Blob|null, L = { name, addr, from, to, value, buy, fee } (Rohwerte)
async function buildLoan(w, s, lang, photo, L) {
  await loadDocx();
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign, Footer, TabStopType, ImageRun } = window.docx;
  const loc = lang === 'de' ? 'de-DE' : 'en-GB';
  const money = x => { const n = parseFloat(String(x || '').replace(',', '.')); return isNaN(n) || !n ? '' : new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); };
  const date = v => { if (!v) return ''; const d = new Date(v + 'T12:00:00'); return isNaN(d) ? String(v) : d.toLocaleDateString(loc, { day: 'numeric', month: lang === 'de' ? '2-digit' : 'long', year: 'numeric' }); };
  const artist = s.artist || '';
  const X = loanText(lang, { artist, name: L.name, addr: L.addr, from: date(L.from), to: date(L.to), value: money(L.value), buy: money(L.buy), fee: money(L.fee) });
  const INK = '1D1C1A', MUTED = '78736B', ACC = '8A5A3C', LINE = 'BFB8AE', W = 9638;
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, noB = { top: none, bottom: none, left: none, right: none };
  const under = { top: none, left: none, right: none, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } };
  const t = (x, o = {}) => new TextRun({ text: String(x ?? ''), font: 'Arial', size: o.size || 19, color: o.color || INK, bold: o.bold, italics: o.it });
  const P = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { before: o.before || 0, after: o.after || 0, line: o.line }, alignment: o.align, keepNext: o.keepNext });
  const H = x => new Paragraph({ children: [new TextRun({ text: x, font: 'Georgia', size: 22, color: ACC })], spacing: { before: 220, after: 60 }, keepNext: true, keepLines: true });
  const cell = (children, wd, o = {}) => new TableCell({ children, width: { size: wd, type: WidthType.DXA }, borders: o.b || noB, verticalAlign: o.v || VerticalAlign.BOTTOM, margins: { top: o.mt ?? 50, bottom: o.mb ?? 30, left: o.ml ?? 0, right: o.mr ?? 80 } });
  const rows = (f, lw) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [lw, W - lw], rows: f.map(([k, v]) => new TableRow({ cantSplit: true, children: [cell([P(t(k, { color: MUTED, size: 17 }))], lw), cell([P(t(v))], W - lw, { b: under })] })) });
  const party = (role, note, name, addr) => [P([t(role, { bold: true }), t('  ' + note, { color: MUTED, size: 17 })], { before: 60, after: 20, keepNext: true }),
    rows([[lang === 'de' ? 'Name' : 'Name', name], [X.address, addr], ['', '']], 1600)];
  const num = v => v === '' || v == null ? '' : (lang === 'de' ? String(v).replace('.', ',') : String(v));
  const dims = [w.w, w.h, w.d].filter(v => v !== '' && v != null).map(num).join(' × ');
  const tech = I18N[lang].opt.tech[w.tech] || w.tech || '';
  const vals = [w.id, w.title, artist, w.year, tech, w.support, dims ? dims + ' cm' : ''];

  let pic = [P(t(''))];
  if (photo) {
    const bmp = await createImageBitmap(photo); const k = Math.min(150 / bmp.width, 170 / bmp.height, 1);
    pic = [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ type: 'jpg', data: await photo.arrayBuffer(), transformation: { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) } })] })];
  }
  const PW = 2600, FW = W - PW;
  const workTable = new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [FW, PW], rows: [new TableRow({ cantSplit: true, children: [
    new TableCell({ width: { size: FW, type: WidthType.DXA }, borders: noB, children: [new Table({ width: { size: FW - 200, type: WidthType.DXA }, columnWidths: [1700, FW - 1900],
      rows: X.work.map((k, i) => new TableRow({ cantSplit: true, children: [cell([P(t(k, { color: MUTED, size: 17 }))], 1700), cell([P(t(vals[i]))], FW - 1900, { b: under })] })) })] }),
    new TableCell({ width: { size: PW, type: WidthType.DXA }, borders: noB, verticalAlign: VerticalAlign.TOP, children: pic })] })] });
  const lines = n => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: Array.from({ length: n }, () => new TableRow({ height: { value: 420, rule: 'exact' }, children: [cell([P(t(''))], W, { b: under })] })) });
  const sig = (a, b) => new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [4600, 438, 4600], rows: [
    new TableRow({ height: { value: 760, rule: 'atLeast' }, children: [cell([P(t(''))], 4600, { b: under }), cell([P(t(''))], 438), cell([P(t(''))], 4600, { b: under })] }),
    new TableRow({ children: [cell([P(t(a, { size: 15, color: MUTED }))], 4600), cell([P(t(''))], 438), cell([P(t(b, { size: 15, color: MUTED }))], 4600)] })] });
  const body = [P(t(X.s[0][1]), { after: 80 }), workTable];
  const sec = X.s.slice(1).flatMap(([h, txt]) => [H(h), P(t(txt), { line: 276 })]);

  const doc = new Document({ creator: artist, title: X.title + ' ' + w.id, styles: { default: { document: { run: { font: 'Arial', size: 19 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: W }], children: [t(X.foot(artist), { size: 14, color: MUTED }), t('\t' + w.id, { size: 14, color: MUTED })] })] }) },
      children: [P(new TextRun({ text: X.title, font: 'Georgia', size: 40, color: INK })), P(t(X.sub, { size: 20, color: MUTED, it: true }), { after: 200 }),
        P(t(X.between, { color: MUTED }), { after: 40 }), ...party(X.lender, X.lenderNote, artist, ''),
        P(t(X.and, { color: MUTED }), { before: 120, after: 40 }), ...party(X.borrower, X.borrowerNote, L.name, L.addr),
        H(X.s[0][0]), ...body, ...sec,
        H(X.condition), lines(2),
        P(t(''), { before: 240 }), sig(X.sigPlace + ' · ' + X.sigLender, X.sigPlace + ' · ' + X.sigBorrower)] }] });
  return { blob: await Packer.toBlob(doc), file: X.file };
}
