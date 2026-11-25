import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import CheckIcon from "@tabler/icons/outline/check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues, type CSSResultGroup } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { live } from "lit/directives/live.js";
import { styleMap } from "lit/directives/style-map.js";
import { assignGridSlots, choiceColumnTag, choiceGridItems, choiceRowTag, createGridItem, newGridId, type ChoiceGridHeaderTag } from "./grid-helpers";
import { gridStyles } from "./grid-styles";
import { hasNonTextContent, itemContent } from "./item-content";
import { migrateChoiceGridHeaders } from "./migrate-choice-grid-headers";
import { scoreAllOrNothing, scorePenalizedSelection, scoreProportion } from "../model/scoring";
import { ChoiceGridHeader } from "../widgets/webwriter-grid-item";

import { GridTask } from "./grid-task";
import { WebwriterTask } from "./webwriter-task";
import { selfAssessmentOption } from "./rubric-popover";

export type ChoiceGridGrading = "ungraded" | "pass-fail" | "partial" | "partial-cell" | "self-assess";
export type ChoiceGridSolution = Record<string, string[]>;

export abstract class ChoiceGridTask extends GridTask {
	protected abstract gridSolution: ChoiceGridSolution;
	protected abstract gridGradingMethod: ChoiceGridGrading;
	abstract mode: "single" | "multiple" | "true-false";

	/** @internal */
	static shadowRootOptions = {
		...WebwriterTask.shadowRootOptions,
		slotAssignment: "manual" as const,
	};

	static styles: CSSResultGroup = [...gridStyles, css`
		.grid-action-short { display: none; }

		@container (inline-size < 25rem) {
			.task-helper-switches:has(.add-column) > button { padding-inline: var(--sl-spacing-2x-small); }
			.grid-action-full { display: none; }
			.grid-action-short { display: inline; }
			.grid-switch-full {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				overflow: hidden;
				clip-path: inset(50%);
			}
		}

		@container (inline-size < 20rem) {
			.task-helper-switches:has(.add-column) {
				gap: var(--sl-spacing-3x-small);
				> button { padding-inline: var(--sl-spacing-3x-small); }
			}
		}

		table.grid th:is(.col-header, .row-header) {
			padding: 0;
			position: relative;
			/* Let the slotted label fill the cell, even when another cell sets the row height. */
			block-size: 1px;
			/* Pico paragraphs read this token instead of inheriting the grid's font size. */
			--font-size: 1em;
			--grid-item-padding: var(--sl-spacing-x-small, 0.5rem) var(--sl-spacing-small, 0.75rem);
			--grid-item-media-height: none;
		}

		table.grid th > slot::slotted(:is(webwriter-choice-column, webwriter-choice-row)) {
			/* Authored dimensions size the table tracks. The header itself fills its track. */
			inline-size: 100% !important;
			block-size: 100% !important;
			max-inline-size: none !important;
			max-block-size: none !important;
		}

		table.grid th > slot::slotted(webwriter-choice-column:state(ww-element-selected)) {
			/* A contents host has no client rect, so the resize gesture uses its computed width. */
			inline-size: var(--choice-header-inline-size, 100%) !important;
		}

		table.grid th > slot::slotted(webwriter-choice-row:state(ww-element-selected)) {
			block-size: var(--choice-header-block-size, 100%) !important;
		}

		table.grid.sized-columns {
			table-layout: fixed;
		}

		table.grid thead tr:last-child > th {
			border-block-end: 1px solid var(--sl-color-neutral-200);
		}

		td.choice-cell {
			text-align: center;
			padding: 0;
		}

		label.cell-label {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--sl-spacing-2x-small);
			min-height: 2.5rem;
			padding: var(--sl-spacing-2x-small) var(--sl-spacing-x-small);
			box-sizing: border-box;
			cursor: pointer;
		}

		td.disabled label.cell-label:not(.solution-unavailable) {
			cursor: default;
		}

		label.cell-label input[type="radio"],
		label.cell-label input[type="checkbox"] {
			width: 1.125rem;
			height: 1.125rem;
			margin: 0;
			accent-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			cursor: inherit;
		}

		td.cell-key label.cell-label input {
			accent-color: var(--sl-color-success-600);
		}

		td.cell-missed {
			outline: 1px dashed var(--sl-color-warning-600);
			outline-offset: -2px;
		}

		.status-icon {
			font-size: 1rem;
		}

		.cell-correct .status-icon {
			color: var(--sl-color-success-700);
		}

		.cell-wrong .status-icon {
			color: var(--sl-color-danger-700);
		}

		.cell-missed .status-icon {
			color: var(--sl-color-warning-700);
		}
	`];

