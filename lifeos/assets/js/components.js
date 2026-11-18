/* Briques réutilisables + actions communes (tâches, capture, agenda). */
(function () {
  const C = {
    pop: null, // id de la dernière tâche cochée (pour l'animation)

    domainIco(d, size) {
      if (!d) return '';
      return '<span class="domain-ico' + (size ? ' ' + size : '') + '" style="--c:' + d.color + '">' + ic(d.icon) + '</span>';
    },
    bar(pct, cls) {
      return '<div class="bar-track ' + (cls || '') + '"><div class="bar-fill' + (pct >= 100 ? ' ok' : '') + '" style="width:' + U.clamp(pct, 0, 100) + '%"></div></div>';
    },
    ring(pct, opts) {
      opts = opts || {};
      const r = 52, c = 2 * Math.PI * r;
      const off = c * (1 - U.clamp(pct, 0, 100) / 100);
      return '<div class="ring ' + (opts.size || '') + '"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="10"/>' +
        '<circle class="bar" cx="60" cy="60" r="' + r + '" fill="none" stroke-width="10" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
        '<div class="val"><b class="num">' + (opts.label != null ? opts.label : pct) + '</b>' + (opts.sub ? '<span>' + opts.sub + '</span>' : '') + '</div></div>';
    },
    empty(icon, title, text, action, cls) {
      return '<div class="empty ' + (cls || '') + '"><div class="e-ico">' + ic(icon) + '</div><b>' + title + '</b>' + (text ? '<div>' + text + '</div>' : '') + (action ? '<div style="margin-top:8px">' + action + '</div>' : '') + '</div>';
    },
    dateTag(t) {
      if (!t.date) return '';
      const late = t.status !== 'done' && t.date < U.today();
      const today = t.date === U.today();
      return '<span class="tag' + (late ? ' late' : today ? ' today' : '') + '">' + ic(late ? 'alert' : 'calendar') + U.esc(U.rel(t.date)) + '</span>';
    },
    projectTag(t) {
      if (!t.projectId) return '';
      const p = M.project(t.projectId);
      if (!p) return '';
      const d = M.domainOfTask(t);
      return '<span class="tag"><span class="dot-c" style="--c:' + (d ? d.color : 'var(--muted)') + '"></span>' + U.esc(p.title) + '</span>';
    },

    /** Ligne de tâche. opts: { day, hideDate, hideProject, noStar } */
    taskRow(t, opts) {
      opts = opts || {};
      const day = opts.day || U.today();
      const done = t.status === 'done';
      const prio = M.isPriority(day, t.id);
      const meta = [
        !opts.hideProject ? C.projectTag(t) : '',
        !opts.hideDate ? C.dateTag(t) : '',
        t.status === 'doing' ? '<span class="tag today">' + ic('play') + 'En cours</span>' : '',
        t.notes ? '<span class="tag">' + ic('note') + 'Note</span>' : '',
      ].filter(Boolean).join('');
      return '<div class="task' + (done ? ' done' : '') + '" data-id="' + t.id + '">' +
        '<button class="check round' + (done ? ' on' : '') + (C.pop === t.id ? ' pop' : '') + '" data-act="toggle" data-id="' + t.id + '" aria-label="' + (done ? 'Marquer comme à faire' : 'Marquer comme fait') + '">' + ic('check') + '</button>' +
        '<div class="task-body" data-act="edit" data-id="' + t.id + '"><div class="task-title">' + U.esc(t.title) + '</div>' + (meta ? '<div class="task-meta">' + meta + '</div>' : '') + '</div>' +
        '<div class="task-actions">' +
          (!opts.noStar && !done ? '<button class="icon-btn sm star' + (prio ? ' on' : '') + '" data-act="prio" data-id="' + t.id + '" title="' + (prio ? 'Retirer des priorités' : 'Priorité du jour') + '">' + ic('star') + '</button>' : '') +
          '<button class="icon-btn sm" data-act="task-menu" data-id="' + t.id + '" aria-label="Options">' + ic('more') + '</button>' +
        '</div></div>';
    },

    /* ---------------- Actions communes ---------------- */
    actions: {
      toggle(el) {
        const id = el.dataset.id;
        const done = M.toggleTask(id);
        if (done) {
          C.pop = id;
          const r = el.getBoundingClientRect();
          const k = U.today();
          const pr = M.priorities(k);
          if (pr.length === 3 && pr.every((t) => t.status === 'done') && pr.some((t) => t.id === id)) {
            UI.burst(r.left + r.width / 2, r.top + r.height / 2);
            UI.toast('Les 3 priorités sont faites. Bravo !', { icon: 'trophy' });
          }
          setTimeout(() => { C.pop = null; }, 600);
        }
      },
      edit(el) { C.editTask(el.dataset.id); },
      prio(el) {
        const id = el.dataset.id;
        const k = U.today();
        const on = !M.isPriority(k, id);
        if (!M.setPriority(k, id, on)) UI.toast('Tu as déjà 3 priorités aujourd’hui', { error: true });
        else if (on) UI.toast('Ajoutée aux priorités du jour', { icon: 'star' });
      },
      'task-menu'(el) {
        const id = el.dataset.id;
        const t = M.task(id);
        if (!t) return;
        const k = U.today();
        UI.menu(el, [
          { label: 'Modifier', icon: 'pencil', onClick: () => C.editTask(id) },
          t.date !== k ? { label: "Pour aujourd'hui", icon: 'sun', onClick: () => M.updateTask(id, { date: k }) } : { label: 'Reporter à demain', icon: 'forward', onClick: () => { M.setPriority(k, id, false); M.updateTask(id, { date: U.addDays(k, 1) }); UI.toast('Reportée à demain', { icon: 'forward' }); } },
          { label: 'Choisir une date…', icon: 'calendar', onClick: async () => { const d = await UI.pickDate({ current: t.date }); if (d !== undefined) { if (d !== k) M.setPriority(k, id, false); M.updateTask(id, { date: d }); } } },
          '-',
          { label: 'Supprimer', icon: 'trash', danger: true, onClick: () => { M.deleteTask(id); UI.undoToast('Tâche supprimée'); } },
        ]);
      },
      'add-event'() { C.editEvent(); },
      'edit-event'(el) {
        const e = Store.get().events.find((x) => x.id === el.dataset.id);
        if (e) C.editEvent(e);
        else if (el.dataset.link) window.open(el.dataset.link, '_blank', 'noopener');
      },
      capture() { C.capture(); },
      go(el) { location.hash = el.dataset.to; },
    },

    /* ---------------- Feuille tâche ---------------- */
    editTask(id, defaults) {
      const isNew = !id;
      const t = isNew ? Object.assign({ title: '', notes: '', projectId: null, date: null, status: 'todo' }, defaults) : Object.assign({}, M.task(id));
      if (!isNew && !t.id) return;
      const k = U.today();
      let date = t.date;
      let status = t.status;
      let prio = !isNew && M.isPriority(k, id);

      const body =
        '<input class="title-input" data-f="title" placeholder="Nom de la tâche" value="' + U.esc(t.title) + '" autofocus maxlength="200">' +
        '<textarea class="textarea" data-f="notes" placeholder="Notes, liens, détails…" rows="3">' + U.esc(t.notes || '') + '</textarea>' +
        '<div class="field"><label>Projet</label><select class="select" data-f="projectId">' + UI.projectOptions(t.projectId) + '</select></div>' +
        '<div class="field"><label>Quand</label><div class="chips" data-dates>' +
          '<button class="chip" data-d="' + k + '">' + ic('sun') + "Aujourd'hui</button>" +
          '<button class="chip" data-d="' + U.addDays(k, 1) + '">' + ic('sunrise') + 'Demain</button>' +
          '<button class="chip" data-d="">' + ic('inbox') + 'Sans date</button>' +
        '</div><input type="date" class="input" data-f="date" value="' + (date || '') + '"></div>' +
        '<div class="field"><label>Statut</label><div class="seg full" data-status>' + M.STATUSES.map((s) => '<button data-s="' + s.id + '">' + U.esc(s.name) + '</button>').join('') + '</div></div>' +
        '<button class="chip" data-prio style="align-self:flex-start">' + ic('star') + 'Priorité du jour</button>';

      UI.sheet({
        title: isNew ? 'Nouvelle tâche' : 'Tâche',
        body,
        foot: (isNew ? '' : '<button class="btn ghost danger" data-del>' + ic('trash') + '<span>Supprimer</span></button>') + '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>' + (isNew ? 'Ajouter' : 'Enregistrer') + '</button>',
        onMount(el, close) {
          const $ = (s) => el.querySelector(s);
          const dateInput = $('[data-f="date"]');
          const paint = () => {
            el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', (b.dataset.d || null) === (date || null)));
            el.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === status));
            const pb = $('[data-prio]');
            pb.classList.toggle('on', prio);
            pb.style.display = date === k && status !== 'done' ? '' : 'none';
          };
          el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { date = b.dataset.d || null; dateInput.value = date || ''; paint(); });
          dateInput.onchange = () => { date = dateInput.value || null; paint(); };
          el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { status = b.dataset.s; paint(); });
          $('[data-prio]').onclick = () => { prio = !prio; paint(); };
          paint();
          const save = () => {
            const title = $('[data-f="title"]').value.trim();
            if (!title) { $('[data-f="title"]').focus(); return; }
            const patch = { title, notes: $('[data-f="notes"]').value.trim(), projectId: $('[data-f="projectId"]').value || null, date, status };
            let tid = id;
            if (isNew) { const nt = M.addTask(patch); tid = nt && nt.id; }
            else M.updateTask(id, patch);
            if (tid) {
              const want = prio && date === k && status !== 'done';
              if (want !== M.isPriority(k, tid)) {
                if (!M.setPriority(k, tid, want)) UI.toast('Déjà 3 priorités aujourd’hui', { error: true });
              }
            }
            close();
            if (isNew) UI.toast('Tâche ajoutée');
          };
          $('[data-save]').onclick = save;
          $('[data-f="title"]').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
          const del = $('[data-del]');
          if (del) del.onclick = () => { close(); M.deleteTask(id); UI.undoToast('Tâche supprimée'); };
        },
      });
    },

    /* ---------------- Capture rapide ---------------- */
    capture(prefill) {
      let kind = 'task';
      let dest = 'inbox';
      UI.sheet({
        title: 'Capture rapide',
        body:
          '<input class="title-input" data-f="text" placeholder="Une idée, une tâche, un truc à ne pas oublier…" autofocus maxlength="300" value="' + U.esc(prefill || '') + '">' +
          '<div class="row wrap" style="gap:10px">' +
            '<div class="seg" data-kind><button data-k="task" class="on">' + ic('check') + 'Tâche</button><button data-k="idea">' + ic('bulb') + 'Idée</button></div>' +
            '<div class="chips" data-dest>' +
              '<button class="chip on" data-v="inbox">' + ic('inbox') + 'Boîte de réception</button>' +
              '<button class="chip" data-v="today">' + ic('sun') + "Aujourd'hui</button>" +
              '<button class="chip" data-v="tomorrow">' + ic('sunrise') + 'Demain</button>' +
            '</div>' +
          '</div>' +
          '<div class="hint">' + ic('zap') + ' Astuce : appuie sur <kbd>N</kbd> n’importe où pour capturer, <kbd>Entrée</kbd> pour valider.</div>',
        foot: '<span class="grow"></span><button class="btn ghost" data-close>Fermer</button><button class="btn primary" data-save>' + ic('arrow-up') + 'Capturer</button>',
        onMount(el, close) {
          const input = el.querySelector('[data-f="text"]');
          const destBox = el.querySelector('[data-dest]');
          el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => {
            kind = b.dataset.k;
            el.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('on', x === b));
            destBox.style.display = kind === 'idea' ? 'none' : '';
          });
          el.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
            dest = b.dataset.v;
            el.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b));
          });
          const save = (keepOpen) => {
            const text = input.value.trim();
            if (!text) { input.focus(); return; }
            if (kind === 'task' && dest !== 'inbox') {
              M.addTask({ title: text, date: dest === 'today' ? U.today() : U.addDays(U.today(), 1) });
              UI.toast(dest === 'today' ? "Ajoutée à aujourd'hui" : 'Ajoutée à demain');
            } else {
              M.capture(text, kind);
              UI.toast(kind === 'idea' ? 'Idée capturée' : 'Dans la boîte de réception', { icon: kind === 'idea' ? 'bulb' : 'inbox' });
            }
            if (keepOpen) { input.value = ''; input.focus(); } else close();
          };
          el.querySelector('[data-save]').onclick = () => save(false);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(e.shiftKey); } });
        },
      });
    },

    /* ---------------- Rendez-vous manuel ---------------- */
    editEvent(ev) {
      const isNew = !ev;
      const e = Object.assign({ title: '', date: U.today(), start: '', end: '', place: '' }, ev);
      UI.sheet({
        title: isNew ? 'Nouveau rendez-vous' : 'Rendez-vous',
        body:
          '<input class="title-input" data-f="title" placeholder="Titre du rendez-vous" value="' + U.esc(e.title) + '" autofocus>' +
          '<div class="field"><label>Date</label><input type="date" class="input" data-f="date" value="' + e.date + '"></div>' +
          '<div class="grid-2"><div class="field"><label>Début</label><input type="time" class="input" data-f="start" value="' + (e.start || '') + '"></div>' +
          '<div class="field"><label>Fin</label><input type="time" class="input" data-f="end" value="' + (e.end || '') + '"></div></div>' +
          '<div class="field"><label>Lieu</label><input class="input" data-f="place" placeholder="Adresse, visio…" value="' + U.esc(e.place || '') + '"></div>',
        foot: (isNew ? '' : '<button class="btn ghost danger" data-del>' + ic('trash') + '</button>') + '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>' + (isNew ? 'Ajouter' : 'Enregistrer') + '</button>',
        onMount(el, close) {
          const v = (f) => el.querySelector('[data-f="' + f + '"]').value.trim();
          el.querySelector('[data-save]').onclick = () => {
            if (!v('title')) return el.querySelector('[data-f="title"]').focus();
            M.saveEvent({ id: e.id, title: v('title'), date: v('date') || U.today(), start: v('start'), end: v('end'), place: v('place') });
            close();
          };
          const d = el.querySelector('[data-del]');
          if (d) d.onclick = () => { close(); M.deleteEvent(e.id); UI.undoToast('Rendez-vous supprimé'); };
        },
      });
    },

    /** Liste d'événements pour un jour. */
    eventsList(k, opts) {
      opts = opts || {};
      const evs = M.eventsOn(k);
      if (!evs.length) return '';
      const nowT = U.time(new Date());
      const isToday = k === U.today();
      return '<div class="events">' + evs.map((e) => {
        const past = isToday && !e.allDay && e.end && e.end <= nowT;
        const now = isToday && !e.allDay && e.start && e.start <= nowT && (!e.end || e.end > nowT);
        return '<div class="event' + (past ? ' past' : '') + (now ? ' now' : '') + '" data-act="edit-event" data-id="' + e.id + '"' + (e.link ? ' data-link="' + U.esc(e.link) + '"' : '') + ' style="--c:' + (e.color || 'var(--accent)') + '">' +
          '<div class="t num">' + (e.allDay ? 'Journée' : (e.start || '—') + (e.end ? '<small>' + e.end + '</small>' : '')) + '</div><div class="bar"></div>' +
          '<div><div class="e-title">' + U.esc(e.title) + '</div><div class="e-sub">' +
            (now ? '<span style="color:var(--accent);font-weight:600">En cours</span>' : '') +
            (e.place ? '<span>' + ic('pin') + ' ' + U.esc(e.place) + '</span>' : '') +
            (opts.showSource !== false && e.source === 'google' ? '<span class="src-badge">Google</span>' : '') +
          '</div></div></div>';
      }).join('') + '</div>';
    },
  };

  window.C = C;
})();
