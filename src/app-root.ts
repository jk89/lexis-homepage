import { Component, RxElement } from '@yaw-rx/core';
import '@yaw-rx/core/router/outlet';
import './app-root/components/nav-bar.component.js';
import { TocMenuService } from './app-root/services/toc-menu.service.js';

@Component({
    selector: 'app-root',
    providers: [TocMenuService],
    template: `
        <nav-bar></nav-bar>
        <rx-router-outlet></rx-router-outlet>
    `,
    styles: `
        :host { display: block; }
    `
})
export class AppRoot extends RxElement {}
