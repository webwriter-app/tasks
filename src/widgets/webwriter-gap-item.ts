import type { Declared, OptionDeclaration } from "@webwriter/lit";
import type { PropertyValues } from "lit";
import type { MsgFn } from "@lit/localize";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.component.js";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import CheckIcon from "@tabler/icons/outline/check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { transaction } from "@webwriter/widget/transaction";
import type { GapMode } from "./webwriter-gap";
import { QuizElement } from "../components/localization";
import { gapChoices, gapChoicesAttribute, GapChoicesEditor } from "../components/gap-choices";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-gap-item": WebwriterGapItem;
	}
}

/**
 * A single gap of a `<webwriter-gap>`, whose content is the correct answer.
 *
 * It must be placed inside the text assigned to the default slot of its parent
 * element.
 */
@customElement("webwriter-gap-item")
export class WebwriterGapItem extends QuizElement {
	static styles = css`
		:host {
			--outer-line-height: 2;
			--inner-line-height: 1.6;
			--inner-height: calc(var(--inner-line-height) * 1em);
			--empty-gap-width: 8em;
			display: inline-block !important;
			margin-inline: 2px;
			outline: none !important;
			vertical-align: baseline;
		}

		/* The box of a gap, with a learner's answer or the correction, cannot be selected; the authored answer can. */
		.container-base {
			-webkit-user-select: none;
			user-select: none;
			height: var(--inner-height);
			line-height: var(--outer-line-height);
			box-sizing: border-box;
			border: 1px solid transparent;
			border-radius: var(--sl-border-radius-medium);
			display: flex;
			align-items: center;
		}

		.container-input {
			background-color: var(--sl-input-background-color);
			border-color: var(--sl-input-border-color);
			padding-left: var(--sl-spacing-x-small);
		}

		.container-select {
			background-color: var(--sl-input-background-color);
			border-color: var(--sl-input-border-color);
			padding: 0 var(--sl-spacing-x-small);
			font: inherit;
			color: inherit;
			line-height: normal;
			cursor: pointer;

			&:disabled {
				cursor: default;
				opacity: 0.9;
			}
		}

		.container-placeholder {
			background-color: var(--sl-color-neutral-100);
			position: relative;
			border-color: var(--sl-color-neutral-300);
			min-inline-size: var(--empty-gap-width);
			padding: 0 var(--sl-spacing-x-small);
			height: var(--inner-height);
			white-space: nowrap;
			font: inherit;
			color: inherit;
			justify-content: center;
			cursor: pointer;
			touch-action: none;
			user-select: none;
		}

		.container-placeholder::before {
			content: "";
			position: absolute;
			inset: -4px;
			border: 2px dotted var(--ww-theme-accent-1, var(--sl-color-primary-400));
			border-radius: calc(var(--sl-border-radius-medium) + 3px);
			pointer-events: none;
			opacity: 0;
			transition: opacity var(--sl-transition-fast);
			z-index: 2;
		}

		.container-placeholder.active::before {
			opacity: 1;
		}

		@media (prefers-reduced-motion: reduce) {
			.container-placeholder::before { transition: none; }
		}

		.container-placeholder.filled {
			background-color: var(--sl-color-neutral-0);
			min-inline-size: 0;
			width: max-content;
			cursor: grab;
		}

		/*
		 * In edit mode, a gap is the box learners see: an input of the answer's size, or a filled
		 * placeholder. An internal text input mirrors the light-DOM answer so native focus, caret,
		 * and selection never collide with editor capture selection.
		 */
		.edit {
			position: relative;
			padding: 0;
			color: var(--sl-color-success-700);
		}

		.edit-input {
			flex: 1;
			inline-size: 100%;
			block-size: 100%;
			min-inline-size: 0;
			box-sizing: border-box;
			padding: 0 var(--sl-spacing-x-small);
			margin: 0;
			border: 0;
			outline: none;
			background: transparent;
			font: inherit;
			color: inherit;
			line-height: normal;
			letter-spacing: inherit;
			text-align: inherit;
			-webkit-user-select: text;
			user-select: text;
		}

		.edit.container-input {
			box-sizing: border-box;
			border-radius: var(--sl-input-border-radius-medium);
		}

		.edit.container-placeholder {
			inline-size: var(--empty-gap-width);
			justify-content: center;
		}

		.edit.container-placeholder .edit-input {
			text-align: center;
		}

		.remove-gap {
			position: absolute;
			inset-block-start: 0;
			inset-inline-end: 0;
			translate: 40% -40%;
			z-index: 1;
			border-radius: var(--sl-border-radius-circle);
			background: var(--sl-color-neutral-0);
			font-size: var(--sl-font-size-x-small);
			opacity: 0;
			pointer-events: none;
			-webkit-user-select: none;
			user-select: none;
		}

		.remove-gap::part(base) {
			padding: var(--sl-spacing-3x-small);
		}

		:host(:hover) .remove-gap,
		:host(:focus-within) .remove-gap {
			opacity: 1;
			pointer-events: auto;
		}

		@media (hover: none) {
			.remove-gap {
				opacity: 1;
				pointer-events: auto;
			}
		}

		.feedback {
			padding: 0 var(--sl-spacing-x-small);
			gap: var(--sl-spacing-x-small);
			width: max-content;
		}

		.feedback.correct {
			color: var(--sl-color-success-700);
			background: var(--sl-color-success-50);
			border-color: var(--sl-color-success-600);
		}

		.feedback.incorrect {
			color: var(--sl-color-danger-700);
			background: var(--sl-color-danger-50);
			border-color: var(--sl-color-danger-600);
		}

		.correction { color: var(--sl-color-success-700); }

		/* A gap is about as wide as its answer, so the sentence still reads as one. */
		sl-input {
			max-inline-size: 100%;

			&::part(form-control),
			&::part(form-control-input),
			&::part(base) {
				inline-size: 100%;
			}

			&::part(input) {
				min-inline-size: 0;
				inline-size: 100%;
			}
		}
		.container-placeholder:disabled { cursor: default; }

		sl-input {
			--sl-input-height-medium: var(--inner-height);
			line-height: var(--inner-line-height);
			font: inherit;

			&::part(form-control),
			&::part(form-control-input),
			&::part(base) {
				display: flex;
				align-items: baseline;
			}

			&::part(input),
			&::part(base) {
				font: inherit;
				color: inherit;
			}

			&::part(input) {
				padding: 0 var(--sl-spacing-x-small);
				/* The base paints the rounded background; this control must not cover it. */
				background: transparent;
			}

			&::part(base) {
				vertical-align: baseline;
				overflow: visible;
				letter-spacing: inherit;
			}
		}
	`;

