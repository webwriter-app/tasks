import type { Declared, OptionDeclaration } from "@webwriter/lit";
import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.component.js";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlProgressBar from "@shoelace-style/shoelace/dist/components/progress-bar/progress-bar.component.js";
import "@shoelace-style/shoelace/dist/themes/light.css";
import { transaction } from "@webwriter/widget/transaction";
import WarningIcon from "@tabler/icons/outline/alert-triangle.svg";
import CircleCheckIcon from "@tabler/icons/outline/circle-check.svg";
import CircleHalfIcon from "@tabler/icons/outline/circle-half-2.svg";
import CircleXIcon from "@tabler/icons/outline/circle-x.svg";
import { computed, signal } from "@webwriter/lit";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ref } from "lit/directives/ref.js";
import {
	onQuizMembersChanged,
	setQuizResultsConnected,
	tasksOf,
	type QuizResultsElement,
	type QuizTaskElement,
} from "../model/quiz-api";
import { CardActivity, editOnlyStyles } from "../components/card-activity";
import { FeedbackPopover, feedbackStyles } from "../components/feedback-popover";
import { QuizElement } from "../components/localization";
import { exportGift, importGift } from "../components/quiz-gift";
import { topLayerStyles } from "../components/top-layer";
import { GiftError } from "../model/gift";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-quiz-results": WebwriterQuizResults;
	}
}

type QuizResult = { score: number; maximum: number; correct: number; partial: number; incorrect: number };
type TaskScore = { share: number | undefined; maximum: number };

/**
 * The results card of a quiz. Without it, each task is checked on its own. With it, the
 * tasks are submitted, graded and reset together here, and learners see their score, how many
 * tasks they got right, and the feedback on the whole quiz. Optionally, author that feedback in
 * a `<webwriter-quiz-feedback>` assigned to the `feedback` slot.
 *
 * A task belongs to the first Task Results widget that follows it in the document. Tasks
 * after the last one belong to that one, so a single Task Results widget anywhere grades all
 * tasks, and several of them divide a document into several quizzes.
 *
 * Insert the card after the tasks it grades, and further tasks before it.
 *
 * Conversions: the card imports and exports GIFT (`.gift`, Moodle's plain-text format) for
 * true/false, single and multiple choice, short answer and numeric, essay, matching (pairing) and
 * missing-word (gap) tasks. Order, mark and speech tasks have no GIFT form and are written
 * as comments on export. GIFT keeps plain text only (formatting, hints, feedback, points and
 * grading settings are dropped) and cannot carry the case option, so imported text answers are
 * case sensitive. A short answer keeps all its accepted answers. Imported tasks are inserted
 * before the card.
 *
 * Signals: `score` (number from 0 to 1, the share of the points reached; 0 before submitting) and
 * `complete` (boolean, true once the answers are submitted). Both go back to their start values
 * when the answers are reset.
 *
 * @part final - The card with the submit and reset buttons.
 * @part result - The total score with its progress bar, shown after submitting.
 * @part feedback - The feedback on the whole quiz, shown in a popover after submitting.
 */
