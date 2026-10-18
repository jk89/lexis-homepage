import { Component, RxElement } from '@yaw-rx/core';
import './lexis-logo.component.js';

@Component({
    selector: 'site-footer',
    template: `
        <footer>
            <div class="brand"><lexis-logo class="mark"></lexis-logo><span>Lexis</span></div>
            <div class="cols">
                <div>
                    <h5>Project</h5>
                    <a href="https://github.com/jk89/lexisdb" target="_blank" rel="noopener">lexisdb</a>
                    <a href="https://github.com/jk89/lexis-cqlsh" target="_blank" rel="noopener">lexis-cqlsh</a>
                    <a href="https://github.com/jk89/lexis-tools-java" target="_blank" rel="noopener">lexis-tools-java</a>
                    <a href="https://github.com/jk89/lexis-jmx" target="_blank" rel="noopener">lexis-jmx</a>
                </div>
                <div>
                    <h5>Drivers</h5>
                    <a href="https://github.com/jk89/lexis-python-driver" target="_blank" rel="noopener">Python</a>
                    <a href="https://github.com/jk89/lexis-rust-driver" target="_blank" rel="noopener">Rust</a>
                </div>
                <div>
                    <h5>Upstream</h5>
                    <a href="https://opensource.docs.scylladb.com/branch-6.2/" target="_blank" rel="noopener">ScyllaDB 6.2 docs</a>
                    <a href="https://github.com/scylladb/scylladb/tree/scylla-6.2.3" target="_blank" rel="noopener">scylla-6.2.3</a>
                </div>
            </div>
            <p class="legal">Lexis 1.0 is forked from ScyllaDB 6.2.3 and licensed AGPL-3.0-or-later.</p>
        </footer>
    `,
    styles: `
        :host { display: block; border-top: var(--border-width) solid rgba(255,255,255,0.07);
                background: rgba(10, 2, 8, 0.35); }
        footer { max-width: 1100px; margin: 0 auto; padding: 3.5rem 2rem 2.5rem;
                 display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; }
        .brand { display: flex; align-items: center; gap: 0.7rem; font-size: 1.4rem; font-weight: 700; color: var(--white); }
        .mark { width: 2rem; }
        .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
        h5 { margin: 0 0 0.8rem; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
             color: var(--dim); font-weight: 500; }
        .cols a { display: block; color: var(--secondary); text-decoration: none; font-size: 0.92rem;
                  margin-bottom: 0.45rem; transition: color 0.2s; }
        .cols a:hover { color: var(--accent); }
        .legal { grid-column: 1 / -1; margin: 1.5rem 0 0; font-size: 0.78rem; color: var(--dim); }
        @media (max-width: 700px) {
            footer { grid-template-columns: 1fr; }
            .cols { grid-template-columns: repeat(2, 1fr); }
        }
    `,
})
export class SiteFooter extends RxElement {}
