import { animate } from 'motion';
import { Component, RxElement, state } from '@yaw-rx/core';

/**
 * Hot tablets split. Writes rain onto the key space around a drifting
 * hotspot. Each tablet fills as it takes writes; when one runs hot it
 * splits at its midpoint and the load balancer moves one half to the
 * least loaded shard. Illustrative, not a simulation of the real
 * balancer's thresholds.
 */

interface Tablet { start: number; end: number; shard: number; load: number; el: HTMLElement }

const SHARDS = ['node 1 · shard 0', 'node 1 · shard 1', 'node 2 · shard 0', 'node 2 · shard 1'];
const COLORS = ['#afc0d1', '#8e9dba', '#8786b0', '#a08ab2'];
const SPLIT_AT = 16;
const MAX_TABLETS = 10;

@Component({
    selector: 'tablet-split',
    template: `
        <div class="sky"></div>
        <div class="bar"></div>
        <div class="ruler"></div>
        <div class="shards"></div>
        <div class="log">{{log}}</div>
    `,
    styles: `
        :host { display: block; position: relative; }
        /* The ring's scale, laid flat under the bar: 256 ticks, a labelled major every 0x1000. */
        :host > .ruler { position: relative; height: 1.5rem; margin-top: 3px; }
        .ruler > i { position: absolute; top: 0; width: 1px; height: 4px; margin-left: -0.5px;
                     background: rgba(240,232,237,0.22); }
        .ruler > i.major { height: 9px; background: rgba(240,232,237,0.55); }
        .ruler > span { position: absolute; top: 12px; transform: translateX(-50%);
                        font-family: var(--font-mono); font-size: 0.68rem; line-height: 1;
                        font-weight: 400; letter-spacing: 0; color: var(--dim); white-space: nowrap; }
        .sky { position: relative; height: 70px; }
        .drop { position: absolute; top: 0; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%;
                background: var(--accent); box-shadow: 0 0 10px var(--accent); }
        .bar { position: relative; height: 64px; border-radius: 10px;
               background: rgba(0,0,0,0.25); border: var(--border-width) solid rgba(255,255,255,0.08); }
        .tablet { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; overflow: hidden;
                  background: rgba(255,255,255,0.05); border: 1.5px solid var(--c);
                  transition: left 0.6s cubic-bezier(0.22,1,0.36,1), width 0.6s cubic-bezier(0.22,1,0.36,1),
                              border-color 0.6s; }
        .tablet .fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0%;
                        background: linear-gradient(0deg, var(--c), transparent); opacity: 0.55;
                        transition: height 0.25s ease; }
        .tablet.hot { box-shadow: 0 0 24px -4px rgba(227,168,199,0.8); border-color: var(--rose); }
        .tablet .tag { position: absolute; left: 6px; top: 4px; font-family: var(--font-mono);
                       font-size: 0.6rem; color: var(--text); opacity: 0.8; white-space: nowrap; }
        .shards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; margin-top: 1rem; }
        .shard { border-radius: var(--radius); padding: 0.55rem 0.7rem; font-size: 0.72rem;
                 background: rgba(255,255,255,0.03); border: var(--border-width) solid rgba(255,255,255,0.07);
                 color: var(--muted); display: flex; flex-direction: column; gap: 0.35rem; }
        .shard b { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; color: var(--secondary); }
        .shard b i { width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
        .meter { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); overflow: hidden; }
        .meter span { display: block; height: 100%; width: 0%; background: var(--c); transition: width 0.4s; }
        .log { margin-top: 0.9rem; font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent);
               min-height: 1.2rem; }
        @media (max-width: 640px) {
            .shards { grid-template-columns: repeat(2, 1fr); }
            .ruler > span.odd { display: none; }
            .tablet .tag { display: none; }
        }
    `,
})
export class TabletSplit extends RxElement {
    @state log = 'writes arriving…';
    private tablets: Tablet[] = [];
    private bar!: HTMLElement;
    private sky!: HTMLElement;
    private meters: HTMLElement[] = [];
    private counts: HTMLElement[] = [];
    private timer = 0;
    private hotspot = 0.3;
    private t = 0;
    private splits = 0;
    private visible = false;
    private io: IntersectionObserver | undefined;

    override onInit(): void {
        this.bar = this.querySelector('.bar')!;
        this.sky = this.querySelector('.sky')!;
        const ruler = this.querySelector('.ruler')!;
        for (let i = 0; i <= 256; i++) {
            const tick = document.createElement('i');
            tick.style.left = `${String((i / 256) * 100)}%`;
            if (i % 16 === 0) tick.className = 'major';
            ruler.appendChild(tick);
            if (i % 16 === 0 && i > 0 && i < 256) {
                const label = document.createElement('span');
                label.style.left = `${String((i / 256) * 100)}%`;
                label.className = (i / 16) % 2 === 0 ? 'even' : 'odd';
                label.textContent = `${(i / 16).toString(16).toUpperCase()}000`;
                ruler.appendChild(label);
            }
        }
        const shardsEl = this.querySelector('.shards')!;
        SHARDS.forEach((name, i) => {
            const s = document.createElement('div');
            s.className = 'shard';
            s.style.setProperty('--c', COLORS[i]!);
            s.innerHTML = `<b><i></i>${name}</b><div class="meter"><span></span></div><small>0 tablets</small>`;
            shardsEl.appendChild(s);
            this.meters.push(s.querySelector('.meter span')!);
            this.counts.push(s.querySelector('small')!);
        });
        this.reset();
        this.io = new IntersectionObserver(([e]) => { this.visible = !!e?.isIntersecting; });
        this.io.observe(this);
        this.timer = window.setInterval(() => { if (this.visible) this.step(); }, 140);
    }