@customElement("webwriter-quiz-results")
export class WebwriterQuizResults extends QuizElement implements QuizResultsElement {
	static styles = [editOnlyStyles, topLayerStyles, feedbackStyles, css`
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

		:host(:state(results-card-visible)) {
			padding: var(--sl-spacing-small) var(--sl-spacing-medium);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: calc(var(--sl-border-radius-large) * 1.5);
			background: var(--sl-color-neutral-50);
		}

		:focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}

		/* Text the card generates cannot be selected; the authored feedback in its slot can. */
		.final-card {
			-webkit-user-select: none;
			user-select: none;
			position: relative;
			display: flex;
			flex-direction: column;
			gap: var(--sl-spacing-small);
			overflow-wrap: anywhere;
		}

		/* Submit and Reset answers sit side by side; in edit mode, the controls of authors end the row. */
		.final-actions {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: var(--sl-spacing-x-small) var(--sl-spacing-small);
		}

		.unanswered {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.35em;
			margin: 0;
			color: var(--sl-color-warning-800);
			font-size: var(--sl-font-size-small);
		}

		.link {
			padding: 0;
			border: 0;
			background: none;
			color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			font: inherit;
			text-decoration: underline;
			text-underline-offset: 0.2em;
			cursor: pointer;
		}

		.total-result {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--sl-spacing-x-small) var(--sl-spacing-small);

			strong {
				font-size: 1.125em;
				font-variant-numeric: tabular-nums;
			}

			sl-progress-bar {
				flex: 1 1 8rem;
				max-inline-size: 16rem;
				--height: 0.5rem;
				--indicator-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			}

			.percent {
				color: var(--sl-color-neutral-600);
				font-variant-numeric: tabular-nums;
			}
		}

		.tally {
			display: flex;
			flex-wrap: wrap;
			gap: var(--sl-spacing-3x-small) var(--sl-spacing-medium);
			margin: 0;
			padding: 0;
			list-style: none;
			color: var(--sl-color-neutral-700);
			font-size: var(--sl-font-size-small);

			li {
				display: inline-flex;
				align-items: center;
				gap: 0.3em;
			}

			.correct sl-icon { color: var(--sl-color-success-700); }
			.partial sl-icon { color: var(--sl-color-warning-700); }
			.incorrect sl-icon { color: var(--sl-color-danger-700); }
		}

		/* The task count aligns with the actions. */
		.edit-toolbar {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: flex-end;
			gap: var(--sl-spacing-2x-small) var(--sl-spacing-small);
			margin-inline-start: auto;
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);
		}

		.header-control {
			display: inline-flex;
			align-items: baseline;
			gap: 0.3em;
			margin: 0;
			padding: 0 var(--sl-spacing-2x-small);
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: none;
			color: inherit;
			font: inherit;
			white-space: nowrap;
			cursor: pointer;

			&:hover {
				background: var(--sl-color-neutral-200);
				color: var(--sl-color-neutral-800);
			}

			&:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			}

			sl-icon {
				align-self: center;
			}
		}

		.visually-hidden {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		.author-note {
			white-space: nowrap;
		}

		@container (max-width: 420px) {
			.final-actions {
				flex-wrap: nowrap;
				align-items: center;
				column-gap: var(--sl-spacing-2x-small);
			}

			.final-actions > sl-button::part(label) {
				padding-inline: var(--sl-spacing-x-small);
			}

			.edit-toolbar {
				flex-wrap: nowrap;
				min-inline-size: 0;
				column-gap: var(--sl-spacing-2x-small);
			}

			.final-actions :is(.header-control, .author-note, .label) {
				min-inline-size: 0;
			}

			.final-actions :is(.author-note, .label) {
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.final-actions .header-control sl-icon {
				flex: none;
			}
		}

		@container (max-width: 280px) {
			.final-actions > sl-button::part(label) {
				padding-inline: var(--sl-spacing-2x-small);
			}
		}

		@media print {
			:host {
				/* The document theme sets the widget host to block. */
				display: none !important;
			}
		}
	`];

	/** @internal */
	static scopedElements = {
		"sl-button": SlButton,
		"sl-dialog": SlDialog,
		"sl-icon": SlIcon,
		"sl-icon-button": SlIconButton,
		"sl-progress-bar": SlProgressBar,
	};

	static convertFrom = { ".gift": "importGift" };
	static convertTo = { ".gift": "exportGift" };

	static options: Record<string, Declared<OptionDeclaration>> = {
		detailedFeedback: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show detailed feedback") },
		confirmSubmit: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before submitting") },
		confirmReset: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before resetting") },
		hideTaskTitle: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide task labels") },
		hidePoints: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide points") },
	};

