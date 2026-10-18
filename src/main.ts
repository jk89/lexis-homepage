import { bootstrap } from '@yaw-rx/core';
import { Router, ROUTES } from '@yaw-rx/core/router';
import { AppRoot } from './app-root.js';
import { TOC_ROOT_BASE } from './app-root/services/toc-menu-items.service.js';
import globalStyles from './main.css';

await bootstrap({
    root: AppRoot,
    globals: { styles: globalStyles },
    providers: [
        { provide: ROUTES, useValue: [
            { path: '/',         load: () => import('./app-root/pages/home-page.js').then(m => m.HomePage) },
            { path: '/overview', load: () => import('./app-root/pages/home-page.js').then(m => m.HomePage) },
            { path: '/install',  load: () => import('./app-root/pages/install-page.js').then(m => m.InstallPage) },
            { path: '/examples', load: () => import('./app-root/pages/examples-page.js').then(m => m.ExamplesPage) },
        ] },
        Router,
        { provide: TOC_ROOT_BASE, useValue: '' },
    ],
});
