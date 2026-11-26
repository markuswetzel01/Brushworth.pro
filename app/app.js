// Brushworth.pro · App
'use strict';
const $ = id => document.getElementById(id);
const DEMO = !CONFIG.CLIENT_ID || new URLSearchParams(location.search).has('demo');
const S = DEMO ? DemoStore : GoogleStore;
const FIELDS = ['title', 'year', 'series', 'status', 'tech', 'support', 'w', 'h', 'd', 'sign', 'loc', 'price', 'src', 'web', 'buyer', 'soldDate', 'exh', 'pub', 'notes'];
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

let LANG = store.get('bw-lang') || ((navigator.language || 'de').slice(0, 2) === 'de' ? 'de' : 'en');
let cur = null, LAST = null;
const PHOTOS = {};
const T = k => I18N[LANG][k];
const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(x) ? 0 : x; };
const eur = v => new Intl.NumberFormat(LANG === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2800); }
function show(id) { ['scrSignIn', 'scrSetup', 'scrApp'].forEach(s => $(s).hidden = s !== id); const inApp = id === 'scrApp'; $('openSettings').hidden = !inApp; $('signOut').hidden = !inApp || DEMO; }

// ── Sprache ──
function fillSel(id, entries, blank) {
  const s = $(id), v = s.value;
  s.innerHTML = (blank ? '<option value=""></option>' : '') + entries.map(([k, l]) => `<option value="${String(k).replace(/"/g, '&quot;')}">${String(l).replace(/</g, '&lt;')}</option>`).join('');
  if (v) s.value = v;
}
function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-t]').forEach(e => { const v = T(e.dataset.t); if (typeof v === 'string') e.textContent = v; });
  document.querySelectorAll('[data-ph]').forEach(e => e.placeholder = T(e.dataset.ph));
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
  const O = I18N[LANG].opt;
  fillSel('tech', Object.entries(O.tech), true); fillSel('status', Object.entries(O.status), true);
  fillSel('src', [['bw', T('srcBw')], ['manual', T('srcManual')]], true); fillSel('web', [['yes', T('yes')], ['no', T('no')]], true);
  ['comp', 'mkt', 'geo', 'edit'].forEach(k => fillSel(k, Object.entries(O[k])));
  fillSel('round', ['none', '10', '100'].map(k => [k, O.round[k]]));
  $('lbClose').textContent = T('close');
  applyTheme(store.get('bw-theme'));
  if (S.settings) { $('count').textContent = T('works')(S.works.length); fillSel('series', (S.settings.series || []).map(x => [x, x]), true); fillCat(); renderPub(); }
  $('wid').textContent = cur && cur.id ? cur.id : T('isNew');
  if (!$('scrApp').hidden) { renderList(); update(); }
}
document.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { LANG = b.dataset.lang; store.set('bw-lang', LANG); applyLang(); });
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('theme').textContent = dark ? T('light') : T('dark');
}
$('theme').onclick = () => { const dark = !(document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)); store.set('bw-theme', dark ? 'dark' : 'light'); applyTheme(dark ? 'dark' : 'light'); };

