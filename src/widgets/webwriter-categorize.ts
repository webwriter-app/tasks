import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import type SlSwitch from "@shoelace-style/shoelace/dist/components/switch/switch.component.js";
import CategoryIcon from "@tabler/icons/outline/category.svg";
import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { name as packageId } from "../../package.json";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import {
	assignGridSlots,
	createGridItem,
	gridItems,
	gridItemText,
	newGridId,
} from "../components/grid-helpers";
import { gridStyles } from "../components/grid-styles";
import { hasNonTextContent, itemContent, itemContentLabel } from "../components/item-content";
import { migrateCategorizeGrid, migrateCategorizeItems } from "../components/migrate-categorize-grid";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import { registerQuizType } from "../model/quiz-api";
import { randomizeArray } from "../model/randomize-array";
import { scoreAllOrNothing, scoreProportion } from "../model/scoring";
import { selfAssessmentOption } from "../components/rubric-popover";
import "./webwriter-categorize-item";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-categorize": WebwriterCategorize;
	}
}

type CategorizeGrading = "ungraded" | "pass-fail" | "partial" | "self-assess";
type CategorizeSolution = Record<string, string[]>;

registerQuizType({
	packageId,
	section: "arrange",
	widgetPosition: 70,
	id: "webwriter-categorize",
	getName: (locale, translate = messageFor(locale)) => translate("Groups"),
	icon: CategoryIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-categorize");
		const group = createGridItem(document);
		const card = createGroupAnswer(document);
		task.categories = [group.id];
		task.solution = { [group.id]: [card.id] };
		task.append(group, card);
		return task;
	},
});

function createGroupAnswer(document: Document) {
	const item = document.createElement("webwriter-categorize-item");
	item.id = newGridId();
	item.append(document.createElement("p"));
	return item;
}

/**
 * A task where learners sort answers into named groups. Group headings are
 * `<webwriter-grid-item>` children, and answers are `<webwriter-categorize-item>` children.
 * The solution maps group IDs to the answers assigned to them.
 */
@customElement("webwriter-categorize")
export class WebwriterCategorize extends WebwriterTask {
	/** @internal */
	static shadowRootOptions = {
		...WebwriterTask.shadowRootOptions,
		slotAssignment: "manual" as const,
	};

