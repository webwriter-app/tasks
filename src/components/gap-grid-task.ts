import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import InputCursorIcon from "@tabler/icons/outline/cursor-text.svg";
import PlusIcon from "@tabler/icons/outline/plus.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues, type CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import {
	assignGridSlots,
	gridItems,
	gridItemText,
	insertGridItem,
	removeGridItems,
} from "./grid-helpers";
import { gridStyles } from "./grid-styles";
import { randomizeArray } from "../model/randomize-array";
import { matchText, scoreAllOrNothing, scoreProportion } from "../model/scoring";

import { GridTask } from "./grid-task";
import { WebwriterTask, textToleranceOptions } from "./webwriter-task";
import { gapChoices, GapChoicesEditor, shuffledGapChoices } from "./gap-choices";
import { selfAssessmentOption } from "./rubric-popover";

export type GapGridGrading = "ungraded" | "pass-fail" | "partial" | "partial-row" | "self-assess";

export abstract class GapGridTask extends GridTask {
	abstract mode: "input" | "drag-and-drop" | "dropdown";
	abstract gradingMethod: GapGridGrading;
	abstract ignoreCase: boolean;
	abstract ignorePunctuation: boolean;
	abstract allowTypos: boolean;

	/** @internal */
	static shadowRootOptions = {
		...WebwriterTask.shadowRootOptions,
		slotAssignment: "manual" as const,
	};

