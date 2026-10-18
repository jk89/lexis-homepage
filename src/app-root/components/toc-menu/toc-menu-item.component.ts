/**
 * toc-menu-item — recursive tree node for the docs sidebar.
 *
 * Each toc-menu-item renders a clickable label and a children container.
 * If it has children, rx-for stamps child <toc-menu-item> elements.
 * Recursion stops when children is empty.
 *
 * Each node self-manages active/expanded state via combineLatest
 * on TocMenuItemsService.activeId$ and TocMenuItemsService.expandAll$, using the
 * precomputed ancestor paths in TocMenuItemsService.paths.
 */
import { combineLatest } from 'rxjs';
import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { TocMenuItemsService, type TocEntry } from '../../services/toc-menu-items.service.js';
import { TocMenuService } from '../../services/toc-menu.service.js';

@Component({
    selector: 'toc-menu-item',
    directives: [RxFor],
    template: `
        <a [class.active]="active" onclick="goto(id)">{{label}}</a>
        <div class="children" [class.expanded]="expanded">
            <div rx-for="childEntries by id">
                <toc-menu-item></toc-menu-item>
            </div>
        </div>
    `,
    styles: `
        :host { display: flex; flex-direction: column; }

        a { color: var(--muted); text-decoration: none; cursor: pointer;
            padding: 0.20rem 0; font-size: 0.95rem; font-weight: 400;
            transition: color 0.15s;
            border-left: 2px solid transparent;
            padding-left: 0.6rem; margin-left: -0.6rem;
            white-space: nowrap; }
        a:hover { color: var(--white); }
        a.active { color: var(--accent); border-left-color: var(--accent); }

        .children { display: flex; flex-direction: column;
                    max-height: 0; overflow: hidden; opacity: 0;
                    padding-left: 0.42rem; margin-left: 0.1rem;
                    border-left: var(--border-width) solid var(--bg-5); }
        .children.expanded { max-height: none; opacity: 1; }
    `,
})
export class TocMenuItem extends RxElement {
    @state label = '';
    @state childEntries: readonly TocEntry[] = [];
    @state depth = 0;
    @state expanded = false;
    @state active = false;
    
    @Inject(TocMenuItemsService) private readonly toc!: TocMenuItemsService;
    @Inject(TocMenuService) private readonly sidebar!: TocMenuService;

    override onInit(): void {
        combineLatest([this.toc.activeId$, this.toc.expandAll$]).subscribe(
            ([activeId, expandAll]: [string, boolean]) => {
                const path = this.toc.paths.get(activeId);
                this.active = this.id === activeId;
                this.expanded = expandAll || (path !== undefined && path.includes(this.id));
            }
        );
    }

    goto(id: string): void {
        this.toc.scrollTo(id);
        this.sidebar.close();
    }
}
