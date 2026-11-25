import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { CardActivity } from "../components/card-activity";
import { gridCardStyles } from "../components/grid-styles";
import { WebwriterGridItem } from "./webwriter-grid-item";

export const imagePlacementCardStyles = css`
	.grid-card {
		padding: 0;
		gap: 0;
		--grid-item-padding: var(--sl-spacing-2x-small, 0.25rem) var(--sl-spacing-x-small, 0.5rem);
		--grid-item-media-height: 5rem;
	}

	.grid-card::after { display: none; }
	.grid-card > .drag-handle {
		position: relative;
		display: inline-grid;
		place-items: center;
		min-inline-size: 1.5rem;
		min-block-size: 1.5rem;
		margin-inline: var(--sl-spacing-2x-small, 0.25rem);
		-webkit-user-select: none;
		user-select: none;
	}
	.drag-handle > sl-icon { pointer-events: none; }
	.drag-handle:not([data-ww-drag-handle]) { cursor: default; touch-action: auto; }

	@media (pointer: coarse) {
		.grid-card > [data-ww-drag-handle] {
			min-inline-size: 44px;
			min-block-size: 44px;
		}
	}
`;

/** An editable option in an Image Placements task. */
@customElement("webwriter-image-placement-item")
export class WebwriterImagePlacementItem extends WebwriterGridItem {
	static styles = [...WebwriterGridItem.styles, gridCardStyles, imagePlacementCardStyles, css`
		.card-content { flex: 1; min-inline-size: 0; }
	`];

	/** @internal Whether the option can be dragged to a solution zone. */
	@property({ attribute: false }) accessor canDragToZone = false;

	/** @internal The option's appearance in the Options pane. */
	@property({ attribute: false }) accessor dimmed = false;
	@property({ attribute: false }) accessor counterpartHovered = false;

	#activity = new CardActivity(this);

	get selectionStates() { return this.#activity.states; }

	private keepSelectionOnCardPress(event: MouseEvent) {
		const target = event.target;
		if (event.button === 0 && target instanceof Element && !this.contains(target) && !target.closest("[data-ww-drag-handle]")) {
			// Let a click capture the card without first moving the caret into its content on press.
			event.preventDefault();
		}
	}

	render() {
		const content = super.render();
		if (!this.editing) return content;
		const grip = html`<sl-icon src=${GripVerticalIcon} aria-hidden="true"></sl-icon>`;
		return html`<div class=${classMap({
			"grid-card": true,
			key: true,
			dimmed: this.dimmed,
			"counterpart-hovered": this.counterpartHovered,
		})} @mousedown=${this.keepSelectionOnCardPress}>
			${this.canDragToZone
				? html`<button type="button" class="drag-handle" data-ww-drag-handle aria-label=${this.msg("Move")}>${grip}</button>`
				: html`<span class="drag-handle" aria-hidden="true">${grip}</span>`}
			<div class="card-content">${content}</div>
		</div>`;
	}
}