	/** @internal */
	static scopedElements = {
		"sl-icon": SlIcon,
		"sl-icon-button": SlIconButton,
		// Shoelace's autocorrect type predates the boolean HTMLElement property.
		"sl-input": SlInput as unknown as CustomElementConstructor,
		"gap-choices-editor": GapChoicesEditor,
	};

	static options: Record<string, Declared<OptionDeclaration>> = {
		placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") },
	};

	/** Authors can set a placeholder for a typed answer. */
	get options() {
		return this.declarationsWithout("options", this.mode === "input" ? [] : ["placeholder"]);
	}

	/**
	 * Mirrors the mode of the parent gap, which keeps it in sync.
	 * @internal
	 */
	@property({ attribute: false })
	accessor mode: GapMode | undefined = undefined;

	/** @internal */
	@state() accessor answer = "";
	/** @internal */
	@state() accessor inputAnswer = "";
	/** @internal */
	@state() accessor dropdownOptions: string[] = [];
	/** @internal */
	@state() accessor graded = false;
	/** @internal */
	@state() accessor feedback: { correct: boolean; answer: string; solution: string } | null = null;
	/** @internal */
	@state() accessor answerSelected = false;
	/** @internal */
	@state() accessor dropActive = false;
	@state() private accessor editValue = "";

	private textObserver?: MutationObserver;
	private pendingFocus?: "start" | "end" | "all";

	/**
	 * The placeholder shown while the gap is empty. Only applies in `input` mode.
	 */
	@property({ type: String, attribute: "placeholder", reflect: true, useDefault: true })
	accessor placeholder: string = "";