// ── Start: Anmeldung → Einrichtung → App ──
async function start(interactive) {
  $('signInErr').textContent = '';
  try {
    if (!DEMO) { $('btnSignIn').disabled = true; $('btnSignIn').textContent = T('signingIn'); await S.signIn(interactive); }
    const s = await S.open();
    if (!s) { $('suLang').value = LANG; $('suLicWrap').hidden = !LICENSE_REQUIRED; show('scrSetup'); return; }
    enterApp();
  } catch (e) {
    $('signInErr').textContent = T('loadFailed') + ': ' + e.message; show('scrSignIn');
  } finally { $('btnSignIn').disabled = false; $('btnSignIn').textContent = T('signIn'); }
}
$('btnSignIn').onclick = () => start(true);
$('setupForm').onsubmit = async e => {
  e.preventDefault(); $('setupErr').textContent = '';
  const s = { lang: $('suLang').value, artist: $('suArtist').value.trim(), prefix: $('suPrefix').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), license: $('suLicense').value.trim() };
  if (!s.artist || !s.prefix) return;
  $('btnSetup').disabled = true; $('btnSetup').textContent = T('setupRunning');
  try {
    if (LICENSE_REQUIRED) {
      let type = null; try { type = await verifyLicense(s.license); } catch (err) { $('setupErr').textContent = T('licenseError'); return; }
      if (!type) { $('setupErr').textContent = T('licenseInvalid'); return; }
      s.licenseType = type;
    }
    await S.setup(s); LANG = s.lang; store.set('bw-lang', LANG); enterApp();
  } catch (err) { $('setupErr').textContent = T('loadFailed') + ': ' + err.message; }
  finally { $('btnSetup').disabled = false; $('btnSetup').textContent = T('setupStart'); }
};
$('signOut').onclick = () => { S.signOut(); location.reload(); };
function needsNewLicense() { return !DEMO && S.settings && S.settings.licenseType === 'beta' && betaOver(); }
function showRelicense() {
  show('scrSetup'); $('setupForm').hidden = true; $('relicenseForm').hidden = false;
}
$('relicenseForm').onsubmit = async e => {
  e.preventDefault(); $('relErr').textContent = '';
  const key = $('relKey').value.trim(); let type = null;
  try { type = await verifyLicense(key); } catch (err) { $('relErr').textContent = T('licenseError'); return; }
  if (type !== 'full') { $('relErr').textContent = T('licenseInvalid'); return; }
  await S.saveSettings({ license: key, licenseType: 'full' }, {});
  $('relicenseForm').hidden = true; $('setupForm').hidden = false; enterApp();
};
function enterApp() {
  if (needsNewLicense()) { showRelicense(); return; } if (!store.get('bw-lang') && S.settings.lang) LANG = S.settings.lang; $('hArtist').textContent = S.settings.artist || ''; show('scrApp'); applyLang(); select(null); }

// ── Publikationen (Mehrfachauswahl) ──
const LOAN = 'loan';
function loanCat() { const names = [I18N.de.opt.status.loan, I18N.en.opt.status.loan, 'Loan'].map(x => x.toLowerCase());
  return (S.settings.pubs || []).find(x => names.includes(x.toLowerCase())) || I18N[S.settings.lang || 'de'].opt.status.loan; }
function setLoanTag(on) { const lc = loanCat(), a = splitPub($('pub').value).filter(x => x !== lc); if (on) a.push(lc); $('pub').value = joinPub(a); renderPub(); }
$('status').addEventListener('change', () => setLoanTag($('status').value === LOAN));
function fillCat() { fillSel('cat', [['', T('catAll')], ...(S.settings.pubs || []).map(x => [x, x]), ['-', T('catNone')]]); }
function renderPub() {
  const sel = splitPub($('pub').value), list = S.settings ? S.settings.pubs || [] : [], extra = sel.filter(x => !list.includes(x));
  const box = $('pubOpts'); box.innerHTML = '';
  [...list, ...extra].forEach(name => {
    const l = document.createElement('label'), c = document.createElement('input'), t = document.createElement('span');
    c.type = 'checkbox'; c.checked = sel.includes(name); t.textContent = name;
    c.onchange = () => { const now = splitPub($('pub').value); $('pub').value = joinPub(c.checked ? [...now, name] : now.filter(x => x !== name));
      if (name === loanCat()) { if (c.checked) $('status').value = LOAN; else if ($('status').value === LOAN) $('status').value = 'available'; }
      renderPub(); };
    l.append(c, t); if (!list.includes(name)) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '(' + T('pubOld') + ')'; l.append(x); }
    box.append(l);
  });
  const sum = $('pubSum'); sum.innerHTML = '';
  if (!sel.length) { const n = document.createElement('span'); n.className = 'none'; n.textContent = T('pubNone'); sum.append(n); }
  sel.forEach(x => { const c = document.createElement('span'); c.className = 'chip'; c.textContent = x; sum.append(c); });
}
$('cat').onchange = renderList;
document.addEventListener('click', e => { const b = $('pubBox'); if (b.open && !b.contains(e.target)) b.open = false; });

