/* Rituels guidés : matin, soir, bilan hebdomadaire. */
(function () {
  const F = { type: null, step: 0, dir: 1, animate: true, data: {} };

  const DEF = {
    matin: {
      name: 'Rituel du matin',
      steps: ['Ta journée', 'Ce qui traîne', 'Tes priorités', "C'est parti"],
    },
    soir: {
      name: 'Rituel du soir',
      steps: ['Ce qui est fait', 'Reporter le reste', 'En une phrase', 'Bilan'],
    },
    semaine: {
      name: 'Bilan de la semaine',
      steps: ['En chiffres', 'Réflexion', 'Semaine prochaine', 'Terminé'],
    },
  };

  function start(type) {
    F.type = type;
    F.step = 0;
    F.dir = 1;
    F.animate = true;
    const k = U.today();
    if (type === 'soir') {
      const d = M.day(k);
      F.data = { journal: d.journal || '', mood: d.mood || 0 };
    } else if (type === 'semaine') {
      const r = Store.get().reviews[U.isoWeek(k)] || {};
      F.data = { wins: r.wins || '', blockers: r.blockers || '', adjust: r.adjust || '', next: (r.next || ['', '', '']).slice(0, 3), rating: r.rating || 0 };
      while (F.data.next.length < 3) F.data.next.push('');
    } else F.data = {};
  }

  /* ---------------- Étapes ---------------- */
  function morningStep(i) {
    const k = U.today();
    const s = Store.get();
    if (i === 0) {
      const w = Weather.cached() && Weather.cached().data;
      const name = s.settings.name ? ', ' + U.esc(s.settings.name) : '';
      let wx = '';
      if (w) wx = '<div class="weather" style="margin-bottom:22px">' + w.map((x) => { const m = Weather.wmo(x.code, x.isDay); return '<div class="wx"><div class="wx-ico ' + m.cls + '">' + ic(m.icon) + '</div><div class="wx-top"><span class="wx-temp num">' + x.temp + '°</span><span class="wx-city">' + U.esc(x.city) + '</span></div><div class="wx-sub">' + m.label + ' · ' + x.min + '°/' + x.max + '°</div></div>'; }).join('') + '</div>';
      const evs = C.eventsList(k);
      return head('sunrise', U.longDate(k), U.greeting() + name + ' !', 'Prends 2 minutes pour poser ta journée. D’abord, ce qui est déjà prévu.') + wx +
        '<div class="card"><div class="card-head"><h2 class="h2">' + ic('calendar') + 'Agenda du jour</h2><span class="spacer"></span><button class="btn ghost sm" data-act="add-event">' + ic('plus') + 'Rendez-vous</button></div>' +
        (evs || C.empty('calendar', 'Aucun rendez-vous', 'Tu as toute la journée pour tes priorités.', '', 'sm')) + '</div>';
    }
    if (i === 1) {
      const late = M.overdue(k);
      let h = head('forward', 'Étape 2', 'Ce qui traîne', 'Décide maintenant pour les tâches en retard : on les fait aujourd’hui, on les replanifie, ou on les lâche.');
      if (!late.length) return h + '<div class="card">' + C.empty('check', 'Rien en retard', 'Tu pars avec une ardoise propre.', '', '') + '</div>';
      return h + '<div class="pick-list">' + late.map((t) => reportItem(t, [
        { a: 'today', label: "Aujourd'hui", icon: 'sun' },
        { a: 'later', label: 'Plus tard', icon: 'calendar' },
        { a: 'drop', label: 'Abandonner', icon: 'trash' },
      ])).join('') + '</div>';
    }
    if (i === 2) {
      const sel = (M.day(k).priorities || []).filter((id) => M.task(id));
      const open = s.tasks.filter((t) => t.status !== 'done');
      const todayTs = open.filter((t) => t.date === k);
      const proj = open.filter((t) => t.date !== k && t.projectId && !(t.date && t.date < k));
      proj.sort((a, b) => (b.status === 'doing') - (a.status === 'doing'));
      const pick = (t) => { const n = sel.indexOf(t.id); return '<button class="pick' + (n >= 0 ? ' on' : '') + '" data-act="r-pick" data-id="' + t.id + '"><span class="badge-n">' + (n >= 0 ? n + 1 : '') + '</span><div class="pk-body"><div class="pk-title">' + U.esc(t.title) + '</div><div class="task-meta">' + C.projectTag(t) + C.dateTag(t) + (t.status === 'doing' ? '<span class="tag today">En cours</span>' : '') + '</div></div></button>'; };
      return head('star', 'Étape 3 · ' + sel.length + '/3', 'Tes 3 priorités', 'Si tu ne faisais que trois choses aujourd’hui, lesquelles rendraient la journée réussie ?') +
        '<form class="quick-add" data-form="r-new" style="margin-bottom:16px"><span class="ico">' + ic('plus') + '</span><input placeholder="Écrire une nouvelle priorité…" maxlength="200" autocomplete="off"><button class="btn sm primary" type="submit">' + ic('arrow-up') + '</button></form>' +
        (todayTs.length ? '<div class="group-label">Prévu aujourd’hui</div><div class="pick-list">' + todayTs.map(pick).join('') + '</div>' : '') +
        (proj.length ? '<div class="group-label">Dans mes projets</div><div class="pick-list">' + proj.slice(0, 20).map(pick).join('') + '</div>' : '') +
        (!todayTs.length && !proj.length ? C.empty('star', 'Aucune tâche ouverte', 'Écris ta première priorité juste au-dessus.', '', 'sm') : '');
    }
    const pr = M.priorities(k);
    const nEv = M.eventsOn(k).length;
    return head('zap', 'Prêt', "C'est parti !", pr.length ? 'Voici ce qui compte aujourd’hui. Commence par la n°1.' : 'Aucune priorité choisie : tu peux revenir en arrière, ou y aller au fil de l’eau.') +
      (pr.length ? '<div class="prios">' + pr.map((t, n) => '<div class="prio"><span class="rank num">' + (n + 1) + '</span><div class="p-body"><div class="p-title">' + U.esc(t.title) + '</div><div class="task-meta">' + C.projectTag(t) + '</div></div></div>').join('') + '</div>' : '') +
      '<div class="stat-grid" style="margin-top:16px"><div class="stat"><b class="num">' + pr.length + '</b><span>priorités</span></div><div class="stat"><b class="num">' + nEv + '</b><span>rendez-vous</span></div><div class="stat"><b class="num">' + M.tasksOn(k).filter((t) => t.status !== 'done').length + '</b><span>tâches prévues</span></div><div class="stat"><b class="num">' + Store.get().inbox.length + '</b><span>à trier</span></div></div>';
  }

  function eveningStep(i) {
    const k = U.today();
    if (i === 0) {
      const pids = M.day(k).priorities || [];
      const list = M.tasksOn(k);
      list.sort((a, b) => pids.includes(b.id) - pids.includes(a.id));
      const done = list.filter((t) => t.status === 'done').length;
      return head('moon', U.longDate(k), 'Ce qui est fait', list.length ? done + ' sur ' + list.length + ' terminées. Coche ce que tu as accompli, même les petites choses.' : 'Aucune tâche prévue aujourd’hui.') +
        (list.length ? '<div class="card"><div class="tasks">' + list.map((t) => C.taskRow(t, { hideDate: true, noStar: true }).replace('class="task-title">', 'class="task-title">' + (pids.includes(t.id) ? '<span style="color:var(--warn);margin-right:6px">' + ic('star') + '</span>' : ''))).join('') + '</div></div>' : '<div class="card">' + C.empty('sparkles', 'Journée sans liste', 'Pas grave : passe à la suite.', '', 'sm') + '</div>');
    }
    if (i === 1) {
      const rest = M.tasksOn(k).filter((t) => t.status !== 'done').concat(M.overdue(k));
      let h = head('forward', 'Étape 2', 'Reporter le reste', 'Rien ne reste en suspens : chaque tâche non faite reçoit une nouvelle date ou est abandonnée.');
      if (!rest.length) return h + '<div class="card">' + C.empty('check', 'Tout est rangé', 'Aucune tâche ouverte pour aujourd’hui. Bien joué.', '', '') + '</div>';
      return h + '<div class="row" style="margin-bottom:14px"><button class="btn" data-act="r-all-tomorrow">' + ic('sunrise') + 'Tout reporter à demain</button></div>' +
        '<div class="pick-list">' + rest.map((t) => reportItem(t, [
          { a: 'tomorrow', label: 'Demain', icon: 'sunrise' },
          { a: 'later', label: 'Choisir', icon: 'calendar' },
          { a: 'inbox', label: 'Sans date', icon: 'inbox' },
          { a: 'drop', label: 'Abandonner', icon: 'trash' },
        ])).join('') + '</div>';
    }
    if (i === 2) {
      return head('pen', 'Étape 3', 'En une phrase', 'Comment s’est passée ta journée ?') +
        '<textarea class="textarea one-line" data-r="journal" maxlength="280" placeholder="Aujourd’hui, j’ai…">' + U.esc(F.data.journal) + '</textarea>' +
        '<div class="label" style="margin:20px 0 10px">Ton humeur</div>' + moods(F.data.mood, 'r-mood');
    }
    const sc = M.dayScore(k);
    const pr = M.priorities(k);
    const ts = M.tasksOn(k);
    return '<div class="celebrate">' + C.ring(sc.score, { size: 'lg', sub: 'score du jour' }) +
      '<h2 class="flow-title">' + (sc.score >= 70 ? 'Belle journée !' : sc.score >= 40 ? 'Une journée qui compte.' : 'Demain est un nouveau départ.') + '</h2>' +
      '<p class="flow-sub">Repose-toi bien. Tout est rangé pour demain.</p></div>' +
      '<div class="stat-grid"><div class="stat"><b class="num">' + pr.filter((t) => t.status === 'done').length + '/' + pr.length + '</b><span>priorités</span></div>' +
      '<div class="stat"><b class="num">' + ts.filter((t) => t.status === 'done').length + '</b><span>tâches faites</span></div>' +
      '<div class="stat"><b class="num">' + M.eventsOn(k).length + '</b><span>rendez-vous</span></div>' +
      '<div class="stat"><b class="num">' + M.tasksOn(U.addDays(k, 1)).length + '</b><span>prévues demain</span></div></div>' +
      (F.data.journal ? '<div class="card" style="margin-top:16px"><div class="j-text">« ' + U.esc(F.data.journal) + ' »</div></div>' : '');
  }

  function weekStep(i) {
    const k = U.today();
    const ws = M.weekStats(k);
    const label = 'Semaine ' + U.weekNumber(k) + ' · ' + U.dayMonth(ws.days[0]) + ' – ' + U.dayMonth(ws.days[6]);
    if (i === 0) {
      const mood = ws.mood ? M.MOODS[Math.round(ws.mood) - 1] : null;
      return head('chart', label, 'La semaine en chiffres', 'Un regard bienveillant sur les 7 derniers jours.') +
        '<div class="stat-grid"><div class="stat"><b class="num">' + ws.done + '</b><span>tâches terminées</span></div>' +
        '<div class="stat"><b class="num">' + ws.prDone + '/' + ws.prTotal + '</b><span>priorités atteintes</span></div>' +
        '<div class="stat"><b class="num">' + ws.mornings + '/7</b><span>rituels du matin</span></div>' +
        '<div class="stat"><b class="num">' + ws.evenings + '/7</b><span>rituels du soir</span></div></div>' +
        (mood ? '<div class="card" style="margin-top:12px"><div class="row"><span class="mood-dot" style="background:' + mood.color + ';width:12px;height:12px"></span><div><b>Humeur moyenne : ' + mood.name.toLowerCase() + '</b><div class="hint">' + ws.journal.length + ' jour(s) notés</div></div></div></div>' : '') +
        (ws.journal.length ? '<div class="card" style="margin-top:12px"><div class="card-head"><h2 class="h2">' + ic('book') + 'Ton journal</h2></div><div class="journal">' + ws.journal.map(jItem).join('') + '</div></div>' : '');
    }
    if (i === 1) {
      return head('pen', label, 'Réflexion', 'Trois questions, quelques mots suffisent.') +
        '<div class="stack">' +
        '<div class="field"><label>' + ic('trophy') + ' Ce qui a bien marché</label><textarea class="textarea" data-r="wins" placeholder="Mes victoires, petites ou grandes…">' + U.esc(F.data.wins) + '</textarea></div>' +
        '<div class="field"><label>' + ic('alert') + ' Ce qui a coincé</label><textarea class="textarea" data-r="blockers" placeholder="Ce qui m’a freiné…">' + U.esc(F.data.blockers) + '</textarea></div>' +
        '<div class="field"><label>' + ic('sliders') + ' Ce que j’ajuste</label><textarea class="textarea" data-r="adjust" placeholder="Une chose à changer la semaine prochaine…">' + U.esc(F.data.adjust) + '</textarea></div>' +
        '</div>';
    }
    if (i === 2) {
      return head('target', 'Semaine ' + (U.weekNumber(U.addDays(k, 7))), 'La semaine prochaine', 'Tes 3 focus. Ils s’afficheront sur l’écran Aujourd’hui toute la semaine.') +
        '<div class="stack">' + [0, 1, 2].map((n) => '<div class="quick-add" style="border-style:solid"><span class="rank num" style="font-weight:700;color:var(--faint);width:18px">' + (n + 1) + '</span><input data-r="next" data-n="' + n + '" value="' + U.esc(F.data.next[n]) + '" placeholder="' + ['Ex. : Envoyer 5 candidatures', 'Ex. : Boucler le dossier CAF', 'Ex. : 3 séances de sport'][n] + '" maxlength="140"></div>').join('') + '</div>' +
        '<div class="label" style="margin:22px 0 10px">Ta note pour cette semaine</div>' + moods(F.data.rating, 'r-rating');
    }
    return '<div class="celebrate"><div class="empty big" style="padding:10px 0 0"><div class="e-ico">' + ic('trophy') + '</div></div>' +
      '<h2 class="flow-title">Semaine bouclée</h2><p class="flow-sub">Ton bilan est enregistré. Profite de ton dimanche.</p></div>' +
      (F.data.next.filter(Boolean).length ? '<div class="card"><div class="card-head"><h2 class="h2">' + ic('target') + 'Focus de la semaine prochaine</h2></div><div class="prios">' + F.data.next.filter(Boolean).map((t, n) => '<div class="prio"><span class="rank num">' + (n + 1) + '</span><div class="p-body"><div class="p-title">' + U.esc(t) + '</div></div></div>').join('') + '</div></div>' : '');
  }

  /* ---------------- Morceaux ---------------- */
  function head(icon, kicker, title, sub) {
    return '<div class="flow-kicker">' + ic(icon) + '<span>' + kicker + '</span></div><h1 class="flow-title">' + title + '</h1>' + (sub ? '<p class="flow-sub">' + sub + '</p>' : '');
  }
  function reportItem(t, acts) {
    return '<div class="report-item"><div><div class="ri-title">' + U.esc(t.title) + '</div><div class="task-meta">' + C.projectTag(t) + C.dateTag(t) + '</div></div>' +
      '<div class="report-actions">' + acts.map((a) => '<button class="chip' + (a.a === 'drop' ? ' danger' : '') + '" data-act="r-report" data-a="' + a.a + '" data-id="' + t.id + '">' + ic(a.icon) + a.label + '</button>').join('') + '</div></div>';
  }
  function moods(val, act) {
    return '<div class="moods">' + M.MOODS.map((m) => '<button class="mood' + (val === m.v ? ' on' : '') + '" style="--m:' + m.color + '" data-act="' + act + '" data-v="' + m.v + '"><i></i>' + m.name + '</button>').join('') + '</div>';
  }
  function jItem(j) {
    const m = j.mood ? M.MOODS[j.mood - 1] : null;
    return '<div class="j-item"><div class="j-date">' + U.fmt(j.date, { weekday: 'short', day: 'numeric', month: 'short' }) + '</div><div class="j-text">' + (m ? '<span class="mood-dot" style="background:' + m.color + '" title="' + m.name + '"></span>' : '') + U.esc(j.text) + '</div></div>';
  }

  function flowHTML() {
    const def = DEF[F.type];
    const n = def.steps.length;
    const fn = F.type === 'matin' ? morningStep : F.type === 'soir' ? eveningStep : weekStep;
    const last = F.step === n - 1;
    const anim = F.animate ? ' flow-step' + (F.dir < 0 ? ' back' : '') : '';
    F.animate = false;
    return '<div class="flow" role="dialog" aria-label="' + def.name + '">' +
      '<div class="flow-top"><button class="icon-btn" data-act="r-close" aria-label="Quitter">' + ic('x') + '</button>' +
      '<div class="flow-progress">' + def.steps.map((_, i) => '<i class="' + (i <= F.step ? 'on' : '') + '"></i>').join('') + '</div>' +
      '<span class="count">' + (F.step + 1) + '/' + n + '</span></div>' +
      '<div class="flow-body"><div class="flow-inner"><div class="' + anim + '">' + fn(F.step) + '</div></div></div>' +
      '<div class="flow-foot"><div class="in">' +
        (F.step > 0 && !last ? '<button class="btn ghost" data-act="r-prev">' + ic('chevron-left') + 'Retour</button>' : '<span></span>') +
        '<button class="btn primary lg" data-act="' + (last ? 'r-finish' : 'r-next') + '">' + (last ? ic('check') + 'Terminer' : 'Continuer' + ic('arrow-right')) + '</button>' +
      '</div></div></div>';
  }

  /* ---------------- Page d'accueil des rituels ---------------- */
  function landing() {
    const k = U.today();
    const s = Store.get();
    const d = M.day(k);
    const h = new Date().getHours();
    const sunday = U.weekday(k) === 6;
    const review = s.reviews[U.isoWeek(k)];
    const sugg = !d.morningDone && h < 14 ? 'matin' : !d.eveningDone && h >= 18 ? 'soir' : sunday && !review ? 'semaine' : null;
    const card = (type, cls, icon, title, text, status) =>
      '<div class="ritual-card ' + cls + (sugg === type ? ' suggested' : '') + '" data-act="go" data-to="#/rituels/' + type + '"><div class="rc-ico">' + ic(icon) + '</div>' +
      '<div class="rc-t">' + title + '</div><div class="rc-s">' + text + '</div><div class="rc-foot">' + status + '<span class="spacer"></span><span class="link-btn">' + (sugg === type ? 'Commencer' : 'Ouvrir') + ic('arrow-right') + '</span></div></div>';
    const st = (done, at, todo) => done ? '<span class="pill ok">' + ic('check') + 'Fait' + (at ? ' à ' + U.time(new Date(at)) : '') + '</span>' : '<span class="pill">' + todo + '</span>';

    const journal = Object.keys(s.days).filter((x) => s.days[x].journal).sort().reverse().slice(0, 14).map((x) => ({ date: x, text: s.days[x].journal, mood: s.days[x].mood }));
    const reviews = Object.keys(s.reviews).sort().reverse().slice(0, 8);

    // Série de rituels du soir consécutifs
    let streak = 0;
    let cur = d.eveningDone ? k : U.addDays(k, -1);
    while (s.days[cur] && s.days[cur].eveningDone) { streak++; cur = U.addDays(cur, -1); }

    return '<header class="page-head"><div class="grow"><div class="eyebrow">Rituels</div><h1 class="h1">Des routines qui tiennent</h1><p class="lead">Le matin pour choisir, le soir pour ranger, le dimanche pour prendre du recul.</p></div>' +
      (streak > 1 ? '<span class="pill warn">' + ic('zap') + streak + ' soirs d’affilée</span>' : '') + '</header>' +
      '<div class="rituals-grid">' +
        card('matin', 'r-morning', 'sunrise', 'Matin', '2 minutes : ton agenda, ce qui traîne, tes 3 priorités.', st(d.morningDone, d.morningAt, 'À faire')) +
        card('soir', 'r-evening', 'moon', 'Soir', 'Coche ce qui est fait, reporte le reste, une phrase sur ta journée.', st(d.eveningDone, d.eveningAt, h >= 18 ? 'C’est l’heure' : 'Ce soir')) +
        card('semaine', 'r-week', 'chart', 'Bilan de la semaine', 'Chaque dimanche : chiffres, réflexion, 3 focus pour la suite.', review ? '<span class="pill ok">' + ic('check') + 'Fait</span>' : '<span class="pill">' + (sunday ? 'Aujourd’hui' : 'Dimanche') + '</span>') +
      '</div>' +
      '<div class="today-grid" style="margin-top:20px;grid-template-areas:none;">' +
        '<section class="card"><div class="card-head"><h2 class="h2">' + ic('book') + 'Journal</h2><span class="count">' + journal.length + '</span></div>' +
          (journal.length ? '<div class="journal">' + journal.map(jItem).join('') + '</div>' : C.empty('pen', 'Ton journal est vide', 'Chaque rituel du soir y ajoute une phrase.', '', 'sm')) + '</section>' +
        '<section class="card"><div class="card-head"><h2 class="h2">' + ic('chart') + 'Bilans précédents</h2></div>' +
          (reviews.length ? '<div class="projects-mini" style="margin:0">' + reviews.map((w) => { const r = s.reviews[w]; const m = r.rating ? M.MOODS[r.rating - 1] : null; return '<div class="pm" style="cursor:pointer" data-act="r-view" data-w="' + w + '"><span class="domain-ico sm" style="--c:#4fd1a1">' + ic('calendar-check') + '</span><span class="pm-name">Semaine ' + Number(w.split('-S')[1]) + (r.wins ? ' · <span class="muted">' + U.esc(r.wins.slice(0, 60)) + '</span>' : '') + '</span>' + (m ? '<span class="mood-dot" style="background:' + m.color + '"></span>' : '') + ic('chevron-right') + '</div>'; }).join('') + '</div>' : C.empty('calendar-check', 'Aucun bilan pour l’instant', 'Ton premier bilan t’attend dimanche.', '', 'sm')) + '</section>' +
      '</div>';
  }

  function saveDraft() {
    const k = U.today();
    if (F.type === 'soir') M.setDay(k, { journal: (F.data.journal || '').trim(), mood: F.data.mood || null });
    if (F.type === 'semaine') {
      Store.update((s) => {
        const w = U.isoWeek(k);
        s.reviews[w] = Object.assign(s.reviews[w] || {}, { wins: F.data.wins, blockers: F.data.blockers, adjust: F.data.adjust, next: F.data.next, rating: F.data.rating || null, draft: true });
      }, { silent: true });
    }
  }

  const RitualsView = {
    render(params) {
      const type = params[0];
      if (type && DEF[type]) {
        if (F.type !== type) start(type);
        return flowHTML();
      }
      F.type = null;
      return landing();
    },
    mount(root, params) {
      if (!params[0] || !DEF[params[0]]) return;
      document.body.classList.add('ritual-open');
      root.querySelectorAll('[data-r]').forEach((inp) => {
        inp.addEventListener('input', () => {
          if (inp.dataset.r === 'next') F.data.next[+inp.dataset.n] = inp.value;
          else F.data[inp.dataset.r] = inp.value;
        });
        inp.addEventListener('change', saveDraft);
      });
      const nf = root.querySelector('[data-form="r-new"]');
      if (nf) {
        nf.onsubmit = (e) => {
          e.preventDefault();
          const inp = nf.querySelector('input');
          const k = U.today();
          const sel = (M.day(k).priorities || []).filter((id) => M.task(id));
          if (!inp.value.trim()) return;
          if (sel.length >= 3) return UI.toast('3 priorités maximum : retire-en une d’abord', { error: true });
          RitualsView._refocus = true;
          const t = M.addTask({ title: inp.value, date: k });
          if (t) M.setPriorities(k, sel.concat(t.id));
        };
        if (RitualsView._refocus) { RitualsView._refocus = false; nf.querySelector('input').focus({ preventScroll: true }); }
      }
      if (F.scrollTop) { root.querySelector('.flow-body').scrollTop = 0; F.scrollTop = false; }
    },
    keepScroll: true,
    actions: {
      'r-next'() { saveDraft(); F.step++; F.dir = 1; F.animate = true; F.scrollTop = true; App.render(); },
      'r-prev'() { saveDraft(); F.step = Math.max(0, F.step - 1); F.dir = -1; F.animate = true; F.scrollTop = true; App.render(); },
      'r-close'() {
        saveDraft();
        F.type = null;
        location.hash = '#/rituels';
      },
      'r-finish'() {
        const k = U.today();
        const type = F.type;
        saveDraft();
        if (type === 'matin') M.setDay(k, { morningDone: true, morningAt: Date.now() });
        if (type === 'soir') M.setDay(k, { eveningDone: true, eveningAt: Date.now() });
        if (type === 'semaine') Store.update((s) => { const r = s.reviews[U.isoWeek(k)]; if (r) { delete r.draft; r.doneAt = Date.now(); } });
        F.type = null;
        location.hash = type === 'semaine' ? '#/rituels' : '#/aujourdhui';
        UI.toast(type === 'matin' ? 'Belle journée ! Commence par ta priorité n°1.' : type === 'soir' ? 'Journée bouclée. Bonne soirée !' : 'Bilan enregistré', { icon: type === 'matin' ? 'sunrise' : type === 'soir' ? 'moon' : 'trophy' });
      },
      'r-pick'(el) {
        const k = U.today();
        const id = el.dataset.id;
        let sel = (M.day(k).priorities || []).filter((x) => M.task(x));
        if (sel.includes(id)) sel = sel.filter((x) => x !== id);
        else if (sel.length < 3) sel.push(id);
        else return UI.toast('3 priorités maximum : retire-en une d’abord', { error: true });
        M.setPriorities(k, sel);
      },
      async 'r-report'(el) {
        const id = el.dataset.id;
        const a = el.dataset.a;
        const k = U.today();
        if (a === 'today') M.updateTask(id, { date: k });
        else if (a === 'tomorrow') { M.setPriority(k, id, false); M.updateTask(id, { date: U.addDays(k, 1) }); }
        else if (a === 'inbox') { M.setPriority(k, id, false); M.updateTask(id, { date: null }); }
        else if (a === 'drop') { M.deleteTask(id); UI.undoToast('Tâche abandonnée'); }
        else if (a === 'later') {
          const d = await UI.pickDate({ title: 'Reporter à…', current: U.addDays(k, 1) });
          if (d !== undefined) { if (d !== k) M.setPriority(k, id, false); M.updateTask(id, { date: d }); }
        }
      },
      'r-all-tomorrow'() {
        const k = U.today();
        const tm = U.addDays(k, 1);
        Store.update((s) => {
          s.tasks.forEach((t) => { if (t.date && t.date <= k && t.status !== 'done') t.date = tm; });
          if (s.days[k]) s.days[k].priorities = (s.days[k].priorities || []).filter((id) => { const t = s.tasks.find((x) => x.id === id); return t && t.date === k; });
        });
        UI.toast('Tout est reporté à demain', { icon: 'sunrise' });
      },
      'r-mood'(el) { F.data.mood = +el.dataset.v; saveDraft(); App.render(); },
      'r-rating'(el) { F.data.rating = +el.dataset.v; saveDraft(); App.render(); },
      'r-view'(el) {
        const w = el.dataset.w;
        const r = Store.get().reviews[w];
        if (!r) return;
        const sec = (t, v) => v ? '<div class="field"><div class="label">' + t + '</div><div style="white-space:pre-wrap">' + U.esc(v) + '</div></div>' : '';
        UI.sheet({
          title: 'Bilan · semaine ' + Number(w.split('-S')[1]),
          body: sec('Ce qui a bien marché', r.wins) + sec('Ce qui a coincé', r.blockers) + sec('Ce que j’ajuste', r.adjust) +
            ((r.next || []).filter(Boolean).length ? '<div class="field"><div class="label">Focus de la semaine suivante</div><ol class="steps-list">' + r.next.filter(Boolean).map((x) => '<li>' + U.esc(x) + '</li>').join('') + '</ol></div>' : '') +
            (!r.wins && !r.blockers && !r.adjust ? '<p class="muted">Bilan sans notes.</p>' : ''),
        });
      },
    },
  };

  window.RitualsView = RitualsView;
})();
