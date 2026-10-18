import { Component, RxElement } from '@yaw-rx/core';
import styles from './doc-page.component.css';

/**
 * Base for the documentation pages. Its stylesheet carries the layout they
 * share (sidebar and content columns, intro, categories, sections, notes);
 * yaw concatenates inherited styles, so each page only adds its own.
 */
@Component({
    selector: 'doc-page',
    styles,
})
export class DocPage extends RxElement {}
