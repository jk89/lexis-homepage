import { interval, map, Subject, takeUntil, type Observable, type Subscription } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { Flip } from '../../directives/flip.directive.js';
import styles from './token-sort.component.css';

/**
 * The token is the key. Each row is a partition key with two tokens: a
 * Murmur3-style hash, and the Lexis encoding (each text component's
 * bytes, 0x00 escaped as 00 01, then a 00 00 terminator). Rows re-sort,
 * with a FLIP spring, by whichever token is selected.
 */

type By = 'murmur' | 'lexis';

// (user_id, order_id) keys.
const KEYS: readonly (readonly [string, string])[] = [
    ['u1', 'o1'],
    ['u1', 'o2'],
    ['u42', 'o100'],
    ['u42', 'o101'],
    ['u42', 'o250'],
    ['u7', 'o5'],
];

// Illustrative signed 64-bit hash tokens. Their order is arbitrary with
// respect to the keys, which is the point.
const MURMUR = [
    '-1503622098384930114', '6911453290184477201', '-8410235776021639452',
    '2287409312844011925', '-4290117745509316688', '409812277361002437',
];

const hexOf = (s: string): string => {
    let out = '';
    for (const b of new TextEncoder().encode(s)) out += b === 0 ? '0001' : b.toString(16).padStart(2, '0');
    return out;
};

interface Row {
    readonly id: number;
    readonly segments: readonly { readonly text: string; readonly sep: string }[];
    readonly murmur: string;
    readonly components: readonly { readonly cls: string; readonly hex: string }[];
    readonly lexis: string;
}

const ROWS: readonly Row[] = KEYS.map(([user, order], id) => {
    const components = [
        { cls: 'c c0', hex: hexOf(user) },
        { cls: 'c c1', hex: hexOf(order) },
    ];
    return {
        id,
        segments: [{ text: `user_id:${user}`, sep: '' }, { text: `order_id:${order}`, sep: '/' }],
        murmur: MURMUR[id]!,
        components,
        lexis: components.map((c) => c.hex + '0000').join(''),
    };
});

const BY_MURMUR = [...ROWS].sort((a, b) => (BigInt(a.murmur) < BigInt(b.murmur) ? -1 : 1));
const BY_LEXIS = [...ROWS].sort((a, b) => (a.lexis < b.lexis ? -1 : a.lexis > b.lexis ? 1 : 0));

@Component({
    selector: 'token-sort',
    directives: [RxFor, Flip],
    template: `
        <div class="head">
            <span class="hk">partition key</span>
            <span class="hm" [class.on]="isBy('murmur')">murmur3 token</span>
            <span class="hl" [class.on]="isBy('lexis')">lexis token</span>
        </div>
        <div class="rows" rx-for="row of rows by id" flip="160 20"
             [class.by-lexis]="isBy('lexis')" [class.by-murmur]="isBy('murmur')">
            <div class="row"><span class="key" rx-for="s of row.segments"><span><b>{{s.sep}}</b>{{s.text}}</span></span><span class="m">{{row.murmur}}</span><span class="l" rx-for="c of row.components"><span><span [className]="c.cls">{{c.hex}}</span><span class="t">0000</span></span></span></div>
        </div>
        <div class="foot">
            <div class="seg">
                <button [class.on]="isBy('murmur')" onclick="byMurmur">sort by hash</button>
                <button [class.on]="isBy('lexis')" onclick="byLexis">sort by Lexis token</button>
            </div>
            <span class="legend"><i class="c0"></i>user_id <i class="c1"></i>order_id <i class="t"></i>terminator</span>
        </div>
    `,
    styles,
})
export class TokenSort extends RxElement {
    @state by: By = 'murmur';
    private readonly stopAuto = new Subject<void>();
    private auto: Subscription | undefined;

    get rows$(): Observable<readonly Row[]> {
        return this.by$.pipe(map((by) => (by === 'murmur' ? BY_MURMUR : BY_LEXIS)));
    }

    override onInit(): void {
        this.auto = interval(4200).pipe(takeUntil(this.stopAuto)).subscribe(() => {
            this.by = this.by === 'murmur' ? 'lexis' : 'murmur';
        });
    }

    override onDestroy(): void {
        this.auto?.unsubscribe();
    }

    isBy(by: By): Observable<boolean> {
        return this.by$.pipe(map((b) => b === by));
    }

    byMurmur(): void { this.stopAuto.next(); this.by = 'murmur'; }
    byLexis(): void { this.stopAuto.next(); this.by = 'lexis'; }
}
