import { Component, RxElement } from '@yaw-rx/core';
import { escape } from '@yaw-rx/common/escape';
import { TocSection } from '../directives/toc-section.directive.js';
import { TocAnchor } from '../directives/toc-anchor.directive.js';
import { TocMenuCollapse } from '../directives/toc-menu-collapse.directive.js';
import { MotionReveal } from '../directives/motion-reveal.directive.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';
import '../components/toc-menu.component.js';
import '../components/code-block.component.js';
import '../components/site-footer.component.js';

const DOCS = 'https://opensource.docs.scylladb.com/branch-6.2';

const SINGLE_NODE = `docker run --name lexisdb -d 0x6a6f6e6e79/lexisdb`;

const WITH_CQLSH = `docker network create lexis
docker run --name lexisdb --network lexis -d 0x6a6f6e6e79/lexisdb

# once the node is up
docker run -it --rm --network lexis 0x6a6f6e6e79/lexis-cqlsh lexisdb`;

const COMPOSE = `services:
  lexis-1:
    image: 0x6a6f6e6e79/lexisdb
    command: --seeds=lexis-1 --smp 1 --memory 1G --overprovisioned 1
  lexis-2:
    image: 0x6a6f6e6e79/lexisdb
    command: --seeds=lexis-1 --smp 1 --memory 1G --overprovisioned 1
    depends_on: [lexis-1]
  lexis-3:
    image: 0x6a6f6e6e79/lexisdb
    command: --seeds=lexis-1 --smp 1 --memory 1G --overprovisioned 1
    depends_on: [lexis-2]`;

const COMPOSE_UP = `docker compose up -d
docker compose exec lexis-1 nodetool status`;

const CQLSH_PIP = `pip install git+https://github.com/jk89/lexis-cqlsh
cqlsh <host>`;

const CQLSH_DOCKER = `docker run -it --rm 0x6a6f6e6e79/lexis-cqlsh <host>`;

const PY_INSTALL = `pip uninstall scylla-driver cassandra-driver
pip install git+https://github.com/jk89/lexis-python-driver`;

const PY_USE = `from cassandra.cluster import Cluster

session = Cluster(['127.0.0.1']).connect('lexis')

# Every document in collection c42, in path order.
rows = session.execute(
    "SELECT docid, body FROM docs WHERE coll = %s AND colid = %s",
    ('collection', 'c42'),
)
for row in rows:
    print(row.docid, row.body)`;

const RS_TOML = `[dependencies]
scylla = { git = "https://github.com/jk89/lexis-rust-driver" }`;

const RS_USE = `use scylla::client::session_builder::SessionBuilder;

let session = SessionBuilder::new()
    .known_node("127.0.0.1:9042")
    .use_keyspace("lexis", false)
    .build()
    .await?;

// Every collection under "collection", in path order.
let rows = session
    .query_unpaged("SELECT colid, docid FROM docs WHERE coll = ?", ("collection",))
    .await?
    .into_rows_result()?;
for row in rows.rows::<(String, String)>()? {
    let (colid, docid) = row?;
    println!("{colid}/{docid}");
}`;

const NODETOOL = `nodetool status
nodetool repair -st <hex token> -et <hex token> lexis docs`;

const BUILD = `git clone https://github.com/jk89/lexisdb
cd lexisdb
docker pull docker.io/scylladb/scylla-toolchain:fedora-40-20240710

DBUILD_TOOL=docker ./tools/toolchain/dbuild ./configure.py --mode=dev --build-dir=build
DBUILD_TOOL=docker ./tools/toolchain/dbuild ninja build/dev/scylla`;

