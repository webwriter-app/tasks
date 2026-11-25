import type { MsgFn } from "@lit/localize";
import { GapGridTask, type GapGridGrading } from "../components/gap-grid-task";
import { transaction } from "@webwriter/widget/transaction";
import InputCursorIcon from "@tabler/icons/outline/cursor-text.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import type { WebwriterGapItem } from "./webwriter-gap-item";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { randomizeArray } from "../model/randomize-array";
import { matchText, scoreAllOrNothing, scoreProportion } from "../model/scoring";
import { messageFor } from "../components/localization";
import { WebwriterTask, textToleranceOptions } from "../components/webwriter-task";
import { gapChoices, gapChoicesAttribute, shuffledGapChoices } from "../components/gap-choices";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-gap": WebwriterGap;
	}
}

export type GapMode = "input" | "drag-and-drop" | "dropdown";

function createGap() {
	const task = document.createElement("webwriter-gap");
	task.append(document.createElement("p"));
	return task;
}

registerQuizType({
	packageId,
	widgetPosition: 40,
	section: "write",
	id: "webwriter-gap",
	getName: (locale, translate = messageFor(locale)) => translate("Gap text", { id: "sbbb7581f20733d79" }),
	icon: InputCursorIcon,
	createInstance: createGap,
	matches: element => element.localName === "webwriter-gap",
});

/**
 * An answer where learners fill the gaps in a text.
 *
 * The text must be assigned to the default slot, with a `<webwriter-gap-item>`
 * in place of each gap.
 */
@customElement("webwriter-gap")
export class WebwriterGap extends GapGridTask {
	static styles = [GapGridTask.styles, css`
		:host {
			display: block !important;
		}

		slot:not([name]) {
			display: block;
			cursor: text;
			width: 100%;
		}

		.task-helper + .gap-answer {
			padding-block-start: var(--sl-spacing-x-small);
		}

		.choices {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5em;
			margin-top: 1em;
			min-height: 2em;
			align-items: flex-start;
		}

		.choice {
			font: inherit;
			color: inherit;
			padding: 0 var(--sl-spacing-x-small);
			height: 2em;
			box-sizing: border-box;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			white-space: nowrap;
			line-height: normal;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			position: relative;
			cursor: grab;
			touch-action: none;
			user-select: none;
		}

		/* The chip that follows the pointer during a drag. Styled as a choice, so that the
		   only thing left to set imperatively is its position and size. */
		.choice.ghost {
			position: fixed;
			left: 0;
			top: 0;
			margin: 0;
			z-index: 2147483647;
			pointer-events: none;
			display: none;
			cursor: grabbing;
		}

		slot:not([name])::slotted(*) {
			line-height: 2;
		}

		:host ::highlight(webwriter-gap-preview) {
			background-color: color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 16%, transparent);
		}
	`];

	private static previewHighlight = typeof Highlight !== "undefined" ? new Highlight() : null;
	static {
		if (WebwriterGap.previewHighlight && typeof CSS !== "undefined" && "highlights" in CSS) {
			CSS.highlights.set("webwriter-gap-preview", WebwriterGap.previewHighlight);
		}
	}

