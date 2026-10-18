import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';

/**
 * Keeps an element as tall as its next sibling, and as wide as that height
 * times the aspect ratio given in the attribute: `match-height="835/1024"`.
 */
@Directive({ selector: '[match-height]' })
export class MatchHeight {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private ro: ResizeObserver | undefined;

    onInit(): void {
        const [w = 1, h = 1] = (this.bindingPath?.raw ?? '').split('/').map(Number);
        const target = this.node.nextElementSibling as HTMLElement | null;
        if (target === null) return;
        const size = (): void => {
            const height = target.offsetHeight;
            this.node.style.height = `${String(height)}px`;
            this.node.style.width = `${String(height * (w / h))}px`;
        };
        this.ro = new ResizeObserver(size);
        this.ro.observe(target);
        size();
    }

    onDestroy(): void {
        this.ro?.disconnect();
    }
}
