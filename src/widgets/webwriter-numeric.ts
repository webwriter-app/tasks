import type { MsgFn } from "@lit/localize";
import AdjustmentsIcon from "@tabler/icons/outline/adjustments-horizontal.svg";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { live } from "lit/directives/live.js";
import { createRef, ref } from "lit/directives/ref.js";
import { name as packageId } from "../../package.json";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import NumberIcon from "../icons/numeric.svg";
import { registerQuizType } from "../model/quiz-api";
import { scoreNumeric } from "../model/scoring";
import { selfAssessmentOption } from "../components/rubric-popover";
import { TopLayerPopup } from "../components/top-layer";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-numeric": WebwriterNumeric;
	}
}

type NumericMode = "input" | "slider" | "datetime";
type ToleranceMode = "absolute" | "relative";
type DateTimeType = "date" | "time" | "datetime-local";
type NumericGradingMethod = "exact" | "ungraded" | "self-assess";

registerQuizType({
	packageId,
	widgetPosition: 30,
	section: "write",
	id: "webwriter-numeric",
	getName: (locale, translate = messageFor(locale)) => translate("Number"),
	icon: NumberIcon,
	createInstance: () => document.createElement("webwriter-numeric"),
	matches: element => element.localName === "webwriter-numeric",
});

/**
 * A numeric answer task supporting an exact/tolerant number field or an estimation slider.
 */
