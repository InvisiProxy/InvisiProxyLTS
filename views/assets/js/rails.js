import { values } from 'build:invisiproxy';

(() => {
  const slots = [...document.querySelectorAll('.placement')];
  if (!slots.length) return;

  const readStorage = (name) => {
    try {
      return (JSON.parse(localStorage.getItem(`${values.storageNamespace}-storage`)) || {})[name];
    } catch {}
  };

  // Page navigations through the loader keep this window, so network scripts
  // and the fetched settings are reused instead of loaded again.
  const state = (window[Symbol.for('placements')] ??= {
    settings: null,
    scripts: new Set(),
    picks: {},
  });
  state.settings ??= fetch(slots[0].dataset.source, { credentials: 'same-origin' })
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}));

  const onLoader = slots.some((slot) => slot.dataset.fill === 'loader');
  const emptyAfterMs = 8000;

  const loadScript = (entry) =>
    new Promise((resolve) => {
      const script = document.createElement('script');
      for (const [name, value] of Object.entries(entry.attributes || {}))
        script.setAttribute(name, value);
      if (entry.src) {
        script.async = !entry.wait;
        script.addEventListener('load', resolve);
        script.addEventListener('error', resolve);
        script.src = entry.src;
      } else script.textContent = entry.code;
      document.head.appendChild(script);
      if (!entry.src) resolve();
    });

  // Scripts sharing a group take turns, so two networks' popunders never
  // compete for the same click. The pick is kept for this window, which stops
  // loader navigations from adding a second network to the page.
  const pickScripts = (scripts) => {
    const groups = {};
    for (const entry of scripts)
      if (entry.group) (groups[entry.group] ??= new Map()).set(entry.pick, entry.weight || 1);
    for (const [group, weights] of Object.entries(groups)) {
      if (weights.has(state.picks[group])) continue;
      let roll = Math.random() * [...weights.values()].reduce((sum, weight) => sum + weight, 0);
      for (const [pick, weight] of weights) {
        state.picks[group] = pick;
        if ((roll -= weight) < 0) break;
      }
    }
    return scripts.filter((entry) => !entry.group || entry.pick === state.picks[entry.group]);
  };

  const runScripts = async (scripts) => {
    // Popunders and overlays are kept off the proxy frame unless asked for.
    for (const entry of pickScripts(scripts.filter((entry) => !onLoader || entry.frame))) {
      const key = entry.src || entry.code;
      if (state.scripts.has(key)) continue;
      state.scripts.add(key);
      const loaded = loadScript(entry);
      if (entry.wait) await loaded;
    }
  };

  const show = (slot) => slot.classList.add('placement-live');
  const hide = (slot) => slot.classList.remove('placement-live');

  // A network with nothing to show still leaves hidden links and tracking
  // pixels behind, so only something visible with a real size counts.
  const hasAd = (frame) =>
    [
      ...(frame.contentDocument?.body?.querySelectorAll(
        'iframe, img, ins, video, canvas, object, embed'
      ) || []),
    ].some((element) => {
      const { width, height } = element.getBoundingClientRect();
      return width > 2 && height > 2;
    });

  // Each banner gets its own blank frame. Writing into it keeps this page's
  // URL, so the networks see the real domain, and their document.write calls
  // and atOptions globals cannot clash with each other or with the site.
  // A slot still empty after the wait tries the next unit, then collapses.
  const renderFrame = (slot, unit, refill) => {
    const frame = document.createElement('iframe');
    frame.width = String(unit.width);
    frame.height = String(unit.height);
    frame.setAttribute('scrolling', 'no');
    frame.setAttribute('title', slot.getAttribute('aria-label') || '');
    show(slot);
    slot.appendChild(frame);
    const frameDocument = frame.contentDocument;
    if (!frameDocument) return hide(slot);
    frameDocument.open();
    frameDocument.write(unit.html);
    frameDocument.close();
    setTimeout(() => {
      if (hasAd(frame)) return;
      frame.remove();
      const next = refill();
      if (next) renderFrame(slot, next, refill);
      else hide(slot);
    }, emptyAfterMs);
  };

  // Each page view takes its banners from one network, picked by share.
  const pickNetwork = (shares = []) => {
    let roll = Math.random() * shares.reduce((sum, share) => sum + share, 0);
    return shares.findIndex((share) => (roll -= share) < 0);
  };

  const shuffle = (units) =>
    units
      .map((unit) => [Math.random() ** (1 / (unit.weight || 1)), unit])
      .sort((a, b) => b[0] - a[0])
      .map(([, unit]) => unit);

  // Spread a placement's units over its slots so both rails differ when
  // there is more than one unit to choose from. The page's network deals
  // first; other networks only fill slots it has no unit left for, so a slot
  // is not left empty or given a code already showing on the page. Units are
  // shuffled by weight, so weight 3 comes first three times as often as 1.
  // Refills for empty slots only take units not yet tried on this page.
  const tried = new Set();
  const dealer = (units = [], network) => {
    const deck = [
      ...shuffle(units.filter((unit) => unit.network === network)),
      ...shuffle(units.filter((unit) => unit.network !== network)),
    ];
    const take = (unit) => {
      if (unit) tried.add(unit.html);
      return unit;
    };
    let next = 0;
    return {
      deal: () => take(deck.length ? deck[next++ % deck.length] : undefined),
      refill: () => take(deck.find((unit) => !tried.has(unit.html))),
    };
  };

  const dockRails = () => {
    const rails = slots.filter(
      (slot) =>
        slot.dataset.fill === 'rail' &&
        slot.classList.contains('placement-live')
    );
    const footer = document.getElementById('footer');
    if (!rails.length || !footer) return;
    let queued = false;
    const update = () => {
      queued = false;
      const footerTop = footer.getBoundingClientRect().top;
      for (const rail of rails) {
        const shift = Math.min(
          0,
          footerTop - (rail.offsetTop + rail.offsetHeight + 24)
        );
        rail.style.transform = shift ? `translateY(${shift}px)` : '';
      }
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    update();
  };

  state.settings.then((settings) => {
    const units = settings.units || {};
    const wide = document.documentElement.clientWidth >= 760;
    const network = pickNetwork(settings.shares);
    const deal = {
      rail: dealer(units.rail, network),
      banner: dealer(wide && units.banner?.length ? units.banner : units.mobile, network),
      loader: dealer(units.loader, network),
    };
    for (const slot of slots) {
      if (getComputedStyle(slot).display === 'none') continue;
      const cards = deal[slot.dataset.fill];
      const unit = cards?.deal();
      if (unit) renderFrame(slot, unit, cards.refill);
    }
    dockRails();
    // Page-wide formats (popunders, vignettes, Social Bar) can be turned off
    // in settings; banners keep running either way.
    if (readStorage('BlockPopups') !== true) runScripts(settings.scripts || []);
  });
})();
