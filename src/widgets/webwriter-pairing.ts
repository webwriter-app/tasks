import type { MsgFn } from "@lit/localize";
import type SlSwitch from "@shoelace-style/shoelace/dist/components/switch/switch.component.js";
import { announcer, type Announcer } from "@webwriter/widget/announce";
import { PointerGesture } from "@webwriter/widget/gesture";
import { transaction } from "@webwriter/widget/transaction";
import { str } from "@lit/localize";
import ColumnInsertLeftIcon from "@tabler/icons/outline/column-insert-left.svg";
import ColumnInsertRightIcon from "@tabler/icons/outline/column-insert-right.svg";
import { html, nothing, svg, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { name as packageId } from "../../package.json";
import ConnectedPairsIcon from "../icons/pairing.svg";
import { registerQuizType } from "../model/quiz-api";
import { scoreAllOrNothing, scorePenalizedSelection } from "../model/scoring";
import { newGridId } from "../components/grid-helpers";
import { createPairingItem, migratePairingColumns } from "../components/migrate-pairing-columns";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { BiMap } from "../model/bi-map";
import { itemContentLabel } from "../components/item-content";
import { randomizeArray } from "../model/randomize-array";
import { messageFor } from "../components/localization";
import { pairingStyles } from "../components/pairing-styles";
import { WebwriterTask } from "../components/webwriter-task";
import { selfAssessmentOption } from "../components/rubric-popover";
import "./webwriter-pairing-column";
import { WebwriterPairingItem, type PairingSide } from "./webwriter-pairing-item";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-pairing": WebwriterPairing;
	}
}

type PairingGradingMethod = "ungraded" | "partial" | "pass-fail" | "self-assess";

type Link = [left: string, right: string];
type Columns = Record<PairingSide, WebwriterPairingItem[]>;
type Point = { x: number; y: number };

const sides = ["left", "right"] as const;
const opposite = (side: PairingSide): PairingSide => side === "left" ? "right" : "left";
const sameLink = ([a, b]: Link, [left, right]: Link) => a === left && b === right;

registerQuizType({
	packageId,
	widgetPosition: 60,
	section: "arrange",
	id: "webwriter-pairing",
	getName: (locale, translate = messageFor(locale)) => translate("Pairing"),
	icon: ConnectedPairsIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-pairing");
		migratePairingColumns(task);
		return task;
	},
	matches: element => element.localName === "webwriter-pairing",
});

/**
 * An answer where learners match items into pairs.
 *
 * The two `<webwriter-pairing-column>` children contain the editable items.
 */
@customElement("webwriter-pairing")
export class WebwriterPairing extends WebwriterTask {
	/** @internal */
	static shadowRootOptions = {
		...WebwriterTask.shadowRootOptions,
		slotAssignment: "manual" as const,
	};

