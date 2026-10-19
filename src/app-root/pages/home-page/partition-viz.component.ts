import { combineLatest, interval, map, Subject, takeUntil, type Observable, type Subscription } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { Flip } from '../../directives/flip.directive.js';
import styles from './partition-viz.component.css';

/**
 * Hash versus order. Twelve user_orders keys placed on three nodes, first
 * the way Murmur3 places them (by a hash of the whole key), then the way
 * Lexis does (by the key itself, cut into tablets). A query on the user
 * highlights its matches: scattered over every node in one mode, one
 * contiguous range in the other.
 */

type Mode = 'murmur' | 'lexis';

// (user_id, order_id) keys, in key order.
const KEYS = [
    'u1/o1', 'u1/o2',
    'u42/o100', 'u42/o101', 'u42/o250',
    'u5/o3', 'u5/o9',
    'u7/o5', 'u7/o6',
    'u9/o2', 'u9/o4', 'u9/o8',
];

const userOf = (key: string): string => key.split('/')[0]!;
const USERS = [...new Set(KEYS.map(userOf))];

// Ring order under Murmur3: index into KEYS for each of the 12 slots,
// four slots per node. Hash order has nothing to do with key order.
const MURMUR_SLOTS = [3, 10, 6, 0, 8, 2, 11, 5, 1, 9, 4, 7];

const NODES = 3;
const SLOTS_PER_NODE = 4;
const TABLET_SIZE = 2;

const QUERIES: readonly { label: string; matches: (user: string) => boolean }[] = [
    { label: `user_id = 'u42'`, matches: (u) => u === 'u42' },
    { label: `user_id >= 'u5' AND user_id < 'u8'`, matches: (u) => u >= 'u5' && u < 'u8' },
    { label: `user_id = 'u9'`, matches: (u) => u === 'u9' },
];

/** Global slot index (node * SLOTS_PER_NODE + row) for each key, per mode. */
const slotFor = (mode: Mode, keyIndex: number): number => {
    if (mode === 'murmur') return MURMUR_SLOTS.indexOf(keyIndex);
    const tablet = Math.floor(keyIndex / TABLET_SIZE);
    const node = tablet % NODES;
    const pair = Math.floor(tablet / NODES);
    return node * SLOTS_PER_NODE + pair * TABLET_SIZE + (keyIndex % TABLET_SIZE);
};

/** Grid position classes for a global slot index. */
const place = (slot: number): string =>
    `col-${String(Math.floor(slot / SLOTS_PER_NODE))} row-${String(slot % SLOTS_PER_NODE)}`;

const hitsFor = (queryIndex: number): boolean[] =>
    KEYS.map((k) => QUERIES[queryIndex]!.matches(userOf(k)));

const hitTablets = (hits: readonly boolean[]): Set<number> => {
    const set = new Set<number>();
    hits.forEach((h, i) => { if (h) set.add(Math.floor(i / TABLET_SIZE)); });
    return set;
};

const NODE_VIEWS = Array.from({ length: NODES }, (_, n) => ({ id: n, num: String(n + 1) }));

const MODES: readonly Mode[] = ['murmur', 'lexis'];

const verdictFor = (mode: Mode, queryIndex: number): string => {
    const hits = hitsFor(queryIndex);
    const count = hits.filter(Boolean).length;
    if (mode === 'murmur') {
        const nodes = new Set<number>();
        hits.forEach((h, i) => { if (h) nodes.add(Math.floor(slotFor('murmur', i) / SLOTS_PER_NODE)); });
        return `Hashed by the whole key: ${String(count)} matches spread over ` +
            `${String(nodes.size)} of ${String(NODES)} nodes.`;
    }
    const n = hitTablets(hits).size;
    return `Ordered by key: ${String(count)} matches in one contiguous range, ` +
        `${String(n)} adjacent tablet${n === 1 ? '' : 's'}, read in key order.`;
};

