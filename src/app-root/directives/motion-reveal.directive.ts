import { animate, inView } from 'motion';
import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';

/**
 * Fades and lifts an element in with a spring the first time it scrolls
 * into view. The attribute value, if any, is a delay in seconds.
 */
@Directive({ selector: '[motion-reveal]' })
export class MotionReveal {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private stop: (() => void) | undefined;

    onInit(): void {
        const delay = this.bindingPath?.raw ? parseFloat(this.bindingPath.raw) : 0;
        const el = this.node as unknown as HTMLElement;
        el.style.opacity = '0';
        this.stop = inView(el, () => {
            animate(el, { opacity: [0, 1], y: [32, 0], filter: ['blur(6px)', 'blur(0px)'] },
                { delay, type: 'spring', stiffness: 120, damping: 20, filter: { duration: 0.5, delay } });
        }, { amount: 0.15 });
    }

    onDestroy(): void {
        this.stop?.();
    }
}