	/**
	 * Legacy `|`-separated alternatives, used until this gap has its own saved choices.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor distractors: string = "";

	override connectedCallback() {
		super.connectedCallback();
		this.syncEditValue();
		this.textObserver = new MutationObserver(records => {
			this.syncEditValue();
			if (records.some(record => record.type === "attributes")) this.requestUpdate();
		});
		this.textObserver.observe(this, {
			characterData: true, childList: true, subtree: true, attributeFilter: [gapChoicesAttribute, "distractors"],
		});
	}

	override disconnectedCallback() {
		this.textObserver?.disconnect();
		this.textObserver = undefined;
		this.pendingFocus = undefined;
		super.disconnectedCallback();
	}

	protected override updated(changed: PropertyValues) {
		super.updated(changed);
		if (this.pendingFocus && this.editing) {
			const mode = this.pendingFocus;
			if (this.applyFocusEdit(mode)) this.pendingFocus = undefined;
		}
	}

	private syncEditValue() {
		const value = this.textContent ?? "";
		if (this.editValue !== value) this.editValue = value;
	}

	/** Focuses the internal edit input and places or selects its range. */
	focusEdit(selection: "start" | "end" | "all" = "end") {
		if (this.editing && this.applyFocusEdit(selection)) {
			this.pendingFocus = undefined;
			return;
		}
		this.pendingFocus = selection;
		void this.updateComplete;
	}

	private applyFocusEdit(selection: "start" | "end" | "all"): boolean {
		const input = this.shadowRoot?.querySelector<HTMLInputElement>("input.edit-input");
		if (!input) return false;
		input.focus({ preventScroll: true });
		if (selection === "all") {
			input.select();
		} else {
			const pos = selection === "start" ? 0 : input.value.length;
			input.setSelectionRange(pos, pos);
		}
		return true;
	}

	private focusEditableHost(fallbackParent: ParentNode | null) {
		const target = this.ownerDocument.body?.isContentEditable
			? this.ownerDocument.body
			: (fallbackParent instanceof Element ? fallbackParent.closest<HTMLElement>("[contenteditable]") : null)
				?? this.ownerDocument.body;
		target?.focus({ preventScroll: true });
	}

	/** Leaves the internal input cleanly and places the document caret before or after this gap. */
	private placeCaretOutside(side: "before" | "after") {
		const active = this.shadowRoot?.activeElement;
		if (active instanceof HTMLElement) active.blur();
		this.focusEditableHost(this.parentNode);
		const selection = this.ownerDocument.getSelection();
		if (!selection || !this.parentNode) return;
		const range = this.ownerDocument.createRange();
		if (side === "before") {
			if (this.previousSibling instanceof Text) {
				range.setStart(this.previousSibling, this.previousSibling.data.length);
			} else {
				range.setStartBefore(this);
			}
		} else if (this.nextSibling instanceof Text) {
			range.setStart(this.nextSibling, 0);
		} else {
			range.setStartAfter(this);
		}
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	/** The width of an input gap: about as wide as its answer or placeholder. */
	private get inputLength() {
		return Math.max(this.editValue.trim().length || (this.textContent?.trim().length ?? 0), this.placeholder.length, 3) + 1;
	}

	private handleEditInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		this.editValue = value;
		if (this.childNodes.length === 1 && this.firstChild instanceof Text) {
			this.firstChild.data = value;
		} else {
			this.textContent = value;
		}
	}

	private handleEditKeyDown = (event: KeyboardEvent) => {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		const start = input.selectionStart ?? 0;
		const end = input.selectionEnd ?? 0;

		if (event.key === "Backspace") {
			const wouldEmpty = value.length === 0
				|| (start === 0 && end === value.length)
				|| (!event.ctrlKey && !event.altKey && !event.metaKey && start === end && start === 1 && value.length === 1)
				|| (event.metaKey && !event.ctrlKey && !event.altKey && end === value.length);
			if (!wouldEmpty) return;

			event.preventDefault();
			event.stopPropagation();
			const previous = this.previousSibling;
			const next = this.nextSibling;
			const parent = this.parentNode;
			const index = parent ? Array.from(parent.childNodes).indexOf(this) : -1;
			transaction(this, () => this.remove());
			this.focusEditableHost(parent);
			const selection = this.ownerDocument.getSelection();
			if (!selection) return;
			const range = this.ownerDocument.createRange();
			if (previous instanceof Text && previous.isConnected) {
				range.setStart(previous, previous.data.length);
			} else if (next instanceof Text && next.isConnected) {
				range.setStart(next, 0);
			} else if (parent?.isConnected && index >= 0) {
				range.setStart(parent, Math.min(index, parent.childNodes.length));
			} else {
				return;
			}
			range.collapse(true);
			selection.removeAllRanges();
			selection.addRange(range);
			return;
		}

		if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

		if (event.key === "ArrowLeft" && start === 0 && end === 0) {
			event.preventDefault();
			event.stopPropagation();
			this.placeCaretOutside("before");
		} else if (event.key === "ArrowRight" && start === value.length && end === value.length) {
			event.preventDefault();
			event.stopPropagation();
			this.placeCaretOutside("after");
		}
	};

