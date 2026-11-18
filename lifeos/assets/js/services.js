/* Services externes : météo (Open-Meteo) et Google Agenda. */
(function () {
  /* ======================= Météo ======================= */
  const CITIES = [
    { name: 'Étrembières', lat: 46.1797, lon: 6.2269 },
    { name: 'Genève', lat: 46.2044, lon: 6.1432 },
  ];
  const WKEY = 'lifeos.weather';

  function wmo(code, isDay) {
    const c = Number(code);
    if (c === 0) return isDay ? { icon: 'sun', label: 'Ensoleillé', cls: '' } : { icon: 'moon', label: 'Ciel clair', cls: 'night' };
    if (c === 1) return isDay ? { icon: 'sun', label: 'Plutôt dégagé', cls: '' } : { icon: 'moon', label: 'Plutôt dégagé', cls: 'night' };
    if (c === 2) return isDay ? { icon: 'cloud-sun', label: 'Éclaircies', cls: '' } : { icon: 'cloud-moon', label: 'Éclaircies', cls: 'night' };
    if (c === 3) return { icon: 'cloud', label: 'Couvert', cls: 'cloud' };
    if (c === 45 || c === 48) return { icon: 'cloud-fog', label: 'Brouillard', cls: 'cloud' };
    if (c >= 51 && c <= 57) return { icon: 'cloud-drizzle', label: 'Bruine', cls: 'rain' };
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return { icon: 'cloud-rain', label: c >= 80 ? 'Averses' : 'Pluie', cls: 'rain' };
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { icon: 'cloud-snow', label: 'Neige', cls: 'snow' };
    if (c >= 95) return { icon: 'cloud-lightning', label: 'Orages', cls: 'storm' };
    return { icon: 'cloud', label: '—', cls: 'cloud' };
  }

  const Weather = {
    CITIES,
    wmo,
    cached() {
      try { const c = JSON.parse(localStorage.getItem(WKEY)); return c && c.data ? c : null; } catch (e) { return null; }
    },
    async get(force) {
      const c = Weather.cached();
      if (!force && c && Date.now() - c.ts < 30 * 60e3) return c.data;
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + CITIES.map((x) => x.lat).join(',') +
        '&longitude=' + CITIES.map((x) => x.lon).join(',') +
        '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
        '&timezone=Europe%2FParis&forecast_days=1';
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        let j = await r.json();
        if (!Array.isArray(j)) j = [j];
        const data = j.map((x, i) => ({
          city: CITIES[i].name,
          temp: Math.round(x.current.temperature_2m),
          feels: Math.round(x.current.apparent_temperature),
          code: x.current.weather_code,
          isDay: !!x.current.is_day,
          wind: Math.round(x.current.wind_speed_10m),
          max: Math.round(x.daily.temperature_2m_max[0]),
          min: Math.round(x.daily.temperature_2m_min[0]),
          rain: x.daily.precipitation_probability_max ? x.daily.precipitation_probability_max[0] : null,
        }));
        localStorage.setItem(WKEY, JSON.stringify({ ts: Date.now(), data }));
        return data;
      } catch (e) {
        return c ? c.data : null;
      }
    },
  };

  /* ======================= Google Agenda ======================= */
  const TKEY = 'lifeos.gtoken';
  const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
  let tokenClient = null;
  let gisPromise = null;

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => res();
      s.onerror = () => { gisPromise = null; rej(new Error('Impossible de charger Google')); };
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  function hhmm(iso) { return U.time(new Date(iso)); }

  const GCal = {
    configured() { return !!(Store.get().settings.gcalClientId || '').trim(); },
    token() {
      try {
        const t = JSON.parse(sessionStorage.getItem(TKEY));
        if (t && t.exp > Date.now() + 30e3) return t.t;
      } catch (e) { /* */ }
      return null;
    },
    connected() { return !!GCal.token(); },
    lastSync() { return Store.get().cache.gcalSyncedAt || null; },

    /** Doit être appelé suite à un clic (fenêtre Google). */
    async connect() {
      const id = (Store.get().settings.gcalClientId || '').trim();
      if (!id) throw new Error('Ajoute d’abord ton identifiant client Google dans Plus › Réglages.');
      await loadGis();
      return new Promise((resolve, reject) => {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: SCOPE,
          callback: (r) => {
            if (r.error) return reject(new Error(r.error_description || r.error));
            sessionStorage.setItem(TKEY, JSON.stringify({ t: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 }));
            resolve();
          },
          error_callback: (e) => reject(new Error(e && e.message ? e.message : 'Connexion annulée')),
        });
        tokenClient.requestAccessToken({ prompt: Store.get().settings.gcalConsented ? '' : 'consent' });
      });
    },
    disconnect() {
      const t = GCal.token();
      sessionStorage.removeItem(TKEY);
      if (t && window.google && google.accounts) try { google.accounts.oauth2.revoke(t); } catch (e) { /* */ }
      Store.update((s) => { s.cache.gcal = {}; s.cache.gcalSyncedAt = null; s.settings.gcalConsented = false; });
    },

    async api(path, params) {
      const t = GCal.token();
      if (!t) throw new Error('not-connected');
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const r = await fetch('https://www.googleapis.com/calendar/v3/' + path + qs, { headers: { Authorization: 'Bearer ' + t } });
      if (r.status === 401) { sessionStorage.removeItem(TKEY); throw new Error('not-connected'); }
      if (!r.ok) throw new Error('Google Agenda : erreur ' + r.status);
      return r.json();
    },

    /** Récupère les 8 prochains jours de tous les agendas affichés. */
    async sync() {
      const start = U.parse(U.today());
      const end = U.parse(U.addDays(U.today(), 8));
      const list = await GCal.api('users/me/calendarList', { minAccessRole: 'reader' });
      const cals = (list.items || []).filter((c) => c.selected !== false && !c.hidden);
      const byDay = {};
      const push = (k, ev) => { (byDay[k] = byDay[k] || []).push(ev); };
      await Promise.all(cals.map(async (c) => {
        const r = await GCal.api('calendars/' + encodeURIComponent(c.id) + '/events', {
          timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
        });
        (r.items || []).forEach((e) => {
          if (e.status === 'cancelled') return;
          const base = { id: e.id, title: e.summary || '(Sans titre)', place: e.location || '', color: c.backgroundColor || '#6aa9ff', link: e.htmlLink || '', calendar: c.summaryOverride || c.summary || '' };
          if (e.start.date) {
            let k = e.start.date;
            const last = U.addDays(e.end.date, -1);
            let guard = 0;
            while (k <= last && guard++ < 40) { push(k, Object.assign({ allDay: true }, base)); k = U.addDays(k, 1); }
          } else {
            const k = U.key(new Date(e.start.dateTime));
            push(k, Object.assign({ start: hhmm(e.start.dateTime), end: hhmm(e.end.dateTime) }, base));
          }
        });
      }));
      Store.update((s) => { s.cache.gcal = byDay; s.cache.gcalSyncedAt = Date.now(); s.settings.gcalConsented = true; });
      return byDay;
    },
  };

  window.Weather = Weather;
  window.GCal = GCal;
})();
