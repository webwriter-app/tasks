import { css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { QuizElement } from "../components/localization";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-quiz-feedback": WebwriterQuizFeedback;
	}
}

/** Formatted feedback authored in the feedback slot of a task. */
@customElement("webwriter-quiz-feedback")
export class WebwriterQuizFeedback extends QuizElement {
	static styles = css`
		:host {
			display: block;
		}

		::slotted(p) {
			min-block-size: 1lh;
		}

		::slotted(:first-child) {
			margin-block-start: 0;
		}

		::slotted(:last-child) {
			margin-block-end: 0;
		}
	`;

	render() {
		return html`<slot style=${styleMap({ "--ww-placeholder": `"${this.msg("Feedback")}"` })}></slot>`;
	}
}
