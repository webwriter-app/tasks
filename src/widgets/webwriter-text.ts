import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.component.js";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import TextParagraphIcon from "@tabler/icons/outline/align-left.svg";
import { transaction } from "@webwriter/widget/transaction";
import XIcon from "@tabler/icons/outline/x.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { classMap } from "lit/directives/class-map.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { editDistance, matchText, normalizeText } from "../model/scoring";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { TopLayerPopup } from "../components/top-layer";
import { messageFor } from "../components/localization";
import { WebwriterTask, textToleranceOptions } from "../components/webwriter-task";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-text": WebwriterText;
	}
}

type TextGradingMethod = "exact" | "completion" | "self-assess" | "ungraded";
const maxVisibleRows = 50;
const toleranceOptions = ["ignoreCase", "ignorePunctuation", "allowTypos", "useRegex"];
const responseLimitOptions = ["minWords", "maxWords", "minCharacters", "maxCharacters"];

function answerLengthLimit(value: number) {
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

registerQuizType({
	packageId,
	widgetPosition: 20,
	section: "write",
	id: "webwriter-text",
	getName: (locale, translate = messageFor(locale)) => translate("Text"),
	icon: TextParagraphIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-text");
		task.setAttribute("ignore-case", "");
		return task;
	},
});

/**
 * An answer where learners type a value into an input field.
 */