	static signals = {
		score: {
			shape: "number",
			label: { _: "Score" },
			description: { _: "Share of points reached from 0 to 1 (0 before submitting)." },
		},
		complete: {
			shape: "boolean",
			label: { _: "Submitted" },
			description: { _: "True once the quiz answers have been submitted." },
		},
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

	/** Whether task labels in the header are hidden. */
	@property({ type: Boolean, attribute: "hide-task-title", reflect: true, useDefault: true })
	accessor hideTaskTitle = false;

	/**
	 * Whether the points of each task and the total score are hidden.
	 */
	@property({ type: Boolean, attribute: "hide-points", reflect: true, useDefault: true })
	accessor hidePoints: boolean = false;

	@state() private accessor totalResult: QuizResult | undefined;

	/** The tasks that kept the last submit attempt from going through. */
	@state() private accessor unanswered: QuizTaskElement[] = [];

	@state() private accessor confirmationAction: "submit" | "reset" | undefined;

	#activity = new CardActivity(this);

	/** @internal The custom states of the card; the editor marks its selection in them. */
	get selectionStates() {
		return this.#activity.states;
	}

	#score = signal(0);
	#complete = signal(false);

	/** Public signals for other widgets: see the class description. */
	signals = {
		score: computed(() => this.#score.get()),
		complete: computed(() => this.#complete.get()),
	};

	private unsubscribe?: () => void;
	private feedbackPopup = new FeedbackPopover(this, () => this.editing);
	private feedbackObserver = new MutationObserver(records => {
		if (records.some(record => record.target === this || record.target.parentNode === this)) this.requestUpdate();
	});

	connectedCallback() {
		super.connectedCallback();
		this.feedbackObserver.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ["slot"] });
		this.unsubscribe = onQuizMembersChanged(() => this.requestUpdate());
		setQuizResultsConnected(this, true);
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.feedbackObserver.disconnect();
		this.unsubscribe?.();
		this.unsubscribe = undefined;
		setQuizResultsConnected(this, false);
	}

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (this.editing || this.tasks.length) this.selectionStates.add("results-card-visible");
		else this.selectionStates.delete("results-card-visible");
		if (changed.has("editable") && this.editing) this.confirmationAction = undefined;
		// The tasks show their numbers and points as this card says.
		if (changed.has("hidePoints") || changed.has("hideTaskTitle") || changed.has("editable")) {
			this.tasks.forEach(task => task.requestUpdate());
		}
	}

	/** @internal The tasks this card grades, in document order. */
	get tasks() {
		return tasksOf(this);
	}

	private get feedbackElement() {
		return this.querySelector<HTMLElement>(":scope > webwriter-quiz-feedback[slot=feedback]");
	}

	private addOverallFeedback() {
		if (!this.isConnected || !this.editing || this.feedbackElement) return;
		const feedback = this.ownerDocument.createElement("webwriter-quiz-feedback");
		feedback.slot = "feedback";
		const paragraph = this.ownerDocument.createElement("p");
		feedback.append(paragraph);
		transaction(this, () => this.append(feedback));
		this.requestUpdate();
		void this.updateComplete.then(() => {
			if (!this.editing || this.feedbackElement !== feedback) return;
			this.feedbackPopup.show();
			if (this.feedbackPopup.open) this.placeCaret(paragraph);
		});
	}

	private removeOverallFeedback() {
		const feedback = this.feedbackElement;
		if (!this.editing || !feedback) return;
		this.feedbackPopup.hide();
		transaction(this, () => feedback.remove());
	}

	/** Points as learners read them: rounded to one decimal, in the widget's language. */
	private formatPoints(points: number) {
		return new Intl.NumberFormat(this.localize.getLocale(), { maximumFractionDigits: 1 }).format(points);
	}

	private getResultPercentage(result: QuizResult) {
		if (result.maximum <= 0) return 0;
		return Math.round((result.score / result.maximum) * 100);
	}

	private taskScores = new Map<QuizTaskElement, TaskScore>();

