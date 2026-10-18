const KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
    'break', 'continue', 'new', 'this', 'super', 'import', 'export', 'from',
    'as', 'type', 'interface', 'enum', 'public', 'private', 'protected',
    'readonly', 'static', 'abstract', 'async', 'await', 'yield', 'throw',
    'try', 'catch', 'finally', 'declare', 'override', 'void', 'never',
    'undefined', 'null', 'true', 'false', 'typeof', 'instanceof', 'in', 'of',
]);

import { escapeHtml } from '@yaw-rx/common/escape';

export const dedent = (s: string): string => {
    const body = s.replace(/^\n+/, '').replace(/\s+$/, '');
    const lines = body.split('\n');
    const widths = lines
        .filter((l) => l.trim().length > 0)
        .map((l) => /^ */.exec(l)?.[0].length ?? 0);
    const indent = widths.length > 0 ? Math.min(...widths) : 0;
    return indent > 0 ? lines.map((l) => l.slice(indent)).join('\n') : lines.join('\n');
};

const TOKEN_RE = /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`)|('(?:\\.|[^'\\])*')|("(?:\\.|[^"\\])*")|(\/(?:\\.|[^\/\n\\])+\/[gimsuy]*)|(@[A-Za-z_$][\w$]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

const IMPORT_RE = /import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g;

const collectImportNames = (src: string): Set<string> => {
    const names = new Set<string>();
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(src)) !== null) {
        const clause = m[1]!;
        const ns = /^\*\s+as\s+([A-Za-z_$][\w$]*)/.exec(clause);
        if (ns !== null) { names.add(ns[1]!); continue; }
        if (!clause.startsWith('{')) {
            const def = /^([A-Za-z_$][\w$]*)/.exec(clause);
            if (def !== null) names.add(def[1]!);
        }
        const braces = /\{([\s\S]*?)\}/.exec(clause);
        if (braces !== null) {
            for (const raw of braces[1]!.split(',')) {
                const trimmed = raw.trim();
                if (trimmed === '') continue;
                const parts = trimmed.split(/\s+as\s+/);
                const name = parts[parts.length - 1]!.trim();
                if (name !== '') names.add(name);
            }
        }
    }
    return names;
};

export const highlightJs = (src: string): string => highlightTs(src);

export const highlightTs = (src: string): string => {
    const imports = collectImportNames(src);
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        const text = m[0];
        let cls: string;
        if (m[1] !== undefined || m[2] !== undefined) cls = 'tk-comment';
        else if (m[3] !== undefined || m[4] !== undefined || m[5] !== undefined) cls = 'tk-string';
        else if (m[6] !== undefined) cls = 'tk-regex';
        else if (m[7] !== undefined) cls = 'tk-decorator';
        else if (m[8] !== undefined) cls = 'tk-number';
        else if (KEYWORDS.has(text)) cls = 'tk-keyword';
        else if (/^[A-Z][A-Z0-9_]*$/.test(text)) cls = 'tk-const';
        else if (/^[A-Z]/.test(text)) cls = 'tk-type';
        else if (imports.has(text)) cls = 'tk-fn';
        else if (/^\s*\(/.test(src.slice(m.index + text.length))) cls = 'tk-fn';
        else cls = 'tk-ident';
        out += `<span class="${cls}">${escapeHtml(text)}</span>`;
        last = m.index + text.length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const JSON_TOKEN_RE = /("(?:\\.|[^"\\])*")\s*(:)|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([{}[\]:,])/g;

export const highlightJson = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    JSON_TOKEN_RE.lastIndex = 0;
    while ((m = JSON_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        if (m[1] !== undefined) {
            out += `<span class="tk-attr">${escapeHtml(m[1])}</span>`;
            out += `<span class="tk-punct">${escapeHtml(m[2]!)}</span>`;
        } else if (m[3] !== undefined) out += `<span class="tk-string">${escapeHtml(m[3])}</span>`;
        else if (m[4] !== undefined) out += `<span class="tk-keyword">${escapeHtml(m[4])}</span>`;
        else if (m[5] !== undefined) out += `<span class="tk-number">${escapeHtml(m[5])}</span>`;
        else if (m[6] !== undefined) out += `<span class="tk-punct">${escapeHtml(m[6])}</span>`;
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const BASH_TOKEN_RE = /(#[^\n]*)|((?:"(?:\\.|[^"\\])*")|(?:'[^']*'))|((?:^|\s)-{1,2}[\w][\w-]*)|(\b\d+(?:\.\d+)?\b)|([|;&><]+)|([A-Za-z_@][\w.@/-]*[\w]|[A-Za-z_][\w]*)/g;

const BASH_COMMANDS = new Set([
    'npm', 'npx', 'yarn', 'pnpm', 'node', 'deno', 'bun',
    'git', 'docker', 'pip', 'cargo', 'cqlsh', 'cd', 'ls', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'echo',
    'export', 'source', 'sudo', 'curl', 'wget',
]);

export const highlightBash = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    BASH_TOKEN_RE.lastIndex = 0;
    while ((m = BASH_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        if (m[1] !== undefined) out += `<span class="tk-comment">${escapeHtml(m[1])}</span>`;
        else if (m[2] !== undefined) out += `<span class="tk-string">${escapeHtml(m[2])}</span>`;
        else if (m[3] !== undefined) {
            const raw = m[3];
            const leading = /^\s/.test(raw) ? raw[0]! : '';
            const flag = leading ? raw.slice(1) : raw;
            out += escapeHtml(leading) + `<span class="tk-const">${escapeHtml(flag)}</span>`;
        }
        else if (m[4] !== undefined) out += `<span class="tk-number">${escapeHtml(m[4])}</span>`;
        else if (m[5] !== undefined) out += `<span class="tk-punct">${escapeHtml(m[5])}</span>`;
        else if (m[6] !== undefined) {
            const cls = BASH_COMMANDS.has(m[6]) ? 'tk-keyword' : 'tk-ident';
            out += `<span class="${cls}">${escapeHtml(m[6])}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const DOCKERFILE_INSTRUCTIONS = new Set([
    'FROM', 'RUN', 'CMD', 'ENTRYPOINT', 'COPY', 'ADD', 'WORKDIR',
    'ENV', 'ARG', 'EXPOSE', 'VOLUME', 'USER', 'LABEL', 'STAGEARG',
    'ONBUILD', 'HEALTHCHECK', 'SHELL', 'MAINTAINER',
]);

