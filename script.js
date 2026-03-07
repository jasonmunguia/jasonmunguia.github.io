// ============================================================
// Black Water Canvas — realistic ripple simulation with specular shading
// ============================================================
(function () {
    var canvas = document.getElementById('water-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;

    // RES=3: simulation grid 1/3 of screen, scaled up smoothly
    var RES = 3;
    var SW = 0, SH = 0;
    // A = current frame, B = previous frame (classic double-buffer wave eq)
    var A, B;

    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    var imgData;

    // Mouse state — track velocity so we only splash on movement
    var mx = -1, my = -1, pmx = -1, pmy = -1;

    function resize() {
        W  = canvas.width  = window.innerWidth;
        H  = canvas.height = window.innerHeight;
        SW = Math.ceil(W / RES);
        SH = Math.ceil(H / RES);
        if (SW < 2 || SH < 2) return;
        A = new Float32Array(SW * SH);
        B = new Float32Array(SW * SH);
        off.width  = SW;
        off.height = SH;
        imgData = offCtx.createImageData(SW, SH);
        for (var k = 3; k < imgData.data.length; k += 4) imgData.data[k] = 255;
        // Pre-seed several points so rings are visible the instant page loads
        var seeds = [0.18,0.28, 0.63,0.16, 0.83,0.64, 0.36,0.77,
                     0.52,0.43, 0.77,0.33, 0.24,0.57, 0.46,0.88];
        for (var si = 0; si < seeds.length; si += 2) {
            splash((seeds[si] * SW) | 0, (seeds[si+1] * SH) | 0, 2.8);
        }
    }
    window.addEventListener('resize', resize);
    requestAnimationFrame(resize);

    function onPointer(cx, cy) {
        var r = canvas.getBoundingClientRect();
        var nx = ((cx - r.left) / RES) | 0;
        var ny = ((cy - r.top)  / RES) | 0;
        if (pmx >= 0 && SW > 0) {
            var dx = nx - pmx, dy = ny - pmy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0.4) {
                // Gentle interpolated trail — soft swell, not a jarring splash
                var steps = Math.min(Math.ceil(dist / 2), 5);
                var str = Math.min(dist * 0.16, 1.8);
                for (var s = 1; s <= steps; s++) {
                    var t = s / steps;
                    splash((pmx + dx * t) | 0, (pmy + dy * t) | 0, str * t);
                }
            }
        }
        pmx = mx = nx;
        pmy = my = ny;
    }
    window.addEventListener('mousemove',  function (e) { onPointer(e.clientX, e.clientY); });
    window.addEventListener('touchmove',  function (e) { onPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('mouseleave', function ()  { mx = pmx = -1; my = pmy = -1; });

    // COEF = 0.47: near maximum propagation → rings spread fully across screen
    // DAMP = 0.986: slightly faster fade so cursor wake doesn't linger
    var COEF = 0.47;
    var DAMP = 0.9860;

    function splash(gx, gy, str) {
        gx = gx | 0; gy = gy | 0;
        var r = 4;
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

    // 7 ambient emitters keep the surface alive with slow, organic ripples
    var emitters = [
        { xr: 0.13, yr: 0.23, amp: 1.6, ms: 3100 },
        { xr: 0.73, yr: 0.17, amp: 1.4, ms: 3400 },
        { xr: 0.86, yr: 0.66, amp: 1.7, ms: 2900 },
        { xr: 0.29, yr: 0.78, amp: 1.5, ms: 3200 },
        { xr: 0.51, yr: 0.44, amp: 1.3, ms: 3600 },
        { xr: 0.21, yr: 0.54, amp: 1.5, ms: 3000 },
        { xr: 0.67, yr: 0.83, amp: 1.6, ms: 3300 },
    ];
    emitters.forEach(function (e, idx) {
        setTimeout(function fire() {
            if (SW > 0) splash((e.xr * SW) | 0, (e.yr * SH) | 0, e.amp);
            setTimeout(fire, e.ms);
        }, idx * 480);
    });

    // One raindrop every 5 seconds
    setInterval(function () {
        if (SW > 0)
            splash((1 + Math.random() * (SW - 2)) | 0, (1 + Math.random() * (SH - 2)) | 0, 3.2);
    }, 5000);

    function step() {
        // Classic 2-buffer wave equation: next = (4-neighbors * COEF) - prev
        // A = current, B = previous; result written into B, then swapped
        for (var y = 1; y < SH - 1; y++) {
            for (var x = 1; x < SW - 1; x++) {
                var i = y * SW + x;
                B[i] = (
                    A[(y-1)*SW+x] + A[(y+1)*SW+x] +
                    A[y*SW+(x-1)] + A[y*SW+(x+1)]
                ) * COEF - B[i];
                B[i] *= DAMP;
            }
        }
        var tmp = A; A = B; B = tmp;
    }

    function render() {
        var d = imgData.data;
        var sw = SW, sh = SH;
        for (var y = 1; y < sh - 1; y++) {
            for (var x = 1; x < sw - 1; x++) {
                var i = y * sw + x;
                var dhx = A[i+1]  - A[i-1];
                var dhy = A[i+sw] - A[i-sw];

                // 4 directional specular lobes so water shimmers from all angles —
                // rings are visible regardless of which way they travel
                var s1 = dhx * 0.62 - dhy * 0.72;   // upper-left  (primary)
                s1 = s1 > 0 ? s1 * s1 * 360 : 0;

                var s2 = -dhx * 0.62 - dhy * 0.72;  // upper-right
                s2 = s2 > 0 ? s2 * s2 * 280 : 0;

                var s3 = -dhx * 0.40 + dhy * 0.32;  // lower-right (fill)
                s3 = s3 > 0 ? s3 * s3 * 130 : 0;

                var s4 = dhx * 0.40 + dhy * 0.32;   // lower-left  (fill)
                s4 = s4 > 0 ? s4 * s4 * 90 : 0;

                // Ambient radial gradient: simulates diffuse sky reflection
                // Center-top of screen gets ~28 brightness, edges get ~10
                // This makes flat water look like dark water, not a void
                var distX = x / sw - 0.50;
                var distY = y / sh - 0.30;
                var ambient = 28 - (distX * distX + distY * distY) * 120;
                if (ambient < 10) ambient = 10;

                var b = Math.min(255, ambient + s1 + s2 + s3 + s4);
                var p = i * 4;
                d[p]   = b * 0.82 | 0;
                d[p+1] = b * 0.91 | 0;
                d[p+2] = b        | 0;
            }
        }
        offCtx.putImageData(imgData, 0, 0);
        ctx.fillStyle = '#020406';
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
            } else {
                // After typing completes, apply any embedded hyperlinks
                const linksJson = el.dataset.links;
                if (linksJson) {
                    try {
                        const links = JSON.parse(linksJson);
                        cursor.remove();
                        let html = el.textContent;
                        Object.keys(links).forEach(function (word) {
                            html = html.replace(word, '<a href="' + links[word] + '" target="_blank" rel="noopener noreferrer" class="page-link">' + word + '</a>');
                        });
                        el.innerHTML = html;
                    } catch (e) { /* malformed JSON — leave as-is */ }
                }
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
// Hero Title — Typewriter effect
// ============================================================
(function () {
    var el = document.querySelector('.hero-title[data-typewriter]');
    if (!el) return;
    var text = el.dataset.typewriter;
    el.textContent = '';
    var i = 0;
    function tick() {
        if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(tick, 110);
        }
    }
    setTimeout(tick, 500); // wait for page fade-in
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
