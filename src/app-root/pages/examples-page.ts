import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common/escape';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuCollapse } from '../directives/toc-menu-collapse.directive.js';
import { MotionReveal } from '../directives/motion-reveal.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import '../components/toc-menu.component.js';
import '../components/cql-session.component.js';
import '../components/code-block.component.js';
import '../components/site-footer.component.js';

const SCHEMA = `CREATE KEYSPACE lexis WITH replication =
    {'class': 'NetworkTopologyStrategy', 'replication_factor': 1};
USE lexis;

CREATE TABLE docs (coll text, colid text, docid text, body text,
                   PRIMARY KEY ((coll, colid, docid)));`;

const INSERTS = `INSERT INTO docs (coll, colid, docid, body) VALUES ('collection', 'c1',  'd1',   'x');
INSERT INTO docs (coll, colid, docid, body) VALUES ('collection', 'c1',  'd2',   'y');
INSERT INTO docs (coll, colid, docid, body) VALUES ('collection', 'c42', 'd100', 'a');
INSERT INTO docs (coll, colid, docid, body) VALUES ('collection', 'c42', 'd101', 'b');
INSERT INTO docs (coll, colid, docid, body) VALUES ('collection', 'c42', 'd250', 'c');
INSERT INTO docs (coll, colid, docid, body) VALUES ('users',      'u7',  'p1',   'z');`;

const ALL = `SELECT * FROM docs;
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d1    | x
 collection | c1    | d2    | y
 collection | c42   | d100  | a
 collection | c42   | d101  | b
 collection | c42   | d250  | c
 users      | u7    | p1    | z`;

const ONE_COLLECTION = `SELECT * FROM docs WHERE coll = 'collection' AND colid = 'c42';
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c42   | d100  | a
 collection | c42   | d101  | b
 collection | c42   | d250  | c`;

const UNDER_PATH = `SELECT * FROM docs WHERE coll = 'collection';
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d1    | x
 collection | c1    | d2    | y
 collection | c42   | d100  | a
 collection | c42   | d101  | b
 collection | c42   | d250  | c`;

const PAGE = `SELECT * FROM docs WHERE coll = 'collection' AND colid = 'c42'
    AND docid > 'd100' LIMIT 2;
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c42   | d101  | b
 collection | c42   | d250  | c`;

const RANGE = `SELECT * FROM docs WHERE coll = 'collection' AND colid >= 'c1' AND colid < 'c2';
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d1    | x
 collection | c1    | d2    | y`;

const IN = `SELECT * FROM docs WHERE coll = 'collection' AND colid IN ('c1', 'c42');
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d1    | x
 collection | c1    | d2    | y
 collection | c42   | d100  | a
 collection | c42   | d101  | b
 collection | c42   | d250  | c`;

const IN_RANGE = `SELECT * FROM docs WHERE coll = 'collection' AND colid IN ('c1', 'c42')
    AND docid > 'd1';
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d2    | y
 collection | c42   | d100  | a
 collection | c42   | d101  | b
 collection | c42   | d250  | c`;

const LIMIT = `SELECT * FROM docs LIMIT 2;
---
 coll       | colid | docid | body
------------+-------+-------+------
 collection | c1    | d1    | x
 collection | c1    | d2    | y`;

const TOKEN = `SELECT coll, colid, docid, token(coll, colid, docid) FROM docs
    WHERE coll = 'collection' AND colid = 'c42' AND docid = 'd100';
---
 coll       | colid | docid | system.token(coll, colid, docid)
------------+-------+-------+--------------------------------------------------
 collection | c42   | d100  | 0x636f6c6c656374696f6e00006334320000643130300000`;

const INTS_SCHEMA = `CREATE TABLE readings (sensor int PRIMARY KEY, v int);
-- insert sensors -70000, -1, 0, 1, 70000 in any order`;

const INTS = `SELECT sensor FROM readings WHERE sensor > -1;
---
 sensor
--------
 0
 1
 70000`;




