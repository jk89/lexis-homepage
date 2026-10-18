import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';

@Directive({ selector: '[toc-section]' })
@Injectable([TocMenuItemsService])
export class TocSection {
    node!: RxElementLike;
    private readonly toc: TocMenuItemsService;

    constructor(toc: TocMenuItemsService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;
        const path = node.getAttribute('toc-section') || '';
        const depth = path ? path.split('/').length - 1 : 0;
        node.style.setProperty('--toc-depth', String(depth));
        this.toc.registerSection(path, depth, node as HTMLElement);
    }

    onDestroy(): void {
        const path = this.node.getAttribute('toc-section') || '';
        if (path) this.toc.unregisterSection(path);
    }
}
