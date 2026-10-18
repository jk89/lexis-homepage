import { Component, Inject, RxElement } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { TokenRingBg } from './hero-section/token-ring-bg.directive.js';
import '../../components/lexis-logo.component.js';

/** Logo viewBox is 835 × 1024. */
const LOGO_ASPECT = 835 / 1024;

@Component({
    selector: 'hero-section',
    directives: [TokenRingBg],
    template: `
        <div class="bg" token-ring-bg></div>
        <div class="shade"></div>
        <div class="hero">
            <lexis-logo class="logo"></lexis-logo>
            <div class="copy">
                <h1 class="title"><span>L</span><span>e</span><span>x</span><span>i</span><span>s</span></h1>
                <p class="tagline">Distributed data, in key order.</p>
                <p class="sub">Byte-ordered partitioning built on tablets. Partitions are stored
                   and distributed in key order, so you can query any prefix or range of a
                   partition key and read it back in order, straight from the nodes that hold it.</p>
                <div class="cta">
                    <button class="primary" onclick="toInstall">Get started</button>
                    <button class="ghost" onclick="toExamples">See the queries →</button>
                </div>
            </div>
        </div>
        <div class="scroll-hint">scroll</div>
    `,
    styles: `
        :host { display: flex; align-items: center; min-height: 100vh; padding: 7rem 2.5rem 5rem;
                position: relative; overflow: hidden; }
        :host > .bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
        :host > .shade { position: absolute; inset: 0; z-index: 0; pointer-events: none;
                         background: linear-gradient(90deg, rgba(31,10,36,0.92) 0%, rgba(31,10,36,0.6) 38%, rgba(31,10,36,0) 65%); }

        :host > .hero { position: relative; width: 100%; max-width: 1200px; margin: 0 auto;
                        display: flex; align-items: flex-start; gap: clamp(1.5rem, 3vw, 2.75rem); }
        .hero > .logo { flex: none; }
        .logo > svg { width: 100%; height: 100%; }
        /* Fixed width in the row layout, so the text's height never depends on the logo beside it. */
        .hero > .copy { text-align: left; flex: 0 0 auto; width: 36rem; max-width: 100%; }
        .copy > .title { font-size: clamp(4rem, 9vw, 7rem); font-weight: 700; color: var(--white);
                         letter-spacing: -0.045em; line-height: 0.85; margin: -0.05em 0 1rem; perspective: 600px; }
        .title > span { display: inline-block; }
        .copy > .tagline { font-size: clamp(1.3rem, 2.4vw, 1.8rem); color: var(--accent); font-weight: 300;
                           margin: 0 0 1.1rem; letter-spacing: -0.01em; }
        .copy > .sub { font-size: 1.08rem; color: var(--secondary); line-height: 1.7;
                       margin: 0 0 2rem; font-weight: 300; }
        .copy > .cta { display: flex; gap: 0.9rem; flex-wrap: wrap; }
        .cta > button { font-size: 1rem; padding: 0.8rem 1.5rem; border-radius: 999px;
                        font-weight: 500; letter-spacing: 0.01em; }
        .cta > .primary { background: linear-gradient(135deg, #e3c3f0, #afc0d1); color: #2c0b22;
                          border: none; box-shadow: 0 10px 30px -10px rgba(212,176,230,0.7); }
        .cta > .primary:hover { filter: brightness(1.06); box-shadow: 0 14px 40px -10px rgba(212,176,230,0.9); }
        .cta > .ghost { background: rgba(255,255,255,0.04); color: var(--text);
                        border: var(--border-width) solid rgba(255,255,255,0.16); }
        .cta > .ghost:hover { border-color: var(--accent); color: var(--white); }

        :host > .scroll-hint { position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
                               z-index: 1; color: var(--dim); font-size: 0.7rem; letter-spacing: 0.3em;
                               text-transform: uppercase; animation: bob 2.4s ease-in-out infinite; }
        :host > .scroll-hint::after { content: ''; display: block; width: 1px; height: 28px; margin: 0.5rem auto 0;
                                      background: linear-gradient(var(--dim), transparent); }
        @keyframes bob { 50% { transform: translate(-50%, 6px); } }
        @media (max-width: 1000px) {
            /* Narrow screens: text only, the ring behind is enough. */
            .hero > .logo { display: none; }
            :host { padding: 6rem 1.25rem 4rem; }
            :host > .hero { flex-direction: column; }
            :host > .shade { background: rgba(31,10,36,0.55); }
        }
    `,
})
export class HeroSection extends RxElement {
    @Inject(Router) private readonly router!: Router;
    private ro: ResizeObserver | undefined;

    override onInit(): void {
        const logo = this.querySelector<HTMLElement>('.hero > .logo')!;
        const copy = this.querySelector<HTMLElement>('.hero > .copy')!;
        const mq = window.matchMedia('(max-width: 1000px)');

        // The logo stands as tall as the whole text block beside it.
        const size = (): void => {
            const h = mq.matches ? 140 : copy.offsetHeight;
            logo.style.height = `${String(h)}px`;
            logo.style.width = `${String(h * LOGO_ASPECT)}px`;
        };
        this.ro = new ResizeObserver(size);
        this.ro.observe(copy);
        size();
    }

    override onDestroy(): void {
        this.ro?.disconnect();
    }

    toInstall(): void { this.router.navigate('/install'); }
    toExamples(): void { this.router.navigate('/examples'); }
}
