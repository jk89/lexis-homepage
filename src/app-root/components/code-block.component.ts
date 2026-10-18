import { Component, RxElement, state } from '@yaw-rx/core';
import { readInert, escapeHtml } from '@yaw-rx/common/escape';
import {
    dedent, highlightBash, highlightCql, highlightDockerfile, highlightHtml, highlightJs,
    highlightJson, highlightKv, highlightPython, highlightRust, highlightTs,
} from './code-block/code-block-highlight.component.js';

/**
 * Highlighted source in a window frame. `syntax` picks the highlighter,
 * `filename` labels the frame. A copy button copies the raw source.
 */
@Component({
    selector: 'code-block',
    styles: `
        :host { display: flex; flex-direction: column; min-height: 0; min-width: 0;
                border-radius: var(--radius-lg); overflow: hidden;
                background: rgba(14, 3, 11, 0.62);
                border: var(--border-width) solid rgba(255, 255, 255, 0.09);
                box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255,255,255,0.04);
                backdrop-filter: blur(6px); }
        .bar { display: flex; align-items: center; gap: 0.45rem; padding: 0.55rem 0.9rem;
               border-bottom: var(--border-width) solid rgba(255, 255, 255, 0.06);
               background: rgba(255, 255, 255, 0.025); }
        .bar i { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.12); }
        .bar i:nth-child(1) { background: var(--rose); opacity: 0.85; }
        .bar .title { margin-left: 0.5rem; font-family: var(--font-mono); font-size: 0.75rem;
                      color: var(--dim); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar button { background: none; border: var(--border-width) solid rgba(255,255,255,0.12);
                      color: var(--muted); font-size: 0.7rem; padding: 0.15rem 0.55rem; border-radius: 999px; }
        .bar button:hover { color: var(--white); border-color: var(--accent); }
        .cb { padding: 1.1rem 1.25rem; overflow-x: auto; margin: 0; flex: 1; min-width: 0; }
        code { font-family: var(--font-mono); font-size: 0.92rem; color: #eadfe6;
               line-height: 1.6; white-space: pre; background: none; }
        .tk-keyword { color: #d4b0e6; }
        .tk-string { color: #b9dba6; }
        .tk-number { color: #f0a58c; }
        .tk-comment { color: #8e7a8a; font-style: italic; }
        .tk-regex { color: #f08a8a; }
        .tk-decorator { color: #f0d29b; }
        .tk-type { color: #f0d29b; }
        .tk-fn { color: #afc0d1; }
        .tk-const { color: #f0a58c; }
        .tk-ident { color: #f0e8ed; }
        .tk-tag { color: #f0958a; }
        .tk-attr { color: #afc0d1; }
        .tk-punct { color: #a99db0; }
    `
})
export class CodeBlock extends RxElement {
    @state syntax = '';
    @state filename = '';
    private source = '';

    override onInit(): void {
        this.source = dedent(readInert(this));
        const highlighters: Record<string, (s: string) => string> = {
            ts: highlightTs, js: highlightJs, html: highlightHtml, json: highlightJson,
            bash: highlightBash, dockerfile: highlightDockerfile, cql: highlightCql,
            python: highlightPython, rust: highlightRust, toml: highlightKv, yaml: highlightKv,
        };
        const content = (highlighters[this.syntax] ?? escapeHtml)(this.source);
        const label = escapeHtml(this.filename || this.syntax);
        this.innerHTML =
            `<div class="bar"><i></i><i></i><i></i><span class="title">${label}</span><button>copy</button></div>` +
            `<pre class="cb"><code>${content}</code></pre>`;
        const button = this.querySelector('button')!;
        button.addEventListener('click', () => {
            void navigator.clipboard.writeText(this.source).then(() => {
                button.textContent = 'copied';
                window.setTimeout(() => { button.textContent = 'copy'; }, 1400);
            });
        });
    }
}
