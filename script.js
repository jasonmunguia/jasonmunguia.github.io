// ============================================================
// Black Water Canvas — interference ripple pattern (pixel-based)
// ============================================================
(function () {
    var canvas = document.getElementById('water-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var t = 0;

    // Offscreen canvas rendered at 1/RES resolution then scaled up for smooth blur
    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    var RES = 4;

    // Fixed interference sources — scattered across canvas (relative coords)
    var sources = [
        { xr: 0.12, yr: 0.28, f: 0.038, spd: 1.10, ph: 0.0,  dk: 0.0030 },
        { xr: 0.65, yr: 0.14, f: 0.041, spd: 0.85,  ph: 2.1,  dk: 0.0026 },
        { xr: 0.82, yr: 0.60, f: 0.036, spd: 1.30,  ph: 4.2,  dk: 0.0028 },
        { xr: 0.30, yr: 0.76, f: 0.043, spd: 0.95,  ph: 1.0,  dk: 0.0025 },
        { xr: 0.50, yr: 0.40, f: 0.046, spd: 1.15,  ph: 3.5,  dk: 0.0022 },
        { xr: 0.08, yr: 0.82, f: 0.037, spd: 0.78,  ph: 5.8,  dk: 0.0030 },
        { xr: 0.45, yr: 0.18, f: 0.040, spd: 1.05,  ph: 0.7,  dk: 0.0027 },
        { xr: 0.72, yr: 0.88, f: 0.034, spd: 1.20,  ph: 3.0,  dk: 0.0029 },
    ];

    // Mouse/touch-driven ripple sources
    var mRipples = [];
    var lastX = -1, lastY = -1;

    function addRipple(cx, cy) {
        if (mRipples.length >= 14) return;
        if (Math.abs(cx - lastX) < 8 && Math.abs(cy - lastY) < 8) return;
        mRipples.push({ x: cx, y: cy, age: 0, f: 0.055, spd: 3.2 });
        lastX = cx; lastY = cy;
    }

    window.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        addRipple(e.clientX - r.left, e.clientY - r.top);
    });
    window.addEventListener('touchmove', function (e) {
        var r = canvas.getBoundingClientRect();
        addRipple(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
    }, { passive: true });

    function resize() {
        W = canvas.width = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function frame() {
        t += 0.015;

        // Age out ripples
        for (var ri = mRipples.length - 1; ri >= 0; ri--) {
            mRipples[ri].age++;
            if (mRipples[ri].age > 90) mRipples.splice(ri, 1);
        }

        var sw = Math.ceil(W / RES);
        var sh = Math.ceil(H / RES);
        if (off.width !== sw) off.width = sw;
        if (off.height !== sh) off.height = sh;

        var imageData = offCtx.createImageData(sw, sh);
        var d = imageData.data;

        for (var py = 0; py < sh; py++) {
            for (var px = 0; px < sw; px++) {
                var wx = px * RES;
                var wy = py * RES;
                var h = 0;

                // Fixed sources
                for (var si = 0; si < sources.length; si++) {
                    var s = sources[si];
                    var dx = wx - s.xr * W;
                    var dy = wy - s.yr * H;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    h += Math.sin(dist * s.f - t * s.spd + s.ph) * Math.exp(-dist * s.dk);
                }

                // Mouse ripples
                for (var mi = 0; mi < mRipples.length; mi++) {
                    var mr = mRipples[mi];
                    var mdx = wx - mr.x;
                    var mdy = wy - mr.y;
                    var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                    var mlife = 1 - mr.age / 90;
                    h += Math.sin(mdist * mr.f - t * mr.spd) * Math.exp(-mdist * 0.009) * mlife * 1.6;
                }

                // Map: only highlight bright crests, troughs stay black
                var norm = Math.max(0, Math.min(1, (h + 2) / 4));
                var b = Math.pow(Math.max(0, norm - 0.52) / 0.48, 2.0) * 255;

                var idx = (py * sw + px) * 4;
                d[idx]   = Math.round(b * 0.86);  // slight cool tint
                d[idx+1] = Math.round(b * 0.92);
                d[idx+2] = Math.round(b);
                d[idx+3] = 255;
            }
        }

        offCtx.putImageData(imageData, 0, 0);
        ctx.fillStyle = '#020405';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, 0, 0, W, H);

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
