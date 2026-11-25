import type { MsgFn } from "@lit/localize";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { live } from "lit/directives/live.js";
import CheckIcon from "@tabler/icons/outline/check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { WebwriterTask } from "../components/webwriter-task";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-true-false": WebwriterTrueFalse;
	}
}

type TrueFalse = "true" | "false";
type TrueFalseGradingMethod = "pass-fail" | "ungraded" | "self-assess";

/**
 * Legacy true/false element kept for backwards compatibility with existing documents.
 * New true/false tasks use `<webwriter-choice mode="true-false">`.
 */
@customElement("webwriter-true-false")
export class WebwriterTrueFalse extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		.choices {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 14rem));
			gap: var(--sl-spacing-small);
		}

		.cell {
			--color-border: var(--sl-input-border-color);
			--color-background: var(--sl-input-background-color);
			--color-icon: var(--sl-color-neutral-500);

			display: grid;
			align-content: start;
			gap: var(--sl-spacing-3x-small);
			min-width: 0;

			&.selected {
				--color-border: var(--ww-theme-accent-1, var(--sl-color-primary-600));
				--color-background: var(--sl-color-primary-50);
				--color-icon: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			}

			&.correct, &.key {
				--color-border: var(--sl-color-success-600);
				--color-background: var(--sl-color-success-50);
				--color-icon: var(--sl-color-success-700);
			}

			&.wrong {
				--color-border: var(--sl-color-danger-600);
				--color-background: var(--sl-color-danger-50);
				--color-icon: var(--sl-color-danger-700);
			}

			/* The solution the learner did not pick. */
			&.missed {
				--color-border: var(--sl-color-warning-600);
				--color-background: var(--sl-color-warning-50);
				--color-icon: var(--sl-color-warning-800);
			}
		}

		.note {
			color: var(--color-icon);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
			text-align: center;
		}

		.cell label {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--sl-spacing-x-small);
			padding: var(--sl-spacing-x-small) var(--sl-spacing-medium);
			border: 1px solid var(--color-border);
			border-radius: var(--sl-border-radius-large);
			background-color: var(--color-background);
			cursor: pointer;
			overflow-wrap: anywhere;
			transition:
				var(--sl-transition-fast) border-color,
				var(--sl-transition-fast) background-color;

			&:has(input:focus-visible) {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
				outline-offset: var(--sl-focus-ring-offset);
			}
		}

		.cell:not(.selected, .key, .disabled) label:hover {
			border-color: var(--sl-input-border-color-hover);
		}

		.cell.missed label {
			border-style: dashed;
		}

		.cell.disabled label:not(.solution-unavailable) {
			cursor: default;
		}

		/* The native radio keeps keyboard and screen reader support; the tile shows its state. */
		.cell input {
			position: absolute;
			inset: 0;
			margin: 0;
			opacity: 0;
			pointer-events: none;
		}

		.cell sl-icon {
			flex: none;
			font-size: 1.25em;
			color: var(--color-icon);
		}
	`];

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("Exact match"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit for selecting the correct option."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
		},
	};

	static gradingOptions = ["points", "gradingMethod"];

	/** Whether responses are scored (`pass-fail`) or left ungraded (`ungraded`). */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: TrueFalseGradingMethod = "pass-fail";

	/**
	 * The value counting as correct.
	 *
	 * - `true`: The statement is true.
	 * - `false`: The statement is false.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor solution: TrueFalse = "true";

	@state() private accessor currentAnswer: TrueFalse | undefined;
	@state() private accessor graded: boolean = false;
	@state() private accessor showFeedback: boolean = false;

	checkValidity() {
		return this.currentAnswer !== undefined;
	}

	reset() {
		this.graded = false;
		this.currentAnswer = undefined;
	}

	checkAnswer(detailedFeedback: boolean) {
		this.graded = true;
		this.showFeedback = detailedFeedback;
		return this.currentAnswer === this.solution ? 1 : 0;
	}

	private get selected() {
		return this.editing ? this.solution : this.currentAnswer;
	}

	private set selected(value: TrueFalse | undefined) {
		if (this.solutionUnavailableTitle) return;
		if (this.editing) this.solution = value ?? "true";
		else this.currentAnswer = value;
	}

	private Choice(choice: TrueFalse, label: string, icon: string) {
		const graded = this.graded && !this.editing;
		const feedback = graded && this.showFeedback;
		const unavailable = this.solutionUnavailableTitle;
		const selected = !unavailable && this.selected === choice;
		const solution = this.solution === choice;
		const key = this.editing && selected;

		let note: unknown = nothing;
		if (feedback && selected) note = solution ? this.msg("Correct") : this.msg("Your answer");
		else if (feedback && solution) note = this.msg("Solution");
		else if (key) note = this.msg("Solution");

		return html`<div class=${classMap({
			cell: true,
			selected: selected && !key && !feedback,
			key,
			disabled: graded || Boolean(unavailable),
			correct: feedback && selected && solution,
			wrong: feedback && selected && !solution,
			missed: feedback && !selected && solution,
		})}>
			<label class=${unavailable ? "solution-unavailable" : nothing} title=${unavailable ?? nothing}>
				<input
					type="radio"
					name="answer"
					value=${choice}
					.checked=${live(selected)}
					?disabled=${graded || Boolean(unavailable)}
					title=${unavailable ?? nothing}
					@change=${() => (this.selected = choice)}
				>
				<sl-icon src=${icon}></sl-icon>
				${label}
			</label>
			${note === nothing ? nothing : html`<span class=${key ? "visually-hidden" : "note"}>${note}</span>`}
		</div>`;
	}

	protected renderAnswer() {
		const helper = this.editing
			? this.isUngraded ? this.msg("Enter the statement.") : this.msg("Select the correct answer.")
			: this.msg("Choose True or False.");
		return html`${this.HelperRow(helper)}<div class="choices" role="radiogroup">
			${this.Choice("true", this.msg("True"), CheckIcon)}
			${this.Choice("false", this.msg("False"), XIcon)}
		</div>`;
	}
}
