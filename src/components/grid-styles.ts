import { css } from "lit";
import { WebwriterTask } from "./webwriter-task";

export const gridCardStyles = css`
	.grid-card {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--sl-spacing-2x-small);
		min-width: 0;
		max-width: 100%;
		padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
		box-sizing: border-box;
		border: 1px solid var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		background-color: var(--sl-color-neutral-0);
		user-select: none;
		transition:
			var(--sl-transition-fast) border-color,
			var(--sl-transition-fast) background-color;

		&::after {
			content: "";
			position: absolute;
			inset: 0;
		}

		&.key {
			-webkit-user-select: text;
			user-select: text;
			cursor: text;

			&::after {
				display: none;
			}
		}

		&.correct {
			border-color: var(--sl-color-success-600);
			background-color: var(--sl-color-success-50);
		}

		&.wrong {
			border-color: var(--sl-color-danger-600);
			background-color: var(--sl-color-danger-50);
		}

		&.missed {
			border-color: var(--sl-color-warning-600);
			background-color: var(--sl-color-warning-50);
			border-style: dashed;
		}

		&.counterpart-hovered {
			outline: 1px solid var(--sl-color-primary-400);
		}

		&.dimmed:not(:hover, :focus-visible, :has(:focus-visible), .counterpart-hovered, [aria-pressed="true"], [data-ww-dragging]) {
			opacity: 0.55;
		}

		&[data-ww-drag]:not(.key) {
			cursor: grab;
		}

		&[data-ww-drag]:hover {
			border-color: var(--sl-color-primary-300);
			background-color: var(--sl-color-primary-50);
		}

		&[data-ww-dragging] {
			z-index: 1000;
			pointer-events: none;
			cursor: grabbing;
			border-color: var(--sl-color-primary-400);
			background-color: var(--sl-color-primary-50);
		}

		slot {
			flex: 1 1 auto;
			min-width: 0;
		}
	}

	:host(:state(selection-within)) .grid-card.dimmed,
	:host(:state(ww-element-selected)) .grid-card.dimmed { opacity: 1; }

	.grid-card:not(.key) slot {
		-webkit-user-select: none;
		user-select: none;
	}

	.drag-handle {
		flex: none;
		color: var(--sl-color-neutral-500);
		cursor: grab;
		touch-action: none;
	}

	.drag-handle::part(base) {
		padding: var(--sl-spacing-3x-small);
	}

	button.drag-handle {
		position: relative;
		z-index: 1;
		display: inline-grid;
		place-items: center;
		padding: var(--sl-spacing-3x-small, 0.125rem);
		border: 0;
		border-radius: var(--sl-border-radius-small);
		background: transparent;
		font: inherit;

		&:hover { color: var(--sl-color-neutral-700); }
		sl-icon { pointer-events: none; }
	}

	.correction {
		display: block;
		margin-top: var(--sl-spacing-3x-small);
		color: var(--sl-color-success-700);
		font-size: var(--sl-font-size-x-small);
		font-weight: var(--sl-font-weight-semibold);
	}

`;

export const gridPoolStyles = css`
	.grid-pool {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--sl-spacing-x-small);
		min-height: 2.75rem;
		margin-top: var(--sl-spacing-small);
		padding: var(--sl-spacing-x-small);
		box-sizing: border-box;
		border: 1px dashed transparent;
		border-radius: var(--sl-border-radius-medium);
		background: var(--sl-color-neutral-50);
		transition: var(--sl-transition-fast) background-color, var(--sl-transition-fast) border-color;

		&[data-ww-drop-over] {
			border-color: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			background-color: var(--sl-color-primary-50);
		}
	}

	.pool-label {
		margin-inline-end: var(--sl-spacing-2x-small);
		color: var(--sl-color-neutral-600);
		font-size: var(--sl-font-size-small);
		font-weight: var(--sl-font-weight-semibold);
	}

	.slot-placeholder {
		color: var(--sl-color-neutral-500);
		font-size: var(--sl-font-size-x-small);
	}
`;

