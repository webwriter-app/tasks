import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import type SlSwitch from "@shoelace-style/shoelace/dist/components/switch/switch.component.js";
import { transaction } from "@webwriter/widget/transaction";
import { ChoiceGridTask, type ChoiceGridGrading, type ChoiceGridSolution } from "../components/choice-grid-task";
import CheckIcon from "@tabler/icons/outline/check.svg";
import UiChecksIcon from "@tabler/icons/outline/list-check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { css, html, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { live } from "lit/directives/live.js";
import { name as packageId } from "../../package.json";
import { createChoiceItem, withMinimumChoiceItems } from "../components/choice-items";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { QuizItems } from "../components/quiz-items";
import { WebwriterTask } from "../components/webwriter-task";
import TrueFalseIcon from "../icons/true-false.svg";
import { registerQuizType } from "../model/quiz-api";
import { scoreAllOrNothing, scoreOptionAccuracy, scorePenalizedSelection } from "../model/scoring";
import type { WebwriterChoiceItem } from "./webwriter-choice-item";
import { selfAssessmentOption } from "../components/rubric-popover";
import "./webwriter-choice-column";
import "./webwriter-choice-row";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-choice": WebwriterChoice;
	}
}

type ChoiceMode = "single" | "multiple" | "true-false";
type ChoiceGradingMethod = "ungraded" | "pass-fail" | "partial" | "accuracy" | "self-assess";
type ChoiceSolution = { [id: string]: boolean };

function createChoice(mode: ChoiceMode) {
	const choice = document.createElement("webwriter-choice");
	choice.setAttribute("mode", mode);
	choice.append(...withMinimumChoiceItems(document));
	if (mode === "true-false") choice.solution = { true: true };
	return choice;
}

// Choices come first wherever a type is picked.
registerQuizType({
	packageId,
	widgetPosition: 0,
	section: "select",
	id: "webwriter-choice",
	getName: (locale, translate = messageFor(locale)) => translate("Single/Multiple Choice"),
	icon: UiChecksIcon,
	createInstance: () => createChoice("multiple"),
	matches: element => element.localName === "webwriter-choice",
	subtypes: [
		{
			packageId,
			id: "webwriter-true-false-choice",
			getName: (locale, translate = messageFor(locale)) => translate("True/False"),
			icon: TrueFalseIcon,
			createInstance: () => createChoice("true-false"),
			matches: element => element.localName === "webwriter-choice" && element.getAttribute("mode") === "true-false",
			applyTo: element => element.setAttribute("mode", "true-false"),
		},
	],
});

/**
 * An answer where learners pick one or more options, or decide true vs. false.
 *
 * Author at least two `<webwriter-choice-item>` children in the default slot.
 * True/False mode shows its own two answers.
 *
 * Conversion: the options can be converted to a `ul` (the solution is not carried over), and a `ul`
 * or `ol` becomes a single-choice task with one option per list item and no option marked correct.
 * A one-item list gets a blank second option.
 */
@customElement("webwriter-choice")
export class WebwriterChoice extends ChoiceGridTask {
	static styles = [ChoiceGridTask.styles, css`
		/* Each option lays itself out; the list only stacks them. */
		.container-list {
			display: flex;
			flex-direction: column;
			gap: var(--sl-spacing-x-small);
		}

		.task-helper + :is(.container-list, .grid-wrap) {
			margin-block-start: var(--sl-spacing-x-small);
		}

		.container-list ::slotted(webwriter-choice-item) {
			display: block;
		}

		.task-helper-switches {
			gap: var(--sl-spacing-2x-small);
		}

		.single-choice-switch {
			min-inline-size: 0;
		}

		.single-choice-switch::part(base) {
			max-inline-size: 100%;
		}

		.single-choice-switch::part(label) {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		/* True/False tiles */
		.tf-choices {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 14rem));
			gap: var(--sl-spacing-small);
		}

		.tf-cell {
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

			&.missed {
				--color-border: var(--sl-color-warning-600);
				--color-background: var(--sl-color-warning-50);
				--color-icon: var(--sl-color-warning-800);
			}
		}

		.tf-note {
			color: var(--color-icon);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
			text-align: center;
		}

		.tf-cell label {
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

		.tf-cell:not(.selected, .key, .disabled) label:hover {
			border-color: var(--sl-input-border-color-hover);
		}

		.tf-cell.missed label {
			border-style: dashed;
		}

		.tf-cell.disabled label:not(.solution-unavailable) {
			cursor: default;
		}

		.tf-cell input {
			position: absolute;
			inset: 0;
			margin: 0;
			opacity: 0;
			pointer-events: none;
		}

		.tf-cell sl-icon {
			flex: none;
			font-size: 1.25em;
			color: var(--color-icon);
		}
	`];

