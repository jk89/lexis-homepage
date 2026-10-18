import { animate } from 'motion';
import { Directive } from '@yaw-rx/core';
import type { RxElementLike } from '@yaw-rx/core';

/**
 * Drops an element from the top of its parent to just past the bottom,
 * fading in and out, then dispatches a `landed` event so the host can
 * act on it (`onlanded="land(d.id)"`).
 */
@Directive({ selector: '[fall]' })
export class Fall {
    node!: RxElementLike;

    onInit(): void {
        const distance = (this.node.parentElement?.offsetHeight ?? 0) + 18;
        void animate(this.node, { y: [0, distance], opacity: [0, 1, 1, 0] }, { duration: 0.55, ease: 'easeIn' })
            .then(() => this.node.dispatchEvent(new CustomEvent('landed')));
    }

    onDestroy(): void {}
}