@customElement("webwriter-numeric")
export class WebwriterNumeric extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		:host {
			display: block;
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small);
		}

		.numeric-modes {
			display: flex;
			align-items: center;
			gap: var(--sl-spacing-3x-small);
			min-inline-size: 0;
			margin: 0;
			padding: 0 var(--sl-spacing-3x-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
			font-size: var(--sl-font-size-x-small);

			label {
				padding-inline: var(--sl-spacing-2x-small);
				white-space: nowrap;
				border-radius: var(--sl-border-radius-small);
				color: var(--sl-color-neutral-700);
				cursor: pointer;
			}

			label:hover {
				background: var(--sl-color-neutral-100);
			}

			input:checked + label {
				background: var(--sl-color-primary-100);
				color: var(--sl-color-primary-800);
				font-weight: var(--sl-font-weight-semibold);
			}

			input:focus-visible + label {
				outline: var(--sl-focus-ring);
			}
		}

		.numeric-row {
			display: flex;
			align-items: center;
			gap: var(--sl-spacing-x-small);
		}

		.date-row {
			flex-wrap: wrap;
		}

		.date-types {
			flex-wrap: wrap;
		}

		.date-types label {
			display: flex;
			align-items: center;
			min-block-size: 24px;
		}

		.date-types[inert] {
			visibility: hidden;
		}

		@container (max-width: 239px) {
			.numeric-row {
				flex-wrap: wrap;
			}
		}

		.num-input {
			width: 10rem;
			min-inline-size: 3rem;
			max-inline-size: 100%;
			padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
			box-sizing: border-box;
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			background: var(--sl-input-background-color);
			color: inherit;
			font: inherit;

			&:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
				border-color: var(--sl-input-border-color-focus);
			}

			&:disabled {
				cursor: default;
				opacity: 0.9;
			}

			&.correct {
				border-color: var(--sl-color-success-600);
				background: var(--sl-color-success-50);
			}

			&.wrong {
				border-color: var(--sl-color-danger-600);
				background: var(--sl-color-danger-50);
			}
		}

		.date-row .num-input {
			width: 8.5rem;
			padding-inline: var(--sl-spacing-x-small);
		}

		.date-row .num-input[type="datetime-local"] {
			width: 17rem;
		}

		.slider-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			row-gap: var(--sl-spacing-2x-small);
			max-inline-size: 28rem;
		}

		.slider-row:has(> .meta-fields) {
			grid-template-columns: minmax(4.25rem, 1fr) minmax(8rem, min(45%, 14rem));
			max-inline-size: calc(42rem + var(--sl-spacing-x-small));
		}

		.slider-row > .meta-fields {
			grid-area: 1 / 2;
		}

		@container (max-width: 239px) {
			.slider-row:has(> .meta-fields) {
				grid-template-columns: minmax(0, 1fr);
			}

			.slider-row > .meta-fields {
				grid-area: 3 / 1;
				inline-size: min(14rem, 100%);
			}
		}

		.slider-main {
			grid-area: 1 / 1 / span 2;
			display: grid;
			grid-template-columns: minmax(0, 1fr) fit-content(40%);
			grid-template-rows: auto auto;
			grid-template-rows: subgrid;
			align-items: center;
			column-gap: var(--sl-spacing-x-small);
		}

		.slider-input {
			inline-size: 100%;
			min-inline-size: 0;
			margin-inline: 0;
			accent-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			cursor: pointer;

			&:disabled {
				cursor: default;
			}
		}

		.slider-value {
			box-sizing: border-box;
			min-inline-size: 2rem;
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
			font-weight: var(--sl-font-weight-semibold);
			font-variant-numeric: tabular-nums;
			text-align: center;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.slider-bounds {
			grid-area: 2 / 1 / 3 / -1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--sl-spacing-2x-small);
			min-block-size: calc(24px + 1lh);
			color: var(--sl-color-neutral-500);
			font-size: var(--sl-font-size-x-small);
			line-height: 1.25;
			font-variant-numeric: tabular-nums;

			&.edit-only {
				grid-column-end: 2;
				display: grid;
				grid-template-columns: repeat(3, minmax(0, 1fr));
				align-items: end;
				color: var(--sl-color-neutral-600);
			}

			> span {
				min-inline-size: 0;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.slider-setting {
				inline-size: min(100%, 4.5rem);

				&:nth-child(2) {
					justify-self: center;
					text-align: center;
				}

				&:last-child {
					justify-self: end;
					text-align: end;
				}

				span {
					display: block;
					white-space: nowrap;
				}

				input {
					display: block;
					appearance: textfield;
					block-size: 24px;
					padding-inline: var(--sl-spacing-3x-small);
					text-align: inherit;

					&::-webkit-inner-spin-button {
						appearance: none;
					}
				}
			}
		}

		.solution-value {
			color: var(--sl-color-success-700);
		}

		.meta-fields {
			display: flex;
			flex: 0 1 14rem;
			min-inline-size: min(8rem, 100%);
			align-items: center;
			gap: var(--sl-spacing-2x-small);
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);
		}

		.meta-input {
			min-inline-size: 0;
			min-block-size: 24px;
			width: 100%;
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
			box-sizing: border-box;
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			background: var(--sl-input-background-color);
			color: inherit;
			font: inherit;
		}

		.meta-fields:has(> :popover-open) {
			opacity: 1;
			visibility: visible;
			transition: none;
		}

		.tolerance-field {
			display: flex;
			flex: 1.5 1 0;
			min-inline-size: 4rem;
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			background: var(--sl-input-background-color);

			select {
				flex: none;
				min-block-size: 24px;
				border: 0;
				border-inline-end: 1px solid var(--sl-input-border-color);
				background: transparent;
				color: inherit;
				font: inherit;
				border-radius: var(--sl-input-border-radius-small);
			}

			.tolerance-input {
				border: 0;
				padding-inline: var(--sl-spacing-2x-small);
			}
		}

		.unit-input {
			flex: 1 1 0;
			min-inline-size: 1.75rem;
			padding-inline: var(--sl-spacing-2x-small);
		}

		.partial-credit-trigger {
			flex: none;
			align-items: center;
			justify-content: center;
			min-inline-size: 24px;
			min-block-size: 24px;
			padding: 0;
		}

		.partial-credit-popover {
			inline-size: min(14rem, calc(100vw - 16px));

			label {
				display: grid;
				gap: var(--sl-spacing-2x-small);
			}
		}

		.unit-label {
			min-inline-size: 0;
			overflow-wrap: anywhere;
			color: var(--sl-color-neutral-700);
			font-weight: var(--sl-font-weight-semibold);
		}

		.feedback-line {
			margin-top: var(--sl-spacing-x-small);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);

			&.correct {
				color: var(--sl-color-success-700);
			}

			&.wrong {
				color: var(--sl-color-danger-700);
			}
		}

		.solution-text {
			color: var(--sl-color-success-700);
			font-weight: var(--sl-font-weight-semibold);
			margin-inline-start: var(--sl-spacing-x-small);
		}
	`];

	static options = {
		...WebwriterTask.options,
		mode: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Input type"),
			options: [
				{ value: "input", label: (widget: { msg: MsgFn }) => widget.msg("Number") },
				{ value: "slider", label: (widget: { msg: MsgFn }) => widget.msg("Slider") },
				{ value: "datetime", label: (widget: { msg: MsgFn }) => widget.msg("Date/Time") },
			],
		},
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "exact",
					label: (widget: { msg: MsgFn }) => widget.msg("Within tolerance"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit within tolerance, with optional linear partial-credit band."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
		},
		tolerance: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Tolerance (±)") },
		toleranceMode: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Tolerance type"),
			options: [
				{ value: "absolute", label: (widget: { msg: MsgFn }) => widget.msg("Absolute (± value)") },
				{ value: "relative", label: (widget: { msg: MsgFn }) => widget.msg("Relative (± %)") },
			],
		},
		partialRange: {
			type: Number,
			min: 0,
			label: (widget: { msg: MsgFn }) => widget.msg("Partial credit band"),
			description: (widget: { msg: MsgFn }) => widget.msg("Extra range beyond tolerance where credit decays linearly to zero."),
		},
		unit: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Unit") },
		min: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Minimum") },
		max: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Maximum") },
		step: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Step") },
	};

	static gradingOptions = ["points", "gradingMethod"];

	get options() {
		const omitted = this.mode === "slider" ? [] : ["min", "max", "step"];
		if (this.mode !== "datetime") return this.declarationsWithout("options", omitted);
		const options = this.declarationsWithout("options", [...omitted, "tolerance", "toleranceMode", "partialRange", "unit"]);
		const grading = options.gradingMethod as { options: { value: string; label: string }[] };
		return {
			...options,
			gradingMethod: {
				...grading,
				options: [
					{ value: "exact", label: this.msg("Exact match") },
					...grading.options.filter(option => option.value !== "exact"),
				],
			},
		};
	}

	/** Whether learners enter a number, use a range slider, or enter a date and time. */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor mode: NumericMode = "input";

	/** Whether numeric answers are scored (`exact`) or recorded without scoring (`ungraded`). */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: NumericGradingMethod = "exact";

	/** Target numeric value counting as correct, obfuscated in markup. */
	@property({ type: Number, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: number = 0;

	/** Which native field the Date/Time mode uses. Omit to infer the type from an existing solution or default to Date. */
	@property({ type: String, attribute: "datetime-type", reflect: true, useDefault: true })
	accessor dateTimeType: DateTimeType | "" = "";

	/** Target date, time, or local date and time in Date/Time mode, obfuscated in markup. */
	@property({ type: String, attribute: "datetime-solution", reflect: true, useDefault: true, converter: encryptedProperty })
	accessor dateTimeSolution = "";

	/** Maximum allowed deviation (`|answer - solution| <= tolerance`). */
	@property({ type: Number, attribute: true, reflect: true, useDefault: true })
	accessor tolerance: number = 0;

	/** Whether `tolerance` and `partialRange` are absolute values or percentages of the target. */
	@property({ type: String, attribute: "tolerance-mode", reflect: true, useDefault: true })
	accessor toleranceMode: ToleranceMode = "absolute";

	/** Extra distance beyond tolerance where score tapers linearly from 1 down to 0. */
	@property({ type: Number, attribute: "partial-range", reflect: true, useDefault: true })
	accessor partialRange: number = 0;

	/** Optional unit displayed beside the field or value readout (e.g. `m/s`, `%`). */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor unit: string = "";

	/** Lower bound for `slider` mode. */
	@property({ type: Number, attribute: true, reflect: true, useDefault: true })
	accessor min: number = 0;

	/** Upper bound for `slider` mode. */
	@property({ type: Number, attribute: true, reflect: true, useDefault: true })
	accessor max: number = 100;

	/** Increment size for `slider` mode. */
	@property({ type: Number, attribute: true, reflect: true, useDefault: true })
	accessor step: number = 1;

	@state() private accessor currentAnswer: number | undefined;
	@state() private accessor dateTimeAnswer = "";
	@state() private accessor graded = false;
	@state() private accessor detailedFeedback = false;

	private get nativeDateTimeType(): DateTimeType {
		const type = this.dateTimeType;
		if (type === "date" || type === "time" || type === "datetime-local") return type;
		const solution = this.dateTimeSolution ?? "";
		if (/[T ]/.test(solution)) return "datetime-local";
		return solution.includes(":") ? "time" : "date";
	}

	private dateTimeValue(value: string) {
		const [first, time] = value.split(/[T ]/);
		const date = first.includes(":") ? "" : first;
		const clock = time ?? (date ? "" : first);
		switch (this.nativeDateTimeType) {
			case "date": return date;
			case "time": return clock;
			case "datetime-local": return date && clock ? `${date}T${clock}` : "";
		}
	}

	private currentScore(): number {
		if (this.mode === "datetime") {
			const answer = this.dateTimeValue(this.dateTimeAnswer);
			return answer && answer === this.dateTimeValue(this.dateTimeSolution ?? "") ? 1 : 0;
		}
		return scoreNumeric(this.currentAnswer, this.solution, {
			tolerance: this.tolerance,
			toleranceMode: this.toleranceMode,
			partialRange: this.partialRange,
		});
	}

	private isWithinTolerance(): boolean {
		return this.currentScore() >= 1;
	}

	checkValidity(): boolean {
		if (this.mode === "datetime") return this.dateTimeValue(this.dateTimeAnswer) !== "";
		return this.currentAnswer !== undefined && Number.isFinite(this.currentAnswer);
	}

	reset(): void {
		this.graded = false;
		this.detailedFeedback = false;
		this.currentAnswer = undefined;
		this.dateTimeAnswer = "";
	}

	checkAnswer(detailedFeedback = false): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		return this.currentScore();
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (changed.has("mode")) this.refreshDrawer();
	}

	private formatExpected(): string {
		const tol = Number.isFinite(this.tolerance) ? Math.abs(this.tolerance) : 0;
		const tolText = this.toleranceMode === "relative" ? `${tol}%` : `${tol}`;
		const range = tol > 0 ? `${this.solution} ± ${tolText}` : `${this.solution}`;
		return this.unit.trim() ? `${range} ${this.unit.trim()}` : range;
	}

	protected renderHelperSwitches() {
		const { label: legend, options: modes } = WebwriterNumeric.options.mode;
		const widget = { msg: this.msg };
		return html`<fieldset class="numeric-modes edit-only">
			<legend class="visually-hidden">${legend(widget)}</legend>
			${modes.map(({ value, label }) => html`
				<input class="visually-hidden" id=${`numeric-mode-${value}`} name="numeric-mode" type="radio"
					value=${value} .checked=${live(this.mode === value)}
					@change=${() => {
						if (!this.isConnected || !this.editing || this.mode === value) return;
						transaction(this, () => this.setAttribute("mode", value));
					}}>
				<label for=${`numeric-mode-${value}`}>${label(widget)}</label>
			`)}
		</fieldset>`;
	}

	protected renderAnswer() {
		const editing = this.editing;
		const helper = this.mode === "datetime" ? {
			date: editing ? this.msg("Enter the solution date.") : this.msg("Enter a date."),
			time: editing ? this.msg("Enter the solution time.") : this.msg("Enter a time."),
			"datetime-local": editing ? this.msg("Enter the solution date and time.") : this.msg("Enter a date and time."),
		}[this.nativeDateTimeType]
			: this.mode === "slider"
				? editing ? this.msg("Set the solution on the slider.") : this.msg("Choose a value on the slider.")
				: editing ? this.msg("Enter the solution number.") : this.msg("Enter a number.");
		return html`
			${this.HelperRow(helper, nothing, "answer-helper")}
			${this.NumberAnswer()}
		`;
	}

	private renderDateTypes() {
		const types = [
			{ value: "date", label: this.msg("Date") },
			{ value: "time", label: this.msg("Time") },
			{ value: "datetime-local", label: this.msg("Date & time") },
		] as const;
		// The invisible group keeps the same dimensions in read mode, including when it wraps.
		return html`<fieldset class=${classMap({ "numeric-modes": true, "date-types": true, "edit-only": this.editing })}
			?inert=${!this.editing}>
			<legend class="visually-hidden">${this.msg("Date/Time")}</legend>
			${types.map(({ value, label }) => html`
				<input class="visually-hidden" id=${`date-type-${value}`} name="date-type" type="radio"
					value=${value} .checked=${live(this.nativeDateTimeType === value)}
					@change=${() => {
						if (!this.isConnected || !this.editing || this.nativeDateTimeType === value) return;
						transaction(this, () => this.setAttribute("datetime-type", value));
					}}>
				<label for=${`date-type-${value}`}>${label}</label>
			`)}
		</fieldset>`;
	}

	private partialTrigger = createRef<HTMLButtonElement>();
	private partialPanel = createRef<HTMLElement>();
	private partialInput = createRef<HTMLInputElement>();
	private metaFields = createRef<HTMLElement>();
	private partialPopup = new TopLayerPopup(this, () => ({
		trigger: this.partialTrigger.value,
		panel: this.partialPanel.value,
		keep: this.metaFields.value,
	}), { align: "end", onShow: () => this.partialInput.value?.focus({ preventScroll: true }) });

	private renderMetaFields() {
		if (!this.editing) return nothing;
		const partialLabel = this.msg("Partial credit band");
		const toleranceType = this.msg("Tolerance type");
		const unit = this.msg("Unit");
		return html`<div class="meta-fields edit-only" ${ref(this.metaFields)} data-ww-capture-selection="false">
			<div class="tolerance-field">
				<select aria-label=${toleranceType} title=${toleranceType} .value=${live(this.toleranceMode)}
					@change=${(event: Event) => {
						const value = (event.currentTarget as HTMLSelectElement).value;
						transaction(this, () => this.setAttribute("tolerance-mode", value));
					}}>
					<option value="absolute" aria-label=${this.msg("Absolute (± value)")}>±</option>
					<option value="relative" aria-label=${this.msg("Relative (± %)")}>±%</option>
				</select>
				<input class="meta-input tolerance-input" type="number" min="0" step="any"
					aria-label=${this.msg("Tolerance (±)")} .value=${live(String(this.tolerance))}
					@change=${(event: Event) => {
						const input = event.currentTarget as HTMLInputElement;
						this.tolerance = Number.isFinite(input.valueAsNumber) ? Math.max(0, input.valueAsNumber) : 0;
					}}>
			</div>
			<input class="meta-input unit-input" type="text" aria-label=${unit} placeholder=${unit} .value=${live(this.unit)}
				@change=${(event: Event) => { this.unit = (event.currentTarget as HTMLInputElement).value; }}>
			<button type="button" class="header-control partial-credit-trigger" aria-label=${partialLabel} title=${partialLabel}
				aria-haspopup="dialog" aria-controls="partial-credit" aria-expanded=${String(this.partialPopup.open)}
				${ref(this.partialTrigger)} @click=${() => this.partialPopup.toggle()}>
				<sl-icon src=${AdjustmentsIcon} aria-hidden="true"></sl-icon>
			</button>
			<div id="partial-credit" class="top-layer partial-credit-popover" popover="manual" role="dialog"
				aria-label=${partialLabel} ${ref(this.partialPanel)}>
				<div class="dropdown-container">
					<label>
						<span>${partialLabel}${this.toleranceMode === "relative" ? " (%)" : ""}</span>
						<input class="meta-input" type="number" min="0" step="any" .value=${live(String(this.partialRange))}
							${ref(this.partialInput)} @change=${(event: Event) => {
								const input = event.currentTarget as HTMLInputElement;
								this.partialRange = Number.isFinite(input.valueAsNumber) ? Math.max(0, input.valueAsNumber) : 0;
							}}>
					</label>
				</div>
			</div>
		</div>`;
	}

	private get sliderStep() {
		return Number.isFinite(this.step) && this.step > 0 ? this.step : 1;
	}

	private setSliderSetting(setting: "min" | "step" | "max", input: HTMLInputElement) {
		if (!this.isConnected || !this.editing || this.mode !== "slider") return;
		const value = input.valueAsNumber;
		const min = setting === "min" ? value : this.min;
		const max = setting === "max" ? value : this.max;
		const step = setting === "step" ? value : this.sliderStep;
		if (!Number.isFinite(value) || min > max || step <= 0) {
			input.value = String(setting === "step" ? this.sliderStep : this[setting]);
			return;
		}
		if (value === this[setting]) return;

		// Use the range control's own bounds and step normalization for the answer key.
		const range = this.ownerDocument.createElement("input");
		range.type = "range";
		range.min = String(min);
		range.max = String(max);
		range.step = String(step);
		range.value = String(this.solution);
		void transaction(this, async () => {
			this[setting] = value;
			this.solution = range.valueAsNumber;
			await this.updateComplete;
		});
	}

	private renderSliderSetting(setting: "min" | "step" | "max", label: string) {
		const value = setting === "step" ? this.sliderStep : this[setting];
		return html`<label class="slider-setting">
			<span>${label}</span>
			<input type="number" class="meta-input" step="any"
				min=${setting === "min" ? nothing : setting === "step" ? 0 : this.min}
				max=${setting === "min" ? this.max : nothing}
				.value=${live(String(value))}
				@change=${(event: Event) => this.setSliderSetting(setting, event.currentTarget as HTMLInputElement)}>
		</label>`;
	}

	private renderSliderBounds(unit: string) {
		const labels = [`${this.min}${unit ? ` ${unit}` : ""}`, `${this.max}${unit ? ` ${unit}` : ""}`];
		return html`<div class=${classMap({ "slider-bounds": true, "edit-only": this.editing })}
			data-ww-capture-selection=${this.editing ? "false" : nothing}>
			${this.editing ? html`
				${this.renderSliderSetting("min", this.msg("Min"))}
				${this.renderSliderSetting("step", this.msg("Step"))}
				${this.renderSliderSetting("max", this.msg("Max"))}
			` : labels.map(label => html`<span>${label}</span>`)}
		</div>`;
	}

	private NumberAnswer() {
		const editing = this.editing;
		const locked = !editing && this.graded;
		const showFb = !editing && this.graded && this.detailedFeedback;
		const correct = showFb && this.isWithinTolerance();
		const wrong = showFb && !correct;
		const unitText = this.unit.trim();

		if (this.mode === "datetime") {
			const expected = this.dateTimeValue(this.dateTimeSolution ?? "");
			return html`<div class="numeric-row date-row">
				<input type=${this.nativeDateTimeType} step="any" class=${classMap({ "num-input": true, correct, wrong })}
					.value=${live(editing ? expected : this.dateTimeValue(this.dateTimeAnswer))}
					?disabled=${locked} aria-label=${editing ? this.msg("Solution") : this.msg("Answer")}
					aria-describedby="answer-helper"
					@input=${(event: Event) => {
						const input = event.currentTarget as HTMLInputElement;
						const value = input.validity.valid ? input.value : "";
						if (editing) this.dateTimeSolution = value;
						else this.dateTimeAnswer = value;
					}}>
				${this.renderDateTypes()}
			</div>
			${wrong && expected ? html`<div class="feedback-line wrong" role="status">
				<span class="solution-text">${this.msg("Solution")}: ${expected.replace("T", " ")}</span>
			</div>` : nothing}`;
		}

		if (this.mode === "slider") {
			const sliderVal = editing ? this.solution : (this.currentAnswer ?? this.min);
			const readout = editing || this.currentAnswer !== undefined
				? `${sliderVal}${unitText ? ` ${unitText}` : ""}`
				: "—";
			return html`
				<div class="numeric-row slider-row">
					<div class="slider-main">
						<input
							type="range"
							class="slider-input"
							min=${this.min}
							max=${this.max}
							step=${this.sliderStep}
							.value=${live(String(sliderVal))}
							?disabled=${locked}
							aria-label=${editing ? this.msg("Solution") : this.msg("Answer")}
							aria-describedby="answer-helper"
							aria-valuetext=${unitText ? `${sliderVal} ${unitText}` : nothing}
							@input=${(e: Event) => {
								const next = Number((e.target as HTMLInputElement).value);
								if (editing) this.solution = next;
								else this.currentAnswer = next;
							}}
							@change=${(e: Event) => {
								const next = Number((e.target as HTMLInputElement).value);
								if (editing) this.solution = next;
								else this.currentAnswer = next;
							}}
						>
						<span class=${classMap({ "slider-value": true, "solution-value": editing })}>${readout}</span>
						${this.renderSliderBounds(unitText)}
					</div>
					${this.renderMetaFields()}
				</div>
				${showFb
					? html`<div class=${classMap({ "feedback-line": true, correct, wrong })} role="status">
						${correct ? this.msg("Correct") : this.msg("Incorrect")}
						${wrong ? html`<span class="solution-text" aria-label=${this.msg("Solution")}>${this.msg("Solution")}: ${this.formatExpected()}</span>` : nothing}
					</div>`
					: nothing}
			`;
		}

		const displayVal = editing
			? String(this.solution)
			: (this.currentAnswer === undefined ? "" : String(this.currentAnswer));

		return html`
			<div class="numeric-row">
				<input
					type="number"
					class=${classMap({ "num-input": true, "solution-value": editing, correct, wrong })}
					step="any"
					.value=${live(displayVal)}
					?disabled=${locked}
					aria-label=${editing ? this.msg("Solution") : this.msg("Answer")}
					aria-describedby="answer-helper"
					@input=${(e: Event) => {
						const raw = (e.target as HTMLInputElement).value.trim();
						if (editing) {
							if (raw !== "" && Number.isFinite(Number(raw))) this.solution = Number(raw);
						} else {
							this.currentAnswer = raw === "" || !Number.isFinite(Number(raw)) ? undefined : Number(raw);
						}
					}}
				>
				${unitText && !editing ? html`<span class="unit-label">${unitText}</span>` : nothing}
				${this.renderMetaFields()}
			</div>
			${wrong
				? html`<div class="feedback-line wrong" role="status">
					<span class="solution-text" aria-label=${this.msg("Solution")}>${this.msg("Solution")}: ${this.formatExpected()}</span>
				</div>`
				: nothing}
		`;
	}
}
