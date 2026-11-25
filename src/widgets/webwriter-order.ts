import type { MsgFn } from "@lit/localize";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import ArrowDownUpIcon from "@tabler/icons/outline/arrows-sort.svg";
import { str } from "@lit/localize";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { scoreAllOrNothing, scoreOrderPosition, scoreOrderRelative } from "../model/scoring";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { QuizItems } from "../components/quiz-items";
import type { WebwriterOrderItem } from "./webwriter-order-item";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-order": WebwriterOrder;
	}
}

type OrderDirection = "ascending" | "descending";
type OrderNumberingStyle = "none" | "numeric" | "alphabetic" | "roman";
type OrderGradingMethod = "ungraded" | "pass-fail" | "partial-position" | "partial-relative" | "self-assess";
type OrderSolution = string[];

function createOrderItem(document: Document) {
	const item = document.createElement("webwriter-order-item");
	item.id = "ww" + crypto.randomUUID();
	item.append(document.createElement("p"));
	return item;
}

registerQuizType({
	packageId,
	widgetPosition: 50,
	section: "arrange",
	id: "webwriter-order",
	getName: (locale, translate = messageFor(locale)) => translate("Sequence"),
	icon: ArrowDownUpIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-order");
		task.append(createOrderItem(document), createOrderItem(document));
		return task;
	},
});

/**
 * An answer where learners drag items into the correct order.
 *
 * The items must be `<webwriter-order-item>` elements assigned to the default
 * slot.
 *
 * Conversion: the items can be converted to an `ol` in their correct order.
 */
