// ============================================================
// Black Water Canvas — animated waves + mouse ripples
// ============================================================
(function () {
    var canvas = document.getElementById('water-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var mx = -9999, my = -9999;
    var t = 0;
    var ripples = [];

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mx = e.clientX - rect.left;
        my = e.clientY - rect.top;
        if (ripples.length < 10) {
            ripples.push({ x: mx, y: my, r: 2, maxR: 100, spd: 1.8 });
        }
    });

    // Wave layers: gap=row spacing, amp=height, f=frequency, spd=anim speed, opa=opacity, lw=lineWidth
    var layers = [
        { gap: 34, amp: 8,  f: 0.013, spd: 0.22, opa: 0.22, lw: 0.8 },
        { gap: 56, amp: 14, f: 0.008, spd: 0.14, opa: 0.13, lw: 0.7 },
        { gap: 82, amp: 5,  f: 0.019, spd: 0.34, opa: 0.07, lw: 0.5 },
        { gap: 18, amp: 3,  f: 0.024, spd: 0.48, opa: 0.09, lw: 0.4 },
    ];

    function drawLayer(l, time) {
        ctx.lineWidth = l.lw;
        ctx.strokeStyle = 'rgba(255,255,255,' + l.opa + ')';
        for (var baseY = 0; baseY <= H + l.gap; baseY += l.gap) {
            ctx.beginPath();
            var started = false;
            for (var x = 0; x <= W; x += 4) {
                var dx = x - mx;
                var dy = baseY - my;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var pull = dist < 170
                    ? (1 - dist / 170) * 28 * Math.sin(dist * 0.07 - time * 5)
                    : 0;
                var y = baseY
                    + Math.sin(x * l.f + time * l.spd) * l.amp
                    + Math.sin(x * l.f * 1.7 - time * l.spd * 0.55) * l.amp * 0.38
                    + pull;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }

    function drawRipples() {
        for (var i = ripples.length - 1; i >= 0; i--) {
            var rp = ripples[i];
            rp.r += rp.spd;
            var life = 1 - rp.r / rp.maxR;
            if (life <= 0) { ripples.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,' + (life * 0.28) + ')';
            ctx.lineWidth = 0.7;
            ctx.stroke();
        }
    }

    function frame() {
        t += 0.012;
        ctx.fillStyle = '#030608';
        ctx.fillRect(0, 0, W, H);
        layers.forEach(function (l) { drawLayer(l, t); });
        drawRipples();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();

// ============================================================
// Gift Audio Button
// ============================================================
(function () {
    var btn = document.getElementById('gift-btn');
    var audio = document.getElementById('gift-audio');
    var status = document.getElementById('gift-status');

    btn.addEventListener('click', function () {
        if (audio.paused) {
            audio.currentTime = 0;
            audio.play();
            btn.classList.add('playing');
            status.textContent = '▶';
        } else {
            audio.pause();
            audio.currentTime = 0;
            btn.classList.remove('playing');
            status.textContent = '';
        }
    });

    audio.addEventListener('ended', function () {
        btn.classList.remove('playing');
        status.textContent = '';
    });
})();

// ============================================================
// Contact Card Logic
// ============================================================
(function () {
    const overlay = document.getElementById('contact-overlay');
    const openBtn = document.getElementById('contact-btn');
    const closeBtn = document.getElementById('contact-close');

    openBtn.addEventListener('click', function () {
        overlay.classList.add('open');
    });

    closeBtn.addEventListener('click', function () {
        overlay.classList.remove('open');
    });

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') overlay.classList.remove('open');
    });
})();

// ============================================================
// Explore Overlay — Book Page Flip Logic
// ============================================================
(function () {
    const overlay = document.getElementById('explore-overlay');
    const openBtn = document.getElementById('explore-btn');
    const closeBtn = document.getElementById('explore-close');
    const prevBtn = document.getElementById('explore-prev');
    const nextBtn = document.getElementById('explore-next');
    const pages = Array.from(document.querySelectorAll('.explore-page'));
    const TOTAL = pages.length; // 10
    let current = 0;
    let flipping = false;
    let typewriterTimer = null;

    // Typewriter effect
    function typewrite(el) {
        if (typewriterTimer) clearTimeout(typewriterTimer);
        const text = el.dataset.text || '';
        el.innerHTML = '';
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        el.appendChild(cursor);
        let i = 0;
        const speed = 28; // ms per character

        function tick() {
            if (i < text.length) {
                cursor.insertAdjacentText('beforebegin', text[i]);
                i++;
                typewriterTimer = setTimeout(tick, speed);
            }
        }
        typewriterTimer = setTimeout(tick, 120); // slight delay after flip
    }

    function startTypewriterForPage(index) {
        const content = pages[index].querySelector('.page-content');
        if (content) typewrite(content);
    }

    // Open overlay
    openBtn.addEventListener('click', function (e) {
        e.preventDefault();
        overlay.classList.add('open');
        resetToPage(0);
    });

    // Close overlay
    closeBtn.addEventListener('click', function () {
        overlay.classList.remove('open');
    });

    // Click outside the book to close
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    // Escape key to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            overlay.classList.remove('open');
        }
    });

    // Next page
    nextBtn.addEventListener('click', function () {
        if (flipping || current >= TOTAL - 1) return;
        flipTo(current + 1, 'forward');
    });

    // Previous page
    prevBtn.addEventListener('click', function () {
        if (flipping || current <= 0) return;
        flipTo(current - 1, 'backward');
    });

    function flipTo(targetIndex, direction) {
        flipping = true;
        const outPage = pages[current];
        const inPage = pages[targetIndex];

        const outClass = direction === 'forward' ? 'flip-out-fwd' : 'flip-out-back';
        const inClass = direction === 'forward' ? 'flip-in-fwd' : 'flip-in-back';

        // Animate out
        outPage.classList.remove('active');
        outPage.classList.add(outClass);
        outPage.style.opacity = '1';
        outPage.style.pointerEvents = 'none';

        // Animate in
        inPage.classList.add(inClass);
        inPage.style.pointerEvents = 'all';

        // After animation completes
        function onDone() {
            outPage.classList.remove(outClass);
            outPage.style.opacity = '';
            inPage.classList.remove(inClass);
            inPage.classList.add('active');

            current = targetIndex;
            updateArrows();
            flipping = false;
            startTypewriterForPage(current);

            outPage.removeEventListener('animationend', onDone);
        }

        outPage.addEventListener('animationend', onDone);
    }

    function resetToPage(index) {
        pages.forEach(function (p) {
            p.classList.remove('active', 'flip-out-fwd', 'flip-in-fwd', 'flip-out-back', 'flip-in-back');
            p.style.opacity = '';
            p.style.pointerEvents = '';
        });
        pages[index].classList.add('active');
        current = index;
        flipping = false;
        updateArrows();
        startTypewriterForPage(index);
    }

    function updateArrows() {
        prevBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
        nextBtn.style.visibility = current === TOTAL - 1 ? 'hidden' : 'visible';
    }
})();

// ============================================================
// Bento Grid — Animated Counters (trigger on scroll into view)
// ============================================================
(function () {
    var counters = Array.from(document.querySelectorAll('.bento-counter'));
    if (!counters.length) return;

    function animateCounter(el) {
        var target = parseInt(el.dataset.target, 10);
        var duration = 1800;
        var start = null;

        function step(timestamp) {
            if (!start) start = timestamp;
            var elapsed = timestamp - start;
            var progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    counters.forEach(function (counter) {
        observer.observe(counter);
    });
})();
