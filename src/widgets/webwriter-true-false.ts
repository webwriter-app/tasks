import SlButtonGroup from "@shoelace-style/shoelace/dist/components/button-group/button-group.component.js";
import SlButton from "@shoelace-style/shoelace/dist/components/button/button.component.js";
import { registerQuizType } from "../model/quiz-api";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { name as packageId } from "../../package.json";
import TrueFalseIcon from "@tabler/icons/outline/checks.svg";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-true-false": WebwriterTrueFalse;
	}
}

type TrueFalse = "true" | "false";

registerQuizType({
	packageId,
	widgetPosition: 1,
	id: "webwriter-true-false",
	getName: (locale, translate = messageFor(locale)) => translate("True or False"),
	icon: TrueFalseIcon,
	createInstance: () => document.createElement("webwriter-true-false"),
})

/**
 * An answer where learners decide whether a statement is true or false.
 */
@customElement("webwriter-true-false")
export class WebwriterTrueFalse extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		sl-button:disabled::part(base) {
			opacity: 1 !important;
			cursor: default !important;
		}
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"sl-button": SlButton,
		"sl-button-group": SlButtonGroup,
	};

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
		if (this.editing) this.solution = value ?? "true";
		else this.currentAnswer = value;
	}

	private Button(choice: TrueFalse, label: string) {
		const graded = this.graded && !this.editing;
		let variant = "default";
		if (this.selected === choice) {
			if (graded && this.showFeedback) {
				variant = this.solution === choice ? "success" : "danger";
			} else {
				variant = "primary";
			}
		}

		return html`<sl-button
			variant=${variant}
			@click=${() => (this.selected = choice)}
			?disabled=${graded}
		>
			${label}
		</sl-button>`;
	}

	protected renderAnswer() {
		return html`<sl-button-group>
			${this.Button("true", this.msg("True"))} ${this.Button("false", this.msg("False"))}
		</sl-button-group>`;
	}
}
