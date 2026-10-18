import { map, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { RxIf } from '@yaw-rx/core/directives/rx-if';
import { readInert } from '@yaw-rx/common/escape';
import { dedent, highlightCql, type Token } from './code-block/code-block-highlight.component.js';
import { StaggerIn } from '../directives/stagger-in.directive.js';
import styles from './cql-session.component.css';

interface Cell { readonly text: string; readonly pk: boolean; readonly blob: boolean }
interface Row { readonly key: number; readonly cells: readonly Cell[] }

/**
 * A cqlsh exchange: a highlighted statement and, below it, the result as
 * a table. The escaped source is the statement, a line holding only `---`,
 * then the result in cqlsh's own format (header, dashes, pipe-separated
 * rows). With no `---` only the statement is shown.
 *
 *   <cql-session>${escape`SELECT * FROM t;
 *   ---
 *    a | b
 *   ---+---
 *    1 | x`}</cql-session>
 *
 * The source is projected into a hidden holder and parsed once in onRender.
 */
@Component({
    selector: 'cql-session',
    directives: [RxIf, RxFor, StaggerIn],
    template: `
        <div class="bar">
            <i></i><i></i><i></i><span class="prompt-label">cqlsh:lexis</span>
            <span class="if" rx-if="badge"><b class="ok">{{badge}}</b></span>
        </div>
        <div class="body">
            <div class="stmt"><span class="prompt">&gt;</span><code rx-for="t of statement"><span [className]="t.cls">{{t.text}}</span></code></div>
            <div class="if" rx-if="hasResult">
                <div class="result">
                    <table>
                        <thead><tr rx-for="h of headers"><th>{{h}}</th></tr></thead>
                        <tbody rx-for="row of rows by key" stagger-in>
                            <tr rx-for="cell of row.cells"><td [class.pk]="cell.pk" [class.blob]="cell.blob">{{cell.text}}</td></tr>
                        </tbody>
                    </table>
                    <div class="count">{{count}}</div>
                </div>
            </div>
        </div>
        <div class="source" hidden #sourceEl><slot></slot></div>
    `,
    styles,
})
export class CqlSession extends RxElement {
    /** Leading columns to tint as partition key columns. */
    @state pk = 0;
    /** Optional pill in the title bar, e.g. "range read". */
    @state badge = '';
    @state statement: readonly Token[] = [];
    @state hasResult = false;
    @state headers: readonly string[] = [];
    @state rows: readonly Row[] = [];
    private sourceEl!: HTMLElement;

    get count$(): Observable<string> {
        return this.rows$.pipe(map((r) => `(${String(r.length)} row${r.length === 1 ? '' : 's'})`));
    }

    override onRender(): void {
        const [stmt = '', result] = dedent(readInert(this.sourceEl)).split(/\n---\n/);
        this.statement = highlightCql(stmt.trim());
        if (result === undefined) return;

        const lines = result.split('\n').filter((l) => l.trim() !== '');
        const split = (l: string): string[] => l.split('|').map((c) => c.trim());
        this.headers = split(lines[0] ?? '');
        this.rows = lines.slice(1)
            .filter((l) => !/^[-+\s]+$/.test(l))
            .map((l, key) => ({
                key,
                cells: split(l).map((text, i) => ({ text, pk: i < this.pk && !text.startsWith('0x'), blob: text.startsWith('0x') })),
            }));
        this.hasResult = true;
    }
}