	static actions = {
		...WebwriterTask.actions,
		insertGapAtSelection: { label: (widget: { msg: MsgFn }) => widget.msg("Insert gap at selection") },
	};

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every gap is filled correctly."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per gap"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly filled gap."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
		},
		...textToleranceOptions,
	};

	static gradingOptions = ["points", "gradingMethod"];

	get options() {
		return this.grid ? this.gridOptions() : this.declarationsWithout("options", []);
	}

	get actions() {
		return this.grid
			? this.declarationsWithout("actions", [], GapGridTask.gridActions)
			: this.declarationsWithout("actions", []);
	}

	protected get canAddOption() {
		return false;
	}

	protected get addOptionLabel() {
		return this.grid ? this.gridAddOptionLabel : super.addOptionLabel;
	}

	protected addOption() {
		if (this.grid) this.addGridOption();
	}

	/**
	 * How learners fill the gaps.
	 *
	 * - `input`: Each gap is a text field learners type into.
	 * - `drag-and-drop`: The gaps are filled from a shared pool of draggable answers.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor mode: GapMode = "input";

	/** Whether points are awarded per correct gap (`partial`) or all-or-nothing (`pass-fail`). */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: GapGridGrading = "partial";

	/**
	 * Whether answers are compared to the solution case-insensitively. Only applies in `input` mode.
	 */
	@property({ type: Boolean, attribute: "ignore-case", reflect: true, useDefault: true })
	accessor ignoreCase = false;

	/** Whether punctuation and diacritics are ignored when comparing typed answers. Only applies in `input` mode. */
	@property({ type: Boolean, attribute: "ignore-punctuation", reflect: true, useDefault: true })
	accessor ignorePunctuation = false;

	/** Whether minor spelling typos are accepted when comparing typed answers. Only applies in `input` mode. */
	@property({ type: Boolean, attribute: "allow-typos", reflect: true, useDefault: true })
	accessor allowTypos = false;

	@state() private accessor graded = false;

	@state()
	private accessor items: WebwriterGapItem[] = [];
	private choices: WebwriterGapItem[] = [];
	private placements = new Map<WebwriterGapItem, WebwriterGapItem>();
	private selected: WebwriterGapItem | null = null;
	private previewRange: Range | null = null;
	private observer = new MutationObserver(records => {
		if (records.some(record => record.type !== "characterData")) this.syncItems();
		this.requestUpdate();
		this.updateToggleAvailability();
	});
	private drag: {
		choice: WebwriterGapItem;
		pointerId: number;
		x: number;
		y: number;
		offsetX: number;
		offsetY: number;
		ghost: HTMLElement;
		moved: boolean;
	} | null = null;
	private suppressClick = false;

	private syncItems = () => {
		const items = Array.from(this.querySelectorAll<WebwriterGapItem>("webwriter-gap-item"))
			.filter(item => !this.grid && item.closest("webwriter-gap") === this && this.isAnswerContent(item));
		if (items.length === this.items.length && items.every((item, i) => item === this.items[i])) return;

		this.cancelDrag();
		for (const [target, choice] of this.placements) {
			if (!items.includes(target) || !items.includes(choice)) this.placements.delete(target);
		}
		if (this.selected && !items.includes(this.selected)) this.selected = null;
		this.items = items;
		this.choices = randomizeArray(items);
	};

	connectedCallback(): void {
		super.connectedCallback();
		this.observer.observe(this, { childList: true, subtree: true, characterData: true, attributeFilter: ["slot", gapChoicesAttribute, "distractors"] });
		this.syncItems();
		this.ownerDocument.addEventListener("keydown", this.insertGapOnKeyDown, { capture: true });
		this.ownerDocument.addEventListener("selectionchange", this.updateToggleAvailability);
		this.addEventListener("focusin", this.updateToggleOnFocusChange);
		this.addEventListener("focusout", this.updateToggleOnFocusChange);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.observer.disconnect();
		this.cancelDrag();
		this.setPreviewToggle(false);
		this.ownerDocument.removeEventListener("keydown", this.insertGapOnKeyDown, { capture: true });
		this.ownerDocument.removeEventListener("selectionchange", this.updateToggleAvailability);
		this.removeEventListener("focusin", this.updateToggleOnFocusChange);
		this.removeEventListener("focusout", this.updateToggleOnFocusChange);
	}

	private updateToggleOnFocusChange = () => {
		if (this.editing && !this.grid) this.requestUpdate();
	};

	private updateToggleAvailability = () => {
		if (!this.editing || this.grid) return;
		const button = this.shadowRoot?.querySelector<HTMLButtonElement>(".toggle-gap");
		if (button && button.disabled === Boolean(this.getGapToggleTarget())) this.requestUpdate();
		if (this.previewRange) this.setPreviewToggle(true);
	};

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (!this.grid) {
			const slot = this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name], [data-child-id])");
			const nodes = Array.from(this.childNodes).filter((node): node is Element | Text =>
				(node instanceof Element || node instanceof Text) && this.isAnswerContent(node));
			const assigned = slot?.assignedNodes();
			if (assigned && (assigned.length !== nodes.length || nodes.some((node, index) => node !== assigned[index]))) slot!.assign(...nodes);
		}
		if (changed.has("mode")) this.refreshDrawer();
		if (changed.has("mode") || changed.has("editable")) this.cancelDrag();
		if (!this.editing) this.setPreviewToggle(false);
	}

	private get usesLegacyDrag() {
		return this.mode === "drag-and-drop" && !this.items.some(item => gapChoices(item) !== undefined);
	}

	private optionsFor(item: WebwriterGapItem): string[] | undefined {
		const alternatives = gapChoices(item);
		if (alternatives) {
			return alternatives.length ? shuffledGapChoices(item, [(item.textContent ?? "").trim(), ...alternatives]) : undefined;
		}
		if (this.mode === "dropdown") {
			return shuffledGapChoices(item, this.items.map(entry => (entry.textContent ?? "").trim()));
		}
		return undefined;
	}

	private answerFor(item: WebwriterGapItem): string {
		if (this.usesLegacyDrag) return (this.placements.get(item)?.textContent ?? "").trim();
		const choices = this.optionsFor(item);
		return choices && !choices.includes(item.inputAnswer) ? "" : item.inputAnswer.trim();
	}

	/** Pushes the state owned by this element onto the items, as part of every update. */
	protected willUpdate(changed: PropertyValues) {
		super.willUpdate(changed);
		if (this.grid) return;
		for (const item of this.items) {
			const choice = this.placements.get(item);
			const choices = this.optionsFor(item);
			item.mode = this.usesLegacyDrag ? "drag-and-drop" : choices ? "dropdown" : "input";
			item.graded = this.graded;
			item.answer = choice?.textContent ?? "";
			item.answerSelected = choice !== undefined && choice === this.selected;
			item.dropdownOptions = choices ?? [];
		}
	}

	/** Moves `choice` into the gap `target`, or back into the tray of choices for `null`. */
	private place(choice: WebwriterGapItem, target: WebwriterGapItem | null) {
		if (this.graded) return;
		// The gap `choice` currently sits in, or null while it is in the tray.
		const source = Array.from(this.placements).find(([, value]) => value === choice)?.[0] ?? null;
		this.selected = null;
		this.requestUpdate();
		if (source === target) return;

		// A choice already in `target` swaps places with the incoming one, or returns to the tray.
		const displaced = target ? this.placements.get(target) : undefined;
		if (source) this.placements.delete(source);
		if (source && displaced) this.placements.set(source, displaced);
		if (target) this.placements.set(target, choice);
		/**
		 * Dispatched when learners move an answer into or out of a gap. Only in `drag-and-drop` mode.
		 */
		this.dispatchEvent(new Event("change", { bubbles: true }));
	}

	/** @internal */
	activateGap(item: WebwriterGapItem) {
		if (this.graded || this.suppressClick || this.editing || !this.usesLegacyDrag) return;
		if (this.selected) this.place(this.selected, item);
		else {
			this.selected = this.placements.get(item) ?? null;
			this.requestUpdate();
		}
	}

	/** @internal */
	startGapDrag(event: PointerEvent, item: WebwriterGapItem) {
		const choice = this.placements.get(item);
		if (choice) this.startDrag(event, choice);
	}

	private startDrag(event: PointerEvent, choice: WebwriterGapItem) {
		if (this.graded || event.button !== 0 || !event.isPrimary || this.editing || !this.usesLegacyDrag || this.drag) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const ghost = this.ownerDocument.createElement("div");
		ghost.className = "choice ghost";
		ghost.textContent = choice.textContent;
		ghost.style.width = `${rect.width}px`;
		ghost.style.height = `${rect.height}px`;
		this.renderRoot.querySelector("#drag-layer")?.append(ghost);
		this.drag = { choice, pointerId: event.pointerId, x: event.clientX, y: event.clientY,
			offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top, ghost, moved: false };
		window.addEventListener("pointermove", this.moveDrag, { passive: false });
		window.addEventListener("pointerup", this.endDrag);
		window.addEventListener("pointercancel", this.cancelDrag);
		window.addEventListener("blur", this.cancelDrag);
		window.addEventListener("keydown", this.cancelOnEscape);
	}

	/** The gap under the given point, if it belongs to this element. The ghost does not take
	    pointer events, so it never hides the gap underneath it. */
	private targetAt(x: number, y: number) {
		const item = this.ownerDocument.elementFromPoint(x, y)?.closest("webwriter-gap-item");
		return item && this.items.includes(item) ? item : undefined;
	}

	private overTray(x: number, y: number) {
		return !!(this.renderRoot as ShadowRoot).elementFromPoint(x, y)?.closest(".choices");
	}

	private moveDrag = (event: PointerEvent) => {
		const drag = this.drag;
		if (!drag || event.pointerId !== drag.pointerId) return;
		if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
		if (!drag.moved) return;
		event.preventDefault();
		drag.ghost.style.display = "flex";
		drag.ghost.style.transform = `translate3d(${event.clientX - drag.offsetX}px, ${event.clientY - drag.offsetY}px, 0)`;
		const target = this.targetAt(event.clientX, event.clientY);
		for (const item of this.items) item.dropActive = item === target;
	};

	private endDrag = (event: PointerEvent) => {
		const drag = this.drag;
		if (!drag || event.pointerId !== drag.pointerId) return;
		if (drag.moved) {
			this.suppressClick = true;
			setTimeout(() => { this.suppressClick = false; }, 0);
			const target = this.targetAt(event.clientX, event.clientY);
			if (target) this.place(drag.choice, target);
			else if (this.overTray(event.clientX, event.clientY)) this.place(drag.choice, null);
		}
		this.cancelDrag();
	};

	private cancelOnEscape = (event: KeyboardEvent) => {
		if (event.key === "Escape") this.cancelDrag();
	};

	private cancelDrag = () => {
		this.drag?.ghost.remove();
		this.drag = null;
		for (const item of this.items) item.dropActive = false;
		window.removeEventListener("pointermove", this.moveDrag);
		window.removeEventListener("pointerup", this.endDrag);
		window.removeEventListener("pointercancel", this.cancelDrag);
		window.removeEventListener("blur", this.cancelDrag);
		window.removeEventListener("keydown", this.cancelOnEscape);
	};

	private static segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

	private getGapSelectionAndRange(): [Selection, Range] | [] {
		if (this.grid) return [];
		const selection = this.ownerDocument.getSelection();
		if (!selection) return [];

		// Require non-collapsed selection (i.e. actual text selection, not just a cursor)
		if (!this.editing || !selection.rangeCount || selection.isCollapsed) return [];

		const range = selection.getRangeAt(0);
		if (range.startContainer !== range.endContainer || !(range.startContainer instanceof Text)) return [];
		const commonNode =
			range.commonAncestorContainer.nodeType === Node.TEXT_NODE
				? range.commonAncestorContainer.parentElement
				: (range.commonAncestorContainer as HTMLElement);
		if (!commonNode) return [];

		// Require selection to be inside this gap element
		if (commonNode.closest("webwriter-gap") !== this || !this.isAnswerContent(commonNode)) return [];
		// Require selection to not be inside an already existing gap item
		if (commonNode.closest("webwriter-gap-item")) return [];

		return [selection, range];
	}

	private insertGapAtSelection() {
		const [selection, range] = this.getGapSelectionAndRange();
		if (!selection || !range) return;

		const gapItem = this.ownerDocument.createElement("webwriter-gap-item") as WebwriterGapItem;
		let text = range.toString();
		if (text.startsWith(" ")) text = "\u00A0" + text.slice(1);
		gapItem.textContent = text;

		// Replacing the text with the gap item is one undo step, also from the keyboard.
		transaction(this, () => {
			range.deleteContents();
			range.insertNode(gapItem);
		});

		selection.removeAllRanges();
		gapItem.focusEdit("all");
		return true;
	}

	private wordRangeInText(text: Text, offset: number): Range | null {
		if (text.parentElement?.closest("webwriter-gap") !== this || !this.isAnswerContent(text)) return null;
		if (text.parentElement?.closest("webwriter-gap-item")) return null;
		const segment = Array.from(WebwriterGap.segmenter.segment(text.data)).find(
			part => part.isWordLike && part.index <= offset && offset <= part.index + part.segment.length,
		);
		if (!segment) return null;
		const range = this.ownerDocument.createRange();
		range.setStart(text, segment.index);
		range.setEnd(text, segment.index + segment.segment.length);
		return range;
	}

	private skipEmptyText(node: Node | null, direction: "forward" | "backward"): Node | null {
		let current = node;
		while (current instanceof Text && current.data.length === 0) {
			current = direction === "forward" ? current.nextSibling : current.previousSibling;
		}
		return current;
	}

	private getGapToggleRange(): Range | null {
		const selection = this.ownerDocument.getSelection();
		if (!selection?.rangeCount) return null;
		if (!selection.isCollapsed) {
			const [, range] = this.getGapSelectionAndRange();
			return range ? range.cloneRange() : null;
		}
		const node = selection.anchorNode;
		const offset = selection.anchorOffset;
		if (node instanceof Text) {
			const direct = this.wordRangeInText(node, offset);
			if (direct) return direct;
			if (offset === node.data.length) {
				const next = this.skipEmptyText(node.nextSibling, "forward");
				if (next instanceof Text) return this.wordRangeInText(next, 0);
			}
			if (offset === 0) {
				const prev = this.skipEmptyText(node.previousSibling, "backward");
				if (prev instanceof Text) return this.wordRangeInText(prev, prev.data.length);
			}
			return null;
		}
		if (node instanceof Element && node.closest("webwriter-gap") === this && this.isAnswerContent(node) && !node.closest("webwriter-gap-item")) {
			const after = this.skipEmptyText(node.childNodes[offset] ?? null, "forward");
			if (after instanceof Text) {
				const range = this.wordRangeInText(after, 0);
				if (range) return range;
			}
			const before = this.skipEmptyText(node.childNodes[offset - 1] ?? null, "backward");
			if (before instanceof Text) return this.wordRangeInText(before, before.data.length);
		}
		return null;
	}

	private setPreviewToggle(active: boolean) {
		const highlight = WebwriterGap.previewHighlight;
		if (this.previewRange) {
			highlight?.delete(this.previewRange);
			this.previewRange = null;
		}
		if (!active || !highlight) return;
		const target = this.getGapToggleTarget();
		if (!(target instanceof Range)) return;
		this.previewRange = target;
		highlight.add(target);
	}

	private getGapToggleTarget(): WebwriterGapItem | Range | null {
		if (!this.editing || this.grid) return null;
		const selection = this.ownerDocument.getSelection();
		const anchor = selection?.anchorNode;
		const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
		const gapItem = this.ownerDocument.activeElement?.closest<WebwriterGapItem>("webwriter-gap-item")
			?? anchorElement?.closest<WebwriterGapItem>("webwriter-gap-item");
		if (gapItem && gapItem.closest("webwriter-gap") === this && this.isAnswerContent(gapItem)) return gapItem;
		return this.getGapToggleRange();
	}

	private toggleGapAtSelection() {
		this.setPreviewToggle(false);
		const target = this.getGapToggleTarget();
		if (!target) return false;
		const selection = this.ownerDocument.getSelection();
		if (target instanceof Element) {
			const gapItem = target;
			const nodes = Array.from(gapItem.childNodes);
			transaction(this, () => gapItem.replaceWith(...nodes));
			if (this.ownerDocument.body?.isContentEditable) {
				this.ownerDocument.body.focus({ preventScroll: true });
			}
			if (selection && nodes.length) {
				const restored = this.ownerDocument.createRange();
				if (nodes.length === 1 && nodes[0] instanceof Text) {
					restored.setStart(nodes[0], 0);
					restored.setEnd(nodes[0], nodes[0].data.length);
				} else {
					restored.setStartBefore(nodes[0]);
					restored.setEndAfter(nodes[nodes.length - 1]);
				}
				selection.removeAllRanges();
				selection.addRange(restored);
			}
			return true;
		}
		if (!selection?.rangeCount) return false;

		if (!selection.isCollapsed) return Boolean(this.insertGapAtSelection());

		selection.removeAllRanges();
		selection.addRange(target);
		return Boolean(this.insertGapAtSelection());
	}

	private adjacentGapItem(node: Node, offset: number, direction: "before" | "after"): WebwriterGapItem | null {
		let current: Node | null;
		if (node instanceof Text) {
			if (direction === "after" ? offset !== node.data.length : offset !== 0) return null;
			current = direction === "after" ? node.nextSibling : node.previousSibling;
		} else if (node instanceof Element) {
			current = node.childNodes[direction === "after" ? offset : offset - 1] ?? null;
		} else {
			return null;
		}

		let parent = node instanceof Element ? node : node.parentElement;
		while (true) {
			while (current instanceof Text && current.data.length === 0) {
				current = direction === "after" ? current.nextSibling : current.previousSibling;
			}
			if (current) {
				return current instanceof Element && current.localName === "webwriter-gap-item"
					? (current as WebwriterGapItem)
					: null;
			}
			if (!parent || parent === this || !this.isAnswerContent(parent)) return null;
			if (!parent.matches("a, abbr, b, bdi, bdo, cite, code, data, dfn, em, i, kbd, mark, q, rp, rt, ruby, s, samp, small, span, strong, sub, sup, time, u, var")) {
				return null;
			}
			current = direction === "after" ? parent.nextSibling : parent.previousSibling;
			parent = parent.parentElement;
		}
	}

	private insertGapOnKeyDown = (event: KeyboardEvent) => {
		if (this.grid) return;
		if (!event.defaultPrevented && (event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "G"
			&& this.insertGapAtSelection()) {
			event.preventDefault();
			return;
		}

		if (event.defaultPrevented || !this.editing || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		if (event.composedPath().some(node => node instanceof Element && node.localName === "webwriter-gap-item")) return;

		const selection = this.ownerDocument.getSelection();
		if (!selection?.isCollapsed || !selection.anchorNode || !this.isAnswerContent(selection.anchorNode)) return;

		const direction = event.key === "ArrowRight" ? "after" : "before";
		const gapItem = this.adjacentGapItem(selection.anchorNode, selection.anchorOffset, direction);
		if (!gapItem || gapItem.closest("webwriter-gap") !== this) return;

		event.preventDefault();
		event.stopPropagation();
		gapItem.focusEdit(direction === "after" ? "start" : "end");
	};

	checkValidity(): boolean {
		if (this.grid) return this.checkGridValidity();
		this.syncItems();
		return this.items.every(item => this.answerFor(item) !== "");
	}
	reset(): void {
		this.resetGrid();
		this.cancelDrag();
		this.choices = randomizeArray(this.items);
		this.placements.clear();
		this.selected = null;
		this.graded = false;
		for (const item of this.items) {
			item.inputAnswer = "";
			item.graded = false;
			item.feedback = null;
		}
		this.requestUpdate();
	}
	checkAnswer(detailedFeedback: boolean): number {
		if (this.grid) return this.checkGridAnswer(detailedFeedback);
		this.syncItems();
		this.cancelDrag();
		this.selected = null;
		this.graded = true;
		let correctCount = 0;
		for (const item of this.items) {
			const answer = this.answerFor(item);
			const solution = (item.textContent ?? "").trim();
			const correct = solution !== "" && (!this.usesLegacyDrag && !this.optionsFor(item)
				? matchText(answer, [solution], {
					ignoreCase: this.ignoreCase,
					ignorePunctuation: this.ignorePunctuation,
					allowTypos: this.allowTypos,
				})
				: answer === solution);
			if (correct) correctCount++;
			item.graded = true;
			item.feedback = detailedFeedback ? { correct, answer, solution } : null;
		}
		if (!this.items.length) return 1;
		return this.gradingMethod === "pass-fail"
			? scoreAllOrNothing(correctCount, this.items.length)
			: scoreProportion(correctCount, this.items.length);
	}

	private Helper() {
		if (this.editing) {
			return this.HelperRow(this.msg("Select the solution text for each gap."), html`
				${this.renderTolerance()}
				<button
					type="button"
					class="header-control helper-action edit-only toggle-gap"
					?disabled=${!this.getGapToggleTarget()}
					data-ww-capture-selection="false"
					@mousedown=${(event: MouseEvent) => event.preventDefault()}
					@mouseenter=${() => this.setPreviewToggle(true)}
					@mouseleave=${() => this.setPreviewToggle(false)}
					@blur=${() => this.setPreviewToggle(false)}
					@click=${() => this.toggleGapAtSelection()}
				>
					<sl-icon src=${InputCursorIcon}></sl-icon>
					<span>${this.msg("Toggle gap")}</span>
				</button>
			`);
		}
		if (this.graded) return nothing;
		let helper = this.msg("Fill in the gaps.");
		if (this.usesLegacyDrag) helper = this.msg("Drag each answer into a gap, or click an answer and then the gap.");
		else if (this.items.length && this.items.every(item => this.optionsFor(item))) helper = this.msg("Select the right option for each gap.");
		return this.HelperRow(helper);
	}

	protected renderAnswer() {
		if (this.grid) return this.renderGridAnswer();
		const placed = new Set(this.placements.values());
		return html`${this.Helper()}<div class="gap-answer">
			<!-- Holds the drag ghost, which is placed imperatively and must survive re-renders. -->
			<div id="drag-layer"></div>
			<slot style=${styleMap({ "--ww-placeholder": `"${this.msg("Text")}"` })} @slotchange=${this.syncItems}></slot>
			${this.usesLegacyDrag && this.editing ? html`<div class="choices" aria-hidden="true"></div>` : nothing}
			${this.usesLegacyDrag && !this.editing ? html`
				<div class="choices" role="group" aria-label=${this.msg("Available answers")}>
					${this.choices.filter(item => !placed.has(item)).map(item => html`
						<button class="choice" type="button" ?disabled=${this.graded} aria-pressed=${this.selected === item}
							@pointerdown=${(event: PointerEvent) => this.startDrag(event, item)}
							@click=${() => {
								if (this.suppressClick) return;
								this.selected = this.selected === item ? null : item;
								this.requestUpdate();
							}}>${item.textContent}</button>
					`)}
					${this.selected && placed.has(this.selected) ? html`
						<button type="button" @click=${() => this.place(this.selected!, null)}>${this.msg("Return to answers")}</button>
					` : nothing}
				</div>
			` : nothing}
		</div>`;
	}
}
