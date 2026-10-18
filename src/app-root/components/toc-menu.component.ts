/**
 * TocMenu — docs page sidebar navigation.
 *
 * Reads the TOC tree from the TocMenuItemsService. No hardcoded nav data.
 *
 * One subscription to activeId$. On each change, finds the new active
 * leaf, walks up via hostNode to build the new path, diffs against the
 * cached previous path, and only collapses/expands the nodes that changed.
 * Shared ancestors stay expanded.
 */
import { type Observable, type Subscription } from 'rxjs';
import { Component, Inject, RxElement } from '@yaw-rx/core';
import { isPrerendered, isSSGCapture } from '@yaw-rx/core/hydrate/state';
import { getGlobalSSGState, setGlobalSSGState } from '@yaw-rx/core/hydrate/global-blob';
import { Router } from '@yaw-rx/core/router';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { TocMenuItemsService, type TocEntry } from '../services/toc-menu-items.service.js';
import { TocMenuItem } from './toc-menu/toc-menu-item.component.js';

@Component({
    selector: 'toc-menu',
    directives: [RxFor],
    template: `
        <aside>
            <nav rx-for="nodes by id">
                <toc-menu-item></toc-menu-item>
            </nav>
        </aside>
    `,
    styles: `
        :host { display: block; box-sizing: border-box;
                flex: 0 0 auto;
                position: sticky; top: 4rem;
                align-self: flex-start;
                height: calc(100vh - 4rem);
                padding: 0.5rem 1.5rem 0.5rem 2rem;
                border-right: var(--border-width) solid var(--bg-4);
                overflow-y: auto; }

        aside { display: flex; flex-direction: column; gap: 0.6rem; }

        .label { color: var(--dim); font-family: var(--font-mono); font-size: 0.7rem;
                 text-transform: uppercase; letter-spacing: 0.12em; }

        nav { display: flex; flex-direction: column; gap: 0.15rem;
              font-family: var(--font-mono); }
        @media (max-width: 768px) {
            :host { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    height: 100vh; border-right: none; }
        }
    `,
})
export class TocMenu extends RxElement {
    @Inject(TocMenuItemsService) private readonly toc!: TocMenuItemsService;
    @Inject(Router) private readonly router!: Router;

    get nodes$(): Observable<readonly TocEntry[]> {
        return this.toc.tree$;
    }

    private widthSub: Subscription | undefined;

    override onInit(): void {
        if (isPrerendered() && this.style.flexBasis) return;
        const route = this.router.route$.getValue();
        this.widthSub = getGlobalSSGState(route, 'toc-width').subscribe((value) => {
            if (typeof value === 'number') {
                this.style.flexBasis = `${String(value)}px`;
            }
        });
        let timer: number | undefined;
        const mo = new MutationObserver(() => {
            clearTimeout(timer);
            timer = window.setTimeout(() => {
                mo.disconnect();
                // Measure with the real web font, not the fallback it replaces.
                void document.fonts.ready.then(() => this.#measureWidth());
            }, 300);
        });
        mo.observe(this, { childList: true, subtree: true });
    }

    override onDestroy(): void {
        this.widthSub?.unsubscribe();
    }

    // Baked intrinsics - self-measures flex-basis from content width.
    // SSG captures the result into the global SSG state blob so that
    // client-side navigations can apply it without re-measuring.
    // isPrerendered() skips re-measurement on the static site.
    #measureWidth(): void {
        const nodes = this.querySelectorAll<TocMenuItem>('toc-menu-item');
        const wasExpanded: boolean[] = [];
        for (const node of nodes) {
            wasExpanded.push(node.expanded);
            node.expanded = true;
        }
        const prev = this.style.cssText;
        this.style.cssText = 'position:fixed;left:-9999px;width:auto;visibility:hidden;';
        const width = this.scrollWidth;
        this.style.cssText = prev;
        this.style.flexBasis = `${width}px`;
        if (isSSGCapture()) setGlobalSSGState(this.router.route$.getValue(), 'toc-width', width);
        for (let i = 0; i < nodes.length; i++) {
            nodes[i]!.expanded = wasExpanded[i]!;
        }
    }
}
