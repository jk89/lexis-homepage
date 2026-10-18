import { Component, Inject, RxElement } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { TokenRingBg } from './hero-section/token-ring-bg.directive.js';
import { MatchHeight } from '../../directives/match-height.directive.js';
import styles from './hero-section.component.css';
import '../../components/lexis-logo.component.js';

@Component({
    selector: 'hero-section',
    directives: [TokenRingBg, MatchHeight],
    template: `
        <canvas class="bg" token-ring-bg></canvas>
        <div class="shade"></div>
        <div class="hero">
            <!-- As tall as the text beside it; the logo's viewBox is 835 × 1024. -->
            <lexis-logo class="logo" match-height="835/1024"></lexis-logo>
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
    styles,
})
export class HeroSection extends RxElement {
    @Inject(Router) private readonly router!: Router;

    toInstall(): void { this.router.navigate('/install'); }
    toExamples(): void { this.router.navigate('/examples'); }
}