// ── Liste & Formular ──
function renderList() {
  const q = $('q').value.trim().toLowerCase(), ul = $('list'); ul.innerHTML = '';
  const cat = $('cat').value;
  const ws = S.works.filter(w => (!q || [w.id, w.title, w.series, w.pub, I18N[LANG].opt.tech[w.tech]].join(' ').toLowerCase().includes(q))
    && (!cat || (cat === '-' ? !splitPub(w.pub).length : splitPub(w.pub).includes(cat)))).slice().reverse();
  if (!ws.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = S.works.length ? T('noHits') : T('noWorks'); ul.append(li); return; }
  ws.forEach(w => {
    const li = document.createElement('li'); li.tabIndex = 0; if (cur && cur.row === w.row) li.className = 'on';
    const n = document.createElement('span'); n.className = 'n'; n.textContent = w.id || '—';
    const t = document.createElement('span'); t.className = 't'; t.textContent = w.title;
    const m = document.createElement('span'); m.className = 'm'; m.textContent = [w.year, w.series, w.w && w.h ? `${w.w} × ${w.h} cm` : '', w.price ? eur(w.price) : ''].filter(Boolean).join(' · ');
    li.append(n, t, m); li.onclick = () => select(w); li.onkeydown = e => { if (e.key === 'Enter') select(w); }; ul.append(li);
  });
}
function select(w) {
  cur = w ? { ...w } : null;
  FIELDS.forEach(f => $(f).value = cur ? (cur[f] ?? '') : '');
  if (cur && cur.series && ![...$('series').options].some(o => o.value === cur.series)) { $('series').add(new Option(cur.series, cur.series)); $('series').value = cur.series; }
  renderPub(); $('pubBox').open = false;
  $('wid').textContent = cur && cur.id ? cur.id : T('isNew');
  $('saveHint').textContent = ''; $('chosen').value = ''; $('chosen').dataset.auto = '1'; $('pnote').value = ''; $('provLinks').innerHTML = '';
  $('provHint').textContent = T('provHint'); $('photoHint').textContent = T('photoHint'); $('plang').value = LANG;
  ['loanName', 'loanAddr', 'loanFrom', 'loanTo', 'loanFee'].forEach(k => $(k).value = ''); $('loanValue').value = $('loanBuy').value = cur && cur.price ? cur.price : '';
  $('llang').value = LANG; $('loanLinks').innerHTML = ''; $('loanHint').textContent = T('loanHint');
  renderList(); update(); showPhoto();
}
function readWork() { const o = { ...(cur || {}) }; FIELDS.forEach(f => o[f] = $(f).value.trim()); return o; }
async function saveWork() {
  const w = readWork(); if (!w.title) { toast(T('needTitle')); $('title').focus(); throw null; }
  $('save').disabled = true;
  try {
    const o = await S.saveWork(w); cur = { ...o }; $('wid').textContent = o.id; $('saveHint').textContent = T('saved')(o.id);
    $('count').textContent = T('works')(S.works.length); renderList(); renderHist(); return o;
  } catch (e) { if (e) toast(T('saveFailed') + ': ' + e.message); throw e; }
  finally { $('save').disabled = false; }
}
$('save').onclick = () => saveWork().then(o => toast(T('saved')(o.id))).catch(() => {});
$('new').onclick = () => { select(null); $('title').focus(); };
$('q').oninput = renderList;

