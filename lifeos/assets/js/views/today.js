/* Écran « Aujourd'hui ». */
(function () {
  function weatherHTML(data) {
    if (!data) {
      return Weather.CITIES.map((c) => '<div class="wx skeleton"><div class="wx-ico cloud">' + ic('cloud') + '</div><div class="wx-top"><span class="wx-temp">00°</span><span class="wx-city">' + c.name + '</span></div><div class="wx-sub">chargement</div></div>').join('');
    }
    return data.map((w) => {
      const m = Weather.wmo(w.code, w.isDay);
      return '<div class="wx" title="Ressenti ' + w.feels + '° · vent ' + w.wind + ' km/h">' +
        '<div class="wx-ico ' + m.cls + '">' + ic(m.icon) + '</div>' +
        '<div class="wx-top"><span class="wx-temp num">' + w.temp + '°</span><span class="wx-city">' + U.esc(w.city) + '</span></div>' +
        '<div class="wx-sub">' + m.label + ' · ' + w.min + '° / ' + w.max + '°' + (w.rain != null && w.rain >= 30 ? ' · ' + ic('drop') + ' ' + w.rain + '%' : '') + '</div></div>';
    }).join('');
  }

  function banner(k) {
    const d = M.day(k);
    const h = new Date().getHours();
    const sunday = U.weekday(k) === 6;
    const reviewDone = !!Store.get().reviews[U.isoWeek(k)];
    let b = null;
    if (sunday && !reviewDone && h >= 10) b = { to: '#/rituels/semaine', icon: 'chart', t: 'Bilan de la semaine', s: "C'est dimanche : 5 minutes pour faire le point et préparer la suite." };
    else if (!d.morningDone && h < 14) b = { to: '#/rituels/matin', icon: 'sunrise', t: 'Rituel du matin · 2 min', s: 'Regarde ton agenda et choisis tes 3 priorités.' };
    else if (!d.eveningDone && h >= 18) b = { to: '#/rituels/soir', icon: 'moon', t: 'Rituel du soir', s: 'Coche ce qui est fait, reporte le reste, une phrase sur ta journée.' };
    if (!b) return '';
    return '<div class="ritual-banner" data-act="go" data-to="' + b.to + '"><div class="rb-ico">' + ic(b.icon) + '</div><div><div class="rb-t">' + b.t + '</div><div class="rb-s">' + b.s + '</div></div><span class="ico go">' + ic('arrow-right') + '</span></div>';
  }

  function priosCard(k) {
    const pr = M.priorities(k);
    const done = pr.filter((t) => t.status === 'done').length;
    let slots = '';
    for (let i = 0; i < 3; i++) {
      const t = pr[i];
      if (t) {
        const d = t.status === 'done';
        const meta = C.projectTag(t);
        slots += '<div class="prio' + (d ? ' done' : '') + '"><span class="rank num">' + (i + 1) + '</span>' +
          '<button class="check lg' + (d ? ' on' : '') + (C.pop === t.id ? ' pop' : '') + '" data-act="toggle" data-id="' + t.id + '" aria-label="Cocher">' + ic('check') + '</button>' +
          '<div class="p-body" data-act="edit" data-id="' + t.id + '"><div class="p-title">' + U.esc(t.title) + '</div>' + (meta ? '<div class="task-meta">' + meta + '</div>' : '') + '</div>' +
          '<button class="icon-btn sm" data-act="unprio" data-id="' + t.id + '" title="Retirer des priorités">' + ic('x') + '</button></div>';
      } else {
        slots += '<div class="prio empty" data-act="pick-prio"><span class="rank num">' + (i + 1) + '</span><span class="ico" style="font-size:18px">' + ic('plus') + '</span><div class="p-body"><div class="p-title">' + (i === 0 && !pr.length ? 'Quelle est la chose la plus importante aujourd’hui ?' : 'Ajouter une priorité') + '</div></div></div>';
      }
    }
    return '<section class="card a-prio"><div class="card-head"><h2 class="h2">' + ic('star') + 'Mes 3 priorités</h2><span class="count num">' + done + '/' + Math.max(3, pr.length) + '</span><span class="spacer"></span>' +
      (pr.length ? '<button class="btn ghost sm" data-act="pick-prio">' + ic('pencil') + 'Changer</button>' : '') + '</div>' +
      '<div class="prios">' + slots + '</div>' +
      (pr.length === 3 && done === 3 ? '<div class="prio-done-all">' + ic('trophy') + 'Les essentiels sont faits. Tout le reste est du bonus.</div>' : '') +
      '</section>';
  }

  function tasksCard(k) {
    const pids = M.day(k).priorities || [];
    const list = M.tasksOn(k).filter((t) => !pids.includes(t.id));
    const late = M.overdue(k);
    const todo = list.filter((t) => t.status !== 'done');
    const done = list.filter((t) => t.status === 'done');
    let h = '<section class="card a-tasks"><div class="card-head"><h2 class="h2">' + ic('list') + 'Tâches du jour</h2><span class="count num">' + done.length + '/' + list.length + '</span><span class="spacer"></span>' +
      '<button class="btn ghost sm" data-act="new-task">' + ic('plus') + 'Détaillée</button></div>' +
      '<form class="quick-add" data-form="quick-task"><span class="ico">' + ic('plus') + '</span><input name="t" placeholder="Ajouter une tâche pour aujourd’hui…" autocomplete="off" maxlength="200"><button class="btn sm primary" type="submit" aria-label="Ajouter">' + ic('arrow-up') + '</button></form>';
    if (!list.length && !late.length) {
      h += C.empty('check', 'Rien d’autre de prévu', 'Ajoute une tâche ou pioche dans tes projets.', '', 'sm');
    } else {
      h += '<div class="tasks" style="margin-top:8px">' + todo.map((t) => C.taskRow(t, { hideDate: true })).join('') + '</div>';
      if (late.length) {
        h += '<div class="group-label late">' + ic('alert') + 'En retard · ' + late.length + '<span class="spacer"></span><button class="link-btn" data-act="pull-late">Tout ramener à aujourd’hui</button></div>' +
          '<div class="tasks">' + late.map((t) => C.taskRow(t)).join('') + '</div>';
      }
      if (done.length) {
        h += '<div class="group-label">' + ic('check') + 'Terminées · ' + done.length + '</div><div class="tasks">' + done.map((t) => C.taskRow(t, { hideDate: true })).join('') + '</div>';
      }
    }
    return h + '</section>';
  }

  function scoreCard(k) {
    const sc = M.dayScore(k);
    const word = sc.score >= 85 ? 'Journée au top' : sc.score >= 60 ? 'Belle dynamique' : sc.score >= 30 ? 'Ça avance' : 'La journée commence';
    return '<section class="card a-score"><div class="card-head"><h2 class="h2">' + ic('zap') + 'Score du jour</h2><span class="spacer"></span><span class="pill accent">' + word + '</span></div>' +
      '<div class="score-wrap">' + C.ring(sc.score, { sub: '/ 100' }) +
      '<div class="meters">' + sc.parts.map((p) => '<div><div class="meter-top"><span>' + p.label + '</span><b class="num">' + p.value + '/' + (p.max || 0) + '</b></div>' + C.bar(Math.round(p.ratio * 100)) + '</div>').join('') + '</div></div>' +
      '<div class="score-note">' + ic('sparkles') + 'Habitudes et temps de focus s’ajouteront au score avec leurs modules.</div></section>';
  }

  function agendaCard(k) {
    const evs = M.eventsOn(k);
    const gc = GCal.configured();
    const connected = GCal.connected();
    let action = '';
    if (gc) action = '<button class="icon-btn sm" data-act="gcal-sync" title="' + (connected ? 'Actualiser Google Agenda' : 'Connecter Google Agenda') + '">' + ic('refresh') + '</button>';
    let h = '<section class="card a-agenda"><div class="card-head"><h2 class="h2">' + ic('calendar') + 'Agenda</h2><span class="count num">' + (evs.length || '') + '</span><span class="spacer"></span>' + action +
      '<button class="icon-btn sm" data-act="add-event" title="Ajouter un rendez-vous">' + ic('plus') + '</button></div>';
    h += evs.length ? C.eventsList(k) : C.empty('calendar', 'Aucun rendez-vous', 'Journée libre pour avancer sur tes priorités.', '', 'sm');
    if (!gc) {
      h += '<div class="score-note" style="margin-top:10px">' + ic('google') + '<span>Relier Google Agenda : <a class="link-btn" href="#/plus">Plus › Réglages</a></span></div>';
    } else if (!connected) {
      h += '<button class="btn sm block" style="margin-top:12px" data-act="gcal-sync">' + ic('google') + (GCal.lastSync() ? 'Reconnecter Google Agenda' : 'Connecter Google Agenda') + '</button>';
      if (GCal.lastSync()) h += '<div class="score-note">Dernière synchro ' + U.ago(GCal.lastSync()) + '</div>';
    }
    return h + '</section>';
  }

  function weekCard(k) {
    const days = U.weekDays(k);
    const s = Store.get();
    const prevReview = s.reviews[U.isoWeek(U.addDays(U.weekStart(k), -1))];
    const focus = prevReview && prevReview.next ? prevReview.next.filter(Boolean) : [];
    let h = '<section class="card a-week"><div class="card-head"><h2 class="h2">' + ic('chart') + 'Ma semaine</h2><span class="count">S' + U.weekNumber(k) + '</span><span class="spacer"></span><a class="link-btn" href="#/rituels">Rituels ' + ic('chevron-right') + '</a></div>';
    h += '<div class="streak-row">' + days.map((d) => {
      const day = s.days[d] || {};
      const isT = d === k;
      return '<div class="streak-day' + (isT ? ' today' : '') + '"><div class="sd"><i class="m' + (day.morningDone ? ' on' : '') + '"></i><i class="e' + (day.eveningDone ? ' on' : '') + '"></i></div>' + U.fmt(d, { weekday: 'narrow' }) + '</div>';
    }).join('') + '</div>';
    h += '<div class="score-note"><span class="dot-c" style="--c:#f2b35b"></span>matin <span class="dot-c" style="--c:#b3a6ff;margin-left:8px"></span>soir</div>';
    if (focus.length) {
      h += '<div class="group-label" style="padding-top:16px">' + ic('target') + 'Focus de la semaine</div><div class="tasks">' + focus.map((f, i) => '<div class="task"><span class="rank num" style="width:24px;color:var(--faint);font-weight:700;font-size:13px;text-align:center">' + (i + 1) + '</span><div class="task-body"><div class="task-title">' + U.esc(f) + '</div></div></div>').join('') + '</div>';
    }
    return h + '</section>';
  }

  /* Choix des priorités */
  function pickPriorities() {
    const k = U.today();
    const selected = (M.day(k).priorities || []).filter((id) => M.task(id));
    const s = Store.get();
    const open = s.tasks.filter((t) => t.status !== 'done');
    const todayTs = open.filter((t) => t.date === k);
    const late = open.filter((t) => t.date && t.date < k);
    const others = open.filter((t) => t.date !== k && !(t.date && t.date < k) && t.projectId).slice(0, 30);
    const block = (title, list) => list.length ? '<div class="group-label">' + title + '</div><div class="pick-list">' + list.map((t) => '<button class="pick" data-id="' + t.id + '"><span class="badge-n"></span><div class="pk-body"><div class="pk-title">' + U.esc(t.title) + '</div><div class="task-meta">' + C.projectTag(t) + C.dateTag(t) + '</div></div></button>').join('') + '</div>' : '';
    UI.sheet({
      title: 'Mes 3 priorités',
      wide: true,
      body: '<p class="lead" style="margin:0">Choisis jusqu’à 3 tâches qui feront de la journée une réussite.</p>' +
        '<form class="quick-add" data-new><span class="ico">' + ic('plus') + '</span><input placeholder="Nouvelle priorité…" maxlength="200"><button class="btn sm" type="submit">Ajouter</button></form>' +
        block("Prévu aujourd'hui", todayTs) + block('En retard', late) + block('Dans mes projets', others) +
        (!todayTs.length && !late.length && !others.length ? C.empty('star', 'Aucune tâche ouverte', 'Écris ta première priorité ci-dessus.', '', 'sm') : ''),
      foot: '<span class="hint" data-n></span><span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>Valider</button>',
      onMount(el, close) {
        let sel = selected.slice();
        const paint = () => {
          el.querySelectorAll('.pick').forEach((b) => {
            const i = sel.indexOf(b.dataset.id);
            b.classList.toggle('on', i >= 0);
            b.querySelector('.badge-n').textContent = i >= 0 ? i + 1 : '';
          });
          el.querySelector('[data-n]').textContent = sel.length + ' / 3 choisies';
        };
        el.addEventListener('click', (e) => {
          const b = e.target.closest('.pick');
          if (!b) return;
          const id = b.dataset.id;
          if (sel.includes(id)) sel = sel.filter((x) => x !== id);
          else if (sel.length < 3) sel.push(id);
          else UI.toast('3 priorités maximum : retire-en une d’abord', { error: true });
          paint();
        });
        el.querySelector('[data-new]').onsubmit = (e) => {
          e.preventDefault();
          const inp = e.target.querySelector('input');
          if (!inp.value.trim()) return;
          if (sel.length >= 3) return UI.toast('3 priorités maximum', { error: true });
          const t = M.addTask({ title: inp.value, date: k });
          sel.push(t.id);
          M.setPriorities(k, sel);
          close();
          pickPriorities();
        };
        el.querySelector('[data-save]').onclick = () => { M.setPriorities(k, sel); close(); };
        paint();
      },
    });
  }

  const TodayView = {
    render() {
      const k = U.today();
      const s = Store.get();
      const name = (s.settings.name || '').trim();
      const nPr = M.priorities(k).filter((t) => t.status !== 'done').length;
      const nEv = M.eventsOn(k).length;
      const nTs = M.tasksOn(k).filter((t) => t.status !== 'done').length;
      const bits = [];
      if (nEv) bits.push(U.plural(nEv, 'rendez-vous', 'rendez-vous'));
      if (nTs) bits.push(U.plural(nTs, 'tâche') + ' à faire');
      const sub = bits.length ? bits.join(' · ') : 'Une page blanche. Que veux-tu accomplir ?';
      return '<header class="hero"><div><div class="date">' + ic('calendar') + U.longDate(k) + ' · S' + U.weekNumber(k) + '</div>' +
        '<h1>' + U.greeting() + (name ? ', <span class="grad">' + U.esc(name) + '</span>' : '') + '</h1><div class="sub">' + sub + (nPr ? '' : '') + '</div></div>' +
        '<div class="weather" id="wx">' + weatherHTML(Weather.cached() && Weather.cached().data) + '</div></header>' +
        banner(k) +
        '<div class="today-grid">' + priosCard(k) + scoreCard(k) + tasksCard(k) + agendaCard(k) + weekCard(k) + '</div>';
    },
    mount(root) {
      Weather.get().then((d) => { const el = root.querySelector('#wx'); if (el && d) el.innerHTML = weatherHTML(d); });
      if (GCal.connected() && (!GCal.lastSync() || Date.now() - GCal.lastSync() > 10 * 60e3)) {
        GCal.sync().catch(() => {});
      }
      const f = root.querySelector('[data-form="quick-task"]');
      if (f) f.onsubmit = (e) => {
        e.preventDefault();
        const inp = f.querySelector('input');
        TodayView._refocus = true;
        if (!M.addTask({ title: inp.value, date: U.today() })) TodayView._refocus = false;
      };
      if (TodayView._refocus) {
        TodayView._refocus = false;
        const inp = root.querySelector('[data-form="quick-task"] input');
        if (inp) inp.focus({ preventScroll: true });
      }
    },
    actions: {
      'pick-prio': pickPriorities,
      unprio(el) { M.setPriority(U.today(), el.dataset.id, false); },
      'new-task'() { C.editTask(null, { date: U.today() }); },
      'pull-late'() {
        const k = U.today();
        Store.update((s) => { s.tasks.forEach((t) => { if (t.date && t.date < k && t.status !== 'done') t.date = k; }); });
        UI.toast('Tâches ramenées à aujourd’hui', { icon: 'forward' });
      },
      async 'gcal-sync'(el) {
        el.disabled = true;
        try {
          if (!GCal.connected()) await GCal.connect();
          await GCal.sync();
          UI.toast('Google Agenda synchronisé', { icon: 'calendar-check' });
        } catch (e) {
          if (e.message !== 'not-connected') UI.toast(e.message || 'Synchronisation impossible', { error: true });
        } finally { el.disabled = false; }
      },
    },
    pickPriorities,
  };

  window.TodayView = TodayView;
})();