	static styles = pairingStyles;

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every pair matches."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per correct pair"),
					description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly matched pair."),
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

	/** Whether points are awarded per correct pair (`partial`) or all-or-nothing (`pass-fail`). */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: PairingGradingMethod = "partial";

	/**
	 * The pairs counting as correct, as tuples of the two item IDs. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: Link[] = [];

	/** Allow an item to connect to several items across the two columns. */
	@property({ type: Boolean, attribute: "multiple-connections", reflect: true })
	accessor multipleConnections = false;

	@state() private accessor graded = false;
	@state() private accessor detailedFeedback = false;
	@state() private accessor assignments: Link[] = [];
	@state() private accessor hoveredItem: WebwriterPairingItem | null = null;
	@state() private accessor selectedItem: WebwriterPairingItem | null = null;

	#rightOrder: WebwriterPairingItem[] = [];
	#temporaryIds = new WeakMap<WebwriterPairingItem, string>();
	#active: { item: WebwriterPairingItem; cursor: Point | null; listeners: AbortController } | null = null;
	#gesture: PointerGesture | null = null;
	#suppressClick = false;
	#live: Announcer | null = null;
	#resize = new ResizeObserver(() => this.positionLines());
	#itemObserver = new MutationObserver(() => this.requestUpdate());

	private get columnElements() {
		return this.querySelectorAll(":scope > webwriter-pairing-column") as NodeListOf<HTMLElementTagNameMap["webwriter-pairing-column"]>;
	}

	private get columns(): Columns {
		const [left, right] = Array.from(this.columnElements, column =>
			Array.from(column.querySelectorAll(":scope > webwriter-pairing-item")) as WebwriterPairingItem[]);
		return { left: left ?? [], right: right ?? [] };
	}

	private get rightItems() {
		const { right } = this.columns;
		if (this.editing) return right;
		const ordered = this.#rightOrder.filter(item => right.includes(item));
		return [...ordered, ...right.filter(item => !ordered.includes(item))];
	}

	private get locked() {
		return !this.editing && this.graded;
	}

	private sideOf(item: WebwriterPairingItem) {
		const [left, right] = this.columnElements;
		return item.parentElement === left ? "left" : item.parentElement === right ? "right" : undefined;
	}

	private idOf(item: WebwriterPairingItem) {
		if (item.id) return item.id;
		let id = this.#temporaryIds.get(item);
		if (!id) this.#temporaryIds.set(item, id = newGridId());
		return id;
	}

	private validLinks(links: Link[], columns: Columns) {
		if (!Array.isArray(links)) return [];
		const left = new Set(columns.left.map(item => this.idOf(item)));
		const right = new Set(columns.right.map(item => this.idOf(item)));
		const unique: Link[] = [];
		for (const link of links) {
			if (Array.isArray(link) && left.has(link[0]) && right.has(link[1]) && !unique.some(other => sameLink(other, link))) unique.push(link);
		}
		return this.multipleConnections ? unique : this.oneToOne(unique);
	}

	private oneToOne(links: Link[]) {
		// Keep the first connection for each endpoint when switching to one-to-one.
		const used = new Set<string>();
		return links.filter(([a, b]) => {
			if (used.has(a) || used.has(b)) return false;
			used.add(a);
			used.add(b);
			return true;
		});
	}

	private addItem(side: PairingSide) {
		if (!this.isConnected || !this.editing) return;
		const column = this.columnElements[side === "left" ? 0 : 1];
		if (!column) return;
		const item = createPairingItem(this.ownerDocument);
		void transaction(this, async () => {
			column.append(item);
			await this.updateComplete;
			if (item.firstChild) this.placeCaret(item.firstChild);
		});
	}

	private changeMultipleConnections = (event: Event) => {
		const control = event.currentTarget as SlSwitch;
		if (!this.editing || !this.isConnected) {
			control.checked = this.multipleConnections;
			return;
		}
		const enabled = control.checked;
		void transaction(this, async () => {
			this.cancelConnection();
			if (!enabled) {
				const single = this.oneToOne(this.validLinks(this.solution, this.columns));
				if (single.length !== this.solution?.length) this.solution = single;
			}
			this.multipleConnections = enabled;
			await this.updateComplete;
		});
	};

	private pointerOverItem = (event: PointerEvent) => {
		if (event.pointerType === "touch") return;
		const item = event.composedPath().find(node => node instanceof WebwriterPairingItem);
		this.hoveredItem = item && this.sideOf(item) ? item : null;
	};

	private pointerLeftBoard = (event: PointerEvent) => {
		if (event.pointerType !== "touch") this.hoveredItem = null;
	};

	private updateSelectedItem = () => {
		const selection = this.ownerDocument.getSelection();
		const range = selection?.rangeCount === 1 ? selection.getRangeAt(0) : null;
		const container = range?.commonAncestorContainer;
		if (!range || !container || !this.contains(container)) {
			this.selectedItem = null;
			return;
		}
		const selectedNode = range.startContainer === range.endContainer && range.endOffset === range.startOffset + 1
			? container.childNodes[range.startOffset] : undefined;
		const element = container instanceof Element ? container : container.parentElement;
		const item = selectedNode instanceof WebwriterPairingItem ? selectedNode : element?.closest("webwriter-pairing-item");
		this.selectedItem = item && this.sideOf(item) ? item : null;
	};

	private connectorClick = (event: MouseEvent) => {
		if (this.#suppressClick && event.detail > 0) return;
		const item = this.connectorItem(event);
		if (!item) return;
		const source = this.#active?.item;
		if (source === item) this.cancelConnection();
		else if (source && this.sideOf(source) !== this.sideOf(item)) void this.connect(source, item);
		else this.startConnection(item, event.detail ? { x: event.clientX, y: event.clientY } : null, true);
	};

	private connectorKey = (event: KeyboardEvent) => {
		if (!this.#active || !["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) return;
		const item = this.connectorItem(event);
		const side = item && this.sideOf(item);
		const sourceSide = this.sideOf(this.#active.item);
		if (!item || !side || !sourceSide) return;
		const candidates = sourceSide === "left" ? this.rightItems : this.columns.left;
		const step = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
		const at = candidates.indexOf(item);
		const next = candidates[at < 0 ? (step === 1 ? 0 : candidates.length - 1) : (at + step + candidates.length) % candidates.length];
		if (!next?.connector) return;
		event.preventDefault();
		next.connector.focus();
	};

	private connectorItem(event: Event) {
		const path = event.composedPath();
		const item = path.find(node => node instanceof WebwriterPairingItem);
		return item instanceof WebwriterPairingItem && item.connector && path.includes(item.connector) && this.sideOf(item) && !this.locked
			? item : undefined;
	}

	private connectorDown = async (event: PointerEvent) => {
		this.#suppressClick = false;
		const item = this.connectorItem(event);
		if (!item?.connector || this.#gesture || event.button !== 0 || !event.isPrimary) return;
		const gesture = this.#gesture = new PointerGesture(item.connector, event);
		for await (const sample of gesture) {
			if (gesture.cancelled || this.locked || !this.sideOf(item)) break;
			this.#suppressClick = true;
			const point = { x: sample.clientX, y: sample.clientY };
			if (this.#active?.item !== item) this.startConnection(item, point, false);
			else this.followCursor(point);
		}
		this.#gesture = null;
		if (!gesture.moved) return;
		this.#suppressClick = true;
		const side = this.sideOf(item);
		const target = side && !gesture.cancelled && this.columns[opposite(side)].find(candidate => {
			const rect = candidate.connector?.getBoundingClientRect();
			const { clientX, clientY } = gesture.last;
			return rect && clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
		});
		if (target) void this.connect(item, target);
		else this.cancelConnection();
	};

	private startConnection(item: WebwriterPairingItem, cursor: Point | null, followPointer: boolean) {
		this.cancelConnection();
		const listeners = new AbortController();
		const { signal } = listeners;
		this.#active = { item, cursor, listeners };
		const view = this.ownerDocument.defaultView;
		if (followPointer) {
			view?.addEventListener("pointermove", event => this.followCursor({ x: event.clientX, y: event.clientY }), { signal, passive: true });
			view?.addEventListener("click", event => {
				if (!this.connectorItem(event)) this.cancelConnection();
			}, { signal, capture: true });
		}
		view?.addEventListener("keydown", event => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			this.cancelConnection();
		}, { signal, capture: true });
		view?.addEventListener("blur", this.cancelConnection, { signal });
		view?.addEventListener("scroll", () => this.positionPreview(), { signal, capture: true, passive: true });
		this.#live?.announce(this.msg("Connect the items by their dots."));
		this.requestUpdate();
		this.positionPreview();
	}

	private followCursor(point: Point) {
		if (!this.#active) return;
		this.#active.cursor = point;
		this.positionPreview();
	}

	private cancelConnection = () => {
		if (!this.#active) return;
		this.#active.listeners.abort();
		this.#active = null;
		this.requestUpdate();
		this.positionPreview();
	};

	private async connect(source: WebwriterPairingItem, target: WebwriterPairingItem) {
		this.cancelConnection();
		const side = this.sideOf(source);
		if (!side || this.sideOf(target) !== opposite(side) || this.locked) return;
		const [left, right] = side === "left" ? [source, target] : [target, source];
		const link: Link = [this.idOf(left), this.idOf(right)];
		const editing = this.editing;
		const columns = this.columns;
		const links = this.validLinks(editing ? this.solution : this.assignments, columns);
		const removing = links.some(other => sameLink(other, link));
		let next: Link[];
		if (removing) next = links.filter(other => !sameLink(other, link));
		else if (this.multipleConnections) next = [...links, link];
		else {
			const pairs = new BiMap<string, string>();
			for (const [a, b] of links) pairs.set(a, b);
			const previousLeft = pairs.getKey(link[1]);
			const previousRight = pairs.getValue(link[0]);
			pairs.set(...link);
			if (previousLeft && previousRight) pairs.set(previousLeft, previousRight);
			next = columns.left.flatMap(item => {
				const id = this.idOf(item);
				const match = pairs.getValue(id);
				return match ? [[id, match] as Link] : [];
			});
		}
		if (editing) {
			await transaction(this, async () => {
				if (!left.id) left.id = link[0];
				if (!right.id) right.id = link[1];
				this.solution = next;
				await this.updateComplete;
			});
		} else this.assignments = next;
		this.#live?.announce(removing ? this.msg("Connection removed.") : this.msg("Connection added."));
	}

	private correctCount(key: Link[], connections: Link[]) {
		return key.filter(link => connections.some(other => sameLink(other, link))).length;
	}

	checkValidity(): boolean {
		return true;
	}

	checkAnswer(detailedFeedback: boolean): number {
		this.#gesture?.cancel();
		this.cancelConnection();
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		const columns = this.columns;
		const key = this.validLinks(this.solution, columns);
		const connections = this.validLinks(this.assignments, columns);
		const correct = this.correctCount(key, connections);
		const wrong = this.multipleConnections ? connections.length - correct : 0;
		if (this.gradingMethod === "pass-fail") return scoreAllOrNothing(wrong ? 0 : correct, key.length);
		return scorePenalizedSelection(correct, wrong, key.length);
	}

	reset(): void {
		this.#gesture?.cancel();
		this.cancelConnection();
		this.graded = false;
		this.detailedFeedback = false;
		this.#rightOrder = randomizeArray(this.columns.right);
		this.assignments = [];
	}

	connectedCallback() {
		super.connectedCallback();
		this.#itemObserver.observe(this, { childList: true, characterData: true, subtree: true, attributeFilter: ["alt", "aria-label", "id", "title"] });
		this.ownerDocument.addEventListener("selectionchange", this.updateSelectedItem);
		this.updateSelectedItem();
		if (this.shadowRoot) this.#live = announcer(this.shadowRoot);
	}

	disconnectedCallback() {
		this.#gesture?.cancel();
		this.cancelConnection();
		this.hoveredItem = null;
		this.selectedItem = null;
		this.ownerDocument.removeEventListener("selectionchange", this.updateSelectedItem);
		this.#itemObserver.disconnect();
		this.#resize.disconnect();
		this.#live?.release();
		this.#live = null;
		super.disconnectedCallback();
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		migratePairingColumns(this);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected willUpdate(changed: PropertyValues): void {
		super.willUpdate(changed);
		if (changed.has("solution") || changed.has("multipleConnections")) this.assignments = [];
		if (this.hoveredItem && !this.sideOf(this.hoveredItem)) this.hoveredItem = null;
		if (this.selectedItem && !this.sideOf(this.selectedItem)) this.selectedItem = null;
		if (!this.#rightOrder.length) this.#rightOrder = randomizeArray(this.columns.right);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (this.#active && (this.locked || !this.sideOf(this.#active.item))) this.cancelConnection();
		const columns = this.columns;
		const key = this.validLinks(this.solution, columns);
		const links = this.editing ? key : this.validLinks(this.assignments, columns);
		const items = new Map([...columns.left, ...columns.right].map(item => [this.idOf(item), item]));
		const showFeedback = this.locked && this.detailedFeedback;
		const updates: Promise<unknown>[] = [];
		sides.forEach((side, sideIndex) => {
			const column = this.columnElements[sideIndex];
			if (!column) return;
			const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[data-side="${side}"]`)!;
			if (slot.assignedElements()[0] !== column) slot.assign(column);
			column.items = side === "left" ? columns.left : this.rightItems;
			updates.push(column.updateComplete);
			column.items.forEach((item, index) => {
				const id = this.idOf(item);
				const connected = links.filter(link => link[sideIndex] === id).map(link => link[1 - sideIndex]);
				const expected = showFeedback ? key.filter(link => link[sideIndex] === id).map(link => link[1 - sideIndex]) : [];
				const partners = connected.map(partner => itemContentLabel(items.get(partner))).filter(Boolean).join(", ");
				const missing = expected.filter(partner => !connected.includes(partner)).map(partner => itemContentLabel(items.get(partner))).filter(Boolean);
				const feedback = missing.length ? `${this.msg("Solution")}: ${missing.join(", ")}` : "";
				item.connectorView = {
					side,
					label: itemContentLabel(item) || (side === "left" ? this.msg(str`Left item ${index + 1}`) : this.msg(str`Right item ${index + 1}`)),
					description: [partners, feedback].filter(Boolean).join(". "),
					locked: this.locked,
					connected: connected.length > 0,
					active: this.#active?.item === item,
				};
				updates.push(item.updateComplete);
			});
		});
		this.#resize.disconnect();
		const board = this.renderRoot.querySelector(".pair-board");
		if (board && this.isConnected) this.#resize.observe(board);
		for (const item of items.values()) if (this.isConnected) this.#resize.observe(item);
		void Promise.all(updates).then(() => {
			if (this.isConnected) this.positionLines();
		});
	}

	private positionLines() {
		const board = this.renderRoot.querySelector(".pair-board");
		if (!board) return;
		const bounds = board.getBoundingClientRect();
		if (!bounds.width || !bounds.height) return;
		const { left, right } = this.columns;
		const points = new Map([...left, ...right].flatMap(item => {
			const rect = item.connector?.getBoundingClientRect();
			return rect ? [[this.idOf(item), { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }] as const] : [];
		}));
		for (const line of board.querySelectorAll<SVGLineElement>("line[data-left]")) {
			const from = points.get(line.dataset.left!);
			const to = points.get(line.dataset.right!);
			if (from && to) this.drawLine(line, bounds, from, to);
		}
		this.positionPreview();
	}

	private positionPreview() {
		const board = this.renderRoot.querySelector(".pair-board");
		const line = board?.querySelector<SVGLineElement>(".connection-preview");
		if (!board || !line) return;
		const rect = this.#active?.item.connector?.getBoundingClientRect();
		line.style.visibility = rect ? "visible" : "hidden";
		if (!rect) return;
		const bounds = board.getBoundingClientRect();
		if (!bounds.width || !bounds.height) return;
		const from = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		this.drawLine(line, bounds, from, this.#active?.cursor ?? from);
	}

	private drawLine(line: SVGLineElement, bounds: DOMRect, from: Point, to: Point) {
		line.setAttribute("x1", `${100 * (from.x - bounds.left) / bounds.width}%`);
		line.setAttribute("y1", `${100 * (from.y - bounds.top) / bounds.height}%`);
		line.setAttribute("x2", `${100 * (to.x - bounds.left) / bounds.width}%`);
		line.setAttribute("y2", `${100 * (to.y - bounds.top) / bounds.height}%`);
	}

	protected renderHelperSwitches() {
		const label = this.msg("Multi-connect");
		return html`<sl-switch class="multiple-connections edit-only" title=${label} .checked=${this.multipleConnections}
			@sl-change=${this.changeMultipleConnections}>
			<span class="pair-control-full">${label}</span>
			<span class="pair-control-short" aria-hidden="true">${this.msg("Multi")}</span>
		</sl-switch>`;
	}

	private addItemButton(side: PairingSide) {
		const left = side === "left";
		const label = left ? this.msg("Add left item") : this.msg("Add right item");
		const short = left ? this.msg("Left") : this.msg("Right");
		return html`<button type="button" class="header-control edit-only helper-action pair-add-item add-${side}-item"
			aria-label=${label} title=${label} data-ww-capture-selection="false" @click=${() => this.addItem(side)}>
			<sl-icon src=${left ? ColumnInsertLeftIcon : ColumnInsertRightIcon} aria-hidden="true"></sl-icon>
			<span class="pair-control-full">${label}</span>
			<span class="pair-control-short" aria-hidden="true">${short}</span>
		</button>`;
	}

	protected renderAnswer() {
		const columns = this.columns;
		const showFeedback = this.locked && this.detailedFeedback;
		const key = this.validLinks(this.solution, columns);
		const connections = this.editing ? key : this.validLinks(this.assignments, columns);
		const highlightedItem = this.#active?.item ?? this.hoveredItem ?? this.selectedItem;
		const highlightedId = highlightedItem ? this.idOf(highlightedItem) : null;
		const isUnrelated = ([a, b]: Link) => highlightedId !== null && highlightedId !== a && highlightedId !== b;
		const count = this.correctCount(key, connections);
		const hint = !this.locked ? this.editing ? this.msg("Connect the matching items.") : this.msg("Connect the items by their dots.")
			: showFeedback ? this.msg(str`${count} of ${key.length} pairs are correct.`) : "";
		return html`${this.HelperRow(hint, html`${sides.map(side => this.addItemButton(side))}`)}
			<div class="pair-board" @click=${this.connectorClick} @keydown=${this.connectorKey} @pointerdown=${this.connectorDown}
				@pointerover=${this.pointerOverItem} @pointerleave=${this.pointerLeftBoard}>
				<slot class="pair-column" data-side="left"></slot>
				<svg class="pair-lines" aria-hidden="true">
					${showFeedback ? key.filter(link => !connections.some(other => sameLink(other, link)))
						.map(link => svg`<line class="expected" ?data-unrelated=${isUnrelated(link)} data-left=${link[0]} data-right=${link[1]}></line>`) : nothing}
					${connections.map(link => svg`<line
						class=${this.editing || (showFeedback && key.some(other => sameLink(other, link))) ? "correct" : showFeedback ? "wrong" : ""}
						?data-unrelated=${isUnrelated(link)} data-left=${link[0]} data-right=${link[1]}></line>`)}
					<line class="connection-preview"></line>
				</svg>
				<slot class="pair-column" data-side="right"></slot>
			</div>`;
	}
}
