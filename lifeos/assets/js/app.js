/* Application : navigation, rendu, raccourcis, accueil. */
(function () {
  const NAV = [
    { id: 'aujourdhui', label: "Aujourd'hui", short: "Aujourd'hui", icon: 'home', view: () => TodayView },
    { id: 'rituels', label: 'Rituels', short: 'Rituels', icon: 'sunrise', view: () => RitualsView },
    { id: 'inbox', label: 'Boîte de réception', short: 'Inbox', icon: 'inbox', view: () => InboxView },
    { id: 'projets', label: 'Objectifs & projets', short: 'Projets', icon: 'target', view: () => ProjectsView },
    { id: 'plus', label: 'Plus', short: 'Plus', icon: 'grid', view: () => MoreView },
  ];
  const SOON = [
    { label: 'Emploi', icon: 'briefcase' },
    { label: 'Admin & papiers', icon: 'file' },
    { label: 'Budget', icon: 'wallet' },
    { label: 'Habitudes & sport', icon: 'dumbbell' },
    { label: 'Focus', icon: 'timer' },
    { label: 'Statistiques', icon: 'chart' },
  ];

  const viewEl = () => document.getElementById('view');
  let current = { name: null, params: [] };
  let lastDay = U.today();

  function parse() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const name = NAV.some((n) => n.id === parts[0]) ? parts[0] : 'aujourdhui';
    return { name, params: parts.slice(1) };
  }

  function renderNav() {
    const s = Store.get();
    const nIn = s.inbox.length;
    const side = NAV.map((n) =>
      '<a class="nav-item' + (current.name === n.id ? ' active' : '') + '" href="#/' + n.id + '"' + (current.name === n.id ? ' aria-current="page"' : '') + '><span class="ico">' + ic(n.icon) + '</span>' + n.label +
      (n.id === 'inbox' && nIn ? '<span class="nav-badge num">' + nIn + '</span>' : '') + '</a>').join('') +
      '<div class="side-label">Bientôt</div>' + SOON.map((m) => '<span class="nav-item soon" title="Module à venir"><span class="ico">' + ic(m.icon) + '</span>' + m.label + '</span>').join('');
    document.getElementById('side-nav').innerHTML = side;
    document.getElementById('tabbar').innerHTML = NAV.map((n) =>
      '<a class="tab' + (current.name === n.id ? ' active' : '') + '" href="#/' + n.id + '"><span class="ico">' + ic(n.icon) + '</span>' + n.short +
      (n.id === 'inbox' && nIn ? '<span class="dot num">' + (nIn > 9 ? '9+' : nIn) + '</span>' : '') + '</a>').join('');
    const sc = M.dayScore(U.today()).score;
    document.getElementById('side-foot').innerHTML = '<a class="nav-item" href="#/aujourdhui" style="gap:12px">' + C.ring(sc, { size: 'sm', label: sc }) + '<div><div style="font-weight:600;font-size:13px">Score du jour</div><div class="hint" style="font-size:12px">' + (s.settings.name ? U.esc(s.settings.name) : 'Life OS') + '</div></div></a>';
    const sub = document.getElementById('brand-sub');
    if (sub) sub.textContent = U.fmt(U.today(), { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function render(opts) {
    opts = opts || {};
    const nav = NAV.find((n) => n.id === current.name);
    const View = nav.view();
    const el = viewEl();
    const y = window.scrollY;
    const flowScroll = el.querySelector('.flow-body') ? el.querySelector('.flow-body').scrollTop : 0;
    document.body.classList.remove('ritual-open');
    UI.closeMenu();
    el.innerHTML = View.render(current.params);
    el.classList.toggle('enter', !!opts.enter);
    if (opts.enter) setTimeout(() => el.classList.remove('enter'), 700);
    if (View.mount) View.mount(el, current.params);
    if (!opts.enter) {
      window.scrollTo(0, y);
      const fb = el.querySelector('.flow-body');
      if (fb && flowScroll) fb.scrollTop = flowScroll;
    }
    renderNav();
    document.title = (nav.label === "Aujourd'hui" ? 'Life OS' : nav.label + ' · Life OS');
  }

  function route() {
    const next = parse();
    const changed = next.name !== current.name || next.params.join('/') !== current.params.join('/');
    current = next;
    const View = NAV.find((n) => n.id === current.name).view();
    if (changed && View.onEnter) View.onEnter(current.params);
    render({ enter: changed });
    if (changed) window.scrollTo(0, 0);
  }

  /* Délégation des clics : action de la vue, sinon action commune. */
  function onClick(e) {
    const g = e.target.closest('[data-global]');
    if (g) { C.actions[g.dataset.global] && C.actions[g.dataset.global](g, e); return; }
    const el = e.target.closest('[data-act]');
    if (!el || !viewEl().contains(el)) return;
    const act = el.dataset.act;
    const View = NAV.find((n) => n.id === current.name).view();
    const fn = (View.actions && View.actions[act]) || C.actions[act];
    if (fn) {
      if (el.tagName === 'A' && el.getAttribute('href') === '#/projets' && act !== 'go') e.preventDefault();
      fn(el, e);
    }
  }

  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    if (e.key === 'Escape') {
      if (UI._menu) { UI.closeMenu(); return; }
      if (UI.closeTop()) return;
      if (current.name === 'rituels' && current.params[0]) { RitualsView.actions['r-close'](); return; }
      if (typing) e.target.blur();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!UI.hasOpen()) C.capture(); }
      return;
    }
    if (UI.hasOpen()) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); C.capture(); }
    const i = ['1', '2', '3', '4', '5'].indexOf(e.key);
    if (i >= 0) location.hash = '#/' + NAV[i].id;
  }

  function onboarding() {
    let seed = true;
    UI.sheet({
      title: false,
      body:
        '<div style="text-align:center;padding:18px 0 4px"><div class="brand-mark" style="width:56px;height:56px;border-radius:18px;margin:0 auto 18px"></div>' +
        '<h2 class="flow-title" style="font-size:26px">Bienvenue dans ton Life OS</h2>' +
        '<p class="flow-sub" style="margin-bottom:6px">Ta journée, tes rituels, tes idées et tes objectifs, au même endroit.</p></div>' +
        '<div class="field"><label>Comment t’appelles-tu ?</label><input class="input" data-f="name" placeholder="Ton prénom" autofocus maxlength="40"></div>' +
        '<button class="chip on" data-seed style="align-self:flex-start">' + ic('check') + 'Ajouter quelques exemples pour découvrir</button>' +
        '<div class="hint">Tes données restent dans ce navigateur et sont sauvegardées automatiquement. Tu pourras tout modifier ou supprimer.</div>',
      foot: '<span class="grow"></span><button class="btn primary lg" data-go>C’est parti ' + ic('arrow-right') + '</button>',
      onMount(el, close) {
        const sb = el.querySelector('[data-seed]');
        sb.onclick = () => { seed = !seed; sb.classList.toggle('on', seed); sb.innerHTML = (seed ? ic('check') : ic('plus')) + 'Ajouter quelques exemples pour découvrir'; };
        const go = () => {
          const name = el.querySelector('[data-f="name"]').value.trim();
          Store.update((s) => { s.settings.name = name; s.settings.onboarded = true; });
          if (seed) Store.seed();
          close();
        };
        el.querySelector('[data-go]').onclick = go;
        el.querySelector('[data-f="name"]').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      },
      onClose() { if (!Store.get().settings.onboarded) Store.update((s) => { s.settings.onboarded = true; }); },
    });
  }

  function tick() {
    const d = U.today();
    const busy = UI.hasOpen() || (document.activeElement && /input|textarea|select/i.test(document.activeElement.tagName));
    if (d !== lastDay) { lastDay = d; if (!busy) render(); return; }
    if (!busy && current.name === 'aujourdhui') render();
  }

  function init() {
    // Dégradé partagé pour les anneaux de progression
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('width', '0');
    defs.setAttribute('height', '0');
    defs.setAttribute('aria-hidden', 'true');
    defs.style.position = 'absolute';
    defs.innerHTML = '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a593ff"/><stop offset="1" stop-color="#6aa9ff"/></linearGradient></defs>';
    document.body.prepend(defs);

    Icons.hydrate(document);
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', route);
    Store.subscribe(() => render());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    setInterval(tick, 5 * 60e3);

    if (!location.hash) history.replaceState(null, '', '#/aujourdhui');
    route();
    if (!Store.get().settings.onboarded) setTimeout(onboarding, 350);
  }

  window.App = { render: () => render(), NAV };
  document.addEventListener('DOMContentLoaded', init);
})();
