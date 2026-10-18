import { Component, RxElement, state } from '@yaw-rx/core';
import { MotionReveal } from '../../directives/motion-reveal.directive.js';
import styles from './story-section.component.css';

/** A numbered chapter on the home page: eyebrow, heading, body, and an optional visual. */
@Component({
    selector: 'story-section',
    directives: [MotionReveal],
    template: `
        <section>
            <div class="text" motion-reveal>
                <span class="eyebrow">{{eyebrow}}</span>
                <h2>{{heading}}</h2>
                <div class="body"><slot></slot></div>
            </div>
        </section>
    `,
    styles,
})
export class StorySection extends RxElement {
    @state eyebrow = '';
    @state heading = '';
}
