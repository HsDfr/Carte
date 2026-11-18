/* Objectifs → Projets → Tâches, avec Kanban. */
(function () {
  let filter = 'all';
  let lastDrag = 0;

  /* ---------------- Vue d'ensemble ---------------- */
  function goalCard(g) {
    const d = Store.domain(g.domain);
    const st = M.goalStats(g.id);
    const ps = M.goalProjects(g.id).sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.createdAt - b.createdAt);
    const done = g.status === 'done';
    const dl = g.deadline ? '<span class="tag' + (!done && g.deadline < U.today() ? ' late' : '') + '">' + ic('flag') + U.dayMonth(g.deadline) + ' · ' + U.countdown(g.deadline) + '</span>' : '';
    return '<article class="card goal' + (done ? ' done-goal' : '') + '" style="--c:' + d.color + '">' +
      '<div class="goal-head">' + C.domainIco(d) +
        '<div class="gh-body" data-act="goal-edit" data-id="' + g.id + '"><div class="goal-title">' + U.esc(g.title) + '</div>' +
        '<div class="goal-sub">' + (done ? '<span class="tag" style="color:var(--ok)">' + ic('trophy') + 'Atteint</span>' : '') + dl + '<span class="tag">' + ic('layers') + U.plural(st.projects, 'projet') + '</span></div></div>' +
        '<button class="icon-btn sm" data-act="goal-menu" data-id="' + g.id + '" aria-label="Options">' + ic('more') + '</button></div>' +
      (g.why ? '<div class="goal-why">' + U.esc(g.why) + '</div>' : '') +
      '<div class="goal-progress">' + C.bar(st.pct) + '<b class="num">' + st.pct + '%</b></div>' +
      '<div class="projects-mini">' + ps.map((p) => {
        const s = M.projectStats(p.id);
        const pd = p.status === 'done';
        return '<a class="pm' + (pd ? ' done' : '') + '" href="#/projets/p/' + p.id + '">' +
          '<span style="color:' + (pd ? 'var(--ok)' : 'var(--muted)') + '">' + ic(pd ? 'check' : 'kanban') + '</span>' +
          '<span class="pm-name">' + U.esc(p.title) + '</span><span class="pm-count num">' + s.done + '/' + s.total + '</span>' + '<div class="bar-track mini"><div class="bar-fill' + (s.pct >= 100 ? ' ok' : '') + '" style="width:' + s.pct + '%"></div></div></a>';
      }).join('') +
      '<button class="pm" style="color:var(--muted);width:100%" data-act="project-new" data-goal="' + g.id + '">' + ic('plus') + '<span class="pm-name">Nouveau projet</span></button></div>' +
      '</article>';
  }

  function overview() {
    const s = Store.get();
    const goals = s.goals;
    const activeGoals = goals.filter((g) => g.status !== 'done');
    const activeProjects = s.projects.filter((p) => p.status !== 'done');
    const openTasks = s.tasks.filter((t) => t.projectId && t.status !== 'done').length;
    const avg = activeGoals.length ? Math.round(activeGoals.reduce((a, g) => a + M.goalStats(g.id).pct, 0) / activeGoals.length) : 0;

    let h = '<header class="page-head"><div class="grow"><div class="eyebrow">Objectifs & projets</div><h1 class="h1">Là où je vais</h1><p class="lead">Chaque tâche fait avancer un projet, chaque projet fait avancer un objectif.</p></div>' +
      '<button class="btn primary" data-act="goal-new">' + ic('plus') + 'Nouvel objectif</button></header>';

    if (!goals.length) {
      return h + '<section class="card">' + C.empty('target', 'Pose ton premier objectif', 'Choisis un domaine (Emploi, Admin, Sport…), puis découpe-le en projets et en tâches.',
        '<button class="btn primary" data-act="goal-new">' + ic('plus') + 'Créer un objectif</button>', 'big') + '</section>';
    }

    h += '<div class="overview">' +
      '<div class="stat"><b class="num">' + activeGoals.length + '</b><span>objectifs actifs</span></div>' +
      '<div class="stat"><b class="num">' + activeProjects.length + '</b><span>projets en cours</span></div>' +
      '<div class="stat"><b class="num">' + openTasks + '</b><span>tâches ouvertes</span></div>' +
      '<div class="stat"><b class="num">' + avg + '%</b><span>progression moyenne</span></div></div>';

    h += '<div class="chips scroll" style="margin-bottom:20px"><button class="chip' + (filter === 'all' ? ' on' : '') + '" data-act="filter" data-d="all">' + ic('grid') + 'Tous<span class="n">' + goals.length + '</span></button>' +
      Store.DOMAINS.map((d) => {
        const n = goals.filter((g) => g.domain === d.id).length;
        return '<button class="chip' + (filter === d.id ? ' on' : '') + '" data-act="filter" data-d="' + d.id + '"><span style="color:' + d.color + '">' + ic(d.icon) + '</span>' + d.name + (n ? '<span class="n">' + n + '</span>' : '') + '</button>';
      }).join('') + '</div>';

    const sorted = (list) => list.slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    if (filter === 'all') {
      h += '<div class="domains-wrap">';
      Store.DOMAINS.forEach((d) => {
        const gs = sorted(goals.filter((g) => g.domain === d.id));
        if (!gs.length) return;
        h += '<section class="domain-section"><div class="domain-section-head">' + C.domainIco(d, 'sm') + '<h3>' + d.name + '</h3><span class="spacer"></span><button class="icon-btn sm" data-act="goal-new" data-d="' + d.id + '" title="Nouvel objectif ' + d.name + '">' + ic('plus') + '</button></div><div class="goals">' + gs.map(goalCard).join('') + '</div></section>';
      });
      h += '</div>';
      const emptyDomains = Store.DOMAINS.filter((d) => !goals.some((g) => g.domain === d.id));
      if (emptyDomains.length) {
        h += '<div class="card flat" style="background:transparent;border-style:dashed"><div class="hint" style="margin-bottom:10px">Pas encore d’objectif dans :</div><div class="chips">' +
          emptyDomains.map((d) => '<button class="chip" data-act="goal-new" data-d="' + d.id + '"><span style="color:' + d.color + '">' + ic(d.icon) + '</span>' + d.name + ic('plus') + '</button>').join('') + '</div></div>';
      }
    } else {
      const d = Store.domain(filter);
      const gs = sorted(goals.filter((g) => g.domain === filter));
      h += gs.length ? '<div class="goals">' + gs.map(goalCard).join('') + '</div>' :
        '<section class="card">' + C.empty(d.icon, 'Aucun objectif ' + d.name, 'Qu’aimerais-tu accomplir dans ce domaine ?', '<button class="btn primary" data-act="goal-new" data-d="' + d.id + '">' + ic('plus') + 'Créer un objectif</button>', 'big') + '</section>';
    }
    return h;
  }

  /* ---------------- Détail projet (Kanban) ---------------- */
  function projectPage(pid) {
    const p = M.project(pid);
    if (!p) return '<div class="crumbs"><a href="#/projets">' + ic('chevron-left') + 'Objectifs</a></div>' + '<section class="card" style="margin-top:20px">' + C.empty('layers', 'Projet introuvable', 'Il a peut-être été supprimé.', '<a class="btn" href="#/projets">Retour aux objectifs</a>', 'big') + '</section>';
    const g = M.goal(p.goalId);
    const d = Store.domain(g ? g.domain : 'perso');
    const st = M.projectStats(pid);
    const tasks = M.projectTasks(pid).sort((a, b) => (a.order || a.createdAt) - (b.order || b.createdAt));
    const ideas = Store.get().ideas.filter((i) => i.projectId === pid);
    const k = U.today();

    let h = '<nav class="crumbs"><a href="#/projets">' + ic('chevron-left') + 'Objectifs</a>' + ic('chevron-right') + '<span style="color:' + d.color + '">' + d.name + '</span>' +
      (g ? ic('chevron-right') + '<a href="#/projets" data-act="goal-edit" data-id="' + g.id + '">' + U.esc(g.title) + '</a>' : '') + '</nav>';
    h += '<header class="project-head" style="--c:' + d.color + '">' + C.domainIco(d, 'lg') +
      '<div class="ph-body"><h1 class="h1">' + U.esc(p.title) + '</h1>' + (p.description ? '<p class="lead">' + U.esc(p.description) + '</p>' : '') +
      '<div class="project-progress">' + C.bar(st.pct, 'lg') + '<b class="num">' + st.pct + '%</b><span class="count num">' + st.done + '/' + st.total + ' tâches</span>' +
      (p.deadline ? '<span class="tag' + (p.deadline < k && p.status !== 'done' ? ' late' : '') + '">' + ic('flag') + U.countdown(p.deadline) + '</span>' : '') +
      (p.status === 'done' ? '<span class="pill ok">' + ic('check') + 'Terminé</span>' : '') + '</div></div>' +
      '<div class="row"><button class="btn" data-act="project-edit" data-id="' + pid + '">' + ic('pencil') + '<span>Modifier</span></button><button class="icon-btn" data-act="project-menu" data-id="' + pid + '" aria-label="Options">' + ic('more') + '</button></div></header>';

    h += '<div class="board" data-pid="' + pid + '">' + M.STATUSES.map((s) => {
      const list = tasks.filter((t) => t.status === s.id);
      return '<div class="col" data-status="' + s.id + '"><div class="col-head"><span class="dot-c" style="--c:' + s.color + '"></span><span class="t">' + s.name + '</span><span class="count num">' + list.length + '</span></div>' +
        '<div class="col-cards">' + list.map((t) => kcard(t, k)).join('') + '</div>' +
        '<form class="quick-add" data-form="col-add" data-status="' + s.id + '"><span class="ico">' + ic('plus') + '</span><input placeholder="Ajouter une tâche" maxlength="200" autocomplete="off"></form></div>';
    }).join('') + '</div>';
    h += '<div class="board-hint">' + ic('grip') + '<span>Glisse les cartes d’une colonne à l’autre (appui long sur téléphone).</span></div>';

    if (ideas.length) {
      h += '<section class="card col-ideas"><div class="card-head"><h2 class="h2">' + ic('bulb') + 'Idées liées</h2><span class="count">' + ideas.length + '</span></div>' +
        ideas.map((i) => '<div class="idea-row">' + ic('bulb') + '<span class="t">' + U.esc(i.text) + '</span><button class="btn sm" data-act="idea-to-task" data-id="' + i.id + '">' + ic('check') + 'Tâche</button></div>').join('') + '</section>';
    }
    return h;
  }

  function kcard(t, k) {
    const prio = M.isPriority(k, t.id);
    const meta = [
      prio ? '<span class="tag" style="color:var(--warn)">' + ic('star') + 'Priorité</span>' : '',
      C.dateTag(t),
      t.notes ? '<span class="tag">' + ic('note') + '</span>' : '',
    ].filter(Boolean).join('');
    return '<div class="kcard' + (t.status === 'done' ? ' done' : '') + '" data-id="' + t.id + '" data-act="edit">' +
      '<div class="kc-title">' + U.esc(t.title) + '</div>' + (meta ? '<div class="kc-meta">' + meta + '</div>' : '') + '</div>';
  }

  /* Glisser-déposer (souris + appui long tactile) */
  function attachDrag(root) {
    const board = root.querySelector('.board');
    if (!board) return;
    let st = null;
    const pt = (e) => (e.touches && e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY });

    board.addEventListener('mousedown', (e) => { if (e.button === 0) down(e, false); });
    board.addEventListener('touchstart', (e) => { if (e.touches.length === 1) down(e, true); }, { passive: true });
    board.addEventListener('contextmenu', (e) => { if (e.target.closest('.kcard')) e.preventDefault(); });
    board.addEventListener('click', (e) => { if (Date.now() - lastDrag < 350) { e.stopPropagation(); e.preventDefault(); } }, true);

    function down(e, touch) {
      const card = e.target.closest('.kcard');
      if (!card || e.target.closest('button, a, input')) return;
      const p = pt(e);
      st = { card, id: card.dataset.id, x: p.x, y: p.y, last: p, touch, dragging: false };
      if (touch) {
        st.timer = setTimeout(() => { if (st && !st.dragging) { card.classList.add('lifting'); begin(); if (navigator.vibrate) navigator.vibrate(12); } }, 320);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', up);
        document.addEventListener('touchcancel', cleanup);
      } else {
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      }
    }
    function move(e) {
      if (!st) return;
      const p = pt(e);
      st.last = p;
      if (!st.dragging) {
        const dist = Math.hypot(p.x - st.x, p.y - st.y);
        if (st.touch) { if (dist > 10) cleanup(); return; }
        if (dist < 6) return;
        begin();
      }
      if (e.cancelable) e.preventDefault();
      update(p);
    }
    function begin() {
      st.dragging = true;
      const r = st.card.getBoundingClientRect();
      st.offX = st.x - r.left;
      st.offY = st.y - r.top;
      const g = st.card.cloneNode(true);
      g.classList.remove('lifting');
      g.classList.add('drag-ghost');
      g.style.width = r.width + 'px';
      document.body.appendChild(g);
      st.ghost = g;
      st.card.classList.add('ghost-src');
      st.ph = document.createElement('div');
      st.ph.className = 'drop-ph';
      document.body.style.userSelect = 'none';
      update(st.last);
    }
    function update(p) {
      st.ghost.style.left = p.x - st.offX + 'px';
      st.ghost.style.top = p.y - st.offY + 'px';
      const el = document.elementFromPoint(p.x, p.y);
      const col = el && el.closest('.col');
      board.querySelectorAll('.col.drop').forEach((c) => { if (c !== col) c.classList.remove('drop'); });
      if (col && board.contains(col)) {
        col.classList.add('drop');
        const list = col.querySelector('.col-cards');
        const cards = [...list.querySelectorAll('.kcard')].filter((c) => c !== st.card);
        let before = null;
        for (const c of cards) { const r = c.getBoundingClientRect(); if (p.y < r.top + r.height / 2) { before = c; break; } }
        if (st.ph.parentNode !== list || st.ph.nextSibling !== before) list.insertBefore(st.ph, before);
        st.col = col;
      }
      const br = board.getBoundingClientRect();
      if (board.scrollWidth > board.clientWidth + 4) {
        if (p.x < br.left + 36) board.scrollLeft -= 14;
        else if (p.x > br.right - 36) board.scrollLeft += 14;
      }
      if (p.y < 70) window.scrollBy(0, -12);
      else if (p.y > window.innerHeight - 90) window.scrollBy(0, 12);
    }
    function up() {
      if (st && st.dragging && st.col && st.ph.parentNode) {
        const status = st.col.dataset.status;
        const list = st.col.querySelector('.col-cards');
        const seq = [...list.children].filter((n) => n === st.ph || (n.classList.contains('kcard') && n !== st.card));
        const i = seq.indexOf(st.ph);
        const prev = seq[i - 1] && M.task(seq[i - 1].dataset.id);
        const next = seq[i + 1] && M.task(seq[i + 1].dataset.id);
        const o = (t) => t.order || t.createdAt;
        let order;
        if (prev && next) order = (o(prev) + o(next)) / 2;
        else if (prev) order = o(prev) + 1000;
        else if (next) order = o(next) - 1000;
        else order = Date.now();
        const id = st.id;
        const was = (M.task(id) || {}).status;
        lastDrag = Date.now();
        cleanup();
        M.moveTask(id, status, order);
        if (status === 'done' && was !== 'done') UI.toast('Tâche terminée', { icon: 'check' });
        return;
      }
      if (st && st.dragging) lastDrag = Date.now();
      cleanup();
    }
    function cleanup() {
      if (!st) return;
      clearTimeout(st.timer);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      document.removeEventListener('touchcancel', cleanup);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (st.ghost) st.ghost.remove();
      if (st.ph) st.ph.remove();
      st.card.classList.remove('ghost-src', 'lifting');
      board.querySelectorAll('.col.drop').forEach((c) => c.classList.remove('drop'));
      document.body.style.userSelect = '';
      st = null;
    }
  }

  /* ---------------- Feuilles ---------------- */
  function editGoal(id, domain) {
    const isNew = !id;
    const g = isNew ? { title: '', why: '', deadline: '', domain: domain || (filter !== 'all' ? filter : 'emploi') } : Object.assign({}, M.goal(id));
    let dom = g.domain;
    UI.sheet({
      title: isNew ? 'Nouvel objectif' : 'Objectif',
      body:
        '<input class="title-input" data-f="title" placeholder="Ex. : Trouver un CDI dans l’informatique" value="' + U.esc(g.title) + '" autofocus maxlength="160">' +
        '<div class="field"><label>Domaine</label><div class="domain-pick">' + Store.DOMAINS.map((d) => '<button style="--c:' + d.color + '" data-dom="' + d.id + '">' + ic(d.icon) + d.name + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>Pourquoi c’est important</label><input class="input" data-f="why" placeholder="Ma motivation profonde" value="' + U.esc(g.why || '') + '" maxlength="200"></div>' +
        '<div class="field"><label>Échéance</label><input type="date" class="input" data-f="deadline" value="' + (g.deadline || '') + '"></div>',
      foot: (isNew ? '' : '<button class="btn ghost danger" data-del>' + ic('trash') + '</button>') + '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>' + (isNew ? 'Créer' : 'Enregistrer') + '</button>',
      onMount(el, close) {
        const paint = () => el.querySelectorAll('[data-dom]').forEach((b) => b.classList.toggle('on', b.dataset.dom === dom));
        el.querySelectorAll('[data-dom]').forEach((b) => b.onclick = () => { dom = b.dataset.dom; paint(); });
        paint();
        const v = (f) => el.querySelector('[data-f="' + f + '"]').value.trim();
        const save = () => {
          if (!v('title')) return el.querySelector('[data-f="title"]').focus();
          M.saveGoal({ id: g.id, title: v('title'), why: v('why'), deadline: v('deadline') || null, domain: dom, status: g.status || 'active' });
          close();
          if (isNew) UI.toast('Objectif créé. Ajoute-lui un projet !', { icon: 'target' });
        };
        el.querySelector('[data-save]').onclick = save;
        el.querySelector('[data-f="title"]').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
        const del = el.querySelector('[data-del]');
        if (del) del.onclick = () => { close(); removeGoal(id); };
      },
    });
  }

  async function removeGoal(id) {
    const g = M.goal(id);
    const n = M.goalProjects(id).length;
    const ok = await UI.confirm({ title: 'Supprimer l’objectif ?', text: '« ' + U.esc(g.title) + ' »' + (n ? ' et ses ' + U.plural(n, 'projet') + ' seront supprimés. Les tâches sont conservées, sans projet.' : ''), ok: 'Supprimer', danger: true });
    if (!ok) return;
    M.deleteGoal(id);
    UI.undoToast('Objectif supprimé');
  }

  function editProject(id, goalId) {
    const isNew = !id;
    const s = Store.get();
    const p = isNew ? { title: '', description: '', goalId: goalId || (s.goals[0] && s.goals[0].id), deadline: '' } : Object.assign({}, M.project(id));
    const goalOpts = Store.DOMAINS.map((d) => {
      const gs = s.goals.filter((g) => g.domain === d.id);
      return gs.length ? '<optgroup label="' + d.name + '">' + gs.map((g) => '<option value="' + g.id + '"' + (g.id === p.goalId ? ' selected' : '') + '>' + U.esc(g.title) + '</option>').join('') + '</optgroup>' : '';
    }).join('');
    if (!s.goals.length) { UI.toast('Crée d’abord un objectif', { error: true }); editGoal(); return; }
    UI.sheet({
      title: isNew ? 'Nouveau projet' : 'Projet',
      body:
        '<input class="title-input" data-f="title" placeholder="Ex. : Refaire mon CV" value="' + U.esc(p.title) + '" autofocus maxlength="160">' +
        '<div class="field"><label>Objectif lié</label><select class="select" data-f="goalId">' + goalOpts + '</select></div>' +
        '<div class="field"><label>Description</label><textarea class="textarea" data-f="description" rows="2" placeholder="Le résultat attendu, en une ou deux phrases">' + U.esc(p.description || '') + '</textarea></div>' +
        '<div class="field"><label>Échéance</label><input type="date" class="input" data-f="deadline" value="' + (p.deadline || '') + '"></div>',
      foot: '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>' + (isNew ? 'Créer' : 'Enregistrer') + '</button>',
      onMount(el, close) {
        const v = (f) => el.querySelector('[data-f="' + f + '"]').value.trim();
        const save = () => {
          if (!v('title')) return el.querySelector('[data-f="title"]').focus();
          const out = M.saveProject({ id: p.id, title: v('title'), goalId: v('goalId'), description: v('description'), deadline: v('deadline') || null });
          close();
          if (isNew) location.hash = '#/projets/p/' + out.id;
        };
        el.querySelector('[data-save]').onclick = save;
        el.querySelector('[data-f="title"]').addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      },
    });
  }

  const ProjectsView = {
    render(params) {
      if (params[0] === 'p' && params[1]) return projectPage(params[1]);
      return overview();
    },
    mount(root, params) {
      if (params[0] !== 'p') return;
      attachDrag(root);
      root.querySelectorAll('[data-form="col-add"]').forEach((f) => {
        f.onsubmit = (e) => {
          e.preventDefault();
          const inp = f.querySelector('input');
          if (!inp.value.trim()) return;
          ProjectsView._refocus = f.dataset.status;
          M.addTask({ title: inp.value, projectId: params[1], status: f.dataset.status });
        };
      });
      if (ProjectsView._refocus) {
        const inp = root.querySelector('[data-form="col-add"][data-status="' + ProjectsView._refocus + '"] input');
        ProjectsView._refocus = null;
        if (inp) inp.focus({ preventScroll: true });
      }
    },
    actions: {
      filter(el) { filter = el.dataset.d; App.render(); },
      'goal-new'(el) { editGoal(null, el.dataset.d); },
      'goal-edit'(el, e) { if (e) e.preventDefault(); editGoal(el.dataset.id); },
      'goal-menu'(el) {
        const g = M.goal(el.dataset.id);
        UI.menu(el, [
          { label: 'Modifier', icon: 'pencil', onClick: () => editGoal(g.id) },
          { label: 'Nouveau projet', icon: 'plus', onClick: () => editProject(null, g.id) },
          g.status === 'done'
            ? { label: 'Réactiver', icon: 'refresh', onClick: () => M.saveGoal({ id: g.id, status: 'active' }) }
            : { label: 'Marquer comme atteint', icon: 'trophy', onClick: () => { M.saveGoal({ id: g.id, status: 'done', doneAt: Date.now() }); UI.burst(innerWidth / 2, innerHeight / 2); UI.toast('Objectif atteint. Énorme !', { icon: 'trophy' }); } },
          '-',
          { label: 'Supprimer', icon: 'trash', danger: true, onClick: () => removeGoal(g.id) },
        ]);
      },
      'project-new'(el) { editProject(null, el.dataset.goal); },
      'project-edit'(el) { editProject(el.dataset.id); },
      'project-menu'(el) {
        const p = M.project(el.dataset.id);
        UI.menu(el, [
          p.status === 'done'
            ? { label: 'Rouvrir le projet', icon: 'refresh', onClick: () => M.saveProject({ id: p.id, status: 'active' }) }
            : { label: 'Marquer comme terminé', icon: 'check', onClick: () => { M.saveProject({ id: p.id, status: 'done', doneAt: Date.now() }); UI.toast('Projet terminé !', { icon: 'trophy' }); } },
          { label: 'Ajouter une idée', icon: 'bulb', onClick: async () => { const t = await UI.prompt({ title: 'Nouvelle idée', placeholder: 'Ton idée pour ce projet…', ok: 'Ajouter' }); if (t) Store.update((s) => { s.ideas.unshift({ id: U.uid(), text: t, projectId: p.id, createdAt: Date.now() }); }); } },
          '-',
          { label: 'Supprimer le projet', icon: 'trash', danger: true, onClick: async () => {
            const n = M.projectTasks(p.id).length;
            const ok = await UI.confirm({ title: 'Supprimer le projet ?', text: '« ' + U.esc(p.title) + ' »' + (n ? ' et ses ' + U.plural(n, 'tâche') + ' seront supprimés.' : ' sera supprimé.'), ok: 'Supprimer', danger: true });
            if (!ok) return;
            location.hash = '#/projets';
            M.deleteProject(p.id, true);
            UI.undoToast('Projet supprimé');
          } },
        ]);
      },
      'idea-to-task'(el) { M.ideaToTask(el.dataset.id, {}); UI.toast('Idée transformée en tâche'); },
    },
  };

  window.ProjectsView = ProjectsView;
})();
