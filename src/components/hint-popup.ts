import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { LitElementWw } from "@webwriter/lit";
import { widgetPermissions } from "@webwriter/lit/permissions";
import { transaction } from "@webwriter/widget/transaction";
import BulbFilledIcon from "@tabler/icons/filled/bulb.svg";
import BulbIcon from "@tabler/icons/outline/bulb.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import { property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { TopLayerPopup, topLayerStyles } from "./top-layer";

/**
 * A reusable popup with a bulb trigger that manages a `<webwriter-quiz-hint>`
 * element on its host. Authors edit the hint in the popup, as learners read it.
 *
 * Use it inside your widget like this:
 * <hint-popup>
 *   <slot name="hint"></slot>
 * </hint-popup>
 *
 * Make sure to include `webwriter-quiz-hint?` in your widget's content property.
 */
export class HintPopup extends LitElementWw {
	static readonly CONTENT_TAG = "webwriter-quiz-hint";

	static styles = [topLayerStyles, css`
		:host {
			display: inline-block;
			position: relative;
			z-index: 10;
			height: 1.5em;
		}

		:host([labelled]) {
			height: auto;
		}

		/* Other uses can float their vacant hint trigger. Tasks reserve room for it. */
		:host([vacant]:not([reserve-space])) {
			position: absolute;
		}

		.hint-spacer {
			visibility: hidden;
		}

		:focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}

		sl-icon-button::part(base) {
			padding: var(--sl-spacing-2x-small);
		}

		/* The trigger and the buttons cannot be selected; the authored hint can. */
		.trigger,
		sl-icon-button {
			-webkit-user-select: none;
			user-select: none;
		}

		slot {
			-webkit-user-select: text;
			user-select: text;
		}

		/* The labelled trigger reads as text: its label sits on the baseline of the line it is in. */
		.trigger {
			display: inline-flex;
			align-items: baseline;
			gap: 0.35em;
			padding: 0 var(--sl-spacing-2x-small);
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: none;
			color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			font: inherit;
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
			white-space: nowrap;
			cursor: pointer;

			&:is(:hover, :focus-visible) {
				background: var(--sl-color-primary-50);
				text-decoration: underline;
				text-underline-offset: 0.2em;
			}

			sl-icon {
				align-self: center;
			}
		}

		:host([vacant]) .trigger:not(:hover, :focus-visible) {
			color: var(--sl-color-neutral-600);
		}

		/* The popup opens in the top layer and sizes to its text. */
		.panel {
			display: flex;
			align-items: flex-start;
			gap: var(--sl-spacing-x-small);
			box-sizing: border-box;
			inline-size: max-content;
			max-inline-size: min(24rem, calc(100vw - 16px));
			padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
			border: 1px solid var(--sl-color-primary-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-primary-50);
			box-shadow: var(--sl-shadow-medium);
			color: var(--sl-color-primary-900);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-normal);
			line-height: var(--sl-line-height-normal);
			overflow-wrap: anywhere;

			slot {
				display: block;
				flex: 1 1 auto;
				min-inline-size: 0;
			}
		}

		.panel-actions {
			display: inline-flex;
			align-items: center;
			flex: none;
			margin-block: calc(-1 * var(--sl-spacing-2x-small));
			margin-inline-end: calc(-1 * var(--sl-spacing-x-small));
		}

		.remove,
		.close {
			color: var(--sl-color-primary-800);
		}

		.remove::part(base):hover {
			color: var(--sl-color-danger-600);
		}

		@media print {
			:host {
				display: none;
			}
		}
	`];

	static scopedElements = {
		"sl-icon": SlIcon,
		"sl-icon-button": SlIconButton,
	};

	@property({ type: String, attribute: "slot-name", reflect: true })
	accessor slotName = "hint";

	@property({ type: String, attribute: "position", reflect: true })
	accessor position: "start" | "end" = "end";

	/** The accessible name of the trigger, and its text when it is labelled. */
	@property({ type: String })
	accessor label = "";

	@property({ type: String, attribute: "add-label" })
	accessor addLabel = "";

	@property({ attribute: false })
	accessor onAdd: (() => void) | undefined;

	/** The accessible name of the button that removes the hint in edit mode. */
	@property({ type: String, attribute: "remove-label" })
	accessor removeLabel = "";

	/** The accessible name of the button that closes the hint popup. */
	@property({ type: String, attribute: "close-label" })
	accessor closeLabel = "";