@Component({
    selector: 'install-page',
    providers: [TocMenuItemsService],
    directives: [TocSection, TocAnchor, TocMenuCollapse, MotionReveal],
    template: `
        <div class="layout">
            <toc-menu toc-menu-collapse></toc-menu>
            <main class="content">
                <header class="intro" toc-section="install">
                    <span class="eyebrow">install</span>
                    <h1 toc-anchor="install" toc-label="Install">Get Lexis running</h1>
                    <p class="lede">Get a node running, connect the clients that speak Lexis
                       tokens, and start querying in key order. Lexis 1.0 is a fork of ScyllaDB 6.2,
                       so for configuration and operations, the
                       <a href="${DOCS}/" target="_blank" rel="noopener">ScyllaDB 6.2 documentation</a>
                       applies.</p>
                </header>

                <section class="cat" toc-section="run">
                    <h2 toc-anchor="run">Run Lexis</h2>
                    <p class="note">A single node in one command, or a cluster with Compose.</p>

                    <section class="ex" toc-section="run/quick-start">
                        <h3 toc-anchor="run/quick-start">Quick start</h3>
                        <p class="note">One node, one command.</p>
                        <code-block syntax="bash" filename="terminal" motion-reveal>${escape`${SINGLE_NODE}`}</code-block>
                        <p class="note">With cqlsh alongside it, on a shared Docker network:</p>
                        <code-block syntax="bash" filename="terminal" motion-reveal>${escape`${WITH_CQLSH}`}</code-block>
                        <p class="note">Then try the <a href="/examples">examples</a>.</p>
                    </section>

                    <section class="ex" toc-section="run/cluster">
                        <h3 toc-anchor="run/cluster">Cluster</h3>
                        <p class="note">The image takes the usual node options:
                           <code class="inline">--seeds</code>, <code class="inline">--smp</code>,
                           <code class="inline">--memory</code> and the rest. See
                           <a href="${DOCS}/operating-scylla/procedures/tips/best-practices-scylla-on-docker.html" target="_blank" rel="noopener">running on Docker</a>.</p>
                        <code-block syntax="yaml" filename="compose.yaml" motion-reveal>${escape`${COMPOSE}`}</code-block>
                        <code-block syntax="bash" filename="terminal" motion-reveal>${escape`${COMPOSE_UP}`}</code-block>
                    </section>

                    <section class="ex" toc-section="run/images">
                        <h3 toc-anchor="run/images">Images</h3>
                        <div class="table" motion-reveal>
                            <div class="row head"><span>Component</span><span>Get it</span><span>Version</span></div>
                            <div class="row"><span><b>lexisdb</b> the database</span><code>0x6a6f6e6e79/lexisdb</code><span class="pill">v1.0.0</span></div>
                            <div class="row"><span><b>lexis-cqlsh</b> CQL shell</span><code>0x6a6f6e6e79/lexis-cqlsh</code><span class="pill">v1.0.0</span></div>
                            <div class="row"><span><b>lexis-python-driver</b></span><code>pip install git+https://github.com/jk89/lexis-python-driver</code><span class="pill">v1.0.0</span></div>
                            <div class="row"><span><b>lexis-rust-driver</b></span><code>scylla = { git = "https://github.com/jk89/lexis-rust-driver" }</code><span class="pill">v1.0.0</span></div>
                            <div class="row"><span><b>lexis-tools-java</b> nodetool, sstable tools</span><code>github.com/jk89/lexis-tools-java</code><span class="pill">v1.0.0</span></div>
                            <div class="row"><span><b>lexis-jmx</b> JMX proxy</span><code>github.com/jk89/lexis-jmx</code><span class="pill">v1.0.0</span></div>
                        </div>
                    </section>
                </section>

                <section class="cat" toc-section="clients">
                    <h2 toc-anchor="clients">Clients</h2>
                    <p class="note">cqlsh, drivers and tools that speak Lexis tokens. The drivers compute tokens on the client, so each query goes straight to the node and shard that own its partition, following Lexis tablet routing.</p>

                    <section class="ex" toc-section="clients/cqlsh">
                        <h3 toc-anchor="clients/cqlsh">cqlsh</h3>
                        <p class="note"><code class="inline">token()</code> values print as hex blobs.
                           <code class="inline">COPY TO</code> and <code class="inline">COPY FROM</code>
                           split work by Lexis token ranges, and <code class="inline">BEGINTOKEN</code>,
                           <code class="inline">ENDTOKEN</code> and <code class="inline">SHOW REPLICAS</code>
                           take hex tokens. Installing it also installs the Lexis Python driver.</p>
                        <code-block syntax="bash" filename="pip" motion-reveal>${escape`${CQLSH_PIP}`}</code-block>
                        <code-block syntax="bash" filename="docker" motion-reveal>${escape`${CQLSH_DOCKER}`}</code-block>
                    </section>

                    <section class="ex" toc-section="clients/python">
                        <h3 toc-anchor="clients/python">Python</h3>
                        <p class="note">The package is <code class="inline">lexis-driver</code>, imported as
                           <code class="inline">cassandra</code> like upstream, so remove other drivers first.
                           <code class="inline">token()</code> values come back as
                           <code class="inline">bytes</code>.</p>
                        <code-block syntax="bash" filename="pip" motion-reveal>${escape`${PY_INSTALL}`}</code-block>
                        <code-block syntax="python" filename="app.py" motion-reveal>${escape`${PY_USE}`}</code-block>
                    </section>

                    <section class="ex" toc-section="clients/rust">
                        <h3 toc-anchor="clients/rust">Rust</h3>
                        <p class="note">A drop-in for the <code class="inline">scylla</code> crate.
                           <code class="inline">token()</code> values are read as
                           <code class="inline">Vec&lt;u8&gt;</code>.</p>
                        <code-block syntax="toml" filename="Cargo.toml" motion-reveal>${escape`${RS_TOML}`}</code-block>
                        <code-block syntax="rust" filename="main.rs" motion-reveal>${escape`${RS_USE}`}</code-block>
                    </section>

                    <section class="ex" toc-section="clients/tools">
                        <h3 toc-anchor="clients/tools">Tools</h3>
                        <p class="note"><code class="inline">lexis-tools-java</code> reads and writes Lexis
                           sstables (<code class="inline">sstabledump</code>,
                           <code class="inline">sstablemetadata</code>,
                           <code class="inline">sstableloader</code>), and
                           <code class="inline">nodetool</code> works against a Lexis node through
                           <code class="inline">lexis-jmx</code>. Tokens are shown and accepted as hex.</p>
                        <code-block syntax="bash" filename="terminal" motion-reveal>${escape`${NODETOOL}`}</code-block>
                    </section>
                </section>

                <section class="cat" toc-section="build">
                    <h2 toc-anchor="build">Build from source</h2>
                    <p class="note">Docker is all you need on the host.</p>

                    <section class="ex" toc-section="build/toolchain">
                        <h3 toc-anchor="build/toolchain">Toolchain</h3>
                        <p class="note">Lexis builds inside a toolchain container, so the only thing
                           you need on the host is Docker. The first build takes a while;
                           after that, builds are incremental. Full details are in
                           <a href="https://github.com/jk89/lexisdb/blob/develop/guide-build-and-test.md" target="_blank" rel="noopener">guide-build-and-test.md</a>.</p>
                        <code-block syntax="bash" filename="terminal" motion-reveal>${escape`${BUILD}`}</code-block>
                    </section>
                </section>

                <section class="cat" toc-section="reference">
                    <h2 toc-anchor="reference">Reference</h2>
                    <p class="note">What Lexis adds, and where to read about everything else.</p>

                    <section class="ex" toc-section="reference/whats-new">
                        <h3 toc-anchor="reference/whats-new">What's new</h3>
                        <div class="cards">
                            <div class="card" motion-reveal="0">
                                <h4>Ordered partitioner</h4>
                                <p>Every table is partitioned by an order-preserving encoding of its key,
                                   on tablets. Full scans return partitions in key order.</p>
                            </div>
                            <div class="card" motion-reveal="0.06">
                                <h4>Partial key queries</h4>
                                <p>A prefix of the partition key, a range on its next column, or an
                                   <code class="inline">IN</code> followed by a range are served as range reads.</p>
                            </div>
                            <div class="card" motion-reveal="0.12">
                                <h4>Blob tokens</h4>
                                <p><code class="inline">token()</code> returns the encoded key as a blob. cqlsh
                                   and the tools show tokens as hex.</p>
                            </div>
                            <div class="card" motion-reveal="0.18">
                                <h4>Typed ordering</h4>
                                <p>Text, integers, varints, decimals and timestamps sort in CQL order,
                                   negatives included.</p>
                            </div>
                            <div class="card" motion-reveal="0.24">
                                <h4>Token-aware clients</h4>
                                <p>Python, Rust, cqlsh, nodetool and sstable tools all understand Lexis tokens.</p>
                            </div>
                        </div>
                    </section>

                    <section class="ex" toc-section="reference/scylladb-docs">
                        <h3 toc-anchor="reference/scylladb-docs" toc-label="ScyllaDB docs">ScyllaDB 6.2 docs</h3>
                        <p class="note">Lexis 1.0 is forked from ScyllaDB 6.2. Everything this site
                           doesn't cover (configuration, operations, CQL) works as the ScyllaDB 6.2
                           documentation describes. Good places to start:</p>
                        <div class="links" motion-reveal>
                            <a href="${DOCS}/architecture/tablets.html" target="_blank" rel="noopener"><b>Tablets</b><span>How tablets map token ranges to nodes and cores</span></a>
                            <div class="split"><a href="${DOCS}/cql/index.html" target="_blank" rel="noopener"><b>CQL reference</b></a><span>Mostly the same. Where Lexis differs (queries on a prefix or range of the partition key, scans in key order, <code class="inline">token()</code> as a blob), see the <a href="/examples">examples</a>.</span></div>
                            <a href="${DOCS}/operating-scylla/index.html" target="_blank" rel="noopener"><b>Operating</b><span>Configuration, procedures, monitoring</span></a>
                            <a href="${DOCS}/architecture/index.html" target="_blank" rel="noopener"><b>Architecture</b><span>Shards, replication, consistency</span></a>
                            <a href="${DOCS}/" target="_blank" rel="noopener"><b>All docs</b><span>opensource.docs.scylladb.com/branch-6.2</span></a>
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
        .content > .intro { margin-bottom: 2.5rem; }
        .intro > .eyebrow { font-family: var(--font-mono); font-size: 0.78rem; letter-spacing: 0.2em;
                   text-transform: uppercase; color: var(--sky); }
        .intro > h1 { color: var(--white); font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 700;
             letter-spacing: -0.03em; margin: 0.6rem 0 1rem; line-height: 1.05; }
        .content > .cat { padding: 3rem 0 0.5rem; border-top: var(--border-width) solid rgba(255,255,255,0.08); }
        .cat > h2 { color: var(--white); font-size: 1.9rem; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 0.5rem; }
        .cat > .ex { padding: 1.75rem 0 0.75rem; margin-left: 0.25rem; }
        .ex > h3 { color: var(--white); font-size: 1.2rem; font-weight: 500; margin: 0 0 0.6rem; }
        .intro > .lede { color: var(--secondary); line-height: 1.75; max-width: 70ch; margin: 0; font-size: 1.08rem; font-weight: 300; }
        .note { color: var(--secondary); line-height: 1.7; max-width: 70ch; margin: 0 0 1.1rem; font-weight: 300; }
        .note > a, .lede > a { color: var(--accent); }
        .inline { font-family: var(--font-mono); background: rgba(255,255,255,0.07); padding: 0.08rem 0.4rem;
                  border-radius: 4px; color: var(--accent); font-size: 0.95em; }
        .ex > code-block { margin-bottom: 1rem; }
        .pill { flex: none; font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 500;
                color: #2c0b22; background: var(--rose); padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
        .ex > .table { border-radius: var(--radius-lg); overflow: hidden; border: var(--border-width) solid rgba(255,255,255,0.08); }
        .table > .row { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr) auto; gap: 1rem;
                      align-items: center; padding: 0.8rem 1.1rem; border-bottom: var(--border-width) solid rgba(255,255,255,0.05);
                      background: rgba(255,255,255,0.02); font-size: 0.92rem; color: var(--muted); }
        .table > .row:last-child { border-bottom: none; }
        .row > span > b { color: var(--white); font-weight: 500; margin-right: 0.35rem; }
        .table > .row > code { font-family: var(--font-mono); color: var(--accent); font-size: 0.85rem;
                           overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .table > .head { background: rgba(255,255,255,0.05); font-size: 0.7rem; letter-spacing: 0.14em;
                       text-transform: uppercase; color: var(--dim); }
        .ex > .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 1rem; }
        .cards > .card { padding: 1.35rem; border-radius: 14px; background: rgba(255,255,255,0.03);
                border: var(--border-width) solid rgba(255,255,255,0.07); transition: border-color 0.3s, transform 0.3s; }
        .cards > .card:hover { border-color: rgba(212,176,230,0.45); transform: translateY(-3px); }
        .card > h4 { margin: 0 0 0.45rem; color: var(--white); font-weight: 500; font-size: 1.05rem; }
        .card > p { margin: 0; color: var(--secondary); font-size: 0.93rem; line-height: 1.6; font-weight: 300; }
        .ex > .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 0.75rem; }
        .links > a { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem 1.2rem; border-radius: var(--radius-lg);
                   text-decoration: none; background: rgba(255,255,255,0.03);
                   border: var(--border-width) solid rgba(255,255,255,0.08); transition: border-color 0.25s, background 0.25s; }
        .links > a:hover { border-color: var(--accent); background: rgba(212,176,230,0.06); }
        .links > a > b { color: var(--white); font-weight: 500; }
        .links > a > b::after { content: ' ↗'; color: var(--accent); }
        .links > a > span { color: var(--muted); font-size: 0.88rem; }
        .links > .split { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem 1.2rem;
                          border-radius: var(--radius-lg); background: rgba(255,255,255,0.03);
                          border: var(--border-width) solid rgba(255,255,255,0.08); }
        .split > a { text-decoration: none; align-self: flex-start; }
        .split > a > b { color: var(--white); font-weight: 500; }
        .split > a > b::after { content: ' ↗'; color: var(--accent); }
        .split > a:hover > b { color: var(--accent); }
        .split > span { color: var(--muted); font-size: 0.88rem; }
        .split > span > a { color: var(--accent); }
        @media (max-width: 768px) {
            .layout > .content { padding: 5.5rem 1.1rem 4rem; }
            .table > .row { grid-template-columns: 1fr; gap: 0.3rem; }
            .table > .head { display: none; }
        }
    `,
})
export class InstallPage extends RxElement {}
