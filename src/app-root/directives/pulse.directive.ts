import { animate } from 'motion';
import { distinctUntilChanged, type Subscription, skip } from 'rxjs';
import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';
import { observeBinding, parseBindingPath } from '@yaw-rx/core/binding/path';

/**
 * Gives an element a quick vertical squash each time the bound value
 * changes: `pulse="tablet.hits"`.
 */
@Directive({ selector: '[pulse]' })
export class Pulse {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private sub: Subscription | undefined;

    onInit(): void {
        this.sub = observeBinding(this.node, parseBindingPath(this.bindingPath?.raw ?? '')).pipe(distinctUntilChanged(), skip(1)).subscribe(() => {
            animate(this.node, { scaleY: [1.08, 1] }, { type: 'spring', stiffness: 500, damping: 15 });
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
