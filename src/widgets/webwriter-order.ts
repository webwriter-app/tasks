import type { MsgFn } from "@lit/localize";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import ArrowDownUpIcon from "@tabler/icons/outline/arrows-sort.svg";
import { css, html, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { QuizItems } from "../components/quiz-items";
import type { WebwriterOrderItem } from "./webwriter-order-item";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-order": WebwriterOrder;
	}
}

type OrderLayout = "list" | "tiles";
type OrderDirection = "ascending" | "descending";
type OrderNumberingStyle = "none" | "numeric" | "alphabetic" | "roman";
type OrderGradingMethod = "pass-fail" | "partial-position" | "partial-sequence";
type OrderSolution = string[];

registerQuizType({
	packageId,
	widgetPosition: 20,
	id: "webwriter-order",
	getName: (locale, translate = messageFor(locale)) => translate("Order"),
	icon: ArrowDownUpIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-order");
		const item = document.createElement("webwriter-order-item");
		item.append(document.createElement("p"));
		task.append(item);
		return task;
	},
});

/**
 * An answer where learners drag items into the correct order.
 *
 * The items must be `<webwriter-order-item>` elements assigned to the default
 * slot.
 */
@customElement("webwriter-order")
export class WebwriterOrder extends WebwriterTask {
	static shadowRootOptions: ShadowRootInit = { ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" };

	static styles = [
		WebwriterTask.styles,
		css`
			.container-list {
				display: grid;
				grid-template-columns: max-content max-content minmax(0, 1fr) max-content max-content;
			}

			.container-list ::slotted(webwriter-order-item) {
				display: grid;
				grid-column: 1 / -1;
				grid-template-columns: subgrid;
			}

			.container-tiles {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(min(130px, 100%), 1fr));
				gap: var(--sl-spacing-medium);
			}

			.container-tiles ::slotted(webwriter-order-item) {
				display: block;
			}
		`,
	];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
	};

	static actions = {
		...WebwriterTask.actions,
		addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") },
	};

