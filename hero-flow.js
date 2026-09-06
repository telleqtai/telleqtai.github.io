(() => {
  const hero = document.querySelector('.home-hero');
  const scene = hero?.querySelector('.hero-flow-scene');
  const canvas = scene?.querySelector('.hero-flow-canvas');
  const toggle = hero?.querySelector('.hero-motion-toggle');
  const poster = scene?.querySelector('.hero-poster');
  const module = scene?.querySelector('.hero-ai-module');
  const hand = scene?.querySelector('.hero-install-hand');
  const layers = scene ? [...scene.querySelectorAll('.hero-layer')] : [];
  const { gsap } = window;
  if (!canvas || !toggle || !poster || !module || !hand || !gsap || !window.IntersectionObserver || !window.ResizeObserver || !window.Path2D) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // New connections sit above the unchanged legacy plate in source-image coordinates.
  const definitions = [
    'M934 362 V384 Q934 399 919 404 L846 430',
    'M1006 355 V420',
    'M1147 341 V362 Q1147 382 1170 383 H1338 Q1360 383 1360 397',
    'M975 358 V397 Q975 420 952 421 Q932 421 932 444 V649 Q932 670 910 672 L813 677',
    'M1050 351 V386 Q1050 398 1070 402 L1100 411 Q1111 414 1111 435 V634 Q1111 645 1132 645 H1200',
  ];
  const routes = definitions.map(data => {
    const geometry = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    geometry.setAttribute('d', data);
    return { path: new Path2D(data), geometry, length: geometry.getTotalLength() };
  });
  const rim = new Path2D('M928 204 L1158 177 Q1171 175 1171 187 L1171 330 Q1171 340 1160 342 L930 365 Q917 366 917 353 L917 216 Q917 205 928 204');
  let userPaused = false, installationShown = false;

  // Never replace the complete poster with a partially loaded scene.
  Promise.all(layers.map(image => image.decode())).then(() => {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const first = !installationShown;
      installationShown = true;
      const state = { x: first ? 60 : 0, y: first ? -155 : 0, handX: first ? 0 : 420, handY: first ? 0 : -300, handAlpha: first ? 1 : 0, power: first ? 0 : 1, progress: 0 };
      let visible = false, compact = false, nextFrame = 0;
      let ratio = 1, scale = 1, offsetX = 0, offsetY = 0;
      const moduleX = gsap.quickSetter(module, 'x', 'px');
      const moduleY = gsap.quickSetter(module, 'y', 'px');
      const moduleAlpha = gsap.quickSetter(module, 'opacity');
      const handX = gsap.quickSetter(hand, 'x', 'px');
      const handY = gsap.quickSetter(hand, 'y', 'px');
      const handAlpha = gsap.quickSetter(hand, 'opacity');

      const draw = (force = false) => {
        const now = performance.now();
        if (!force && now < nextFrame) return;
        nextFrame = now + 1000 / (compact ? 24 : 30) - 1;
        // Match the extracted glass/hand layers to the approved keyframe.
        moduleX(offsetX + (300 + state.x) * scale);
        moduleY(offsetY + (65 + state.y) * scale);
        moduleAlpha(.72 + state.power * (.25 + .03 * Math.sin(state.progress * Math.PI * 4)));
        handX(offsetX + (45 + state.x + state.handX) * scale);
        handY(offsetY + (-33 + state.y + state.handY) * scale);
        handAlpha(state.handAlpha);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!state.power) return;
        ctx.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, ratio * offsetY);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#8bdded';
        routes.forEach((route, index) => {
          ctx.setLineDash([route.length * state.power, route.length]);
          ctx.lineDashOffset = 0;
          ctx.globalAlpha = .34 * state.power;
          ctx.lineWidth = 1.4;
          ctx.stroke(route.path);
          const trail = Math.min(85, route.length * .6);
          const phase = (state.progress + index * .17) % 1;
          const end = phase * (route.length + trail);
          const start = Math.max(0, end - trail);
          const limit = Math.min(route.length * state.power, end);
          if (limit <= start) return;
          const from = route.geometry.getPointAtLength(start);
          const to = route.geometry.getPointAtLength(limit);
          const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
          gradient.addColorStop(0, '#9ae9ff00');
          gradient.addColorStop(.6, '#9ae9ff99');
          gradient.addColorStop(1, '#e5fcff');
          ctx.strokeStyle = gradient;
          ctx.setLineDash([limit - start, route.length + trail]);
          ctx.lineDashOffset = -start;
          ctx.globalAlpha = .14 * state.power;
          ctx.lineWidth = 12;
          ctx.stroke(route.path);
          ctx.globalAlpha = .95 * state.power;
          ctx.lineWidth = 2.5;
          ctx.stroke(route.path);
          ctx.strokeStyle = '#8bdded';
        });
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.strokeStyle = '#a4eaff';
        ctx.globalAlpha = state.power * (.16 + .12 * (1 + Math.sin(state.progress * Math.PI * 4)) / 2);
        ctx.lineWidth = 7;
        ctx.stroke(rim);
        ctx.globalAlpha = 1;
      };

      const installation = gsap.timeline({ paused: true, onUpdate: () => draw() });
      if (first) {
        installation.to(state, { x: 0, y: 0, duration: 2.2, ease: 'power2.inOut' }, .15)
          .to(state, { power: 1, duration: 1.8, ease: 'power2.out' }, 2.15)
          .to(state, { handX: 420, handY: -300, duration: 2.1, ease: 'power2.inOut' }, 3.1)
          .to(state, { handAlpha: 0, duration: .7, ease: 'power1.in' }, 4.3);
      }
      const loop = gsap.to(state, { progress: 1, duration: 7.6, ease: 'none', repeat: -1, paused: true, onUpdate: () => draw() });
      const resize = () => {
        compact = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
        ratio = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5);
        const width = canvas.clientWidth, height = canvas.clientHeight;
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const style = getComputedStyle(poster);
        const fit = style.objectFit === 'cover' ? Math.max : Math.min;
        scale = fit(width / 1672, height / 941);
        offsetX = (width - 1672 * scale) * parseFloat(style.objectPosition) / 100;
        offsetY = (height - 941 * scale) * .5;
        gsap.set(module, { scale: .7 * scale });
        gsap.set(hand, { scale });
        draw(true);
      };
      const update = () => {
        const paused = !visible || document.hidden || userPaused;
        installation.paused(paused);
        loop.paused(paused);
      };
      const pause = () => {
        userPaused = !userPaused;
        const label = userPaused ? 'Resume animation' : 'Pause animation';
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        toggle.querySelector('span').textContent = userPaused ? 'play_arrow' : 'pause';
        update();
      };
      const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
      const dimensions = new ResizeObserver(resize);
      resize();
      scene.classList.add('is-ready');
      toggle.hidden = false;
      toggle.addEventListener('click', pause);
      document.addEventListener('visibilitychange', update);
      visibility.observe(scene);
      dimensions.observe(canvas);
      return () => {
        visibility.disconnect();
        dimensions.disconnect();
        toggle.removeEventListener('click', pause);
        document.removeEventListener('visibilitychange', update);
        toggle.hidden = true;
        scene.classList.remove('is-ready');
        gsap.set([module, hand], { clearProps: 'transform,opacity' });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    });
  }).catch(() => { /* The approved poster remains visible if any layer cannot decode. */ });
})();
