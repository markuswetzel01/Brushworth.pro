// Brushworth.pro · Datenspeicher
// GoogleStore: alles liegt im Google Drive der Nutzerin, Zugriff nur auf eigene Dateien (Scope drive.file).
// DemoStore: Beispieldaten im Speicher, für Tests ohne Google.
'use strict';

const WK = ['id', 'title', 'year', 'series', 'tech', 'support', 'w', 'h', 'd', 'sign', 'status', 'loc', 'price', 'src',
  'buyer', 'soldDate', 'exh', 'pub', 'web', 'notes', 'photo', 'updated'];
const COLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LASTCOL = COLS[WK.length - 1];
const NUMERIC = new Set(['year', 'w', 'h', 'd', 'price']);

// Auswahlwerte stehen im Sheet als lesbare Begriffe (Sprache der Einrichtung) und werden beim Lesen auf Schlüssel zurückgeführt.
const CODED = { tech: 'tech', status: 'status' };
function toLabel(field, key, lang) {
  if (CODED[field]) return (I18N[lang].opt[CODED[field]] || {})[key] || key || '';
  if (field === 'src') return key === 'bw' ? I18N[lang].srcBw : key === 'manual' ? I18N[lang].srcManual : (key || '');
  if (field === 'web') return key === 'yes' ? I18N[lang].yes : key === 'no' ? I18N[lang].no : (key || '');
  return key;
}
function toKey(field, label) {
  const v = String(label ?? '').trim(); if (!v) return '';
  for (const lang of Object.keys(I18N)) {
    const L = I18N[lang];
    if (CODED[field]) { const m = Object.entries(L.opt[CODED[field]]).find(([, l]) => l.toLowerCase() === v.toLowerCase()); if (m) return m[0]; }
    if (field === 'src') { if (v === L.srcBw) return 'bw'; if (v === L.srcManual) return 'manual'; }
    if (field === 'web') { if (v === L.yes) return 'yes'; if (v === L.no) return 'no'; }
  }
  if (CODED[field] && I18N.de.opt[CODED[field]][v]) return v; // bereits Schlüssel
  return v;
}
const DEFAULT_PUBS = ['Private Collections', 'Coffee Table Book', 'Homepage', 'Prints / Edition', 'Nicht verkäuflich', 'Leihgabe'];
const splitPub = v => String(v ?? '').split(/\s*;\s*/).map(x => x.trim()).filter(Boolean);
const joinPub = a => a.join('; ');
function renameList(works, field, renames, multi) {
  const hit = [];
  works.forEach(w => { if (multi) { const a = splitPub(w[field]), b = a.map(x => renames[x] || x); if (a.join() !== b.join()) { w[field] = joinPub([...new Set(b)]); hit.push(w); } }
    else if (renames[w[field]]) { w[field] = renames[w[field]]; hit.push(w); } });
  return hit;
}
const fmtId = (prefix, n) => prefix + '-' + String(n).padStart(4, '0');
const nextNum = (works, prefix) => Math.max(0, ...works.map(w => parseInt(String(w.id).replace(prefix + '-', ''), 10)).filter(n => !isNaN(n))) + 1;