	static styles: CSSResultGroup = [...gridStyles, css`
		.task-helper {
			min-block-size: calc(1.5 * var(--sl-font-size-x-small) + 2 * var(--sl-spacing-3x-small));
		}

		.gap-cell-edit {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--sl-spacing-2x-small);
			min-width: 0;
		}

		.gap-cell-edit slot {
			flex: 1 1 auto;
			min-width: 0;
		}

		td.is-gap {
			background: var(--sl-color-primary-50);
			box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 45%, transparent);
		}

		.toggle-gap-btn {
			flex: none;
			color: var(--sl-color-neutral-500);
			border-radius: var(--sl-border-radius-small);
		}

		.toggle-gap-btn::part(base) {
			padding: var(--sl-spacing-3x-small);
		}

		.toggle-gap-btn[aria-pressed="true"] {
			color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			background: color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 14%, transparent);
		}

		.gap-input {
			width: 100%;
			min-width: 4.5rem;
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
			box-sizing: border-box;
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-border-radius-small);
			background: var(--sl-input-background-color);
			color: inherit;
			font: inherit;
			line-height: var(--sl-line-height-normal);
			transition: var(--sl-transition-fast) border-color;

			&:focus-visible {
				outline: var(--sl-focus-ring-width) var(--sl-focus-ring-style) var(--sl-focus-ring-color);
				outline-offset: 0;
				border-color: var(--sl-input-border-color-focus);
			}

			&:disabled {
				cursor: default;
				opacity: 0.9;
			}
		}

		.cell-correct .gap-input {
			border-color: var(--sl-color-success-600);
			background: var(--sl-color-neutral-0);
		}

		.cell-wrong .gap-input {
			border-color: var(--sl-color-danger-600);
			background: var(--sl-color-neutral-0);
		}

		.cell-missed .gap-input {
			border-color: var(--sl-color-warning-600);
			border-style: dashed;
		}

		.gap-chip {
			display: inline-flex;
			align-items: center;
			min-height: 2rem;
			padding: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			box-sizing: border-box;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			color: inherit;
			font: inherit;
			user-select: none;
			cursor: grab;
			transition: var(--sl-transition-fast) border-color, var(--sl-transition-fast) background-color;

			&:hover {
				border-color: var(--sl-color-primary-300);
				background: var(--sl-color-primary-50);
			}

			&[data-ww-dragging] {
				z-index: 1000;
				pointer-events: none;
				cursor: grabbing;
				border-color: var(--sl-color-primary-400);
				background: var(--sl-color-primary-50);
			}
		}

		.cell-correct .gap-chip {
			border-color: var(--sl-color-success-600);
		}

		.cell-wrong .gap-chip {
			border-color: var(--sl-color-danger-600);
			color: var(--sl-color-danger-700);
			text-decoration: line-through;
		}

		.gap-drop {
			align-items: center;
			justify-content: center;
			min-height: 2.25rem;
		}
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"sl-icon-button": SlIconButton,
		"gap-choices-editor": GapChoicesEditor,
	};

	static gridActions = {
		...WebwriterTask.actions,
		addRow: { label: (widget: { msg: MsgFn }) => widget.msg("Add Row") },
		addColumn: { label: (widget: { msg: MsgFn }) => widget.msg("Add Column") },
	};

	static gridOptions = {
		...WebwriterTask.options,
		...textToleranceOptions,
		showColumnHeaders: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show column headers") },
		showRowHeaders: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show row headers") },
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every gap cell is correct."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per cell"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correct gap cell."),
				},
				{
					value: "partial-row",
					label: (widget: { msg: MsgFn }) => widget.msg("Per row"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each row where all gaps are correct."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."),
				},
			],
		},
	};

	protected gridOptions() {
		return this.declarationsWithout("options", [], GapGridTask.gridOptions);
	}

	/** Whether learners see the top column header row. */
	@property({ type: Boolean, attribute: "show-column-headers", reflect: true, useDefault: true })
	accessor showColumnHeaders = true;

	/** Whether learners see the leading row header column. */
	@property({ type: Boolean, attribute: "show-row-headers", reflect: true, useDefault: true })
	accessor showRowHeaders = true;

	/** Column header item IDs. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true })
	accessor columns: string[] = [];

	/** Row header item IDs. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true })
	accessor rows: string[] = [];

	/** Matrix of body cell item IDs indexed `[rowIndex][colIndex]`. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true })
	accessor cells: string[][] = [];

	/** IDs of body cells that act as gaps. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true })
	accessor gaps: string[] = [];

	@state() private accessor typedAnswers: Record<string, string> = {};
	@state() private accessor gridPlacements: Record<string, string> = {};
	@state() private accessor gridPoolOrder: string[] = [];
	@state() private accessor gridGraded = false;
	@state() private accessor gridDetailedFeedback = false;

	#drag = new Drag(this, { can: () => this.grid && !this.editing && this.usesLegacyGridDrag && !this.gridGraded });

	private get gridShowFeedback() {
		return this.gridGraded && this.gridDetailedFeedback;
	}

	private get gapCellIds(): string[] {
		const valid = new Set(this.cells.flat());
		return this.gaps.filter(id => valid.has(id));
	}

	private addRow() {
		if (!this.isConnected || !this.editing) return;
		const colCount = this.columns.length || 1;
		void transaction(this, async () => {
			const rowId = insertGridItem(this, this.feedbackElement);
			const newCells = Array.from({ length: colCount }, () => insertGridItem(this, this.feedbackElement));
			this.rows = [...this.rows, rowId];
			this.cells = [...this.cells, newCells];
			await this.updateComplete;
		});
	}

	private addColumn() {
		if (!this.isConnected || !this.editing) return;
		const rowCount = this.rows.length || 1;
		void transaction(this, async () => {
			const colId = insertGridItem(this, this.feedbackElement);
			const nextCells = Array.from({ length: rowCount }, (_, r) => [
				...(this.cells[r] ?? []),
				insertGridItem(this, this.feedbackElement),
			]);
			this.columns = [...this.columns, colId];
			this.cells = nextCells;
			await this.updateComplete;
		});
	}

	private removeRow(rowIndex: number) {
		if (!this.editing || this.rows.length <= 1) return;
		const rowId = this.rows[rowIndex];
		const rowCells = this.cells[rowIndex] ?? [];
		const removed = new Set([rowId, ...rowCells]);
		void transaction(this, async () => {
			removeGridItems(this, removed);
			this.rows = this.rows.filter((_, idx) => idx !== rowIndex);
			this.cells = this.cells.filter((_, idx) => idx !== rowIndex);
			this.gaps = this.gaps.filter(id => !removed.has(id));
			await this.updateComplete;
		});
	}

	private removeColumn(colIndex: number) {
		if (!this.editing || this.columns.length <= 1) return;
		const colId = this.columns[colIndex];
		const removed = new Set([colId, ...this.cells.map(row => row[colIndex]).filter(Boolean)]);
		void transaction(this, async () => {
			removeGridItems(this, removed);
			this.columns = this.columns.filter((_, idx) => idx !== colIndex);
			this.cells = this.cells.map(row => row.filter((_, idx) => idx !== colIndex));
			this.gaps = this.gaps.filter(id => !removed.has(id));
			await this.updateComplete;
		});
	}

	private toggleGap(cellId: string) {
		if (!this.editing) return;
		void transaction(this, async () => {
			this.gaps = this.gaps.includes(cellId)
				? this.gaps.filter(id => id !== cellId)
				: [...this.gaps, cellId];
			await this.updateComplete;
		});
	}

	protected addGridOption() {
		this.addRow();
	}

	protected get gridAddOptionLabel() {
		return this.msg("Add Row");
	}

	private acceptedAnswers(cellId: string): string[] {
		const raw = gridItemText(this, cellId);
		return raw
			.split("|")
			.map(part => part.trim())
			.filter(Boolean);
	}

	private displaySolution(cellId: string): string {
		return this.acceptedAnswers(cellId)[0] ?? gridItemText(this, cellId);
	}

	private get usesLegacyGridDrag() {
		if (this.mode !== "drag-and-drop") return false;
		const active = new Set(this.gapCellIds);
		return !gridItems(this).some(item => active.has(item.id) && gapChoices(item) !== undefined);
	}

	private cellChoices(cellId: string, item = gridItems(this).find(child => child.id === cellId)) {
		const alternatives = gapChoices(item);
		return item && alternatives?.length
			? shuffledGapChoices(item, [...this.acceptedAnswers(cellId), ...alternatives])
			: undefined;
	}

	private learnerValue(cellId: string): string {
		if (this.usesLegacyGridDrag) {
			const chipId = this.gridPlacements[cellId];
			return chipId ? this.displaySolution(chipId) : "";
		}
		const answer = this.typedAnswers[cellId] ?? "";
		const choices = this.cellChoices(cellId);
		return choices && !choices.includes(answer) ? "" : answer;
	}

	private isCellCorrect(cellId: string): boolean {
		const rawActual = this.learnerValue(cellId).trim();
		if (!rawActual) return false;
		const accepted = this.acceptedAnswers(cellId);
		if (accepted.length === 0) return false;
		if (!this.usesLegacyGridDrag && !this.cellChoices(cellId)) {
			return matchText(rawActual, accepted, {
				ignoreCase: this.ignoreCase,
				ignorePunctuation: this.ignorePunctuation,
				allowTypos: this.allowTypos,
			});
		}
		return accepted.some(option => option.trim() === rawActual);
	}

	private handleChipDrop = ({ detail }: CustomEvent<DragCommitDetail>) => {
		const chipId = detail.key;
		if (!chipId || this.editing || this.gridGraded || !this.usesLegacyGridDrag) return;
		const targetCellId = detail.target.dataset.cellId;
		const next = { ...this.gridPlacements };
		const originCellId = Object.keys(next).find(cell => next[cell] === chipId);

		if (!targetCellId) {
			if (originCellId) delete next[originCellId];
			this.gridPlacements = next;
			return;
		}

		const displaced = next[targetCellId];
		next[targetCellId] = chipId;
		if (originCellId && originCellId !== targetCellId) {
			if (displaced && displaced !== chipId) next[originCellId] = displaced;
			else delete next[originCellId];
		}
		this.gridPlacements = next;
	};

	protected checkGridValidity(): boolean {
		const activeGaps = this.gapCellIds;
		if (activeGaps.length === 0) return true;
		return activeGaps.every(id => this.learnerValue(id).trim() !== "");
	}

	protected resetGrid(): void {
		this.gridGraded = false;
		this.gridDetailedFeedback = false;
		this.typedAnswers = {};
		this.gridPlacements = {};
		this.gridPoolOrder = randomizeArray([...this.gapCellIds]);
	}

	protected checkGridAnswer(detailedFeedback = false): number {
		this.gridGraded = true;
		this.gridDetailedFeedback = detailedFeedback;
		const activeGaps = this.gapCellIds;
		if (activeGaps.length === 0) return 0;
		if (this.gradingMethod === "partial-row") {
			const activeSet = new Set(activeGaps);
			const gapRows = this.cells
				.map(row => row.filter(id => activeSet.has(id)))
				.filter(rowGaps => rowGaps.length > 0);
			const correctRows = gapRows.filter(rowGaps => rowGaps.every(id => this.isCellCorrect(id))).length;
			return scoreProportion(correctRows, gapRows.length);
		}
		const correct = activeGaps.filter(id => this.isCellCorrect(id)).length;
		return this.gradingMethod === "pass-fail"
			? scoreAllOrNothing(correct, activeGaps.length)
			: scoreProportion(correct, activeGaps.length);
	}

	protected willUpdate(changed: PropertyValues): void {
		super.willUpdate(changed);
		if (!this.grid) return;
		if (changed.has("gaps") || changed.has("cells") || changed.has("mode")) {
			this.gridPoolOrder = randomizeArray([...this.gapCellIds]);
		}
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (this.grid) assignGridSlots(this);
	}

	private renderChip(chipId: string) {
		return html`<div
			class="gap-chip"
			data-chip-id=${chipId}
			data-ww-key=${chipId}
			data-ww-drag=${ifDefined(!this.gridGraded ? "gap-chip" : undefined)}
		>${this.displaySolution(chipId)}</div>`;
	}

	protected renderGridAnswer() {
		const editing = this.editing;
		const locked = !editing && this.gridGraded;
		const activeGaps = this.gapCellIds;
		const gapSet = new Set(activeGaps);
		const items = new Map(gridItems(this).map(item => [item.id, item]));
		const placedChips = new Set(Object.values(this.gridPlacements));
		const poolChips = this.gridPoolOrder.filter(id => gapSet.has(id) && !placedChips.has(id));
		const correctCount = activeGaps.filter(id => this.isCellCorrect(id)).length;

		const showColHeaders = editing || this.showColumnHeaders;
		const showRowHeaders = editing || this.showRowHeaders;

		let helper = "";
		if (!editing && this.gridShowFeedback) {
			helper = this.msg(str`${correctCount} of ${activeGaps.length} gaps are correct.`);
		} else if (!editing && this.gridGraded) {
			helper = "";
		} else if (editing) {
			helper = this.msg("Enter the solutions, then mark the gap cells.");
		} else if (this.usesLegacyGridDrag) {
			helper = this.msg("Drag each answer into a gap, or click an answer and then the gap.");
		} else {
			helper = this.msg("Fill in the gaps.");
		}

		return html`
			${this.HelperRow(helper, this.renderTolerance())}
			<div @ww-dragcommit=${this.handleChipDrop}>
				<div class="grid-wrap">
					<table class="grid" role="grid">
						${showColHeaders ? html`<thead>
							<tr>
								${showRowHeaders ? html`<th class="corner" scope="col"></th>` : nothing}
								${this.columns.map((colId, c) => html`<th class="col-header" scope="col">
									<div class="header-cell">
										<slot data-child-id=${colId}></slot>
										${editing && this.columns.length > 1
											? html`<sl-icon-button class="remove-btn" src=${TrashIcon} label=${this.msg("Remove column")} @click=${() => this.removeColumn(c)}></sl-icon-button>`
											: nothing}
									</div>
								</th>`)}
								${editing
									? html`<th class="add-col-cell edit-only" scope="col">
										<sl-icon-button src=${PlusIcon} label=${this.msg("Add Column")} data-ww-capture-selection="false" @click=${this.addColumn}></sl-icon-button>
									</th>`
									: nothing}
							</tr>
						</thead>` : nothing}
						<tbody>
							${this.rows.map((rowId, r) => html`<tr>
								${showRowHeaders ? html`<th class="row-header" scope="row">
									<div class="header-cell">
										<slot data-child-id=${rowId}></slot>
										${editing && this.rows.length > 1
											? html`<sl-icon-button class="remove-btn" src=${TrashIcon} label=${this.msg("Remove row")} @click=${() => this.removeRow(r)}></sl-icon-button>`
											: nothing}
									</div>
								</th>` : nothing}
								${this.columns.map((_, c) => {
									const cellId = this.cells[r]?.[c];
									if (!cellId) return html`<td></td>`;
									const isGap = gapSet.has(cellId);
									const item = items.get(cellId);
									if (editing) {
										return html`<td class=${classMap({ "is-gap": isGap })}>
											<div class="gap-cell-edit">
												<slot data-child-id=${cellId}></slot>
												${isGap && item ? html`<gap-choices-editor .gap=${item} .solutions=${this.acceptedAnswers(cellId)}
													.alternatives=${gapChoices(item) ?? []} .message=${this.msg}></gap-choices-editor>` : nothing}
												<sl-icon-button
													class="toggle-gap-btn edit-only"
													src=${InputCursorIcon}
													aria-pressed=${isGap ? "true" : "false"}
													label=${this.msg("Toggle gap")}
													@click=${() => this.toggleGap(cellId)}
												></sl-icon-button>
											</div>
										</td>`;
									}
									if (!isGap) {
										return html`<td><slot data-child-id=${cellId}></slot></td>`;
									}
									const filledValue = this.learnerValue(cellId).trim();
									const correct = this.gridShowFeedback && this.isCellCorrect(cellId);
									const wrong = this.gridShowFeedback && !correct && filledValue !== "";
									const missed = this.gridShowFeedback && filledValue === "";
									const placedChip = this.gridPlacements[cellId];
									const choices = this.cellChoices(cellId, item);
									return html`<td class=${classMap({
										"cell-correct": correct,
										"cell-wrong": wrong,
										"cell-missed": missed,
									})}>
										${this.usesLegacyGridDrag
											? html`<div
												class=${classMap({ "drop-zone": true, "gap-drop": true, filled: Boolean(placedChip) })}
												data-ww-drop="gap-chip"
												data-ww-drop-max="1"
												data-ww-drop-full="swap"
												data-cell-id=${cellId}
											>
												${placedChip
													? this.renderChip(placedChip)
													: html`<span class="slot-placeholder">${this.gridGraded ? this.msg("No answer") : this.msg("Empty")}</span>`}
											</div>`
											: choices ? html`<select class="gap-input" aria-label=${this.msg("Gap")}
												.value=${live(filledValue)} ?disabled=${locked}
												@change=${(event: Event) => {
													this.typedAnswers = { ...this.typedAnswers, [cellId]: (event.currentTarget as HTMLSelectElement).value };
												}}>
												<option value="">—</option>
												${choices.map(option => html`<option value=${option} ?selected=${filledValue === option}>${option}</option>`)}
											</select>` : html`<input
												type="text"
												class="gap-input"
												.value=${live(this.typedAnswers[cellId] ?? "")}
												?disabled=${locked}
												aria-label=${this.msg("Gap")}
												@input=${(e: Event) => {
													this.typedAnswers = { ...this.typedAnswers, [cellId]: (e.target as HTMLInputElement).value };
												}}
											>`}
										${wrong || missed
											? html`<span class="correction" aria-label=${this.msg("Solution")}>${this.displaySolution(cellId)}</span>`
											: nothing}
									</td>`;
								})}
								${editing ? html`<td class="add-col-cell edit-only"></td>` : nothing}
							</tr>`)}
						</tbody>
					</table>
				</div>
				${!editing && this.usesLegacyGridDrag && !this.gridGraded
					? html`<div class="grid-pool" data-ww-drop="gap-chip">
						<span class="pool-label">${this.msg("Available answers")}</span>
						${poolChips.length
							? poolChips.map(id => this.renderChip(id))
							: html`<span class="slot-placeholder">${this.msg("All answers are placed.")}</span>`}
					</div>`
					: nothing}
			</div>
			${editing ? html`<div class="grid-footer-actions edit-only">
				<button type="button" class="add-inline-btn" data-ww-capture-selection="false" @click=${this.addRow}>
					<sl-icon src=${PlusIcon}></sl-icon>
					${this.msg("Add Row")}
				</button>
			</div>` : nothing}
		`;
	}
}