@Component({
    selector: 'examples-page',
    providers: [TocMenuItemsService],
    directives: [TocSection, TocAnchor, TocMenuCollapse, MotionReveal],
    template: `
        <div class="layout">
            <toc-menu toc-menu-collapse></toc-menu>
            <main class="content">
                <header class="intro" toc-section="examples">
                    <span class="eyebrow">examples</span>
                    <h1 toc-anchor="examples">Motivation</h1>
                    <p class="lede">Hierarchical keys are a common pattern: document stores, file and
                       object stores, and multi-tenant data all address records by a path. For
                       example, a document store with each document at
                       <code class="inline">/collection/{collectionId}/documents/{documentId}</code>,
                       and the whole path as the partition key.</p>
                    <p class="lede">In ScyllaDB the token is a hash of the whole path, so only a complete
                       path can be looked up efficiently. Listing a collection, paging through it, or
                       listing collections all name just the start of a path, and ScyllaDB rejects them:</p>
                    <pre class="err">Cannot execute this query as it might involve data filtering and thus may have unpredictable performance. If you want to execute this query despite the performance unpredictability, use ALLOW FILTERING</pre>
                    <p class="lede">or, for a range on part of the path:</p>
                    <pre class="err">Only EQ and IN relation are supported on the partition key (unless you use the token() function or allow filtering)</pre>
                    <p class="lede">With <code class="inline">ALLOW FILTERING</code> they run as full scans
                       of every node and return rows in hash order. The usual workarounds are a secondary
                       index, a second table keyed for each access pattern, or moving docid into a
                       clustering column, which puts a whole collection into one partition that cannot
                       be split.</p>
                    <p class="lede">In Lexis the token is the path itself, encoded so that byte order is
                       path order. Documents that share a prefix are stored together, so each of these
                       patterns becomes a read of one contiguous range of tablets, in path order, without
                       <code class="inline">ALLOW FILTERING</code>.</p>
                </header>

                <section class="cat" toc-section="setup">
                    <h2 toc-anchor="setup">Setup</h2>
                    <p class="note">One table, keyed by the whole document path.</p>

                    <section class="ex" toc-section="setup/schema">
                        <h3 toc-anchor="setup/schema">Schema</h3>
                        <p class="note">Plain CQL. Every table in Lexis is ordered, so there is no
                           partitioner option to set. Tablets are on by default for new keyspaces.</p>
                        <cql-session motion-reveal>${escape`${SCHEMA}`}</cql-session>
                        <cql-session motion-reveal>${escape`${INSERTS}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="setup/full-scan">
                        <h3 toc-anchor="setup/full-scan">Full scan</h3>
                        <p class="note">Whatever order the rows were written in, a scan returns
                           partitions sorted by key.</p>
                        <cql-session pk="3" badge="key order" motion-reveal>${escape`${ALL}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="prefixes">
                    <h2 toc-anchor="prefixes">Prefix queries</h2>
                    <p class="note">Name the start of a path. Matches share a token prefix, so
                       they are one contiguous range.</p>

                    <section class="ex" toc-section="prefixes/one-collection">
                        <h3 toc-anchor="prefixes/one-collection" toc-label="One collection">All documents in one collection</h3>
                        <cql-session pk="3" badge="range read" motion-reveal>${escape`${ONE_COLLECTION}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="prefixes/under-a-path">
                        <h3 toc-anchor="prefixes/under-a-path" toc-label="Under a path">Every collection under a path</h3>
                        <p class="note">Just the first component: everything below
                           <code class="inline">collection</code>.</p>
                        <cql-session pk="3" badge="range read" motion-reveal>${escape`${UNDER_PATH}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="ranges">
                    <h2 toc-anchor="ranges">Range queries</h2>
                    <p class="note">A range on the component after an equality prefix is a token range too.</p>

                    <section class="ex" toc-section="ranges/paging">
                        <h3 toc-anchor="ranges/paging" toc-label="Paging">A page of documents</h3>
                        <p class="note">Resume after the last document you saw.</p>
                        <cql-session pk="3" badge="range read" motion-reveal>${escape`${PAGE}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="ranges/collections">
                        <h3 toc-anchor="ranges/collections" toc-label="Collection range">A range of collections</h3>
                        <p class="note">Text compares byte by byte, so
                           <code class="inline">'c42' &gt;= 'c2'</code> and c42 falls outside
                           <code class="inline">['c1', 'c2')</code>.</p>
                        <cql-session pk="3" badge="range read" motion-reveal>${escape`${RANGE}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="several">
                    <h2 toc-anchor="several">IN queries</h2>
                    <p class="note"><code class="inline">IN</code> on a component gives one range per value.</p>

                    <section class="ex" toc-section="several/in">
                        <h3 toc-anchor="several/in" toc-label="Several collections">Several collections at once</h3>
                        <cql-session pk="3" badge="2 ranges" motion-reveal>${escape`${IN}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="several/in-then-range">
                        <h3 toc-anchor="several/in-then-range" toc-label="IN, then a range">Several collections at once, from a given document on</h3>
                        <p class="note">Each path in the <code class="inline">IN</code> list can end in a range.</p>
                        <div class="paths" motion-reveal>
                            <div><span class="ok">ok</span><code>collection / c42 / *</code><em>all documents in c42</em></div>
                            <div><span class="ok">ok</span><code>collection / c42 / d100..d200</code><em>a range at the end</em></div>
                            <div><span class="ok">ok</span><code>collection / {c1, c42} / d100..*</code><em>two paths, each ending in a range</em></div>
                            <div><span class="no">not ok</span><code>collection / * / d100</code><em>a gap in the middle, so the matches are not next to each other</em></div>
                        </div>
                        <cql-session pk="3" badge="2 ranges" motion-reveal>${escape`${IN_RANGE}`}</cql-session>
                        <p class="note">d1 is excluded, and since <code class="inline">'d100' &gt; 'd1'</code>
                           in text order, all of c42 is included.</p>
                    </section>
                </section>

                <section class="cat" toc-section="ordering">
                    <h2 toc-anchor="ordering">Ordering</h2>
                    <p class="note">Key order is the storage order, for every key type that has one.</p>

                    <section class="ex" toc-section="ordering/first-rows">
                        <h3 toc-anchor="ordering/first-rows" toc-label="First rows">The first rows of the whole table, in key order</h3>
                        <p class="note"><code class="inline">LIMIT</code> on a full scan returns the
                           first keys of the table.</p>
                        <cql-session pk="3" badge="key order" motion-reveal>${escape`${LIMIT}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="ordering/numbers">
                        <h3 toc-anchor="ordering/numbers">Numeric keys</h3>
                        <p class="note"><code class="inline">int</code>,
                           <code class="inline">bigint</code>, <code class="inline">varint</code>,
                           <code class="inline">decimal</code> and <code class="inline">timestamp</code>
                           keys sort in CQL order, negatives included, and ranges on them are token ranges.</p>
                        <code-block syntax="cql" filename="schema" motion-reveal>${escape`${INTS_SCHEMA}`}</code-block>
                        <cql-session pk="1" badge="range read" motion-reveal>${escape`${INTS}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="tokens">
                    <h2 toc-anchor="tokens">Tokens</h2>
                    <p class="note">The token is the key, so you can read it.</p>

                    <section class="ex" toc-section="tokens/blob">
                        <h3 toc-anchor="tokens/blob">token() is a blob</h3>
                        <p class="note"><code class="inline">token()</code> returns the encoded key:
                           each component's bytes, then <code class="inline">00 00</code>. Here that is
                           <span class="c0">collection</span>, <span class="c1">c42</span>,
                           <span class="c2">d100</span>.</p>
                        <cql-session pk="3" motion-reveal>${escape`${TOKEN}`}</cql-session>
                        <div class="decoded" motion-reveal>
                            <span class="c0">636f6c6c656374696f6e</span><span class="t">0000</span><span class="c1">633432</span><span class="t">0000</span><span class="c2">64313030</span><span class="t">0000</span>
                        </div>
                    </section>
                </section>
            </main>
        </div>
        <site-footer></site-footer>
    `,
    styles: `
        :host { display: block; min-height: 100vh; color: var(--text); }
        :host > .layout { display: flex; }
        .layout > .content { flex: 1 1 0; min-width: 0; padding: 6.5rem 2.5rem 5rem; max-width: 1020px; }
        .content > .intro { margin-bottom: 3rem; }
        .intro > .eyebrow { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.2em;
                   text-transform: uppercase; color: var(--sky); }
        .intro > h1 { color: var(--white); font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 700;
             letter-spacing: -0.03em; margin: 0.6rem 0 1rem; line-height: 1.05; }
        .content > .cat { padding: 3rem 0 0.5rem; border-top: var(--border-width) solid rgba(255,255,255,0.08); }
        .cat > h2 { color: var(--white); font-size: 1.9rem; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
        .cat > .ex { padding: 1.75rem 0 0.75rem; margin-left: 0.25rem; }
        .ex > h3 { color: var(--white); font-size: 1.2rem; font-weight: 500; margin: 0 0 0.6rem; }
        .intro > .lede { color: var(--secondary); line-height: 1.75; max-width: 70ch; margin: 0 0 1rem; font-size: 1.08rem; font-weight: 300; }
        .intro > .err { margin: 0 0 1rem; padding: 0.8rem 1rem; max-width: 70ch; white-space: pre-wrap;
                        font-family: var(--font-mono); font-size: 0.85rem; line-height: 1.55; color: var(--subtle);
                        background: rgba(10,2,12,0.45); border-left: 2px solid var(--rose); border-radius: var(--radius-sm); }
        .note { color: var(--secondary); line-height: 1.7; max-width: 70ch; margin: 0 0 1.1rem; font-weight: 300; }
        .inline { font-family: var(--font-mono); background: rgba(255,255,255,0.07); padding: 0.08rem 0.4rem;
                  border-radius: 4px; color: var(--accent); font-size: 0.95em; }
        .ex > cql-session, .ex > code-block { margin-bottom: 1rem; }
        .ex > .paths { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.25rem;
                 font-family: var(--font-mono); font-size: 0.9rem; }
        .paths > div { display: grid; grid-template-columns: 3.6rem minmax(14rem, auto) 1fr; gap: 0.9rem;
                     align-items: center; padding: 0.55rem 0.9rem; border-radius: var(--radius);
                     background: rgba(255,255,255,0.03); border: var(--border-width) solid rgba(255,255,255,0.06); }
        .paths > div > code { color: var(--text); }
        .paths > div > em { color: var(--dim); font-style: normal; font-family: var(--font-sans); font-size: 0.85rem; }
        .paths > div > .ok, .paths > div > .no { font-size: 0.66rem; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.06em; text-align: center;
                                 border-radius: 999px; padding: 0.1rem 0; color: #2c0b22; font-family: var(--font-sans); }
        .paths > div > .ok { background: var(--green); }
        .paths > div > .no { background: var(--red); }
        .ex > .decoded { font-family: var(--font-mono); font-size: 1rem; padding: 1rem 1.25rem; border-radius: var(--radius-lg);
                   background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12);
                   overflow-x: auto; white-space: nowrap; letter-spacing: 0.04em; }
        .ex .c0 { color: var(--sky); } .ex .c1 { color: var(--accent); } .ex .c2 { color: var(--gold); }
        .decoded > .t { color: var(--dim); }
        @media (max-width: 768px) {
            .layout > .content { padding: 5.5rem 1.1rem 4rem; }
            .paths > div { grid-template-columns: 3.4rem 1fr; }
            .paths > div > em { grid-column: 2; }
        }
    `,
})
export class ExamplesPage extends RxElement {}
