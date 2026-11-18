/* Écran « Plus » : liens rapides, modules à venir, réglages, données. */
(function () {
  const UPCOMING = [
    { icon: 'briefcase', color: '#7c9cff', t: 'Emploi', s: 'Candidatures, statuts, alertes de relance.' },
    { icon: 'file', color: '#f2b35b', t: 'Admin & papiers', s: 'Échéances France Travail, documents, comptes à rebours.' },
    { icon: 'wallet', color: '#4fd1a1', t: 'Budget', s: 'Dépenses par catégorie, abonnements, épargne.' },
    { icon: 'dumbbell', color: '#ff7a6b', t: 'Habitudes & sport', s: 'Séries, calendrier, séances de la semaine.' },
    { icon: 'timer', color: '#c38bff', t: 'Mode focus', s: 'Pomodoro lié à une tâche, temps par domaine.' },
    { icon: 'chart', color: '#5bc8f2', t: 'Statistiques', s: 'Bilan mensuel, graphiques, points et niveaux.' },
  ];

  function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } }

  const MoreView = {
    render() {
      const s = Store.get();
      const gc = GCal.configured();
      const conn = GCal.connected();
      const origin = location.origin && location.origin !== 'null' ? location.origin : '(ouvre le dashboard depuis une adresse web)';

      let h = '<header class="page-head"><div class="grow"><div class="eyebrow">Plus</div><h1 class="h1">Raccourcis & réglages</h1></div></header>';

      h += '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2 class="h2">' + ic('link') + 'Liens rapides</h2><span class="spacer"></span><button class="btn ghost sm" data-act="link-add">' + ic('plus') + 'Ajouter</button></div>' +
        '<div class="links-grid">' + s.links.map((l) => '<a class="qlink" href="' + U.esc(l.url) + '" target="_blank" rel="noopener" style="--c:' + (l.color || 'var(--accent)') + '"><span class="fav">' + U.esc((l.name || '?').charAt(0).toUpperCase()) + '</span><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + U.esc(l.name) + '<div class="hint" style="font-size:11.5px">' + U.esc(host(l.url)) + '</div></span><button class="icon-btn sm ql-x" data-act="link-del" data-id="' + l.id + '" title="Retirer">' + ic('x') + '</button></a>').join('') + '</div></section>';

      h += '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2 class="h2">' + ic('sparkles') + 'Prochains modules</h2><span class="spacer"></span><span class="count">ajoutés un par un</span></div>' +
        '<div class="module-grid">' + UPCOMING.map((m) => '<div class="module" style="--c:' + m.color + '"><span class="soon-tag">Bientôt</span><div class="m-ico">' + ic(m.icon) + '</div><div class="m-t">' + m.t + '</div><div class="m-s">' + m.s + '</div></div>').join('') + '</div></section>';

      h += '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2 class="h2">' + ic('sliders') + 'Réglages</h2></div><div class="settings-list">' +
        '<div class="setting"><div class="s-body"><div class="s-t">Ton prénom</div><div class="s-d">Pour la salutation de l’écran Aujourd’hui.</div></div><input class="input" style="max-width:200px" data-set="name" value="' + U.esc(s.settings.name || '') + '" placeholder="Prénom" maxlength="40"></div>' +
        '<div class="setting" style="align-items:flex-start;flex-wrap:wrap"><div class="s-body" style="min-width:240px"><div class="s-t">' + ic('google') + ' Google Agenda</div><div class="s-d">' +
          (conn ? '<span class="pill ok">' + ic('check') + 'Connecté</span> · synchro ' + (GCal.lastSync() ? U.ago(GCal.lastSync()) : '—') : gc ? 'Identifiant enregistré. Connecte-toi pour afficher tes rendez-vous.' : 'Affiche tes rendez-vous Google dans Aujourd’hui (lecture seule).') + '</div>' +
          '<div class="field" style="margin-top:12px"><label>Identifiant client OAuth</label><input class="input" data-set="gcalClientId" value="' + U.esc(s.settings.gcalClientId || '') + '" placeholder="xxxxxxxx.apps.googleusercontent.com" spellcheck="false" autocomplete="off"></div>' +
          '<details style="margin-top:10px"><summary class="link-btn" style="cursor:pointer">Comment l’obtenir (5 min, une seule fois)</summary><ol class="steps-list">' +
            '<li>Va sur <b>console.cloud.google.com</b>, crée un projet.</li>' +
            '<li>« API et services › Bibliothèque » : active <b>Google Calendar API</b>.</li>' +
            '<li>« Écran de consentement OAuth » : type Externe, ajoute ton adresse en utilisateur test.</li>' +
            '<li>« Identifiants › Créer › ID client OAuth » : type <b>Application Web</b>, origine JavaScript autorisée : <code>' + U.esc(origin) + '</code></li>' +
            '<li>Copie l’identifiant client ici, puis clique sur Connecter.</li></ol></details>' +
        '</div><div class="row">' + (conn ? '<button class="btn sm" data-act="gcal-refresh">' + ic('refresh') + 'Actualiser</button><button class="btn ghost sm danger" data-act="gcal-off">Déconnecter</button>' : '<button class="btn sm primary" data-act="gcal-on"' + (gc ? '' : ' disabled') + '>' + ic('google') + 'Connecter</button>') + '</div></div>' +
        '</div></section>';

      h += '<section class="card" style="margin-bottom:16px"><div class="card-head"><h2 class="h2">' + ic('archive') + 'Mes données</h2></div><div class="settings-list">' +
        '<div class="setting"><div class="s-body"><div class="s-t">Sauvegarde automatique</div><div class="s-d">Tout est enregistré dans ce navigateur à chaque modification. Exporte de temps en temps pour garder une copie ou passer sur un autre appareil.</div></div></div>' +
        '<div class="setting"><div class="s-body"><div class="s-t">Exporter</div><div class="s-d">Fichier JSON avec toutes tes données.</div></div><button class="btn sm" data-act="export">' + ic('download') + 'Exporter</button></div>' +
        '<div class="setting"><div class="s-body"><div class="s-t">Importer</div><div class="s-d">Remplace les données actuelles par un fichier exporté.</div></div><button class="btn sm" data-act="import">' + ic('upload') + 'Importer</button></div>' +
        (!s.goals.length && !s.tasks.length ? '<div class="setting"><div class="s-body"><div class="s-t">Exemples</div><div class="s-d">Ajoute quelques objectifs, projets et tâches pour découvrir.</div></div><button class="btn sm" data-act="seed">' + ic('sparkles') + 'Charger</button></div>' : '') +
        '<div class="setting"><div class="s-body"><div class="s-t">Tout effacer</div><div class="s-d">Repart d’un espace vide. Irréversible.</div></div><button class="btn sm danger" data-act="wipe">' + ic('trash') + 'Effacer</button></div>' +
        '</div></section>';

      h += '<p class="hint" style="text-align:center;margin:26px 0 10px">Raccourcis clavier : <kbd>N</kbd> capturer · <kbd>1</kbd>–<kbd>5</kbd> onglets · <kbd>Échap</kbd> fermer</p>';
      return h;
    },
    mount(root) {
      root.querySelectorAll('[data-set]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const k = inp.dataset.set;
          Store.update((s) => { s.settings[k] = inp.value.trim(); });
          UI.toast('Enregistré');
        });
      });
    },
    actions: {
      'link-add'() {
        UI.sheet({
          title: 'Nouveau lien',
          body: '<div class="field"><label>Nom</label><input class="input" data-f="name" placeholder="Ex. : Ma banque" autofocus maxlength="40"></div>' +
            '<div class="field"><label>Adresse</label><input class="input" data-f="url" placeholder="https://…" inputmode="url" spellcheck="false"></div>',
          foot: '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-save>Ajouter</button>',
          onMount(el, close) {
            el.querySelector('[data-save]').onclick = () => {
              const name = el.querySelector('[data-f="name"]').value.trim();
              let url = el.querySelector('[data-f="url"]').value.trim();
              if (!name || !url) return UI.toast('Nom et adresse requis', { error: true });
              if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
              const colors = ['#9d8cff', '#6aa9ff', '#4fd1a1', '#f2b35b', '#ff7a6b', '#f48fb1', '#5bc8f2'];
              Store.update((s) => { s.links.push({ id: U.uid(), name, url, color: colors[s.links.length % colors.length] }); });
              close();
            };
          },
        });
      },
      'link-del'(el, e) {
        e.preventDefault();
        e.stopPropagation();
        Store.update((s) => { s.links = s.links.filter((l) => l.id !== el.dataset.id); }, { undoable: true });
        UI.undoToast('Lien retiré');
      },
      async 'gcal-on'(el) {
        el.disabled = true;
        try { await GCal.connect(); await GCal.sync(); UI.toast('Google Agenda connecté', { icon: 'calendar-check' }); }
        catch (e) { UI.toast(e.message || 'Connexion impossible', { error: true }); }
        finally { el.disabled = false; }
      },
      async 'gcal-refresh'() {
        try { await GCal.sync(); UI.toast('Agenda actualisé', { icon: 'calendar-check' }); }
        catch (e) { UI.toast(e.message === 'not-connected' ? 'Session expirée, reconnecte-toi' : e.message, { error: true }); App.render(); }
      },
      'gcal-off'() { GCal.disconnect(); UI.toast('Google Agenda déconnecté'); },
      export() {
        U.download('life-os-' + U.today() + '.json', Store.exportJSON());
        UI.toast('Export téléchargé', { icon: 'download' });
      },
      import() {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'application/json,.json';
        inp.onchange = async () => {
          const f = inp.files[0];
          if (!f) return;
          try {
            const data = JSON.parse(await f.text());
            if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) throw new Error('format');
            const ok = await UI.confirm({ title: 'Importer ces données ?', text: 'Tes données actuelles seront remplacées par celles du fichier.', ok: 'Importer' });
            if (!ok) return;
            Store.replace(data);
            UI.toast('Données importées');
          } catch (e) { UI.toast('Fichier invalide', { error: true }); }
        };
        inp.click();
      },
      seed() { Store.seed(); UI.toast('Exemples ajoutés', { icon: 'sparkles' }); location.hash = '#/aujourdhui'; },
      async wipe() {
        const ok = await UI.confirm({ title: 'Tout effacer ?', text: 'Objectifs, projets, tâches, journal et bilans seront supprimés de cet appareil. Pense à exporter avant.', ok: 'Tout effacer', danger: true });
        if (!ok) return;
        const name = Store.get().settings.name;
        Store.reset();
        Store.update((s) => { s.settings.name = name; s.settings.onboarded = true; });
        UI.toast('Espace réinitialisé');
      },
    },
  };

  window.MoreView = MoreView;
})();
