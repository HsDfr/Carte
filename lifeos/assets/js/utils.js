/* Outils : dates, texte, identifiants. */
(function () {
  const pad = (n) => String(n).padStart(2, '0');

  const U = {
    uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },
    esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    clamp(n, a, b) { return Math.max(a, Math.min(b, n)); },
    pct(a, b) { return b ? Math.round((a / b) * 100) : 0; },
    plural(n, one, many) { return n + ' ' + (n > 1 ? (many || one + 's') : one); },

    /* ---------- Dates (clé locale AAAA-MM-JJ) ---------- */
    key(d) {
      d = d || new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    },
    today() { return U.key(new Date()); },
    parse(k) {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m - 1, d);
    },
    addDays(k, n) {
      const d = U.parse(k);
      d.setDate(d.getDate() + n);
      return U.key(d);
    },
    diffDays(a, b) {
      return Math.round((U.parse(b) - U.parse(a)) / 86400000);
    },
    weekday(k) { return (U.parse(k).getDay() + 6) % 7; }, // 0 = lundi
    weekStart(k) { return U.addDays(k, -U.weekday(k)); },
    weekDays(k) {
      const s = U.weekStart(k);
      return Array.from({ length: 7 }, (_, i) => U.addDays(s, i));
    },
    isoWeek(k) {
      const d = U.parse(k);
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - day);
      const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      const w = Math.ceil(((t - y0) / 86400000 + 1) / 7);
      return t.getUTCFullYear() + '-S' + pad(w);
    },
    weekNumber(k) { return Number(U.isoWeek(k).split('-S')[1]); },

    fmt(k, opts) {
      return new Intl.DateTimeFormat('fr-FR', opts).format(typeof k === 'string' ? U.parse(k) : k);
    },
    longDate(k) { return U.fmt(k, { weekday: 'long', day: 'numeric', month: 'long' }); },
    shortDate(k) { return U.fmt(k, { weekday: 'short', day: 'numeric', month: 'short' }); },
    dayMonth(k) { return U.fmt(k, { day: 'numeric', month: 'short' }); },
    rel(k) {
      if (!k) return '';
      const t = U.today();
      const d = U.diffDays(t, k);
      if (d === 0) return "Aujourd'hui";
      if (d === 1) return 'Demain';
      if (d === -1) return 'Hier';
      if (d > 1 && d < 7) return U.fmt(k, { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
      return U.shortDate(k);
    },
    countdown(k) {
      const d = U.diffDays(U.today(), k);
      if (d === 0) return "aujourd'hui";
      if (d === 1) return 'demain';
      if (d < 0) return 'il y a ' + U.plural(-d, 'jour');
      if (d < 60) return 'dans ' + U.plural(d, 'jour');
      const m = Math.round(d / 30);
      return 'dans ' + m + ' mois';
    },
    time(d) {
      d = typeof d === 'string' ? new Date(d) : d;
      return pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    ago(ts) {
      const s = Math.round((Date.now() - ts) / 1000);
      if (s < 60) return "à l'instant";
      const m = Math.round(s / 60);
      if (m < 60) return 'il y a ' + m + ' min';
      const h = Math.round(m / 60);
      if (h < 24) return 'il y a ' + h + ' h';
      const d = Math.round(h / 24);
      if (d === 1) return 'hier';
      if (d < 7) return 'il y a ' + d + ' jours';
      return 'le ' + U.dayMonth(U.key(new Date(ts)));
    },
    nextWeekday(target) { // 0 = lundi
      const t = U.today();
      let d = (target - U.weekday(t) + 7) % 7;
      if (d === 0) d = 7;
      return U.addDays(t, d);
    },
    greeting(h) {
      h = h == null ? new Date().getHours() : h;
      if (h < 5) return 'Bonne nuit';
      if (h < 12) return 'Bonjour';
      if (h < 18) return 'Bon après-midi';
      return 'Bonsoir';
    },

    debounce(fn, ms) {
      let t;
      return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
    },
    download(name, text, type) {
      const blob = new Blob([text], { type: type || 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
  };

  window.U = U;
})();
