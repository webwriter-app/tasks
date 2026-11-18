import type { Declared, OptionDeclaration } from "@webwriter/lit";
import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.component.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlProgressBar from "@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import AddIcon from "@tabler/icons/outline/plus.svg";
import { computed, signal } from "@webwriter/lit";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { isQuizTask, onQuizTypesChanged, type QuizTaskElement, type QuizType } from "../model/quiz-api";
import { QuizElement } from "../components/localization";
import { exportGift, importGift } from "../components/quiz-gift";
import { GiftError } from "../model/gift";
import { questionPickerStyles } from "../components/question-picker-styles";

/**
 * A quiz groups multiple question elements into one exercise that is
 * submitted, graded and reset as a whole.
 *
 * The tasks must be assigned to the default slot.
 *
 * In WebWriter 2, use the quiz's question buttons to insert questions. The
 * package includes one-question snippets for each built-in type with question
 * titles and points hidden.
 *
 * In edit mode, "Add Feedback" inserts a block that can be edited and
 * formatted in the question. Choice and Order group it with "Add Option" in
 * both layouts. The last question shares that row with "Add Question" on the
 * right. Learners see the feedback block after a valid submission, including
 * for open-ended and ungraded questions. "Show detailed feedback" controls
 * answer-specific feedback and solution reveal.
 *
 * On paper the buttons are hidden and the questions print with a box or line
 * to write into.
 *
 * Conversions: the quiz imports and exports GIFT (`.gift`, Moodle's plain-text
 * format) for true/false, single and multiple choice, short answer and numeric,
 * essay, matching (pairing) and missing-word (gap) tasks. Order, mark and speech
 * tasks have no GIFT form and are written as comments on export. GIFT keeps
 * plain text only (formatting, hints, feedback, points and grading settings
 * are dropped), gives a short answer one solution, and cannot carry the case
 * option, so imported text answers are case sensitive. Importing replaces the
 * tasks of the quiz. A `ul` or `ol` becomes a single-choice task with one option
 * per list item and no option marked correct.
 *
 * Signals: `score` (number from 0 to 1, the share of the points reached; 0
 * before submitting) and `complete` (boolean, true once the answers are
 * submitted). Both go back to their start values when the answers are reset.
 *
 * @part result - The total score with its progress bar, shown after submitting.
 */
@customElement("webwriter-quiz")
export class WebwriterQuiz extends QuizElement {
	static styles = [questionPickerStyles, css`
		:host {
			display: block;
			box-sizing: border-box;
			container-type: inline-size;
			min-width: min(300px, 100%);
			max-width: 2100px;
			color: var(--ww-text-color, inherit);
			font-family: var(--ww-font-family, inherit);
			print-color-adjust: exact;
		}

		:focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}

		::slotted(:not(:last-child)) {
			margin-bottom: var(--sl-spacing-2x-large);
		}

		.header-placeholder {
			font-weight: bold;
			margin-bottom: var(--sl-spacing-x-small);
		}

		.quiz-footer {
			margin-block-start: var(--sl-spacing-small);
			display: flex;
		}

		.actions {
			margin-top: 1em;
			display: flex;
			flex-wrap: wrap;
			gap: var(--sl-spacing-small);
			justify-content: space-between;
			align-items: center;
		}

		.total-result {
			display: flex;
			gap: var(--sl-spacing-small);
			align-items: center;
			flex: 1 1 12rem;
			min-inline-size: 0;
			max-inline-size: 24rem;

			sl-progress-bar {
				flex: 1;
				--indicator-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			}
		}

		@container (max-width: 400px) {
			.actions > sl-button {
				flex: 1 1 100%;
			}
		}

		@media print {
			.actions sl-button, sl-dialog, .quiz-footer, .insert-task-grid, .header-placeholder, .add-question {
				display: none;
			}

			::slotted(:not(:last-child)) {
				margin-bottom: var(--sl-spacing-large);
			}
		}
	`];

	/** @internal */
	static scopedElements = {
		"sl-button": SlButton,
		"sl-dialog": SlDialog,
		"sl-dropdown": SlDropdown,
		"sl-icon": SlIcon,
		"sl-progress-bar": SlProgressBar,
	};

	static convertFrom = { ".gift": "importGift", ul: "loadList", ol: "loadList" };
	static convertTo = { ".gift": "exportGift" };

	static options: Record<string, Declared<OptionDeclaration>> = {
		detailedFeedback: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show detailed feedback") },
		confirmSubmit: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before submitting") },
		confirmReset: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before resetting") },
		hideQuestionTitle: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide question titles") },
		hidePoints: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide points") },
	};

	/**
	 * Whether learners see per-answer feedback and the solution after submitting.
	 */
	@property({ type: Boolean, attribute: "detailed-feedback", reflect: true, useDefault: true })
	accessor detailedFeedback: boolean = false;

