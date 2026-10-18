import { animate } from 'motion';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';

/**
 * Hash versus order. Twelve document paths placed on three nodes, first
 * the way Murmur3 places them (by a hash of the whole path), then the way
 * Lexis does (by the path itself, cut into tablets). A prefix query
 * highlights its matches: scattered over every node in one mode, one
 * contiguous range in the other.
 */

type Mode = 'murmur' | 'lexis';

const KEYS = [
    'collection/c1/d1', 'collection/c1/d2',
    'collection/c42/d100', 'collection/c42/d101', 'collection/c42/d250',
    'collection/c7/d3', 'collection/c9/d8',
    'orders/o1/i1', 'orders/o1/i2',
    'users/u2/p4', 'users/u7/p1', 'users/u7/p2',
];

// Ring order under Murmur3: index into KEYS for each of the 12 slots,
// four slots per node. Hash order has nothing to do with path order.
const MURMUR_SLOTS = [3, 10, 6, 0, 8, 2, 11, 5, 1, 9, 4, 7];

const NODES = 3;
const SLOTS_PER_NODE = 4;
const TABLET_SIZE = 2;

const QUERIES: readonly { label: string; prefix: string }[] = [
    { label: `coll = 'collection' AND colid = 'c42'`, prefix: 'collection/c42/' },
    { label: `coll = 'collection'`, prefix: 'collection/' },
    { label: `coll = 'users'`, prefix: 'users/' },
];

/** Global slot index (node * SLOTS_PER_NODE + row) for each key, per mode. */
const slotFor = (mode: Mode, keyIndex: number): number => {
    if (mode === 'murmur') return MURMUR_SLOTS.indexOf(keyIndex);
    const tablet = Math.floor(keyIndex / TABLET_SIZE);
    const node = tablet % NODES;
    const pair = Math.floor(tablet / NODES);
    return node * SLOTS_PER_NODE + pair * TABLET_SIZE + (keyIndex % TABLET_SIZE);
};

const group = (key: string): string => key.split('/')[0]!;

