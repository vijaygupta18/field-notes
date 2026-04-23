/* ────────────────────────────────────────────────────────────────
   Field Notes — tiny bits of interactivity.
   Rule: never do more than a real notebook could.
   ──────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // ── 1. reveal-on-scroll for pages ────────────────────────────
  const revealEls = document.querySelectorAll(
    '.page, .stat-card, .build-card, .letter, .polaroid, .postit, ' +
    '.ny-chart, .juspay-sketch, .form-card, .stamp-block, ' +
    '.margin-note, .highlight-note, .toolbox-map'
  );
  revealEls.forEach(el => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);

        // when the NY page comes in, draw its chart curve
        const curve = e.target.querySelector?.('.chart-curve');
        if (curve) setTimeout(() => curve.classList.add('drawn'), 280);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach(el => io.observe(el));


  // ── 2. active bookmark tab based on visible page ────────────
  const bookmarks = document.querySelectorAll('.bm');
  const pages = document.querySelectorAll('.page');
  const bmMap = new Map();
  bookmarks.forEach(bm => {
    const href = bm.getAttribute('href');
    if (href && href.startsWith('#')) bmMap.set(href.slice(1), bm);
  });

  const sectionIo = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        bookmarks.forEach(b => b.classList.remove('active'));
        const bm = bmMap.get(entry.target.id);
        if (bm) bm.classList.add('active');
      }
    });
  }, { threshold: 0.45 });
  pages.forEach(p => sectionIo.observe(p));


  // ── 3. post-it peel on hover (subtle physical feel) ─────────
  document.querySelectorAll('.postit').forEach(postit => {
    let baseRot = null;
    postit.addEventListener('mouseenter', () => {
      if (baseRot === null) {
        const m = postit.style.transform.match(/rotate\((-?\d+\.?\d*)deg\)/);
        baseRot = m ? parseFloat(m[1]) : 0;
      }
      postit.style.transition = 'transform 0.25s cubic-bezier(.2,.9,.3,1.2)';
      postit.style.transform = `rotate(${baseRot * 0.3}deg) translate(-2px, -4px)`;
      postit.style.boxShadow =
        '0 2px 4px rgba(0,0,0,0.12), 0 16px 30px rgba(0,0,0,0.3), 0 28px 50px rgba(0,0,0,0.22)';
    });
    postit.addEventListener('mouseleave', () => {
      postit.style.transform = '';
      postit.style.boxShadow = '';
    });
  });


  // ── 4. polaroid rotate on hover (already has base rotate in CSS,
  //        here we add a tiny random wiggle) ────────────────────
  document.querySelectorAll('.polaroid, .letter').forEach(el => {
    el.addEventListener('mouseenter', () => {
      const wiggle = (Math.random() * 2 - 1) * 0.8;
      el.style.setProperty('--wiggle', wiggle + 'deg');
    });
  });


  // ── 5. page title reveal — slightly stagger dropcap/prose ───
  // (pure CSS in reveal, nothing needed — kept for extension)


  // ── 6. pencil cursor trail on pages (desktop only, subtle) ──
  const isDesktop = window.matchMedia('(min-width: 900px)').matches &&
                    !window.matchMedia('(pointer: coarse)').matches;

  if (isDesktop) {
    const trailCanvas = document.createElement('canvas');
    trailCanvas.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:30;mix-blend-mode:multiply;';
    document.body.appendChild(trailCanvas);
    const ctx = trailCanvas.getContext('2d');

    function resize() {
      trailCanvas.width = window.innerWidth;
      trailCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let lastX = null, lastY = null, lastT = 0, onPaper = false;

    function isOverPaper(t) {
      while (t && t !== document.body) {
        if (t.classList && t.classList.contains('page')) return true;
        t = t.parentElement;
      }
      return false;
    }

    window.addEventListener('mousemove', (e) => {
      const t = performance.now();
      onPaper = isOverPaper(e.target);
      if (!onPaper) { lastX = lastY = null; return; }

      if (lastX !== null && t - lastT < 60) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = 'rgba(27, 42, 78, 0.08)';
          ctx.lineWidth = 1 + Math.random() * 0.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(e.clientX, e.clientY);
          ctx.stroke();
        }
      }
      lastX = e.clientX; lastY = e.clientY; lastT = t;
    });

    // slowly fade the trail so it doesn't build up forever
    setInterval(() => {
      ctx.fillStyle = 'rgba(244, 236, 212, 0.04)';
      ctx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
    }, 80);
  }


  // ── 7. stat big numbers — count up on reveal ─────────────────
  document.querySelectorAll('.stat-big').forEach(el => {
    const raw = el.textContent.trim();
    // parse first digit-run as target, keep prefix/suffix
    const match = raw.match(/^([^\d]*)(\d[\d,.]*)(.*)$/);
    if (!match) return;
    const prefix = match[1], numStr = match[2], suffix = match[3];
    const target = parseFloat(numStr.replace(/,/g, ''));
    if (!isFinite(target) || target === 0) return;

    const card = el.closest('.stat-card');
    if (!card) return;

    const format = n => {
      if (target >= 1000 && raw.includes('k')) return prefix + Math.round(n).toLocaleString() + suffix;
      if (target >= 1000) return prefix + Math.round(n).toLocaleString() + suffix;
      if (numStr.includes('.')) return prefix + n.toFixed(1) + suffix;
      return prefix + Math.round(n) + suffix;
    };

    const countIo = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);

        const dur = 1100 + Math.random() * 400;
        const start = performance.now();
        function tick(t) {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = format(target * eased);
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = raw; // snap to authored text
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    countIo.observe(card);
  });


  // ── 8. résumé modal ───────────────────────────────────────────
  const rmodal = document.getElementById('resumeModal');
  if (rmodal) {
    let lastFocus = null;

    function openResume() {
      lastFocus = document.activeElement;
      rmodal.hidden = false;
      rmodal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // focus the close button for keyboard users
      const close = rmodal.querySelector('.rmodal-close');
      if (close) close.focus();
    }
    function closeResume() {
      rmodal.hidden = true;
      rmodal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    // everything with [data-resume] opens the modal (and prevents navigation)
    document.querySelectorAll('[data-resume]').forEach(el => {
      el.addEventListener('click', (e) => {
        // let cmd/ctrl/middle-click still open the PDF in a new tab
        if (e.metaKey || e.ctrlKey || e.button === 1 || e.shiftKey) return;
        e.preventDefault();
        openResume();
      });
    });

    // anything with [data-close] (backdrop + close buttons)
    rmodal.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeResume);
    });

    // escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !rmodal.hidden) closeResume();
    });

    // trap focus lightly (tab cycles within modal)
    rmodal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = rmodal.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
  }


  // ── 9. contact (email) modal ─────────────────────────────────
  const cmodal  = document.getElementById('contactModal');
  const cform   = document.getElementById('contactForm');
  const cstatus = document.getElementById('cmodalStatus');

  if (cmodal && cform) {
    const CONTACT_ENDPOINT = 'https://portfolio-ai.vijay-gupta-932.workers.dev/contact';
    let lastFocusC = null;
    let submitting = false;
    let lastSent   = 0;

    const clean   = (s) => String(s || '').replace(/<[^>]*>/g, '').slice(0, 4000).trim();
    const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

    const showStatus = (msg, ok = true) => {
      if (!cstatus) return;
      cstatus.textContent = msg;
      cstatus.classList.toggle('is-error', !ok);
      cstatus.classList.toggle('is-ok', ok);
    };

    function openContact() {
      lastFocusC = document.activeElement;
      cmodal.hidden = false;
      cmodal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      showStatus('', true);
      const first = cform.querySelector('input[name="name"]');
      if (first) first.focus();
    }
    function closeContact() {
      cmodal.hidden = true;
      cmodal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocusC && typeof lastFocusC.focus === 'function') lastFocusC.focus();
    }

    document.querySelectorAll('[data-email]').forEach(el => {
      el.addEventListener('click', (e) => {
        // cmd/ctrl/shift/middle-click still opens mailto: in a new tab
        if (e.metaKey || e.ctrlKey || e.button === 1 || e.shiftKey) return;
        e.preventDefault();
        openContact();
      });
    });

    cmodal.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeContact);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !cmodal.hidden) closeContact();
    });

    // light focus trap
    cmodal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = cmodal.querySelectorAll(
        'input:not([type="hidden"]):not([tabindex="-1"]), textarea, a[href], button, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });

    cform.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitting) return;
      if (Date.now() - lastSent < 10000) {
        showStatus('Please wait a few seconds before sending again.', false);
        return;
      }

      const name    = clean(cform.name.value);
      const email   = clean(cform.email.value);
      const subject = clean(cform.subject.value) || 'Portfolio contact';
      const message = clean(cform.message.value);
      const website = cform.website ? cform.website.value : ''; // honeypot

      if (name.length < 2)     { showStatus('Please enter your name.', false); return; }
      if (!isEmail(email))     { showStatus('Please enter a valid email so I can reply.', false); return; }
      if (message.length < 10) { showStatus('Please add a bit more context — at least 10 characters.', false); return; }

      const btn  = cform.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      submitting = true;
      btn.disabled = true;
      btn.innerHTML = '<span>Sending…</span>';
      showStatus('Sending your note to Vijay…', true);

      try {
        const resp = await fetch(CONTACT_ENDPOINT, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message, website })
        });

        let data = {};
        try { data = await resp.json(); } catch (_) {}

        if (!resp.ok) {
          throw new Error(data.error || 'Send failed (' + resp.status + ')');
        }

        lastSent = Date.now();
        cform.reset();
        showStatus('Sent — thank you! I will get back to you soon.', true);
        setTimeout(closeContact, 1800);
      } catch (err) {
        console.error('[contact] send failed:', err);
        showStatus(
          (err && err.message ? err.message : 'Send failed.') +
          ' You can also email vijayrauniyar1818@gmail.com directly.',
          false
        );
      } finally {
        submitting = false;
        btn.disabled = false;
        btn.innerHTML = orig;
      }
    });
  }


  // ── 10. easter egg — type 'vg' to dim the desk lamp ───────────
  let buf = '';
  window.addEventListener('keydown', (e) => {
    if (/^[a-z]$/i.test(e.key)) {
      buf = (buf + e.key.toLowerCase()).slice(-4);
      if (buf.endsWith('vg')) {
        document.body.classList.toggle('night');
      }
    }
  });
})();
