import { Component, Inject, RxElement } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { MotionReveal } from '../directives/motion-reveal.directive.js';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import './home-page/hero-section.component.js';
import './home-page/story-section.component.js';
import './home-page/partition-viz.component.js';
import './home-page/token-sort.component.js';
import './home-page/tablet-split.component.js';
import '../components/site-footer.component.js';

@Component({
    selector: 'home-page',
    providers: [TocMenuItemsService],
    directives: [MotionReveal, TocSection, TocAnchor],
    template: `
        <hero-section></hero-section>

        <story-section toc-section="idea" toc-anchor="idea" eyebrow="01 · the idea" heading="Partitions, stored in key order.">
            <p>In Lexis the token of a partition <strong>is</strong> its key, encoded so that
               byte order is key order. Partitions that share a prefix are stored together,
               so a query on the start of a key reads one contiguous range of tablets.</p>
            <p>Pick a query and see where its rows live, hashed or ordered.</p>
            <div class="card"><partition-viz></partition-viz></div>
        </story-section>

        <story-section toc-section="token" toc-anchor="token" eyebrow="02 · the token" heading="The token is the key, byte for byte.">
            <p>Each partition key component is written out as order-preserving bytes
               and closed with a <code>00 00</code> terminator, so <code>memcmp</code>
               on two tokens gives the same answer as comparing the keys. Text is its
               UTF-8 bytes. Integers, varints, decimals and timestamps get encodings that
               sort in CQL order, negatives included. In cqlsh and the drivers,
               <code>token()</code> is a blob.</p>
            <div class="card"><token-sort></token-sort></div>
        </story-section>

        <story-section toc-section="tablets" toc-anchor="tablets" eyebrow="03 · the constraint" heading="Ordered partitioning, made for tablets.">
            <p>Ordered partitioning on a single cluster-global token ring meant one set of
               boundaries had to suit every table. Tablets give each table its own
               independent mapping, so every table is balanced on its own keys.</p>
            <div class="compare">
                <div class="pane old" motion-reveal="0.05">
                    <span class="pill">vnodes</span>
                    <h3>One ring for every table</h3>
                    <p>Token boundaries are shared across the cluster. Ordered keys from
                       different tables pile into different parts of the same ring.</p>
                    <div class="ring"></div>
                </div>
                <div class="pane new" motion-reveal="0.15">
                    <span class="pill on">tablets</span>
                    <h3>A mapping per table</h3>
                    <p>Each table has its own token-range-to-node-and-core mapping. There is no
                       shared ring, so one table's distribution can't unbalance another's.</p>
                    <div class="lanes">
                        <div><i style="width:18%"></i><i style="width:22%"></i><i style="width:35%"></i><i style="width:25%"></i></div>
                        <div><i style="width:40%"></i><i style="width:12%"></i><i style="width:20%"></i><i style="width:28%"></i></div>
                        <div><i style="width:25%"></i><i style="width:25%"></i><i style="width:15%"></i><i style="width:35%"></i></div>
                    </div>
                </div>
            </div>
        </story-section>

        <story-section toc-section="hotspots" toc-anchor="hotspots" eyebrow="04 · hotspots" heading="Hot tablets split and move.">
            <p>The tablet load balancer splits a hot tablet and migrates the halves, down to a
               specific core on a specific node. A high-entropy leading key component spreads
               writes across the key space; whatever concentration remains is handled by
               splitting, with no schema changes.</p>
            <div class="card"><tablet-split></tablet-split></div>
        </story-section>

        <story-section toc-section="queries" toc-anchor="queries" eyebrow="05 · what you get" heading="Partial keys become range reads.">
            <p>Queries that would need secondary indexes become efficient range reads, routed to a
               bounded set of nodes and cores. The query model gets substantially more expressive,
               with no sacrifice in distribution or performance.</p>
            <div class="grid">
                <div class="feat" motion-reveal="0">
                    <h4>Prefix scans</h4>
                    <p>Name the start of a partition key, get every partition under it as one
                       contiguous range, in key order.</p>
                    <code>WHERE coll = 'collection'</code>
                </div>
                <div class="feat" motion-reveal="0.08">
                    <h4>Ranges on the last component</h4>
                    <p>Page through a collection, or take a range of collections, with no
                       full-cluster scatter.</p>
                    <code>AND docid &gt; 'd100' LIMIT 2</code>
                </div>
                <div class="feat" motion-reveal="0.16">
                    <h4>IN, then a range</h4>
                    <p>Several prefixes at once, each ending in a range: one bounded read per prefix.</p>
                    <code>colid IN ('c1','c42') AND docid &gt; 'd1'</code>
                </div>
                <div class="feat" motion-reveal="0.24">
                    <h4>LIMIT means first</h4>
                    <p>A LIMIT on a full scan returns the first keys of the table, in order.</p>
                    <code>SELECT * FROM docs LIMIT 2</code>
                </div>
                <div class="feat" motion-reveal="0.32">
                    <h4>Simpler data models</h4>
                    <p>For range-ordered access patterns, secondary indexes and denormalized
                       tables become unnecessary. One table, keyed by path.</p>
                    <code>PRIMARY KEY ((coll, colid, docid))</code>
                </div>
                <div class="feat" motion-reveal="0.4">
                    <h4>Routed by the drivers</h4>
                    <p>The Python and Rust drivers compute Lexis tokens on the client and send each
                       query to the node and shard that own it.</p>
                    <code>token() → blob</code>
                </div>
            </div>
            <button class="more" onclick="toExamples">See every query, with results →</button>
        </story-section>

        <story-section toc-section="prior-art" toc-anchor="prior-art" eyebrow="06 · prior art" heading="Bigtable's query model on modern hardware.">
            <p>Lexicographic order, per-table tablets and dynamic splitting are the model Google
               Bigtable has offered since 2004. Lexis brings it to a per-core, shared-nothing
               architecture, where a tablet split moves work to a specific core on a specific node:
               a finer granularity of load balancing than anything else available.</p>
            <p>Together they make something new in open source distributed databases:
               <strong>Bigtable's query model on modern hardware.</strong></p>
        </story-section>

        <section class="final" motion-reveal>
            <h2>Try it on one node.</h2>
            <div class="cmd"><span class="p">$</span> docker run --name lexisdb -d 0x6a6f6e6e79/lexisdb</div>
            <div class="buttons">
                <button class="primary" onclick="toInstall">Installation guide</button>
                <button class="ghost" onclick="toExamples">Examples</button>
            </div>
        </section>

        <site-footer></site-footer>
    `,
    styles: `
        :host { display: block; min-height: 100vh; }
        .compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
                   gap: 1.25rem; margin-top: 2.5rem; }
        .compare > .pane { padding: 1.75rem; border-radius: 18px; position: relative; overflow: hidden;
                background: rgba(255,255,255,0.03); border: var(--border-width) solid rgba(255,255,255,0.08); }
        .compare > .pane.new { background: linear-gradient(160deg, rgba(212,176,230,0.12), rgba(175,192,209,0.04));
                    border-color: rgba(212,176,230,0.3); }
        .pane > h3 { color: var(--white); font-size: 1.3rem; font-weight: 500; margin: 0.9rem 0 0.6rem; }
        .pane > p { font-size: 0.98rem; margin: 0 0 1.5rem; }
        .pane > .pill { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
                padding: 0.25rem 0.6rem; border-radius: 999px; color: var(--muted);
                border: var(--border-width) solid rgba(255,255,255,0.15); }
        .pane > .pill.on { color: #2c0b22; background: var(--accent); border-color: var(--accent); }
        .pane > .ring { width: 150px; height: 150px; border-radius: 50%; margin: 0 auto; position: relative;
                background: conic-gradient(var(--red) 0 40deg, var(--steel) 40deg 220deg,
                            var(--red) 220deg 250deg, var(--indigo) 250deg 360deg);
                -webkit-mask: radial-gradient(circle, transparent 52%, #000 53%);
                mask: radial-gradient(circle, transparent 52%, #000 53%);
                animation: spin 30s linear infinite; opacity: 0.8; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pane > .lanes { display: flex; flex-direction: column; gap: 0.55rem; }
        .lanes > div { display: flex; gap: 4px; height: 22px; }
        .lanes > div > i { display: block; border-radius: 5px; background: var(--sky); opacity: 0.85;
                   animation: breathe 6s ease-in-out infinite; }
        .lanes > div > i:nth-child(2) { background: var(--steel); animation-delay: -1.5s; }
        .lanes > div > i:nth-child(3) { background: var(--indigo); animation-delay: -3s; }
        .lanes > div > i:nth-child(4) { background: var(--lilac); animation-delay: -4.5s; }
        @keyframes breathe { 50% { opacity: 0.45; } }

        .body > .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
                gap: 1rem; margin-top: 0.5rem; }
        .grid > .feat { padding: 1.5rem; border-radius: 16px; background: rgba(255,255,255,0.03);
                border: var(--border-width) solid rgba(255,255,255,0.07);
                transition: border-color 0.3s, transform 0.3s, background 0.3s; }
        .grid > .feat:hover { border-color: rgba(212,176,230,0.45); background: rgba(212,176,230,0.06);
                      transform: translateY(-3px); }
        .feat > h4 { margin: 0 0 0.5rem; color: var(--white); font-size: 1.08rem; font-weight: 500; }
        .feat > p { font-size: 0.95rem; line-height: 1.6; margin: 0 0 1rem; }
        .feat > code { display: inline-block; font-size: 0.8rem; }
        .body > .more { margin-top: 2rem; background: none; border: none; color: var(--accent); font-size: 1rem; padding: 0; }
        .body > .more:hover { color: var(--white); }

        :host > .final { text-align: center; padding: 6rem 2rem 7rem; max-width: 900px; margin: 0 auto; }
        .final > h2 { font-size: clamp(2.2rem, 5vw, 3.6rem); letter-spacing: -0.03em; margin: 0 0 2rem;
                    color: var(--white); font-weight: 700; }
        .final > .cmd { display: inline-block; font-family: var(--font-mono); font-size: 1.05rem; color: var(--text);
               padding: 1rem 1.4rem; border-radius: var(--radius-lg); background: rgba(10,2,8,0.5);
               border: var(--border-width) solid rgba(255,255,255,0.1); margin-bottom: 2rem; max-width: 100%;
               overflow-x: auto; white-space: nowrap; }
        .cmd > .p { color: var(--sky); margin-right: 0.6rem; }
        .final > .buttons { display: flex; gap: 0.9rem; justify-content: center; flex-wrap: wrap; }
        .buttons > button { font-size: 1rem; padding: 0.8rem 1.5rem; border-radius: 999px; font-weight: 500; }
        .buttons > .primary { background: linear-gradient(135deg, #e3c3f0, #afc0d1); color: #2c0b22; border: none;
                   box-shadow: 0 10px 30px -10px rgba(212,176,230,0.7); }
        .buttons > .ghost { background: rgba(255,255,255,0.04); color: var(--text);
                 border: var(--border-width) solid rgba(255,255,255,0.16); }
        .buttons > .ghost:hover { border-color: var(--accent); }
    `,
})
export class HomePage extends RxElement {
    @Inject(Router) private readonly router!: Router;

    toInstall(): void { this.router.navigate('/install'); }
    toExamples(): void { this.router.navigate('/examples'); }
}