@customElement("webwriter-order")
export class WebwriterOrder extends WebwriterTask {
	static shadowRootOptions: ShadowRootInit = { ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" };

	static styles = [
		WebwriterTask.styles,
		css`
			/* Each item lays itself out; the list only stacks them. */
			.container-list {
				display: flex;
				flex-direction: column;
				gap: var(--sl-spacing-x-small);
			}

			.task-helper + .container-list {
				margin-block-start: var(--sl-spacing-x-small);
			}

			.accept-reverse {
				min-inline-size: 0;
				gap: var(--sl-spacing-2x-small);
				padding-block: 0;

				input { flex: none; margin: 0; }
				span { overflow: hidden; text-overflow: ellipsis; }
			}

			.container-list ::slotted(webwriter-order-item) {
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
		addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add item") },
	};

	static convertTo = { ol: "toList" };

	static options = {
		...WebwriterTask.options,
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
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("Exact order only"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every item is in its exact position."),
				},
				{
					value: "partial-position",
					label: (widget: { msg: MsgFn }) => widget.msg("Correct positions"),
					description: (widget: { msg: MsgFn }) => widget.msg("Credit for each item placed in its exact slot."),
				},
				{
					value: "partial-relative",
					label: (widget: { msg: MsgFn }) => widget.msg("Relative order"),
					description: (widget: { msg: MsgFn }) => widget.msg("Credit for each pair of items ordered correctly relative to each other."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
		},
		acceptReverse: {
			type: "boolean",
			label: (widget: { msg: MsgFn }) => widget.msg("Accept reverse order"),
		},
	};

	static gradingOptions = ["points", "gradingMethod"];

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
	 * - `partial-relative`: Credit for each pair in the correct relative order.
	 * - `ungraded`: Record responses without scoring.
	 */
	@property({
		type: String, attribute: "grading-method", reflect: true, useDefault: true,
		converter: value => value === "partial-sequence" ? "partial-relative" : value,
	})
	accessor gradingMethod: OrderGradingMethod = "pass-fail";

	/** Whether reversing the solution sequence also counts as correct. */
	@property({ type: Boolean, attribute: "accept-reverse", reflect: true, useDefault: true })
	accessor acceptReverse = false;

	/**
	 * The IDs of the items in their correct order. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: OrderSolution = [];

	private orderItems = new QuizItems<WebwriterOrderItem>(this, "webwriter-order-item", () => true);

	/** @internal Whether the answer is locked after submitting. */
	@state() accessor graded = false;
	/** @internal Whether learners see per-item feedback after submitting. */
	@state() accessor detailedFeedback = false;

	private get effectiveSolution() {
		return this.solution.length || this.hasAttribute("solution")
			? this.solution
			: this.orderItems.authored.map(item => item.id);
	}

	protected willUpdate(changed: PropertyValues): void {
		super.willUpdate(changed);
		if (!this.editing) return;
		for (const item of this.orderItems.authored) {
			if (!item.id) item.id = "ww" + crypto.randomUUID();
		}
	}

	/** @internal The position an item belongs at, or -1 if the solution does not list it. */
	correctIndex(item: WebwriterOrderItem) {
		return this.effectiveSolution.indexOf(item.id);
	}

	/**
	 * @internal Moves an item one place earlier (-1) or later (1): in the learner's order, or in edit
	 * mode in the authored order, which is the solution. There, the move is one undo step.
	 */
	moveItem(item: WebwriterOrderItem, delta: -1 | 1) {
		if (this.graded && !this.editing) return;
		const items = this.items;
		const index = items.indexOf(item);
		const target = index + delta;
		if (index === -1 || target < 0 || target >= items.length) return;
		if (!this.editing) {
			this.orderItems.move(item, delta < 0 ? items[target] : (items[target + 1] ?? null));
			return;
		}
		const ids = items.map(other => other.id);
		ids.splice(target, 0, ...ids.splice(index, 1));
		void transaction(this, async () => {
			if (delta < 0) items[target].before(item);
			else items[target].after(item);
			this.solution = ids;
			await this.updateComplete;
		});
	}

		/** @internal */
		get items() {
			return this.orderItems.ordered;
		}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);

		if (changed.has("numberingStyle") || changed.has("direction") || changed.has("editable") ||
			changed.has("graded") || changed.has("detailedFeedback")) {
			this.refreshItems();
		}
	}

	/** @internal The items in their correct order as a numbered list. */
	toList() {
		const authored = this.orderItems.authored;
		const ordered = this.solution.map(id => authored.find(item => item.id === id)).filter((item): item is WebwriterOrderItem => item !== undefined);
		const list = this.ownerDocument.createElement("ol");
		for (const item of ordered.length > 0 ? ordered : authored) {
			const entry = this.ownerDocument.createElement("li");
			entry.textContent = item.textContent?.trim() ?? "";
			list.append(entry);
		}
		return list.childElementCount > 0 ? list : null;
	}

	checkValidity(): boolean {
		return true;
	}

	reset(): void {
		this.graded = false;
		this.detailedFeedback = false;
		this.orderItems.shuffle();
	}

	private scoreAgainst(order: readonly string[], solution: readonly string[]): number {
		if (!order.length) return 0;
		const matches = order.filter((id, index) => id === solution[index]).length;
		switch (this.gradingMethod) {
			case "pass-fail":
				return scoreAllOrNothing(matches, order.length);
			case "partial-position":
				return scoreOrderPosition(order, solution);
			case "partial-relative":
				return scoreOrderRelative(order, solution);
			default:
				return 0;
		}
	}

	checkAnswer(detailedFeedback = false): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		const order = this.items.map(item => item.id);
		const solution = this.effectiveSolution;
		const forward = this.scoreAgainst(order, solution);
		if (!this.acceptReverse || solution.length <= 1) return forward;
		const reverse = this.scoreAgainst(order, [...solution].reverse());
		return Math.max(forward, reverse);
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	private refreshItems() {
		this.items.forEach(item => item?.requestUpdate?.());
	}

	#drag = new Drag(this, { can: () => this.editing || !this.graded });

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

	protected get canAddOption() {
		return false;
	}

	protected addOption() {
		if (!this.isConnected || !this.editing) return;
		const item = createOrderItem(this.ownerDocument);
		// The new item and the solution that lists it are one undo step; the solution is written at the render.
		void transaction(this, async () => {
			this.insertBefore(item, this.feedbackElement);
			if (this.hasAttribute("solution")) this.solution = [...this.solution, item.id];
			await this.updateComplete;
		});
	}

	/** Authors set the correct order with the same controls learners use to answer. */
	private Helper() {
		if (this.graded && this.detailedFeedback && !this.editing) {
			const items = this.items;
			const right = items.filter((item, index) => this.correctIndex(item) === index).length;
			return this.msg(str`${right} of ${items.length} items are in the right place.`);
		}
		if (this.graded && !this.editing) return "";
		return this.editing ? this.msg("Arrange the items in the correct order.") : this.msg("Drag the items, or use the arrows.");
	}

	protected renderAnswer() {
		return html`${this.HelperRow(this.Helper(), html`
			<label class="answer-settings-trigger accept-reverse edit-only" data-ww-capture-selection="false"
				title=${this.msg("Accept reverse order")}>
				<input type="checkbox" .checked=${this.acceptReverse} @change=${(event: Event) => {
					if (!this.isConnected || !this.editing) return;
					const checked = (event.currentTarget as HTMLInputElement).checked;
					transaction(this, () => this.toggleAttribute("accept-reverse", checked));
				}}>
				<span>${this.msg("Accept reverse order")}</span>
			</label>
			<button type="button" class="header-control helper-action edit-only add-item" data-ww-capture-selection="false" @click=${this.addOption}>
				${this.msg("Add item")}
			</button>
		`)}<div
			class="container-list"
			data-ww-drop="item"
			data-ww-drop-position="index"
			@ww-dragcommit=${this.handleReorder}
		>
			<slot data-ww-drag="item" data-ww-drag-handle @slotchange=${this.refreshItems}></slot>
		</div>`;
	}
}
