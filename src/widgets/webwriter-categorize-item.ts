import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { CardActivity } from "../components/card-activity";
import { gridCardStyles } from "../components/grid-styles";
import { hasNonTextContent } from "../components/item-content";
import { WebwriterGridItem } from "./webwriter-grid-item";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-categorize-item": WebwriterCategorizeItem;
	}
}

type AnswerCardView = {
	draggable: boolean;
	dimmed: boolean;
	counterpartHovered: boolean;
	correction: string | null;
};

/** One editable answer in the Groups task. */
@customElement("webwriter-categorize-item")
export class WebwriterCategorizeItem extends WebwriterGridItem {
	static scopedElements = { "sl-icon": SlIcon };

	static styles = [...WebwriterGridItem.styles, gridCardStyles, css`
		.grid-card {
			padding: 0;
			gap: 0;
			--grid-item-padding: 0;
			--grid-item-media-height: none;
		}

		.grid-card.embedded::after { display: none; }
		.grid-card[data-ww-drag-handle] { touch-action: none; }

		.card-content {
			flex: 1 1 auto;
			min-inline-size: 0;
			padding: var(--sl-spacing-2x-small, 0.25rem) var(--sl-spacing-x-small, 0.5rem);
		}

		.embedded .card-content { padding: 0; }
		.drag-handle { margin-inline: var(--sl-spacing-2x-small, 0.25rem); }
	`];

	/** @internal The state of this answer in the Answers pane. */
	@property({ attribute: false }) accessor cardView: AnswerCardView | null = null;

	#activity = new CardActivity(this);

	/** @internal The editor and CardActivity set selection states here. */
	get selectionStates() {
		return this.#activity.states;
	}

	render() {
		const view = this.cardView;
		if (!view) return super.render();
		const embedded = hasNonTextContent(this);
		return html`<div class=${classMap({
				"grid-card": true,
				key: this.editing,
				embedded,
				dimmed: view.dimmed,
				"counterpart-hovered": view.counterpartHovered,
				missed: view.correction !== null,
			})} ?data-ww-drag=${view.draggable}
			?data-ww-drag-handle=${view.draggable && !this.editing && !embedded}
			tabindex=${view.draggable && !this.editing && !embedded ? "0" : nothing}>
			${view.draggable && (this.editing || embedded)
				? html`<button type="button" class="drag-handle" data-ww-drag-handle aria-label=${this.msg("Move")}>
					<sl-icon src=${GripVerticalIcon} aria-hidden="true"></sl-icon>
				</button>`
				: nothing}
			<div class="card-content"><div>${super.render()}</div></div>
		</div>
		${view.correction !== null
			? html`<span class="correction" aria-label=${this.msg("Solution")}>${view.correction}</span>` : nothing}`;
	}
}
