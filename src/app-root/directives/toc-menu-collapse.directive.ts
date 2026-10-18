import { filter, type Subscription } from 'rxjs';
import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';
import { TocMenuService } from '../services/toc-menu.service.js';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';

const MQ = '(max-width: 768px)';

@Directive({ selector: '[toc-menu-collapse]' })
@Injectable([TocMenuService, TocMenuItemsService, Router])
export class TocMenuCollapse {
    node!: RxElementLike;
    private readonly sidebar: TocMenuService;
    private readonly toc: TocMenuItemsService;
    private readonly router: Router;
    private mobile = false;
    private sub: Subscription | undefined;
    private scrollSub: Subscription | undefined;
    private mqHandler: (() => void) | undefined;
    private mq: MediaQueryList | undefined;

    constructor(sidebar: TocMenuService, toc: TocMenuItemsService, router: Router) {
        this.sidebar = sidebar;
        this.toc = toc;
        this.router = router;
    }

    onInit(): void {
        this.sidebar.register(this.router.route$.getValue());

        this.mq = window.matchMedia(MQ);
        const update = (): void => {
            this.mobile = this.mq!.matches;
            if (this.mobile) {
                this.node.style.cssText =
                    'display:none;position:fixed;inset:0;' +
                    'z-index:150;background:var(--black);padding-top:4rem;overflow-y:auto;' +
                    'width:100vw;height:100vh;';
            } else {
                this.node.style.cssText = '';
                this.sidebar.close();
                this.toc.expandAll = false;
                this.toc.resume();
            }
        };
        this.mqHandler = update;
        this.mq.addEventListener('change', update);
        update();

        this.sub = this.sidebar.open$.subscribe((open: boolean) => {
            if (!this.mobile) return;
            if (open) {
                this.node.style.display = 'block';
                this.toc.pause();
                this.toc.expandAll = true;
            } else {
                this.node.style.display = 'none';
                this.toc.expandAll = false;
                this.toc.resume();
            }
        });

        this.scrollSub = this.sidebar.scrollToActive$.pipe(
            filter(Boolean),
        ).subscribe(() => {
            requestAnimationFrame(() => {
                const active = this.node.querySelector('a.active');
                if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
                this.sidebar.scrollToActive = false;
            });
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
        this.scrollSub?.unsubscribe();
        if (this.mq && this.mqHandler) this.mq.removeEventListener('change', this.mqHandler);
        this.sidebar.close();
    }
}
