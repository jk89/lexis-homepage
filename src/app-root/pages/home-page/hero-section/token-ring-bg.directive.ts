import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

/**
 * Hero background: the token ring.
 *
 * - The ring is the whole token space, 0000 → FFFF clockwise, labelled
 *   every 0x1000.
 * - It is cut into ranges, each owned by a node. Nodes float in the
 *   middle, laid out by forces: pulled toward the ranges they own, pushed
 *   apart from each other. Each node has a curved edge to the start and
 *   the end of every range it owns. Range boundaries carry their token.
 * - Inside a range, partitions are points on the ring. Each partition's
 *   clustering rows stack outward from it, one tangential line per row.
 *   A row is never wider than the space to its neighbouring partitions,
 *   so stacks never overlap.
 * - Writes add rows. The densest range splits at a token between two of
 *   its partitions and the new half goes to the least loaded node: its
 *   edges fade in there while the old range's end slides to the split.
 *   Quiet neighbours merge the same way in reverse. Nothing pops.
 */

const NODES = 5;
const INITIAL_RANGES = 12;
const MAX_RANGES = 20;
const SPLIT_ROWS = 64;
const ROW_GAP = 3.8;
const MAX_STACK = 24;
const MAX_PARTITIONS = 40;
const MIN_SPACING = 0.013;
const TINTS = ['175,192,209', '142,157,186', '160,138,178', '212,176,230', '226,170,196'];

interface Row { born: number }
interface Partition { pos: number; rows: Row[] }
interface Range {
    start: number;
    owner: number;
    /** Displayed start and end, eased toward the real ones (unwrapped). */
    shownStart: number;
    shownEnd: number;
    born: number;
    dying: number;
}

const hex4 = (f: number): string =>
    Math.floor((((f % 1) + 1) % 1) * 0x10000).toString(16).toUpperCase().padStart(4, '0');

const wrap = (f: number): number => ((f % 1) + 1) % 1;
/** Shortest signed distance from a to b around the ring. */
const delta = (a: number, b: number): number => {
    let d = wrap(b) - wrap(a);
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    return d;
};

@Directive({ selector: '[token-ring-bg]' })
export class TokenRingBg {
    node!: RxElementLike;
    private frame = 0;
    private ro: ResizeObserver | undefined;
    private io: IntersectionObserver | undefined;
    private onMove: ((e: PointerEvent) => void) | undefined;
    private onVisibility: (() => void) | undefined;

    onInit(): void {
        // The directive sits on the <canvas> itself.
        const canvas = this.node as unknown as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let w = 0, h = 0, dpr = 1;
        const resize = (): void => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = canvas.clientWidth; h = canvas.clientHeight;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
        };
        this.ro = new ResizeObserver(resize);
        this.ro.observe(canvas);
        resize();

