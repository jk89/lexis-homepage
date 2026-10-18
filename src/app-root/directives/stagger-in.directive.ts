import { animate, inView, stagger } from 'motion';
import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

/**
 * Slides an element's children in, one after another, the first time its
 * host component scrolls into view. Children stamped later (by rx-for)
 * start hidden until then.
 */
@Directive({ selector: '[stagger-in]' })
export class StaggerIn {
    node!: RxElementLike;
    private revealed = false;
    private mo: MutationObserver | undefined;
    private stop: (() => void) | undefined;

    onInit(): void {
        const hide = (el: Element): void => { if (el instanceof HTMLElement) el.style.opacity = '0'; };
        for (const child of this.node.children) hide(child);
        this.mo = new MutationObserver((records) => {
            if (this.revealed) return;
            for (const r of records) for (const n of r.addedNodes) if (n instanceof Element) hide(n);
        });
        this.mo.observe(this.node, { childList: true });

        const host = (this.node as { hostNode?: Element }).hostNode ?? this.node;
        this.stop = inView(host, () => {
            this.revealed = true;
            this.mo?.disconnect();
            animate(Array.from(this.node.children), { opacity: [0, 1], x: [-14, 0] },
                { delay: stagger(0.07, { startDelay: 0.15 }), type: 'spring', stiffness: 260, damping: 24 });
        }, { amount: 0.3 });
    }

    onDestroy(): void {
        this.mo?.disconnect();
        this.stop?.();
    }
}
