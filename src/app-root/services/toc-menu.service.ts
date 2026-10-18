import { Injectable, state } from '@yaw-rx/core';
import { Router } from '@yaw-rx/core/router';

@Injectable([Router])
export class TocMenuService {
    @state open = false;
    @state available = new Map<string, boolean>();
    @state scrollToActive = false;

    private readonly router: Router;

    constructor(router: Router) {
        this.router = router;
    }

    register(path: string): void {
        this.available.set(path, true);
        this.available$.touch();
    }

    isAvailable(): boolean {
        return this.available.get(this.router.route$.getValue()) ?? false;
    }

    toggle(): void {
        this.open = !this.open;
        if (this.open) this.scrollToActive = true;
    }

    close(): void {
        this.open = false;
    }
}
