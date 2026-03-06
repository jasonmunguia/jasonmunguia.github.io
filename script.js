// ============================================================
// Black Water Canvas — physics wave simulation
// ============================================================
(function () {
    var canvas = document.getElementById('water-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;

    // Simulation grid — render at reduced resolution, scale up
    var RES = 4;
    var SW = 0, SH = 0;
    var A, B; // double-buffered height fields (Float32Array)

    // Offscreen canvas for pixel output
    var off = document.createElement('canvas');
    var offCtx = off.getContext('2d');
    var imgData;

    // Current mouse/touch position in grid coords
    var mx = -1, my = -1;

    function resize() {
        W  = canvas.width  = canvas.offsetWidth;
        H  = canvas.height = canvas.offsetHeight;
        SW = Math.ceil(W / RES);
        SH = Math.ceil(H / RES);
        A  = new Float32Array(SW * SH);
        B  = new Float32Array(SW * SH);
        off.width  = SW;
        off.height = SH;
        imgData = offCtx.createImageData(SW, SH);
        // Pre-fill alpha channel
        for (var i = 3; i < imgData.data.length; i += 4) imgData.data[i] = 255;
    }
    resize();
    window.addEventListener('resize', resize);

    // Track pointer continuously — no threshold, no discrete events
    function onPointer(cx, cy) {
        var r = canvas.getBoundingClientRect();
        mx = ((cx - r.left) / RES) | 0;
        my = ((cy - r.top)  / RES) | 0;
    }
    window.addEventListener('mousemove', function (e) { onPointer(e.clientX, e.clientY); });
    window.addEventListener('touchmove', function (e) { onPointer(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    window.addEventListener('mouseleave', function () { mx = -1; my = -1; });

    // Add a disturbance splash at grid coords
    function splash(gx, gy, strength) {
        gx = gx | 0; gy = gy | 0;
        for (var dy = -2; dy <= 2; dy++) {
            for (var dx = -2; dx <= 2; dx++) {
                var nx = gx + dx, ny = gy + dy;
                if (nx > 0 && nx < SW - 1 && ny > 0 && ny < SH - 1) {
                    var dist = Math.sqrt(dx*dx + dy*dy);
                    A[ny * SW + nx] += strength * Math.max(0, 1 - dist / 2.5);
                }
            }
        }
    }

    // Ambient rain drops — random positions, random cadence
    setInterval(function () {
        var n = 1 + Math.random() * 2 | 0;
        for (var i = 0; i < n; i++) {
            splash(
                1 + (Math.random() * (SW - 2)) | 0,
                1 + (Math.random() * (SH - 2)) | 0,
                0.8 + Math.random() * 1.4
            );
        }
    }, 180);

    var DAMP = 0.991;

    function step() {
        // Cursor disturbance — applied every physics step for smooth tracking
        if (mx > 0 && mx < SW - 1 && my > 0 && my < SH - 1) {
            splash(mx, my, 2.5);
        }

        // Wave equation: buf2 = (neighbors_sum / 2) - buf1,  then damp
        for (var y = 1; y < SH - 1; y++) {
            for (var x = 1; x < SW - 1; x++) {
                var i = y * SW + x;
                B[i] = (
                    A[(y - 1) * SW + x] +
                    A[(y + 1) * SW + x] +
                    A[y * SW + (x - 1)] +
                    A[y * SW + (x + 1)]
                ) * 0.5 - B[i];
                B[i] *= DAMP;
            }
        }
        // Swap buffers
        var tmp = A; A = B; B = tmp;
    }

    function render() {
        var d = imgData.data;
        for (var i = 0, n = SW * SH; i < n; i++) {
            var h = A[i];
            // Only bright crests become visible — troughs stay black
            var b = h > 0 ? Math.min(255, Math.pow(h / 3.0, 1.6) * 280) : 0;
            var p = i * 4;
            d[p]     = b * 0.87 | 0;  // slight cool-white tint
            d[p + 1] = b * 0.93 | 0;
            d[p + 2] = b         | 0;
        }
        offCtx.putImageData(imgData, 0, 0);

        ctx.fillStyle = '#020405';
        ctx.fillRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(off, 0, 0, W, H);
    }

    function frame() {
        step();
        step(); // 2 physics steps per render — waves travel faster, look more natural
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
