// Scroll pickers for the money tools (Components/RulerPicker.razor and Components/ValueWheel.razor).
// The ruler and the wheel are native horizontal scrollers with CSS scroll snapping, so touch and trackpads get the
// platform's own momentum; a mouse drags them with a little inertia, a vertical wheel moves them only while they have
// focus (page scrolling is never hijacked), and arrow keys step. Blazor renders the root element and its ARIA
// attributes; everything inside it is built here, and changes are reported as an index through `OnIndexChanged`.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const buzz = () => { try { navigator.vibrate && navigator.vibrate(4); } catch (e) { /* not allowed here */ } };

function attachDrag(track, onSettle) {
    let down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, v = 0, raf = 0;
    const onDown = e => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        cancelAnimationFrame(raf);
        down = true; moved = false; startX = lastX = e.clientX; startLeft = track.scrollLeft; lastT = performance.now(); v = 0;
        track.setPointerCapture(e.pointerId);
    };
    const onMove = e => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 3) { moved = true; track.classList.add('dragging'); }
        if (!moved) return;
        track.scrollLeft = startLeft - dx;
        const t = performance.now();
        v = (lastX - e.clientX) / Math.max(1, t - lastT); lastX = e.clientX; lastT = t;
    };
    const onEnd = () => {
        if (!down) return;
        down = false;
        if (!moved) return;
        track._suppressClick = true;
        let prev = performance.now();
        const glide = now => {
            const dt = now - prev; prev = now;
            track.scrollLeft += v * dt; v *= Math.pow(0.94, dt / 16);
            if (!reduce() && Math.abs(v) > 0.03) raf = requestAnimationFrame(glide);
            else { track.classList.remove('dragging'); onSettle(); }
        };
        raf = requestAnimationFrame(glide);
    };
    track.addEventListener('pointerdown', onDown);
    track.addEventListener('pointermove', onMove);
    track.addEventListener('pointerup', onEnd);
    track.addEventListener('pointercancel', onEnd);
}

function attachWheel(root, track) {
    track.addEventListener('wheel', e => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && root.matches(':focus-within')) {
            e.preventDefault();
            track.scrollLeft += e.deltaY;
        }
    }, { passive: false });
}

function clickGuard(track, fn) {
    return () => {
        if (track._suppressClick) { track._suppressClick = false; return; }
        fn();
    };
}

/** opts: { count, index, spacing, major, shift, labels: [[index, text], ...] } — count is the number of steps (last index);
 *  tick i is tall when (i + shift) is a multiple of major. */
export function initRuler(root, opts, dotnet) {
    dispose(root);
    const n = opts.count;
    const track = document.createElement('div'); track.className = 'pk-track';
    const strip = document.createElement('div'); strip.className = 'pk-strip';
    const labels = new Map(opts.labels || []);
    const ticks = [];
    for (let i = 0; i <= n; i++) {
        const t = document.createElement('span');
        t.className = 'pk-tick' + ((i + (opts.shift || 0)) % opts.major === 0 ? ' major' : '');
        t.appendChild(document.createElement('i'));
        if (labels.has(i)) { const b = document.createElement('b'); b.textContent = labels.get(i); t.appendChild(b); }
        t.addEventListener('click', clickGuard(track, () => set(i, true)));
        strip.appendChild(t); ticks.push(t);
    }
    const needle = document.createElement('div'); needle.className = 'pk-needle';
    track.appendChild(strip); root.appendChild(track); root.appendChild(needle);
    root.style.setProperty('--sp', opts.spacing + 'px');

    let idx = Math.min(n, Math.max(0, opts.index)), shown = idx, raf = 0, ready = false, dead = false;
    function paint() {
        raf = 0;
        // A frame queued before a rebuild must not read the detached track (its scrollLeft is 0)
        if (dead) return;
        const pos = track.scrollLeft / opts.spacing;
        const from = Math.max(0, Math.floor(pos) - 14), to = Math.min(n, Math.ceil(pos) + 14);
        for (let i = from; i <= to; i++) ticks[i].style.setProperty('--k', Math.max(0, 1 - Math.abs(i - pos) / 6).toFixed(3));
        const now = Math.min(n, Math.max(0, Math.round(pos)));
        if (ready && now !== shown) {
            shown = idx = now;
            buzz();
            dotnet.invokeMethodAsync('OnIndexChanged', now);
        }
    }
    const schedule = () => { if (!raf && !dead) raf = requestAnimationFrame(paint); };
    function set(i, smooth) {
        idx = Math.min(n, Math.max(0, i));
        track.scrollTo({ left: idx * opts.spacing, behavior: smooth && !reduce() ? 'smooth' : 'auto' });
        schedule();
    }
    const settle = () => set(Math.round(track.scrollLeft / opts.spacing), true);
    track.addEventListener('scroll', schedule, { passive: true });
    attachDrag(track, settle);
    attachWheel(root, track);
    const onKey = e => {
        const map = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -opts.major, PageUp: opts.major };
        if (e.key in map) { e.preventDefault(); set(idx + map[e.key], true); }
        else if (e.key === 'Home') { e.preventDefault(); set(0, true); }
        else if (e.key === 'End') { e.preventDefault(); set(n, true); }
    };
    root.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => { track.scrollLeft = idx * opts.spacing; schedule(); });
    ro.observe(track);
    track.scrollLeft = idx * opts.spacing;
    requestAnimationFrame(() => { if (dead) return; track.scrollLeft = idx * opts.spacing; paint(); ready = true; });

    root._pk = {
        // A value set from outside (a preset chip, a language switch) jumps there without reporting back
        set: i => { shown = idx = Math.min(n, Math.max(0, i)); track.scrollLeft = idx * opts.spacing; schedule(); },
        step: d => set(idx + d, true),
        dispose: () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); root.removeEventListener('keydown', onKey); root.replaceChildren(); }
    };
}

