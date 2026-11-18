/* Composants d'interface : feuilles/modales, toasts, menus, sélecteurs. */
(function () {
  const layer = () => document.getElementById('layer');
  const stack = [];

  const UI = {
    /**
     * Ouvre une feuille (bas d'écran sur mobile, modale sur PC).
     * opts: { title, body (html), foot (html), wide, onMount(el, close), onClose }
     */
    sheet(opts) {
      const bd = document.createElement('div');
      bd.className = 'backdrop';
      bd.innerHTML =
        '<div class="sheet' + (opts.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(opts.title || '') + '">' +
          (opts.title !== false ? '<div class="sheet-head"><h3>' + U.esc(opts.title || '') + '</h3>' + (opts.headExtra || '') + '<button class="icon-btn" data-close aria-label="Fermer">' + ic('x') + '</button></div>' : '') +
          '<div class="sheet-body">' + (opts.body || '') + '</div>' +
          (opts.foot ? '<div class="sheet-foot">' + opts.foot + '</div>' : '') +
        '</div>';
      layer().appendChild(bd);
      Icons.hydrate(bd);
      const prevFocus = document.activeElement;
      let closed = false;
      const close = (val) => {
        if (closed) return;
        closed = true;
        stack.splice(stack.indexOf(entry), 1);
        bd.classList.add('closing');
        setTimeout(() => bd.remove(), 220);
        if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* */ }
        opts.onClose && opts.onClose(val);
      };
      const entry = { close };
      stack.push(entry);
      bd.addEventListener('mousedown', (e) => { if (e.target === bd) bd._down = true; });
      bd.addEventListener('click', (e) => {
        if (e.target === bd && bd._down) close();
        bd._down = false;
        if (e.target.closest('[data-close]')) close();
      });
      const el = bd.querySelector('.sheet');
      opts.onMount && opts.onMount(el, close);
      const auto = el.querySelector('[autofocus]');
      if (auto && window.matchMedia('(hover: hover)').matches) setTimeout(() => auto.focus(), 60);
      return close;
    },
    closeTop() { const t = stack[stack.length - 1]; if (t) { t.close(); return true; } return false; },
    hasOpen() { return stack.length > 0; },

    confirm(opts) {
      return new Promise((resolve) => {
        let val = false;
        UI.sheet({
          title: opts.title || 'Confirmer',
          body: '<p style="margin:0;color:var(--text-2)">' + (opts.text || '') + '</p>',
          foot: '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok>' + U.esc(opts.ok || 'Confirmer') + '</button>',
          onMount(el, close) { el.querySelector('[data-ok]').onclick = () => { val = true; close(); }; },
          onClose() { resolve(val); },
        });
      });
    },

    prompt(opts) {
      return new Promise((resolve) => {
        let val = null;
        UI.sheet({
          title: opts.title,
          body: '<input class="input" data-v placeholder="' + U.esc(opts.placeholder || '') + '" value="' + U.esc(opts.value || '') + '" autofocus maxlength="300">',
          foot: '<span class="grow"></span><button class="btn ghost" data-close>Annuler</button><button class="btn primary" data-ok>' + U.esc(opts.ok || 'Valider') + '</button>',
          onMount(el, close) {
            const inp = el.querySelector('[data-v]');
            const ok = () => { if (inp.value.trim()) { val = inp.value.trim(); close(); } else inp.focus(); };
            el.querySelector('[data-ok]').onclick = ok;
            inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
          },
          onClose() { resolve(val); },
        });
      });
    },

    toast(msg, opts) {
      opts = opts || {};
      const box = document.getElementById('toasts');
      const t = document.createElement('div');
      t.className = 'toast' + (opts.error ? ' err' : '');
      t.innerHTML = ic(opts.icon || (opts.error ? 'alert' : 'check')) + '<span class="t-msg">' + U.esc(msg) + '</span>' + (opts.action ? '<button>' + U.esc(opts.action) + '</button>' : '');
      box.appendChild(t);
      while (box.children.length > 3) box.firstChild.remove();
      const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
      const timer = setTimeout(kill, opts.duration || (opts.action ? 5200 : 2600));
      if (opts.action) t.querySelector('button').onclick = () => { clearTimeout(timer); kill(); opts.onAction && opts.onAction(); };
    },
    undoToast(msg) {
      UI.toast(msg, { icon: 'trash', action: 'Annuler', onAction: () => { if (Store.undo()) UI.toast('Restauré', { icon: 'undo' }); } });
    },

    /** Menu contextuel ancré à un élément. items: [{label, icon, danger, onClick} | '-'] */
    menu(anchor, items) {
      UI.closeMenu();
      const m = document.createElement('div');
      m.className = 'menu';
      m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<button data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '">' + ic(it.icon || 'arrow-right') + U.esc(it.label) + '</button>').join('');
      document.body.appendChild(m);
      const r = anchor.getBoundingClientRect();
      const mw = m.offsetWidth, mh = m.offsetHeight;
      let left = Math.min(r.right - mw, window.innerWidth - mw - 8);
      left = Math.max(8, left);
      let top = r.bottom + 6;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
      m.style.left = left + 'px';
      m.style.top = top + 'px';
      m.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (!b) return;
        UI.closeMenu();
        items[+b.dataset.i].onClick();
      });
      setTimeout(() => {
        UI._menuOff = (e) => { if (!m.contains(e.target)) UI.closeMenu(); };
        document.addEventListener('pointerdown', UI._menuOff, true);
      });
      UI._menu = m;
    },
    closeMenu() {
      if (UI._menu) { UI._menu.remove(); UI._menu = null; }
      if (UI._menuOff) { document.removeEventListener('pointerdown', UI._menuOff, true); UI._menuOff = null; }
    },

    /** Sélecteur de date rapide. Résout : 'AAAA-MM-JJ' | null (sans date) | undefined (annulé). */
    pickDate(opts) {
      opts = opts || {};
      const t = U.today();
      const options = [
        { k: t, label: "Aujourd'hui", icon: 'sun' },
        { k: U.addDays(t, 1), label: 'Demain', icon: 'sunrise' },
        { k: U.addDays(t, 2), label: U.rel(U.addDays(t, 2)), icon: 'calendar' },
        { k: U.nextWeekday(0), label: 'Lundi prochain', icon: 'calendar' },
        { k: U.nextWeekday(5), label: 'Ce week-end', icon: 'calendar' },
      ].filter((o, i, a) => a.findIndex((x) => x.k === o.k) === i);
      return new Promise((resolve) => {
        let val;
        UI.sheet({
          title: opts.title || 'Choisir une date',
          body:
            '<div class="chips">' + options.map((o) => '<button class="chip' + (opts.current === o.k ? ' on' : '') + '" data-k="' + o.k + '">' + ic(o.icon) + U.esc(o.label) + '<span class="n">' + U.dayMonth(o.k) + '</span></button>').join('') + '</div>' +
            '<div class="field"><label>Autre date</label><input type="date" class="input" value="' + (opts.current || '') + '" data-custom></div>' +
            (opts.allowNone !== false ? '<button class="btn ghost" data-none>' + ic('inbox') + (opts.noneLabel || 'Sans date') + '</button>' : ''),
          onMount(el, close) {
            el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { val = b.dataset.k; close(); });
            el.querySelector('[data-custom]').onchange = (e) => { if (e.target.value) { val = e.target.value; close(); } };
            const n = el.querySelector('[data-none]');
            if (n) n.onclick = () => { val = null; close(); };
          },
          onClose() { resolve(val); },
        });
      });
    },

    /** <select> des projets groupés par objectif. */
    projectOptions(selected) {
      const s = Store.get();
      let h = '<option value="">Aucun projet</option>';
      Store.DOMAINS.forEach((d) => {
        s.goals.filter((g) => g.domain === d.id).forEach((g) => {
          const ps = s.projects.filter((p) => p.goalId === g.id && (p.status !== 'done' || p.id === selected));
          if (!ps.length) return;
          h += '<optgroup label="' + U.esc(d.name + ' · ' + g.title) + '">' + ps.map((p) => '<option value="' + p.id + '"' + (p.id === selected ? ' selected' : '') + '>' + U.esc(p.title) + '</option>').join('') + '</optgroup>';
        });
      });
      return h;
    },

    /** Petite célébration visuelle. */
    burst(x, y) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const colors = ['#a593ff', '#6aa9ff', '#4fd1a1', '#f2b35b', '#f48fb1'];
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('i');
        s.className = 'spark';
        const a = Math.random() * Math.PI * 2;
        const d = 40 + Math.random() * 70;
        s.style.left = x + 'px';
        s.style.top = y + 'px';
        s.style.background = colors[i % colors.length];
        s.style.setProperty('--dx', Math.cos(a) * d + 'px');
        s.style.setProperty('--dy', Math.sin(a) * d - 20 + 'px');
        s.style.setProperty('--rot', Math.random() * 360 + 'deg');
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 950);
      }
    },
  };

  window.UI = UI;
})();
