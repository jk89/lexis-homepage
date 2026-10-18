import { animate } from 'motion';
import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';

interface Spring { stiffness: number; damping: number; mass: number; stagger: number }

/**
 * FLIP for an element's children. Whenever a child's layout position
 * changes, because rx-for reordered it or a class moved it, the child
 * springs from where it was drawn to where it now sits. Resizes re-measure
 * without animating.
 *
 * The attribute value is the spring: `flip="stiffness damping mass stagger"`,
 * e.g. `flip="170 22 0.9 0.025"`. Missing values fall back to 160, 20, 1, 0.
 */
@Directive({ selector: '[flip]' })
export class Flip {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private spring!: Spring;
    private readonly last = new Map<HTMLElement, { x: number; y: number }>();
    private mo: MutationObserver | undefined;
    private ro: ResizeObserver | undefined;

    onInit(): void {
        const [stiffness = 160, damping = 20, mass = 1, stagger = 0] =
            (this.bindingPath?.raw ?? '').split(/\s+/).filter(Boolean).map(Number);
        this.spring = { stiffness, damping, mass, stagger };

        this.snapshot();
        this.mo = new MutationObserver(() => this.play());
        this.mo.observe(this.node, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        this.ro = new ResizeObserver(() => this.snapshot());
        this.ro.observe(this.node);
    }

    onDestroy(): void {
        this.mo?.disconnect();
        this.ro?.disconnect();
    }

    private children(): HTMLElement[] {
        return Array.from(this.node.children) as HTMLElement[];
    }

    private snapshot(): void {
        for (const child of this.children()) this.last.set(child, { x: child.offsetLeft, y: child.offsetTop });
    }

    private play(): void {
        const { stiffness, damping, mass, stagger } = this.spring;
        this.children().forEach((child, i) => {
            const now = { x: child.offsetLeft, y: child.offsetTop };
            const prev = this.last.get(child);
            this.last.set(child, now);
            if (prev === undefined || (prev.x === now.x && prev.y === now.y)) return;
            // Start from where it is drawn: its old slot plus any transform still in flight.
            const m = new DOMMatrixReadOnly(getComputedStyle(child).transform);
            const dx = prev.x + m.m41 - now.x;
            const dy = prev.y + m.m42 - now.y;
            animate(child, { x: [dx, 0], y: [dy, 0] }, { type: 'spring', stiffness, damping, mass, delay: i * stagger });
        });
    }
}