@Component({
    selector: 'partition-viz',
    template: `
        <div class="controls">
            <div class="seg">
                <button [class.on]="isMode('murmur')" onclick="setMurmur">Hashed · Murmur3</button>
                <button [class.on]="isMode('lexis')" onclick="setLexis">Ordered · Lexis</button>
            </div>
            <div class="queries">
                <span class="qlabel">WHERE</span>
                <button class="q" [class.on]="isQuery('0')" onclick="query0">coll = 'collection' AND colid = 'c42'</button>
                <button class="q" [class.on]="isQuery('1')" onclick="query1">coll = 'collection'</button>
                <button class="q" [class.on]="isQuery('2')" onclick="query2">coll = 'users'</button>
            </div>
        </div>
        <div class="stage"></div>
        <div class="verdict" [class.bad]="isMode('murmur')">
            <span class="dot"></span><span>{{verdict}}</span>
        </div>
    `,
    styles: `
        :host { display: block; position: relative; }
        .controls { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between;
                    align-items: center; margin-bottom: 1.25rem; }
        .seg { display: inline-flex; padding: 4px; border-radius: 999px;
               background: rgba(0,0,0,0.25); border: var(--border-width) solid rgba(255,255,255,0.08); }
        .seg button { background: none; border: none; color: var(--muted); padding: 0.5rem 1rem;
                      border-radius: 999px; font-size: 0.85rem; transition: background 0.25s, color 0.25s; }
        .seg button.on { background: rgba(255,255,255,0.1); color: var(--white);
                         box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
        .queries { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
        .qlabel { font-family: var(--font-mono); color: var(--dim); font-size: 0.8rem; margin-right: 0.2rem; }
        .q { font-family: var(--font-mono); font-size: 0.78rem; color: var(--secondary);
             background: rgba(255,255,255,0.03); border: var(--border-width) solid rgba(255,255,255,0.1);
             padding: 0.35rem 0.65rem; border-radius: var(--radius); }
        .q.on { color: var(--white); border-color: var(--accent); background: rgba(212,176,230,0.12); }

        .stage { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .node { position: relative; border-radius: var(--radius-lg); padding: 3.1rem 0.75rem 0.75rem;
                background: rgba(20,4,16,0.45); border: var(--border-width) solid rgba(255,255,255,0.07);
                transition: border-color 0.4s, box-shadow 0.4s; }
        .node.scan { border-color: rgba(142,157,186,0.55); box-shadow: 0 0 0 1px rgba(142,157,186,0.25), 0 0 40px -12px rgba(142,157,186,0.6); }
        .node-label { position: absolute; top: 0.8rem; left: 0.9rem; font-size: 0.72rem;
                      letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
        .node-label b { color: var(--secondary); font-weight: 500; }
        .slot { height: 2.6rem; margin-bottom: 0.45rem; border-radius: var(--radius);
                border: 1px dashed rgba(255,255,255,0.05); }
        .slot:nth-child(2n+1):not(:first-child) { }
        .tablet { position: absolute; left: 0.4rem; right: 0.4rem; border-radius: 10px;
                  border: 1px solid rgba(175,192,209,0.0); pointer-events: none;
                  transition: border-color 0.5s, background 0.5s, box-shadow 0.5s, opacity 0.5s; opacity: 0; }
        .tablet .tl { position: absolute; top: -0.55rem; right: 0.6rem; font-size: 0.62rem;
                      font-family: var(--font-mono); color: var(--sky); background: var(--bg-2);
                      padding: 0 0.35rem; border-radius: 4px; letter-spacing: 0.04em; }
        .lexis .tablet { opacity: 1; border-color: rgba(175,192,209,0.28); }
        .lexis .tablet.hit { border-color: rgba(212,176,230,0.9); background: rgba(212,176,230,0.07);
                             box-shadow: 0 0 30px -8px rgba(212,176,230,0.7); }

        .chip { position: absolute; top: 0; left: 0; height: 2.6rem; display: flex; align-items: center;
                gap: 0.55rem; padding: 0 0.75rem; border-radius: var(--radius);
                font-family: var(--font-mono); font-size: 0.85rem; color: var(--text);
                background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
                border: var(--border-width) solid rgba(255,255,255,0.1);
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; will-change: transform;
                transition: opacity 0.4s, border-color 0.4s, box-shadow 0.4s, background 0.4s; }
        .chip i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .chip.g-collection i { background: var(--sky); }
        .chip.g-orders i { background: var(--indigo); }
        .chip.g-users i { background: var(--lilac); }
        .chip.dim { opacity: 0.32; }
        .chip.hit { border-color: rgba(212,176,230,0.85); color: var(--white);
                    background: linear-gradient(180deg, rgba(212,176,230,0.28), rgba(212,176,230,0.12));
                    box-shadow: 0 6px 24px -8px rgba(212,176,230,0.8); }

        .verdict { margin-top: 1.25rem; display: flex; align-items: center; gap: 0.7rem;
                   font-size: 0.98rem; color: var(--secondary); min-height: 1.6rem; }
        .verdict .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green);
                        box-shadow: 0 0 12px var(--green); flex: none; transition: background 0.3s, box-shadow 0.3s; }
        .verdict.bad .dot { background: var(--steel); box-shadow: 0 0 12px var(--steel); }
        @media (max-width: 720px) {
            .stage { gap: 0.4rem; }
            .node { padding: 2.9rem 0.3rem 0.3rem; }
            .chip { font-size: 0.62rem; padding: 0 0.35rem; gap: 0.3rem; }
            .chip i { width: 6px; height: 6px; }
            .tablet .tl { display: none; }
        }
    `,
})
export class PartitionViz extends RxElement {
    @state mode: Mode = 'murmur';
    @state queryIndex = 0;
    @state verdict = '';

    private stage!: HTMLElement;
    private nodes: HTMLElement[] = [];
    private slots: HTMLElement[] = [];
    private chips: HTMLElement[] = [];
    private tablets: HTMLElement[] = [];
    private auto = 0;
    private ro: ResizeObserver | undefined;

    override onInit(): void {
        this.stage = this.querySelector('.stage')!;
        this.stage.replaceChildren(); // drop nodes and chips captured by SSG before building them live
        for (let n = 0; n < NODES; n++) {
            const node = document.createElement('div');
            node.className = 'node';
            node.innerHTML = `<span class="node-label">node <b>${String(n + 1)}</b></span>`;
            for (let s = 0; s < SLOTS_PER_NODE; s++) {
                const slot = document.createElement('div');
                slot.className = 'slot';
                node.appendChild(slot);
                this.slots.push(slot);
            }
            this.stage.appendChild(node);
            this.nodes.push(node);
        }
        for (let t = 0; t < KEYS.length / TABLET_SIZE; t++) {
            const tablet = document.createElement('div');
            tablet.className = 'tablet';
            tablet.innerHTML = `<span class="tl">tablet ${String(t)}</span>`;
            this.stage.appendChild(tablet);
            this.tablets.push(tablet);
        }
        for (const key of KEYS) {
            const chip = document.createElement('div');
            chip.className = `chip g-${group(key)}`;
            chip.innerHTML = `<i></i>${key}`;
            this.stage.appendChild(chip);
            this.chips.push(chip);
        }

        this.ro = new ResizeObserver(() => this.layout(false));
        this.ro.observe(this.stage);
        this.layout(false);
        this.mode$.subscribe(() => this.layout(true));
        this.queryIndex$.subscribe(() => this.highlight());
        this.startAuto();
    }

