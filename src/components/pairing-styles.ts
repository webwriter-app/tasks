import { css } from "lit";
import { WebwriterTask } from "./webwriter-task";

export const pairingStyles = [WebwriterTask.styles, css`
	:host {
		display: block;
		--grid-gap: var(--sl-spacing-medium);
		--item-min-width: 120px;
		--pair-min-width: calc(var(--item-min-width) * 2 + 3px); /* incl. 2*border + divider */
		outline: none !important;
	}

	.pairs {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--pair-min-width), 100%), 1fr));
		gap: var(--grid-gap);
	}

	.pair {
		position: relative;

		.pair-content {
			display: grid;
			grid-template-columns: 1fr 1px 1fr;
			box-sizing: border-box;

			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background-color: var(--sl-color-neutral-0);
			overflow: hidden;
		}

		.actions {
			height: 1lh;
			display: flex;
			align-items: center;
			position: absolute;
			background: var(--sl-color-neutral-0);
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-border-radius-pill);
			top: 0;
			left: 50%;
			translate: -50% -50%;
			padding: 0 var(--sl-spacing-x-small);
			box-sizing: border-box;
			z-index: 100;

			opacity: 0;

			&:hover,
			&:focus-within,
			.pair:hover &,
			.pair:focus-within &,
			.pair[data-ww-dragging] & {
				opacity: 1;
			}

			/* Without a pointer that hovers, the controls would stay invisible. */
			@media (hover: none) {
				opacity: 1;
			}
		}
	}

	.divider {
		height: 100%;
		width: 100%;
		background-color: var(--sl-color-neutral-300);
	}

	#add-pair {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		position: relative;
		place-items: center;

		/* Match styling of Shoelace button */
		border: 1px dashed var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		box-sizing: border-box;
		color: var(--sl-color-neutral-500);
		cursor: pointer;
		&:hover {
			background-color: var(--sl-color-primary-50);
			border-color: var(--sl-color-primary-300);
			color: var(--sl-color-primary-700);
		}

		.label {
			position: absolute;
			display: flex;
			align-items: center;
			gap: 0.5rem;
			color: var(--sl-color-neutral-500);
		}

		.size-placeholder {
			aspect-ratio: 1 / 1;
			width: 100%;
		}
	}

	.pairing-container {
		display: grid;
		grid-template-columns: 1fr 1px 1fr;
		gap: var(--grid-gap);
	}

	.pairing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--item-min-width), 100%), 1fr));
		gap: var(--grid-gap);
	}

	.pairing-cell {
		aspect-ratio: 1 / 1;
		position: relative;
		border-radius: var(--sl-border-radius-medium);

		/* Ring marking the cell a drop would land in. */
		&::before {
			content: "";
			position: absolute;
			inset: -4px;
			border: 2px dashed var(--ww-theme-accent-1, var(--sl-color-primary-400));
			border-radius: calc(var(--sl-border-radius-medium) + 3px);
			pointer-events: none;
			opacity: 0;
			transition: var(--sl-transition-fast) opacity;
			z-index: 2;
		}

		&[data-ww-drop-over]::before {
			opacity: 1;
		}
	}

	.pairing-backdrop {
		position: absolute;
		inset: 0;
		background-color: var(--sl-color-neutral-50);
		border-radius: var(--sl-border-radius-medium);
		transition: var(--sl-transition-fast) background-color;

		[data-ww-drop-over] > & {
			background-color: var(--sl-color-primary-100);
		}
	}

	.pairing-card {
		/* All cards fill their cell exactly, so that dragging one never changes the layout. */
		position: absolute;
		inset: 0;
		box-sizing: border-box;

		border: 1px solid var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		background-color: var(--sl-color-neutral-0);
		overflow: hidden;
		user-select: none;

		transition:
			var(--sl-transition-fast) border-color,
			var(--sl-transition-fast) background-color,
			var(--sl-transition-fast) scale;

		/* Overlay to prevent any pointer events on the card itself, so that all interactions stay inside this shadow DOM */
		&::after {
			content: "";
			position: absolute;
			inset: 0;
		}

		&[data-ww-drag] {
			cursor: grab;
		}

		&[data-ww-drag]:hover {
			border-color: var(--sl-color-primary-300);
			background-color: var(--sl-color-primary-50);
		}

		&.correct {
			border-color: var(--sl-color-success-600);
			background-color: var(--sl-color-success-50);
		}

		&.incorrect {
			border-color: var(--sl-color-danger-600);
			background-color: var(--sl-color-danger-50);
		}

		&[data-ww-dragging] {
			z-index: 1000;
			pointer-events: none;
			cursor: grabbing;
			border-color: var(--sl-color-primary-400);
			background-color: var(--sl-color-primary-50);
			/* The dragged card scales via its transform, so that translating it stays a
			   1:1 match for the pointer movement. */
			scale: 1 !important;
		}
	}

	.pairing-index {
		position: absolute;
		top: 4px;
		right: 4px;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		min-width: 1.6em;
		height: 1.6em;
		padding: 0 0.3em;
		border-radius: var(--sl-border-radius-circle);
		background-color: var(--sl-color-neutral-100);
		line-height: 1;
		color: var(--sl-color-neutral-700);
		font-size: var(--sl-font-size-medium);
		font-weight: var(--sl-font-weight-semibold);
	}

	/* A cell holding an assignment shows both cards side by side at a reduced size. */
	.pairing-assigned {
		.pairing-card-normal {
			scale: 0.68;
			transform-origin: bottom right;
		}

		.pairing-card-assigned {
			scale: 0.68;
			transform-origin: top left;
		}

		/* While its partner is dragged away, the remaining card takes the cell back. */
		&:has(.pairing-card-assigned[data-ww-dragging]) .pairing-card-normal {
			scale: 1;
		}
	}

	.memory-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(var(--item-min-width), 100%), 1fr));
		gap: var(--grid-gap);
	}

	.memory-card {
		min-width: 0;
		padding: 0;
		border: 0;
		aspect-ratio: 1 / 1;
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
		perspective: 800px;
		transition: opacity 160ms ease;

		&:focus-visible {
			outline: var(--sl-focus-ring-width) solid var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
			border-radius: var(--sl-border-radius-medium);
		}

		&.matched {
			opacity: 0.55;
		}

		&:disabled {
			cursor: default;
		}

		&.flipped .memory-card-inner {
			transform: rotateY(180deg);
		}
	}

	.memory-card-inner {
		position: relative;
		display: block;
		width: 100%;
		height: 100%;
		transition: transform 300ms ease;
		transform-style: preserve-3d;
	}

	.memory-card-face {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		border: 1px solid var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		overflow: hidden;
		background: var(--sl-color-neutral-0);
		backface-visibility: hidden;
	}

	.memory-card-back {
		border: 0;
		background: var(--sl-color-primary-600);
		color: var(--sl-color-neutral-0);
		font-size: calc(var(--item-min-width) / 3);
		font-weight: var(--sl-font-weight-bold);
	}

	.memory-card-front {
		transform: rotateY(180deg);

		slot {
			width: 100%;
			height: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.memory-card-inner {
			transition-duration: 0ms;
		}
	}

	#add-pair:focus-visible {
		outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
		outline-offset: var(--sl-focus-ring-offset);
	}

	@media print {
		.pair .actions,
		#add-pair {
			display: none;
		}

		.memory-grid {
			display: none;
		}

		.pairing-card {
			break-inside: avoid;
		}
	}
`];
