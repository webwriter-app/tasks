import { css, type ReactiveController, type ReactiveControllerHost } from "lit";

/**
 * Controls that only authors see show while the card is active: hovered, focused, selected, or
 * with the selection in its content. Hidden, they keep their room, so nothing moves when they show.
 */
export const editOnlyStyles = css`
	.edit-only {
		opacity: 0;
		visibility: hidden;
		transition:
			var(--sl-transition-fast) opacity,
			var(--sl-transition-fast) visibility;
	}

	:host(:hover) .edit-only,
	:host(:focus-within) .edit-only {
		opacity: var(--edit-control-opacity, 1);
		visibility: visible;
	}

	/* In rules of their own, so that a browser without custom states keeps the rules above. */
	:host(:state(selection-within)) .edit-only {
		opacity: var(--edit-control-opacity, 1);
		visibility: visible;
	}

	:host(:state(ww-element-selected)) .edit-only {
		opacity: var(--edit-control-opacity, 1);
		visibility: visible;
	}

	.edit-only.vacant {
		--edit-control-opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.edit-only {
			transition: none;
		}
	}
`;

/**
 * The states a card shows its edit controls by. The editor sets `ww-element-selected` on the
 * states while it selects the card (see `selectionStates`); this controller sets
 * `selection-within` while the document selection is in the card's content, such as the caret in
 * its prompt. Hover and focus inside the card need no state: CSS sees them on the host.
 */
export class CardActivity implements ReactiveController {
	#host: ReactiveControllerHost & HTMLElement;
	#internals: ElementInternals;

	constructor(host: ReactiveControllerHost & HTMLElement) {
		this.#host = host;
		this.#internals = host.attachInternals();
		host.addController(this);
	}

	/** The custom states of the card, shared with the editor. */
	get states() {
		return this.#internals.states;
	}

	hostConnected() {
		this.#host.ownerDocument.addEventListener("selectionchange", this.#update);
		this.#update();
	}

	hostDisconnected() {
		this.#host.ownerDocument.removeEventListener("selectionchange", this.#update);
		this.states.delete("selection-within");
	}

	#update = () => {
		const selection = this.#host.ownerDocument.getSelection();
		const within = !!selection?.rangeCount && [selection.anchorNode, selection.focusNode].some(node => node && this.#host.contains(node));
		if (within) this.states.add("selection-within");
		else this.states.delete("selection-within");
	};
}