	/**
	 * Whether learners have to confirm a dialog before submitting.
	 */
	@property({ type: Boolean, attribute: "confirm-submit", reflect: true, useDefault: true })
	accessor confirmSubmit: boolean = false;

	/**
	 * Whether learners have to confirm a dialog before resetting.
	 */
	@property({ type: Boolean, attribute: "confirm-reset", reflect: true, useDefault: true })
	accessor confirmReset: boolean = false;

	/** Whether the generated question titles are hidden. */
	@property({ type: Boolean, attribute: "hide-question-title", reflect: true, useDefault: true })
	accessor hideQuestionTitle = false;

	/**
	 * Whether the points of each task and the total score are hidden.
	 */
	@property({ type: Boolean, attribute: "hide-points", reflect: true, useDefault: true })
	accessor hidePoints: boolean = false;

	@state() private accessor totalResult: { score: number; maximum: number } | undefined;

	@state() private accessor confirmationAction: "submit" | "reset" | undefined;

	#score = signal(0);
	#complete = signal(false);

	/** Public signals for other widgets: see the class description. */
	signals = {
		score: computed(() => this.#score.get()),
		complete: computed(() => this.#complete.get()),
	};

	private unsubscribe?: () => void;

	private questionTypes = new Map<string, QuizType>();
	private addQuestionDropdown = createRef<SlDropdown>();

	connectedCallback() {
		super.connectedCallback();
		this.unsubscribe = onQuizTypesChanged(types => {
			const questionTypes = new Map<string, QuizType>();
			for (const type of types) {
				const key = JSON.stringify([type.packageId, type.id]);
				if (!questionTypes.has(key)) questionTypes.set(key, type);
			}
			this.questionTypes = questionTypes;
			this.requestUpdate();
		});
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.unsubscribe?.();
		this.unsubscribe = undefined;
		this.questionTypes.clear();
	}

	protected updated(changedProperties: PropertyValues) {
		super.updated(changedProperties);
		if (changedProperties.has("editable") && this.editing) this.confirmationAction = undefined;
		if (changedProperties.has("hidePoints") || changedProperties.has("hideQuestionTitle") || changedProperties.has("editable")) {
			this.getTasks().forEach(task => task.requestUpdate?.());
		} else if (this.editing) {
			this.getTasks().at(-1)?.requestUpdate();
		}
	}

	private insertQuizType(key: string) {
		const quizType = this.questionTypes.get(key);
		if (!quizType || !this.isConnected || !this.editing) return;
		const task = quizType.createInstance();
		if (!isQuizTask(task)) return;

		if (!Array.from(task.children).some(child => child.slot === "prompt")) {
			const prompt = this.ownerDocument.createElement("p");
			prompt.slot = "prompt";
			task.prepend(prompt);
		}
		this.appendChild(task);
		void this.addQuestionDropdown.value?.hide();
	}

	private InsertQuestionGrid() {
		return html`<div class="insert-task-grid">
			${Array.from(this.questionTypes, ([key, type]) => html`<sl-button @click=${() => this.insertQuizType(key)}>
				${type.icon ? html`<sl-icon slot="prefix" src=${type.icon}></sl-icon>` : nothing}
				${type.getName(this.lang, this.msg)}
			</sl-button>`)}
		</div>`;
	}

	/** @internal */
	renderAddQuestion(task?: QuizTaskElement) {
		const last = this.getTasks().at(-1);
		if (!this.editing || !last || (last.hostsQuestionPicker ? task !== last : task !== undefined)) return nothing;

		return html`<sl-dropdown class="add-question" placement="bottom-end" distance="4" ${ref(this.addQuestionDropdown)}>
			<sl-button slot="trigger" caret>
				<sl-icon slot="prefix" src=${AddIcon}></sl-icon>
				${this.msg("Add Question")}
			</sl-button>
			<div class="dropdown-container">${this.InsertQuestionGrid()}</div>
		</sl-dropdown>`;
	}

	private updateTasks() {
		for (const task of this.getTasks()) task.requestUpdate?.();
		this.requestUpdate();
	}

	private getTasks() {
		return Array.from(this.children).filter(isQuizTask);
	}

	private formatScore(score: number) {
		return Number(score.toFixed(2));
	}

	private getResultPercentage(result: { score: number; maximum: number }) {
		if (result.maximum <= 0) return 0;
		return (result.score / result.maximum) * 100;
	}

	private resetAnswers() {
		for (const task of this.getTasks()) {
			task.reset();
			task.resetFeedback();
		}
		this.totalResult = undefined;
		this.#score.set(0);
		this.#complete.set(false);
	}

	/** @internal Replaces the questions with the ones of a GIFT file; the file is parsed before the quiz changes. */
	async importGift(file: File) {
		let tasks: HTMLElement[];
		try {
			tasks = importGift(this.ownerDocument, await file.text());
		} catch (error) {
			if (!(error instanceof GiftError)) throw error;
			throw new Error(error.code === "unbalanced"
				? this.msg("The file is not valid GIFT: a brace is not closed.")
				: this.msg("The file contains no GIFT question that this quiz can import."));
		}
		return () => {
			this.replaceChildren(...tasks);
			this.resetAnswers();
		};
	}

	/** @internal */
	exportGift() {
		return new File([exportGift(this)], "quiz.gift", { type: "text/plain" });
	}

	/** @internal Takes over the items of a list as the options of a single-choice question. */
	loadList(fragment: DocumentFragment) {
		const items = Array.from(fragment.querySelector("ul, ol")?.children ?? []).filter(child => child.localName === "li");
		if (items.length === 0) return false;
		const choice = this.ownerDocument.createElement("webwriter-choice");
		choice.setAttribute("mode", "single");
		choice.append(this.ownerDocument.createElement("p"));
		(choice.firstElementChild as HTMLElement).slot = "prompt";
		for (const item of items) {
			const option = this.ownerDocument.createElement("webwriter-choice-item");
			option.id = "ww" + crypto.randomUUID();
			const paragraph = this.ownerDocument.createElement("p");
			paragraph.textContent = item.textContent?.trim() ?? "";
			option.append(paragraph);
			choice.append(option);
		}
		this.replaceChildren(choice);
		return true;
	}

	private submit() {
		const tasks = this.getTasks();
		const validities = tasks.map(task => {
			const valid = task.checkValidity();
			task.showRequiredWarning(!valid);
			task.showScore(undefined);
			return valid;
		});

		this.totalResult = undefined;
		this.#score.set(0);
		this.#complete.set(false);
		if (validities.some(valid => !valid)) return;

		let score = 0;
		let maximum = 0;
		for (const task of tasks) {
			const answerScore = task.checkAnswer?.(this.detailedFeedback);
			if (answerScore === undefined || !Number.isFinite(answerScore)) {
				task.showScore(undefined, true);
				continue;
			}

			const points = task.maximumPoints;
			const taskScore = Math.max(0, Math.min(1, answerScore)) * points;
			task.showScore(taskScore);
			score += taskScore;
			maximum += points;
		}
		this.totalResult = { score, maximum };
		this.#score.set(maximum > 0 ? score / maximum : 0);
		this.#complete.set(true);
	}

	private ConfirmationDialog() {
		const isSubmit = this.confirmationAction === "submit";

		const cancel = () => (this.confirmationAction = undefined);
		const confirm = () => {
			const action = this.confirmationAction;
			this.confirmationAction = undefined;
			if (action === "submit") this.submit();
			else if (action === "reset") this.resetAnswers();
		};

		return html`<sl-dialog
			label=${isSubmit ? this.msg("Submit answers?") : this.msg("Reset answers?")}
			?open=${this.confirmationAction !== undefined}
			@sl-request-close=${cancel}
			@sl-after-hide=${cancel}
		>
			${isSubmit ? this.msg("Submit your answers for evaluation?") : this.msg("Reset all answers and start over?")}
			<sl-button slot="footer" @click=${cancel}>${this.msg("Cancel")}</sl-button>
			<sl-button slot="footer" variant=${isSubmit ? "primary" : "danger"} @click=${confirm}>
				${isSubmit ? this.msg("Submit") : this.msg("Reset answers")}
			</sl-button>
		</sl-dialog>`;
	}

	render() {
		if (!this.editing) {
			return html`<slot @slotchange=${this.updateTasks}></slot>

				<div class="actions">
					${this.totalResult
						? this.hidePoints ? nothing : html`<div class="total-result" part="result">
								<sl-progress-bar .value=${this.getResultPercentage(this.totalResult)}></sl-progress-bar>
								<strong
									>${this.formatScore(this.totalResult.score)} / ${this.formatScore(this.totalResult.maximum)}</strong
								>
							</div>`
						: html`<sl-button
								variant="primary"
								@click=${() => (this.confirmSubmit ? (this.confirmationAction = "submit") : this.submit())}
							>
								${this.msg("Submit")}
							</sl-button>`}
					<sl-button @click=${() => (this.confirmReset ? (this.confirmationAction = "reset") : this.resetAnswers())}>
						${this.msg("Reset answers")}
					</sl-button>
				</div>

				${this.ConfirmationDialog()}`;
		}

		const last = this.getTasks().at(-1);
		return html`<slot @slotchange=${this.updateTasks}></slot>
			${last ? last.hostsQuestionPicker ? nothing : html`<div class="quiz-footer">${this.renderAddQuestion()}</div>` : html`
				${this.hideQuestionTitle ? nothing : html`<div class="header-placeholder">${this.msg(str`Question ${1}`)}</div>`}
				${this.InsertQuestionGrid()}
			`}`;
	}
}
