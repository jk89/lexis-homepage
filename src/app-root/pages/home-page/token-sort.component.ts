import { animate } from 'motion';
import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';

/**
 * The token is the key. Each row is a partition key with two tokens: a
 * Murmur3-style hash, and the Lexis encoding (each text component's
 * bytes, 0x00 escaped as 00 01, then a 00 00 terminator). Rows re-sort,
 * with a FLIP spring, by whichever token is selected.
 */

type By = 'murmur' | 'lexis';

const KEYS: readonly (readonly string[])[] = [
    ['collection', 'c1', 'd1'],
    ['collection', 'c1', 'd2'],
    ['collection', 'c42', 'd100'],
    ['collection', 'c42', 'd101'],
    ['collection', 'c42', 'd250'],
    ['users', 'u7', 'p1'],
];

// Illustrative signed 64-bit hash tokens. Their order is arbitrary with
// respect to the keys, which is the point.
const MURMUR = [
    '-1503622098384930114', '6911453290184477201', '-8410235776021639452',
    '2287409312844011925', '-4290117745509316688', '409812277361002437',
];

const hexOf = (s: string): string[] => {
    const out: string[] = [];
    for (const b of new TextEncoder().encode(s)) {
        if (b === 0) out.push('00', '01');
        else out.push(b.toString(16).padStart(2, '0'));
    }
    return out;
};

const lexisHtml = (parts: readonly string[]): string =>
    parts.map((p, i) => `<span class="c c${String(i)}">${hexOf(p).join('')}</span><span class="t">0000</span>`).join('');

const compareLexis = (a: readonly string[], b: readonly string[]): number => {
    const ha = a.map((p) => hexOf(p).join('') + '0000').join('');
    const hb = b.map((p) => hexOf(p).join('') + '0000').join('');
    return ha < hb ? -1 : ha > hb ? 1 : 0;
};

@Component({
    selector: 'token-sort',
    template: `
        <div class="head">
            <span class="hk">partition key</span>
            <span class="hm" [class.on]="isBy('murmur')">murmur3 token</span>
            <span class="hl" [class.on]="isBy('lexis')">lexis token</span>
        </div>
        <div class="rows"></div>
        <div class="foot">
            <div class="seg">
                <button [class.on]="isBy('murmur')" onclick="byMurmur">sort by hash</button>
                <button [class.on]="isBy('lexis')" onclick="byLexis">sort by Lexis token</button>
            </div>
            <span class="legend"><i class="c0"></i>coll <i class="c1"></i>colid <i class="c2"></i>docid <i class="t"></i>terminator</span>
        </div>
    `,
    styles: `
        :host { display: block; font-family: var(--font-mono); }
        .head, .row { display: grid; grid-template-columns: minmax(11rem, 1fr) minmax(12rem, 1fr) minmax(0, 2.2fr);
                      gap: 1rem; align-items: center; padding: 0 1rem; }
        .head { font-family: var(--font-sans); font-size: 0.68rem; letter-spacing: 0.14em;
                text-transform: uppercase; color: var(--dim); padding-bottom: 0.6rem; }
        .head .on { color: var(--accent); }
        .rows { position: relative; }
        .row { height: 2.9rem; border-radius: var(--radius); font-size: 0.9rem;
               background: rgba(255,255,255,0.03); border: var(--border-width) solid rgba(255,255,255,0.06);
               margin-bottom: 0.4rem; will-change: transform; }
        .key { color: var(--text); white-space: nowrap; }
        .key b { color: var(--dim); font-weight: 400; }
        .m { color: var(--muted); font-size: 0.82rem; transition: color 0.3s, opacity 0.3s; }
        .l { font-size: 0.78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
             transition: opacity 0.3s; letter-spacing: 0.02em; }
        .by-lexis .m { opacity: 0.45; }
        .by-murmur .l { opacity: 0.45; }
        .c0 { color: var(--sky); } .c1 { color: var(--accent); } .c2 { color: var(--gold); }
        .t { color: var(--dim); opacity: 0.6; }
        .foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;
                gap: 1rem; margin-top: 1rem; }
        .seg { display: inline-flex; padding: 4px; border-radius: 999px; font-family: var(--font-sans);
               background: rgba(0,0,0,0.25); border: var(--border-width) solid rgba(255,255,255,0.08); }
        .seg button { background: none; border: none; color: var(--muted); padding: 0.45rem 0.95rem;
                      border-radius: 999px; font-size: 0.82rem; transition: background 0.25s, color 0.25s; }
        .seg button.on { background: rgba(255,255,255,0.1); color: var(--white);
                         box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12); }
        .legend { font-size: 0.72rem; color: var(--dim); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
        .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-left: 0.5rem; }
        .legend i.c0 { background: var(--sky); } .legend i.c1 { background: var(--accent); }
        .legend i.c2 { background: var(--gold); } .legend i.t { background: var(--dim); }
        @media (max-width: 720px) {
            .head, .row { grid-template-columns: 1fr; gap: 0.15rem; padding: 0.5rem 0.75rem; }
            .row { height: auto; }
            .head .hm, .head .hl { display: none; }
        }
    `,
})
export class TokenSort extends RxElement {
    @state by: By = 'murmur';
    private rowsEl!: HTMLElement;
    private rows: HTMLElement[] = [];
    private auto = 0;

    override onInit(): void {
        this.rowsEl = this.querySelector('.rows')!;
        KEYS.forEach((parts, i) => {
            const row = document.createElement('div');
            row.className = 'row';
            row.innerHTML =
                `<span class="key">${parts.join('<b>/</b>')}</span>` +
                `<span class="m">${MURMUR[i]!}</span>` +
                `<span class="l">${lexisHtml(parts)}</span>`;
            this.rows.push(row);
        });
        this.by$.subscribe((by) => this.sort(by));
        this.auto = window.setInterval(() => {
            this.by = this.by === 'murmur' ? 'lexis' : 'murmur';
        }, 4200);
    }

    override onDestroy(): void {
        clearInterval(this.auto);
    }

    isBy(by: By): Observable<boolean> {
        return this.by$.pipe(map((b) => b === by));
    }

    byMurmur(): void { clearInterval(this.auto); this.by = 'murmur'; }
    byLexis(): void { clearInterval(this.auto); this.by = 'lexis'; }

    private sort(by: By): void {
        const order = KEYS.map((_, i) => i);
        if (by === 'murmur') order.sort((a, b) => (BigInt(MURMUR[a]!) < BigInt(MURMUR[b]!) ? -1 : 1));
        else order.sort((a, b) => compareLexis(KEYS[a]!, KEYS[b]!));

        // FLIP: measure, reorder, measure, animate the difference.
        const before = new Map(this.rows.map((r) => [r, r.getBoundingClientRect().top]));
        for (const i of order) this.rowsEl.appendChild(this.rows[i]!);
        this.rowsEl.classList.toggle('by-lexis', by === 'lexis');
        this.rowsEl.classList.toggle('by-murmur', by === 'murmur');
        for (const row of this.rows) {
            const prev = before.get(row)!;
            const dy = prev - row.getBoundingClientRect().top;
            if (prev !== 0 && dy !== 0) {
                animate(row, { y: [dy, 0] }, { type: 'spring', stiffness: 160, damping: 20 });
            }
        }
    }
}
