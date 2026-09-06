(() => {
  const menu = document.querySelector('.mobile-menu');
  menu?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
  document.addEventListener('click', event => {
    if (menu && !menu.contains(event.target)) menu.open = false;
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));

  const copyEmail = document.querySelector('[data-copy-email]');
  if (copyEmail) {
    copyEmail.hidden = false;
    copyEmail.addEventListener('click', async () => {
      const status = document.querySelector('.email-status');
      try {
        await navigator.clipboard.writeText(copyEmail.dataset.copyEmail);
        status.textContent = 'Email address copied.';
      } catch {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#contact-email'));
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = 'Copy the selected email address using the copy command on your device.';
      }
    });
  }

  const { gsap } = window;
  if (!gsap || !('IntersectionObserver' in window)) return;
  const revealed = new WeakSet();
  const motion = gsap.matchMedia();

  // Every effect is optional: the HTML remains readable before GSAP or without it.
  motion.add('(prefers-reduced-motion: no-preference)', context => {
    const intro = gsap.timeline({ defaults: { duration: .85, ease: 'power3.out' } });
    const heading = document.querySelector('.hero-copy, .page-head .home-wrap');
    if (heading && !revealed.has(heading)) {
      revealed.add(heading);
      intro.from(heading.children, { y: 12, opacity: .75, stagger: .075, clearProps: 'transform,opacity' });
    }

    const groups = '.outcomes-grid, .delivery-steps, .platform-grid, .capability-grid, .operational-flow';
    context.add('reveal', element => {
      if (revealed.has(element)) return;
      revealed.add(element);
      const items = element.matches(groups) ? [...element.children] : [element];
      const sequence = gsap.timeline({ defaults: { ease: 'power3.out' } });
      sequence.from(items, {
        y: 16, opacity: .75, duration: .8,
        stagger: .09, clearProps: 'transform,opacity',
      });
      if (element.matches('.delivery-steps, .operational-flow')) {
        sequence.fromTo(items, { '--line-reveal': 0 }, {
          '--line-reveal': 1, duration: 1.05, stagger: .12,
        }, 0);
      }
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        context.reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    document.querySelectorAll(`${groups}, .section-intro, .delivery-head, .page-section > .home-wrap > h2`).forEach(element => {
      if (!revealed.has(element)) observer.observe(element);
    });

    const visibility = () => intro.paused(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
    };
  });

  // Desktop depth has its own lifecycle, so resizing never restarts page reveals.
  motion.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (hover: hover) and (pointer: fine)', () => {
    const hero = document.querySelector('.home-hero');
    const media = hero?.querySelector('.home-hero-media');
    if (!media) return;
    const image = media.querySelector('.hero-flow-scene') || media.querySelector('img');
    const entrance = gsap.timeline();
    if (!revealed.has(image)) {
      revealed.add(image);
      entrance.fromTo(image, { scale: 1.065 }, { scale: 1.015, duration: 1.5, ease: 'power3.out' });
    } else {
      gsap.set(image, { scale: 1.015 });
    }

    // Reuse tweens only in response to input; never write the browser's scroll position.
    const moveX = gsap.quickTo(media, 'x', { duration: .85, ease: 'power3.out' });
    const moveY = gsap.quickTo(media, 'y', { duration: .85, ease: 'power3.out' });
    const scrollDepth = gsap.quickTo(image, 'y', { duration: .6, ease: 'power2.out' });
    let visible = hero.getBoundingClientRect().bottom > 0;
    const move = event => {
      if (!visible || document.hidden || event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      moveX(((event.clientX - rect.left) / rect.width - .5) * 16);
      moveY(((event.clientY - rect.top) / rect.height - .5) * 10);
    };
    const resetDepth = () => { moveX(0); moveY(0); };
    const scroll = () => {
      if (!visible || document.hidden) return;
      const rect = hero.getBoundingClientRect();
      scrollDepth(gsap.utils.clamp(0, 1, -rect.top / rect.height) * 24);
    };
    const visibility = () => {
      entrance.paused(document.hidden || !visible);
      if (document.hidden || !visible) {
        [moveX, moveY, scrollDepth].forEach(move => move.tween.pause());
      } else {
        resetDepth();
        scroll();
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      visibility();
    });
    observer.observe(hero);
    hero.addEventListener('pointermove', move, { passive: true });
    hero.addEventListener('pointerleave', resetDepth);
    window.addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      observer.disconnect();
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', resetDepth);
      window.removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', visibility);
    };
  });
})();
