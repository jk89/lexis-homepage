import { Component } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common/escape';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuCollapse } from '../directives/toc-menu-collapse.directive.js';
import { MotionReveal } from '../directives/motion-reveal.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import { DocPage } from '../components/doc-page.component.js';
import styles from './examples-page.css';
import '../components/toc-menu.component.js';
import '../components/cql-session.component.js';
import '../components/code-block.component.js';
import '../components/site-footer.component.js';

const SCHEMA = `CREATE KEYSPACE lexis WITH replication =
    {'class': 'NetworkTopologyStrategy', 'replication_factor': 1};
USE lexis;

CREATE TABLE user_orders (user_id text, order_id text, item text,
                          PRIMARY KEY ((user_id, order_id)));`;

const INSERTS = `INSERT INTO user_orders (user_id, order_id, item) VALUES ('u7',  'o5',   'pen');
INSERT INTO user_orders (user_id, order_id, item) VALUES ('u42', 'o250', 'mug');
INSERT INTO user_orders (user_id, order_id, item) VALUES ('u1',  'o2',   'lamp');
INSERT INTO user_orders (user_id, order_id, item) VALUES ('u42', 'o100', 'desk');
INSERT INTO user_orders (user_id, order_id, item) VALUES ('u1',  'o1',   'book');
INSERT INTO user_orders (user_id, order_id, item) VALUES ('u42', 'o101', 'chair');`;

const ALL = `SELECT * FROM user_orders;
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u1      | o2       | lamp
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug
 u7      | o5       | pen`;

const ONE_USER = `SELECT * FROM user_orders WHERE user_id = 'u42';
---
 user_id | order_id | item
---------+----------+-------
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug`;

const PAGE = `SELECT * FROM user_orders WHERE user_id = 'u42'
    AND order_id > 'o100' LIMIT 2;
---
 user_id | order_id | item
---------+----------+-------
 u42     | o101     | chair
 u42     | o250     | mug`;

const WINDOW = `SELECT * FROM user_orders WHERE user_id = 'u42'
    AND order_id >= 'o100' AND order_id < 'o200';
---
 user_id | order_id | item
---------+----------+-------
 u42     | o100     | desk
 u42     | o101     | chair`;

const USER_RANGE = `SELECT * FROM user_orders WHERE user_id >= 'u1' AND user_id < 'u5';
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u1      | o2       | lamp
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug`;

const AFTER = `SELECT * FROM user_orders WHERE user_id > 'u1';
---
 user_id | order_id | item
---------+----------+-------
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug
 u7      | o5       | pen`;

const BEFORE = `SELECT * FROM user_orders WHERE user_id < 'u7';
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u1      | o2       | lamp
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug`;

const IN = `SELECT * FROM user_orders WHERE user_id IN ('u1', 'u42');
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u1      | o2       | lamp
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug`;

const IN_RANGE = `SELECT * FROM user_orders WHERE user_id IN ('u1', 'u42')
    AND order_id > 'o1';
---
 user_id | order_id | item
---------+----------+-------
 u1      | o2       | lamp
 u42     | o100     | desk
 u42     | o101     | chair
 u42     | o250     | mug`;

const ORDERS_IN = `SELECT * FROM user_orders WHERE user_id = 'u42'
    AND order_id IN ('o100', 'o250');
---
 user_id | order_id | item
---------+----------+-------
 u42     | o100     | desk
 u42     | o250     | mug`;

const CROSS = `SELECT * FROM user_orders WHERE user_id IN ('u1', 'u42')
    AND order_id IN ('o1', 'o100');
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u42     | o100     | desk`;

const LIMIT = `SELECT * FROM user_orders LIMIT 2;
---
 user_id | order_id | item
---------+----------+-------
 u1      | o1       | book
 u1      | o2       | lamp`;