// ── Brushworth ──
function inputs() {
  return { w: num($('w').value), h: num($('h').value), tech: $('tech').value, comp: $('comp').value, mkt: $('mkt').value, geo: $('geo').value, edit: $('edit').value,
    mat: num($('mat').value), frm: num($('frm').value), vat: num($('vat').value), gall: num($('gall').value), infl: num($('infl').value), mult: num($('mult').value) || 1, round: $('round').value };
}
function update() {
  const i = inputs(), ok = i.w > 0 && i.h > 0 && !!i.tech;
  ['apply', 'logOnly'].forEach(b => $(b).disabled = !ok);
  if (!ok) {
    LAST = null; $('gross').textContent = '–'; $('lo').textContent = $('hi').textContent = ''; $('bar').innerHTML = ''; $('legend').innerHTML = '';
    $('rating').className = 'pill small'; $('rating').textContent = i.tech ? T('sizeMissing') : T('chooseTech');
    ['kQm', 'kSqm', 'kNet', 'kGall', 'kProfit'].forEach(k => $(k).textContent = '–'); pers(null); renderHist(); return;
  }
  const r = BW.calc(i); LAST = { i, r };
  $('gross').textContent = eur(r.gross); $('lo').textContent = T('from') + ' ' + eur(r.lo); $('hi').textContent = T('to') + ' ' + eur(r.hi);
  $('rating').className = 'pill ' + r.rating; $('rating').textContent = T('rating')[r.rating];
  const tot = r.bd.reduce((s, b) => s + Math.max(b.e, 0), 0) || 1;
  $('bar').innerHTML = r.bd.filter(b => b.e > 0).map(b => `<span style="flex:${b.e / tot};background:${b.c}"></span>`).join('');
  $('legend').innerHTML = r.bd.map(b => `<div><i style="background:${b.c}"></i>${T('bd')[b.k]}<b>${eur(b.e)}</b></div>`).join('');
  $('kQm').textContent = r.qm.toLocaleString(LANG === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 3 }) + ' m²';
  $('kSqm').textContent = eur(r.gross / r.qm); $('kNet').textContent = eur(r.artNet);
  $('kGall').textContent = i.gall > 0 ? '− ' + eur(r.gallFee) : T('direct'); $('kProfit').textContent = eur(r.profit);
  if (!$('chosen').value || $('chosen').dataset.auto === '1') { $('chosen').value = Math.round(r.gross); $('chosen').dataset.auto = '1'; }
  pers(r); renderHist();
}
function pers(r) {
  const sold = S.works.filter(w => w.status === 'sold' && num(w.price) > 0 && num(w.w) > 0 && num(w.h) > 0);
  if (!sold.length) { $('kPers').textContent = '–'; $('persHint').textContent = T('persNone'); return; }
  const avg = sold.reduce((s, w) => s + num(w.price) / (num(w.w) * num(w.h) / 10000), 0) / sold.length;
  $('kPers').textContent = eur(avg) + ' (' + sold.length + ')';
  $('persHint').textContent = r ? T('persDev')(Math.round((r.gross / r.qm / avg - 1) * 100), sold.length) : '';
}
function renderHist() {
  const id = cur && cur.id, rows = id ? S.hist.filter(h => h.id === id).slice().reverse() : [];
  $('histEmpty').hidden = rows.length > 0; $('histEmpty').textContent = id ? T('histEmpty') : T('histNeedSave');
  $('hist').innerHTML = '';
  rows.forEach(h => { const tr = document.createElement('tr');
    [h.date, eur(h.gross), eur(h.lo) + ' – ' + eur(h.hi), eur(h.chosen), h.applied, h.tech, h.mkt + ' / ' + h.geo, h.note].forEach(v => { const td = document.createElement('td'); td.textContent = v ?? ''; tr.append(td); });
    $('hist').append(tr); });
}
async function savePrice(apply) {
  if (!LAST) return;
  const { i, r } = LAST, sel = id => $(id).options[$(id).selectedIndex].text, chosen = num($('chosen').value) || Math.round(r.gross);
  try {
    if (apply) { $('price').value = chosen; $('src').value = 'bw'; }
    const w = await saveWork();
    await S.addHistory({ date: new Date().toISOString().slice(0, 10), id: w.id, title: w.title, w: i.w, h: i.h, qm: +r.qm.toFixed(3), techLabel: sel('tech'), compLabel: sel('comp'),
      mktLabel: sel('mkt'), geoLabel: sel('geo'), editLabel: sel('edit'), mat: i.mat, frm: i.frm, infl: i.infl, vat: i.vat, gall: i.gall, roundLabel: sel('round'), mult: i.mult,
      gross: Math.round(r.gross), lo: Math.round(r.lo), hi: Math.round(r.hi), ratingLabel: T('rating')[r.rating], chosen, applied: apply ? T('yes') : T('no'), note: $('pnote').value.trim() });
    renderHist(); pers(LAST.r); toast(apply ? T('priceApplied') : T('priceLogged'));
  } catch (e) { if (e) toast(T('saveFailed') + ': ' + e.message); }
}
['w', 'h', 'tech', 'comp', 'mkt', 'geo', 'edit', 'mat', 'frm', 'vat', 'gall', 'infl', 'mult', 'round'].forEach(id => $(id).addEventListener('input', () => { $('chosen').dataset.auto = '1'; update(); }));
$('chosen').oninput = () => $('chosen').dataset.auto = '0';
$('apply').onclick = () => savePrice(true);
$('logOnly').onclick = () => savePrice(false);

