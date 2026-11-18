/* Données : état unique, sauvegarde locale, annulation. */
(function () {
  const KEY = 'lifeos.data.v1';

  const DOMAINS = [
    { id: 'emploi', name: 'Emploi', icon: 'briefcase', color: '#7c9cff' },
    { id: 'admin', name: 'Admin', icon: 'file', color: '#f2b35b' },
    { id: 'budget', name: 'Budget', icon: 'wallet', color: '#4fd1a1' },
    { id: 'sport', name: 'Sport', icon: 'dumbbell', color: '#ff7a6b' },
    { id: 'musique', name: 'Musique', icon: 'music', color: '#c38bff' },
    { id: 'info', name: 'Informatique', icon: 'monitor', color: '#5bc8f2' },
    { id: 'perso', name: 'Perso', icon: 'heart', color: '#f48fb1' },
  ];

  function defaults() {
    return {
      version: 1,
      createdAt: Date.now(),
      settings: { name: '', onboarded: false, gcalClientId: '' },
      goals: [],
      projects: [],
      tasks: [],
      inbox: [],
      ideas: [],
      events: [],
      days: {},
      reviews: {},
      links: [
        { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', color: '#ff6b6b' },
        { id: 'drive', name: 'Drive', url: 'https://drive.google.com', color: '#f2c94c' },
        { id: 'agenda', name: 'Agenda', url: 'https://calendar.google.com', color: '#6aa9ff' },
        { id: 'ft', name: 'France Travail', url: 'https://candidat.francetravail.fr', color: '#7c9cff' },
        { id: 'indeed', name: 'Indeed', url: 'https://fr.indeed.com', color: '#5b8cff' },
      ],
      cache: { gcal: {} },
    };
  }

  function migrate(s) {
    const d = defaults();
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    s.settings = Object.assign({}, d.settings, s.settings);
    s.cache = Object.assign({}, d.cache, s.cache);
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { console.warn('Lecture impossible', e); }
    return defaults();
  }

  let state = load();
  const subs = new Set();
  let undoSnap = null;
  let saveOk = true;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      saveOk = true;
    } catch (e) {
      if (saveOk && window.UI) UI.toast('Sauvegarde impossible sur cet appareil', { error: true });
      saveOk = false;
    }
  }

  function notify() { subs.forEach((f) => { try { f(state); } catch (e) { console.error(e); } }); }

  const Store = {
    DOMAINS,
    domain(id) { return DOMAINS.find((d) => d.id === id) || DOMAINS[DOMAINS.length - 1]; },
    get: () => state,
    /** Applique une modification puis sauvegarde et rafraîchit l'écran. */
    update(fn, opts) {
      if (opts && opts.undoable) undoSnap = JSON.stringify(state);
      fn(state);
      save();
      if (!opts || !opts.silent) notify();
    },
    undo() {
      if (!undoSnap) return false;
      state = migrate(JSON.parse(undoSnap));
      undoSnap = null;
      save();
      notify();
      return true;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    replace(next) { state = migrate(next); save(); notify(); },
    reset() { state = defaults(); save(); notify(); },
    exportJSON() { return JSON.stringify(state, null, 2); },
    /** Recharge si un autre onglet a modifié les données. */
    reloadFromDisk() { state = load(); notify(); },
    KEY,

    /** Exemples pour démarrer avec un espace vivant. */
    seed() {
      const t = U.today();
      const id = U.uid;
      Store.update((s) => {
        const g1 = { id: id(), domain: 'emploi', title: 'Décrocher un poste qui me plaît', why: 'Stabilité et projets motivants', deadline: U.addDays(t, 75), createdAt: Date.now() };
        const g2 = { id: id(), domain: 'admin', title: 'Avoir mes papiers à jour', why: '', deadline: U.addDays(t, 40), createdAt: Date.now() };
        const g3 = { id: id(), domain: 'sport', title: 'Courir 10 km sans m’arrêter', why: 'Énergie et moral', deadline: U.addDays(t, 120), createdAt: Date.now() };
        s.goals.push(g1, g2, g3);
        const p1 = { id: id(), goalId: g1.id, title: 'Candidatures du mois', description: '10 candidatures ciblées Genève / Haute-Savoie.', status: 'active', createdAt: Date.now() };
        const p2 = { id: id(), goalId: g1.id, title: 'Refaire mon CV', description: '', status: 'active', createdAt: Date.now() };
        const p3 = { id: id(), goalId: g2.id, title: 'Renouveler la carte d’identité', description: '', status: 'active', createdAt: Date.now() };
        const p4 = { id: id(), goalId: g3.id, title: 'Plan course 8 semaines', description: '3 sorties par semaine.', status: 'active', createdAt: Date.now() };
        s.projects.push(p1, p2, p3, p4);
        const mk = (title, projectId, date, status, extra) => Object.assign({ id: id(), title, notes: '', projectId: projectId || null, date: date || null, status: status || 'todo', createdAt: Date.now(), doneAt: status === 'done' ? Date.now() : null, order: Date.now() + Math.random() }, extra || {});
        const tasks = [
          mk('Lister 15 entreprises cibles', p1.id, null, 'done'),
          mk('Envoyer 2 candidatures', p1.id, t, 'doing'),
          mk('Relancer l’entreprise de la semaine dernière', p1.id, U.addDays(t, 1)),
          mk('Mettre à jour l’expérience récente', p2.id, t),
          mk('Choisir un modèle de CV sobre', p2.id, null, 'done'),
          mk('Faire relire le CV', p2.id, null),
          mk('Prendre rendez-vous en mairie', p3.id, t),
          mk('Rassembler les justificatifs', p3.id, null),
          mk('Sortie 30 min facile', p4.id, U.addDays(t, 1)),
          mk('Acheter des chaussures adaptées', p4.id, null, 'done'),
          mk('Appeler maman', null, t),
        ];
        s.tasks.push(...tasks);
        s.inbox.push(
          { id: id(), text: 'Regarder les formations financées par France Travail', kind: 'task', createdAt: Date.now() - 3600e3 },
          { id: id(), text: 'Idée : apprendre un morceau de Debussy', kind: 'idea', createdAt: Date.now() - 7200e3 },
        );
        const day = (s.days[t] = s.days[t] || {});
        day.priorities = [tasks[1].id, tasks[3].id, tasks[6].id];
        s.events.push({ id: id(), title: 'Café réseau', date: t, start: '10:00', end: '11:00', place: 'Genève' });
      });
    },
  };

  // Synchronisation entre onglets
  window.addEventListener('storage', (e) => { if (e.key === KEY) Store.reloadFromDisk(); });

  window.Store = Store;
})();
