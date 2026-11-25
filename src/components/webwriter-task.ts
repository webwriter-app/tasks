import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import SlMenuItem from "@shoelace-style/shoelace/dist/components/menu-item/menu-item.component.js";
import SlMenu from "@shoelace-style/shoelace/dist/components/menu/menu.component.js";
import SlSwitch from "@shoelace-style/shoelace/dist/components/switch/switch.component.js";
import {
	computed,
	renderWidgetOptionField,
	signal,
	widgetOptionControlStyles,
} from "@webwriter/lit";
import {
	readWidgetOption,
	validWidgetOptionValue,
	widgetDeclarations,
	widgetOptionAttributeValue,
	type WidgetOptionState,
	type WidgetOptionValue,
} from "@webwriter/widget/widget-options";
import { transaction } from "@webwriter/widget/transaction";
import { solutionControlStyles } from "./solution-control-styles";
import WarningIcon from "@tabler/icons/outline/alert-triangle.svg";
import CheckIcon from "@tabler/icons/outline/check.svg";
import ChevronDownIcon from "@tabler/icons/outline/chevron-down.svg";
import ChevronRightIcon from "@tabler/icons/outline/chevron-right.svg";
import CircleCheckIcon from "@tabler/icons/outline/circle-check.svg";
import CircleHalfIcon from "@tabler/icons/outline/circle-half-2.svg";
import CircleXIcon from "@tabler/icons/outline/circle-x.svg";
import ListCheckIcon from "@tabler/icons/outline/list-check.svg";
import PlusIcon from "@tabler/icons/outline/plus.svg";
import SettingsIcon from "@tabler/icons/outline/settings.svg";
import { css, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import {
	findQuizTypeById,
	getQuizTypes,
	onQuizMembersChanged,
	onQuizTypesChanged,
	quizTypeOf,
	resultsOf,
	setQuizTaskConnected,
	taskGroupOf,
	tasksOf,
	type QuizTaskElement,
	type QuizType,
} from "../model/quiz-api";
import { HintPopup } from "./hint-popup";
import { CardActivity, editOnlyStyles } from "./card-activity";
import { FeedbackPopover, feedbackStyles } from "./feedback-popover";
import { RubricPopover, rubricStyles, selfAssessmentOption } from "./rubric-popover";
import { TopLayerPopup, topLayerStyles } from "./top-layer";
import { gridLayoutChange, gridLayoutTarget, isGridLayout } from "./grid-layout";
import { QuizElement } from "./localization";

const taskResultsTag = "webwriter-quiz-results";

export const textToleranceOptions = {
	ignoreCase: { type: "boolean" as const, label: (widget: { msg: MsgFn }) => widget.msg("Ignore capitalization") },
	ignorePunctuation: { type: "boolean" as const, label: (widget: { msg: MsgFn }) => widget.msg("Ignore punctuation & accents") },
	allowTypos: { type: "boolean" as const, label: (widget: { msg: MsgFn }) => widget.msg("Ignore minor typos") },
};

/**
 * Base class for a task. Put the prompt in the named slot and implement the answer UI.
 *
 * @part card - The card that holds the task.
 * @part title - The generated task label ("#1").
 * @part prompt - The prompt of the task.
 * @part answer - The area with the answer controls.
 * @part result - The correctness and points shown after submitting.
 * @part feedback - The author's feedback in a popover.
 */
export abstract class WebwriterTask extends QuizElement implements QuizTaskElement {
	abstract checkValidity(): boolean;
	abstract reset(): void;

	static styles: CSSResultGroup = [editOnlyStyles, topLayerStyles, widgetOptionControlStyles, feedbackStyles, rubricStyles, solutionControlStyles, css`
		:host {
			display: block;
			position: relative;
			box-sizing: border-box;
			container-type: inline-size;
			min-width: min(300px, 100%);
			max-width: 2100px;
			padding: var(--sl-spacing-small) var(--sl-spacing-medium);
			border: 1px solid var(--quiz-card-border);
			border-radius: var(--quiz-card-radius);
			background: var(--sl-color-neutral-0);
			color: var(--ww-text-color, inherit);
			font-family: var(--ww-font-family, inherit);
			print-color-adjust: exact;
			transition:
				var(--sl-transition-fast) border-color,
				var(--sl-transition-fast) box-shadow;

			--quiz-card-border: var(--sl-color-neutral-200);
			--quiz-card-radius: calc(var(--sl-border-radius-large) * 1.5);
			--quiz-muted: var(--sl-color-neutral-600);
		}

		:host(:state(task-required-warning)) {
			border-color: var(--sl-color-warning-500);
			box-shadow: 0 0 0 3px var(--sl-color-warning-100);
		}

		/*
		 * Text the widget generates, such as titles, helpers, labels and results, is not part of the
		 * document and cannot be selected. Authored content in the slots, and the fields learners
		 * type in, can.
		 */
		.card {
			-webkit-user-select: none;
			user-select: none;
		}

		/* The editor treats exposed host padding as part of the authored text surface. */
		.card-background {
			position: absolute;
			inset: 0;
			cursor: default;
			-webkit-user-select: none;
			user-select: none;
		}

		slot,
		sl-input,
		sl-textarea {
			-webkit-user-select: text;
			user-select: text;
		}

		:host ::slotted(img),
		:host ::slotted(video) {
			max-width: 100%;
			height: auto;
		}

		:focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}

		/* Each task is a card: a muted header line, the prompt as its heading, the answer, then the result. */
		.card {
			position: relative;
			display: flex;
			flex-direction: column;
			gap: var(--sl-spacing-small);

			&:focus {
				outline: none;
			}
		}

		.quiz-header {
			display: flex;
			align-items: center;
			min-block-size: 1lh;
			gap: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			font-size: var(--sl-font-size-small);
			color: var(--quiz-muted);
			font-variant-numeric: tabular-nums;
		}

		/*
		 * In edit mode, the controls of authors end the header line. They read as its text, so the
		 * line keeps its height; they shrink before they wrap, and a long type name is cut short.
		 */
		.edit-toolbar {
			flex: 1 1 0;
			min-inline-size: min-content;
			display: grid;
			/* The type icon and chevron stay visible when the name is truncated. */
			--type-picker-width: minmax(calc(2.6em + 2 * var(--sl-spacing-2x-small)), max-content);
			grid-template-columns: var(--type-picker-width);
			justify-content: end;
			align-items: center;
			gap: var(--sl-spacing-2x-small);

			&:has(> .add-option) {
				grid-template-columns: minmax(0, max-content) var(--type-picker-width);
			}

			.type-switch {
				display: flex;
				min-inline-size: 0;
				max-inline-size: 100%;
				justify-self: end;
			}

			.add-option {
				min-inline-size: 0;
			}
		}

		.header-summary {
			display: inline-flex;
			align-items: center;
			gap: var(--sl-spacing-x-small);
			min-inline-size: 0;
			max-inline-size: 100%;

			.title {
				min-inline-size: 0;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.max-points,
			.not-graded {
				white-space: nowrap;
			}
		}

		.header-editor {
			display: inline-flex;
			min-inline-size: 0;
			max-inline-size: 100%;
		}

		.header-text {
			max-inline-size: none;
			margin: 0 calc(-1 * var(--sl-spacing-2x-small));
			padding: 0 var(--sl-spacing-2x-small);
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: none;
			color: inherit;
			font: inherit;
			text-align: start;
			cursor: pointer;

			&:hover {
				background: var(--sl-color-neutral-100);
				color: var(--sl-color-neutral-800);
			}

			&:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			}
		}

		.configure-label {
			display: inline-flex;
			align-items: baseline;
			gap: 0.3em;
			color: var(--quiz-muted);
			white-space: nowrap;

			sl-icon {
				align-self: center;
			}
		}

		.header-options {
			display: grid;
			gap: var(--sl-spacing-x-small);
			inline-size: min(22rem, calc(100vw - 16px));
			max-block-size: var(--popup-space, calc(100dvh - 16px));
			overflow: auto;
			padding: var(--sl-spacing-small);
			color: var(--sl-color-neutral-800);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-normal);
			font-variant-numeric: normal;

			.develop-field {
				display: grid;
				gap: var(--sl-spacing-3x-small);
				min-inline-size: 0;
			}

			.develop-field.widget-option-checkbox {
				display: flex;
			}

			.develop-field-label {
				font-weight: var(--sl-font-weight-semibold);
			}

			.widget-option-checkbox .develop-field-label {
				font-weight: var(--sl-font-weight-normal);
			}

			.widget-option-radios label {
				display: flex;
				align-items: center;
				gap: var(--sl-spacing-2x-small);
			}

			.grading-radios {
				display: grid;
				gap: var(--sl-spacing-x-small);
			}

			.widget-option-radios label.grading-radio {
				align-items: flex-start;
				cursor: pointer;

				input[type="radio"] {
					margin-top: 0.2em;
					flex: none;
				}
			}

			.grading-radio-copy {
				display: grid;
				gap: 1px;
			}

			.grading-radio-label {
				line-height: 1.3;
			}

			.grading-radio-description {
				font-size: var(--sl-font-size-x-small);
				line-height: 1.35;
				color: var(--sl-color-neutral-600);
			}

			.header-fields {
				display: grid;
				align-items: end;
				gap: var(--sl-spacing-small);

				&:has(> :nth-child(2)) {
					grid-template-columns: minmax(0, 1fr) minmax(0, 5.5rem);
				}

				&.answer-fields:has(> :nth-child(2)) {
					grid-template-columns: repeat(2, minmax(0, 1fr));
				}
			}

			input:not([type="checkbox"], [type="radio"]) {
				box-sizing: border-box;
				inline-size: 100%;
				min-inline-size: 0;
				padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
				border: 1px solid var(--sl-input-border-color);
				border-radius: var(--sl-border-radius-medium);
				font: inherit;
			}

			input:is([type="checkbox"], [type="radio"]) {
				accent-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			}
		}

		/* A block of its own inside the dropdown, so that no line box around it adds to the height of the line. */
		.header-control {
			display: flex;
			align-items: baseline;
			gap: 0.3em;
			max-inline-size: 100%;
			margin: 0;
			padding: 0 var(--sl-spacing-2x-small);
			border: 0;
			border-radius: var(--sl-border-radius-small);
			background: none;
			color: var(--quiz-muted);
			font: inherit;
			white-space: nowrap;
			cursor: pointer;

			&:hover {
				background: var(--sl-color-neutral-100);
				color: var(--sl-color-neutral-800);
			}

			&:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			}

			sl-icon {
				flex: none;
				align-self: center;
			}

			.label {
				min-inline-size: 0;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}

		/* Primary author actions in a task's helper row. */
		.header-control.helper-action {
			--helper-action-color: var(--sl-color-primary-600);
			margin-inline-start: auto;
			margin-block: -2px;
			padding: 1px var(--sl-spacing-x-small);
			border: 1px solid var(--helper-action-color);
			border-radius: var(--sl-border-radius-medium);
			background: var(--helper-action-color);
			color: var(--sl-color-neutral-0);
			font-weight: var(--sl-font-weight-semibold);
			flex: none;
			transition:
				var(--sl-transition-fast) opacity,
				var(--sl-transition-fast) visibility,
				var(--sl-transition-fast) border-color,
				var(--sl-transition-fast) background-color,
				var(--sl-transition-fast) color;

			&:hover {
				--helper-action-color: var(--sl-color-primary-500);
			}
			&:active {
				--helper-action-color: var(--sl-color-primary-700);
			}
			&:disabled {
				--helper-action-color: var(--sl-color-primary-300);
				cursor: default;
			}
		}

		/* The menus of the toolbar are plain lists: an icon and a name per entry. */
		.edit-menu {
			min-inline-size: 11rem;
			box-shadow: var(--sl-shadow-large);

			sl-menu-item::part(base) {
				font-size: var(--sl-font-size-small);
			}

			sl-menu-item::part(checked-icon),
			sl-menu-item::part(submenu-icon) {
				display: none;
			}

			sl-menu-item::part(prefix) {
				margin-inline-start: var(--sl-spacing-small);
			}

			sl-icon[slot="prefix"] {
				color: var(--quiz-muted);
			}

			sl-icon[slot="suffix"] {
				margin-inline-end: var(--sl-spacing-small);
				color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			}
		}

		.type-menu {
			box-sizing: border-box;
			min-inline-size: 8rem;
			max-block-size: var(--popup-space, calc(100dvh - 16px));

			sl-menu[slot="submenu"] {
				box-sizing: border-box;
				min-inline-size: min(11rem, var(--popup-side-space, 11rem));
				max-inline-size: var(--popup-side-space, none);
				max-block-size: var(--auto-size-available-height, calc(100dvh - 16px));
			}

			sl-menu[slot="submenu"] sl-menu-item::part(label) {
				white-space: normal;
				overflow-wrap: anywhere;
			}
		}

		.edit-toolbar:has(.type-switch > :popover-open) {
			opacity: 1;
			visibility: visible;
			transition: none;
		}

		.answer-settings {
			display: inline-flex;
			&:has(> :popover-open) { opacity: 1; visibility: visible; transition: none; }
		}

		.answer-settings-trigger {
			display: inline-flex;
			align-items: center;
			padding: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			border: 0;
			border-radius: var(--sl-border-radius-pill);
			background: none;
			color: var(--sl-color-neutral-600);
			font: inherit;
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);
			line-height: 1.5;
			cursor: pointer;

			&:hover { background: var(--sl-color-neutral-100); }
		}

		.tolerance-fields {
			min-inline-size: 0;
			inline-size: min(17rem, calc(100vw - 16px));
			max-block-size: var(--popup-space, calc(100dvh - 16px));
			overflow: auto;
			white-space: normal;
		}

		.dropdown-container {
			box-sizing: border-box;
			padding: var(--sl-spacing-x-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-large);
		}

		/* A task without a Task Results widget is checked on its own. */
		.task-actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--sl-spacing-x-small) var(--sl-spacing-small);
		}

		@container (max-width: 300px) {
			.task-actions {
				column-gap: var(--sl-spacing-2x-small);
			}

			.task-actions:not(:has(.unanswered, .retry)) {
				flex-wrap: nowrap;
			}

			.task-actions :is(.feedback-toggle, .rubric-control, .rubric-toggle) {
				min-inline-size: 0;
			}
		}

		@container (max-width: 360px) {
			.quiz-header,
			.header-summary {
				column-gap: var(--sl-spacing-2x-small);
			}
		}

		@container (max-width: 280px) {
			.edit-toolbar .add-option .label,
			.configure-label .label {
				display: none;
			}
		}

		.task-progress {
			flex: none;
			color: var(--quiz-muted);
			font-size: var(--sl-font-size-small);
			white-space: nowrap;
		}

		button.task-progress {
			padding-inline: 0;
			text-decoration: underline;
			text-underline-offset: 0.2em;
		}

		.unanswered {
			display: inline-flex;
			align-items: center;
			gap: 0.35em;
			color: var(--sl-color-warning-800);
			font-size: var(--sl-font-size-small);
		}

		.badge {
			display: inline-flex;
			align-items: center;
			gap: 0.3em;
			padding: 0.1em 0.6em;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-neutral-50);
			color: var(--sl-color-neutral-700);
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);
			line-height: var(--sl-line-height-normal);

			&.not-graded {
				padding-block: 0;
				border: 0;
				outline: 1px solid var(--sl-color-neutral-300);
				outline-offset: -1px;
				font-size: inherit;
				line-height: inherit;
			}

			&.required-warning {
				border-color: var(--sl-color-warning-500);
				background: var(--sl-color-warning-50);
				color: var(--sl-color-warning-800);
			}
		}

		/* The prompt fills the block width so an empty prompt stays selectable, with the hint aligned beside it. */
		.task-prompt {
			display: flex;
			align-items: baseline;
			gap: var(--sl-spacing-x-small);
			font-size: 1.0625em;
			font-weight: var(--sl-font-weight-semibold);
			line-height: var(--sl-line-height-dense);

			slot[name="prompt"] {
				display: block;
				flex: 1 1 auto;
				min-width: 0;
			}

			slot[name="prompt"]::slotted(*) {
				display: block;
				width: 100%;
				min-height: 1.25em;
				margin: 0;
			}

			hint-popup {
				flex: none;
			}

			.add-hint:is(:hover, :focus-within) {
				--edit-control-opacity: 1;
			}
		}

		.task-helper {
			display: flex;
			flex-wrap: nowrap;
			align-items: center;
			gap: var(--sl-spacing-x-small);
			min-inline-size: 0;
			min-block-size: 1.125rem;

			> .helper {
				flex: 1;
				min-inline-size: 0;
				margin-block: 0;
				color: var(--quiz-muted);
				font-size: var(--sl-font-size-small);
				overflow: hidden;
				white-space: nowrap;
				text-overflow: ellipsis;
			}
		}

		.task-helper-switches {
			display: flex;
			flex-wrap: nowrap;
			align-items: center;
			gap: var(--sl-spacing-x-small);
			margin-inline-start: auto;
			min-inline-size: 0;
			max-inline-size: 100%;
			white-space: nowrap;
		}

		.task-helper-switches > sl-switch {
			font-size: var(--sl-font-size-small);
			--width: 1.75rem;
			--height: 1rem;
			--thumb-size: 0.75rem;
		}

		.task-helper-switches > .helper-action {
			font-size: var(--sl-font-size-small);
		}

		@container (inline-size < 22rem) {
			.task-helper { gap: var(--sl-spacing-2x-small); }
		}

		@container (inline-size < 18rem) {
			.task-helper-switches {
				overflow-x: auto;
				padding-block: var(--sl-spacing-2x-small);
				margin-block: calc(-1 * var(--sl-spacing-2x-small));
			}
		}

		@media print {
			.task-helper-switches { display: none; }
		}

		/* The result of a task after submitting. */
		.result {
			--result-color: var(--sl-color-neutral-700);
			display: grid;
			gap: var(--sl-spacing-2x-small);
			padding-block-start: var(--sl-spacing-small);
			border-block-start: 1px solid var(--quiz-card-border);
			overflow-wrap: anywhere;

			&[data-state="correct"] { --result-color: var(--sl-color-success-700); }
			&[data-state="partial"] { --result-color: var(--sl-color-warning-700); }
			&[data-state="incorrect"] { --result-color: var(--sl-color-danger-700); }
		}

		.result-head {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			color: var(--result-color);
			font-weight: var(--sl-font-weight-semibold);

			sl-icon {
				font-size: 1.2em;
			}

			.points {
				margin-inline-start: auto;
				color: var(--quiz-muted);
				font-weight: var(--sl-font-weight-normal);
				font-variant-numeric: tabular-nums;
			}

		}

		.legacy-feedback {
			white-space: pre-wrap;
		}

		.visually-hidden {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}

		.print-note {
			display: none;
		}

		@media print {
			:host {
				break-inside: avoid;
				border-color: var(--sl-color-neutral-300);
			}

			.edit-toolbar,
			.task-prompt > hint-popup[vacant],
			.task-actions {
				display: none;
			}

			.print-note {
				display: block;
				font-style: italic;
			}
		}
	`];

	/** @internal */
	static scopedElements: Record<string, CustomElementConstructor> = {
		"hint-popup": HintPopup,
		"sl-button": SlButton,
		"sl-icon": SlIcon,
		"sl-icon-button": SlIconButton,
		"sl-menu": SlMenu,
		"sl-menu-item": SlMenuItem,
		"sl-switch": SlSwitch,
	};

	static actions = {};

	static signals = {
		score: {
			shape: "number",
			label: { _: "Score" },
			description: { _: "Share of points reached from 0 to 1 (0 before submitting)." },
		},
		complete: {
			shape: "boolean",
			label: { _: "Submitted" },
			description: { _: "True once the task has been submitted." },
		},
	};

	static options = {
		label: {
			type: "string" as const,
			label: (widget: { msg: MsgFn }) => widget.msg("Task label"),
			placeholder: (widget: WebwriterTask) => widget.defaultLabel,
		},
		points: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Points") },
		hideScoring: { type: Boolean, label: (widget: { msg: MsgFn }) => widget.msg("Hide scoring") },
	};

	override get options() {
		return this.declarationsWithout("options", []);
	}

	/** The options that the points in the top row open: the score and how answers earn it. */
	static gradingOptions: readonly string[] = ["points"];
	/** @internal Response options available in Configure regardless of grading. */
	static answerOptions: readonly string[] = [];

	/** The label of the task in its top row. Without it, the label is the task’s position in its group. */
	@property({ type: String, attribute: "label", reflect: true, useDefault: true })
	accessor label = "";

	/** @internal The task's position when the author has left its label empty. */
	get defaultLabel() {
		return `#${Math.max(0, taskGroupOf(this).indexOf(this)) + 1}`;
	}

	/** The maximum score for this task. */
	@property({ type: Number, attribute: "points", reflect: true, useDefault: true })
	accessor points = 1;

	/** Hide the grading badge and point values on this task. */
	@property({ type: Boolean, attribute: "hide-scoring", reflect: true, useDefault: true })
	accessor hideScoring = false;

	/** Newline-separated self-assessment criteria. */
	@property({ type: String, reflect: true, useDefault: true })
	accessor rubric = "";

	/** @deprecated Author a webwriter-quiz-feedback child in the feedback slot. */
	@property({ type: String, reflect: true, useDefault: true })
	accessor feedback = "";

	@state() private accessor requiredWarning = false;

	#scoreSignal = signal(0);
	#completeSignal = signal(false);

	/** Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). */
	signals = {
		score: computed(() => this.#scoreSignal.get()),
		complete: computed(() => this.#completeSignal.get()),
	};

	@state() private accessor score: number | undefined;

	@state() private accessor submitted = false;

	@state() private accessor checkedRubric = new Set<number>();

	#activity = new CardActivity(this);

	/** @internal The custom states of the card; the editor marks its selection in them. */
	get selectionStates() {
		return this.#activity.states;
	}

	private slotObserver = new MutationObserver(records => {
		if ((this.editing && gridLayoutTarget(this)) || records.some(record => record.target === this || record.target.parentNode === this)) this.requestUpdate();
	});

	private unsubscribe: (() => void)[] = [];

	constructor() {
		super();
		const proto = Object.getPrototypeOf(this) as { checkAnswer?: (detailedFeedback: boolean) => number };
		if (typeof proto.checkAnswer === "function") {
			const method = proto.checkAnswer;
			const assess = () => {
				// Lock the response and suppress automatic correctness feedback.
				method.call(this, false);
				return this.rubricShare ?? Number.NaN;
			};
			Object.defineProperty(this, "checkAnswer", {
				configurable: true,
				get: () => this.isSelfAssessment ? assess : this.isUngraded ? undefined : method,
			});
		}
	}

	protected get isSelfAssessment() {
		return (this as { gradingMethod?: string }).gradingMethod === selfAssessmentOption.value;
	}

	/** Whether this task currently opts out of automatic grading. */
	protected get isUngraded(): boolean {
		return (this as { gradingMethod?: string }).gradingMethod === "ungraded";
	}

	protected get solutionUnavailableTitle() {
		return this.editing && this.isUngraded ? this.msg("This task is ungraded.") : undefined;
	}

	connectedCallback() {
		super.connectedCallback();
		this.slotObserver.observe(this, {
			childList: true, subtree: true, attributes: true,
			...(gridLayoutTarget(this) ? { characterData: true } : { attributeFilter: ["slot", "id"] }),
		});
		// Numbering, points and the submit buttons depend on the Task Results widget, and the type switcher on the registered types.
		this.unsubscribe = [
			onQuizMembersChanged(() => this.requestUpdate()),
			onQuizTypesChanged(() => this.requestUpdate()),
		];
		setQuizTaskConnected(this, true);
		this.requestUpdate();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this.slotObserver.disconnect();
		this.unsubscribe.forEach(stop => stop());
		this.unsubscribe = [];
		setQuizTaskConnected(this, false);
	}

	/**
	 * A task inserted from the editor gets its required paragraphs without slots. In edit mode,
	 * the first of them becomes the prompt, where authors see its placeholder.
	 */
	private adoptPrompt() {
		if (!this.editing || this.querySelector(":scope > [slot=prompt]")) return;
		const first = Array.from(this.children).find(child => child.slot !== "hint");
		if (first?.localName === "p" && !first.slot) first.slot = "prompt";
	}

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (!this.editing && this.requiredWarning) this.selectionStates.add("task-required-warning");
		else this.selectionStates.delete("task-required-warning");
		if (changed.has("gradingMethod")) this.refreshDrawer();
		if (changed.has("rubric")) {
			this.resetRubric();
			if (!this.editing && this.submitted && this.isSelfAssessment) this.updateRubricScore();
		}
		this.adoptPrompt();
		if (this.shadowRoot?.slotAssignment === "manual") {
			for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot[name="prompt"], slot[name="hint"], slot[name="feedback"]')) {
				const children = Array.from(this.children).filter(child => child.slot === slot.name);
				const assigned = slot.assignedElements();
				if (children.length !== assigned.length || children.some((child, index) => child !== assigned[index])) {
					slot.assign(...children);
				}
			}
		}
	}

	protected isAnswerContent(node: Node) {
		while (node.parentNode && node.parentNode !== this) node = node.parentNode;
		return node.parentNode === this && (!(node instanceof Element) || !node.slot);
	}

	protected get hintElement() {
		return this.querySelector<HTMLElement>(":scope > webwriter-quiz-hint[slot=hint]");
	}

	protected get feedbackElement() {
		return this.querySelector(":scope > webwriter-quiz-feedback[slot=feedback]");
	}

	private addFeedback = () => {
		if (!this.isConnected || !this.editing || this.feedbackElement) return;
		const feedback = this.ownerDocument.createElement("webwriter-quiz-feedback");
		feedback.slot = "feedback";
		for (const line of this.feedback.split(/\r\n?|\n/)) {
			const paragraph = this.ownerDocument.createElement("p");
			paragraph.textContent = line;
			feedback.append(paragraph);
		}
		// Adding the element and dropping the legacy attribute are one undo step.
		transaction(this, () => {
			this.append(feedback);
			this.removeAttribute("feedback");
		});
		this.requestUpdate();
		void this.updateComplete.then(() => {
			if (!this.editing || this.feedbackElement !== feedback) return;
			this.feedbackPopup.show();
			if (this.feedbackPopup.open && feedback.firstElementChild) this.placeCaret(feedback.firstElementChild);
		});
	};

	/** @internal */
	get maximumPoints() {
		return Number.isFinite(this.points) && this.points > 0 ? this.points : 1;
	}

	/** @internal */
	showRequiredWarning(show: boolean) {
		this.requiredWarning = show;
	}

	protected get requiredWarningMessage() {
		return this.msg("Answer the task first.");
	}

	protected get canCheckAnswer() {
		return true;
	}

	/** @internal */
	showScore(score: number | undefined, submitted = score !== undefined) {
		this.score = score;
		this.submitted = submitted;
		this.#completeSignal.set(Boolean(submitted));
		this.#scoreSignal.set(score !== undefined && this.maximumPoints > 0 ? Math.max(0, Math.min(1, score / this.maximumPoints)) : 0);
	}

	/** @internal */
	resetFeedback() {
		this.requiredWarning = false;
		this.resetRubric();
		this.showScore(undefined);
	}

	protected resetRubric() {
		if (this.checkedRubric.size) this.checkedRubric = new Set();
	}

	private get rubricCriteria() {
		return this.rubric.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
	}

	private get rubricShare() {
		const count = this.rubricCriteria.length;
		return count ? this.checkedRubric.size / count : undefined;
	}

	private updateRubricScore() {
		const share = this.rubricShare;
		this.showScore(share === undefined ? undefined : share * this.maximumPoints, true);
		resultsOf(this)?.updateTaskScore?.(this, share);
	}

	protected get showRubricChecklist() {
		return this.isSelfAssessment && this.submitted;
	}

	private rubricPopup = new RubricPopover(this, () => this.editing && this.isSelfAssessment, () => this.rubricCriteria);

	private RubricChecklist() {
		const criteria = this.rubricCriteria;
		if (this.editing || !this.showRubricChecklist || !criteria.length) return nothing;
		return html`<div class="rubric-checklist" role="group" aria-labelledby="rubric-checklist-title">
			<div id="rubric-checklist-title" class="rubric-title">${this.msg("Self-check")}</div>
			${criteria.map((criterion, index) => html`<label>
				<input type="checkbox" .checked=${this.checkedRubric.has(index)}
					@change=${(event: Event) => {
						if (this.editing || !this.showRubricChecklist || this.rubricCriteria[index] !== criterion) return;
						const checked = new Set(this.checkedRubric);
						if ((event.currentTarget as HTMLInputElement).checked) checked.add(index);
						else checked.delete(index);
						this.checkedRubric = checked;
						if (this.isSelfAssessment) this.updateRubricScore();
					}} />
				<span>${criterion}</span>
			</label>`)}
		</div>`;
	}

	/** Points as learners read them: rounded to one decimal, in the widget's language. */
	protected formatPoints(points: number) {
		return new Intl.NumberFormat(this.localize.getLocale(), { maximumFractionDigits: 1 }).format(points);
	}

	private pointsLabel(points: number) {
		return points === 1 ? this.msg("point") : this.msg("points");
	}

	/** @internal Shows the task to a learner who has to answer it: brings it into view and focuses it. */
	revealTask() {
		this.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
		this.renderRoot.querySelector<HTMLElement>(".card")?.focus({ preventScroll: true });
	}

	/** The state of an option as the editor's drawer shows it. */
	private optionState(name: string): WidgetOptionState | undefined {
		const declarations = widgetDeclarations(this, "options");
		return Object.hasOwn(declarations, name) ? readWidgetOption(this, name, declarations[name], this.localize.getLocale()) : undefined;
	}

	/** Sets an option as the editor's drawer does: on its attribute, as one undo step. An empty text removes it. */
	private setOption = (name: string, value: WidgetOptionValue) => {
		const option = this.optionState(name);
		if (!this.editing || !option || option.hidden || option.disabled || option.readOnly || !validWidgetOptionValue(option, value, this)) {
			this.requestUpdate();
			return;
		}
		if (option.attribute === null) (this as unknown as Record<string, WidgetOptionValue>)[name] = value;
		else {
			const text = value === "" ? null : widgetOptionAttributeValue(option.type, value, option.multiple, option.inverted);
			if (text === null) this.removeAttribute(option.attribute);
			else this.setAttribute(option.attribute, text);
		}
		this.requestUpdate();
	};

	/** The options that apply now; a choice of a few shows as radio buttons. */
	protected configurationStates(names: readonly string[]) {
		return names
			.map(name => this.optionState(name))
			.filter((option): option is WidgetOptionState => !!option && !option.hidden)
			.map(option => (option.type === "select" && (option.name === "gradingMethod" || (option.choices?.length ?? 0) <= 5) ? { ...option, control: "radio" as const } : option));
	}

	protected renderConfigurationField(option: WidgetOptionState, fieldScope = "header-") {
		if (option.type === "select" && option.control === "radio") {
			const labelId = `widget-${fieldScope}${option.name}`;
			const locked = Boolean(option.disabled || option.readOnly);
			return html`<div class="develop-field widget-option-field">
				<span class="develop-field-label" id=${labelId}>${option.label}</span>
				<div class="widget-option-radios grading-radios" role="radiogroup" aria-labelledby=${labelId}>
					${(option.choices ?? []).map(choice => html`<label class="grading-radio">
						<input
							type="radio"
							name=${labelId}
							value=${choice.value}
							.checked=${option.value === choice.value}
							?disabled=${locked}
							@change=${() => this.setOption(option.name, choice.value)}
						/>
						<span class="grading-radio-copy">
							<span class="grading-radio-label">${choice.label}</span>
							${choice.description ? html`<span class="grading-radio-description">${choice.description}</span>` : nothing}
						</span>
					</label>`)}
				</div>
			</div>`;
		}
		return renderWidgetOptionField(option, this.setOption, fieldScope);
	}

	private headerEditor = createRef<HTMLElement>();
	private headerTrigger = createRef<HTMLButtonElement>();
	private headerPanel = createRef<HTMLElement>();
	private headerOptions = createRef<HTMLElement>();
	private headerPopup = new TopLayerPopup(this, () => ({
		trigger: this.headerTrigger.value,
		panel: this.headerPanel.value,
		keep: this.headerEditor.value,
		scrollArea: this.headerOptions.value,
	}), {
		onShow: () => {
			const field = this.headerPanel.value?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled)");
			if (field instanceof HTMLInputElement && field.type === "text") field.select();
			else field?.focus();
		},
	});

	private HeaderEditor(content: TemplateResult) {
		const label = this.optionState("label");
		const labelField = label && !label.hidden
			? renderWidgetOptionField({ ...label, placeholder: this.defaultLabel }, this.setOption, "header-")
			: nothing;
		const { gradingOptions, answerOptions } = this.constructor as typeof WebwriterTask;
		const grading = this.configurationStates(this.checkAnswer ? gradingOptions : gradingOptions.filter(name => name === "gradingMethod"));
		const answers = this.configurationStates(answerOptions);
		if (labelField === nothing && !grading.length && !answers.length) return html`<span class="header-summary">${content}</span>`;
		const points = grading.find(option => option.name === "points");
		const answerFields = answers.filter(option => option.type !== "boolean");
		const checkboxes = [...grading, ...answers].filter(option => option.type === "boolean");
		const configure = this.msg("Configure");
		return html`<div class="header-editor" ${ref(this.headerEditor)}>
			<button
				type="button"
				class="header-text header-summary"
				title=${configure}
				aria-haspopup="dialog"
				aria-controls="task-configuration"
				aria-expanded=${String(this.headerPopup.open)}
				${ref(this.headerTrigger)}
				@click=${() => this.headerPopup.toggle()}
			>
				${content}
				<span class="visually-hidden">${configure}</span>
				<span class="configure-label edit-only" aria-hidden="true"><sl-icon src=${SettingsIcon}></sl-icon><span class="label">${configure}</span></span>
			</button>
			<div id="task-configuration" popover="manual" class="top-layer" role="dialog" aria-label=${configure} ${ref(this.headerPanel)}
				@keydown=${(event: KeyboardEvent) => {
					if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement) || event.target.type === "checkbox" || event.target.type === "radio") return;
					// Enter applies the field, as its change event does, and closes the panel. Without its default,
					// the key does not go on to click the trigger that the focus returns to.
					event.preventDefault();
					event.target.dispatchEvent(new Event("change", { bubbles: true }));
					this.headerPopup.hide();
					this.headerTrigger.value?.focus();
				}}
			>
				<div class="dropdown-container widget-options header-options" ${ref(this.headerOptions)}>
					${labelField !== nothing || points ? html`<div class="header-fields">
						${labelField}${points ? this.renderConfigurationField(points) : nothing}
					</div>` : nothing}
					${grading.filter(option => option !== points && option.type !== "boolean").map(option => this.renderConfigurationField(option))}
					${answerFields.length ? html`<div class="header-fields answer-fields">
						${answerFields.map(option => renderWidgetOptionField(option, this.setOption, "header-"))}
					</div>` : nothing}
					${checkboxes.map(option => this.renderConfigurationField(option))}
				</div>
			</div>
		</div>`;
	}

	/**
	 * The label and score share one configuration button in edit mode.
	 */
	private QuizHeader() {
		const results = resultsOf(this);
		const graded = Boolean(this.checkAnswer);
		const label = this.label.trim();
		const showLabel = !results?.hideTaskTitle;
		const showScore = !this.hideScoring && (!graded || !results?.hidePoints);
		const scoreContent = graded
			? html`<span class="max-points">${this.formatPoints(this.maximumPoints)} ${this.pointsLabel(this.maximumPoints)}</span>`
			: html`<span class="badge not-graded">${this.msg("Not graded")}</span>`;
		const summary = html`
			${showLabel ? html`<span class="title" part="title" dir=${label ? nothing : "ltr"}>${label || this.defaultLabel}</span>` : nothing}
			${showLabel && graded && showScore ? html`<span aria-hidden="true">·</span>` : nothing}
			${showScore ? scoreContent : nothing}`;
		const unanswered = results && !this.editing && this.requiredWarning
			? html`<span class="badge required-warning"><sl-icon src=${WarningIcon}></sl-icon>${this.msg("Unanswered")}</span>`
			: nothing;

		return html`<div class="quiz-header">
			${this.editing ? this.HeaderEditor(summary) : showLabel || showScore ? html`<span class="header-summary">${summary}</span>` : nothing}
			${unanswered}
			${this.editing ? this.EditToolbar() : nothing}
		</div>`;
	}

	/** Opens a menu of the toolbar on its current entry, or its first, so that the arrow keys go on from there. */
	private focusMenu(panel?: HTMLElement | null) {
		const menu = panel?.querySelector<SlMenu>("sl-menu");
		if (!menu) return;
		const items = menu.getAllItems();
		const item = items.find(entry => entry.getAttribute("aria-current") === "true" || entry.getAttribute("data-active") === "true")
			?? items[0];
		if (!item) return;
		menu.setCurrentItem(item);
		item.focus();
	}

	private typeSwitch = createRef<HTMLElement>();
	private typeTrigger = createRef<HTMLButtonElement>();
	private typePanel = createRef<HTMLElement>();
	private typeMenuList = createRef<SlMenu>();

	/** The menus of the toolbar open in the top layer, in front of the editor's controls. */
	private typeMenu = new TopLayerPopup(this, () => ({
		trigger: this.typeTrigger.value,
		panel: this.typePanel.value,
		keep: this.typeSwitch.value,
		scrollArea: this.typeMenuList.value,
	}), {
		align: "end",
		onShow: () => this.focusMenu(this.typePanel.value),
	});

	/** The trigger of a menu: a click opens and closes it, and the down arrow opens it. */
	private menuTrigger(menu: TopLayerPopup) {
		return {
			click: () => menu.toggle(),
			keydown: (event: KeyboardEvent) => {
				if (event.key !== "ArrowDown") return;
				event.preventDefault();
				menu.show();
			},
		};
	}

	/** In edit mode, the toolbar switches the task to another type, from a list of the types with their icons. */
	private TypeSwitcher() {
		const types = getQuizTypes().filter(type => !type.layoutOnly);
		const current = quizTypeOf(this);
		const family = isGridLayout(this) ? gridLayoutTarget(this) : undefined;
		const locale = this.localize.getLocale();
		const trigger = this.menuTrigger(this.typeMenu);
		const sections = [
			{ id: "select", label: this.msg("Select") },
			{ id: "write", label: this.msg("Write") },
			{ id: "arrange", label: this.msg("Arrange") },
			{ id: "speak", label: this.msg("Speak") },
			{ id: "show", label: this.msg("Draw") },
			{ id: undefined, label: this.msg("Other tasks") },
		] as const;
		return html`<span class="type-switch" ${ref(this.typeSwitch)}>
			<button
				type="button"
				class="header-control"
				aria-haspopup="menu"
				aria-expanded=${this.typeMenu.open ? "true" : "false"}
				${ref(this.typeTrigger)}
				@click=${trigger.click}
				@keydown=${trigger.keydown}
			>
				${current?.icon ? html`<sl-icon aria-hidden="true" src=${current.icon}></sl-icon>` : nothing}
				<span class="label">${current ? current.getName(locale, this.msg) : this.msg("Task type")}</span>
				<sl-icon src=${ChevronDownIcon}></sl-icon>
			</button>
			<div popover="manual" class="top-layer" ${ref(this.typePanel)}>
				<sl-menu
					class="edit-menu type-menu"
					aria-label=${this.msg("Task type")}
					${ref(this.typeMenuList)}
					@sl-select=${(event: CustomEvent<{ item: SlMenuItem }>) => {
						if (event.detail.item.querySelector('[slot="submenu"]')) return;
						this.typeMenu.hide();
						const id = event.detail.item.value;
						if (id === taskResultsTag) {
							void this.switchToResults();
							return;
						}
						const type = findQuizTypeById(id);
						if (type) this.selectTaskType(type);
					}}
				>
					${sections.map(({ id, label }) => {
						const items = types.filter(type => type.section === id);
						if (!items.length) return nothing;
						const active = items.some(type => type.id === family || type === current || (current && type.subtypes?.includes(current)));
						return html`<sl-menu-item
							value=${id ?? "other"}
							aria-label=${label}
							aria-haspopup="menu"
							data-active=${active ? "true" : nothing}
							@keydown=${(event: KeyboardEvent) => {
								if (event.key !== "Escape" || event.target === event.currentTarget) return;
								event.stopPropagation();
								(event.currentTarget as HTMLElement).focus();
							}}
						>
							${label}
							<sl-icon aria-hidden="true" slot="suffix" src=${ChevronRightIcon}></sl-icon>
							<sl-menu slot="submenu" class="edit-menu" aria-label=${label}>
								${items.map(type => this.TypeMenuEntries(type, current, locale))}
							</sl-menu>
						</sl-menu-item>`;
					})}
					<sl-menu-item value=${taskResultsTag}><i>${this.msg("Task Results")}</i></sl-menu-item>
				</sl-menu>
			</div>
		</span>`;
	}

	private TypeMenuEntries(type: QuizType, current: QuizType | undefined, locale: string) {
		const variants = type.subtypes ?? [];
		const defaultVariant = variants.find(variant => variant.id === type.defaultSubtype);
		const selected = current === type ? defaultVariant ?? type : current;
		const entries = defaultVariant ? variants : [type, ...variants];
		return entries.map(entry => this.TypeMenuItem(entry, entry.getName(locale, this.msg), entry === selected));
	}

	private TypeMenuItem(type: QuizType, name: string, active: boolean) {
		return html`<sl-menu-item
			value=${type.id}
			aria-current=${active ? "true" : nothing}
		>
			${type.icon ? html`<sl-icon aria-hidden="true" slot="prefix" src=${type.icon}></sl-icon>` : nothing}
			${name}
			${active ? html`<sl-icon aria-hidden="true" slot="suffix" src=${CheckIcon}></sl-icon>` : nothing}
		</sl-menu-item>`;
	}

	private selectTaskType(type: QuizType) {
		if (!this.isConnected || !this.editing) return;
		if (this.localName === "webwriter-choice" && isGridLayout(this) && type.id === "webwriter-true-false-choice") {
			const change = gridLayoutChange(this);
			if (change) void transaction(this, async () => {
				const next = change();
				type.applyTo?.(next);
				await next.updateComplete;
			});
			return;
		}
		this.switchType(type);
	}

	private async switchToResults() {
		if (!this.isConnected || !this.editing) return;
		if (!this.ownerDocument.defaultView?.customElements.get(taskResultsTag)) {
			await import("../widgets/webwriter-quiz-results");
			if (!this.isConnected || !this.editing) return;
		}
		const next = this.ownerDocument.createElement(taskResultsTag);
		for (const name of ["id", "class", "style", "lang", "dir"]) {
			const value = this.getAttribute(name);
			if (value !== null) next.setAttribute(name, value);
		}
		transaction(this, () => {
			const feedback = this.feedbackElement;
			if (feedback) next.append(feedback);
			this.replaceWith(next);
		});
	}

	/**
	 * Turns this task into one of another type, keeping shared task settings and authored content.
	 * Choice and order tasks also keep their options. It is one undo step.
	 */
	private switchType(type: QuizType) {
		if (!this.isConnected || !this.editing || quizTypeOf(this) === type) return;
		const next = type.createInstance(this.localize.getLocale(), this.msg) as HTMLElement;

		// The same widget in another mode, such as single and multiple choice, only takes over the settings.
		if (next.localName === this.localName) {
			transaction(this, () => {
				if (type.applyTo) {
					type.applyTo(this);
					return;
				}
				for (const attribute of Array.from(next.attributes)) {
					if (attribute.name !== "id") this.setAttribute(attribute.name, attribute.value);
				}
			});
			return;
		}

		const kept = new Set(["prompt", "hint", "feedback"]);
		for (const child of Array.from(next.children)) if (kept.has(child.slot)) child.remove();
		const carried = Array.from(this.children).filter(child => kept.has(child.slot));
		transferItems(this, next);
		next.prepend(...carried.filter(child => child.slot !== "feedback"));
		next.append(...carried.filter(child => child.slot === "feedback"));
		for (const attribute of ["label", "points", "hide-scoring", "rubric"]) {
			const value = this.getAttribute(attribute);
			if (value !== null) next.setAttribute(attribute, value);
		}
		if (this.isSelfAssessment) next.setAttribute("grading-method", selfAssessmentOption.value);
		transaction(this, () => this.replaceWith(next));
	}

	private feedbackPopup = new FeedbackPopover(this, () => this.editing);

	private removeFeedback() {
		const feedback = this.feedbackElement;
		if (!this.editing || !feedback) return;
		this.feedbackPopup.hide();
		transaction(this, () => feedback.remove());
	}

	private TaskActions() {
		const results = resultsOf(this);
		const editing = this.editing;
		const submitted = !editing && this.submitted;
		const hasFeedback = Boolean(this.feedbackElement) || (!editing && this.feedback.trim() !== "");
		const canOpenFeedback = hasFeedback && (editing || submitted);
		const { anchor: feedbackAnchor, expanded, id } = this.feedbackPopup;
		const readerTrigger = canOpenFeedback && !editing;
		const toggleFeedback = () => this.feedbackPopup.toggle();
		let anchor: TemplateResult | typeof nothing = nothing;
		if (results) {
			const tasks = tasksOf(results);
			const position = `${tasks.indexOf(this) + 1}/${tasks.length}`;
			const label = this.msg(str`${position} tasks`);
			anchor = readerTrigger
				? html`<button type="button" class="header-control task-progress" ${ref(feedbackAnchor)}
						aria-expanded=${expanded} aria-controls=${id} title=${this.msg("Feedback")}
						aria-label=${`${label}, ${this.msg("Feedback")}`} @click=${toggleFeedback}>
						${label}
					</button>`
				: html`<span class="task-progress" ${ref(feedbackAnchor)}>${label}</span>`;
		} else if (!submitted || hasFeedback) {
			anchor = html`<sl-button variant="primary" size="small" class="check" ?disabled=${editing || (!submitted && !this.canCheckAnswer)} ${ref(feedbackAnchor)}
				aria-expanded=${readerTrigger ? expanded : nothing} aria-controls=${readerTrigger ? id : nothing} @click=${this.check}>
				${this.checkAnswer ? this.msg("Check") : this.msg("Submit")}
			</sl-button>`;
		}
		return html`<div class="task-actions" ${ref(this.feedbackPopup.actions)}>
			${anchor}
			${editing ? this.feedbackPopup.renderAuthorButton(this.msg, hasFeedback ? undefined : this.addFeedback) : nothing}
			${editing && this.isSelfAssessment ? this.rubricPopup.render(this.msg) : nothing}
			${canOpenFeedback ? this.feedbackPopup.render(this.msg, editing ? () => this.removeFeedback() : undefined,
				this.feedbackElement ? undefined : html`<div class="legacy-feedback">${this.feedback}</div>`) : nothing}
			${!results && submitted ? html`<sl-button size="small" class="retry" @click=${this.retry}>${this.msg("Try again")}</sl-button>` : nothing}
			${!results && !editing && this.requiredWarning
				? html`<span class="unanswered" role="status"><sl-icon src=${WarningIcon}></sl-icon>${this.requiredWarningMessage}</span>`
				: nothing}
		</div>`;
	}

	private check() {
		if (this.editing) return;
		if (this.submitted) {
			this.feedbackPopup.toggle();
			return;
		}
		if (!this.canCheckAnswer) return;
		if (!this.checkValidity()) {
			this.showRequiredWarning(true);
			return;
		}
		this.showRequiredWarning(false);
		const share = this.checkAnswer?.(true);
		if (share === undefined || !Number.isFinite(share)) this.showScore(undefined, true);
		else this.showScore(Math.max(0, Math.min(1, share)) * this.maximumPoints);
		void this.updateComplete.then(() => {
			if (!this.editing && this.submitted && !resultsOf(this)) this.feedbackPopup.show();
		});
	}

	private retry() {
		this.feedbackPopup.hide();
		this.reset();
		this.resetFeedback();
	}

	private hintPopup = createRef<HintPopup>();

	/** The hint opens in a popup. Authors edit it there, as learners read it; an empty hint is not shown to learners. */
	private Hint() {
		const hasHint = Boolean(this.hintElement);
		const canAdd = this.editing && !hasHint;
		return html`<hint-popup
			class=${canAdd ? "add-hint edit-only vacant" : nothing}
			labelled
			reserve-space
			label=${this.msg("Hint")}
			add-label=${canAdd ? this.msg("Add Hint") : nothing}
			.onAdd=${canAdd ? this.addHint : undefined}
			remove-label=${this.msg("Remove hint")}
			close-label=${this.msg("Close")}
			${ref(this.hintPopup)}
		><slot name="hint"></slot></hint-popup>`;
	}

	private addHint = () => {
		if (!this.isConnected || !this.editing || this.hintElement) return;
		const hint = this.ownerDocument.createElement("webwriter-quiz-hint");
		hint.slot = "hint";
		const paragraph = this.ownerDocument.createElement("p");
		hint.append(paragraph);
		this.prepend(hint);
		// Open the new hint and put the caret into it, so that authors can type it right away.
		this.requestUpdate();
		void this.updateComplete.then(async () => {
			const popup = this.hintPopup.value;
			if (!paragraph.isConnected || !popup) return;
			popup.show();
			await popup.updateComplete;
			this.placeCaret(paragraph);
		});
	};

	private Result() {
		const score = this.score;
		if (this.editing || !this.submitted || score === undefined) return nothing;

		const [state, label, icon] = this.isSelfAssessment ? ["self-assessment", this.msg("Self-assessment"), ListCheckIcon]
			: score >= this.maximumPoints ? ["correct", this.msg("Correct"), CircleCheckIcon]
			: score > 0 ? ["partial", this.msg("Partially correct"), CircleHalfIcon]
			: ["incorrect", this.msg("Incorrect"), CircleXIcon];
		const results = resultsOf(this);
		const points = !this.hideScoring && !results?.hidePoints
			? html`<span class="points">${this.msg(str`${this.formatPoints(score)} of ${this.formatPoints(this.maximumPoints)}`)} ${this.pointsLabel(this.maximumPoints)}</span>`
			: nothing;

		return html`<div class="result" part="result" data-state=${state} role="status">
			<div class="result-head"><sl-icon src=${icon}></sl-icon><span>${label}</span>${points}</div>
		</div>`;
	}

	protected abstract renderAnswer(): unknown;

	protected renderHelperSwitches(): TemplateResult | typeof nothing {
		return nothing;
	}

	private toleranceTrigger = createRef<HTMLButtonElement>();
	private tolerancePanel = createRef<HTMLElement>();
	private toleranceBody = createRef<HTMLElement>();
	private toleranceAnchor = createRef<HTMLElement>();
	private tolerancePopup = new TopLayerPopup(this, () => ({
		trigger: this.toleranceTrigger.value,
		panel: this.tolerancePanel.value,
		keep: this.toleranceAnchor.value,
		scrollArea: this.toleranceBody.value,
	}), {
		align: "end",
		onShow: () => this.toleranceBody.value?.querySelector("input")?.focus(),
	});

	protected renderTolerance() {
		if (!this.editing) return nothing;
		const label = this.msg("Tolerance");
		const fields = this.configurationStates(Object.keys(textToleranceOptions));
		if (!fields.length) return nothing;
		return html`<span class="answer-settings edit-only" ${ref(this.toleranceAnchor)} data-ww-capture-selection="false">
			<button type="button" class="answer-settings-trigger tolerance-trigger" ${ref(this.toleranceTrigger)}
				aria-haspopup="dialog" aria-controls="task-tolerance" aria-expanded=${String(this.tolerancePopup.open)}
				@click=${() => this.tolerancePopup.toggle()}>${label}</button>
			<div id="task-tolerance" popover="manual" class="top-layer" role="dialog" aria-label=${label} ${ref(this.tolerancePanel)}>
				<div class="dropdown-container widget-options tolerance-fields" ${ref(this.toleranceBody)}>
					${fields.map(option => this.renderConfigurationField(option, "tolerance-"))}
				</div>
			</div>
		</span>`;
	}

	protected HelperRow(text: string, action: TemplateResult | typeof nothing = nothing, descriptionId?: string) {
		const grid = isGridLayout(this);
		const switchable = this.editing && gridLayoutTarget(this) !== undefined
			&& (grid || !this.matches('webwriter-choice[mode="true-false"]'));
		const switches = this.editing ? this.renderHelperSwitches() : nothing;
		const editAction = this.editing ? action : nothing;
		const showSwitches = switchable || switches !== nothing || editAction !== nothing;
		if (!text && !showSwitches) return nothing;
		const change = switchable ? gridLayoutChange(this) : undefined;
		return html`<div class="task-helper">
			${text ? html`<p class="helper" id=${descriptionId ?? nothing} title=${text}>${text}</p>` : nothing}
			${showSwitches ? html`<div class="task-helper-switches">
				${switches}
				${switchable ? html`<sl-switch class="grid-layout-switch edit-only"
					.checked=${grid}
					?disabled=${!change}
					title=${change ? nothing : this.msg("The current content or settings require this layout.")}
					@sl-change=${this.changeGridLayout}
				>${this.msg("Grid")}</sl-switch>` : nothing}
				${editAction}
			</div>` : nothing}
		</div>`;
	}

	private changeGridLayout = (event: Event) => {
		const control = event.currentTarget as SlSwitch;
		const before = isGridLayout(this);
		const change = this.isConnected && this.editing ? gridLayoutChange(this) : undefined;
		if (!change || control.checked === before) {
			control.checked = before;
			this.requestUpdate();
			return;
		}
		void transaction(this, async () => {
			this.reset();
			this.resetFeedback();
			change();
			await this.updateComplete;
			this.shadowRoot?.querySelector<HTMLElement>(".grid-layout-switch")?.focus({ preventScroll: true });
		});
	};

	protected addOption?(): void;

	/** Whether the header offers a button to insert an answer option. */
	protected get canAddOption() {
		return true;
	}

	/** The label of the button that adds an answer option, such as "Add Pair" on a pairing task. */
	protected get addOptionLabel() {
		return this.msg("Add Option");
	}

	private OptionAction() {
		const addOption = this.canAddOption ? this.addOption : undefined;
		if (!addOption) return nothing;
		const label = this.addOptionLabel;
		return html`<button type="button" class="header-control add-option" data-ww-capture-selection="false"
			aria-label=${label} title=${label} @click=${addOption}>
			<sl-icon src=${PlusIcon} aria-hidden="true"></sl-icon>
			<span class="label">${label}</span>
		</button>`;
	}

	/**
	 * The controls of authors, at the end of the header line.
	 */
	private EditToolbar() {
		return html`<div class="edit-toolbar edit-only">
			${this.OptionAction()}${this.TypeSwitcher()}
		</div>`;
	}

	render(): TemplateResult {
		// The buttons come before the result, so that they stay in place when learners check the answer.
		return html`${this.editing ? html`<div class="card-background" aria-hidden="true"
			@mousedown=${(event: MouseEvent) => { if (event.button === 0) event.preventDefault(); }}></div>` : nothing}
		<div class="card" part="card" tabindex="-1">
			${this.QuizHeader()}
			<div class="task-prompt" part="prompt">
				<slot name="prompt" style=${styleMap({ "--ww-placeholder": `"${this.msg("Task/question")}"` })}></slot>${this.Hint()}
			</div>
			<div class="answer" part="answer">${this.renderAnswer()}</div>
			${this.TaskActions()}
			${this.RubricChecklist()}
			${this.Result()}
		</div>`;
	}
}