// ── Foto ──
function setThumb(src) {
  const t = $('thumb'); t.innerHTML = '';
  if (src) { const im = document.createElement('img'); im.src = src; im.alt = cur ? cur.title : ''; t.append(im); t.disabled = false; }
  else { const s = document.createElement('span'); s.className = 'lbl'; s.textContent = T('noPhoto'); t.append(s); t.disabled = true; }
}
async function showPhoto() {
  const fid = cur && cur.photo; if (!fid) { setThumb(null); return; }
  if (!PHOTOS[fid]) { $('thumb').innerHTML = '<span class="lbl">' + T('loading') + '</span>'; try { PHOTOS[fid] = URL.createObjectURL(await S.photoBlob(fid)); } catch (e) { setThumb(null); return; } }
  if (cur && cur.photo === fid) setThumb(PHOTOS[fid]);
}
function resize(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); c.toBlob(b => b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', 0.86); };
    img.onerror = () => rej(new Error('image')); img.src = url;
  });
}
$('file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  if (!$('title').value.trim()) { $('photoHint').textContent = T('photoFirstTitle'); $('title').focus(); return; }
  $('photoHint').textContent = T('photoUploading');
  try {
    const [blob, w] = await Promise.all([resize(f, 1800), saveWork()]);
    const fid = await S.uploadPhoto(w, blob);
    const o = await S.saveWork({ ...w, photo: fid }); cur = { ...o };
    PHOTOS[fid] = URL.createObjectURL(blob); setThumb(PHOTOS[fid]); $('photoHint').textContent = T('photoSaved')(o.id);
  } catch (err) { $('photoHint').textContent = T('photoFailed') + (err && err.message ? ': ' + err.message : ''); }
};
$('thumb').onclick = () => { const im = $('thumb').querySelector('img'); if (!im) return; $('lbImg').src = im.src; $('lb').hidden = false; };
$('lb').onclick = () => $('lb').hidden = true;
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('lb').hidden = true; });

// ── Provenienz ──
$('mkProv').onclick = async () => {
  const lang = $('plang').value; $('mkProv').disabled = true; $('provLinks').innerHTML = ''; $('provHint').textContent = T('provRunning');
  try {
    const w = await saveWork();
    const photo = w.photo ? await S.photoBlob(w.photo).catch(() => null) : null;
    const blob = await buildProvenance(w, S.settings, lang, photo);
    const name = `${w.id} ${I18N[lang].prov.file} – ${w.title}`;
    const res = await S.saveProvenance(name, blob);
    $('provHint').textContent = T('provDone')(name);
    [[T('provDoc'), res.doc, res.docName], [T('provPdf'), res.pdf]].filter(x => x[1]).forEach(([t, u, dl]) => {
      const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t; if (dl) a.download = dl; $('provLinks').append(a); });
  } catch (e) { $('provHint').textContent = T('provFailed') + (e && e.message ? ': ' + e.message : ''); }
  finally { $('mkProv').disabled = false; }
};