const DOCKERFILE_TOKEN_RE = /(#[^\n]*)|((?:"(?:\\.|[^"\\])*")|(?:'[^']*'))|(\\$)|(\b(?:AS)\b)|([A-Z][A-Z_]{1,})|(\b\d+(?:\.\d+)?\b)|([|;&><]+)|(--[\w][\w-]*)|([A-Za-z_@][\w.@/:*=-]*[\w*]|[A-Za-z_][\w]*)/g;

export const highlightDockerfile = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    DOCKERFILE_TOKEN_RE.lastIndex = 0;
    while ((m = DOCKERFILE_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        if (m[1] !== undefined) out += `<span class="tk-comment">${escapeHtml(m[1])}</span>`;
        else if (m[2] !== undefined) out += `<span class="tk-string">${escapeHtml(m[2])}</span>`;
        else if (m[3] !== undefined) out += `<span class="tk-punct">${escapeHtml(m[3])}</span>`;
        else if (m[4] !== undefined) out += `<span class="tk-keyword">${escapeHtml(m[4])}</span>`;
        else if (m[5] !== undefined) {
            const cls = DOCKERFILE_INSTRUCTIONS.has(m[5]) ? 'tk-keyword' : 'tk-const';
            out += `<span class="${cls}">${escapeHtml(m[5])}</span>`;
        }
        else if (m[6] !== undefined) out += `<span class="tk-number">${escapeHtml(m[6])}</span>`;
        else if (m[7] !== undefined) out += `<span class="tk-punct">${escapeHtml(m[7])}</span>`;
        else if (m[8] !== undefined) out += `<span class="tk-const">${escapeHtml(m[8])}</span>`;
        else if (m[9] !== undefined) {
            const cls = BASH_COMMANDS.has(m[9]) ? 'tk-fn' : 'tk-ident';
            out += `<span class="${cls}">${escapeHtml(m[9])}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const HTML_TOKEN_RE = /(<!--[\s\S]*?-->)|(<!doctype\s+[^>]*>)|(<\/?)([a-zA-Z][\w-]*)((?:\s+[\w[\]().:^#-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)(>)/g;
const HTML_ATTR_RE = /([\w[\]().:^#-]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const highlightAttrs = (attrs: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    HTML_ATTR_RE.lastIndex = 0;
    while ((m = HTML_ATTR_RE.exec(attrs)) !== null) {
        if (m.index > last) out += escapeHtml(attrs.slice(last, m.index));
        out += `<span class="tk-attr">${escapeHtml(m[1]!)}</span>`;
        if (m[2] !== undefined) out += escapeHtml(m[2]);
        if (m[3] !== undefined) {
            const valueCls = m[3].startsWith('"') || m[3].startsWith("'") ? 'tk-string' : 'tk-ident';
            out += `<span class="${valueCls}">${escapeHtml(m[3])}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < attrs.length) out += escapeHtml(attrs.slice(last));
    return out;
};

export const highlightHtml = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    HTML_TOKEN_RE.lastIndex = 0;
    while ((m = HTML_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        if (m[1] !== undefined) {
            out += `<span class="tk-comment">${escapeHtml(m[1])}</span>`;
        } else if (m[2] !== undefined) {
            out += `<span class="tk-keyword">${escapeHtml(m[2])}</span>`;
        } else {
            const open = m[3]!;
            const tag = m[4]!;
            const attrs = m[5] ?? '';
            const selfClose = m[6] ?? '';
            const close = m[7]!;
            out += `<span class="tk-punct">${escapeHtml(open)}</span>`;
            out += `<span class="tk-tag">${escapeHtml(tag)}</span>`;
            if (attrs.length > 0) out += highlightAttrs(attrs);
            if (selfClose.length > 0) out += `<span class="tk-punct">${escapeHtml(selfClose)}</span>`;
            out += `<span class="tk-punct">${escapeHtml(close)}</span>`;
        }
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

// ============================================================================
// Lexis additions: CQL, cqlsh output, Python, Rust, TOML, YAML.
// ============================================================================

const CQL_KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'IN', 'LIMIT', 'ORDER', 'BY', 'ASC', 'DESC',
    'CREATE', 'TABLE', 'KEYSPACE', 'IF', 'NOT', 'EXISTS', 'PRIMARY', 'KEY', 'WITH',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'DROP', 'USE', 'ALTER',
    'ALLOW', 'FILTERING', 'DISTINCT', 'AS', 'CLUSTERING', 'PER', 'PARTITION', 'TRUE', 'FALSE',
    'DESCRIBE', 'DESC', 'TABLETS', 'REPLICATION', 'NULL',
]);
const CQL_TYPES = new Set([
    'text', 'varchar', 'ascii', 'int', 'bigint', 'smallint', 'tinyint', 'varint', 'float', 'double',
    'decimal', 'boolean', 'blob', 'uuid', 'timeuuid', 'timestamp', 'date', 'time', 'inet', 'counter',
]);
const CQL_TOKEN_RE = /(--[^\n]*)|('(?:''|[^'])*')|(\b0x[0-9a-fA-F]+\b)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w]*)|([(){},;.*=<>]+)/g;

export const highlightCql = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    CQL_TOKEN_RE.lastIndex = 0;
    while ((m = CQL_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        const text = m[0];
        let cls: string;
        if (m[1] !== undefined) cls = 'tk-comment';
        else if (m[2] !== undefined) cls = 'tk-string';
        else if (m[3] !== undefined || m[4] !== undefined) cls = 'tk-number';
        else if (m[5] !== undefined) {
            if (CQL_KEYWORDS.has(text.toUpperCase())) cls = 'tk-keyword';
            else if (CQL_TYPES.has(text.toLowerCase())) cls = 'tk-type';
            else if (/^\s*\(/.test(src.slice(m.index + text.length))) cls = 'tk-fn';
            else cls = 'tk-ident';
        } else cls = 'tk-punct';
        out += `<span class="${cls}">${escapeHtml(text)}</span>`;
        last = m.index + text.length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};

const makeHighlighter = (keywords: ReadonlySet<string>, comment: RegExp) => {
    const re = new RegExp(
        `(${comment.source})|("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_][\\w]*!?)`,
        'g',
    );
    return (src: string): string => {
        let out = '';
        let last = 0;
        let m: RegExpExecArray | null;
        re.lastIndex = 0;
        while ((m = re.exec(src)) !== null) {
            if (m.index > last) out += escapeHtml(src.slice(last, m.index));
            const text = m[0];
            let cls: string;
            if (m[1] !== undefined) cls = 'tk-comment';
            else if (m[2] !== undefined) cls = 'tk-string';
            else if (m[3] !== undefined) cls = 'tk-number';
            else if (keywords.has(text)) cls = 'tk-keyword';
            else if (text.endsWith('!')) cls = 'tk-decorator';
            else if (/^[A-Z][A-Z0-9_]+$/.test(text)) cls = 'tk-const';
            else if (/^[A-Z]/.test(text)) cls = 'tk-type';
            else if (/^\s*\(/.test(src.slice(m.index + text.length))) cls = 'tk-fn';
            else cls = 'tk-ident';
            out += `<span class="${cls}">${escapeHtml(text)}</span>`;
            last = m.index + text.length;
        }
        if (last < src.length) out += escapeHtml(src.slice(last));
        return out;
    };
};

export const highlightPython = makeHighlighter(new Set([
    'import', 'from', 'as', 'def', 'return', 'for', 'in', 'if', 'else', 'elif', 'with', 'class',
    'print', 'None', 'True', 'False', 'and', 'or', 'not', 'await', 'async', 'pip', 'install',
]), /#[^\n]*/);

export const highlightRust = makeHighlighter(new Set([
    'use', 'let', 'mut', 'fn', 'async', 'await', 'pub', 'struct', 'impl', 'for', 'in', 'if', 'else',
    'match', 'return', 'mod', 'crate', 'self', 'Self', 'as', 'move', 'where', 'Ok', 'Err', 'Some', 'None',
]), /\/\/[^\n]*/);

const KV_TOKEN_RE = /(#[^\n]*)|(^\s*\[[^\]\n]+\])|("(?:\\.|[^"\\])*"|'[^']*')|(^\s*-?\s*[\w.-]+(?=\s*[:=]))|(\b\d+(?:\.\d+)?\b)/gm;

/** TOML and YAML: comments, [sections], keys, strings, numbers. */
export const highlightKv = (src: string): string => {
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    KV_TOKEN_RE.lastIndex = 0;
    while ((m = KV_TOKEN_RE.exec(src)) !== null) {
        if (m.index > last) out += escapeHtml(src.slice(last, m.index));
        const cls = m[1] !== undefined ? 'tk-comment'
            : m[2] !== undefined ? 'tk-keyword'
            : m[3] !== undefined ? 'tk-string'
            : m[4] !== undefined ? 'tk-attr'
            : 'tk-number';
        out += `<span class="${cls}">${escapeHtml(m[0])}</span>`;
        last = m.index + m[0].length;
    }
    if (last < src.length) out += escapeHtml(src.slice(last));
    return out;
};
