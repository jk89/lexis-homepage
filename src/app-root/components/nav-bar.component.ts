import { map, type Observable } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { TocMenuToggle } from '../directives/toc-menu-toggle.directive.js';
import './lexis-logo.component.js';
import styles from './nav-bar.component.css';

@Component({
    selector: 'nav-bar',
    directives: [TocMenuToggle],
    template: `
        <nav>
            <a class="logo" toc-menu-toggle>
                <lexis-logo class="mark"></lexis-logo>
                <span class="logo-text">Lexis</span>
            </a>
            <div class="links">
                <a [class.active]="isActive('/')" onclick="navigateHome">Concept</a>
                <a [class.active]="isActive('/install')" onclick="navigateInstall">Install</a>
                <a [class.active]="isActive('/examples')" onclick="navigateExamples">Examples</a>
                <a class="gh" href="https://github.com/jk89/lexisdb" target="_blank" rel="noopener">GitHub ↗</a>
            </div>
        </nav>
    `,
    styles,
})
export class NavBar extends RxElement {
    @state route = '/';
    @Inject(Router) private readonly router!: Router;

    override onInit(): void {
        this.router.route$.subscribe((r) => { this.route = r; });
    }

    isActive(path: string): Observable<boolean> {
        // The homepage also answers at /overview, where its section URLs live.
        return this.route$.pipe(map((r) => r === path || (path === '/' && r === '/overview')));
    }

    navigateHome(): void { this.router.navigate('/'); }
    navigateInstall(): void { this.router.navigate('/install'); }
    navigateExamples(): void { this.router.navigate('/examples'); }
}