// ── Leihvertrag ──
$('mkLoan').onclick = async () => {
  const L = { name: $('loanName').value.trim(), addr: $('loanAddr').value.trim(), from: $('loanFrom').value, to: $('loanTo').value, value: $('loanValue').value.trim(), buy: $('loanBuy').value.trim(), fee: $('loanFee').value.trim() };
  if (!L.name) { $('loanHint').textContent = T('loanNeedName'); $('loanName').focus(); return; }
  const lang = $('llang').value; $('mkLoan').disabled = true; $('loanLinks').innerHTML = ''; $('loanHint').textContent = T('loanRunning');
  try {
    $('status').value = LOAN; setLoanTag(true); $('loc').value = L.name;
    const fd = v => v ? new Date(v + 'T12:00:00').toLocaleDateString(LANG === 'de' ? 'de-DE' : 'en-GB') : '';
    const note = T('loanNote')(L.name, fd(L.from), fd(L.to)); if (!$('notes').value.includes(note)) $('notes').value = ($('notes').value.trim() + '\n' + note).trim();
    const w = await saveWork();
    const photo = w.photo ? await S.photoBlob(w.photo).catch(() => null) : null;
    const { blob, file } = await buildLoan(w, S.settings, lang, photo, L);
    const name = `${w.id} ${file} – ${L.name}`;
    const res = await S.saveLoan(name, blob);
    $('loanHint').textContent = T('provDone')(name);
    [[T('provDoc'), res.doc, res.docName], [T('provPdf'), res.pdf]].filter(x => x[1]).forEach(([t, u, dl]) => {
      const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = t; if (dl) a.download = dl; $('loanLinks').append(a); });
  } catch (e) { $('loanHint').textContent = T('provFailed') + (e && e.message ? ': ' + e.message : ''); }
  finally { $('mkLoan').disabled = false; }
};

// ── Einstellungen ──
$('openSettings').onclick = () => {
  $('setArtist').value = S.settings.artist || ''; $('setSeries').value = (S.settings.series || []).join('\n'); $('setPubs').value = (S.settings.pubs || []).join('\n');
  const l = S.links(); $('lnkFolder').href = l.folder; $('lnkSheet').href = l.sheet; $('dlgSettings').showModal();
};
$('setCancel').onclick = () => $('dlgSettings').close();
$('setSave').onclick = async () => {
  const lines = id => [...new Set($(id).value.split('\n').map(x => x.replace(/;/g, ',').trim()).filter(Boolean))];
  const diff = (old, next) => { const r = {}; old.forEach((o, i) => { const n = next[i]; if (n !== undefined && o !== n && !next.includes(o) && !old.includes(n)) r[o] = n; }); return r; };
  const next = lines('setSeries'), renames = diff(S.settings.series || [], next);
  const pubs = lines('setPubs'), pubRenames = diff(S.settings.pubs || [], pubs);
  try {
    await S.saveSettings({ artist: $('setArtist').value.trim(), series: next, pubs }, renames, pubRenames);
    if (cur && cur.pub) { cur.pub = joinPub([...new Set(splitPub(cur.pub).map(x => pubRenames[x] || x))]); $('pub').value = cur.pub; }
    fillCat(); renderPub();
    $('hArtist').textContent = S.settings.artist; $('dlgSettings').close(); toast(T('setSaved'));
    fillSel('series', next.map(x => [x, x]), true); if (cur && renames[cur.series]) cur.series = renames[cur.series]; if (cur) $('series').value = cur.series || ''; renderList();
  } catch (e) { toast(T('saveFailed') + ': ' + e.message); }
};

// ── Init ──
applyLang();
$('comp').value = 'standard';
if (DEMO) {
  $('demo').hidden = false;
  DemoStore.setup({ lang: LANG, artist: 'Lois Michèle Wetzel', prefix: 'LMW', license: '' }).then(enterApp);
} else {
  const gs = document.createElement('script'); gs.src = 'https://accounts.google.com/gsi/client'; gs.async = true;
  gs.onload = () => show('scrSignIn'); gs.onerror = () => { show('scrSignIn'); $('signInErr').textContent = T('loadFailed'); };
  document.head.append(gs);
}
