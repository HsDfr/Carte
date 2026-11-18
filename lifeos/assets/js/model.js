/* Logique métier : requêtes et actions sur les données. */
(function () {
  const S = () => Store.get();
  const now = () => Date.now();

  function ensureDay(s, k) {
    if (!s.days[k]) s.days[k] = {};
    if (!s.days[k].priorities) s.days[k].priorities = [];
    return s.days[k];
  }

  const M = {
    STATUSES: [
      { id: 'todo', name: 'À faire', color: '#7d8196' },
      { id: 'doing', name: 'En cours', color: '#9d8cff' },
      { id: 'done', name: 'Fait', color: '#4fd1a1' },
    ],
    MOODS: [
      { v: 1, name: 'Difficile', color: '#ff6b7a' },
      { v: 2, name: 'Bof', color: '#f29a5b' },
      { v: 3, name: 'Correcte', color: '#f2c94c' },
      { v: 4, name: 'Bonne', color: '#7fd18a' },
      { v: 5, name: 'Excellente', color: '#4fd1a1' },
    ],

    /* ---------- Lecture ---------- */
    day(k) { return S().days[k] || { priorities: [] }; },
    task(id) { return S().tasks.find((t) => t.id === id); },
    project(id) { return S().projects.find((p) => p.id === id); },
    goal(id) { return S().goals.find((g) => g.id === id); },
    goalOfProject(pid) { const p = M.project(pid); return p ? M.goal(p.goalId) : null; },
    domainOfTask(t) {
      if (!t || !t.projectId) return null;
      const g = M.goalOfProject(t.projectId);
      return g ? Store.domain(g.domain) : null;
    },

    sortTasks(list) {
      return list.slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.order || a.createdAt) - (b.order || b.createdAt));
    },
    tasksOn(k) { return M.sortTasks(S().tasks.filter((t) => t.date === k)); },
    overdue(ref) {
      ref = ref || U.today();
      return S().tasks.filter((t) => t.date && t.date < ref && t.status !== 'done').sort((a, b) => a.date.localeCompare(b.date));
    },
    priorities(k) {
      const d = M.day(k);
      return (d.priorities || []).map(M.task).filter(Boolean);
    },
    isPriority(k, id) { return (M.day(k).priorities || []).includes(id); },
    projectTasks(pid) { return S().tasks.filter((t) => t.projectId === pid); },

    projectStats(pid) {
      const ts = M.projectTasks(pid);
      const done = ts.filter((t) => t.status === 'done').length;
      const p = M.project(pid);
      const pct = p && p.status === 'done' ? 100 : U.pct(done, ts.length);
      return { total: ts.length, done, doing: ts.filter((t) => t.status === 'doing').length, pct };
    },
    goalProjects(gid) { return S().projects.filter((p) => p.goalId === gid); },
    /** La progression d'un objectif = moyenne de la progression de ses projets. */
    goalStats(gid) {
      const ps = M.goalProjects(gid);
      const stats = ps.map((p) => M.projectStats(p.id));
      const pct = ps.length ? Math.round(stats.reduce((a, s) => a + s.pct, 0) / ps.length) : 0;
      return {
        projects: ps.length,
        projectsDone: ps.filter((p, i) => p.status === 'done' || (stats[i].total && stats[i].pct === 100)).length,
        tasks: stats.reduce((a, s) => a + s.total, 0),
        tasksDone: stats.reduce((a, s) => a + s.done, 0),
        pct,
      };
    },

    /** Score de la journée (0-100). */
    dayScore(k) {
      const d = M.day(k);
      const pr = M.priorities(k);
      const prDone = pr.filter((t) => t.status === 'done').length;
      const ts = M.tasksOn(k);
      const tDone = ts.filter((t) => t.status === 'done').length;
      const ritual = (d.morningDone ? 1 : 0) + (d.eveningDone ? 1 : 0);
      const parts = [
        { id: 'prio', label: 'Priorités', value: prDone, max: Math.max(pr.length, 3), weight: 0.45 },
        { id: 'tasks', label: 'Tâches du jour', value: tDone, max: ts.length, weight: 0.35 },
        { id: 'ritual', label: 'Rituels', value: ritual, max: 2, weight: 0.2 },
      ];
      let score = 0;
      let wsum = 0;
      parts.forEach((p) => {
        p.ratio = p.max ? p.value / p.max : 0;
        if (p.id === 'tasks' && !p.max) return; // pas de tâche = pas pénalisé
        score += p.ratio * p.weight;
        wsum += p.weight;
      });
      return { score: wsum ? Math.round((score / wsum) * 100) : 0, parts };
    },

    eventsOn(k) {
      const s = S();
      const manual = s.events.filter((e) => e.date === k).map((e) => Object.assign({ source: 'local' }, e));
      const g = (s.cache.gcal && s.cache.gcal[k]) || [];
      const all = manual.concat(g.map((e) => Object.assign({ source: 'google' }, e)));
      return all.sort((a, b) => (a.allDay ? -1 : 0) - (b.allDay ? -1 : 0) || (a.start || '').localeCompare(b.start || ''));
    },

    weekStats(k) {
      const days = U.weekDays(k);
      const s = S();
      let prTotal = 0, prDone = 0, mornings = 0, evenings = 0, moodSum = 0, moodN = 0;
      const journal = [];
      days.forEach((d) => {
        const day = s.days[d];
        if (!day) return;
        const pr = M.priorities(d);
        prTotal += pr.length;
        prDone += pr.filter((t) => t.status === 'done').length;
        if (day.morningDone) mornings++;
        if (day.eveningDone) evenings++;
        if (day.mood) { moodSum += day.mood; moodN++; }
        if (day.journal) journal.push({ date: d, text: day.journal, mood: day.mood });
      });
      const start = U.parse(days[0]).getTime();
      const end = U.parse(U.addDays(days[6], 1)).getTime();
      const done = s.tasks.filter((t) => t.status === 'done' && t.doneAt >= start && t.doneAt < end).length;
      return { days, done, prTotal, prDone, mornings, evenings, mood: moodN ? moodSum / moodN : 0, journal };
    },

    /* ---------- Écriture ---------- */
    addTask(data) {
      const t = Object.assign({ id: U.uid(), title: '', notes: '', projectId: null, date: null, status: 'todo', createdAt: now(), doneAt: null, order: now() }, data);
      t.title = (t.title || '').trim();
      if (!t.title) return null;
      Store.update((s) => { s.tasks.push(t); });
      return t;
    },
    updateTask(id, patch) {
      Store.update((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        if (patch.status && patch.status !== t.status) t.doneAt = patch.status === 'done' ? now() : null;
        Object.assign(t, patch);
      });
    },
    toggleTask(id) {
      const t = M.task(id);
      if (!t) return;
      const done = t.status !== 'done';
      M.updateTask(id, { status: done ? 'done' : 'todo' });
      return done;
    },
    deleteTask(id) {
      Store.update((s) => {
        s.tasks = s.tasks.filter((t) => t.id !== id);
        Object.values(s.days).forEach((d) => { if (d.priorities) d.priorities = d.priorities.filter((x) => x !== id); });
      }, { undoable: true });
    },
    /** Ajoute/retire une priorité (max 3). Retourne false si complet. */
    setPriority(k, id, on) {
      let ok = true;
      Store.update((s) => {
        const d = ensureDay(s, k);
        d.priorities = d.priorities.filter((x) => s.tasks.some((t) => t.id === x));
        const has = d.priorities.includes(id);
        if (on && !has) {
          if (d.priorities.length >= 3) { ok = false; return; }
          d.priorities.push(id);
          const t = s.tasks.find((x) => x.id === id);
          if (t && t.date !== k) t.date = k;
        } else if (!on && has) {
          d.priorities = d.priorities.filter((x) => x !== id);
        }
      });
      return ok;
    },
    setPriorities(k, ids) {
      Store.update((s) => {
        const d = ensureDay(s, k);
        d.priorities = ids.slice(0, 3);
        ids.forEach((id) => { const t = s.tasks.find((x) => x.id === id); if (t) t.date = k; });
      });
    },
    setDay(k, patch) { Store.update((s) => { Object.assign(ensureDay(s, k), patch); }); },

    moveTask(id, status, order) {
      Store.update((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return;
        if (t.status !== status) t.doneAt = status === 'done' ? now() : null;
        t.status = status;
        if (order != null) t.order = order;
      });
    },

    /* Objectifs & projets */
    saveGoal(g) {
      Store.update((s) => {
        const ex = s.goals.find((x) => x.id === g.id);
        if (ex) Object.assign(ex, g); else s.goals.push(Object.assign({ id: U.uid(), createdAt: now() }, g));
      });
    },
    deleteGoal(id) {
      Store.update((s) => {
        const pids = s.projects.filter((p) => p.goalId === id).map((p) => p.id);
        s.goals = s.goals.filter((g) => g.id !== id);
        s.projects = s.projects.filter((p) => p.goalId !== id);
        s.tasks.forEach((t) => { if (pids.includes(t.projectId)) t.projectId = null; });
        s.ideas.forEach((i) => { if (pids.includes(i.projectId)) i.projectId = null; });
      }, { undoable: true });
    },
    saveProject(p) {
      let out;
      Store.update((s) => {
        const ex = s.projects.find((x) => x.id === p.id);
        if (ex) { Object.assign(ex, p); out = ex; }
        else { out = Object.assign({ id: U.uid(), createdAt: now(), status: 'active', description: '' }, p); s.projects.push(out); }
      });
      return out;
    },
    deleteProject(id, withTasks) {
      Store.update((s) => {
        s.projects = s.projects.filter((p) => p.id !== id);
        if (withTasks) s.tasks = s.tasks.filter((t) => t.projectId !== id);
        else s.tasks.forEach((t) => { if (t.projectId === id) t.projectId = null; });
        s.ideas.forEach((i) => { if (i.projectId === id) i.projectId = null; });
      }, { undoable: true });
    },

    /* Boîte de réception */
    capture(text, kind) {
      text = (text || '').trim();
      if (!text) return null;
      const it = { id: U.uid(), text, kind: kind || 'task', createdAt: now() };
      Store.update((s) => { s.inbox.unshift(it); });
      return it;
    },
    inboxToTask(id, patch) {
      let task;
      Store.update((s) => {
        const it = s.inbox.find((x) => x.id === id);
        if (!it) return;
        s.inbox = s.inbox.filter((x) => x.id !== id);
        task = Object.assign({ id: U.uid(), title: it.text, notes: '', projectId: null, date: null, status: 'todo', createdAt: now(), doneAt: null, order: now() }, patch);
        s.tasks.push(task);
      });
      return task;
    },
    inboxToIdea(id, projectId) {
      Store.update((s) => {
        const it = s.inbox.find((x) => x.id === id);
        if (!it) return;
        s.inbox = s.inbox.filter((x) => x.id !== id);
        s.ideas.unshift({ id: U.uid(), text: it.text, projectId: projectId || null, createdAt: it.createdAt || now() });
      });
    },
    deleteInbox(id) { Store.update((s) => { s.inbox = s.inbox.filter((x) => x.id !== id); }, { undoable: true }); },
    deleteIdea(id) { Store.update((s) => { s.ideas = s.ideas.filter((x) => x.id !== id); }, { undoable: true }); },
    ideaToTask(id, patch) {
      Store.update((s) => {
        const it = s.ideas.find((x) => x.id === id);
        if (!it) return;
        s.ideas = s.ideas.filter((x) => x.id !== id);
        s.tasks.push(Object.assign({ id: U.uid(), title: it.text, notes: '', projectId: it.projectId || null, date: null, status: 'todo', createdAt: now(), doneAt: null, order: now() }, patch));
      });
    },

    /* Agenda manuel */
    saveEvent(e) {
      Store.update((s) => {
        const ex = s.events.find((x) => x.id === e.id);
        if (ex) Object.assign(ex, e); else s.events.push(Object.assign({ id: U.uid() }, e));
      });
    },
    deleteEvent(id) { Store.update((s) => { s.events = s.events.filter((e) => e.id !== id); }, { undoable: true }); },
  };

  window.M = M;
})();