	static options = {
		...WebwriterTask.options,
		"layout": {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Layout"),
			options: [
				{ value: "list", label: (widget: { msg: MsgFn }) => widget.msg("List") },
				{ value: "tiles", label: (widget: { msg: MsgFn }) => widget.msg("Tiles") },
			],
			description: (widget: { msg: MsgFn }) => widget.msg("The layout variant to use."),
		},
		"direction": {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Direction"),
			options: [
				{ value: "ascending", label: (widget: { msg: MsgFn }) => widget.msg("Ascending") },
				{ value: "descending", label: (widget: { msg: MsgFn }) => widget.msg("Descending") },
			],
			description: (widget: { msg: MsgFn }) => widget.msg("The order direction to use."),
		},
		numberingStyle: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Numbering"),
			options: [
				{ value: "none", label: (widget: { msg: MsgFn }) => widget.msg("None") },
				{ value: "numeric", label: (widget: { msg: MsgFn }) => widget.msg("Numeric") },
				{ value: "alphabetic", label: (widget: { msg: MsgFn }) => widget.msg("Alphabetic") },
				{ value: "roman", label: (widget: { msg: MsgFn }) => widget.msg("Roman") },
			],
			description: (widget: { msg: MsgFn }) => widget.msg("The numbering style to use."),
		},
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading"),
			options: [
				{ value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Pass/Fail") },
				{ value: "partial-position", label: (widget: { msg: MsgFn }) => widget.msg("Partial (Position)") },
				{ value: "partial-sequence", label: (widget: { msg: MsgFn }) => widget.msg("Partial (Sequence)") },
			],
			description: (widget: { msg: MsgFn }) => widget.msg("The grading method to use."),
		},
	};

	/**
	 * How the items are arranged.
	 *
	 * - `list`: One item per row.
	 * - `tiles`: A responsive grid of equally sized tiles.
	 */
	@property({ type: String, attribute: "layout", reflect: true, useDefault: true })
	accessor layout: OrderLayout = "list";

	/**
	 * The direction in which the items are numbered.
	 *
	 * - `ascending`: The first item carries the lowest position.
	 * - `descending`: The first item carries the highest position.
	 */
	@property({ type: String, attribute: "direction", reflect: true, useDefault: true })
	accessor direction: OrderDirection = "ascending";

	/**
	 * How the position of each item is labelled.
	 *
	 * - `none`: No position is shown.
	 * - `numeric`: Arabic numerals (1., 2., 3., ...).
	 * - `alphabetic`: Latin letters (A., B., C., ...).
	 * - `roman`: Roman numerals (I., II., III., ...).
	 */
	@property({ type: String, attribute: "numbering-style", reflect: true, useDefault: true })
	accessor numberingStyle: OrderNumberingStyle = "numeric";

	/**
	 * How the score of this answer is calculated.
	 *
	 * - `pass-fail`: Full score only if every item is in its correct position.
	 * - `partial-position`: Credit for each item in its correct position.
	 * - `partial-sequence`: Credit for each pair of adjacent items in the correct order.
	 */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: OrderGradingMethod = "pass-fail";

	/**
	 * The IDs of the items in their correct order. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: OrderSolution = [];

	private orderItems = new QuizItems<WebwriterOrderItem>(this, "webwriter-order-item", () => true);

		/** @internal */
		get items() {
			return this.orderItems.ordered;
		}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);

		if (changed.has("layout") || changed.has("numberingStyle") || changed.has("direction") || changed.has("editable")) {
			this.refreshItems();
		}
	}

	checkValidity(): boolean {
		return true;
	}

	reset(): void {
		this.orderItems.shuffle();
	}

	checkAnswer(_detailedFeedback?: boolean): number {
		const order = this.items.map(item => item.id);
		const solution = this.solution.length || this.hasAttribute("solution")
			? this.solution
			: this.orderItems.authored.map(item => item.id);
		if (!order.length) return 0;
		const matches = order.filter((id, index) => id === solution[index]).length;

		switch (this.gradingMethod) {
			case "pass-fail":
				return matches === order.length ? 1 : 0;
			case "partial-position":
				return matches / order.length;
			case "partial-sequence": {
				if (order.length === 1) return matches;
				const adjacentMatches = order.slice(0, -1).filter((id, index) => {
					const position = solution.indexOf(id);
					return position !== -1 && solution[position + 1] === order[index + 1];
				}).length;
				return adjacentMatches / (order.length - 1);
			}
			default:
				return 0;
		}
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	private refreshItems() {
		this.items.forEach(item => item?.requestUpdate?.());
	}

	#drag = new Drag(this);

	private handleReorder = (event: CustomEvent<DragCommitDetail>) => {
		const { item, before } = event.detail;
		if (!this.editing) {
			// The learner's order lives in memory; the authored children stay where they are.
			event.preventDefault();
			this.orderItems.move(item, before);
			return;
		}
		const items = this.orderItems.authored;
		if (!items.includes(item as WebwriterOrderItem) || (before && !items.includes(before as WebwriterOrderItem))) {
			event.preventDefault();
			return;
		}
		// The drag moves the child itself; the solution follows in the same undo step.
		const ids = items.filter(other => other !== item).map(other => other.id);
		ids.splice(before ? ids.indexOf(before.id) : ids.length, 0, item.id);
		this.solution = ids;
	};

	protected addOption() {
		if (!this.isConnected || !this.editing) return;
		const item = this.ownerDocument.createElement("webwriter-order-item");
		item.id = "ww" + crypto.randomUUID();
		item.append(this.ownerDocument.createElement("p"));
		// The new item and the solution that lists it are one undo step; the solution is written at the render.
		void transaction(this, async () => {
			this.insertBefore(item, this.feedbackElement);
			if (this.hasAttribute("solution")) this.solution = [...this.solution, item.id];
			await this.updateComplete;
		});
	}

	protected renderAnswer() {
		return html`<div
			class="container-${this.layout}"
			data-ww-drop="item"
			data-ww-drop-position="index"
			@ww-dragcommit=${this.handleReorder}
		>
			<slot data-ww-drag="item" data-ww-drag-handle @slotchange=${this.refreshItems}></slot>
		</div>`;
	}
}
