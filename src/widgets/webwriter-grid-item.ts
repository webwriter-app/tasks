import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import PlusIcon from "@tabler/icons/outline/plus.svg";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { QuizElement } from "../components/localization";
import { hasNonTextContent, itemContentStyles } from "../components/item-content";
import { TopLayerPopup, topLayerStyles } from "../components/top-layer";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-grid-item": WebwriterGridItem;
	}
}

type GroupPicker = {
	label: string;
	options: { id: string; label: string }[];
	disabled: boolean;
	place: (id: string) => void;
};

/**
 * A single header, cell, or card item inside a grid quiz task.
 *
 * It must be a direct child of its parent grid task element.
 */
@customElement("webwriter-grid-item")
export class WebwriterGridItem extends QuizElement {
	static scopedElements = { "sl-icon": SlIcon };

	static styles = [itemContentStyles, topLayerStyles, css`
		:host {
			display: block;
			width: 100%;
			min-width: 0;
			box-sizing: border-box;
		}

		slot {
			display: block;
			text-align: var(--grid-item-align, start);
			padding: var(--grid-item-padding, 0);
			box-sizing: border-box;
		}

		::slotted(p) {
			min-width: 0;
			margin: 0;
			overflow-wrap: anywhere;
		}

		::slotted(picture) {
			max-block-size: var(--grid-item-media-height, 6rem);
			overflow: hidden;
		}

		slot.non-text { padding: 0; }

		.group-frame {
			grid-area: 1 / 1 / span 2;
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
		}

		.group-header {
			grid-area: 1 / 1;
			display: flex;
			align-items: center;
			margin: 1px 1px 0;
			padding: var(--sl-spacing-x-small, 0.5rem) var(--sl-spacing-small, 0.75rem);
			--grid-item-media-height: none;
			border-block-end: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium) var(--sl-border-radius-medium) 0 0;
			background: var(--sl-color-neutral-50);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
		}

		.group-header:has(slot.non-text) { padding: 0; }
		.group-title { flex: 1; min-inline-size: 0; }
		.group-picker { flex: none; margin-inline-start: var(--sl-spacing-2x-small); }
		.group-header:has(slot.non-text) .group-picker { margin-inline-end: var(--sl-spacing-2x-small); }

		.group-place {
			display: grid;
			place-items: center;
			inline-size: 1.5rem;
			block-size: 1.5rem;
			padding: 0;
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: transparent;
			color: var(--sl-color-primary-700);
			font: inherit;
			cursor: pointer;
		}
		.group-place:enabled:hover { background: var(--sl-color-primary-50); }
		.group-place:disabled { opacity: 0.45; cursor: default; }

		.placement-options {
			inline-size: min(15rem, calc(100vw - 1rem));
			box-sizing: border-box;
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-medium);
			color: var(--sl-color-neutral-700);
		}
		.placement-list {
			display: grid;
			gap: var(--sl-spacing-3x-small);
			max-block-size: min(16rem, var(--popup-space, 80dvh));
			overflow: auto;
			padding: var(--sl-spacing-2x-small);
		}
		.placement-list > button {
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: transparent;
			color: inherit;
			font: inherit;
			text-align: start;
			overflow-wrap: anywhere;
			cursor: pointer;
		}
		.placement-list > button:hover { background: var(--sl-color-primary-50); }
		.placement-list > p { margin: var(--sl-spacing-2x-small); }
		@media print { .group-picker { display: none; } }
	`];

	/** Placeholder label shown inside an empty item in edit mode. */
	@property({ type: String })
	accessor placeholder = "";

	/** @internal The Groups task supplies the available placements for this heading. */
	@property({ attribute: false })
	accessor groupPicker: GroupPicker | null = null;

