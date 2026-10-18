import { Component, RxElement } from '@yaw-rx/core';
import template from './lexis-logo.component.svg';
import styles from './lexis-logo.component.css';

/**
 * The Lexis mark, flat and matte: the original structure (byte column
 * 00 → FF, divider, three tablets) in solid tones only. The hexagon is a
 * tone deeper than the page so it reads as cut out of it.
 */
@Component({
    selector: 'lexis-logo',
    template,
    styles,
})
export class LexisLogo extends RxElement {}