	static styles = [...gridStyles, css`
		.buckets {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
			gap: var(--sl-spacing-small);
		}

		.bucket {
			display: grid;
			grid-template: auto 1fr / minmax(0, 1fr);
		}

		.group-slot {
			display: contents;
		}

		.group-slot::slotted(webwriter-grid-item:not([hidden])) {
			/* Keep the subgrid when the document theme defaults widget hosts to display: block. */
			display: grid !important;
			grid-area: 1 / 1 / span 2;
			grid-template-rows: subgrid;
		}

		/* Previews stay in the task's drag scope. Blank space belongs to the group's frame. */
		.bucket-zone {
			grid-area: 2 / 1;
			min-block-size: 4rem;
			margin: calc(var(--sl-spacing-x-small) + 1px);
			z-index: 1;
			pointer-events: none;
		}

		.bucket-zone .grid-card:not(:has(> .drag-handle), [data-ww-dragging]),
		.bucket-zone .grid-card:not([data-ww-dragging]) > :is(.drag-handle, .remove-placement) {
			pointer-events: auto;
		}

		.remove-placement {
			position: absolute;
			inset-block-start: -0.375rem;
			inset-inline-end: -0.375rem;
			z-index: 2;
			display: grid;
			place-items: center;
			inline-size: 1.125rem;
			block-size: 1.125rem;
			padding: 0;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: 50%;
			background: var(--sl-color-neutral-0, white);
			color: var(--sl-color-neutral-700);
			font-size: 0.75rem;
			cursor: pointer;
		}

		.remove-placement::before { content: ""; position: absolute; inset: -3px; }
		.remove-placement > sl-icon { pointer-events: none; }
		.remove-placement:hover { color: var(--sl-color-danger-700); }
		@media print { .remove-placement { display: none; } }

		.bucket[data-ww-drop-over] .bucket-zone {
			border-color: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			background-color: var(--sl-color-primary-50);
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small, 0.5rem);
		}

		.multi-group-label-short { display: none; }

		@container (inline-size < 21rem) {
			.task-helper-switches { gap: var(--sl-spacing-2x-small); }
			.task-helper-switches > .helper-action { padding-inline: var(--sl-spacing-2x-small); }

			.multi-group-label {
				position: absolute;
				inline-size: 1px;
				block-size: 1px;
				overflow: hidden;
				clip-path: inset(50%);
			}

			.multi-group-label-short { display: inline; }
		}

		@container (inline-size < 16rem) {
			.multi-group-label-short { display: none; }
		}

		.grid-card-wrap {
			display: flex;
			flex-direction: column;
			gap: var(--sl-spacing-3x-small);
			min-inline-size: 0;
			max-inline-size: 100%;
		}

		.grid-pool > .grid-card-wrap {
			min-inline-size: min(8rem, 100%);
		}

		.grid-card {
			padding: 0;
			gap: 0;
			--grid-item-padding: var(--sl-spacing-2x-small, 0.25rem) var(--sl-spacing-x-small, 0.5rem);
			--grid-item-media-height: none;
		}

		.grid-card.embedded::after { display: none; }

		.grid-card > .drag-handle {
			margin-inline: var(--sl-spacing-2x-small, 0.25rem);
		}

		.grid-card.wrong slot {
			color: var(--sl-color-danger-700);
			text-decoration: line-through;
		}

		.card-preview {
			flex: 1;
			min-inline-size: 0;
			overflow-wrap: anywhere;
			padding: var(--grid-item-padding);
		}

		.card-preview:has(> img) { padding: 0; }

		.card-preview img {
			display: block;
			max-inline-size: 100%;
			max-block-size: 5rem;
			object-fit: contain;
		}

	`];

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every item is sorted into its right group."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per item"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each item placed in its right group."),
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

	static gradingOptions = ["points", "gradingMethod"];

	/** Whether points are awarded per correctly categorized item (`partial`) or all-or-nothing (`pass-fail`). */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: CategorizeGrading = "partial";

	/** Category header item IDs, in display order. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true })
	accessor categories: string[] = [];

	/** Expected card IDs per category ID, obfuscated in markup. */
	@property({ type: Object, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: CategorizeSolution = {};

	/** Allow each item to have a placement in more than one group. */
	@property({ type: Boolean, attribute: "multi-group", reflect: true })
	accessor multiGroup = false;

	@state() private accessor placements: Record<string, string[]> = {};
	@state() private accessor poolOrder: string[] = [];
	@state() private accessor graded = false;
	@state() private accessor detailedFeedback = false;
	@state() private accessor hoveredPoolCard: string | undefined;
	@state() private accessor hoveredGroupCard: string | undefined;

	#drag = new Drag(this, {
		can: () => this.editing || !this.graded,
		rendered: () => this.updateComplete,
		lift: { pointerEvents: "none" },
	});
	#temporaryIds = new WeakMap<HTMLElement, string>();
	#cardObserver = new MutationObserver(() => this.requestUpdate());
	private refreshCardImage = (event: Event) => {
		if (event.target instanceof HTMLImageElement) this.requestUpdate();
	};