	#placementPopup = new TopLayerPopup(this, () => {
		const keep = this.renderRoot.querySelector<HTMLElement>(".group-picker");
		return {
			keep,
			trigger: keep?.querySelector<HTMLElement>(".group-place"),
			panel: keep?.querySelector<HTMLElement>(".placement-options"),
			scrollArea: keep?.querySelector<HTMLElement>(".placement-list"),
		};
	}, {
		align: "end",
		onShow: () => {
			const panel = this.renderRoot.querySelector<HTMLElement>(".placement-options");
			(panel?.querySelector("button") ?? panel)?.focus({ preventScroll: true });
		},
	});

	connectedCallback() {
		super.connectedCallback();
		if (this.parentElement?.localName !== "webwriter-categorize") this.groupPicker = null;
		this.requestUpdate();
	}

	private keepSelectionOnGroupPress(event: MouseEvent) {
		if (event.button !== 0 || event.target !== event.currentTarget || !this.editing) return;
		// A press on the card can otherwise move the browser caret into its title before capture on click.
		event.preventDefault();
		const active = this.ownerDocument.activeElement;
		if (active !== this.parentElement && active?.parentElement !== this.parentElement) return;
		const grip = active?.shadowRoot?.activeElement;
		// Release a picked-up card's grip during the press, while Drag still accepts the upcoming drop click.
		if (grip instanceof HTMLElement && grip.hasAttribute("data-ww-drag-handle")) grip.blur();
	}

	private renderGroupPicker() {
		const picker = this.groupPicker;
		if (!picker) return nothing;
		return html`<div class="group-picker" data-ww-capture-selection="false"
			@keydown=${(event: KeyboardEvent) => event.stopPropagation()}>
			<button type="button" class="group-place" title=${picker.label} aria-label=${picker.label}
				aria-haspopup="dialog" aria-controls="placement-options" aria-expanded=${this.#placementPopup.open}
				?disabled=${picker.disabled} @click=${() => this.#placementPopup.toggle()}>
				<sl-icon src=${PlusIcon} aria-hidden="true"></sl-icon>
			</button>
			<div id="placement-options" class="placement-options top-layer" popover="manual" role="dialog"
				aria-label=${picker.label} tabindex="-1">
				<div class="placement-list">
					${picker.options.length ? picker.options.map(option => html`<button type="button" @click=${() => {
						this.#placementPopup.hide();
						this.renderRoot.querySelector<HTMLElement>(".group-place")?.focus({ preventScroll: true });
						picker.place(option.id);
					}}>${option.label}</button>`) : html`<p>${this.msg("All options are already in this group.")}</p>`}
				</div>
			</div>
		</div>`;
	}

	protected labelSlot(nonText: boolean) {
		return html`<slot
			class=${nonText ? "non-text" : nothing}
			@slotchange=${() => this.requestUpdate()}
			style=${styleMap({
				"--ww-placeholder": `"${this.placeholder || this.msg("Item")}"`,
			})}
		></slot>`;
	}

	render() {
		const content = this.labelSlot(hasNonTextContent(this));
		if (this.localName !== "webwriter-grid-item" || this.parentElement?.localName !== "webwriter-categorize") return content;
		return html`
			<div class="group-frame" @mousedown=${this.keepSelectionOnGroupPress}></div>
			<div class="group-header" @mousedown=${this.keepSelectionOnGroupPress}>
				<div class="group-title">${content}</div>${this.renderGroupPicker()}
			</div>
		`;
	}
}

/** A Choice header whose selection frame can include all of its cells. */
export abstract class ChoiceGridHeader extends WebwriterGridItem {
	static styles = [...WebwriterGridItem.styles, css`
		:host(:state(ww-element-selected)) {
			/* WebWriter measures the rendered children of a contents host. */
			display: contents !important;
		}

		.choice-grid-label {
			display: flex;
			align-items: center;
			justify-content: var(--grid-item-align, start);
			box-sizing: border-box;
			block-size: 100%;
			padding: var(--grid-item-padding, 0);
		}

		.choice-grid-label > div {
			min-inline-size: min(2.5rem, 100%);
			max-inline-size: 100%;
		}

		.choice-grid-label ::slotted(p) { min-block-size: max(1lh, 1.5rem); }

		:host(webwriter-choice-column) ::slotted(p:empty) {
			display: grid;
			place-items: center;
			text-align: start;
		}

		:host(webwriter-choice-column) ::slotted(p:empty)::before {
			/* Center the visible placeholder instead of the editor's zero-width placeholder box. */
			inline-size: auto !important;
			max-inline-size: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.choice-grid-label slot { padding: 0; }
		.choice-grid-label.non-text { padding: 0; }
		.choice-grid-label.non-text > div { inline-size: 100%; }

		.choice-axis {
			display: none;
			position: absolute;
			inset-block-start: 0;
			inset-inline-start: 0;
			pointer-events: none;
		}

		:host(:state(ww-element-selected)) .choice-axis { display: block; }

		:host(webwriter-choice-column) .choice-axis {
			inset-inline-end: 0;
			block-size: var(--choice-grid-block-size, 100%);
		}

		:host(webwriter-choice-row) .choice-axis {
			inset-block-end: 0;
			inline-size: var(--choice-grid-inline-size, 100%);
		}
	`];

	#internals = this.attachInternals();

	get selectionStates() { return this.#internals.states; }

	private keepSelectionOnLabelPress(event: MouseEvent) {
		// Keep the existing caret until WebWriter captures the label on click.
		if (event.button === 0 && event.target === event.currentTarget && this.editing) event.preventDefault();
	}

	render() {
		const nonText = hasNonTextContent(this);
		return html`
			<div class=${nonText ? "choice-grid-label non-text" : "choice-grid-label"}
				@mousedown=${this.keepSelectionOnLabelPress}><div>${this.labelSlot(nonText)}</div></div>
			<div class="choice-axis" aria-hidden="true"></div>
		`;
	}
}