    override onDestroy(): void {
        clearInterval(this.auto);
        this.ro?.disconnect();
    }

    isMode(mode: Mode): Observable<boolean> {
        return this.mode$.pipe(map((m) => m === mode));
    }

    isQuery(i: string): Observable<boolean> {
        return this.queryIndex$.pipe(map((q) => String(q) === i));
    }

    setMurmur(): void { this.stopAuto(); this.mode = 'murmur'; }
    setLexis(): void { this.stopAuto(); this.mode = 'lexis'; }
    query0(): void { this.stopAuto(); this.queryIndex = 0; }
    query1(): void { this.stopAuto(); this.queryIndex = 1; }
    query2(): void { this.stopAuto(); this.queryIndex = 2; }

    private startAuto(): void {
        let tick = 0;
        this.auto = window.setInterval(() => {
            tick++;
            if (tick % 2 === 0) this.queryIndex = (this.queryIndex + 1) % QUERIES.length;
            this.mode = this.mode === 'murmur' ? 'lexis' : 'murmur';
        }, 3800);
    }

    private stopAuto(): void {
        clearInterval(this.auto);
    }

    private slotRect(slot: HTMLElement): { x: number; y: number; w: number; h: number } {
        const node = slot.parentElement!;
        return {
            x: node.offsetLeft + slot.offsetLeft,
            y: node.offsetTop + slot.offsetTop,
            w: slot.offsetWidth,
            h: slot.offsetHeight,
        };
    }

    private layout(animated: boolean): void {
        if (this.slots.length === 0) return;
        const mode = this.mode;
        this.stage.classList.toggle('lexis', mode === 'lexis');

        this.chips.forEach((chip, i) => {
            const r = this.slotRect(this.slots[slotFor(mode, i)]!);
            chip.style.width = `${String(r.w)}px`;
            if (animated) {
                animate(chip, { x: r.x, y: r.y },
                    { type: 'spring', stiffness: 170, damping: 22, mass: 0.9, delay: i * 0.025 });
            } else {
                animate(chip, { x: r.x, y: r.y }, { duration: 0 });
            }
        });

        this.tablets.forEach((tablet, t) => {
            const first = this.slotRect(this.slots[slotFor('lexis', t * TABLET_SIZE)]!);
            const last = this.slotRect(this.slots[slotFor('lexis', t * TABLET_SIZE + TABLET_SIZE - 1)]!);
            const pad = 5;
            tablet.style.left = `${String(first.x - pad)}px`;
            tablet.style.width = `${String(first.w + pad * 2)}px`;
            tablet.style.top = `${String(first.y - pad)}px`;
            tablet.style.height = `${String(last.y + last.h - first.y + pad * 2)}px`;
        });
        this.highlight();
    }

    private highlight(): void {
        if (this.chips.length === 0) return;
        const { prefix } = QUERIES[this.queryIndex]!;
        const hits = KEYS.map((k) => k.startsWith(prefix));
        this.chips.forEach((chip, i) => {
            chip.classList.toggle('hit', hits[i]!);
            chip.classList.toggle('dim', !hits[i]);
        });

        const hitTablets = new Set<number>();
        hits.forEach((h, i) => { if (h) hitTablets.add(Math.floor(i / TABLET_SIZE)); });
        this.tablets.forEach((tablet, t) => tablet.classList.toggle('hit', hitTablets.has(t)));

        const murmur = this.mode === 'murmur';
        this.nodes.forEach((node) => node.classList.toggle('scan', murmur));

        const count = hits.filter(Boolean).length;
        if (murmur) {
            const nodes = new Set<number>();
            hits.forEach((h, i) => { if (h) nodes.add(Math.floor(slotFor('murmur', i) / SLOTS_PER_NODE)); });
            this.verdict = `Hashed by the whole path: ${String(count)} matches spread over ` +
                `${String(nodes.size)} of ${String(NODES)} nodes.`;
        } else {
            const n = hitTablets.size;
            this.verdict = `Ordered by path: ${String(count)} matches in one contiguous range, ` +
                `${String(n)} adjacent tablet${n === 1 ? '' : 's'}, read in key order.`;
        }
    }
}
