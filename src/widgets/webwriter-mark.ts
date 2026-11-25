import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import HighlighterIcon from "@tabler/icons/outline/highlight.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { scoreAllOrNothing, scorePenalizedSelection } from "../model/scoring";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-mark": WebWriterMark;
	}
}

type MarkGradingMethod = "ungraded" | "pass-fail" | "partial" | "self-assess";

registerQuizType({
	packageId,
	widgetPosition: 10,
	section: "select",
	id: "webwriter-mark",
	getName: (locale, translate = messageFor(locale)) => translate("Highlights"),
	icon: HighlighterIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-mark");
		task.append(document.createElement("p"));
		return task;
	},
});

type WordSegment = { node: Text; start: number; end: number };
type HighlightGroup = "word" | "key" | "marked" | "correct" | "missed" | "wrong" | "focus" | "preview";

function rangesOverlap(a: Range, b: Range): boolean {
	return a.compareBoundaryPoints(Range.END_TO_START, b) < 0 && a.compareBoundaryPoints(Range.START_TO_END, b) > 0;
}

/**
 * An answer where learners mark the words of a text that fit the task.
 *
 * Put the text to mark in the default slot.
 */
@customElement("webwriter-mark")
export class WebWriterMark extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		:host {
			display: block;
			min-height: 1rem;
			position: relative;
		}

		slot:not([name]) {
			display: block;
			cursor: text;
			position: relative;
			min-height: 1rem;
		}

		slot:not([name])::slotted(p) {
			min-height: 1rem;
			margin: 0;
		}

		:host(:not([contenteditable="true"]):not([contenteditable=""])) slot:not([name]),
		:host(:not([contenteditable="true"]):not([contenteditable=""])) slot:not([name])::slotted(*) {
			cursor: pointer;
			user-select: none;
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small);
		}

		.legend {
			display: flex;
			flex-wrap: wrap;
			gap: var(--sl-spacing-3x-small) var(--sl-spacing-medium);
			margin-top: var(--sl-spacing-x-small);
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);

			span {
				display: inline-flex;
				align-items: center;
				gap: 0.4em;
			}

			i {
				inline-size: 0.8em;
				block-size: 0.8em;
				border-radius: var(--sl-border-radius-small);
			}

			.correct i { background: var(--sl-color-success-200); }
			.wrong i { background: var(--sl-color-danger-200); }
			.missed i { background: var(--sl-color-warning-200); outline: 1px dashed var(--sl-color-warning-700); }
		}

		/* Learners see which words they can mark, and their marks in highlighter yellow. */
		:host ::highlight(webwriter-mark-word) {
			text-decoration: underline dotted var(--sl-color-neutral-400) 1.5px;
		}

		:host ::highlight(webwriter-mark-marked) {
			background-color: var(--sl-color-warning-200);
			text-decoration: none;
		}

		/* The answer key as authors see it. */
		:host ::highlight(webwriter-mark-key) {
			background-color: var(--sl-color-success-100);
			color: var(--sl-color-success-800);
		}

		:host ::highlight(webwriter-mark-correct) {
			background-color: var(--sl-color-success-200);
		}

		:host ::highlight(webwriter-mark-missed) {
			background-color: var(--sl-color-warning-200);
			text-decoration: underline dashed;
		}

		:host ::highlight(webwriter-mark-wrong) {
			background-color: var(--sl-color-danger-200);
			text-decoration: line-through;
		}

		:host ::highlight(webwriter-mark-focus) {
			text-decoration: underline 2px;
			text-decoration-color: var(--sl-focus-ring-color);
		}

		:host ::highlight(webwriter-mark-preview) {
			background-color: color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 16%, transparent);
		}

		slot:not([name]):focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}

		.announcement {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	`];

	static actions = {
		...WebwriterTask.actions,
		toggleMarkingAtPosition: { label: (widget: { msg: MsgFn }) => widget.msg("Toggle Marking at Position") },
	};

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if exactly the right words are marked."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"),
					description: (widget: { msg: MsgFn }) => widget.msg("Right marks add credit; wrong marks subtract from it (min. 0)."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
		},
		hideTargetCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide total marks to find") },
	};

	static gradingOptions = ["points", "gradingMethod"];

	private static segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

	// Since highlights are document-level, we should share them across all instances of this widget.
	private static highlights: Record<HighlightGroup, Highlight> = {
		word: new Highlight(),
		key: new Highlight(),
		marked: new Highlight(),
		correct: new Highlight(),
		missed: new Highlight(),
		wrong: new Highlight(),
		focus: new Highlight(),
		preview: new Highlight(),
	};

	static {
		// Later groups paint over earlier ones where they overlap, so a mark hides the dotted underline.
		Object.values(this.highlights).forEach((highlight, index) => (highlight.priority = index));
		for (const [group, highlight] of Object.entries(this.highlights)) {
			CSS.highlights.set(`webwriter-mark-${group}`, highlight);
		}
	}

	/**
	 * How the score of this answer is calculated.
	 *
	 * - `pass-fail`: Full score only if exactly the correct words are marked.
	 * - `partial`: Correctly marked words earn credit, wrong ones subtract from it.
	 */
	@property({
		type: String,
		attribute: "grading-method",
		reflect: true,
		useDefault: true,
		converter: value => value === "f1" ? "partial" : value,
	})
	accessor gradingMethod: MarkGradingMethod = "pass-fail";

	/** Hides the total number of marks to find in reader mode. */
	@property({ type: Boolean, attribute: "hide-target-count", reflect: true, useDefault: true })
	accessor hideTargetCount = false;

	/**
	 * The indices of the word-like segments counting as correct. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: "solution", reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: number[] = [];

	@state() private accessor currentAnswer: number[] = [];
	@state() private accessor graded: boolean = false;
	@state() private accessor detailedFeedback: boolean = false;
	@state() private accessor previewToggle: boolean = false;

	private renderedRanges: Record<HighlightGroup, Range[]> = {
		word: [],
		key: [],
		marked: [],
		correct: [],
		missed: [],
		wrong: [],
		focus: [],
		preview: [],
	};

	/** The word the keyboard is on while the text has focus. */
	@state() private accessor focusedWord: number | undefined;
	@state() private accessor announcement = "";

	private observer = new MutationObserver(records => this.handleMutation(records));

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	connectedCallback(): void {
		super.connectedCallback();
		this.observer.observe(this, { childList: true, characterData: true, subtree: true });
		this.ownerDocument.addEventListener("selectionchange", this.handleSelectionChange);
		this.requestUpdate();
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.observer.disconnect();
		this.ownerDocument.removeEventListener("selectionchange", this.handleSelectionChange);
		for (const group of Object.keys(this.renderedRanges) as HighlightGroup[]) this.setHighlight(group, []);
	}

	private getWordSegments(): WordSegment[] {
		const segments: WordSegment[] = [];
		const walker = this.ownerDocument.createTreeWalker(this, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, node => {
			if (!this.isAnswerContent(node)) return NodeFilter.FILTER_REJECT;
			return node instanceof Text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		});
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			for (const segment of WebWriterMark.segmenter.segment((node as Text).data)) {
				if (segment.isWordLike) {
					segments.push({
						node: node as Text,
						start: segment.index,
						end: segment.index + segment.segment.length,
					});
				}
			}
		}
		return segments;
	}

	private toRange({ node, start, end }: WordSegment): Range {
		const range = new Range();
		range.setStart(node, start);
		range.setEnd(node, end);
		return range;
	}

	private setHighlight(group: HighlightGroup, ranges: Range[]) {
		const highlight = WebWriterMark.highlights[group];
		for (const range of this.renderedRanges[group]) highlight.delete(range);
		for (const range of ranges) highlight.add(range);
		this.renderedRanges[group] = ranges;
	}

	private renderHighlights() {
		const segments = this.getWordSegments();
		const toRanges = (indices: number[]) => indices.filter(i => segments[i]).map(i => this.toRange(segments[i]));

		const showFeedback = this.graded && this.detailedFeedback && !this.editing;
		const solution = new Set(this.solution);
		const answer = new Set(this.currentAnswer);

		this.setHighlight("word", !this.editing && !this.graded ? segments.map(segment => this.toRange(segment)) : []);
		this.setHighlight("key", this.editing ? toRanges(this.solution) : []);
		this.setHighlight("marked", showFeedback || this.editing ? [] : toRanges(this.currentAnswer));
		this.setHighlight("correct", showFeedback ? toRanges(this.currentAnswer.filter(i => solution.has(i))) : []);
		this.setHighlight("missed", showFeedback ? toRanges(this.solution.filter(i => !answer.has(i))) : []);
		this.setHighlight("wrong", showFeedback ? toRanges(this.currentAnswer.filter(i => !solution.has(i))) : []);
		this.setHighlight("focus", !this.editing && this.focusedWord !== undefined ? toRanges([this.focusedWord]) : []);
		this.setHighlight("preview", this.editing && this.previewToggle ? toRanges(this.getToggleIndices(null, segments)) : []);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		this.renderHighlights();
	}

	private handleMutation(records: MutationRecord[]) {
		const changedAnswer = records.some(record => record.target === this
			? [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Text || node instanceof Element && !node.slot)
			: this.isAnswerContent(record.target));
		if (!changedAnswer) return;
		if (this.editing) {
			const liveRanges = this.renderedRanges.key.filter(range => !range.collapsed);
			const solution = this.getWordSegments()
				.map((segment, index) => (liveRanges.some(range => rangesOverlap(range, this.toRange(segment))) ? index : -1))
				.filter(index => index !== -1);
			const changed =
				solution.length !== this.solution.length || solution.some((index, i) => index !== this.solution[i]);
			if (changed) this.solution = solution;
		}
		// Redraw the normalized highlight ranges.
		this.requestUpdate();
	}

	private toggleIndices(current: number[], indices: number[]): number[] {
		const result = new Set(current);
		for (const index of indices) {
			if (result.has(index)) result.delete(index);
			else result.add(index);
		}
		return [...result].sort((a, b) => a - b);
	}

	private getToggleIndices(point: CaretPosition | null, segments?: WordSegment[]): number[] {
		const selection = this.ownerDocument.getSelection();
		const selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;

		if (selectionRange && !selectionRange.collapsed && this.contains(selectionRange.commonAncestorContainer)) {
			return (segments ?? this.getWordSegments())
				.map((segment, index) => (rangesOverlap(selectionRange, this.toRange(segment)) ? index : -1))
				.filter(index => index !== -1);
		}
		const node = point ? point.offsetNode : selection?.anchorNode;
		const offset = point ? point.offset : (selection?.anchorOffset ?? 0);
		if (!node || !this.isAnswerContent(node)) return [];
		const index = (segments ?? this.getWordSegments()).findIndex(
			segment => segment.node === node && segment.start <= offset && offset <= segment.end,
		);
		return index === -1 ? [] : [index];
	}

	private toggleSolutionMarking(point: CaretPosition | null): boolean {
		const indices = this.getToggleIndices(point);

		if (indices.length === 0) return false;
		this.solution = this.toggleIndices(this.solution, indices);
		return true;
	}

	/** @internal */
	toggleMarkingAtPosition() {
		if (!this.editing) return;
		this.toggleSolutionMarking(null);
	}

	private handleContextMenu(event: MouseEvent) {
		if (!this.editing) return;
		const point = document.caretPositionFromPoint(event.clientX, event.clientY);
		if (this.toggleSolutionMarking(point)) event.preventDefault();
	}

	private handleClick(event: MouseEvent) {
		if (this.editing || this.graded) return;
		const point = document.caretPositionFromPoint(event.clientX, event.clientY);
		if (!point) return;
		const segments = this.getWordSegments();
		const index = segments.findIndex(
			segment => segment.node === point.offsetNode && segment.start <= point.offset && point.offset <= segment.end,
		);
		if (index === -1) return;
		this.currentAnswer = this.toggleIndices(this.currentAnswer, [index]);
	}

	/** Words are reachable by keyboard: arrows move, Space or Enter marks. */
	private handleWordKeyDown(event: KeyboardEvent) {
		if (this.editing || this.graded || event.altKey || event.ctrlKey || event.metaKey) return;
		const segments = this.getWordSegments();
		if (!segments.length) return;
		let index = Math.min(this.focusedWord ?? 0, segments.length - 1);
		switch (event.key) {
			case "ArrowRight": case "ArrowDown": index = Math.min(index + 1, segments.length - 1); break;
			case "ArrowLeft": case "ArrowUp": index = Math.max(index - 1, 0); break;
			case "Home": index = 0; break;
			case "End": index = segments.length - 1; break;
			case " ": case "Enter":
				this.currentAnswer = this.toggleIndices(this.currentAnswer, [index]);
				break;
			default: return;
		}
		event.preventDefault();
		this.focusedWord = index;
		const { node, start, end } = segments[index];
		this.announcement = node.data.slice(start, end) + (this.currentAnswer.includes(index) ? `, ${this.msg("Marked")}` : "");
	}

	private handleWordFocus() {
		if (!this.editing) this.focusedWord ??= 0;
	}

	private handleWordBlur() {
		this.focusedWord = undefined;
		this.announcement = "";
	}

	private handleSelectionChange = () => {
		if (!this.editing) return;
		const button = this.shadowRoot?.querySelector<HTMLButtonElement>(".toggle-mark");
		if (this.previewToggle || button && button.disabled === (this.getToggleIndices(null).length > 0)) {
			this.requestUpdate();
		}
	};

	checkValidity(): boolean {
		return this.currentAnswer.length > 0;
	}

	checkAnswer(detailedFeedback: boolean): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;

		const solution = new Set(this.solution);
		const selected = new Set(this.currentAnswer);
		const selectedCorrect = new Set([...selected].filter(i => solution.has(i)));
		const selectedWrong = new Set([...selected].filter(i => !solution.has(i)));

		if (solution.size === 0) return 0;
		const tp = selectedCorrect.size;
		const fp = selectedWrong.size;

		if (this.gradingMethod === "pass-fail") {
			return fp === 0 ? scoreAllOrNothing(tp, solution.size) : 0;
		}
		return scorePenalizedSelection(tp, fp, solution.size);
	}

	reset(): void {
		this.currentAnswer = [];
		this.graded = false;
		this.detailedFeedback = false;
	}

	/** Authors read a helper of the same shape as learners; they mark the answer key with a right click. */
	private Helper() {
		const toFind = this.solution.length;
		if (this.editing) {
			const helper = `${this.msg("Right-click to mark the solution.")} ${this.msg(str`${toFind} marked`)}`;
			return this.HelperRow(helper, html`
				<button
					type="button"
					class="header-control helper-action edit-only toggle-mark"
					?disabled=${!this.getToggleIndices(null).length}
					data-ww-capture-selection="false"
					@mousedown=${(event: MouseEvent) => event.preventDefault()}
					@mouseenter=${() => { this.previewToggle = true; }}
					@mouseleave=${() => { this.previewToggle = false; }}
					@blur=${() => { this.previewToggle = false; }}
					@click=${() => this.toggleMarkingAtPosition()}
				>
					<sl-icon src=${HighlighterIcon}></sl-icon>
					<span>${this.msg("Toggle mark")}</span>
				</button>
			`);
		}
		if (this.graded) return nothing;
		const marked = this.msg(str`${this.currentAnswer.length} marked`);
		const target = toFind > 0 && !this.hideTargetCount ? `${this.msg(str`${toFind} to find`)} · ` : "";
		return this.HelperRow(`${this.msg("Click the words to mark.")} ${target}${marked}`);
	}

	private Legend() {
		if (this.editing || !this.graded || !this.detailedFeedback) return nothing;
		return html`<div class="legend">
			<span class="correct"><i></i>${this.msg("Correct")}</span>
			<span class="wrong"><i></i>${this.msg("Wrong")}</span>
			<span class="missed"><i></i>${this.msg("Missed")}</span>
		</div>`;
	}

	protected renderAnswer() {
		// Reuse the translations after changing the English label to sentence case.
		const textLabel = this.msg("Text to highlight", { id: "s80dc9f56411917df" });
		return html`${this.Helper()}<slot
				style=${styleMap({
					"--ww-placeholder": `"${textLabel}"`,
				})}
				tabindex=${this.editing || this.graded ? nothing : "0"}
				role=${this.editing ? nothing : "group"}
				aria-label=${this.editing ? nothing : textLabel}
				@click=${this.handleClick}
				@contextmenu=${this.handleContextMenu}
				@keydown=${this.handleWordKeyDown}
				@focus=${this.handleWordFocus}
				@blur=${this.handleWordBlur}
			></slot>
			<span class="announcement" role="status">${this.announcement}</span>
			${this.Legend()}`;
	}
}
