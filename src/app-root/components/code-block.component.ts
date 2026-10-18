import { BehaviorSubject, combineLatest, map, timer, type Observable } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { readInert } from '@yaw-rx/common/escape';
import {
    dedent, highlightBash, highlightCql, highlightDockerfile, highlightHtml, highlightJs,
    highlightJson, highlightKv, highlightPython, highlightRust, highlightTs, plainTokens, type Token,
} from './code-block/code-block-highlight.component.js';
import styles from './code-block.component.css';

const HIGHLIGHTERS: Record<string, (s: string) => Token[]> = {
    ts: highlightTs, js: highlightJs, html: highlightHtml, json: highlightJson,
    bash: highlightBash, dockerfile: highlightDockerfile, cql: highlightCql,
    python: highlightPython, rust: highlightRust, toml: highlightKv, yaml: highlightKv,
};

/**
 * Highlighted source in a window frame:
 * `<code-block syntax="ts" filename="app.ts">${escape`...`}</code-block>`.
 *
 * The escaped source arrives as text, projected into a hidden holder and
 * read once in onRender. It is highlighted into tokens and rendered with
 * rx-for, so every character reaches the DOM through a text binding.
 */
@Component({
    selector: 'code-block',
    directives: [RxFor],
    template: `
        <div class="bar"><i></i><i></i><i></i><span class="title">{{label}}</span><button onclick="copy">{{copyLabel}}</button></div>
        <pre class="cb"><code rx-for="t of tokens"><span [className]="t.cls">{{t.text}}</span></code></pre>
        <div class="source" hidden #sourceEl><slot></slot></div>
    `,
    styles,
})
export class CodeBlock extends RxElement {
    @state syntax = '';
    @state filename = '';
    @state copyLabel = 'copy';
    readonly tokens$ = new BehaviorSubject<readonly Token[]>([]);
    private sourceEl!: HTMLElement;
    private source = '';

    get label$(): Observable<string> {
        return combineLatest([this.filename$, this.syntax$]).pipe(map(([f, s]) => f || s));
    }

    override onRender(): void {
        this.source = dedent(readInert(this.sourceEl));
        this.tokens$.next((HIGHLIGHTERS[this.syntax] ?? plainTokens)(this.source));
    }

    copy(): void {
        void navigator.clipboard.writeText(this.source).then(() => {
            this.copyLabel = 'copied';
            timer(1400).subscribe(() => { this.copyLabel = 'copy'; });
        });
    }
}
