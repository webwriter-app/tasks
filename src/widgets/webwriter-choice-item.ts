import type { Declared, OptionDeclaration } from "@webwriter/lit";
import type { MsgFn } from "@lit/localize";
import SlIcon from "@shoelace-style/shoelace/dist/components/icon/icon.component.js";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import CheckIcon from "@tabler/icons/outline/check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import type { WebwriterChoice } from "./webwriter-choice";
import { QuizElement } from "../components/localization";
import { hasNonTextContent, itemContentStyles } from "../components/item-content";
import { solutionControlStyles } from "../components/solution-control-styles";

/**
 * A single option of a `<webwriter-choice>`.
 *
 * It must be assigned to the default slot of its parent element. Options have no hints of their
 * own; a hint on an option from an earlier version stays in the markup but is not shown.
 */
@customElement("webwriter-choice-item")
export class WebwriterChoiceItem extends QuizElement {
	static styles = [
		itemContentStyles,
		solutionControlStyles,
		css`
			.marker {
				/* Mimics the appearance of Shoelace's checkbox and radio inputs as closely as possible */
				width: 1.125em;
				height: 1.125em;
				box-sizing: border-box;

				padding: 0;
				display: grid;
				place-items: center;

				font: inherit;
				border: solid var(--sl-input-border-width) var(--color-border);
				color: var(--sl-color-neutral-0);
				background-color: var(--color-marker);
				transition:
					var(--sl-transition-fast) border-color,
					var(--sl-transition-fast) background-color;
				cursor: inherit;

				&:focus-visible {
					outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
					outline-offset: var(--sl-focus-ring-offset);
				}

				.mode-single & {
					border-radius: var(--sl-border-radius-circle);
				}

				.mode-multiple & {
					border-radius: var(--sl-border-radius-small);
				}
			}

			/* The marker and the tags cannot be selected; the authored text of the option can. */
			.choice-item {
				display: flex;
				gap: var(--sl-spacing-small);
				box-sizing: border-box;
				align-items: center;
				padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
				border: 1px var(--row-style, solid) var(--color-row);
				border-radius: var(--sl-border-radius-medium);
				background-color: var(--color-background);
				transition:
					var(--sl-transition-fast) border-color,
					var(--sl-transition-fast) background-color;
				-webkit-user-select: none;
				user-select: none;
				--color-border: var(--sl-input-border-color);
				--color-marker: var(--sl-input-background-color);
				--color-background: var(--sl-color-neutral-0);
				--color-row: var(--sl-color-neutral-300);
				--color-tag: var(--sl-color-neutral-700);

				&.selected {
					--color-border: var(--ww-theme-accent-1, var(--sl-color-primary-600));
					--color-marker: var(--ww-theme-accent-1, var(--sl-color-primary-600));
					--color-background: var(--sl-color-primary-50);
					--color-row: var(--color-border);
				}

				/* The answer key as authors see it: green, not the learner's selection color. */
				&.key {
					--color-border: var(--sl-color-success-600);
					--color-marker: var(--sl-color-success-600);
					--color-background: var(--sl-color-success-50);
					--color-row: var(--sl-color-success-600);
					--color-tag: var(--sl-color-success-700);
				}

				&.feedback {
					&.correct.selected {
						--color-border: var(--sl-color-success-600);
						--color-marker: var(--sl-color-success-600);
						--color-background: var(--sl-color-success-50);
						--color-row: var(--sl-color-success-600);
						--color-tag: var(--sl-color-success-700);
					}

					&:not(.correct):not(.selected) {
						--color-border: var(--sl-color-warning-600);
						--color-marker: var(--sl-color-warning-50);
						--color-background: var(--sl-color-warning-50);
						--color-row: var(--sl-color-warning-600);
						--color-tag: var(--sl-color-warning-800);
						--row-style: dashed;

						.marker sl-icon {
							display: none;
						}
					}

					&:not(.correct).selected {
						--color-border: var(--sl-color-danger-600);
						--color-marker: var(--sl-color-danger-600);
						--color-background: var(--sl-color-danger-50);
						--color-row: var(--sl-color-danger-600);
						--color-tag: var(--sl-color-danger-700);
					}
				}
			}

			.content-row {
				display: flex;
				align-items: flex-start;
				gap: var(--sl-spacing-x-small);

				slot:not([name]) {
					flex: 1;
					min-width: 0;
				}
			}

			slot:not([name])::slotted(:first-child) {
				margin-block-start: 0;
			}

			slot:not([name])::slotted(:last-child) {
				margin-block-end: 0;
			}

			.visually-hidden {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				overflow: hidden;
				clip-path: inset(50%);
				white-space: nowrap;
			}

			.tag {
				flex: none;
				display: inline-flex;
				align-items: center;
				gap: 0.25em;
				color: var(--color-tag);
				font-size: var(--sl-font-size-small);
				font-weight: var(--sl-font-weight-semibold);
				white-space: nowrap;
			}

			.active .marker-container,
			:host(:not([contenteditable="true"]):not([contenteditable=""])) .active {
				cursor: pointer;
			}

			/* Hovering an option that is not chosen previews the choice; a chosen option keeps its fill. */
			.active:not(.selected, .key) .marker-container:hover,
			:host(:not([contenteditable="true"]):not([contenteditable=""])) .active:not(.selected, .key):hover {
				--color-border: var(--sl-input-border-color-hover);
				--color-marker: var(--sl-input-background-color-hover);
				--color-row: var(--sl-color-neutral-400);
			}

			.active.selected .marker-container:hover,
			:host(:not([contenteditable="true"]):not([contenteditable=""])) .active.selected:hover {
				--color-border: var(--ww-theme-accent-1, var(--sl-color-primary-500));
				--color-marker: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			}

			.active.key .marker-container:hover {
				--color-border: var(--sl-color-success-700);
				--color-marker: var(--sl-color-success-700);
			}

			slot {
				display: block;
				-webkit-user-select: text;
				user-select: text;
			}

			.feedback-message {
				color: var(--sl-color-neutral-500);
				font-size: var(--sl-font-size-small);
			}

			@media print {
				.choice-item {
					break-inside: avoid;
				}
			}

			.marker-container {
				flex: none;
				height: 1lh;
				display: flex;
				align-items: center;
			}

			.content {
				flex: 1;
				min-width: 0;
			}

			.choice-item.non-text {
				padding: 0;
				gap: 0;
				.marker-container { margin-inline: var(--sl-spacing-x-small, 0.5rem); }
				.tag { margin-inline-end: var(--sl-spacing-x-small, 0.5rem); }
			}

		`,
	];