	private renderEditable() {
		const drag = this.mode === "drag-and-drop";
		return html`<div
			class="container-base edit ${drag ? "container-placeholder filled" : "container-input"}"
			data-ww-capture-selection="false"
			style=${drag ? "" : `inline-size: calc(${this.inputLength}ch + 3em)`}
		>
			<input
				type="text"
				class="edit-input"
				data-ww-capture-selection="false"
				aria-label=${this.msg("Gap")}
				placeholder=${drag ? "" : this.placeholder}
				.value=${this.editValue}
				size=${Math.max(this.editValue.length, 3)}
				@input=${this.handleEditInput}
				@keydown=${this.handleEditKeyDown}
			/>
			<gap-choices-editor .gap=${this} .solutions=${[this.editValue.trim()]}
				.alternatives=${gapChoices(this) ?? []} .message=${this.msg}></gap-choices-editor>
			<sl-icon-button
				class="remove-gap"
				data-ww-capture-selection="false"
				label=${this.msg("Remove gap")}
				src=${XIcon}
				@mousedown=${(event: MouseEvent) => event.preventDefault()}
				@click=${(event: MouseEvent) => {
					event.stopPropagation();
					const nodes = Array.from(this.childNodes);
					transaction(this, () => this.replaceWith(...nodes));
					const selection = this.ownerDocument.getSelection();
					if (selection && nodes.length) {
						const range = this.ownerDocument.createRange();
						range.setStartAfter(nodes[nodes.length - 1]);
						range.collapse(true);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				}}
			></sl-icon-button>
		</div>`;
	}

	private renderInput() {
		return html`<sl-input style=${`inline-size: calc(${this.inputLength}ch + 3em)`} placeholder=${this.placeholder} .value=${this.inputAnswer} ?disabled=${this.graded}
			@sl-input=${(event: Event) => {
				this.inputAnswer = (event.target as SlInput).value;
			}}
		></sl-input>`;
	}

	private renderDropdown() {
		const selected = this.dropdownOptions.includes(this.inputAnswer) ? this.inputAnswer : "";
		return html`<select
			class="container-base container-select"
			aria-label=${this.msg("Gap")}
			?disabled=${this.graded}
			.value=${live(selected)}
			@change=${(event: Event) => {
				this.inputAnswer = (event.target as HTMLSelectElement).value;
			}}
		>
			<option value="">—</option>
			${this.dropdownOptions.map(option => html`<option value=${option} ?selected=${selected === option}>${option}</option>`)}
		</select>`;
	}

	private renderDragAndDrop() {
		return html`<button
			type="button"
			?disabled=${this.graded}
			class="container-base container-placeholder ${this.dropActive ? "active" : ""} ${this.answer ? "filled" : ""}"
			aria-label=${this.answer || this.msg("Empty gap")}
			aria-pressed=${this.answerSelected}
			@pointerdown=${(event: PointerEvent) => this.closest("webwriter-gap")?.startGapDrag(event, this)}
			@click=${() => this.closest("webwriter-gap")?.activateGap(this)}
		>
			${this.answer || "\u00a0"}
		</button>`;
	}

	render() {
		if (this.editing) return this.renderEditable();
		if (this.feedback) {
			const { correct, answer, solution } = this.feedback;
			return html`<span class="container-base feedback ${correct ? "correct" : "incorrect"}" role="status">
				${correct ? html`<sl-icon src=${CheckIcon} label=${this.msg("Correct")}></sl-icon>${answer}` : html`
					<del aria-label=${this.msg("Your answer")}>${answer || this.msg("No answer")}</del>
					<span class="correction" aria-label=${this.msg("Solution")}>${solution}</span>
				`}
			</span>`;
		}
		if (this.mode === "input") return this.renderInput();
		if (this.mode === "dropdown") return this.renderDropdown();
		if (this.mode === "drag-and-drop") return this.renderDragAndDrop();

		// An item that is not in a gap yet has no mode, and renders nothing until it is.
		if (this.mode !== undefined) console.warn("[webwriter-gap-item] Unknown mode:", this.mode);
		return nothing;
	}
}