	static gridActions = {
		...WebwriterTask.actions,
		addRow: { label: (widget: { msg: MsgFn }) => widget.msg("Add Row") },
		addColumn: { label: (widget: { msg: MsgFn }) => widget.msg("Add Column") },
	};

	static gridOptions = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every row is completely correct."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per row"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each fully correct row."),
				},
				{
					value: "partial-cell",
					label: (widget: { msg: MsgFn }) => widget.msg("Per cell"),
					description: (widget: { msg: MsgFn }) => widget.msg("Penalized partial credit within multi-select rows."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring (survey or rating)."),
				},
			],
		},
	};

	protected gridOptions() {
		const base = this.declarationsWithout("options", [], ChoiceGridTask.gridOptions) as Record<string, any>;
		if (this.mode === "single" && base.gradingMethod?.options) {
			base.gradingMethod = {
				...base.gradingMethod,
				options: base.gradingMethod.options.filter((choice: { value: string }) => choice.value !== "partial-cell"),
			};
		}
		return base;
	}

	/** When true, no answer key is stored or graded (for survey / rating / Likert scales). */
	@property({ type: Boolean, attribute: true, reflect: true, useDefault: true })
	accessor ungraded = false;

	@property({ type: Array, attribute: "columns", reflect: true, useDefault: true })
	private accessor legacyColumns: string[] = [];

	@property({ type: Array, attribute: "rows", reflect: true, useDefault: true })
	private accessor legacyRows: string[] = [];

	get columns() { return this.headerIds(choiceColumnTag, this.legacyColumns); }
	set columns(ids: string[]) { this.legacyColumns = ids; }

	get rows() { return this.headerIds(choiceRowTag, this.legacyRows); }
	set rows(ids: string[]) { this.legacyRows = ids; }

	#temporaryIds = new WeakMap<HTMLElement, string>();
	#observedGrid = new Set<HTMLElement>();
	#tableSize = new ResizeObserver(entries => {
		for (const { target, borderBoxSize } of entries) {
			const { inlineSize, blockSize } = borderBoxSize[0];
			const box = target as HTMLElement;
			const prefix = box.localName === "table" ? "--choice-grid" : "--choice-header";
			box.style.setProperty(`${prefix}-inline-size`, `${inlineSize}px`);
			box.style.setProperty(`${prefix}-block-size`, `${blockSize}px`);
		}
	});
	#listeningToLabels = false;

	/** @internal Identity shared by the grid slots and layout conversion. */
	gridHeaderId(item: HTMLElement) {
		if (item.id) return item.id;
		let id = this.#temporaryIds.get(item);
		if (!id) this.#temporaryIds.set(item, id = newGridId());
		return id;
	}

	private headerIds(tag: ChoiceGridHeaderTag, legacyIds: string[]) {
		const items = choiceGridItems(this);
		const legacy = new Set(items.filter(item => item.localName === "webwriter-grid-item").map(item => item.id));
		return [
			...items.filter(item => item.localName === tag).map(item => this.gridHeaderId(item)),
			...(Array.isArray(legacyIds) ? legacyIds.filter(id => legacy.has(id)) : []),
		];
	}

	private get editableHeaders() {
		return choiceGridItems(this).filter((item): item is ChoiceGridHeader => item instanceof ChoiceGridHeader);
	}

	private moveToLabel(header: ChoiceGridHeader, end = false) {
		const selection = this.ownerDocument.getSelection();
		if (!selection) return;
		const range = this.ownerDocument.createRange();
		const content = itemContent(header);
		if (content && !hasNonTextContent(header)) {
			range.selectNodeContents(content);
			range.collapse(!end);
		} else {
			range.selectNode(header);
		}
		selection.removeAllRanges();
		selection.addRange(range);
		header.shadowRoot?.querySelector(".choice-grid-label")?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}

	private keepCaretInLabels = () => {
		const selection = this.ownerDocument.getSelection();
		if (!this.editing || !selection?.isCollapsed) return;
		const { anchorNode, anchorOffset } = selection;
		if (anchorNode instanceof ChoiceGridHeader && anchorNode.parentElement === this
			&& !anchorNode.selectionStates.has("ww-element-selected")) {
			this.moveToLabel(anchorNode, anchorOffset > 0);
		} else if (anchorNode === this) {
			// Native editor gaps are element offsets in the light DOM. Keep exterior task gaps available.
			const nodes = [...this.childNodes];
			const next = nodes.slice(anchorOffset).find(node => node instanceof Element);
			const previous = nodes.slice(0, anchorOffset).findLast(node => node instanceof Element);
			if (next instanceof ChoiceGridHeader && previous instanceof ChoiceGridHeader
				&& !next.selectionStates.has("ww-element-selected") && !previous.selectionStates.has("ww-element-selected")) {
				this.moveToLabel(next);
			}
		}
	};

	private atLabelEdge(content: Element, selection: Selection, forward: boolean, vertical: boolean) {
		const remaining = this.ownerDocument.createRange();
		remaining.selectNodeContents(content);
		if (forward) remaining.setStart(selection.anchorNode!, selection.anchorOffset);
		else remaining.setEnd(selection.anchorNode!, selection.anchorOffset);
		if (!remaining.toString()) return true;
		if (!vertical) return false;
		const caret = selection.getRangeAt(0).getBoundingClientRect();
		return caret.height > 0 && !Array.from(remaining.getClientRects()).some(rect =>
			forward ? rect.top >= caret.bottom : rect.bottom <= caret.top);
	}

	private navigateLabels = (event: Event) => {
		if (!(event instanceof KeyboardEvent)) return;
		const { key } = event;
		const tab = key === "Tab";
		const vertical = key === "ArrowUp" || key === "ArrowDown";
		if (!this.editing || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey
			|| (!tab && (event.shiftKey || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)))) return;
		const origin = event.composedPath()[0];
		if (origin instanceof Element && origin.closest("button, input, textarea, select, [contenteditable=false]")) return;
		const selection = this.ownerDocument.getSelection();
		const headers = this.editableHeaders;
		const whole = headers.find(header => header.selectionStates.has("ww-element-selected"));
		const current = whole ?? headers.find(header => header.contains(selection?.anchorNode ?? null));
		if (!current || (origin instanceof Node && origin.getRootNode() instanceof ShadowRoot && !current.shadowRoot?.contains(origin))) return;
		if (!whole && hasNonTextContent(current)) return;
		const rtl = getComputedStyle(this).direction === "rtl";
		const forward = tab ? !event.shiftKey : vertical ? key === "ArrowDown" : key === (rtl ? "ArrowLeft" : "ArrowRight");
		const step = forward ? 1 : -1;
		let next: ChoiceGridHeader | undefined;
		if (tab) {
			next = headers[headers.indexOf(current) + step];
			// Leave the label list without triggering the document editor's paragraph indentation.
			event.stopPropagation();
		} else {
			const content = itemContent(current);
			if (!whole && (!content?.contains(selection?.anchorNode ?? null) || !selection?.isCollapsed
				|| !this.atLabelEdge(content, selection, forward, vertical))) return;
			const columns = headers.filter(header => header.localName === choiceColumnTag);
			const rows = headers.filter(header => header.localName === choiceRowTag);
			if (current.localName === choiceColumnTag) {
				next = vertical ? (forward ? rows[0] : undefined) : columns[columns.indexOf(current) + step];
			} else {
				next = vertical ? (rows[rows.indexOf(current) + step] ?? (!forward ? columns[0] : undefined))
					: (forward ? columns[0] : undefined);
			}
		}
		if (!next) return;
		event.preventDefault();
		event.stopPropagation();
		this.moveToLabel(next, !tab && !forward);
	};

	private listenForLabelEditing(active: boolean) {
		if (this.#listeningToLabels === active) return;
		this.#listeningToLabels = active;
		const method = active ? "addEventListener" : "removeEventListener";
		this.ownerDocument.defaultView?.[method]("keydown", this.navigateLabels, true);
		this.ownerDocument[method]("selectionchange", this.keepCaretInLabels);
	}

	private savedTrackSize(item: HTMLElement | undefined, axis: "inline" | "block") {
		// WebWriter's resize frame persists the maximum size on an ordinary flow element.
		const properties = axis === "inline"
			? ["max-inline-size", "max-width", "inline-size", "width"]
			: ["max-block-size", "max-height", "block-size", "height"];
		return properties.map(name => item?.style.getPropertyValue(name))
			.find(value => value && CSS.supports("width", `calc(1px + ${value})`));
	}

	@state() private accessor selections: Record<string, string[]> = {};
	@state() private accessor gridGraded = false;
	@state() private accessor gridDetailedFeedback = false;

	private get gridShowFeedback() {
		return this.gridGraded && this.gridDetailedFeedback;
	}

	/** Adds a new row header item in one undo step. */
	private addRow() {
		this.addHeader(choiceRowTag);
	}

	/** Adds a new column header item in one undo step. */
	private addColumn() {
		this.addHeader(choiceColumnTag);
	}

	private addHeader(tag: ChoiceGridHeaderTag) {
		if (!this.isConnected || !this.editing || !this.grid) return;
		void transaction(this, async () => {
			const firstRow = this.rows[0];
			const before = tag === choiceColumnTag && firstRow
				? choiceGridItems(this).find(item => this.gridHeaderId(item) === firstRow)
				: undefined;
			const item = createGridItem(this.ownerDocument, undefined, "", tag);
			this.insertBefore(item, before ?? this.feedbackElement);
			await this.updateComplete;
			if (item.firstElementChild) this.placeCaret(item.firstElementChild);
		});
	}

	protected addGridOption() {
		this.addRow();
	}

	protected get gridAddOptionLabel() {
		return this.msg("Add Row");
	}

	private expectedForRow(rowId: string): string[] {
		const validCols = new Set(this.columns);
		const raw = (this.gridSolution[rowId] ?? []).filter(id => validCols.has(id));
		return this.mode === "single" ? raw.slice(0, 1) : raw;
	}

	private toggleCell(rowId: string, colId: string, checked: boolean) {
		if (this.solutionUnavailableTitle) return;
		const current = this.editing ? this.expectedForRow(rowId) : (this.selections[rowId] ?? []);
		let updated: string[];
		if (this.mode === "single") {
			updated = checked ? [colId] : [];
		} else {
			updated = checked ? [...new Set([...current, colId])] : current.filter(id => id !== colId);
		}
		if (this.editing) {
			void transaction(this, async () => {
				// The editor omits the ID when splitting a label. Persist it when it first enters the key.
				for (const item of choiceGridItems(this)) {
					const id = this.gridHeaderId(item);
					if (!item.id && updated.length && (id === rowId || updated.includes(id))) item.id = id;
				}
				const next = { ...this.gridSolution };
				if (updated.length) next[rowId] = updated;
				else delete next[rowId];
				this.gridSolution = next;
				await this.updateComplete;
			});
		} else {
			this.selections = { ...this.selections, [rowId]: updated };
		}
	}

	private isRowCorrect(rowId: string): boolean {
		const expected = new Set(this.expectedForRow(rowId));
		const actual = new Set((this.selections[rowId] ?? []).filter(id => this.columns.includes(id)));
		if (expected.size !== actual.size) return false;
		for (const id of expected) if (!actual.has(id)) return false;
		return true;
	}

	protected checkGridValidity(): boolean {
		if (this.mode !== "single" || this.rows.length === 0) return true;
		return this.rows.every(rowId => (this.selections[rowId] ?? []).some(id => this.columns.includes(id)));
	}

	protected resetGrid(): void {
		this.gridGraded = false;
		this.gridDetailedFeedback = false;
		this.selections = {};
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (this.grid && !this.editing) this.gridGraded = submitted;
	}

	protected willUpdate(changed: PropertyValues): void {
		super.willUpdate(changed);
		if (!this.grid) return;
		if (this.editing) migrateChoiceGridHeaders(this);
		if (this.isSelfAssessment) {
			this.ungraded = false;
		} else if (changed.has("ungraded") && (changed.get("ungraded") !== undefined || this.ungraded)) {
			if (this.ungraded && this.gridGradingMethod !== "ungraded") this.gridGradingMethod = "ungraded";
			else if (!this.ungraded && this.gridGradingMethod === "ungraded") this.gridGradingMethod = "partial";
		} else if (changed.has("gradingMethod")) {
			this.ungraded = this.gridGradingMethod === "ungraded";
		}
	}

	protected checkGridAnswer(detailedFeedback = false): number {
		this.gridGraded = true;
		this.gridDetailedFeedback = detailedFeedback;
		if (this.rows.length === 0) return 0;
		if (this.gridGradingMethod === "partial-cell" && this.mode === "multiple") {
			let sum = 0;
			for (const rowId of this.rows) {
				const expected = new Set(this.expectedForRow(rowId));
				const actual = (this.selections[rowId] ?? []).filter(id => this.columns.includes(id));
				const correctSelected = actual.filter(id => expected.has(id)).length;
				const wrongSelected = actual.length - correctSelected;
				sum += scorePenalizedSelection(correctSelected, wrongSelected, expected.size);
			}
			return scoreProportion(sum, this.rows.length);
		}
		const correctRows = this.rows.filter(rowId => this.isRowCorrect(rowId)).length;
		return this.gridGradingMethod === "pass-fail"
			? scoreAllOrNothing(correctRows, this.rows.length)
			: scoreProportion(correctRows, this.rows.length);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (changed.has("ungraded")) this.refreshDrawer();
		if (this.grid) assignGridSlots(this, new Map(choiceGridItems(this).map(item => [this.gridHeaderId(item), item])));
		const table = this.editing ? this.shadowRoot?.querySelector<HTMLTableElement>("table.grid") ?? null : null;
		const boxes = new Set<HTMLElement>(table ? [table, ...table.querySelectorAll<HTMLTableCellElement>("th:has(> slot)")] : []);
		for (const box of this.#observedGrid) {
			if (!boxes.has(box)) this.#tableSize.unobserve(box);
		}
		for (const box of boxes) {
			if (!this.#observedGrid.has(box)) this.#tableSize.observe(box, { box: "border-box" });
		}
		this.#observedGrid = boxes;
		this.listenForLabelEditing(Boolean(table));
	}

	disconnectedCallback() {
		this.listenForLabelEditing(false);
		this.#tableSize.disconnect();
		this.#observedGrid.clear();
		super.disconnectedCallback();
	}

	protected renderGridAnswer() {
		const editing = this.editing;
		const unavailable = this.solutionUnavailableTitle;
		const locked = editing ? Boolean(unavailable) : this.gridGraded;
		const inputType = this.mode === "single" ? "radio" : "checkbox";
		const { rows, columns } = this;
		const items = new Map(choiceGridItems(this).map(item => [this.gridHeaderId(item), item]));
		const widths = columns.map(id => this.savedTrackSize(items.get(id), "inline"));
		const hasWidths = widths.some(Boolean);
		const minimumWidth = hasWidths ? `calc(5.5rem + ${widths.map(width => width ?? "5.5rem").join(" + ")})` : undefined;

		let helper: string = "";
		if (!editing && !this.ungraded && this.gridShowFeedback) {
			const correctCount = rows.filter(rowId => this.isRowCorrect(rowId)).length;
			helper = this.msg(str`${correctCount} of ${rows.length} rows are correct.`);
		} else if (!editing && this.gridGraded) {
			helper = "";
		} else if (editing) {
			helper = this.ungraded ? this.msg("Enter the rows and choices.")
				: this.mode === "multiple" ? this.msg("Mark the correct choices in each row.") : this.msg("Mark one correct choice per row.");
		} else if (this.mode === "multiple") {
			helper = this.msg("Select all that apply.");
		} else {
			helper = this.msg("Select one option per row.");
		}

		const addRow = this.msg("Add Row");
		const addColumn = this.msg("Add column");
		return html`
			${this.HelperRow(helper, html`
				<button type="button" class="header-control helper-action edit-only add-option"
					aria-label=${addRow} title=${addRow} data-ww-capture-selection="false" @click=${this.addRow}>
					<span class="grid-action-full">${addRow}</span><span class="grid-action-short" aria-hidden="true">${this.msg("Row")}</span>
				</button>
				<button type="button" class="header-control helper-action edit-only add-column"
					aria-label=${addColumn} title=${addColumn} data-ww-capture-selection="false" @click=${this.addColumn}>
					<span class="grid-action-full">${addColumn}</span><span class="grid-action-short" aria-hidden="true">${this.msg("Column")}</span>
				</button>
			`)}
			<div class="grid-wrap">
				<table class=${hasWidths ? "grid sized-columns" : "grid"} role="grid" style=${styleMap({ minInlineSize: minimumWidth })}>
					${hasWidths ? html`<colgroup><col>${widths.map(width => html`<col style=${styleMap({ inlineSize: width })}>`)}</colgroup>` : nothing}
					<thead>
						<tr>
							<th class="corner" scope="col"></th>
							${columns.map(colId => html`<th class="col-header" scope="col">
								<slot data-child-id=${colId}></slot>
							</th>`)}
						</tr>
					</thead>
					<tbody>
						${rows.map(rowId => {
							const expected = this.ungraded ? [] : this.expectedForRow(rowId);
							const active = editing ? expected : (this.selections[rowId] ?? []);
							return html`<tr style=${styleMap({ blockSize: this.savedTrackSize(items.get(rowId), "block") })}>
								<th class="row-header" scope="row">
									<slot data-child-id=${rowId}></slot>
								</th>
								${columns.map(colId => {
									const isChecked = active.includes(colId);
									const isExpected = expected.includes(colId);
									const showFb = !editing && !this.ungraded && this.gridShowFeedback;
									const correct = showFb && isChecked && isExpected;
									const wrong = showFb && isChecked && !isExpected;
									const missed = showFb && !isChecked && isExpected;
									const key = editing && !this.ungraded && isExpected;
									return html`<td class=${classMap({
										"choice-cell": true,
										"disabled": locked,
										"cell-key": key,
										"cell-correct": correct,
										"cell-wrong": wrong,
										"cell-missed": missed,
									})}>
										<label class=${unavailable ? "cell-label solution-unavailable" : "cell-label"} title=${unavailable ?? nothing}>
											<input
												type=${inputType}
												name=${this.mode === "single" ? `row-${rowId}` : nothing}
												.checked=${live(isChecked)}
												?disabled=${locked}
												title=${unavailable ?? nothing}
												@change=${(e: Event) => this.toggleCell(rowId, colId, (e.target as HTMLInputElement).checked)}
											>
											${correct ? html`<sl-icon class="status-icon" src=${CheckIcon} label=${this.msg("Correct")}></sl-icon>` : nothing}
											${wrong ? html`<sl-icon class="status-icon" src=${XIcon} label=${this.msg("Incorrect")}></sl-icon>` : nothing}
											${missed ? html`<sl-icon class="status-icon" src=${CheckIcon} label=${this.msg("Solution")}></sl-icon>` : nothing}
										</label>
									</td>`;
								})}
							</tr>`;
						})}
					</tbody>
				</table>
			</div>
		`;
	}
}
