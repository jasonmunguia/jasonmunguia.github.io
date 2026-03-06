// ============================================================
// Black Water Canvas — realistic wave simulation with specular shading
// ============================================================
(function () {
    var canvas = document.getElementById('water-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;

    var RES = 3;        // grid resolution: lower = finer waves
    var SW = 0, SH = 0;
    var A, B;           // double-buffered height fields

    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    var imgData;

    var mx = -1, my = -1;

    function resize() {
        // Use viewport dimensions — offsetWidth can be 0 before CSS layout completes
        W  = canvas.width  = window.innerWidth;
        H  = canvas.height = window.innerHeight;
        SW = Math.ceil(W / RES);
        SH = Math.ceil(H / RES);
        if (SW < 2 || SH < 2) return;  // guard against zero-size crash
        A  = new Float32Array(SW * SH);
        B  = new Float32Array(SW * SH);
        off.width  = SW;
        off.height = SH;
        imgData = offCtx.createImageData(SW, SH);
        for (var k = 3; k < imgData.data.length; k += 4) imgData.data[k] = 255;
        // Pre-seed so water looks alive the instant the page loads
        var seeds = [0.15,0.30, 0.65,0.18, 0.82,0.62, 0.33,0.74, 0.50,0.44, 0.88,0.32];
        for (var si = 0; si < seeds.length; si += 2) {
            splash((seeds[si] * W / RES) | 0, (seeds[si+1] * H / RES) | 0, 2.2);
        }
    }
    window.addEventListener('resize', resize);
    requestAnimationFrame(resize);

    function onPointer(cx, cy) {
        var r = canvas.getBoundingClientRect();
        mx = ((cx - r.left) / RES) | 0;
        my = ((cy - r.top)  / RES) | 0;
    }
    window.addEventListener('mousemove',  function (e) { onPointer(e.clientX, e.clientY); });
    window.addEventListener('touchmove',  function (e) { onPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('mouseleave', function ()  { mx = -1; my = -1; });

    var COEF = 0.40;    // faster spread so waves fill the screen quickly
    var DAMP = 0.9970;  // high persistence — rings travel far

    function splash(gx, gy, str) {
        gx = gx | 0; gy = gy | 0;
        var r = 3;
        for (var dy = -r; dy <= r; dy++) {
            for (var dx = -r; dx <= r; dx++) {
                var nx = gx + dx, ny = gy + dy;
                if (nx > 0 && nx < SW - 1 && ny > 0 && ny < SH - 1) {
                    var dd = dx * dx + dy * dy;
                    if (dd <= r * r) A[ny * SW + nx] += str * (1 - Math.sqrt(dd) / r);
                }
            }
        }
    }

    // 6 persistent gentle emitters keep the surface alive at all times
    var emitters = [
        { xr: 0.14, yr: 0.26, amp: 1.8, ms: 2100 },
        { xr: 0.70, yr: 0.18, amp: 1.6, ms: 2400 },
        { xr: 0.85, yr: 0.64, amp: 1.9, ms: 1900 },
        { xr: 0.28, yr: 0.72, amp: 1.7, ms: 2300 },
        { xr: 0.50, yr: 0.44, amp: 1.5, ms: 2600 },
        { xr: 0.90, yr: 0.32, amp: 1.6, ms: 2000 },
    ];
    emitters.forEach(function (e, idx) {
        setTimeout(function fire() {
            splash((e.xr * W / RES) | 0, (e.yr * H / RES) | 0, e.amp);
            setTimeout(fire, e.ms);
        }, idx * 380);
    });

    // One slow heavy raindrop every 4 seconds
    setInterval(function () {
        splash(
            (1 + Math.random() * (SW - 2)) | 0,
            (1 + Math.random() * (SH - 2)) | 0,
            3.2
        );
    }, 4000);

    function step() {
        if (mx > 1 && mx < SW - 2 && my > 1 && my < SH - 2) {
            splash(mx, my, 3.0);
        }
        for (var y = 1; y < SH - 1; y++) {
            for (var x = 1; x < SW - 1; x++) {
                var i = y * SW + x;
                B[i] = (
                    A[(y - 1) * SW + x] +
                    A[(y + 1) * SW + x] +
                    A[y * SW + (x - 1)] +
                    A[y * SW + (x + 1)]
                ) * COEF - A[i];
                B[i] *= DAMP;
            }
        }
        var tmp = A; A = B; B = tmp;
    }

    function render() {
        var d = imgData.data;
        var sw = SW, sh = SH;

        for (var y = 0; y < sh; y++) {
            for (var x = 0; x < sw; x++) {
                var i = y * sw + x;
                var h = A[i];

                // Surface gradient → reflective specular shading
                var dhx = (x > 0 && x < sw-1) ? (A[i+1]  - A[i-1])  * 2.0 : 0;
                var dhy = (y > 0 && y < sh-1) ? (A[i+sw] - A[i-sw]) * 2.0 : 0;

                // Primary specular: light from upper-left
                var s1 = Math.max(0, dhx * 0.45 - dhy * 0.52);
                s1 = s1 * s1 * 700;

                // Secondary specular: catches opposite slopes
                var s2 = Math.max(0, -dhx * 0.28 + dhy * 0.20);
                s2 = s2 * s2 * 280;

                // Height mapping: crests brighter, troughs slightly darker but NEVER pure black
                // h > 0: brighter  |  h < 0: slightly dimmer (not black)
                var heightShift = h > 0 ? h * 10 : h * 4;

                // Ambient 32 ensures flat water is always a visible dark grey
                var b = Math.min(255, Math.max(0, 32 + heightShift + s1 + s2));

                var p = i * 4;
                d[p]     = b * 0.86 | 0;   // cool blue-white tint
                d[p + 1] = b * 0.92 | 0;
                d[p + 2] = b         | 0;
            }
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.fillStyle = '#030508';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, 0, 0, W, H);
    }

    function frame() {
        if (!imgData) { requestAnimationFrame(frame); return; }
        step();
        render();
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
