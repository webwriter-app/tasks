import type { MsgFn } from "@lit/localize";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.component.js";
import SlTextarea from "@shoelace-style/shoelace/dist/components/textarea/textarea.component.js";
import { type OptionDeclaration } from "@webwriter/lit";
import TextParagraphIcon from "@tabler/icons/outline/align-left.svg";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-text": WebwriterText;
	}
}

export type TextType = "long-text" | "text" | "number" | "date" | "time" | "datetime-local";

registerQuizType({
	packageId,
	widgetPosition: 30,
	id: "webwriter-text",
	getName: (locale, translate = messageFor(locale)) => translate("Text"),
	icon: TextParagraphIcon,
	createInstance: () => document.createElement("webwriter-text"),
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

		/* Highlight the author's solution while editing. */
		:host(:is([contenteditable="true"], [contenteditable=""])) :is(sl-textarea::part(textarea), sl-input::part(input)) {
			color: var(--sl-color-success-700);
		}

		sl-textarea::part(base),
		sl-input::part(base) {
			font-size: 1em !important;
		}

		sl-textarea {
			resize: vertical;
			overflow: hidden;
			min-height: 40px;

			&::part(form-control),
			&::part(form-control-input),
			&::part(base),
			&::part(textarea) {
				height: 100%;
			}
		}

		:is(sl-textarea, sl-input):disabled::part(base) {
			background-color: var(--sl-input-background-color);
			border-color: var(--sl-input-border-color);
			opacity: 1;
			cursor: inherit;
		}

		:is(sl-textarea, sl-input)[data-state="correct"]::part(base) {
			background: var(--sl-color-success-50);
			border-color: var(--sl-color-success-400);
		}

		:is(sl-textarea, sl-input)[data-state="incorrect"]::part(base) {
			background: var(--sl-color-danger-50);
			border-color: var(--sl-color-danger-400);
		}

		.feedback {
			margin-top: var(--sl-spacing-x-small);
			color: var(--sl-color-neutral-500);
			font-size: var(--sl-font-size-small);
			overflow-wrap: anywhere;
		}

		.solution {
			margin-top: var(--sl-spacing-x-small);
		}
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		// Shoelace's autocorrect type predates the boolean HTMLElement property.
		"sl-textarea": SlTextarea as unknown as CustomElementConstructor,
		"sl-input": SlInput as unknown as CustomElementConstructor,
	};

	static options = {
		...WebwriterTask.options,
		type: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Type"),
			options: [
				{ value: "long-text", label: (widget: { msg: MsgFn }) => widget.msg("Long Text") },
				{ value: "text", label: (widget: { msg: MsgFn }) => widget.msg("Short Text") },
				{ value: "number", label: (widget: { msg: MsgFn }) => widget.msg("Number") },
				{ value: "date", label: (widget: { msg: MsgFn }) => widget.msg("Date") },
				{ value: "time", label: (widget: { msg: MsgFn }) => widget.msg("Time") },
				{ value: "datetime-local", label: (widget: { msg: MsgFn }) => widget.msg("Date & Time") },
			],
		},
		placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") },
		freeText: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Free answer") },
		ignoreCase: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Ignore capitalization") },
		correctMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for correct solution") },
		wrongMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for wrong solution") },
	};

	get options() {
		const isText = this.type === "long-text" || this.type === "text";
		const omitted: string[] = [];
		if (!isText && this.type !== "number") omitted.push("placeholder");
		if (this.freeText) omitted.push("ignoreCase", "correctMessage", "wrongMessage");
		else if (!isText) omitted.push("ignoreCase");
		return this.declarationsWithout("options", omitted);
	}

	/**
	 * The kind of input field learners answer in.
	 *
	 * - `long-text`: A multi-line text area.
	 * - `text`: A single-line text field.
	 * - `number`: A number field.
	 * - `date`: A date picker.
	 * - `time`: A time picker.
	 * - `datetime-local`: A combined date and time picker.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor type: TextType = "long-text";

	/**
	 * The placeholder shown while the field is empty.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor placeholder: string = "";

	/**
	 * Whether any non-empty answer counts as correct, without comparing it to the solution.
	 */
	@property({ type: Boolean, attribute: "free-text", reflect: true, useDefault: true })
	accessor freeText = false;

	/**
	 * Whether the answer is compared to the solution case-insensitively.
	 */
	@property({ type: Boolean, attribute: "ignore-case", reflect: true, useDefault: true })
	accessor ignoreCase = false;

	/**
	 * The feedback shown after submitting if the answer is correct.
	 */
	@property({ type: String, attribute: "correct-message", reflect: true, useDefault: true })
	accessor correctMessage: string = "";

	/**
	 * The feedback shown after submitting if the answer is wrong.
	 */
	@property({ type: String, attribute: "wrong-message", reflect: true, useDefault: true })
	accessor wrongMessage: string = "";

	/** The drawer offers only the settings that apply to the current answer type. */
	/**
	 * The value counting as correct. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: string = "";

	@state() private accessor currentAnswer: string | undefined;
	@state() private accessor graded: boolean = false;
	@state() private accessor detailedFeedback: boolean = false;

	@query("sl-textarea, sl-input")
	private accessor input!: SlTextarea | SlInput;

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (changed.has("type") || changed.has("freeText")) this.refreshDrawer();
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	private get value(): string {
		return this.editing ? this.solution : (this.currentAnswer ?? "");
	}

	private set value(value: string) {
		if (this.editing) this.solution = value;
		else this.currentAnswer = value;
	}

	private isCorrect(): boolean {
		const answer = (this.currentAnswer ?? "").trim();
		if (this.freeText) return answer !== "";
		const solution = this.solution.trim();
		if (!solution) return false;
		return this.ignoreCase ? answer.toLowerCase() === solution.toLowerCase() : answer === solution;
	}

	override focus() {
		this.input?.focus();
	}

	checkValidity(): boolean {
		return (this.currentAnswer ?? "").trim() !== "";
	}

	reset() {
		this.graded = false;
		this.detailedFeedback = false;
		this.currentAnswer = undefined;
	}

	checkAnswer(detailedFeedback: boolean): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		return this.isCorrect() ? 1 : 0;
	}

	private handleChange = (e: Event) => {
		const target = e.target as SlTextarea | SlInput;
		this.value = target.value?.trim() ?? "";
	};

	private get feedbackState(): "correct" | "incorrect" | undefined {
		// Free answers are locked on submit but never marked correct/incorrect.
		if (this.freeText || this.editing || !this.graded || !this.detailedFeedback) return undefined;
		return this.isCorrect() ? "correct" : "incorrect";
	}

	protected renderAnswer() {
		const value = this.value;
		const state = this.feedbackState;
		const message = state === "correct" ? this.correctMessage : this.wrongMessage;
		const showSolution = this.detailedFeedback && this.solution.trim() !== "";
		const disabled = this.graded && !this.editing;

		const field =
			this.type === "long-text"
				? html`<sl-textarea
						data-state=${state ?? nothing}
						value=${value}
						placeholder=${this.placeholder}
						resize="none"
						?disabled=${disabled}
						@sl-change=${this.handleChange}
					></sl-textarea>`
				: html`<sl-input
						data-state=${state ?? nothing}
						value=${value}
						placeholder=${this.placeholder}
						type=${this.type}
						?disabled=${disabled}
						@sl-change=${this.handleChange}
					></sl-input>`;

		return html`${field}${state && (message || showSolution)
			? html`<div class="feedback" data-state=${state} role="status">
					${message ? html`<div>${message}</div>` : nothing}
					${showSolution
						? html`<div class="solution"><strong>${this.msg("Solution")}:</strong> ${this.solution}</div>`
						: nothing}
				</div>`
			: nothing}`;
	}
}