	/** @internal */
	static scopedElements = {
		"sl-icon": SlIcon,
	};

	static options: Record<string, Declared<OptionDeclaration>> = {
		feedbackSelected: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Feedback if selected") },
		feedbackNotSelected: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Feedback if not selected") },
	};

	/**
	 * The feedback shown after submitting if learners selected this option.
	 */
	@property({ type: String, attribute: "feedback-selected", reflect: true, useDefault: true })
	accessor feedbackSelected: string = "";

	/**
	 * The feedback shown after submitting if learners did not select this option.
	 */
	@property({ type: String, attribute: "feedback-not-selected", reflect: true, useDefault: true })
	accessor feedbackNotSelected: string = "";

	private dispatchSelectEvent() {
		/** @internal */
		this.dispatchEvent(new CustomEvent("select", { detail: { id: this.id }, bubbles: true }));
	}

	private handleClick(event: MouseEvent) {
		if (this.editing || event.defaultPrevented) return;
		for (const node of event.composedPath()) {
			if (node === this) break;
			if (node instanceof Element && this.contains(node) && (node.localName.includes("-") || node.hasAttribute("is")
				|| node.matches("a[href], audio[controls], button, input, label, select, summary, textarea, video[controls], [tabindex]"))) return;
		}
		this.dispatchSelectEvent();
	}

	connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener("click", this.handleClick);
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		this.removeEventListener("click", this.handleClick);
	}

	render() {
		const parent = this.parentElement as WebwriterChoice | null;
		if (!parent || typeof (parent as Partial<WebwriterChoice>).getChoiceState !== "function") {
			return html`<slot></slot>`;
		}
		const state = parent.getChoiceState(this.id);
		const multiple = parent.mode === "multiple";
		const key = this.editing && state.selected;

		let tag: unknown = nothing;
		if (state.showFeedback) {
			if (state.selected && state.correct) tag = html`<sl-icon src=${CheckIcon}></sl-icon>${this.msg("Correct")}`;
			else if (state.selected) tag = html`<sl-icon src=${XIcon}></sl-icon>${multiple ? this.msg("Wrong") : this.msg("Your answer")}`;
			else if (!state.correct) tag = multiple ? this.msg("Missed") : this.msg("Solution");
		} else if (key) {
			tag = html`<sl-icon src=${CheckIcon}></sl-icon>${this.msg("Solution")}`;
		}

		return html`
			<div
				class=${classMap({
					"choice-item": true,
					"non-text": hasNonTextContent(this),
					[`mode-${parent.mode}`]: true,
					selected: state.selected && !key,
					key,
					active: !state.disabled,
					feedback: state.showFeedback,
					correct: state.showFeedback && state.correct,
				})}
			>
				<div class=${state.unavailable ? "marker-container solution-unavailable" : "marker-container"}
					title=${state.unavailable ?? nothing} @click=${() => this.editing && !state.disabled && this.dispatchSelectEvent()}>
					<button
						type="button"
						role=${parent.mode === "multiple" ? "checkbox" : "radio"}
						aria-checked=${state.selected ? "true" : "false"}
						aria-labelledby="content"
						class=${classMap({
							marker: true,
							correct: state.correct,
						})}
						?disabled=${state.disabled}
						title=${state.unavailable ?? nothing}
					>
						<sl-icon library="system" name=${parent.mode === "multiple" ? "check" : "radio"}></sl-icon>
					</button>
				</div>

				<div class="content" id="content">
					<div class="content-row">
						<slot style="--ww-placeholder: '${"Option"}'" @slotchange=${() => this.requestUpdate()}></slot>
						${tag === nothing ? nothing : html`<span class=${key ? "visually-hidden" : "tag"}>${tag}</span>`}
					</div>
					${state.showFeedback
						? html`<div class="feedback-message">
								${state?.correct ? this.feedbackSelected : this.feedbackNotSelected}
							</div> `
						: nothing}
				</div>

			</div>
		`;
	}
}