	/** @internal */
	static scopedElements = {
		...ChoiceGridTask.scopedElements,
	};

	static actions = {
		...WebwriterTask.actions,
		addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") },
	};

	static convertFrom = { ul: "loadList", ol: "loadList" };
	static convertTo = { ul: "toList" };

	static options = {
		...WebwriterTask.options,
		"mode": {
			type: "select",
			options: [
				{ value: "single", label: (widget: { msg: MsgFn }) => widget.msg("Single choice", { id: "s9daa676c05ab2a68" }) },
				{ value: "multiple", label: (widget: { msg: MsgFn }) => widget.msg("Multiple Choice") },
				{ value: "true-false", label: (widget: { msg: MsgFn }) => widget.msg("True/False") },
			],
			label: (widget: { msg: MsgFn }) => widget.msg("Mode"),
		},
		randomizeOrder: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Randomize Order") },
		gradingMethod: {
			type: "select",
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every right option and no wrong option is selected."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"),
					description: (widget: { msg: MsgFn }) => widget.msg("Right selections add credit; wrong selections subtract from it (min. 0)."),
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
	};

	static gradingOptions = ["points", "gradingMethod"];

	get options() {
		if (this.grid) return this.gridOptions();
		const omitted = this.mode === "true-false" ? ["randomizeOrder"] : ["mode"];
		const base = this.declarationsWithout("options", omitted) as Record<string, any>;
		if (this.mode !== "multiple") {
			base.gradingMethod = {
				type: "select",
				label: this.msg("Grading Method"),
				options: [
					{
						value: "pass-fail",
						label: this.msg("Exact match"),
						description: this.msg("Full credit for selecting the correct option."),
					},
					...base.gradingMethod.options.filter(({ value }: { value: string }) =>
						value === "ungraded" || value === selfAssessmentOption.value),
				],
			};
		}
		return base;
	}

	get actions() {
		if (this.grid) return this.declarationsWithout("actions", [], ChoiceGridTask.gridActions);
		return this.declarationsWithout("actions", this.mode === "true-false" ? ["addOption"] : []);
	}

	protected get canAddOption() {
		return false;
	}

	protected get addOptionLabel() {
		return this.grid ? this.gridAddOptionLabel : super.addOptionLabel;
	}

	protected override get isUngraded() {
		return super.isUngraded || (this.grid && this.ungraded);
	}

	/**
	 * How many options learners may select, or `true-false` tiles. Multiple choice is the default.
	 *
	 * - `multiple`: Any number of options can be selected.
	 * - `single`: Exactly one option can be selected.
	 * - `true-false`: Built-in True / False tiles.
	 */
	@property({ type: String, attribute: "mode", reflect: true, useDefault: true })
	accessor mode: ChoiceMode = "multiple";

	/**
	 * If true, the order of options will be randomized for learners.
	 *
	 * Note: Randomization occurs only during the first render, so changing this property dynamically will not have any effect.
	 */
	@property({ type: Boolean, attribute: "randomize-order", reflect: true, useDefault: true })
	private accessor randomizeOrder: boolean = false;

	/**
	 * How the score of this answer is calculated.
	 *
	 * - `pass-fail`: Full score only if exactly the correct options are selected.
	 * - `partial`: Correct selections earn credit, wrong ones subtract from it.
	 */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: ChoiceGradingMethod | ChoiceGridGrading = "pass-fail";

	protected get gridGradingMethod(): ChoiceGridGrading {
		return this.gradingMethod === "accuracy" ? "pass-fail" : this.gradingMethod;
	}

	protected set gridGradingMethod(value: ChoiceGridGrading) {
		this.gradingMethod = value;
	}