        let px = 0, py = 0, tx = 0, ty = 0;
        this.onMove = (e: PointerEvent): void => {
            tx = (e.clientX / window.innerWidth - 0.5) * 2;
            ty = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', this.onMove);

        // ---- model -------------------------------------------------------

        let ranges: Range[] = [];
        for (let i = 0; i < INITIAL_RANGES; i++) {
            const start = wrap((i + (Math.random() - 0.5) * 0.5) / INITIAL_RANGES);
            ranges.push({ start, owner: i % NODES, shownStart: start, shownEnd: start, born: -1e9, dying: 0 });
        }
        ranges.sort((a, b) => a.start - b.start);

        const live = (): Range[] => ranges.filter((r) => r.dying === 0);
        const endOf = (r: Range): number => {
            const ls = live();
            const i = ls.indexOf(r);
            const next = ls[(i + 1) % ls.length]!;
            let e = next.start;
            if (e <= r.start) e += 1;
            return e;
        };
        for (const r of ranges) r.shownEnd = endOf(r);

        const partitions: Partition[] = [];
        for (let i = 0; i < 32; i++) {
            const rows: Row[] = Array.from({ length: 2 + Math.floor(Math.random() * 12) }, () => ({ born: -1e9 }));
            partitions.push({ pos: wrap((i + 0.2 + Math.random() * 0.6) / 32), rows });
        }
        partitions.sort((a, b) => a.pos - b.pos);

        const contains = (r: Range, pos: number): boolean => {
            const e = endOf(r);
            const p = pos < r.start ? pos + 1 : pos;
            return p >= r.start && p < e;
        };
        const ownerOf = (pos: number): Range | undefined => live().find((r) => contains(r, pos));
        const partsOf = (r: Range): Partition[] => partitions.filter((p) => contains(r, p.pos));
        const load = (r: Range): number => partsOf(r).reduce((a, p) => a + p.rows.length, 0);

        let hotspot = Math.random();
        const ease = (x: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

        const write = (now: number): void => {
            hotspot = wrap(hotspot + 0.0008);
            const target = wrap(hotspot + (Math.random() - 0.5) * 0.24);
            let best = partitions[0]!, bd = 2;
            for (const p of partitions) {
                const d = Math.abs(delta(p.pos, target));
                if (d < bd) { bd = d; best = p; }
            }
            if (bd > MIN_SPACING * 1.5 && Math.random() < 0.25) {
                // A new partition key, only where there is room for its stack.
                partitions.push({ pos: target, rows: [{ born: now }] });
                partitions.sort((a, b) => a.pos - b.pos);
                if (partitions.length > MAX_PARTITIONS) {
                    let small = 0;
                    partitions.forEach((p, i) => { if (p.rows.length < partitions[small]!.rows.length) small = i; });
                    partitions.splice(small, 1);
                }
            } else if (best.rows.length < MAX_STACK) {
                best.rows.push({ born: now });
            }
            const old = partitions[Math.floor(Math.random() * partitions.length)]!;
            if (old.rows.length > 2 && Math.random() < 0.6) old.rows.shift();
        };

        const rebalance = (now: number): void => {
            const ls = live();
            const hot = ls.reduce<Range | undefined>((a, r) => (!a || load(r) > load(a) ? r : a), undefined);
            if (hot && load(hot) > SPLIT_ROWS && ls.length < MAX_RANGES) {
                const ps = partsOf(hot);
                if (ps.length >= 2) {
                    const un = (p: number): number => (p < hot.start ? p + 1 : p);
                    ps.sort((a, b) => un(a.pos) - un(b.pos));
                    const k = Math.floor(ps.length / 2);
                    const at = wrap((un(ps[k - 1]!.pos) + un(ps[k]!.pos)) / 2);
                    const loads = Array.from({ length: NODES }, (_, n) =>
                        ls.reduce((a, r) => a + (r.owner === n ? load(r) : 0), 0));
                    loads[hot.owner] = Infinity;
                    const to = loads.indexOf(Math.min(...loads));
                    const end = endOf(hot);
                    // The new range starts life covering its final span; the old one's end slides in.
                    ranges.push({ start: at, owner: to, shownStart: at, shownEnd: end, born: now, dying: 0 });
                    ranges.sort((a, b) => a.start - b.start);
                    return;
                }
            }
            if (ls.length > INITIAL_RANGES && Math.random() < 0.5) {
                // Merge the quietest pair: the second fades out, the first's end slides over it.
                let pick = ls[0]!, pickLoad = Infinity;
                for (let i = 0; i < ls.length; i++) {
                    const next = ls[(i + 1) % ls.length]!;
                    const l = load(ls[i]!) + load(next);
                    if (l < pickLoad) { pickLoad = l; pick = next; }
                }
                pick.dying = now;
            }
        };

        // Force-directed node layout, in units of R around the centre.
        const nodes = Array.from({ length: NODES }, (_, n) => {
            const a = (n / NODES) * Math.PI * 2;
            return { x: Math.cos(a) * 0.3, y: Math.sin(a) * 0.3, vx: 0, vy: 0 };
        });
        const stepForces = (rot: number): void => {
            const ls = live();
            nodes.forEach((nd, n) => {
                let ax = 0, ay = 0, c = 0;
                for (const r of ls) {
                    if (r.owner !== n) continue;
                    const mid = (r.start + endOf(r)) / 2;
                    const a = mid * Math.PI * 2 - Math.PI / 2 + rot;
                    ax += Math.cos(a); ay += Math.sin(a); c++;
                }
                const pull = c ? 0.5 : 0;
                const gx = c ? (ax / c) * pull : 0, gy = c ? (ay / c) * pull : 0;
                nd.vx += (gx - nd.x) * 0.004;
                nd.vy += (gy - nd.y) * 0.004;
                nodes.forEach((o, m) => {
                    if (m === n) return;
                    const dx = nd.x - o.x, dy = nd.y - o.y;
                    const d2 = Math.max(0.004, dx * dx + dy * dy);
                    nd.vx += (dx / d2) * 0.00045;
                    nd.vy += (dy / d2) * 0.00045;
                });
                const r = Math.hypot(nd.x, nd.y);
                if (r > 0.55) { nd.vx -= nd.x * (r - 0.55) * 0.05; nd.vy -= nd.y * (r - 0.55) * 0.05; }
                nd.vx *= 0.72; nd.vy *= 0.72;
                nd.x += nd.vx; nd.y += nd.vy;
            });
        };

        // ---- render ------------------------------------------------------

        let lastWrite = 0, lastBalance = 0, lastNow = performance.now();
        const start = performance.now();

        const draw = (now: number): void => {
            const t = (now - start) / 1000;
            const dt = Math.min(0.05, (now - lastNow) / 1000);
            lastNow = now;
            if (!reduced && now - lastWrite > 90) { lastWrite = now; write(now); }
            if (!reduced && now - lastBalance > 1900) { lastBalance = now; rebalance(now); }
            ranges = ranges.filter((r) => r.dying === 0 || now - r.dying < 1000);

            // Ease the shown span of every live range toward its real span.
            const k = 1 - Math.pow(0.02, dt);
            for (const r of live()) {
                r.shownStart += delta(r.shownStart, r.start) * k;
                const e = endOf(r);
                r.shownEnd += delta(r.shownEnd, e) * k;
            }

            px += (tx - px) * 0.04; py += (ty - py) * 0.04;
            const mobile = w < 900;
            const cx = (mobile ? w * 0.5 : w * 0.67) + px * 14;
            const cy = h * 0.55 + py * 10;
            const R = Math.min(mobile ? w * 0.34 : w * 0.28, h * 0.33);
            const rot = reduced ? 0 : t * 0.01;
            const ang = (f: number): number => f * Math.PI * 2 - Math.PI / 2 + rot;
            const at = (f: number, r: number): [number, number] => [cx + Math.cos(ang(f)) * r, cy + Math.sin(ang(f)) * r];
            if (!reduced) stepForces(rot);
            const nodeXY = nodes.map((nd) => [cx + nd.x * R, cy + nd.y * R] as [number, number]);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.globalAlpha = mobile ? 0.45 : 1;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

            // Token scale.
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(240,232,237,0.12)';
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
            for (let i = 0; i < 256; i++) {
                const major = i % 16 === 0;
                const [x1, y1] = at(i / 256, R - (major ? 10 : 4));
                const [x2, y2] = at(i / 256, R);
                ctx.strokeStyle = `rgba(240,232,237,${major ? 0.4 : 0.1})`;
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
            }
            ctx.font = `600 12px 'Ubuntu Mono', ui-monospace, monospace`;
            ctx.fillStyle = 'rgba(240,232,237,0.5)';
            for (let i = 0; i < 16; i++) {
                const [x, y] = at(i / 16, R - 24);
                ctx.fillText(`${i.toString(16).toUpperCase()}000`, x, y);
            }

            // Ranges: arc, boundary token, and two curved edges from the owner.
            for (const rg of ranges) {
                const tint = TINTS[rg.owner]!;
                const appear = ease((now - rg.born) / 900);
                const vanish = rg.dying ? 1 - ease((now - rg.dying) / 1000) : 1;
                const alpha = appear * vanish;
                const s = rg.shownStart;
                let e = rg.shownEnd;
                if (e <= s) e += 1;

                ctx.lineCap = 'butt';
                ctx.lineWidth = 5;
                ctx.strokeStyle = `rgba(${tint},${0.6 * alpha})`;
                ctx.beginPath(); ctx.arc(cx, cy, R + 4, ang(s) + 0.006, ang(e) - 0.006); ctx.stroke();

                const [nx, ny] = nodeXY[rg.owner]!;
                ctx.lineWidth = 1.1;
                ctx.strokeStyle = `rgba(${tint},${0.32 * alpha})`;
                for (const f of [s + 0.003, e - 0.003]) {
                    const [ex, ey] = at(f, R - 52);
                    const mx = (nx + ex) / 2, my = (ny + ey) / 2;
                    const qx = mx + (cx - mx) * 0.3, qy = my + (cy - my) * 0.3;
                    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(qx, qy, ex, ey); ctx.stroke();
                }

                const [bx1, by1] = at(s, R - 52);
                const [bx2, by2] = at(s, R + 9);
                ctx.strokeStyle = `rgba(255,255,255,${0.5 * alpha})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
                const [lx, ly] = at(s, R - 40);
                ctx.font = `700 11px 'Ubuntu Mono', ui-monospace, monospace`;
                ctx.fillStyle = `rgba(${tint},${0.95 * alpha})`;
                ctx.fillText(hex4(s), lx, ly);
            }

            // Partitions and their rows, stacked outward, never wider than the gap to their neighbours.
            partitions.forEach((p, i) => {
                const prev = partitions[(i - 1 + partitions.length) % partitions.length]!;
                const next = partitions[(i + 1) % partitions.length]!;
                const room = Math.min(Math.abs(delta(prev.pos, p.pos)), Math.abs(delta(p.pos, next.pos)));
                const half = Math.min(0.011, room * 0.42) * Math.PI * 2;
                const a = ang(p.pos);
                const tint = TINTS[ownerOf(p.pos)?.owner ?? 0]!;
                p.rows.forEach((row, j) => {
                    const grow = ease((now - row.born) / 500);
                    const glow = 1 - ease((now - row.born) / 1500);
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = glow > 0.01
                        ? `rgba(255,255,255,${(0.4 + 0.55 * glow) * grow})`
                        : `rgba(${tint},${0.62 - j * 0.012})`;
                    ctx.beginPath(); ctx.arc(cx, cy, R + 14 + j * ROW_GAP, a - half * grow, a + half * grow); ctx.stroke();
                });
                const [dx, dy] = at(p.pos, R + 4);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, Math.PI * 2); ctx.fill();
            });

            // Nodes: a soft glow and a dot, in their own tint.
            nodeXY.forEach(([x, y], n) => {
                const tint = TINTS[n]!;
                const g = ctx.createRadialGradient(x, y, 0, x, y, 30);
                g.addColorStop(0, `rgba(${tint},0.5)`); g.addColorStop(1, `rgba(${tint},0)`);
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = `rgba(${tint},1)`;
                ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
            });

            ctx.globalAlpha = 1;
            if (!reduced && running) this.frame = requestAnimationFrame(draw);
        };

        // Only draw while the ring is on screen and the tab is visible: no frames spent off-screen.
        let running = false;
        let onScreen = false;
        const update = (): void => {
            const should = onScreen && document.visibilityState === 'visible';
            if (should === running) return;
            running = should;
            if (running) {
                lastNow = performance.now();
                this.frame = requestAnimationFrame(draw);
            } else {
                cancelAnimationFrame(this.frame);
            }
        };
        this.io = new IntersectionObserver(([e]) => { onScreen = !!e?.isIntersecting; update(); });
        this.io.observe(canvas);
        this.onVisibility = update;
        document.addEventListener('visibilitychange', this.onVisibility);
        if (reduced) this.frame = requestAnimationFrame(draw);
    }

    onDestroy(): void {
        cancelAnimationFrame(this.frame);
        this.ro?.disconnect();
        this.io?.disconnect();
        if (this.onMove) window.removeEventListener('pointermove', this.onMove);
        if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
    }
}