@Component({
    selector: 'partition-viz',
    directives: [RxFor, Flip],
    template: `
        <div class="controls">
            <div class="seg">
                <button [class.on]="isMode('murmur')" onclick="setMurmur">Hashed · Murmur3</button>
                <button [class.on]="isMode('lexis')" onclick="setLexis">Ordered · Lexis</button>
            </div>
            <div class="queries">
                <span class="qlabel">WHERE</span>
                <span class="query-list" rx-for="q of queryViews by i"><button class="q" [class.on]="q.on" onclick="setQuery(q.i)">{{q.label}}</button></span>
            </div>
        </div>
        <div class="stage" [class.lexis]="isMode('lexis')">
            <div class="nodes" rx-for="n of nodes by id">
                <div class="node" [class.scan]="isMode('murmur')"><span class="node-label">node <b>{{n.num}}</b></span><div class="slot"></div><div class="slot"></div><div class="slot"></div><div class="slot"></div></div>
            </div>
            <div class="frames" rx-for="f of frames by id">
                <div [className]="f.cls"><span class="tl">{{f.label}}</span></div>
            </div>
            <div class="chips" rx-for="c of chips by id" flip="170 22 0.9 0.025">
                <div [className]="c.cls"><i></i>{{c.key}}</div>
            </div>
        </div>
        <div class="verdict" [class.bad]="isMode('murmur')">
            <span class="dot"></span><span class="texts" rx-for="v of verdicts by id"><span [class.on]="v.on">{{v.text}}</span></span>
        </div>
    `,
    styles,
})
export class PartitionViz extends RxElement {
    @state mode: Mode = 'murmur';
    @state queryIndex = 0;
    readonly nodes = NODE_VIEWS;
    private readonly stopAuto = new Subject<void>();
    private auto: Subscription | undefined;

    get queryViews$(): Observable<readonly { i: number; label: string; on: boolean }[]> {
        return this.queryIndex$.pipe(map((qi) => QUERIES.map((q, i) => ({ i, label: q.label, on: i === qi }))));
    }

    get chips$(): Observable<readonly { id: number; key: string; cls: string }[]> {
        return combineLatest([this.mode$, this.queryIndex$]).pipe(map(([mode, qi]) => {
            const hits = hitsFor(qi);
            return KEYS.map((key, i) => ({
                id: i,
                key: key.replace(/^([^/]+)\/(.+)$/, 'user_id:$1/order_id:$2'),
                cls: `chip tone-${String(USERS.indexOf(userOf(key)) % 3)} ${place(slotFor(mode, i))} ${hits[i] ? 'hit' : 'dim'}`,
            }));
        }));
    }

    get frames$(): Observable<readonly { id: number; label: string; cls: string }[]> {
        return this.queryIndex$.pipe(map((qi) => {
            const hit = hitTablets(hitsFor(qi));
            return Array.from({ length: KEYS.length / TABLET_SIZE }, (_, t) => ({
                id: t,
                label: `tablet ${String(t)}`,
                cls: `tablet ${place(slotFor('lexis', t * TABLET_SIZE))}${hit.has(t) ? ' hit' : ''}`,
            }));
        }));
    }

    /** Every verdict, stacked in one grid cell so the card keeps the height of the longest. */
    get verdicts$(): Observable<readonly { id: string; text: string; on: boolean }[]> {
        return combineLatest([this.mode$, this.queryIndex$]).pipe(map(([mode, qi]) =>
            MODES.flatMap((m) => QUERIES.map((_, i) => ({
                id: `${m}-${String(i)}`,
                text: verdictFor(m, i),
                on: m === mode && i === qi,
            })))));
    }

    override onInit(): void {
        let tick = 0;
        this.auto = interval(3800).pipe(takeUntil(this.stopAuto)).subscribe(() => {
            tick++;
            if (tick % 2 === 0) this.queryIndex = (this.queryIndex + 1) % QUERIES.length;
            this.mode = this.mode === 'murmur' ? 'lexis' : 'murmur';
        });
    }

    override onDestroy(): void {
        this.auto?.unsubscribe();
    }

    isMode(mode: Mode): Observable<boolean> {
        return this.mode$.pipe(map((m) => m === mode));
    }

    setMurmur(): void { this.stopAuto.next(); this.mode = 'murmur'; }
    setLexis(): void { this.stopAuto.next(); this.mode = 'lexis'; }
    setQuery(i: number): void { this.stopAuto.next(); this.queryIndex = i; }
}
