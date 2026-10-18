import { Directive, Injectable } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';
import { TocMenuItemsService } from '../services/toc-menu-items.service.js';

const TOP_OFFSET = 80;

@Directive({ selector: '[toc-anchor]' })
@Injectable([TocMenuItemsService])
export class TocAnchor {
    node!: RxElementLike;
    private readonly toc: TocMenuItemsService;
    private path: string | undefined;

    constructor(toc: TocMenuItemsService) {
        this.toc = toc;
    }

    onInit(): void {
        const { node } = this;
        node.style.scrollMarginTop = `${String(TOP_OFFSET)}px`;
        this.path = node.getAttribute('toc-anchor') || undefined;
        if (!this.path) return;
        // A short toc-label for the menu, if given; otherwise the heading text.
        const label = node.getAttribute('toc-label') ?? node.textContent ?? '';
        this.toc.registerAnchor(this.path, label, node as HTMLElement);
    }

    onDestroy(): void {
        if (this.path) this.toc.unregisterAnchor(this.path);
    }
}
