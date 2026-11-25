import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { QuizElement } from "../components/localization";
import { hasNonTextContent, itemContentStyles } from "../components/item-content";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-pairing-item": WebwriterPairingItem;
	}
}

export type PairingSide = "left" | "right";

type ConnectorView = {
	side: PairingSide;
	label: string;
	description: string;
	locked: boolean;
	connected: boolean;
	active: boolean;
};

/** The complete selectable block for one item of a Pairing task. */
@customElement("webwriter-pairing-item")
export class WebwriterPairingItem extends QuizElement {
	static styles = [itemContentStyles, css`
		:host {
			display: block;
			min-inline-size: 0;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
		}

		.pair-tile {
			display: flex;
			align-items: center;
			gap: var(--sl-spacing-3x-small);
			min-block-size: 2.25rem;
			padding: var(--sl-spacing-2x-small);
		}

		slot {
			display: block;
			flex: 1;
			min-inline-size: 0;
			padding-inline: var(--sl-spacing-2x-small);
		}

		::slotted(p) {
			min-inline-size: 0;
			margin: 0;
			overflow-wrap: anywhere;
		}

		.pair-tile.non-text {
			padding: 0;
			gap: 0;
			min-block-size: 0;
			slot { padding: 0; }
			.pair-dot { margin-inline: var(--sl-spacing-2x-small, 0.25rem); }
		}

		.pair-dot {
			position: relative;
			z-index: 2;
			display: grid;
			flex: none;
			place-items: center;
			inline-size: 1.5rem;
			block-size: 1.5rem;
			padding: 0;
			border: 0;
			border-radius: var(--sl-border-radius-circle);
			background: transparent;
			color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			cursor: crosshair;
			touch-action: none;
			-webkit-user-select: none;
			user-select: none;

			&::before {
				content: "";
				inline-size: 0.65rem;
				block-size: 0.65rem;
				border: 2px solid currentColor;
				border-radius: inherit;
				background: var(--sl-color-neutral-0);
			}

			&:is([data-connected="true"], [aria-pressed="true"])::before { background: currentColor; }
			&:is(:hover, :focus-visible, [aria-pressed="true"]):enabled { background: var(--sl-color-primary-100); }
			&:disabled { cursor: default; }
		}
	`];

	/** @internal */
	@property({ attribute: false }) accessor connectorView: ConnectorView | null = null;

	/** @internal */
	get connector() {
		return this.shadowRoot?.querySelector<HTMLButtonElement>(".pair-dot") ?? null;
	}

	render() {
		const view = this.connectorView;
		const dot = view ? html`<button type="button" class="pair-dot" ?disabled=${view.locked}
			aria-label=${view.label} aria-description=${view.description || nothing}
			data-connected=${view.connected} aria-pressed=${view.active}></button>` : nothing;
		return html`<div class=${classMap({ "pair-tile": true, "non-text": hasNonTextContent(this) })}>
			${view?.side === "right" ? dot : nothing}
			<slot style=${styleMap({ "--ww-placeholder": `"${this.msg("Item")}"` })} @slotchange=${() => this.requestUpdate()}></slot>
			${view?.side === "left" ? dot : nothing}
		</div>`;
	}
}

export { WebwriterPairingItem as WebwriterPairing };