	/**
	 * The options counting as correct, as a map from option ID (or `"true"`/`"false"`) to whether it has to be selected.
	 * It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: "solution", reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: ChoiceSolution | ChoiceGridSolution = {};

	protected get gridSolution(): ChoiceGridSolution {
		return this.solution as ChoiceGridSolution;
	}

	protected set gridSolution(value: ChoiceGridSolution) {
		this.solution = value;
	}

	@state() private accessor currentAnswer: ChoiceSolution = {};
	@state() private accessor tfAnswer: "true" | "false" | undefined;
	@state() private accessor graded: boolean = false;
	@state() private accessor detailedFeedback: boolean = false;

	private choices = new QuizItems<WebwriterChoiceItem>(this, "webwriter-choice-item", () => this.randomizeOrder);

	private get selected(): ChoiceSolution {
		return this.editing ? this.solution as ChoiceSolution : this.currentAnswer;
	}

	private set selected(value: ChoiceSolution) {
		if (this.editing) this.solution = value;
		else this.currentAnswer = value;
	}

	private get tfSolution(): "true" | "false" {
		return this.solution.false && !this.solution.true ? "false" : "true";
	}

	private get correctOptions() {
		const correct = this.choices.authored.filter(item => this.solution[item.id]).map(item => item.id);
		return this.mode === "single" ? correct.slice(0, 1) : correct;
	}

	/** @internal */
	getChoiceState(id: string) {
		const expected = this.correctOptions.includes(id);
		const selected = Boolean(this.currentAnswer[id]);
		const graded = this.graded && !this.editing;
		const unavailable = this.solutionUnavailableTitle;
		return {
			selected: this.editing ? !unavailable && expected : selected,
			disabled: graded || Boolean(unavailable),
			unavailable,
			showFeedback: graded && this.detailedFeedback,
			correct: graded && this.detailedFeedback && expected === selected,
		};
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (changed.has("mode") && this.mode === "single") {
			const first = this.choices.authored.find(item => this.currentAnswer[item.id]);
			if (first) this.currentAnswer = { [first.id]: true };
		}

		if (changed.has("mode")) this.refreshDrawer();

		if (changed.has("solution") || changed.has("currentAnswer") || changed.has("graded") ||
			changed.has("mode") || changed.has("editable") || changed.has("gradingMethod")) {
			this.choices.authored.forEach(item => item.requestUpdate?.());
		}
	}

	private handleSelect(event: CustomEvent) {
		const item = event.target as WebwriterChoiceItem;
		if (!this.choices.authored.includes(item) || this.solutionUnavailableTitle || (this.graded && !this.editing)) return;
		if (!item.id && this.editing) item.id = "ww" + crypto.randomUUID();
		const id = item.id;
		if (this.mode === "single") {
			const newSelected = { ...this.selected };
			for (const option of this.choices.authored) newSelected[option.id] = option === item;
			this.selected = newSelected;
		} else {
			this.selected = { ...this.selected, [id]: !this.selected[id] };
		}
	}

	/** @internal The options as a bulleted list; which ones are correct is not carried over. */
	toList() {
		const list = this.ownerDocument.createElement("ul");
		for (const item of this.choices.authored) {
			const entry = this.ownerDocument.createElement("li");
			entry.textContent = item.textContent?.trim() ?? "";
			list.append(entry);
		}
		return list.childElementCount > 0 ? list : null;
	}

	/** @internal Takes over the items of a list as the options of a single-choice task. */
	loadList(fragment: DocumentFragment) {
		const items = Array.from(fragment.querySelector("ul, ol")?.children ?? []).filter(child => child.localName === "li");
		if (items.length === 0) return false;
		this.setAttribute("mode", "single");
		const prompt = this.ownerDocument.createElement("p");
		prompt.slot = "prompt";
		const options = items.map(item => {
			const option = createChoiceItem(this.ownerDocument, item.textContent?.trim() ?? "");
			option.id = "ww" + crypto.randomUUID();
			return option;
		});
		this.replaceChildren(prompt, ...withMinimumChoiceItems(this.ownerDocument, options));
		return true;
	}

	protected addOption() {
		if (this.grid) return this.addGridOption();
		if (!this.isConnected || !this.editing || this.mode === "true-false") return;
		const item = createChoiceItem(this.ownerDocument);
		item.id = "ww" + crypto.randomUUID();
		this.insertBefore(item, this.feedbackElement);
		const paragraph = item.firstElementChild;
		if (paragraph) this.placeCaret(paragraph);
	}

	checkValidity(): boolean {
		if (this.grid) return this.checkGridValidity();
		if (this.mode === "true-false") return this.tfAnswer !== undefined;
		return this.choices.authored.some(item => this.currentAnswer[item.id] === true);
	}

	checkAnswer(detailedFeedback: boolean): number {
		if (this.grid) return this.checkGridAnswer(detailedFeedback);
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		if (this.mode === "true-false") return this.tfAnswer === this.tfSolution ? 1 : 0;

		const authored = this.choices.authored;
		const correct = new Set(this.correctOptions);
		const selected = new Set(authored.filter(item => this.currentAnswer[item.id]).map(item => item.id));

		const selectedCorrect = new Set([...selected].filter(id => correct.has(id)));
		const selectedWrong = new Set([...selected].filter(id => !correct.has(id)));

		if (this.mode === "single" || this.gradingMethod === "pass-fail") {
			return selectedWrong.size === 0 ? scoreAllOrNothing(selectedCorrect.size, correct.size) : 0;
		} else if (this.gradingMethod === "partial") {
			return scorePenalizedSelection(selectedCorrect.size, selectedWrong.size, correct.size);
		} else if (this.gradingMethod === "accuracy") {
			return scoreOptionAccuracy(selectedCorrect.size, selectedWrong.size, correct.size, authored.length);
		} else {
			return 0;
		}
	}