	connectedCallback() {
		super.connectedCallback();
		this.#cardObserver.observe(this, {
			subtree: true, childList: true, characterData: true,
			attributeFilter: ["id", "src", "srcset", "media", "alt", "poster", "aria-label", "title"],
		});
		this.addEventListener("load", this.refreshCardImage, true);
	}

	disconnectedCallback() {
		this.#cardObserver.disconnect();
		this.removeEventListener("load", this.refreshCardImage, true);
		this.hoveredPoolCard = undefined;
		this.hoveredGroupCard = undefined;
		super.disconnectedCallback();
	}

	private get answerItems() {
		return Array.from(this.querySelectorAll(":scope > webwriter-categorize-item")).filter(
			(item): item is HTMLElementTagNameMap["webwriter-categorize-item"] => item instanceof HTMLElement && !item.slot,
		);
	}

	private get answerIds() {
		return this.answerItems.map(item => this.itemId(item));
	}

	private get optionIds() {
		const ids = this.answerIds;
		return this.editing ? ids : [...new Set([...this.poolOrder, ...ids])].filter(id => ids.includes(id));
	}

	private get visibleGroups() {
		const available = gridItems(this).map(item => this.itemId(item));
		const listed = this.categories.filter(id => available.includes(id));
		// WebWriter can supply a blank heading when it repairs the required group.
		return listed.length ? listed : available.slice(0, 1);
	}

	private itemId(item: HTMLElement) {
		if (item.id) return item.id;
		let id = this.#temporaryIds.get(item);
		if (!id) this.#temporaryIds.set(item, id = newGridId());
		return id;
	}

	private registerGroup(id: string) {
		if (this.categories.includes(id)) return;
		const heading = gridItems(this).find(item => this.itemId(item) === id);
		if (!heading) return;
		if (!heading.id) heading.id = id;
		this.categories = [...this.categories, id];
	}

	private get showFeedback() {
		return this.graded && this.detailedFeedback;
	}

	private cardTargets(assignments = this.solution, multiGroup = this.multiGroup) {
		const answers = new Set(this.answerIds);
		const targets = new Map<string, Set<string>>();
		for (const catId of this.visibleGroups) {
			for (const cardId of assignments[catId] ?? []) {
				if (!answers.has(cardId)) continue;
				const groups = targets.get(cardId);
				if (!groups) targets.set(cardId, new Set([catId]));
				else if (multiGroup) groups.add(catId);
			}
		}
		return targets;
	}

	private changeMultiGroup(event: Event) {
		const control = event.currentTarget as SlSwitch;
		if (!this.editing || !this.isConnected) {
			control.checked = this.multiGroup;
			return;
		}
		const enabled = control.checked;
		if (enabled === this.multiGroup) return;
		void transaction(this, async () => {
			if (!enabled) {
				const targets = this.cardTargets(this.solution, false);
				const solution = { ...this.solution };
				for (const catId of this.visibleGroups) {
					const cards = solution[catId];
					if (!cards) continue;
					const kept = cards.filter(id => targets.get(id)?.has(catId) ?? true);
					if (kept.length) solution[catId] = kept;
					else delete solution[catId];
				}
				this.solution = solution;
			}
			this.multiGroup = enabled;
			await this.updateComplete;
		});
	}

	private addGroup = () => {
		if (!this.isConnected || !this.editing) return;
		const item = createGridItem(this.ownerDocument);
		void transaction(this, async () => {
			for (const id of this.visibleGroups) this.registerGroup(id);
			this.insertBefore(item, this.answerItems[0] ?? this.feedbackElement);
			this.categories = [...this.categories, item.id];
			await this.updateComplete;
			if (item.firstElementChild) this.placeCaret(item.firstElementChild);
		});
	};

	private addItem = () => {
		if (!this.isConnected || !this.editing) return;
		const item = createGroupAnswer(this.ownerDocument);
		void transaction(this, async () => {
			this.insertBefore(item, this.feedbackElement);
			await this.updateComplete;
			if (item.firstElementChild) this.placeCaret(item.firstElementChild);
		});
	};

	private moveInMap(map: CategorizeSolution, cardId: string, sourceCat: string | undefined, targetCat: string | undefined): CategorizeSolution {
		const next: CategorizeSolution = {};
		for (const [catId, cardIds] of Object.entries(map)) {
			const filtered = this.multiGroup && catId !== sourceCat ? cardIds : cardIds.filter(id => id !== cardId);
			if (filtered.length) next[catId] = filtered;
		}
		if (targetCat && !next[targetCat]?.includes(cardId)) next[targetCat] = [...(next[targetCat] ?? []), cardId];
		return next;
	}

	private handleCardDrop = ({ detail }: CustomEvent<DragCommitDetail>) => {
		const item = this.answerItems.find(item => item === detail.item || this.itemId(item) === detail.item.dataset.cardId);
		if (!item) return;
		const cardId = this.itemId(item);
		const sourceCat = detail.source?.dataset.categoryId;
		const targetCat = detail.target.dataset.categoryId;
		if (!this.placeCard(item, targetCat, sourceCat)) return;
		if (this.multiGroup && sourceCat && detail.item.matches(":focus-within")) {
			// Each placement has its own drag key. Restore focus when the original placement goes away.
			void this.updateComplete.then(() => {
				const card = targetCat
					? this.renderRoot.querySelector<HTMLElement>(`.bucket[data-category-id="${CSS.escape(targetCat)}"] .grid-card[data-card-id="${CSS.escape(cardId)}"]`)
					: item.shadowRoot?.querySelector<HTMLElement>(".grid-card");
				(card?.querySelector<HTMLElement>(".drag-handle") ?? card)?.focus({ preventScroll: true });
			});
		}
	};

	private placeCard(item: HTMLElement, targetCat: string | undefined, sourceCat?: string) {
		if (!this.isConnected || (targetCat && !this.visibleGroups.includes(targetCat))) return false;
		const cardId = this.itemId(item);
		if (this.editing) {
			if (targetCat) this.registerGroup(targetCat);
			if (!item.id) item.id = cardId;
			this.solution = this.moveInMap(this.solution, cardId, sourceCat, targetCat);
		} else {
			if (this.graded) return false;
			this.placements = this.moveInMap(this.placements, cardId, sourceCat, targetCat);
		}
		return true;
	}

	private placeFromOptions(cardId: string, catId: string) {
		const item = this.answerItems.find(item => this.itemId(item) === cardId);
		const assignments = this.editing ? this.solution : this.placements;
		if (!item || this.cardTargets(assignments).get(cardId)?.has(catId)) return;
		void transaction(this, async () => {
			if (this.placeCard(item, catId)) await this.updateComplete;
		});
	}

	private removePlacement(cardId: string, catId: string) {
		const item = this.answerItems.find(item => this.itemId(item) === cardId);
		const assignments = this.editing ? this.solution : this.placements;
		if (!item || !this.visibleGroups.includes(catId) || !assignments[catId]?.includes(cardId)) return;
		void transaction(this, async () => {
			if (!this.placeCard(item, undefined, catId)) return;
			await this.updateComplete;
			const group = gridItems(this).find(heading => heading.id === catId);
			group?.shadowRoot?.querySelector<HTMLElement>(".group-place")?.focus({ preventScroll: true });
		});
	}

	private correctCount(targets: Map<string, Set<string>>, actual: Map<string, Set<string>>) {
		return Array.from(targets).filter(([cardId, groups]) => {
			const placed = actual.get(cardId);
			return placed?.size === groups.size && Array.from(groups).every(group => placed.has(group));
		}).length;
	}

	private groupNames(groups: Iterable<string>) {
		return Array.from(groups, id => gridItemText(this, id)).filter(Boolean).join(", ");
	}

	checkValidity(): boolean {
		return true;
	}

	reset(): void {
		this.graded = false;
		this.detailedFeedback = false;
		this.placements = {};
		this.poolOrder = randomizeArray(this.answerIds);
	}

	checkAnswer(detailedFeedback = false): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		const targets = this.cardTargets();
		const total = targets.size;
		if (total === 0) return 0;

		const correct = this.correctCount(targets, this.cardTargets(this.placements));
		return this.gradingMethod === "pass-fail"
			? scoreAllOrNothing(correct, total)
			: scoreProportion(correct, total);
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		migrateCategorizeGrid(this);
		migrateCategorizeItems(this);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected willUpdate(changed: PropertyValues): void {
		super.willUpdate(changed);
		if (!this.poolOrder.length && this.answerIds.length) {
			this.poolOrder = randomizeArray(this.answerIds);
		}
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		const items = new Map(gridItems(this).map(item => [this.itemId(item), item]));
		const placed = this.cardTargets(this.editing ? this.solution : this.placements);
		const options = new Map(this.answerItems.map(item => [this.itemId(item), itemContentLabel(item)]));
		const orderedOptions = this.optionIds.map((id, index) => ({
			id, label: options.get(id) || this.msg(str`Option ${index + 1}`),
		}));
		for (const [index, id] of this.visibleGroups.entries()) {
			const heading = items.get(id) as HTMLElementTagNameMap["webwriter-grid-item"] | undefined;
			if (!heading) continue;
			heading.placeholder = this.msg(str`Group ${index + 1}`);
			const name = itemContentLabel(heading) || heading.placeholder;
			heading.groupPicker = {
				label: this.msg(str`Add item to ${name}`),
				options: orderedOptions.filter(option => !placed.get(option.id)?.has(id)),
				disabled: !this.editing && this.graded,
				place: cardId => this.placeFromOptions(cardId, id),
			};
		}
		const targets = !this.editing && this.showFeedback ? this.cardTargets() : undefined;
		const dragged = this.#drag.item;
		for (const item of this.answerItems) {
			const id = this.itemId(item);
			const groups = placed.get(id);
			const missing = Array.from(targets?.get(id) ?? []).filter(group => !groups?.has(group));
			item.cardView = {
				draggable: this.editing || !this.graded,
				dimmed: !this.multiGroup && Boolean(groups) && dragged !== item && dragged?.dataset.cardId !== id,
				counterpartHovered: Boolean(groups) && id === this.hoveredGroupCard,
				correction: missing.length && (this.multiGroup || !groups) ? this.groupNames(missing) : null,
			};
			items.set(id, item);
		}
		assignGridSlots(this, items);
	}

	private trackGroupHover(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		const bucket = event.currentTarget as HTMLElement;
		// The group frame receives pointer events underneath the previews so it can capture selection.
		const hovered = Array.from(bucket.querySelectorAll<HTMLElement>(".grid-card[data-card-id]:not([data-ww-dragging])")).find(card => {
			const { left, right, top, bottom } = card.getBoundingClientRect();
			return event.clientX >= left && event.clientX < right && event.clientY >= top && event.clientY < bottom;
		});
		this.hoveredGroupCard = hovered?.dataset.cardId;
	}

	private renderAnswerCard(cardId: string) {
		const item = this.answerItems.find(child => this.itemId(child) === cardId);
		const canDrag = this.editing || !this.graded;
		return html`<div class="grid-card-wrap"
			@pointerenter=${(event: PointerEvent) => { if (event.pointerType !== "touch") this.hoveredPoolCard = cardId; }}
			@pointerleave=${() => { this.hoveredPoolCard = undefined; }}>
			<slot data-child-id=${cardId} data-card-id=${cardId}
				data-ww-drag=${ifDefined(canDrag ? "cat-card" : undefined)}
				?data-ww-drag-handle=${this.editing || hasNonTextContent(item)}></slot>
		</div>`;
	}

	private renderPlacedCard(cardId: string, catId: string, expectedGroups: Set<string> | undefined) {
		const editing = this.editing;
		const showFb = !editing && this.showFeedback;
		const correct = showFb && Boolean(expectedGroups?.has(catId));
		const wrong = showFb && !correct;
		const item = this.answerItems.find(child => this.itemId(child) === cardId);
		const embedded = hasNonTextContent(item);
		const canDrag = editing || !this.graded;
		const content = itemContent(item);
		const image = content instanceof HTMLImageElement ? content : content?.querySelector("img");
		const source = image?.currentSrc || image?.getAttribute("src") || (content instanceof HTMLVideoElement ? content.poster : "");
		const label = itemContentLabel(item) || this.msg("Item");
		const removeLabel = this.msg(str`Remove ${label} from this group`);

		return html`<div class="grid-card-wrap">
			<div
				class=${classMap({
					"grid-card": true,
					embedded,
					correct,
					wrong,
					"counterpart-hovered": cardId === this.hoveredPoolCard,
				})}
				data-card-id=${cardId}
				data-ww-key=${this.multiGroup ? JSON.stringify([catId, cardId]) : cardId}
				data-ww-drag=${ifDefined(canDrag ? "cat-card" : undefined)}
				aria-label=${embedded ? label : nothing}
			>
				${canDrag && (editing || embedded)
					? html`<button type="button" class="drag-handle" data-ww-drag-handle aria-label=${this.msg("Move")}>
						<sl-icon src=${GripVerticalIcon} aria-hidden="true"></sl-icon>
					</button>`
					: nothing}
				<span class="card-preview">
					${source ? html`<img src=${source} alt=${image?.alt || label} draggable="false">` : label}
				</span>
				${canDrag ? html`<button type="button" class="remove-placement" aria-label=${removeLabel}
					title=${removeLabel} data-ww-capture-selection="false" contenteditable="false"
					@pointerdown=${(event: PointerEvent) => event.stopPropagation()}
					@click=${() => this.removePlacement(cardId, catId)}>
					<sl-icon src=${XIcon} aria-hidden="true"></sl-icon>
				</button>` : nothing}
			</div>
			${wrong
				? html`<span class="correction" aria-label=${this.msg("Solution")}>${this.groupNames(expectedGroups ?? [])}</span>`
				: nothing}
		</div>`;
	}

	protected renderHelperSwitches() {
		const label = this.msg("Multi-group");
		return html`<sl-switch class="multi-group-switch edit-only" title=${label} .checked=${this.multiGroup}
			data-ww-capture-selection="false" @sl-change=${this.changeMultiGroup}>
			<span class="multi-group-label">${label}</span>
			<span class="multi-group-label-short" aria-hidden="true">${this.msg("Multi")}</span>
		</sl-switch>`;
	}

	protected renderAnswer() {
		const editing = this.editing;
		const targets = this.cardTargets();
		const total = targets.size;
		const assignments = editing ? this.solution : this.placements;
		const placed = editing ? targets : this.cardTargets(this.placements);
		const poolCards = this.optionIds;
		const groups = this.visibleGroups;

		let helper = "";
		if (!editing && this.showFeedback) {
			const correct = this.correctCount(targets, placed);
			helper = this.multiGroup ? this.msg(str`${correct} of ${total} items are in all the right groups.`)
				: this.msg(str`${correct} of ${total} items are in the right group.`);
		} else if (!editing && this.graded) {
			helper = "";
		} else if (this.multiGroup) {
			helper = editing ? this.msg("Place each item in all its correct groups.")
				: this.msg("Drag items into their groups, or use + to choose from Options.");
		} else {
			helper = editing ? this.msg("Place each item in its correct group.")
				: this.msg("Drag items into a group, or use + to choose from Options.");
		}

		return html`
			${this.HelperRow(helper, html`
				<button type="button" class="header-control helper-action edit-only add-item" data-ww-capture-selection="false" @click=${this.addItem}>
					${this.msg("Add item")}
				</button>
				<button type="button" class="header-control helper-action edit-only add-group" data-ww-capture-selection="false" @click=${this.addGroup}>
					${this.msg("Add group")}
				</button>
			`)}
			<div @ww-dragcommit=${this.handleCardDrop}>
				<div class="buckets">
					${groups.map(catId => {
						const cardIds = Array.from(new Set(assignments[catId])).filter(id => placed.get(id)?.has(catId));
						return html`<div class="bucket" data-ww-drop="cat-card" data-category-id=${catId}
							@pointermove=${this.trackGroupHover} @pointerleave=${() => { this.hoveredGroupCard = undefined; }}>
							<slot class="group-slot" data-child-id=${catId}></slot>
							<div class=${classMap({ "drop-zone": true, "bucket-zone": true, filled: cardIds.length > 0 })}>
								${cardIds.map(id => this.renderPlacedCard(id, catId, targets.get(id)))}
								${cardIds.length === 0
									? html`<span class="slot-placeholder">${this.graded ? this.msg("No answer") : this.msg("Empty")}</span>`
									: nothing}
							</div>
						</div>`;
					})}
				</div>
				<div class="grid-pool" data-ww-drop="cat-card">
						<span class="pool-label">${this.msg("Options")}</span>
						${poolCards.length
							? poolCards.map(id => this.renderAnswerCard(id))
							: html`<span class="slot-placeholder">${this.msg("Empty")}</span>`}
				</div>
			</div>
		`;
	}
}
