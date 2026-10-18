import { animate } from 'motion';
import { distinctUntilChanged, type Subscription, skip } from 'rxjs';
import { Directive } from '@yaw-rx/core';
import type { ParsedBindingPath, RxElementLike } from '@yaw-rx/core';
import { observeBinding, parseBindingPath } from '@yaw-rx/core/binding/path';

/**
 * Makes an element hop down and back each time the bound value changes:
 * `hop="tablet.moves"`.
 */
@Directive({ selector: '[hop]' })
export class Hop {
    node!: RxElementLike;
    bindingPath?: ParsedBindingPath;
    private sub: Subscription | undefined;

    onInit(): void {
        this.sub = observeBinding(this.node, parseBindingPath(this.bindingPath?.raw ?? '')).pipe(distinctUntilChanged(), skip(1)).subscribe(() => {
            animate(this.node, { y: [0, 14, 0] }, { duration: 0.5 });
        });
    }

    onDestroy(): void {
        this.sub?.unsubscribe();
    }
}