	/** @internal Updates the total when the learner checks a rubric criterion. */
	updateTaskScore(task: QuizTaskElement, share: number | undefined) {
		const score = this.taskScores.get(task);
		if (!this.totalResult || !score || !this.tasks.includes(task)) return;
		score.share = share;
		this.refreshTotalResult();
	}

	private refreshTotalResult() {
		const result: QuizResult = { score: 0, maximum: 0, correct: 0, partial: 0, incorrect: 0 };
		for (const { share, maximum } of this.taskScores.values()) {
			if (share === undefined) continue;
			result.score += share * maximum;
			result.maximum += maximum;
			if (share >= 1) result.correct++;
			else if (share > 0) result.partial++;
			else result.incorrect++;
		}
		this.totalResult = result;
		this.#score.set(result.maximum > 0 ? result.score / result.maximum : 0);
		return result;
	}

	private resetAnswers() {
		this.feedbackPopup.hide();
		for (const task of this.tasks) {
			task.reset();
			task.resetFeedback();
		}
		this.totalResult = undefined;
		this.taskScores.clear();
		this.unanswered = [];
		this.#score.set(0);
		this.#complete.set(false);
	}

	/** @internal Inserts the tasks of a GIFT file before this card; the file is parsed before the document changes. */
	async importGift(file: File) {
		let tasks: HTMLElement[];
		try {
			tasks = importGift(this.ownerDocument, await file.text());
		} catch (error) {
			if (!(error instanceof GiftError)) throw error;
			throw new Error(error.code === "unbalanced"
				? this.msg("The file is not valid GIFT: a brace is not closed.")
				: this.msg("The file contains no GIFT task that this quiz can import."));
		}
		return () => {
			this.before(...tasks);
			this.resetAnswers();
		};
	}

	/** @internal */
	exportGift() {
		return new File([exportGift(this.tasks)], "quiz.gift", { type: "text/plain" });
	}