    override onDestroy(): void {
        clearInterval(this.timer);
        this.io?.disconnect();
    }

    private reset(): void {
        for (const t of this.tablets) t.el.remove();
        this.tablets = [];
        this.add(0, 0.5, 0, 0);
        this.add(0.5, 1, 2, 0);
        this.render();
    }

    private add(start: number, end: number, shard: number, load: number): Tablet {
        const el = document.createElement('div');
        el.className = 'tablet';
        el.innerHTML = '<div class="fill"></div><span class="tag"></span>';
        this.bar.appendChild(el);
        const tablet = { start, end, shard, load, el };
        this.tablets.push(tablet);
        return tablet;
    }

    private render(): void {
        for (const t of this.tablets) {
            t.el.style.left = `${String(t.start * 100)}%`;
            t.el.style.width = `${String((t.end - t.start) * 100)}%`;
            t.el.style.setProperty('--c', COLORS[t.shard]!);
            (t.el.firstElementChild as HTMLElement).style.height = `${String(Math.min(100, (t.load / SPLIT_AT) * 100))}%`;
            t.el.classList.toggle('hot', t.load > SPLIT_AT * 0.75);
            (t.el.lastElementChild as HTMLElement).textContent = `n${String((t.shard >> 1) + 1)}·s${String(t.shard & 1)}`;
        }
        const loads = SHARDS.map((_, i) => this.tablets.filter((t) => t.shard === i));
        const max = Math.max(1, ...loads.map((ts) => ts.reduce((a, t) => a + t.load, 0)));
        loads.forEach((ts, i) => {
            const sum = ts.reduce((a, t) => a + t.load, 0);
            this.meters[i]!.style.width = `${String((sum / max) * 100)}%`;
            this.counts[i]!.textContent = `${String(ts.length)} tablet${ts.length === 1 ? '' : 's'}`;
        });
    }

    private step(): void {
        this.t++;
        this.hotspot = 0.5 + 0.38 * Math.sin(this.t / 90);
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
        const x = Math.min(0.999, Math.max(0, this.hotspot + g * 0.35));
        this.drop(x);
    }

    private drop(x: number): void {
        const d = document.createElement('div');
        d.className = 'drop';
        d.style.left = `${String(x * 100)}%`;
        this.sky.appendChild(d);
        const fall = this.sky.offsetHeight + 18;
        void animate(d, { y: [0, fall], opacity: [0, 1, 1, 0] }, { duration: 0.55, ease: 'easeIn' })
            .then(() => {
                d.remove();
                const t = this.tablets.find((tb) => x >= tb.start && x < tb.end);
                if (!t) return;
                t.load++;
                animate(t.el, { scaleY: [1.08, 1] }, { type: 'spring', stiffness: 500, damping: 15 });
                if (t.load >= SPLIT_AT) this.split(t);
                this.decay();
                this.render();
            });
    }

    private decay(): void {
        for (const t of this.tablets) t.load = Math.max(0, t.load - 0.04);
    }

    private split(t: Tablet): void {
        if (this.tablets.length >= MAX_TABLETS) {
            this.log = 'cycle complete, starting over';
            this.reset();
            return;
        }
        const mid = (t.start + t.end) / 2;
        const sums = SHARDS.map((_, i) => this.tablets.filter((x) => x.shard === i).reduce((a, x) => a + x.load, 0));
        sums[t.shard] = (sums[t.shard] ?? 0) + 1e6;
        // Every other split sends its half across to the other node.
        this.splits++;
        if (this.splits % 2 === 0) {
            sums.forEach((_, i) => { if (i >> 1 === t.shard >> 1) sums[i] = Infinity; });
        }
        const target = sums.indexOf(Math.min(...sums));
        const right = this.add(mid, t.end, t.shard, t.load / 2);
        t.end = mid;
        t.load /= 2;
        this.render();
        const source = t.shard;
        window.setTimeout(() => {
            right.shard = target;
            this.render();
            animate(right.el, { y: [0, 14, 0] }, { duration: 0.5 });
        }, 380);
        const hex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
        this.log = `split [${hex(t.start)}, ${hex(right.end)}) at ${hex(mid)} → migrate [${hex(mid)}, ${hex(right.end)}) ` +
            `from ${SHARDS[source]!} to ${SHARDS[target]!}`;
    }
}
