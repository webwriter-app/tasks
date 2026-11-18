import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import GripHorizontalIcon from "@tabler/icons/outline/grip-horizontal.svg";
import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import { HintPopup } from "../components/hint-popup";
import { WebwriterOrder } from "./webwriter-order";
import { QuizElement } from "../components/localization";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-order-item": WebwriterOrderItem;
	}
}

const ROMAN_NUMERALS_TABLE: [number, string][] = [
	[1000, "M"],
	[900, "CM"],
	[500, "D"],
	[400, "CD"],
	[100, "C"],
	[90, "XC"],
	[50, "L"],
	[40, "XL"],
	[10, "X"],
	[9, "IX"],
	[5, "V"],
	[4, "IV"],
	[1, "I"],
];

/**
 * A single item of a `<webwriter-order>`.
 *
 * It must be assigned to the default slot of its parent element. An optional
 * `<webwriter-quiz-hint>` may be assigned to its `hint` slot.
 */
@customElement("webwriter-order-item")
export class WebwriterOrderItem extends QuizElement {
	static styles = [
		css`
			slot {
				display: block;
			}

			.order-item {
				background-color: var(--sl-color-neutral-0);
			}

			.layout-list {
				display: grid !important;
				grid-column: 1 / -1;
				grid-template-columns: subgrid;

				> * {
					padding: var(--sl-spacing-2x-small) 0;
				}
			}

			.actions,
			hint-popup::part(empty) {
				opacity: 0;
			}

			:is(:host(:hover), :host(:focus-within)) .actions {
				opacity: 1;
			}

			:is(:host(.ww-selected-text-within), :host(:hover), :host(:focus-within)) hint-popup::part(empty) {
				opacity: 1;
			}

			/* Without a pointer that hovers, the controls would stay invisible. */
			@media (hover: none) {
				.actions,
				hint-popup::part(empty) {
					opacity: 1;
				}
			}

			.order-item:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
				outline-offset: var(--sl-focus-ring-offset);
			}


			.layout-tiles {
				border: 1px solid var(--sl-input-border-color);
				border-radius: var(--sl-border-radius-large);
				padding: var(--sl-spacing-small);
				box-sizing: border-box;

				display: grid !important;
				grid-template-columns: auto 1fr max-content max-content;
				grid-template-rows: auto 1fr;
				grid-template-areas: "position . hint grab" "content content content content";
				position: relative;
				aspect-ratio: 1 / 1;

				.position {
					grid-area: position;
				}

				.content {
					grid-area: content;
				}

				hint-popup {
					grid-area: hint;
				}

				.grip {
					grid-area: grab;
				}

				.actions {
					position: absolute;
				}

				.actions {
					position: absolute;
					background: var(--sl-color-neutral-0);
					border: 1px solid var(--sl-input-border-color);
					border-radius: var(--sl-border-radius-pill);
					top: 0;
					left: 50%;
					translate: -50% -50%;
					padding: 0 var(--sl-spacing-x-small);
					box-sizing: border-box;
				}
			}

			:host(:not([contenteditable="true"]):not([contenteditable=""])) {
				.order-item:hover .grip {
					color: var(--sl-color-primary-600);
				}
			}

			.grip,
			.position {
				padding-right: var(--sl-spacing-small);
			}

			.position {
				font-variant-numeric: tabular-nums;
				font-weight: bold;

				&.numbering-numeric {
					text-align: right;
				}

				&.numbering-none {
					padding: 0;
				}
			}

			.actions,
			.grip {
				height: 1lh;
				display: flex;
				align-items: center;
			}

			[data-ww-drag-handle] {
				cursor: grab;
				touch-action: none;
			}

			@media print {
				.actions,
				.grip,
				hint-popup {
					display: none;
				}

				.order-item {
					break-inside: avoid;
				}

				/* On paper the learner writes the position into the box. */
				.position {
					color: transparent;
					min-width: 2em;
					border-bottom: 1px solid var(--sl-color-neutral-600);
					margin-inline-end: var(--sl-spacing-small);
					padding-right: 0;
				}
			}
		`,
	];

	/** @internal */
	static scopedElements = {
		"sl-icon": SlIcon,
		"hint-popup": HintPopup,
		"sl-icon-button": SlIconButton,
	};

	/** @internal */
	getPositionText(): string {
		const parent = this.parentElement as WebwriterOrder | undefined;
		if (!parent) return "";

		let index = parent.items.indexOf(this);
		if (index === -1) return "";

		if (parent.direction === "descending") index = parent.items.length - 1 - index;

		switch (parent.numberingStyle) {
			case "numeric":
				return (index + 1).toString() + ".";
			case "alphabetic":
				let result = "";
				do {
					result = String.fromCharCode((index % 26) + 65) + result;
					index = Math.floor(index / 26) - 1;
				} while (index >= 0);
				return result + ".";
			case "roman":
				return (
					ROMAN_NUMERALS_TABLE.reduce((acc, [value, numeral]) => {
						while (index + 1 >= value) {
							acc += numeral;
							index -= value;
						}
						return acc;
					}, "") + "."
				);
			default:
			case "none":
				return "";
		}
	}

	render() {
		const parent = this.parentElement as WebwriterOrder | undefined;
		if (!parent) return nothing;

		const gripIcon = parent.layout === "list" ? GripVerticalIcon : GripHorizontalIcon;

		return html`
			<div
				class=${classMap({
					"order-item": true,
					[`layout-${parent.layout}`]: true,
				})}
				?data-ww-drag-handle=${!this.editing}
				tabindex=${this.editing ? nothing : "0"}
			>
				${this.editing ? html`<div></div>` : html`<sl-icon class="grip" src=${gripIcon}></sl-icon>`}
				<div class="position numbering-${parent.numberingStyle}">${this.getPositionText()}</div>
				<slot class="content" style=${`--ww-placeholder: "${this.msg("Option")}"`}></slot>
				<div class="actions" data-ww-can="edit">
					<sl-icon-button ?data-ww-drag-handle=${this.editing} label=${this.msg("Move option")} src=${gripIcon}></sl-icon-button>
				</div>
				<hint-popup position="start" label=${this.msg("Hint")}><slot name="hint"></slot></hint-popup>
			</div>
		`;
	}
}
