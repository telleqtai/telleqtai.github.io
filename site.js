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

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!motion.matches) entry.target.classList.add('reveal');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.outcome, .delivery-steps li, .platform').forEach(el => observer.observe(el));
  }

  const canvas = document.querySelector('.signal-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  let width = 0, height = 0, frame = 0, visible = true;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  // Packets follow parallel signal paths, keeping the copy area quiet.
  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    for (let lane = 0; lane < 7; lane++) {
      const start = width * .49;
      const y = height * .18 + lane * height * .095;
      const bend = width * (.68 + lane * .012);
      const endY = y - height * .13;
      ctx.beginPath();
      ctx.moveTo(start, y);
      ctx.lineTo(bend, y);
      ctx.lineTo(bend + 48, endY);
      ctx.lineTo(width, endY);
      ctx.strokeStyle = lane % 3 ? '#7bd0ff22' : '#91d7b52b';
      ctx.lineWidth = 1;
      ctx.stroke();
      const progress = ((time / 12000) + lane * .173) % 1;
      const x = start + progress * (width - start);
      const py = x < bend ? y : x < bend + 48 ? y + (endY - y) * (x - bend) / 48 : endY;
      ctx.fillStyle = lane % 3 ? '#9ee0ff' : '#91d7b5';
      ctx.fillRect(x - 2, py - 1.5, 6, 3);
    }
    frame = requestAnimationFrame(draw);
  }
  function updateMotion() {
    cancelAnimationFrame(frame);
    if (!motion.matches && visible && !document.hidden) frame = requestAnimationFrame(draw);
  }
  new ResizeObserver(resize).observe(canvas);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateMotion(); }).observe(canvas);
  }
  motion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', updateMotion);
  resize();
  updateMotion();
})();