	reset() {
		this.resetGrid();
		this.currentAnswer = {};
		this.tfAnswer = undefined;
		this.choices.shuffle();
		this.graded = false;
		this.detailedFeedback = false;
	}

	private TrueFalseChoice(choice: "true" | "false", label: string, icon: string) {
		const graded = this.graded && !this.editing;
		const feedback = graded && this.detailedFeedback;
		const active = this.editing ? this.tfSolution : this.tfAnswer;
		const unavailable = this.solutionUnavailableTitle;
		const selected = !unavailable && active === choice;
		const solution = this.tfSolution === choice;
		const key = this.editing && selected;

		let note: unknown = nothing;
		if (feedback && selected) note = solution ? this.msg("Correct") : this.msg("Your answer");
		else if (feedback && solution) note = this.msg("Solution");
		else if (key) note = this.msg("Solution");

		return html`<div class=${classMap({
			"tf-cell": true,
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
					@change=${() => {
						if (this.solutionUnavailableTitle) return;
						if (this.editing) this.solution = { [choice]: true };
						else this.tfAnswer = choice;
					}}
				>
				<sl-icon src=${icon}></sl-icon>
				${label}
			</label>
			${note === nothing ? nothing : html`<span class=${key ? "visually-hidden" : "tf-note"}>${note}</span>`}
		</div>`;
	}

	/** Instructions for the current choice mode and detailed feedback after multiple choice. */
	private Helper() {
		if (this.editing) {
			if (this.isUngraded) return this.mode === "true-false" ? this.msg("Enter the statement.") : this.msg("Enter the choices.");
			return this.mode === "multiple" ? this.msg("Select the correct answers.") : this.msg("Select the correct answer.");
		}
		if (this.mode === "true-false") return this.msg("Choose True or False.");
		if (this.mode === "single") return this.msg("Select one answer.");
		if (this.graded && this.detailedFeedback && !this.editing) {
			const correct = new Set(this.correctOptions);
			const selected = this.choices.authored.filter(item => this.currentAnswer[item.id]).map(item => item.id);
			const found = selected.filter(id => correct.has(id)).length;
			const wrong = selected.length - found;
			const count = this.msg(str`Found ${found} of ${correct.size} correct options.`);
			if (!wrong) return count;
			return `${count} ${wrong === 1 ? this.msg("1 wrong option selected.") : this.msg(str`${wrong} wrong options selected.`)}`;
		}
		return this.msg("Select all that apply.");
	}

	protected renderHelperSwitches() {
		if (this.mode === "true-false") return nothing;
		const label = this.msg("Single choice", { id: "s9daa676c05ab2a68" });
		return html`<sl-switch class="single-choice-switch edit-only" title=${label}
			.checked=${live(this.mode === "single")}
			@sl-change=${(event: Event) => {
				const control = event.currentTarget as SlSwitch;
				if (!this.isConnected || !this.editing || this.mode === "true-false") {
					control.checked = this.mode === "single";
					return;
				}
				transaction(this, () => this.setAttribute("mode", control.checked ? "single" : "multiple"));
			}}
		>${this.grid ? html`<span class="grid-switch-full">${label}</span>
			<span class="grid-action-short" aria-hidden="true">${this.msg("Single")}</span>` : label}</sl-switch>`;
	}

	protected renderAnswer() {
		if (this.grid) return this.renderGridAnswer();
		if (this.mode === "true-false") {
			return html`${this.HelperRow(this.Helper())}<div class="tf-choices" role="radiogroup">
				${this.TrueFalseChoice("true", this.msg("True"), CheckIcon)}
				${this.TrueFalseChoice("false", this.msg("False"), XIcon)}
			</div>`;
		}
		const action = html`<button type="button" class="header-control helper-action edit-only add-option"
			data-ww-capture-selection="false" @click=${this.addOption}>
			${this.addOptionLabel}
		</button>`;
		return html`${this.HelperRow(this.Helper(), action)}<div
			class="container-list"
			role=${this.mode === "single" ? "radiogroup" : "group"}
		>
			<slot @select=${this.handleSelect}></slot>
		</div>`;
	}
}
