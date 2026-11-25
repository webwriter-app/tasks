import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { WebwriterPairingItem } from "./webwriter-pairing-item";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-pairing-column": WebwriterPairingColumn;
	}
}

/** One column of a Pairing task. Its authored item order is used in edit mode. */
@customElement("webwriter-pairing-column")
export class WebwriterPairingColumn extends LitElement {
	static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: "manual" as const };

	static styles = css`
		:host {
			display: block;
			min-inline-size: 0;
		}

		slot {
			display: grid;
			align-content: start;
			row-gap: 0.75rem;
		}
	`;

	/** @internal */
	@property({ attribute: false }) accessor items: WebwriterPairingItem[] = [];

	protected updated() {
		const slot = this.renderRoot.querySelector("slot")!;
		const assigned = slot.assignedElements();
		if (assigned.length !== this.items.length || assigned.some((item, index) => item !== this.items[index])) {
			slot.assign(...this.items);
		}
	}

	render() {
		return html`<slot></slot>`;
	}
}
