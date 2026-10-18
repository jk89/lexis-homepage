import { Component, Inject, RxElement } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { MotionReveal } from '../directives/motion-reveal.directive.js';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuItemsService, TOC_ROOT_BASE } from '../services/toc-menu-items.service.js';
import './home-page/hero-section.component.js';
import './home-page/story-section.component.js';
import './home-page/partition-viz.component.js';
import './home-page/token-sort.component.js';
import './home-page/tablet-split.component.js';
import '../components/site-footer.component.js';
import styles from './home-page.css';

@Component({
    selector: 'home-page',
    // Served at /, so its section URLs live under /overview (also routed to this page).
    providers: [TocMenuItemsService, { provide: TOC_ROOT_BASE, useValue: '/overview' }],
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
                    <code>WHERE user_id = 'u42'</code>
                </div>
                <div class="feat" motion-reveal="0.08">
                    <h4>Ranges on any component</h4>
                    <p>Range over users without naming one, or page through one user's orders,
                       with no full-cluster scatter.</p>
                    <code>WHERE user_id &gt; 'u1'</code>
                </div>
                <div class="feat" motion-reveal="0.16">
                    <h4>IN, then a range</h4>
                    <p>Several prefixes at once, each ending in a range: one bounded read per prefix.</p>
                    <code>user_id IN ('u1','u42') AND order_id &gt; 'o1'</code>
                </div>
                <div class="feat" motion-reveal="0.24">
                    <h4>LIMIT means first</h4>
                    <p>A LIMIT on a full scan returns the first keys of the table, in order.</p>
                    <code>SELECT * FROM user_orders LIMIT 2</code>
                </div>
                <div class="feat" motion-reveal="0.32">
                    <h4>Simpler data models</h4>
                    <p>For range-ordered access patterns, secondary indexes and denormalized
                       tables become unnecessary. One table, keyed by parent then child.</p>
                    <code>PRIMARY KEY ((user_id, order_id))</code>
                </div>
                <div class="feat" motion-reveal="0.4">
                    <h4>Routed by the drivers</h4>
                    <p>The Python and Rust drivers compute Lexis tokens on the client and send each
                       query to the node and shard that own it.</p>
                    <code>token() → blob</code>
                </div>
                <div class="feat" motion-reveal="0.48">
                    <h4>Windows, both ways</h4>
                    <p>Bound a range at either end, or both: everything below a key, or a window
                       of one user's orders.</p>
                    <code>order_id &gt;= 'o100' AND order_id &lt; 'o200'</code>
                </div>
                <div class="feat" motion-reveal="0.64">
                    <h4>Typed order</h4>
                    <p>Integers (negatives included), varint, decimal and timestamp keys sort and
                       range in their natural order.</p>
                    <code>user_id bigint</code>
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
    styles,
})
export class HomePage extends RxElement {
    @Inject(Router) private readonly router!: Router;

    toInstall(): void { this.router.navigate('/install'); }
    toExamples(): void { this.router.navigate('/examples'); }
}