// ───────────────────────── Google ─────────────────────────
const GoogleStore = {
  token: null, exp: 0, tc: null, ss: null, meta: null, titles: null, settings: null, works: [], hist: [],
  SCOPE: 'https://www.googleapis.com/auth/drive.file',

  _tokenClient() {
    if (!this.tc) this.tc = google.accounts.oauth2.initTokenClient({ client_id: CONFIG.CLIENT_ID, scope: this.SCOPE, callback: () => {} });
    return this.tc;
  },
  signIn(interactive) {
    return new Promise((res, rej) => {
      const tc = this._tokenClient();
      tc.callback = r => { if (r.error) return rej(new Error(r.error)); this.token = r.access_token; this.exp = Date.now() + (r.expires_in - 60) * 1000; res(); };
      tc.error_callback = e => rej(new Error(e && e.type || 'popup'));
      tc.requestAccessToken({ prompt: interactive ? 'select_account' : '' });
    });
  },
  signOut() { if (this.token) google.accounts.oauth2.revoke(this.token, () => {}); this.token = null; },
  async api(url, opt = {}, retry = true) {
    if (!this.token || Date.now() > this.exp) await this.signIn(false);
    const r = await fetch(url, { ...opt, headers: { ...(opt.headers || {}), Authorization: 'Bearer ' + this.token } });
    if (r.status === 401 && retry) { await this.signIn(false); return this.api(url, opt, false); }
    if (!r.ok) { let m = r.status + ''; try { m = (await r.json()).error.message; } catch (e) {} throw new Error(m); }
    return r;
  },
  json(url, opt) { return this.api(url, opt).then(r => r.json()); },
  drive(path, opt) { return this.json('https://www.googleapis.com/drive/v3/' + path, opt); },
  sheets(path, opt) { return this.json('https://sheets.googleapis.com/v4/spreadsheets' + path, opt); },
  body(o) { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }; },

  // Sucht das Werkverzeichnis dieser App. null = noch nicht eingerichtet.
  async open() {
    const q = encodeURIComponent("appProperties has { key='bw' and value='catalog' } and trashed=false");
    const r = await this.drive(`files?q=${q}&fields=files(id,appProperties)&spaces=drive`);
    if (!r.files.length) return null;
    this.ss = r.files[0].id; this.meta = r.files[0].appProperties;
    await this.load();
    return this.settings;
  },
  async folder(name, parent, kind) {
    return this.drive('files?fields=id', this.body({ name, mimeType: 'application/vnd.google-apps.folder', parents: parent ? [parent] : undefined, appProperties: { bw: kind } }));
  },
  async setup(s) {
    const S = I18N[s.lang].sheet;
    const root = await this.folder(S.folder, null, 'root');
    const photos = await this.folder(S.photos, root.id, 'photos');
    const prov = await this.folder(S.prov, root.id, 'prov');
    const sheetDef = (title, head, id) => ({ properties: { sheetId: id, title, gridProperties: { frozenRowCount: 1 } },
      data: [{ rowData: [{ values: head.map(h => ({ userEnteredValue: { stringValue: h }, userEnteredFormat: { textFormat: { bold: true } } })) }] }] });
    const ss = await this.sheets('', this.body({ properties: { title: S.file + ' – ' + s.artist, locale: s.lang === 'de' ? 'de_DE' : 'en_GB' },
      sheets: [sheetDef(S.works, S.worksHead, 0), sheetDef(S.hist, S.histHead, 1), sheetDef(S.settings, ['key', 'value'], 2)] }));
    const meta = { bw: 'catalog', root: root.id, photos: photos.id, prov: prov.id };
    const cur = await this.drive(`files/${ss.spreadsheetId}?fields=parents`);
    await this.drive(`files/${ss.spreadsheetId}?addParents=${root.id}&removeParents=${(cur.parents || []).join(',')}&fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties: meta }) });
    this.ss = ss.spreadsheetId; this.meta = meta;
    this.titles = { works: S.works, hist: S.hist, settings: S.settings };
    this.settings = { lang: s.lang, artist: s.artist, prefix: s.prefix, series: [], pubs: DEFAULT_PUBS.slice(), license: s.license || '', licenseType: s.licenseType || '', version: CONFIG.VERSION };
    await this.writeSettings();
    this.works = []; this.hist = [];
    return this.settings;
  },
  async load() {
    const info = await this.sheets(`/${this.ss}?fields=sheets.properties(sheetId,title)`);
    const t = id => info.sheets.find(x => x.properties.sheetId === id).properties.title;
    this.titles = { works: t(0), hist: t(1), settings: t(2) };
    const rng = [`'${this.titles.works}'!A2:${LASTCOL}`, `'${this.titles.hist}'!A2:Y`, `'${this.titles.settings}'!A1:B`].map(encodeURIComponent).join('&ranges=');
    const r = await this.sheets(`/${this.ss}/values:batchGet?ranges=${rng}&valueRenderOption=UNFORMATTED_VALUE`);
    const [wv, hv, sv] = r.valueRanges.map(x => x.values || []);
    const s = {}; sv.slice(1).forEach(([k, v]) => { s[k] = v; });
    this.settings = { lang: s.lang || 'de', artist: s.artist || '', prefix: s.prefix || 'WV', series: JSON.parse(s.series || '[]'), pubs: s.pubs ? JSON.parse(s.pubs) : DEFAULT_PUBS.slice(), license: s.license || '', licenseType: s.licenseType || '', version: s.version || '' };
    this.works = wv.map((row, i) => { const o = { row: i + 2 }; WK.forEach((k, j) => { o[k] = toKey(k, row[j] ?? ''); }); return o; }).filter(w => String(w.title).trim());
    this.hist = hv.map(r => ({ date: r[0], id: r[1], gross: r[18], lo: r[19], hi: r[20], rating: r[21], chosen: r[22], applied: r[23], note: r[24], tech: r[6], mkt: r[8], geo: r[9] }));
  },
  rowValues(w) { const lang = this.settings.lang; return WK.map(k => { const v = w[k] ?? ''; if (NUMERIC.has(k) && v !== '') return Number(String(v).replace(',', '.')); return toLabel(k, v, lang); }); },
  async saveWork(w) {
    const o = { ...w, updated: new Date().toISOString().slice(0, 16).replace('T', ' ') };
    if (!o.id) o.id = fmtId(this.settings.prefix, nextNum(this.works, this.settings.prefix));
    const vals = { values: [this.rowValues(o)] };
    if (o.row) {
      await this.sheets(`/${this.ss}/values/${encodeURIComponent(`'${this.titles.works}'!A${o.row}:${LASTCOL}${o.row}`)}?valueInputOption=RAW`, { ...this.body(vals), method: 'PUT' });
    } else {
      const r = await this.sheets(`/${this.ss}/values/${encodeURIComponent(`'${this.titles.works}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, this.body(vals));
      o.row = parseInt(r.updates.updatedRange.match(/(\d+):/)[1], 10);
      this.works.push(o);
    }
    const i = this.works.findIndex(x => x.row === o.row); if (i >= 0) this.works[i] = o;
    return o;
  },
  async addHistory(p) {
    const row = [p.date, p.id, p.title, p.w, p.h, p.qm, p.techLabel, p.compLabel, p.mktLabel, p.geoLabel, p.editLabel, p.mat, p.frm, p.infl, p.vat, p.gall, p.roundLabel, p.mult, p.gross, p.lo, p.hi, p.ratingLabel, p.chosen, p.applied, p.note];
    await this.sheets(`/${this.ss}/values/${encodeURIComponent(`'${this.titles.hist}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, this.body({ values: [row] }));
    this.hist.push({ date: p.date, id: p.id, gross: p.gross, lo: p.lo, hi: p.hi, chosen: p.chosen, applied: p.applied, note: p.note, tech: p.techLabel, mkt: p.mktLabel, geo: p.geoLabel });
  },
  async writeSettings() {
    const s = this.settings;
    const rows = [['key', 'value'], ['lang', s.lang], ['artist', s.artist], ['prefix', s.prefix], ['series', JSON.stringify(s.series)], ['pubs', JSON.stringify(s.pubs || [])], ['license', s.license], ['licenseType', s.licenseType || ''], ['version', CONFIG.VERSION]];
    await this.sheets(`/${this.ss}/values/${encodeURIComponent(`'${this.titles.settings}'!A1:B${rows.length}`)}?valueInputOption=RAW`, { ...this.body({ values: rows }), method: 'PUT' });
  },
  async saveSettings(next, renames, pubRenames) {
    Object.assign(this.settings, next);
    await this.writeSettings();
    const hit = new Set([...renameList(this.works, 'series', renames || {}), ...renameList(this.works, 'pub', pubRenames || {}, true)]);
    for (const w of hit) await this.saveWork(w);
  },
  multipart(meta, blob, type) {
    const b = 'bw' + Math.random().toString(36).slice(2);
    return { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b },
      body: new Blob([`--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${type}\r\n\r\n`, blob, `\r\n--${b}--`]) };
  },
  upload(meta, blob, type) { return this.json('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', this.multipart(meta, blob, type)); },
  async uploadPhoto(w, blob) {
    if (w.photo) { try { await this.drive(`files/${w.photo}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) }); } catch (e) {} }
    const f = await this.upload({ name: w.id + '.jpg', parents: [this.meta.photos] }, blob, 'image/jpeg');
    return f.id;
  },
  async photoBlob(id) { return (await this.api(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`)).blob(); },
  async loanFolder() {
    if (this.meta.loans) return this.meta.loans;
    const q = encodeURIComponent(`appProperties has { key='bw' and value='loans' } and '${this.meta.root}' in parents and trashed=false`);
    const r = await this.drive(`files?q=${q}&fields=files(id)&spaces=drive`);
    const id = r.files.length ? r.files[0].id : (await this.folder(I18N[this.settings.lang].sheet.loans, this.meta.root, 'loans')).id;
    this.meta.loans = id;
    return id;
  },
  async saveLoan(name, docxBlob) { return this.saveProvenance(name, docxBlob, await this.loanFolder()); },
  async saveProvenance(name, docxBlob, folderId) {
    const parent = folderId || this.meta.prov;
    const doc = await this.upload({ name, parents: [parent], mimeType: 'application/vnd.google-apps.document' }, docxBlob,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const pdfBlob = await (await this.api(`https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=application/pdf`)).blob();
    const pdf = await this.upload({ name: name + '.pdf', parents: [parent] }, pdfBlob, 'application/pdf');
    return { doc: doc.webViewLink, pdf: pdf.webViewLink };
  },
  links() { return { folder: 'https://drive.google.com/drive/folders/' + this.meta.root, sheet: 'https://docs.google.com/spreadsheets/d/' + this.ss }; }
};

// ───────────────────────── Demo ─────────────────────────
const DemoStore = {
  settings: null, works: [], hist: [], photos: {},
  signIn() { return Promise.resolve(); }, signOut() {},
  async open() { return this.settings; },
  async setup(s) {
    this.settings = { ...s, series: ['Landschaften', 'Rheinlicht', 'Porträts'], pubs: DEFAULT_PUBS.slice() };
    this.works = [{ row: 2, id: s.prefix + '-0001', title: 'Beispielwerk', year: 2024, series: 'Rheinlicht', tech: 'oil', support: 'Leinwand', w: 80, h: 60, d: '', sign: 'unten rechts', status: 'sold', loc: 'Unkel', price: 1900, src: 'manual', buyer: 'Privatsammlung', soldDate: '2025-05-10', exh: 'Kunstverein Unkel 2025', pub: 'Private Collections; Homepage', web: 'yes', notes: '', photo: '', updated: '' }];
    return this.settings;
  },
  async saveWork(w) {
    const o = { ...w };
    if (!o.id) o.id = fmtId(this.settings.prefix, nextNum(this.works, this.settings.prefix));
    if (!o.row) { o.row = this.works.length + 2; this.works.push(o); } else { const i = this.works.findIndex(x => x.row === o.row); this.works[i] = o; }
    return o;
  },
  async addHistory(p) { this.hist.push({ date: p.date, id: p.id, gross: p.gross, lo: p.lo, hi: p.hi, chosen: p.chosen, applied: p.applied, note: p.note, tech: p.techLabel, mkt: p.mktLabel, geo: p.geoLabel }); },
  async saveSettings(next, renames, pubRenames) { Object.assign(this.settings, next); renameList(this.works, 'series', renames || {}); renameList(this.works, 'pub', pubRenames || {}, true); },
  async uploadPhoto(w, blob) { const id = 'demo-' + w.row; this.photos[id] = blob; return id; },
  async photoBlob(id) { return this.photos[id]; },
  async saveProvenance(name, docxBlob) { const u = URL.createObjectURL(docxBlob); return { doc: u, pdf: '', docName: name + '.docx' }; },
  async saveLoan(name, docxBlob) { return this.saveProvenance(name, docxBlob); },
  links() { return { folder: '#', sheet: '#' }; }
};

// Gumroad-Lizenzprüfung. Ergebnis: 'full' | 'beta' | null (ungültig). Netzwerk-/CORS-Fehler werfen.
async function gumroadCheck(productId, key) {
  const body = new URLSearchParams({ product_id: productId, license_key: key.trim(), increment_uses_count: 'false' });
  const r = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body });
  const j = await r.json().catch(() => ({}));
  return !!j.success && !(j.purchase && (j.purchase.refunded || j.purchase.chargebacked || j.purchase.disputed));
}
async function verifyLicense(key) {
  if (!key || !key.trim()) return null;
  if (CONFIG.GUMROAD_FULL_PRODUCT_ID && await gumroadCheck(CONFIG.GUMROAD_FULL_PRODUCT_ID, key)) return 'full';
  if (CONFIG.GUMROAD_BETA_PRODUCT_ID && !betaOver() && await gumroadCheck(CONFIG.GUMROAD_BETA_PRODUCT_ID, key)) return 'beta';
  return null;
}