export const gridStyles = [WebwriterTask.styles, gridCardStyles, gridPoolStyles, css`
	:host {
		display: block;
		outline: none !important;
	}

	.helper {
		margin: 0 0 var(--sl-spacing-x-small);
		color: var(--sl-color-neutral-600);
		font-size: var(--sl-font-size-small);
	}

	.grid-wrap {
		overflow-x: auto;
		max-width: 100%;
		border: 1px solid var(--sl-color-neutral-200);
		border-radius: var(--sl-border-radius-medium);
		background: var(--sl-color-neutral-0);
	}

	table.grid {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--sl-font-size-small);
	}

	table.grid th,
	table.grid td {
		border: 1px solid var(--sl-color-neutral-200);
		padding: var(--sl-spacing-x-small) var(--sl-spacing-small);
		vertical-align: middle;
		min-width: 5.5rem;
	}

	table.grid tr:first-child > * {
		border-top: 0;
	}

	table.grid tr:last-child > * {
		border-bottom: 0;
	}

	table.grid tr > *:first-child {
		border-left: 0;
	}

	table.grid tr > *:last-child {
		border-right: 0;
	}

	table.grid th {
		background: var(--sl-color-neutral-50);
		font-weight: var(--sl-font-weight-semibold);
		text-align: start;
	}

	table.grid th.corner {
		min-width: 1.5rem;
	}

	table.grid th.col-header {
		text-align: center;
		--grid-item-align: center;
	}

	.header-cell {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sl-spacing-2x-small);
		min-width: 0;
	}

	.col-header .header-cell {
		justify-content: center;
	}

	.header-cell slot {
		flex: 1 1 auto;
		min-width: 0;
	}

	.remove-btn {
		flex: none;
		color: var(--sl-color-neutral-500);
		opacity: 0;
		transition: var(--sl-transition-fast) opacity, var(--sl-transition-fast) color;
	}

	.remove-btn::part(base) {
		padding: var(--sl-spacing-3x-small);
	}

	.remove-btn:hover {
		color: var(--sl-color-danger-600);
	}

	th:is(:hover, :focus-within) .remove-btn,
	.grid-card:is(:hover, :focus-within) .remove-btn {
		opacity: 1;
	}

	@media (hover: none) {
		.remove-btn {
			opacity: 1;
		}
	}

	.add-col-cell {
		width: 2.25rem;
		min-width: 2.25rem !important;
		padding: var(--sl-spacing-3x-small) !important;
		text-align: center !important;
		background: var(--sl-color-neutral-50);
	}

	.grid-footer-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sl-spacing-x-small);
		margin-top: var(--sl-spacing-x-small);
	}

	.add-inline-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--sl-spacing-2x-small);
		padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
		border: 1px dashed var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		background: transparent;
		color: var(--sl-color-neutral-700);
		font: inherit;
		font-size: var(--sl-font-size-x-small);
		font-weight: var(--sl-font-weight-semibold);
		cursor: pointer;
		transition: var(--sl-transition-fast) border-color, var(--sl-transition-fast) background-color, var(--sl-transition-fast) color;

		&:hover {
			border-color: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			background: var(--sl-color-primary-50);
			color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
		}

		&:focus-visible {
			outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
			outline-offset: var(--sl-focus-ring-offset);
		}
	}

	/* Choice & gap & sort grading states */
	.cell-correct,
	.cell-key {
		background: var(--sl-color-success-50);
	}

	.cell-wrong {
		background: var(--sl-color-danger-50);
	}

	.cell-missed {
		background: var(--sl-color-warning-50);
	}

	.drop-zone {
		display: flex;
		flex-direction: column;
		gap: var(--sl-spacing-2x-small);
		min-height: 2.5rem;
		padding: var(--sl-spacing-2x-small);
		box-sizing: border-box;
		border: 1px dashed var(--sl-color-neutral-300);
		border-radius: var(--sl-border-radius-medium);
		transition: var(--sl-transition-fast) border-color, var(--sl-transition-fast) background-color;

		&.filled {
			border-color: transparent;
		}

		&[data-ww-drop-over] {
			border-color: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			background-color: var(--sl-color-primary-50);
		}
	}
`];
