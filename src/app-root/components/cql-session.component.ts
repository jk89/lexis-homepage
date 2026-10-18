import { animate, inView, stagger } from 'motion';
import { Component, RxElement, state } from '@yaw-rx/core';
import { readInert, escapeHtml } from '@yaw-rx/common/escape';
import { dedent, highlightCql } from './code-block/code-block-highlight.component.js';

/**
 * A cqlsh exchange: a highlighted statement and, below it, the result as
 * a table. The content is the statement, a line holding only `---`, then
 * the result in cqlsh's own format (header, dashes, pipe-separated rows).
 * With no `---` only the statement is shown. Rows stagger in on first view.
 *
 *   <cql-session>${escape`SELECT * FROM t;
 *   ---
 *    a | b
 *   ---+---
 *    1 | x`}</cql-session>
 */
@Component({
    selector: 'cql-session',
    styles: `
        :host { display: block; border-radius: var(--radius-lg); overflow: hidden;
                background: rgba(14, 3, 11, 0.62);
                border: var(--border-width) solid rgba(255, 255, 255, 0.09);
                box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255,255,255,0.04);
                font-family: var(--font-mono); }
        .bar { display: flex; align-items: center; gap: 0.45rem; padding: 0.55rem 0.9rem;
               border-bottom: var(--border-width) solid rgba(255, 255, 255, 0.06);
               background: rgba(255, 255, 255, 0.025); font-size: 0.75rem; color: var(--dim); }
        .bar i { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.12); }
        .bar i:nth-child(1) { background: var(--rose); opacity: 0.85; }
        .bar span { margin-left: 0.5rem; flex: 1; }
        .bar .ok { flex: none; color: #2c0b22; background: var(--green); padding: 0.05rem 0.5rem;
                   border-radius: 999px; font-family: var(--font-sans); font-size: 0.66rem;
                   letter-spacing: 0.05em; text-transform: uppercase; }
        .bar .err { background: var(--red); }
        .stmt { display: flex; gap: 0.7rem; padding: 1rem 1.25rem; overflow-x: auto; }
        .prompt { color: var(--sky); flex: none; user-select: none; font-size: 0.92rem; line-height: 1.6; }
        .stmt code { font-family: inherit; font-size: 0.92rem; line-height: 1.6; white-space: pre; color: #eadfe6; }
        .result { padding: 0 1.25rem 1rem; overflow-x: auto; }
        table { border-collapse: separate; border-spacing: 0; min-width: 60%; font-size: 0.88rem; }
        th { text-align: left; color: var(--sky); font-weight: 700; padding: 0.4rem 1.1rem 0.4rem 0.6rem;
             border-bottom: 1px solid rgba(175,192,209,0.35); white-space: nowrap; }
        td { padding: 0.38rem 1.1rem 0.38rem 0.6rem; color: var(--text); white-space: nowrap;
             border-bottom: 1px solid rgba(255,255,255,0.04); }
        tr:hover td { background: rgba(212,176,230,0.06); }
        td.pk { color: var(--accent); }
        td.blob { color: var(--gold); }
        .count { margin-top: 0.7rem; color: var(--dim); font-size: 0.8rem; }
        .message { padding: 0 1.25rem 1rem; color: var(--red); font-size: 0.85rem; white-space: pre-wrap; }
        .tk-keyword { color: #d4b0e6; } .tk-string { color: #b9dba6; } .tk-number { color: #f0a58c; }
        .tk-comment { color: #8e7a8a; font-style: italic; } .tk-type { color: #f0d29b; }
        .tk-fn { color: #afc0d1; } .tk-ident { color: #f0e8ed; } .tk-punct { color: #a99db0; }
    `,
})
export class CqlSession extends RxElement {
    /** Leading columns to tint as partition key columns. */
    @state pk = 0;
    /** Set to show the result as an error message rather than a table. */
    @state error = '';
    /** Optional pill in the title bar, e.g. "range read". */
    @state badge = '';
    private stop: (() => void) | undefined;

    override onInit(): void {
        const raw = dedent(readInert(this));
        const [stmt = '', result] = raw.split(/\n---\n/);
        const isError = this.error !== '';
        const badge = isError
            ? `<b class="ok err">${escapeHtml(this.error)}</b>`
            : this.badge ? `<b class="ok">${escapeHtml(this.badge)}</b>` : '';
        let html =
            `<div class="bar"><i></i><i></i><i></i><span>cqlsh:lexis</span>${badge}</div>` +
            `<div class="stmt"><span class="prompt">&gt;</span><code>${highlightCql(stmt.trim())}</code></div>`;
        if (result !== undefined && isError) {
            html += `<div class="message">${escapeHtml(result.trim())}</div>`;
        } else if (result !== undefined) {
            html += `<div class="result">${this.table(result)}</div>`;
        }
        this.innerHTML = html;

        const rows = this.querySelectorAll('tbody tr');
        if (rows.length === 0) return;
        for (const r of rows) (r as HTMLElement).style.opacity = '0';
        this.stop = inView(this, () => {
            animate(rows, { opacity: [0, 1], x: [-14, 0] },
                { delay: stagger(0.07, { startDelay: 0.15 }), type: 'spring', stiffness: 260, damping: 24 });
        }, { amount: 0.3 });
    }

    override onDestroy(): void {
        this.stop?.();
    }

    private table(result: string): string {
        const lines = result.split('\n').filter((l) => l.trim() !== '');
        const cells = (l: string): string[] => l.split('|').map((c) => c.trim());
        const header = cells(lines[0] ?? '');
        const body = lines.slice(1).filter((l) => !/^[-+\s]+$/.test(l)).map(cells);
        const pk = this.pk;
        const th = header.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
        const tr = body.map((row) => '<tr>' + row.map((c, i) => {
            const cls = c.startsWith('0x') ? 'blob' : i < pk ? 'pk' : '';
            return `<td class="${cls}">${escapeHtml(c)}</td>`;
        }).join('') + '</tr>').join('');
        const n = body.length;
        return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>` +
            `<div class="count">(${String(n)} row${n === 1 ? '' : 's'})</div>`;
    }
}
