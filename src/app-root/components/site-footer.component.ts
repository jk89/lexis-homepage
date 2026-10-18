import { Component, RxElement } from '@yaw-rx/core';
import './lexis-logo.component.js';
import styles from './site-footer.component.css';

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
    styles,
})
export class SiteFooter extends RxElement {}