@customElement("webwriter-text")
export class WebwriterText extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		:host {
			display: block;
			width: 100%;
		}

		.answer-area {
			position: relative;

			&:has(.resize-answer:is(:hover, :focus-visible)) .answer-field {
				border-block-end-color: var(--ww-theme-accent-1, var(--sl-color-primary-600, Highlight));
			}
		}

		.answer-field {
			display: block;
			box-sizing: border-box;
			inline-size: 100%;
			min-block-size: var(--sl-input-height-medium, 2.5rem);
			padding: 0.5em var(--sl-input-spacing-medium, 0.75rem);
			resize: none;
			border: 1px solid var(--sl-input-border-color, GrayText);
			border-radius: var(--sl-input-border-radius-medium, 0.375rem);
			background: var(--sl-input-background-color, Canvas);
			color: inherit;
			font: inherit;
			line-height: 1.5;
			-webkit-user-select: text;
			user-select: text;

			&:focus {
				outline: 1px solid var(--ww-focus-color, var(--sl-input-border-color-focus, Highlight));
				outline-offset: -1px;
			}

			&.editing {
				color: var(--sl-color-success-700);
			}

			&:disabled {
				opacity: 1;
			}

			&[data-state="correct"] {
				background: var(--sl-color-success-50);
				border-color: var(--sl-color-success-400);
			}

			&[data-state="incorrect"],
			&[aria-invalid="true"] {
				border-color: var(--sl-color-danger-400);
			}

			&[data-state="incorrect"] {
				background: var(--sl-color-danger-50);
			}
		}

		.resize-answer {
			position: absolute;
			inset-block-end: 0;
			inset-inline: 0;
			block-size: 0.5rem;
			padding: 0;
			border: 0;
			background: none;
			cursor: ns-resize;
			touch-action: none;
		}

		.feedback {
			display: grid;
			gap: var(--sl-spacing-3x-small);
			margin-top: var(--sl-spacing-x-small);
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);
			overflow-wrap: anywhere;
		}

		.near-miss {
			color: var(--sl-color-warning-800);
			font-weight: var(--sl-font-weight-semibold);
		}

		.solution strong {
			color: var(--sl-color-neutral-800);
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small);
			min-block-size: calc(1.5 * var(--sl-font-size-x-small) + 2 * var(--sl-spacing-3x-small));
		}

		.accepted-trigger .count {
			display: inline-block;
			flex: none;
			min-inline-size: 1.4em;
			margin-inline-start: 0.25em;
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-success-100);
			color: var(--sl-color-success-800);
			font-weight: var(--sl-font-weight-semibold);
			text-align: center;
		}

		.accepted {
			max-block-size: var(--popup-space, calc(100dvh - 16px));
			overflow: auto;
			display: grid;
			gap: var(--sl-spacing-x-small);
			inline-size: min(22rem, calc(100vw - 16px));
			font-size: var(--sl-font-size-small);
			white-space: normal;
		}

		.accepted-answers {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			min-inline-size: 0;
			gap: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);

			.label {
				flex-basis: 100%;
				color: var(--sl-color-neutral-600);
				font-weight: var(--sl-font-weight-semibold);
			}

			.chip {
				display: inline-flex;
				align-items: center;
				min-inline-size: 0;
				overflow-wrap: anywhere;
				padding-inline-start: var(--sl-spacing-x-small);
				border: 1px solid var(--sl-color-success-600);
				border-radius: var(--sl-border-radius-pill);
				background: var(--sl-color-success-50);
				color: var(--sl-color-success-800);
			}

			.chip sl-icon-button::part(base) {
				padding: var(--sl-spacing-3x-small);
			}

			sl-input {
				inline-size: 100%;
			}
		}

		.tolerance-options {
			min-inline-size: 0;
		}

		.response-limits {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: end;
			overflow-wrap: anywhere;
			min-inline-size: 0;
		}

		.accepted > :not(:first-child) {
			border-block-start: 1px solid var(--sl-color-neutral-200);
			padding-block-start: var(--sl-spacing-x-small);
		}

		.word-count {
			margin-top: var(--sl-spacing-2x-small);
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-x-small);
			text-align: end;

			&[aria-hidden="true"] {
				visibility: hidden;
			}
		}

		.model-answer {
			margin-top: var(--sl-spacing-small);
			padding: var(--sl-spacing-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
			font-size: var(--sl-font-size-small);
		}

		.model-answer-title {
			font-weight: var(--sl-font-weight-semibold);
			color: var(--sl-color-neutral-700);
			margin-bottom: var(--sl-spacing-2x-small);
		}
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		// Shoelace's autocorrect type predates the boolean HTMLElement property.
		"sl-input": SlInput as unknown as CustomElementConstructor,
		"sl-icon-button": SlIconButton,
	};

	static options = {
		...WebwriterTask.options,
		placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") },
		allowReaderResize: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Allow readers to resize") },
		minWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum words") },
		maxWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum words") },
		minCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum characters") },
		maxCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum characters") },
		showWordCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show word count") },
		gradingMethod: {
			type: "select",
			attribute: "grading-method",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "exact",
					label: (widget: { msg: MsgFn }) => widget.msg("Match answer key"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the answer matches an accepted solution."),
				},
				{
					value: "completion",
					label: (widget: { msg: MsgFn }) => widget.msg("Completion credit"),
				description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the response meets the answer limits."),
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
		useRegex: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Advanced: Match as regular expression") },
	};

	static gradingOptions = ["points", "gradingMethod"];

	get options() {
		return this.declarationsWithout("options", this.openEnded ? toleranceOptions : []);
	}

	/** The authored number of visible lines. */
	@property({ type: Number, reflect: true, useDefault: true })
	accessor rows: number | undefined;

	/** Allows readers to adjust the answer field height for themselves. */
	@property({ type: Boolean, attribute: "allow-reader-resize", reflect: true, useDefault: true })
	accessor allowReaderResize = false;

	/** Minimum words in a reader's answer, or zero for no limit. */
	@property({ type: Number, attribute: "min-words", reflect: true, useDefault: true })
	accessor minWords = 0;

	/** Maximum words in a reader's answer, or zero for no limit. */
	@property({ type: Number, attribute: "max-words", reflect: true, useDefault: true })
	accessor maxWords = 0;

	/** Minimum characters in a reader's answer, or zero for no limit. */
	@property({ type: Number, attribute: "min-characters", reflect: true, useDefault: true })
	accessor minCharacters = 0;

	/** Maximum characters in a reader's answer, or zero for no limit. */
	@property({ type: Number, attribute: "max-characters", reflect: true, useDefault: true })
	accessor maxCharacters = 0;

	// Legacy attributes are read without rewriting authored markup.
	@property({ type: String, attribute: "type" }) private accessor legacyType: string | undefined;
	@property({ type: Boolean, attribute: "free-text" }) private accessor legacyFreeText = false;
	@property({ type: Boolean, attribute: "self-assess" }) private accessor legacySelfAssess = false;

	/**
	 * The placeholder shown while the field is empty.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor placeholder: string = "";

	/**
	 * Whether to display the live word count while answering.
	 */
	@property({ type: Boolean, attribute: "show-word-count", reflect: true, useDefault: true })
	accessor showWordCount = false;

	/**
	 * Whether the answer is compared to the solution case-insensitively.
	 */
	@property({ type: Boolean, attribute: "ignore-case", reflect: true, useDefault: true })
	accessor ignoreCase = false;

	/** Whether punctuation and diacritics are ignored when comparing text answers. */
	@property({ type: Boolean, attribute: "ignore-punctuation", reflect: true, useDefault: true })
	accessor ignorePunctuation = false;

	/** Whether minor spelling typos are accepted when comparing text answers. */
	@property({ type: Boolean, attribute: "allow-typos", reflect: true, useDefault: true })
	accessor allowTypos = false;

	/** Whether accepted answers are evaluated as regular expression patterns. */
	@property({ type: Boolean, attribute: "use-regex", reflect: true, useDefault: true })
	accessor useRegex = false;

	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	private accessor configuredGradingMethod: TextGradingMethod | undefined;

	/** How answers are scored. */
	get gradingMethod(): TextGradingMethod {
		return this.configuredGradingMethod ?? (this.legacyFreeText
			? this.legacySelfAssess ? "self-assess" : "completion"
			: "exact");
	}

	set gradingMethod(method: TextGradingMethod) {
		this.configuredGradingMethod = method;
	}

	private get openEnded() {
		return this.gradingMethod !== "exact";
	}

	/**
	 * Legacy feedback shown after submitting if the answer is correct.
	 */
	@property({ type: String, attribute: "correct-message", reflect: true, useDefault: true })
	accessor correctMessage: string = "";

	/**
	 * Legacy feedback shown after submitting if the answer is wrong.
	 */
	@property({ type: String, attribute: "wrong-message", reflect: true, useDefault: true })
	accessor wrongMessage: string = "";

	/**
	 * The value counting as correct, or a list of values that all count as correct. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: string | string[] = "";

	/** @internal The answers that count as correct, the first one being the solution shown to learners. */
	get acceptedAnswers(): string[] {
		return (Array.isArray(this.solution) ? this.solution : [this.solution])
			.map(answer => String(answer ?? "").trim())
			.filter(answer => answer !== "");
	}

	/** One accepted answer is stored as text, several as a list. */
	private setAcceptedAnswers(answers: string[]) {
		const unique = [...new Set(answers.map(answer => answer.trim()).filter(answer => answer !== ""))];
		this.solution = unique.length > 1 ? unique : (unique[0] ?? "");
	}

	@state() private accessor currentAnswer: string | undefined;
	@state() private accessor graded: boolean = false;
	@state() private accessor detailedFeedback: boolean = false;
	@state() private accessor readerRows: number | undefined;
	@state() private accessor resizeRows: number | undefined;
	private resizeDrag?: {
		pointerId: number;
		handle: HTMLButtonElement;
		startY: number;
		startRows: number;
		lineHeight: number;
		editing: boolean;
		authoredRows: number;
	};

	@query(".answer-field")
	private accessor input!: HTMLTextAreaElement;

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (changed.has("configuredGradingMethod") || changed.has("legacyFreeText") || changed.has("legacySelfAssess")) this.refreshDrawer();
		if (!this.allowReaderResize || changed.has("rows") || changed.has("legacyType")) this.readerRows = undefined;
		if (!this.canResize || (this.resizeDrag && (this.editing !== this.resizeDrag.editing || this.authoredRows !== this.resizeDrag.authoredRows))) {
			this.cancelResize();
		}
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	disconnectedCallback() {
		this.cancelResize();
		super.disconnectedCallback();
	}

	private get authoredRows() {
		const rows = this.rows ?? (this.legacyType === "long-text" ? 4 : 1);
		return Number.isFinite(rows) ? Math.max(1, Math.min(maxVisibleRows, Math.round(rows))) : 1;
	}

	private get visibleRows() {
		return this.resizeRows ?? (!this.editing && this.allowReaderResize ? this.readerRows : undefined) ?? this.authoredRows;
	}

	private get canResize() {
		return this.editing || this.allowReaderResize;
	}

	private setVisibleRows(rows: number) {
		if (!this.canResize || !this.isConnected) return;
		const next = Math.max(1, Math.min(maxVisibleRows, rows));
		if (this.editing) {
			if (next !== this.authoredRows) transaction(this, () => this.setAttribute("rows", String(next)));
		} else this.readerRows = next;
	}

	private startResize(event: PointerEvent) {
		if (!this.canResize || this.resizeDrag || event.button !== 0 || !this.input) return;
		const handle = event.currentTarget as HTMLButtonElement;
		const lineHeight = parseFloat(getComputedStyle(this.input).lineHeight);
		if (!Number.isFinite(lineHeight) || lineHeight <= 0) return;
		handle.setPointerCapture(event.pointerId);
		this.resizeDrag = {
			pointerId: event.pointerId,
			handle,
			startY: event.clientY,
			startRows: this.visibleRows,
			lineHeight,
			editing: this.editing,
			authoredRows: this.authoredRows,
		};
		event.preventDefault();
	}

	private moveResize(event: PointerEvent) {
		const drag = this.resizeDrag;
		if (drag?.pointerId !== event.pointerId) return;
		const rows = drag.startRows + Math.round((event.clientY - drag.startY) / drag.lineHeight);
		this.resizeRows = Math.max(1, Math.min(maxVisibleRows, rows));
	}

	private finishResize(event: PointerEvent) {
		const drag = this.resizeDrag;
		if (drag?.pointerId !== event.pointerId) return;
		this.moveResize(event);
		const rows = this.visibleRows;
		this.cancelResize();
		if (rows !== drag.startRows && this.editing === drag.editing && this.authoredRows === drag.authoredRows) {
			this.setVisibleRows(rows);
		}
	}

	private cancelResize(event?: PointerEvent) {
		const drag = this.resizeDrag;
		if (!drag || (event && drag.pointerId !== event.pointerId)) return;
		this.resizeDrag = undefined;
		this.resizeRows = undefined;
		if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
	}

	private ResizeHandle() {
		return html`<button type="button" class="resize-answer" data-ww-capture-selection="false"
			aria-label=${this.msg("Resize answer field")} aria-keyshortcuts="ArrowUp ArrowDown"
			@pointerdown=${this.startResize} @pointermove=${this.moveResize} @pointerup=${this.finishResize}
			@pointercancel=${this.cancelResize} @lostpointercapture=${this.cancelResize}
			@keydown=${(event: KeyboardEvent) => {
				if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
				event.preventDefault();
				this.setVisibleRows(this.visibleRows + (event.key === "ArrowDown" ? 1 : -1));
			}}></button>`;
	}

	private get value(): string {
		return this.editing ? (this.acceptedAnswers[0] ?? "") : (this.currentAnswer ?? "");
	}

	private set value(value: string) {
		if (this.editing) this.setAcceptedAnswers([value, ...this.acceptedAnswers.slice(1)]);
		else {
			this.currentAnswer = value;
			if (this.checkValidity()) this.showRequiredWarning(false);
		}
	}

	private normalizeAnswer(text: string) {
		return normalizeText(text, {
			ignoreCase: this.ignoreCase,
			ignorePunctuation: this.ignorePunctuation,
		});
	}

	private isCorrect(): boolean {
		const answer = (this.currentAnswer ?? "").trim();
		if (this.openEnded) return answer !== "";
		return matchText(answer, this.acceptedAnswers, {
			ignoreCase: this.ignoreCase,
			ignorePunctuation: this.ignorePunctuation,
			allowTypos: this.allowTypos,
			useRegex: this.useRegex,
		});
	}

	/** What to tell a learner whose short text answer is wrong but close to an accepted one. */
	private nearMiss(): string | undefined {
		if (this.openEnded || this.useRegex || this.allowTypos) return undefined;
		const answer = this.normalizeAnswer(this.currentAnswer ?? "");
		if (answer.length < 3) return undefined;
		const accepted = this.acceptedAnswers.map(solution => this.normalizeAnswer(solution));
		if (!this.ignoreCase && accepted.some(solution => solution.toLowerCase() === answer.toLowerCase())) {
			return this.msg("Almost. Check the capitalization.");
		}
		const close = accepted.some(solution => editDistance(solution.toLowerCase(), answer.toLowerCase()) <= (solution.length >= 6 ? 2 : 1));
		return close ? this.msg("Almost. Check the spelling.") : undefined;
	}

	override focus() {
		this.input?.focus();
	}

	checkValidity(): boolean {
		return (this.currentAnswer ?? "").trim() !== "" && !this.answerLengthIssue;
	}

	reset() {
		this.graded = false;
		this.detailedFeedback = false;
		this.currentAnswer = undefined;
		this.resetRubric();
	}

	checkAnswer(detailedFeedback: boolean): number {
		if (this.answerLengthIssue) return 0;
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		return this.isCorrect() ? 1 : 0;
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (!this.editing) this.graded = submitted;
	}

	private get feedbackState(): "correct" | "incorrect" | undefined {
		// Free answers are locked on submit but never marked correct/incorrect.
		if (this.openEnded || this.editing || !this.graded || !this.detailedFeedback) return undefined;
		return this.isCorrect() ? "correct" : "incorrect";
	}

	private draftAnswer = "";

	private addAcceptedAnswer(input: SlInput) {
		const value = input.value?.trim() ?? "";
		if (!value) return;
		this.setAcceptedAnswers([...this.acceptedAnswers, value]);
		input.value = "";
		this.draftAnswer = "";
	}

	private acceptedMenu = createRef<HTMLElement>();
	private acceptedTrigger = createRef<HTMLButtonElement>();
	private acceptedPanel = createRef<HTMLElement>();
	private acceptedBody = createRef<HTMLElement>();

	/** Authors can set answer limits, add accepted answers, and adjust how they are matched. */
	private accepted = new TopLayerPopup(this, () => ({
		trigger: this.acceptedTrigger.value,
		panel: this.acceptedPanel.value,
		keep: this.acceptedMenu.value,
		scrollArea: this.acceptedBody.value,
	}), {
		align: "end",
		onShow: () => this.acceptedPanel.value?.querySelector<HTMLElement>("sl-input, input")?.focus(),
	});

	private AnswerEditor() {
		if (!this.editing) return nothing;
		const items = this.openEnded ? [] : this.acceptedAnswers.slice(1);
		const tolerance = this.configurationStates(toleranceOptions);
		const limits = this.configurationStates(responseLimitOptions);
		const label = this.openEnded ? this.msg("Answer limits") : this.msg("Extra solutions & tolerance");
		return html`<span class="answer-settings accepted-menu edit-only" ${ref(this.acceptedMenu)}>
			<button
				type="button"
				class="answer-settings-trigger accepted-trigger"
				aria-haspopup="dialog"
				aria-expanded=${this.accepted.open ? "true" : "false"}
				aria-controls="accepted"
				${ref(this.acceptedTrigger)}
				@click=${() => this.accepted.toggle()}
			>
				<span>${label}</span>${items.length ? html`<span class="count">${items.length}</span>` : nothing}
			</button>
			<div popover="manual" class="top-layer" id="accepted" role="dialog" aria-label=${label} ${ref(this.acceptedPanel)}>
				<div class="dropdown-container accepted" ${ref(this.acceptedBody)}>
					${!this.openEnded ? html`<div class="accepted-answers">${this.AcceptedAnswers(items)}</div>` : nothing}
					<div class="widget-options response-limits">
						${limits.map(option => this.renderConfigurationField(option, "accepted-"))}
					</div>
					${tolerance.length ? html`<div class="widget-options tolerance-options">
						${tolerance.map(option => this.renderConfigurationField(option, "accepted-"))}
					</div>` : nothing}
				</div>
			</div>
		</span>`;
	}

	private AcceptedAnswers(others: string[]) {
		return html`
			<span class="label">${this.msg("Extra solutions")}</span>
			${others.map((answer, index) => html`<span class="chip">
				${answer}
				<sl-icon-button
					src=${XIcon}
					label=${this.msg("Remove answer")}
					@click=${() => this.setAcceptedAnswers(this.acceptedAnswers.filter((_, i) => i !== index + 1))}
				></sl-icon-button>
			</span>`)}
			<sl-input
				size="small"
				placeholder=${this.msg("Another accepted answer")}
				.value=${this.draftAnswer}
				@sl-input=${(event: Event) => (this.draftAnswer = (event.target as SlInput).value)}
				@sl-change=${(event: Event) => this.addAcceptedAnswer(event.target as SlInput)}
				@keydown=${(event: KeyboardEvent) => {
					if (event.key !== "Enter" || event.isComposing) return;
					event.preventDefault();
					event.stopPropagation();
					this.addAcceptedAnswer(event.target as SlInput);
				}}
			></sl-input>`;
	}

	private wordCountOf(text: string) {
		const trimmed = text.trim();
		return trimmed ? trimmed.split(/\s+/).length : 0;
	}

	private get answerLengthIssue() {
		const answer = this.currentAnswer ?? "";
		const words = this.wordCountOf(answer);
		const maxWords = answerLengthLimit(this.maxWords);
		const maxCharacters = answerLengthLimit(this.maxCharacters);
		if ((maxWords && words > maxWords) || (maxCharacters && answer.length > maxCharacters)) return "too-long";
		if (words < answerLengthLimit(this.minWords) || answer.length < answerLengthLimit(this.minCharacters)) return "too-short";
		return undefined;
	}

	protected override get requiredWarningMessage() {
		const issue = this.answerLengthIssue;
		if (issue === "too-long") return this.msg("Shorten your answer to fit the limit.");
		if (issue === "too-short") return this.msg("Lengthen your answer to meet the minimum.");
		return super.requiredWarningMessage;
	}

	private answerCounts() {
		const answer = this.currentAnswer ?? "";
		const words = this.wordCountOf(answer);
		const minWords = answerLengthLimit(this.minWords);
		const maxWords = answerLengthLimit(this.maxWords);
		const minCharacters = answerLengthLimit(this.minCharacters);
		const maxCharacters = answerLengthLimit(this.maxCharacters);
		const counts: string[] = [];
		if (minWords || maxWords || this.showWordCount) {
			const count = maxWords ? this.msg(str`${words}/${maxWords} words`)
				: words === 1 ? this.msg("1 word") : this.msg(str`${words} words`);
			counts.push(minWords ? this.msg(str`${count} (min. ${minWords})`) : count);
		}
		if (minCharacters || maxCharacters) {
			const count = maxCharacters ? this.msg(str`${answer.length}/${maxCharacters} characters`)
				: answer.length === 1 ? this.msg("1 character") : this.msg(str`${answer.length} characters`);
			counts.push(minCharacters ? this.msg(str`${count} (min. ${minCharacters})`) : count);
		}
		return counts;
	}

	protected override get showRubricChecklist() {
		// Older open-ended Text tasks can carry a rubric used as an unscored checklist.
		return this.openEnded && this.graded;
	}

	protected renderAnswer() {
		const value = this.value;
		const state = this.feedbackState;
		const message = state === "correct" ? this.correctMessage : this.wrongMessage;
		const solution = this.acceptedAnswers[0];
		const showSolution = this.detailedFeedback && state === "incorrect" && solution !== undefined;
		const nearMiss = state === "incorrect" ? this.nearMiss() : undefined;
		const disabled = this.graded && !this.editing;
		const counts = this.answerCounts();
		const showCounts = !this.editing && counts.length > 0;
		const minCharacters = answerLengthLimit(this.minCharacters);
		const maxCharacters = answerLengthLimit(this.maxCharacters);
		const helper = !this.editing ? this.msg("Enter your answer.")
			: this.openEnded ? this.msg("Enter the model answer.") : this.msg("Enter the solution.");

		return html`
			${this.HelperRow(helper, this.AnswerEditor(), "answer-helper")}
			<div class="answer-area">
				<textarea
					class=${classMap({ "answer-field": true, editing: this.editing })}
					data-state=${state ?? nothing}
					rows=${this.visibleRows}
					.value=${value}
					placeholder=${this.placeholder || (this.editing ? this.msg("Solution") : "")}
					minlength=${!this.editing && minCharacters ? minCharacters : nothing}
					maxlength=${!this.editing && maxCharacters ? maxCharacters : nothing}
					aria-label=${this.editing ? this.openEnded ? this.msg("Model answer") : this.msg("Solution") : this.msg("Answer")}
					aria-describedby=${showCounts ? "answer-helper text-answer-count" : "answer-helper"}
					aria-invalid=${!this.editing && this.currentAnswer && this.answerLengthIssue ? "true" : nothing}
					?disabled=${disabled}
					@input=${(event: Event) => {
						if (!this.editing) this.value = (event.currentTarget as HTMLTextAreaElement).value;
					}}
					@change=${(event: Event) => { this.value = (event.currentTarget as HTMLTextAreaElement).value; }}
				></textarea>
				${this.canResize ? this.ResizeHandle() : nothing}
			</div>
			${counts.length ? html`<div id="text-answer-count" class="word-count"
				aria-hidden=${showCounts ? nothing : "true"}>${counts.join(" · ")}</div>` : nothing}
			${!this.editing && this.graded && this.openEnded && solution
				? html`<div class="model-answer">
					<div class="model-answer-title">${this.msg("Model answer")}</div>
					<div>${solution}</div>
				</div>`
				: nothing}
			${state && (message || showSolution || nearMiss)
				? html`<div class="feedback" data-state=${state} role="status">
						${nearMiss ? html`<div class="near-miss">${nearMiss}</div>` : nothing}
						${message ? html`<div>${message}</div>` : nothing}
						${showSolution
							? html`<div class="solution"><strong>${this.msg("Solution")}:</strong> ${solution}</div>`
							: nothing}
					</div>`
				: nothing}`;
	}
}