const ITEM_TAGS: Record<string, string> = {
	"webwriter-choice": "webwriter-choice-item",
	"webwriter-order": "webwriter-order-item",
};

/** Moves the options of a choice or order task into the items of the other kind. */
function transferItems(from: HTMLElement, to: HTMLElement) {
	const fromTag = ITEM_TAGS[from.localName];
	const toTag = ITEM_TAGS[to.localName];
	if (!fromTag || !toTag) return;
	const items = Array.from(from.children).filter(child => child.localName === fromTag && !child.slot);
	if (!items.length) return;
	const starterItems = Array.from(to.children).filter(child => child.localName === toTag && !child.slot);
	for (const item of starterItems) item.remove();
	const ids: string[] = [];
	for (const item of items) {
		const converted = to.ownerDocument.createElement(toTag);
		converted.id = item.id || "ww" + crypto.randomUUID();
		converted.append(...Array.from(item.childNodes));
		to.append(converted);
		ids.push(converted.id);
	}
	const remaining = starterItems.slice(items.length);
	to.append(...remaining);
	// The order as the author wrote it is the correct one; a choice starts without a correct option.
	if (toTag === "webwriter-order-item") to.setAttribute("solution", JSON.stringify([...ids, ...remaining.map(item => item.id)]));
	else to.removeAttribute("solution");
}

export interface WebwriterTask {
	checkAnswer?(detailedFeedback: boolean): number;
}
