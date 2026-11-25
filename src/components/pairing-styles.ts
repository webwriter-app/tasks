import { css } from "lit";
import { WebwriterTask } from "./webwriter-task";

export const pairingStyles = [WebwriterTask.styles, css`
	.task-helper {
		margin-block-end: var(--sl-spacing-x-small);
	}

	.task-helper:has(> .task-helper-switches) {
		margin-block-end: var(--sl-spacing-medium);
	}

	.pair-control-short { display: none; user-select: none; }

	@container (inline-size <= 40rem) {
		.pair-control-full {
			position: absolute;
			inline-size: 1px;
			block-size: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}

		.pair-control-short { display: inline; }
	}

	@container (inline-size <= 20rem) {
		.pair-add-item > .pair-control-short { display: none; }
	}

	@container (inline-size <= 14rem) {
		.multiple-connections > .pair-control-short { display: none; }
	}

	.pair-board {
		position: relative;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: clamp(0.75rem, 8cqi, 3.5rem);
	}

	.pair-column {
		display: contents;
	}

	.pair-lines {
		position: absolute;
		z-index: 1;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
		pointer-events: none;

		line {
			stroke: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			stroke-width: 2;
			stroke-linecap: round;
		}
		line[data-unrelated] { opacity: 0.35; }

		.correct { stroke: var(--sl-color-success-700); }
		.wrong { stroke: var(--sl-color-danger-700); }
		.expected {
			stroke: var(--sl-color-success-700);
			stroke-dasharray: 4 4;
		}

		.connection-preview { visibility: hidden; }
	}
`];
