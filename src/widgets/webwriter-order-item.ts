import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import { css, html, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import ArrowRightIcon from "@tabler/icons/outline/arrow-right.svg";
import CheckIcon from "@tabler/icons/outline/check.svg";
import ChevronDownIcon from "@tabler/icons/outline/chevron-down.svg";
import ChevronUpIcon from "@tabler/icons/outline/chevron-up.svg";
import { str } from "@lit/localize";
import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import { WebwriterOrder } from "./webwriter-order";
import { QuizElement } from "../components/localization";
import { hasNonTextContent, itemContentStyles } from "../components/item-content";

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
 * It must be assigned to the default slot of its parent element. Items have no hints of their
 * own; a hint on an item from an earlier version stays in the markup but is not shown.
 */
@customElement("webwriter-order-item")
export class WebwriterOrderItem extends QuizElement {
	static styles = [
		itemContentStyles,
		css`
			slot {
				display: block;
				-webkit-user-select: text;
				user-select: text;
			}

			/* The position, the tags and the controls cannot be selected; the authored text of the item can. */
			.order-item {
				display: flex;
				align-items: center;
				gap: var(--sl-spacing-2x-small);
				padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
				min-height: 2.75rem;
				box-sizing: border-box;
				border: 1px solid var(--color-row);
				border-radius: var(--sl-border-radius-medium);
				transition:
					var(--sl-transition-fast) border-color,
					var(--sl-transition-fast) background-color;
				-webkit-user-select: none;
				user-select: none;
				--color-row: var(--sl-color-neutral-300);
				--color-background: var(--sl-color-neutral-0);
				--color-tag: var(--sl-color-neutral-700);
				background-color: var(--color-background);

				&.right {
					--color-row: var(--sl-color-success-600);
					--color-background: var(--sl-color-success-50);
					--color-tag: var(--sl-color-success-700);
				}

				&.wrong {
					--color-row: var(--sl-color-danger-600);
					--color-background: var(--sl-color-danger-50);
					--color-tag: var(--sl-color-danger-700);
				}
			}

			.order-item .content {
				flex: 1;
				min-width: 0;
			}

			.order-item .position.numbering-numeric {
				min-inline-size: 1.75em;
			}

			.content-row {
				display: flex;
				align-items: center;
				gap: var(--sl-spacing-x-small);
				overflow-wrap: break-word;

				slot:not([name]) {
					flex: 1;
					min-width: 0;
				}
			}

			slot:not([name])::slotted(:first-child) {
				margin-block-start: 0;
			}

			slot:not([name])::slotted(:last-child) {
				margin-block-end: 0;
			}

			.move {
				display: flex;
				flex: none;

				sl-icon-button::part(base) {
					padding: var(--sl-spacing-2x-small);
				}
			}

			.tag {
				flex: none;
				display: inline-flex;
				align-items: center;
				gap: 0.25em;
				color: var(--color-tag);
				font-size: var(--sl-font-size-small);
				font-weight: var(--sl-font-weight-semibold);
				white-space: nowrap;
			}

			.order-item:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
				outline-offset: var(--sl-focus-ring-offset);
			}


			:host(:not([contenteditable="true"]):not([contenteditable=""])) {
				.order-item:hover .grip {
					color: var(--sl-color-primary-600);
				}
			}

			.position {
				padding-inline-end: var(--sl-spacing-small);
				font-variant-numeric: tabular-nums;
				font-weight: bold;

				&.numbering-numeric {
					text-align: end;
				}

				&.numbering-none {
					padding: 0;
				}
			}

			.grip {
				height: 1lh;
				display: flex;
				align-items: center;
			}

			button.grip {
				justify-content: center;
				min-inline-size: 1.5rem;
				min-block-size: 1.5rem;
				padding: 0;
				border: 0;
				background: none;
				color: inherit;
			}

			[data-ww-drag-handle] {
				cursor: grab;
				touch-action: none;
			}

			.order-item.non-text {
				padding: 0;
				gap: 0;
				min-height: 0;
				.grip, .move, .tag { margin-inline: var(--sl-spacing-2x-small, 0.25rem); }
				.position { margin-inline-start: var(--sl-spacing-2x-small, 0.25rem); }
			}

			@media print {
				.grip {
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
		"sl-icon-button": SlIconButton,
	};

	/** @internal */
	getPositionText(): string {
		const parent = this.parentElement as WebwriterOrder | undefined;
		if (!parent) return "";
		const index = parent.items.indexOf(this);
		return index === -1 ? "" : this.positionLabel(index, parent.numberingStyle);
	}

	/** The label of a position in the current numbering style and direction. */
	private positionLabel(position: number, style: WebwriterOrder["numberingStyle"]): string {
		const parent = this.parentElement as WebwriterOrder | undefined;
		if (!parent) return "";
		let index = parent.direction === "descending" ? parent.items.length - 1 - position : position;

		switch (style) {
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

		const learner = !this.editing && !parent.graded;
		const nonText = hasNonTextContent(this);
		const dragFromGrip = this.editing || nonText;
		const feedback = !this.editing && parent.graded && parent.detailedFeedback;
		const index = parent.items.indexOf(this);
		const correctIndex = parent.correctIndex(this);
		const right = feedback && correctIndex === index;

		let tag: unknown = nothing;
		if (feedback && correctIndex !== -1) {
			tag = right
				? html`<sl-icon src=${CheckIcon}></sl-icon>${this.msg("Right place")}`
				: html`<sl-icon src=${ArrowRightIcon}></sl-icon>${this.msg(str`Belongs at ${this.positionLabel(correctIndex, parent.numberingStyle === "none" ? "numeric" : parent.numberingStyle).replace(/\.$/, "")}`)}`;
		}

		// Authors move the items with the same grip and arrows; in edit mode they set the correct order.
		const movable = learner || this.editing;
		const grip = learner && nonText
			? html`<button type="button" class="grip" aria-label=${this.msg("Move")} data-ww-drag-handle>
				<sl-icon src=${GripVerticalIcon} aria-hidden="true"></sl-icon>
			</button>`
			: html`<sl-icon class="grip" src=${GripVerticalIcon} ?data-ww-drag-handle=${this.editing}></sl-icon>`;
		const stop = (event: Event) => event.stopPropagation();
		const move = movable
			? html`<div class="move" @pointerdown=${stop} @keydown=${stop}>
					<sl-icon-button
						src=${ChevronUpIcon}
						label=${this.msg("Move up")}
						?disabled=${index <= 0}
						@click=${() => parent.moveItem(this, -1)}
					></sl-icon-button>
					<sl-icon-button
						src=${ChevronDownIcon}
						label=${this.msg("Move down")}
						?disabled=${index === -1 || index >= parent.items.length - 1}
						@click=${() => parent.moveItem(this, 1)}
					></sl-icon-button>
				</div>`
			: nothing;

		return html`
			<div
				class=${classMap({
					"order-item": true,
					"non-text": nonText,
					right,
					wrong: feedback && correctIndex !== -1 && !right,
				})}
				?data-ww-drag-handle=${learner && !dragFromGrip}
				tabindex=${learner && !dragFromGrip ? "0" : nothing}
			>
				${movable ? grip : html`<div></div>`}
				<div class="position numbering-${parent.numberingStyle}">${this.getPositionText()}</div>
				<div class="content">
					<div class="content-row">
						<slot style=${`--ww-placeholder: "${this.msg("Item")}"`} @slotchange=${() => this.requestUpdate()}></slot>
						${tag === nothing ? nothing : html`<span class="tag">${tag}</span>`}
						${move}
					</div>
				</div>
			</div>
		`;
	}
}
