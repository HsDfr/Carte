/* Boîte de réception unique : capturer vite, trier ensuite. */
(function () {
  let tab = 'inbox';
  let kind = 'task';

  function item(it) {
    return '<div class="inbox-item" data-id="' + it.id + '">' +
      '<span class="k ' + it.kind + '">' + ic(it.kind === 'idea' ? 'bulb' : 'check') + '</span>' +
      '<div class="ib-body" data-act="triage" data-id="' + it.id + '"><div class="ib-text">' + U.esc(it.text) + '</div><div class="ib-meta">' + (it.kind === 'idea' ? 'Idée' : 'Tâche') + ' · ' + U.ago(it.createdAt) + '</div></div>' +
      '<div class="ib-quick">' +
        (it.kind !== 'idea' ? '<button class="icon-btn sm hide-sm" data-act="ib-today" data-id="' + it.id + '" title="Aujourd’hui">' + ic('sun') + '</button>' : '') +
        '<button class="btn sm" data-act="triage" data-id="' + it.id + '">Trier</button>' +
        '<button class="icon-btn sm" data-act="ib-del" data-id="' + it.id + '" title="Supprimer">' + ic('trash') + '</button>' +
      '</div></div>';
  }

  function ideaRow(i) {
    const p = i.projectId ? M.project(i.projectId) : null;
    return '<div class="inbox-item"><span class="k idea">' + ic('bulb') + '</span>' +
      '<div class="ib-body" data-act="idea-open" data-id="' + i.id + '"><div class="ib-text">' + U.esc(i.text) + '</div><div class="ib-meta">' + (p ? U.esc(p.title) + ' · ' : '') + U.ago(i.createdAt) + '</div></div>' +
      '<div class="ib-quick"><button class="btn sm" data-act="idea-task" data-id="' + i.id + '">' + ic('check') + '<span class="hide-sm">En faire une tâche</span></button>' +
      '<button class="icon-btn sm" data-act="idea-del" data-id="' + i.id + '" title="Supprimer">' + ic('trash') + '</button></div></div>';
  }

  /** Feuille de tri d'un élément. */
  function triage(id, chain) {
    const it = Store.get().inbox.find((x) => x.id === id);
    if (!it) return;
    const k = U.today();
    let date = null;
    let processed = false;
    const left = Store.get().inbox.length;
    UI.sheet({
      title: chain ? 'Trier · encore ' + left : 'Trier',
      onClose() {
        if (!chain || !processed) return;
        const next = Store.get().inbox[0];
        if (next) setTimeout(() => triage(next.id, true), 240);
        else UI.toast('Inbox zéro !', { icon: 'sparkles' });
      },
      body:
        '<input class="title-input" data-f="text" value="' + U.esc(it.text) + '" maxlength="300">' +
        '<div class="field"><label>Vers un projet</label><select class="select" data-f="project">' + UI.projectOptions(null) + '</select></div>' +
        '<div class="field"><label>Pour une date</label><div class="chips">' +
          '<button class="chip" data-d="' + k + '">' + ic('sun') + "Aujourd'hui</button>" +
          '<button class="chip" data-d="' + U.addDays(k, 1) + '">' + ic('sunrise') + 'Demain</button>' +
          '<button class="chip" data-d="' + U.nextWeekday(0) + '">' + ic('calendar') + 'Lundi</button>' +
          '<button class="chip on" data-d="">Plus tard</button>' +
        '</div><input type="date" class="input" data-f="date"></div>' +
        '<div class="hint">Une tâche sans date ira dans son projet ; avec une date, elle apparaîtra ce jour-là.</div>',
      foot: '<button class="btn ghost" data-idea>' + ic('bulb') + '<span>Garder comme idée</span></button><span class="grow"></span><button class="btn primary" data-task>' + ic('check') + 'Créer la tâche</button>',
      onMount(el, close) {
        const di = el.querySelector('[data-f="date"]');
        const paint = () => el.querySelectorAll('[data-d]').forEach((b) => b.classList.toggle('on', (b.dataset.d || null) === date));
        el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { date = b.dataset.d || null; di.value = date || ''; paint(); });
        di.onchange = () => { date = di.value || null; paint(); };
        const text = () => el.querySelector('[data-f="text"]').value.trim() || it.text;
        const proj = () => el.querySelector('[data-f="project"]').value || null;
        el.querySelector('[data-task]').onclick = () => {
          if (!proj() && !date) {
            UI.toast('Choisis un projet ou une date', { error: true });
            return;
          }
          M.inboxToTask(id, { title: text(), projectId: proj(), date });
          processed = true;
          close();
          UI.toast(date ? 'Planifiée · ' + U.rel(date) : 'Ajoutée au projet', { icon: 'check' });
        };
        el.querySelector('[data-idea]').onclick = () => {
          Store.update((s) => { const x = s.inbox.find((y) => y.id === id); if (x) x.text = text(); }, { silent: true });
          M.inboxToIdea(id, proj());
          processed = true;
          close();
          UI.toast('Rangée dans les idées', { icon: 'bulb' });
        };
      },
    });
  }

  const InboxView = {
    render() {
      const s = Store.get();
      const items = s.inbox;
      const ideas = s.ideas;
      let h = '<header class="page-head"><div class="grow"><div class="eyebrow">Boîte de réception</div><h1 class="h1">Vider sa tête</h1><p class="lead">Note tout ici en 2 secondes. Trie plus tard vers un projet ou une date.</p></div></header>';
      h += '<form class="capture-box" data-form="capture"><span class="ico" style="color:var(--accent);font-size:20px">' + ic(kind === 'idea' ? 'bulb' : 'plus') + '</span>' +
        '<input name="t" placeholder="' + (kind === 'idea' ? 'Une idée…' : 'Une tâche, un rappel…') + '" autocomplete="off" maxlength="300" enterkeyhint="send">' +
        '<div class="seg"><button type="button" data-act="ib-kind" data-k="task" class="' + (kind === 'task' ? 'on' : '') + '" title="Tâche">' + ic('check') + '</button><button type="button" data-act="ib-kind" data-k="idea" class="' + (kind === 'idea' ? 'on' : '') + '" title="Idée">' + ic('bulb') + '</button></div>' +
        '<button class="btn primary" type="submit" aria-label="Capturer">' + ic('arrow-up') + '</button></form>';

      h += '<div class="row" style="margin:22px 0 12px"><div class="seg">' +
        '<button data-act="ib-tab" data-t="inbox" class="' + (tab === 'inbox' ? 'on' : '') + '">' + ic('inbox') + 'À trier <span class="count">' + items.length + '</span></button>' +
        '<button data-act="ib-tab" data-t="ideas" class="' + (tab === 'ideas' ? 'on' : '') + '">' + ic('bulb') + 'Idées <span class="count">' + ideas.length + '</span></button></div>' +
        '<span class="spacer"></span>' + (tab === 'inbox' && items.length > 1 ? '<button class="btn ghost sm" data-act="ib-triage-all">' + ic('play') + 'Tout trier</button>' : '') + '</div>';

      if (tab === 'inbox') {
        h += '<section class="card" style="padding:8px">' + (items.length ? items.map(item).join('') :
          C.empty('inbox', 'Inbox zéro', 'Tout est trié. Ton esprit est libre.', '', 'big inbox-zero')) + '</section>';
      } else {
        h += '<section class="card" style="padding:8px">' + (ideas.length ? ideas.map(ideaRow).join('') :
          C.empty('bulb', 'Pas encore d’idées', 'Les idées gardées pour plus tard apparaîtront ici.', '', 'big')) + '</section>';
      }
      return h;
    },
    mount(root) {
      const f = root.querySelector('[data-form="capture"]');
      f.onsubmit = (e) => {
        e.preventDefault();
        const v = f.querySelector('input').value;
        if (!v.trim()) return;
        InboxView._refocus = true;
        M.capture(v, kind);
      };
      if (InboxView._refocus || (window.matchMedia('(hover: hover)').matches && InboxView._first)) {
        f.querySelector('input').focus({ preventScroll: true });
      }
      InboxView._refocus = false;
      InboxView._first = false;
    },
    onEnter() { InboxView._first = true; },
    actions: {
      triage(el) { triage(el.dataset.id); },
      'ib-kind'(el) { kind = el.dataset.k; InboxView._refocus = true; App.render(); },
      'ib-tab'(el) { tab = el.dataset.t; App.render(); },
      'ib-del'(el) { M.deleteInbox(el.dataset.id); UI.undoToast('Supprimé'); },
      'ib-today'(el) { M.inboxToTask(el.dataset.id, { date: U.today() }); UI.toast("Ajoutée à aujourd'hui", { icon: 'sun' }); },
      'ib-triage-all'() {
        const first = Store.get().inbox[0];
        if (first) triage(first.id, true);
      },
      'idea-del'(el) { M.deleteIdea(el.dataset.id); UI.undoToast('Idée supprimée'); },
      'idea-task'(el) { M.ideaToTask(el.dataset.id, {}); UI.toast('Transformée en tâche'); },
      'idea-open'(el) {
        const i = Store.get().ideas.find((x) => x.id === el.dataset.id);
        if (!i) return;
        UI.sheet({
          title: 'Idée',
          body: '<textarea class="textarea" data-f="t" rows="4">' + U.esc(i.text) + '</textarea><div class="field"><label>Projet lié</label><select class="select" data-f="p">' + UI.projectOptions(i.projectId) + '</select></div>',
          foot: '<button class="btn ghost danger" data-del>' + ic('trash') + '</button><span class="grow"></span><button class="btn" data-task>' + ic('check') + 'En faire une tâche</button><button class="btn primary" data-save>Enregistrer</button>',
          onMount(el2, close) {
            const val = () => ({ text: el2.querySelector('[data-f="t"]').value.trim() || i.text, projectId: el2.querySelector('[data-f="p"]').value || null });
            el2.querySelector('[data-save]').onclick = () => { const v = val(); Store.update((s) => { Object.assign(s.ideas.find((x) => x.id === i.id), v); }); close(); };
            el2.querySelector('[data-task]').onclick = () => { const v = val(); Store.update((s) => { Object.assign(s.ideas.find((x) => x.id === i.id), v); }, { silent: true }); M.ideaToTask(i.id, {}); close(); UI.toast('Transformée en tâche'); };
            el2.querySelector('[data-del]').onclick = () => { close(); M.deleteIdea(i.id); UI.undoToast('Idée supprimée'); };
          },
        });
      },
    },
  };

  window.InboxView = InboxView;
})();