const TOKEN = `SELECT user_id, order_id, token(user_id, order_id) FROM user_orders
    WHERE user_id = 'u42' AND order_id = 'o100';
---
 user_id | order_id | system.token(user_id, order_id)
---------+----------+---------------------------------
 u42     | o100     | 0x75343200006f3130300000`;

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
                    <p class="lede">Records that belong to a parent are a common pattern: a user's
                       orders, a tenant's documents, a device's readings. Key them by the parent's id
                       and then their own, with both as the partition key, and every record is its own
                       partition. For example, <code class="inline">user_orders</code> keyed by
                       <code class="inline">(user_id, order_id)</code>.</p>
                    <p class="lede">In ScyllaDB the token is a hash of the whole key, so only a complete
                       key can be looked up efficiently. Listing a user's orders, paging through them,
                       or ranging over users all name just the start of the key, and ScyllaDB rejects them:</p>
                    <pre class="err">Cannot execute this query as it might involve data filtering and thus may have unpredictable performance. If you want to execute this query despite the performance unpredictability, use ALLOW FILTERING</pre>
                    <p class="lede">or, for a range on part of the key:</p>
                    <pre class="err">Only EQ and IN relation are supported on the partition key (unless you use the token() function or allow filtering)</pre>
                    <p class="lede">With <code class="inline">ALLOW FILTERING</code> they run as full scans
                       of every node and return rows in hash order. The usual workarounds are a secondary
                       index, a second table keyed for each access pattern, or moving order_id into a
                       clustering column, which puts all of a user's orders into one partition that cannot
                       be split.</p>
                    <p class="lede">In Lexis the token is the key itself, encoded so that byte order is
                       key order. Keys that share a prefix are stored together, so each of these patterns
                       becomes a read of one contiguous range of tablets, in key order, without
                       <code class="inline">ALLOW FILTERING</code>.</p>
                </header>

                <section class="cat" toc-section="setup">
                    <h2 toc-anchor="setup">Setup</h2>
                    <p class="note">One table, keyed by the user and then the order.</p>

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
                           partitions sorted by key*.</p>
                        <cql-session pk="2" badge="key order" motion-reveal>${escape`${ALL}`}</cql-session>
                        <p class="note footnote">* <code class="inline">'u42'</code> comes before
                           <code class="inline">'u7'</code> due to lexicographic ordering. If you want numeric
                           order, make the column a numeric type such as <code class="inline">bigint</code>.</p>
                    </section>
                </section>

                <section class="cat" toc-section="prefixes">
                    <h2 toc-anchor="prefixes">Prefix queries</h2>
                    <p class="note">Name the start of a key. Matches share a token prefix, so
                       they are one contiguous range.</p>

                    <section class="ex" toc-section="prefixes/one-user">
                        <h3 toc-anchor="prefixes/one-user" toc-label="One user">All of one user's orders</h3>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${ONE_USER}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="ranges">
                    <h2 toc-anchor="ranges">Range queries</h2>
                    <p class="note">A range on any component, after an equality prefix or on the
                       leading component alone, is a token range too.</p>

                    <section class="ex" toc-section="ranges/paging">
                        <h3 toc-anchor="ranges/paging" toc-label="Paging">A page of a user's orders</h3>
                        <p class="note">Resume after the last order you saw.</p>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${PAGE}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="ranges/window">
                        <h3 toc-anchor="ranges/window" toc-label="Window">A window of a user's orders</h3>
                        <p class="note">Both ends bounded, on the component after the prefix.</p>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${WINDOW}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="ranges/users">
                        <h3 toc-anchor="ranges/users" toc-label="User range">A range of users</h3>
                        <p class="note">No order named: every order of every user in the range*.</p>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${USER_RANGE}`}</cql-session>
                        <p class="note footnote">* <code class="inline">'u42'</code> falls inside <code class="inline">['u1', 'u5')</code> due to lexicographic ordering.</p>
                    </section>

                    <section class="ex" toc-section="ranges/after">
                        <h3 toc-anchor="ranges/after" toc-label="Open-ended">Every user after a given one</h3>
                        <p class="note">A one-sided range on the leading component: every order of
                           every user after <code class="inline">'u1'</code>, in key order.</p>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${AFTER}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="ranges/before">
                        <h3 toc-anchor="ranges/before" toc-label="Before">Every user before a given one</h3>
                        <p class="note">The other direction: every order of every user before <code class="inline">'u7'</code>*.</p>
                        <cql-session pk="2" badge="range read" motion-reveal>${escape`${BEFORE}`}</cql-session>
                        <p class="note footnote">* <code class="inline">'u42'</code> is included due to lexicographic ordering.</p>
                    </section>
                </section>

                <section class="cat" toc-section="several">
                    <h2 toc-anchor="several">IN queries</h2>
                    <p class="note"><code class="inline">IN</code> on a component gives one range per value.</p>

                    <section class="ex" toc-section="several/in">
                        <h3 toc-anchor="several/in" toc-label="Several users">Several users at once</h3>
                        <cql-session pk="2" badge="2 ranges" motion-reveal>${escape`${IN}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="several/in-then-range">
                        <h3 toc-anchor="several/in-then-range" toc-label="IN, then a range">Several users at once, from a given order on</h3>
                        <p class="note">Each user in the <code class="inline">IN</code> list can end in a range*.</p>
                        <div class="paths" motion-reveal>
                            <div><span class="ok">ok</span><code>u42 / *</code><em>all of <code class="inline">'u42'</code>'s orders</em></div>
                            <div><span class="ok">ok</span><code>u42 / o100..o200</code><em>a range at the end</em></div>
                            <div><span class="ok">ok</span><code>{u1, u42} / o100..*</code><em>two users, each ending in a range</em></div>
                            <div><span class="ok">ok</span><code>u1..u5 / *</code><em>a range of users, no order named</em></div>
                            <div><span class="no">not ok</span><code>* / o100</code><em>no user named, so the matches are not next to each other</em></div>
                        </div>
                        <cql-session pk="2" badge="2 ranges" motion-reveal>${escape`${IN_RANGE}`}</cql-session>
                        <p class="note footnote">* <code class="inline">'o1'</code> is excluded, and all of <code class="inline">'u42'</code>'s orders are included since
                           <code class="inline">'o100' &gt; 'o1'</code> lexicographically.</p>
                    </section>

                    <section class="ex" toc-section="several/orders">
                        <h3 toc-anchor="several/orders" toc-label="Specific orders">Specific orders of one user</h3>
                        <p class="note"><code class="inline">IN</code> on the second component: one exact key per value.</p>
                        <cql-session pk="2" badge="2 keys" motion-reveal>${escape`${ORDERS_IN}`}</cql-session>
                    </section>

                    <section class="ex" toc-section="several/cross">
                        <h3 toc-anchor="several/cross" toc-label="IN × IN">Specific orders of several users</h3>
                        <p class="note"><code class="inline">IN</code> on both components: every
                           combination, and only the ones that exist come back.</p>
                        <cql-session pk="2" badge="4 keys" motion-reveal>${escape`${CROSS}`}</cql-session>
                    </section>
                </section>

                <section class="cat" toc-section="ordering">
                    <h2 toc-anchor="ordering">Ordering</h2>
                    <p class="note">Key order is the storage order, for every key type that has one.</p>

                    <section class="ex" toc-section="ordering/first-rows">
                        <h3 toc-anchor="ordering/first-rows" toc-label="First rows">The first rows of the whole table, in key order</h3>
                        <p class="note"><code class="inline">LIMIT</code> on a full scan returns the
                           first keys of the table.</p>
                        <cql-session pk="2" badge="key order" motion-reveal>${escape`${LIMIT}`}</cql-session>
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
                           <span class="c0">u42</span>, then <span class="c1">o100</span>.</p>
                        <cql-session pk="2" motion-reveal>${escape`${TOKEN}`}</cql-session>
                        <div class="decoded" motion-reveal>
                            <span class="c0">753432</span><span class="t">0000</span><span class="c1">6f313030</span><span class="t">0000</span>
                        </div>
                    </section>
                </section>
            </main>
        </div>
        <site-footer></site-footer>
    `,
    styles,
})
export class ExamplesPage extends DocPage {}
