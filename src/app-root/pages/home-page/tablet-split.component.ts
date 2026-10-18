import { BehaviorSubject, EMPTY, interval, switchMap, timer, type Subscription } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { Fall } from '../../directives/fall.directive.js';
import { Pulse } from '../../directives/pulse.directive.js';
import { Hop } from '../../directives/hop.directive.js';
import styles from './tablet-split.component.css';

/**
 * Hot tablets split. Writes rain onto the key space around a drifting
 * hotspot. Each tablet fills as it takes writes; when one runs hot it
 * splits at its midpoint and the load balancer moves one half to the
 * least loaded shard. Illustrative, not a simulation of the real
 * balancer's thresholds.
 */

interface Tablet { id: number; start: number; end: number; shard: number; load: number; hits: number; moves: number }
interface Drop { readonly id: number; readonly x: number; readonly left: string }

const SHARDS = ['node 1 · shard 0', 'node 1 · shard 1', 'node 2 · shard 0', 'node 2 · shard 1'];
const COLORS = ['#afc0d1', '#8e9dba', '#8786b0', '#a08ab2'];
const SPLIT_AT = 16;
const MAX_TABLETS = 10;

const percent = (v: number): string => `${String(v * 100)}%`;

/** The ring's scale laid flat: 257 ticks with a major every 0x1000, labelled between the ends. */
const TICKS = Array.from({ length: 257 }, (_, i) => ({ left: percent(i / 256), major: i % 16 === 0 }));
const LABELS = Array.from({ length: 15 }, (_, n) => ({
    left: percent((n + 1) / 16),
    cls: (n + 1) % 2 === 0 ? 'even' : 'odd',
    text: `${(n + 1).toString(16).toUpperCase()}000`,
}));

@Component({
    selector: 'tablet-split',
    directives: [RxFor, Fall, Pulse, Hop],
    template: `
        <div class="sky" rx-for="d of drops by id">
            <div class="drop" [style.left]="d.left" fall onlanded="land(d.id)"></div>
        </div>
        <div class="bar" rx-for="t of tabletViews by id">
            <div class="tablet" [style]="t.css" [class.hot]="t.hot" pulse="t.hits" hop="t.moves"><div class="fill" [style.height]="t.fill"></div><span class="tag">{{t.tag}}</span></div>
        </div>
        <div class="ruler">
            <div class="ticks" rx-for="tick of ticks"><i [style.left]="tick.left" [class.major]="tick.major"></i></div>
            <div class="labels" rx-for="l of labels"><span [style.left]="l.left" [className]="l.cls">{{l.text}}</span></div>
        </div>
        <div class="shards" rx-for="s of shardViews by id">
            <div class="shard" [style]="s.css"><b><i></i>{{s.name}}</b><div class="meter"><span [style.width]="s.meter"></span></div><small>{{s.count}}</small></div>
        </div>
        <div class="log">{{log}}</div>
    `,
    styles,
})
export class TabletSplit extends RxElement {
    @state log = 'writes arriving…';
    @state drops: readonly Drop[] = [];
    @state tabletViews: readonly unknown[] = [];
    @state shardViews: readonly unknown[] = [];
    readonly ticks = TICKS;
    readonly labels = LABELS;

    private tablets: Tablet[] = [];
    private nextId = 0;
    private hotspot = 0.3;
    private t = 0;
    private splits = 0;
    private readonly visible = new BehaviorSubject(false);
    private readonly subs: Subscription[] = [];
    private io: IntersectionObserver | undefined;

    override onInit(): void {
        this.reset();
        // Only write while the demo is on screen.
        this.io = new IntersectionObserver(([e]) => { this.visible.next(!!e?.isIntersecting); });
        this.io.observe(this);
        this.subs.push(this.visible.pipe(switchMap((v) => (v ? interval(140) : EMPTY))).subscribe(() => this.step()));
    }

    override onDestroy(): void {
        for (const s of this.subs) s.unsubscribe();
        this.io?.disconnect();
    }

    land(id: number): void {
        const drop = this.drops.find((d) => d.id === id);
        this.drops = this.drops.filter((d) => d.id !== id);
        if (drop === undefined) return;
        const t = this.tablets.find((tb) => drop.x >= tb.start && drop.x < tb.end);
        if (!t) return;
        t.load++;
        t.hits++;
        if (t.load >= SPLIT_AT) this.split(t);
        for (const tb of this.tablets) tb.load = Math.max(0, tb.load - 0.04);
        this.render();
    }

    private reset(): void {
        this.tablets = [];
        this.add(0, 0.5, 0, 0);
        this.add(0.5, 1, 2, 0);
        this.render();
    }

    private add(start: number, end: number, shard: number, load: number): Tablet {
        const tablet = { id: this.nextId++, start, end, shard, load, hits: 0, moves: 0 };
        this.tablets.push(tablet);
        return tablet;
    }

    private render(): void {
        this.tabletViews = this.tablets.map((t) => ({
            id: t.id,
            css: `--c: ${COLORS[t.shard]!}; left: ${percent(t.start)}; width: ${percent(t.end - t.start)};`,
            fill: `${String(Math.min(100, (t.load / SPLIT_AT) * 100))}%`,
            hot: t.load > SPLIT_AT * 0.75,
            tag: `n${String((t.shard >> 1) + 1)}·s${String(t.shard & 1)}`,
            hits: t.hits,
            moves: t.moves,
        }));
        const owned = SHARDS.map((_, i) => this.tablets.filter((t) => t.shard === i));
        const max = Math.max(1, ...owned.map((ts) => ts.reduce((a, t) => a + t.load, 0)));
        this.shardViews = SHARDS.map((name, i) => {
            const ts = owned[i]!;
            const sum = ts.reduce((a, t) => a + t.load, 0);
            return {
                id: i,
                name,
                css: `--c: ${COLORS[i]!};`,
                meter: percent(sum / max),
                count: `${String(ts.length)} tablet${ts.length === 1 ? '' : 's'}`,
            };
        });
    }

    private step(): void {
        this.t++;
        this.hotspot = 0.5 + 0.38 * Math.sin(this.t / 90);
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
        const x = Math.min(0.999, Math.max(0, this.hotspot + g * 0.7));
        this.drops = [...this.drops, { id: this.nextId++, x, left: percent(x) }];
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
        const source = t.shard;
        this.subs.push(timer(380).subscribe(() => {
            right.shard = target;
            right.moves++;
            this.render();
        }));
        const hex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase();
        this.log = `split [${hex(t.start)}, ${hex(right.end)}) at ${hex(mid)} → migrate [${hex(mid)}, ${hex(right.end)}) ` +
            `from ${SHARDS[source]!} to ${SHARDS[target]!}`;
    }
}