	private submit() {
		const tasks = this.tasks;
		const validities = tasks.map(task => {
			const valid = task.checkValidity();
			task.showRequiredWarning(!valid);
			task.showScore(undefined);
			return valid;
		});

		this.totalResult = undefined;
		this.taskScores.clear();
		this.#score.set(0);
		this.#complete.set(false);
		this.unanswered = tasks.filter((_, index) => !validities[index]);
		if (this.unanswered.length) return;

		for (const task of tasks) {
			const answerScore = task.checkAnswer?.(this.detailedFeedback);
			const share = answerScore === undefined || !Number.isFinite(answerScore)
				? undefined
				: Math.max(0, Math.min(1, answerScore));
			const maximum = task.maximumPoints;
			this.taskScores.set(task, { share, maximum });
			task.showScore(share === undefined ? undefined : share * maximum, true);
		}
		const result = this.refreshTotalResult();
		this.#complete.set(true);
		if (this.feedbackElement) void this.updateComplete.then(() => {
			if (!this.editing && this.totalResult === result) this.feedbackPopup.show();
		});
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

	private requestSubmit() {
		if (this.totalResult) this.feedbackPopup.toggle();
		else if (this.confirmSubmit) this.confirmationAction = "submit";
		else this.submit();
	}

	private requestReset() {
		if (this.confirmReset) {
			this.feedbackPopup.hide();
			this.confirmationAction = "reset";
		} else this.resetAnswers();
	}

	private goToTask(task: QuizTaskElement) {
		const target = task as QuizTaskElement & { revealTask?(): void };
		if (target.revealTask) target.revealTask();
		else task.scrollIntoView({ block: "center" });
	}

	private Unanswered() {
		const [first] = this.unanswered;
		if (!first) return nothing;
		const count = this.unanswered.length;
		const index = this.tasks.indexOf(first) + 1;
		return html`<p class="unanswered" role="status">
			<sl-icon src=${WarningIcon}></sl-icon>
			${count === 1 ? this.msg("1 task is unanswered.") : this.msg(str`${count} tasks are unanswered.`)}
			<button type="button" class="link" @click=${() => this.goToTask(first)}>
				${this.hideTaskTitle || index < 1 ? this.msg("Go to the task") : this.msg(str`Go to task ${index}`)}
			</button>
		</p>`;
	}

	private Tally(result: QuizResult) {
		const entries = [
			["correct", result.correct, CircleCheckIcon, this.msg(str`${result.correct} correct`)],
			["partial", result.partial, CircleHalfIcon, this.msg(str`${result.partial} partly correct`)],
			["incorrect", result.incorrect, CircleXIcon, this.msg(str`${result.incorrect} incorrect`)],
		] as const;
		const shown = entries.filter(([, count]) => count > 0);
		if (!shown.length) return nothing;
		return html`<ul class="tally">
			${shown.map(([kind, , icon, label]) => html`<li class=${kind}><sl-icon src=${icon}></sl-icon>${label}</li>`)}
		</ul>`;
	}

	private LearnerCard() {
		const result = this.totalResult;
		const hasFeedback = Boolean(result && this.feedbackElement);
		const { anchor, actions, expanded, id } = this.feedbackPopup;
		return html`<div class=${result ? "final-card submitted" : "final-card"} part="final">
			<div class="final-actions" ${ref(actions)}>
				<sl-button variant="primary" class="submit" ?disabled=${Boolean(result) && !hasFeedback}
					aria-expanded=${hasFeedback ? expanded : nothing} aria-controls=${hasFeedback ? id : nothing}
					${ref(anchor)} @click=${this.requestSubmit}>${this.msg("Submit")}</sl-button>
				${hasFeedback ? this.feedbackPopup.render(this.msg) : nothing}
				<sl-button class="reset" @click=${this.requestReset}>${this.msg("Reset answers")}</sl-button>
			</div>
			${result ? this.Result(result) : this.Unanswered()}
		</div>`;
	}

	private Result(result: QuizResult) {
		const percentage = this.getResultPercentage(result);
		const points = result.maximum === 1 ? this.msg("point") : this.msg("points");
		return html`
			${this.hidePoints || result.maximum <= 0
				? nothing
				: html`<div class="total-result" part="result" role="status">
						<strong>${this.msg(str`${this.formatPoints(result.score)} of ${this.formatPoints(result.maximum)}`)} ${points}</strong>
						<sl-progress-bar .value=${percentage} label=${this.msg("Score")}></sl-progress-bar>
						<span class="percent">${percentage}%</span>
					</div>`}
			${this.Tally(result)}`;
	}

	/** Authors can preview and edit feedback from the actions row. */
	private AuthoringCard() {
		const feedback = this.feedbackElement;
		const count = this.tasks.length;
		const note = count > 1
			? this.msg(str`Learners submit the ${count} tasks in this group here and see their score.`)
			: count === 1
				? this.msg("Learners submit the task before this card here and see their score.")
				: this.msg("Insert tasks before this card. Learners submit them here and see their score.");
		return html`<div class="final-card authoring" part="final">
			<div class="final-actions" ${ref(this.feedbackPopup.actions)}>
				<sl-button variant="primary" class="submit" disabled ${ref(this.feedbackPopup.anchor)}>${this.msg("Submit")}</sl-button>
				<sl-button class="reset" disabled>${this.msg("Reset answers")}</sl-button>
				${this.feedbackPopup.renderAuthorButton(this.msg, feedback ? undefined : () => this.addOverallFeedback())}
				${feedback ? this.feedbackPopup.render(this.msg, () => this.removeOverallFeedback()) : nothing}
				<div class="edit-toolbar edit-only">
					<span class="author-note" title=${note}>
						<span aria-hidden="true">${count === 1 ? this.msg("1 task") : this.msg(str`${count} tasks`)}</span>
						<span class="visually-hidden">${note}</span>
					</span>
				</div>
			</div>
		</div>`;
	}

	render() {
		if (this.editing) return this.AuthoringCard();
		if (!this.tasks.length) return nothing;
		return html`${this.LearnerCard()}${this.ConfirmationDialog()}`;
	}
}