	/** Whether the trigger shows its label next to the bulb, as on a task. Otherwise it is an icon button. */
	@property({ type: Boolean, reflect: true })
	accessor labelled = false;

	@property({ type: Boolean, attribute: "reserve-space", reflect: true })
	accessor reserveSpace = false;

	#permissions = widgetPermissions(this);

	private trigger = createRef<HTMLElement>();
	private panel = createRef<HTMLElement>();

	/**
	 * The popup opens in the top layer, in front of the editor's controls. It closes on a press
	 * outside of it and once the editor moves the selection out of it. Authors type in the hint, so
	 * the focus may go to the editor while it stays open.
	 */
	#popup = new TopLayerPopup(this, () => ({ trigger: this.trigger.value, panel: this.panel.value, keep: this }), {
		align: () => (this.labelled ? "start" : "end"),
		followFocus: false,
	});

	private get open() {
		return this.#popup.open;
	}

	private get host(): HTMLElement | null {
		const root = this.getRootNode();
		if (root instanceof ShadowRoot) {
			return root.host as HTMLElement;
		}
		return this.parentElement;
	}

	private get hostContentEls(): HTMLElement[] {
		const host = this.host;
		if (!host || !this.slotName) return [];
		return Array.from(host.querySelectorAll<HTMLElement>(`:scope > [slot="${this.slotName}"]`));
	}

	private get hasContent(): boolean {
		return this.hostContentEls.some(el => el.innerText.trim() !== "");
	}

	private insertHintElement(host: HTMLElement): HTMLElement {
		const el = host.ownerDocument.createElement(HintPopup.CONTENT_TAG);
		el.slot = this.slotName;

		if (this.position === "start") {
			host.prepend(el);
		} else {
			host.append(el);
		}

		return el;
	}

	private toggle() {
		if (this.onAdd && !this.hostContentEls.length) {
			this.onAdd();
			return;
		}
		this.#popup.toggle();
		const host = this.host;
		if (!host) return;

		if (this.#permissions.editing && this.open && !this.hostContentEls.length) this.insertHintElement(host);
	}

	/** Opens the popup, for example on a hint that was just added. */
	show() {
		this.#popup.show();
	}

	private removeHint() {
		const host = this.host;
		const hints = this.hostContentEls;
		this.#popup.hide();
		if (!host || !this.#permissions.editing || !hints.length) return;
		transaction(host, () => hints.forEach(hint => hint.remove()));
	}

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		this.toggleAttribute("vacant", !this.hostContentEls.length || (!this.#permissions.editing && !this.hasContent));
	}

	private Trigger() {
		const filled = this.hasContent || this.open;
		const expanded = this.open ? "true" : "false";
		const addLabel = this.onAdd && !this.hostContentEls.length ? this.addLabel : nothing;
		if (this.labelled) {
			return html`<button
				type="button"
				class="trigger"
				part=${filled ? "filled" : "empty"}
				aria-label=${addLabel || nothing}
				title=${addLabel || nothing}
				aria-expanded=${expanded}
				aria-controls="panel"
				${ref(this.trigger)}
				@click=${() => this.toggle()}
			><sl-icon src=${BulbIcon}></sl-icon>${this.label}</button>`;
		}
		return html`<sl-icon-button
			part=${filled ? "filled" : "empty"}
			label=${this.label || nothing}
			aria-expanded=${expanded}
			aria-controls="panel"
			src=${filled ? BulbFilledIcon : BulbIcon}
			${ref(this.trigger)}
			@click=${() => this.toggle()}
		></sl-icon-button>`;
	}

	render() {
		const editing = this.#permissions.editing;
		if (this.host && !editing && !this.hasContent) {
			return this.reserveSpace ? html`<span class="hint-spacer" inert>${this.Trigger()}</span>` : nothing;
		}

		return html`<span @selectstart=${(e: Event) => e.stopImmediatePropagation()}>
			${this.Trigger()}
			<div popover="manual" class="top-layer" id="panel" ${ref(this.panel)}>
				<div class="panel">
					<slot @slotchange=${() => this.requestUpdate()}></slot>
					<div class="panel-actions">
						${editing && this.hostContentEls.length
							? html`<sl-icon-button class="remove" src=${TrashIcon} label=${this.removeLabel || nothing} @click=${() => this.removeHint()}></sl-icon-button>`
							: nothing}
						<sl-icon-button class="close" src=${XIcon} label=${this.closeLabel || "Close"} @click=${() => this.#popup.hide()}></sl-icon-button>
					</div>
				</div>
			</div>
		</span>`;
	}
}