export function setRuler(root, index) { root._pk && root._pk.set(index); }
export function stepRuler(root, delta) { root._pk && root._pk.step(delta); }

/** opts: { items: [text, ...], index } */
export function initWheel(root, opts, dotnet) {
    dispose(root);
    const track = document.createElement('div'); track.className = 'pk-track';
    const strip = document.createElement('div'); strip.className = 'pk-strip';
    const items = opts.items.map((txt, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pk-item'; b.textContent = txt; b.tabIndex = -1;
        b.setAttribute('role', 'option');
        b.addEventListener('click', clickGuard(track, () => set(i, true)));
        strip.appendChild(b);
        return b;
    });
    track.appendChild(strip); root.appendChild(track);

    let idx = Math.min(items.length - 1, Math.max(0, opts.index)), shown = idx, raf = 0, ready = false, dead = false;
    const centerOf = el => el.offsetLeft + el.offsetWidth / 2;
    function pad() {
        const w = track.clientWidth;
        strip.style.paddingLeft = Math.max(0, w / 2 - items[0].offsetWidth / 2) + 'px';
        strip.style.paddingRight = Math.max(0, w / 2 - items[items.length - 1].offsetWidth / 2) + 'px';
    }
    function nearest() {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0, bestD = Infinity;
        items.forEach((el, i) => { const d = Math.abs(centerOf(el) - mid); if (d < bestD) { bestD = d; best = i; } });
        return best;
    }
    function paint() {
        raf = 0;
        if (dead) return;
        const mid = track.scrollLeft + track.clientWidth / 2;
        items.forEach(el => el.style.setProperty('--k', Math.max(0, 1 - Math.abs(centerOf(el) - mid) / 160).toFixed(3)));
        const best = nearest();
        items.forEach((el, i) => { el.classList.toggle('on', i === best); el.setAttribute('aria-selected', i === best); });
        if (ready && best !== shown) {
            shown = idx = best;
            buzz();
            dotnet.invokeMethodAsync('OnIndexChanged', best);
        }
    }
    const schedule = () => { if (!raf && !dead) raf = requestAnimationFrame(paint); };
    function set(i, smooth) {
        idx = Math.min(items.length - 1, Math.max(0, i));
        track.scrollTo({ left: centerOf(items[idx]) - track.clientWidth / 2, behavior: smooth && !reduce() ? 'smooth' : 'auto' });
        schedule();
    }
    track.addEventListener('scroll', schedule, { passive: true });
    attachDrag(track, () => set(nearest(), true));
    attachWheel(root, track);
    const onKey = e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(idx - 1, true); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(idx + 1, true); }
    };
    root.addEventListener('keydown', onKey);
    const place = () => { pad(); track.scrollLeft = centerOf(items[idx]) - track.clientWidth / 2; schedule(); };
    const ro = new ResizeObserver(place);
    ro.observe(track);
    place();
    requestAnimationFrame(() => { if (dead) return; place(); paint(); ready = true; });

    root._pk = {
        set: i => { shown = idx = Math.min(items.length - 1, Math.max(0, i)); track.scrollLeft = centerOf(items[idx]) - track.clientWidth / 2; schedule(); },
        step: d => set(idx + d, true),
        dispose: () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); root.removeEventListener('keydown', onKey); root.replaceChildren(); }
    };
}

export function setWheel(root, index) { root._pk && root._pk.set(index); }

export function dispose(root) {
    if (root && root._pk) { root._pk.dispose(); root._pk = null; }
}
