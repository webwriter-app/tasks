import type { MsgFn } from "@lit/localize";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import PlusIcon from "@tabler/icons/outline/plus.svg";
import ShuffleIcon from "@tabler/icons/outline/arrows-shuffle.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import { html, nothing, PropertyValues } from "lit";
import { customElement, property, queryAll, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import GripHorizontalIcon from "@tabler/icons/outline/grip-horizontal.svg";
import { name as packageId } from "../../package.json";
import { registerQuizType } from "../model/quiz-api";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { BiMap } from "../model/bi-map";
import { randomizeArray } from "../model/randomize-array";
import { messageFor } from "../components/localization";
import { pairingStyles } from "../components/pairing-styles";
import { WebwriterTask } from "../components/webwriter-task";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-pairing": WebwriterPairing;
	}
}

type PairingMode = "pairing" | "memory";

type PairingQuizState = {
	leftItemIds: string[];
	rightItemIds: string[];
	assignments: BiMap<string, string>;
};

type MemoryGameState = {
	itemIds: string[];
	flippedItemIds: string[];
	matchedItemIds: string[];
};

registerQuizType({
	packageId,
	widgetPosition: 40,
	id: "webwriter-pairing",
	getName: (locale, translate = messageFor(locale)) => translate("Pairing"),
	icon: ShuffleIcon,
	createInstance: () => document.createElement("webwriter-pairing"),
});

/**
 * An answer where learners match items into pairs.
 *
 * The items must be `<webwriter-pairing-item>` children of this element.
 */
@customElement("webwriter-pairing")
export class WebwriterPairing extends WebwriterTask {
	/** @internal */
	static shadowRootOptions = {
		...WebwriterTask.shadowRootOptions,
		slotAssignment: "manual" as const,
	};

	static styles = pairingStyles;

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"sl-icon-button": SlIconButton,
	};

	static actions = {
		...WebwriterTask.actions,
		addPair: { label: (widget: { msg: MsgFn }) => widget.msg("Add Pair") },
	};

	static options = {
		...WebwriterTask.options,
		mode: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Mode"),
			options: [
				{ value: "pairing", label: (widget: { msg: MsgFn }) => widget.msg("Pairing") },
				{ value: "memory", label: (widget: { msg: MsgFn }) => widget.msg("Memory") },
			],
		},
	};

	/**
	 * How learners match the items.
	 *
	 * - `pairing`: All items are visible and learners drag them together.
	 * - `memory`: The items are face down and learners uncover two at a time.
	 */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor mode: PairingMode = "pairing";

	/**
	 * The pairs counting as correct, as tuples of the two item IDs. It is obfuscated in the markup so that learners cannot read it directly.
	 */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution: [string, string][] = [];

	/** @internal */
	@queryAll("slot[data-child-id]")
	accessor slots!: NodeListOf<HTMLSlotElement>;

	#drag = new Drag(this, { can: () => this.editing || !this.graded });

	@state()
	private accessor graded = false;

	@state()
	private accessor detailedFeedback = false;

	private get showFeedback() {
		return this.graded && this.detailedFeedback;
	}

	/** Index of the pair an item belongs to, or -1 if it belongs to none. */
	private pairIndex(itemId: string) {
		return this.solution.findIndex(pair => pair.includes(itemId));
	}

	private addPair() {
		if (!this.isConnected || !this.editing) return;
		const insertItem = () => {
			// Insert new items at a random position to not make the pairing obvious from the order of the items in the DOM.
			const items = Array.from(this.children).filter(child => child.localName === "webwriter-pairing-item" && !child.slot);
			const randomIndex = Math.floor(Math.random() * (items.length + 1));
			const newItem = this.ownerDocument.createElement("webwriter-pairing-item");
			newItem.id = `ww${crypto.randomUUID()}`;
			this.insertBefore(newItem, items[randomIndex] ?? this.feedbackElement);
			return newItem.id;
		};

		// Two new items and the solution that pairs them are one undo step.
		void transaction(this, async () => {
			this.solution = [...this.solution, [insertItem(), insertItem()]];
			await this.updateComplete;
		});
	}

	private removePair(a: string, b: string) {
		if (!this.editing || !this.solution.some(([idA, idB]) => idA === a && idB === b)) return;
		void transaction(this, async () => {
			for (const child of Array.from(this.children)) {
				if (child.localName === "webwriter-pairing-item" && (child.id === a || child.id === b)) child.remove();
			}
			this.solution = this.solution.filter(([idA, idB]) => idA !== a || idB !== b);
			await this.updateComplete;
		});
	}

	private reorderPairs = ({ detail }: CustomEvent<DragCommitDetail>) => {
		const from = Number(detail.key);
		const pairs = [...this.solution];
		if (!pairs[from] || detail.index === null) return;
		pairs.splice(detail.index, 0, ...pairs.splice(from, 1));
		this.solution = pairs;
	};

	private renderAuthoringView() {
		return html`
			<div class="pairs" data-ww-drop="pair" data-ww-drop-position="index" @ww-dragcommit=${this.reorderPairs}>
				${this.solution.map(
					([a, b], index) =>
						html`<div class="pair" data-ww-drag="pair" data-ww-key=${index}>
							<div class="actions">
								<sl-icon-button class="drag-handle" data-ww-drag-handle label=${this.msg("Move pair")} src=${GripHorizontalIcon}></sl-icon-button>
								<sl-icon-button label=${this.msg("Remove pair")} src=${TrashIcon} @click=${() => this.removePair(a, b)}></sl-icon-button>
							</div>
							<div class="pair-content">
								<slot data-child-id=${a}></slot>
								<div class="divider"></div>
								<slot data-child-id=${b}></slot>
							</div>
						</div>`,
				)}
				<div
					@click=${this.addPair}
					@keydown=${(event: KeyboardEvent) => {
						if (event.key !== "Enter" && event.key !== " ") return;
						event.preventDefault();
						this.addPair();
					}}
					id="add-pair"
					role="button"
					tabindex="0"
				>
					<div class="label"><sl-icon src=${PlusIcon}></sl-icon>${this.msg("Add Pair")}</div>
					<!-- Required so that the height of add-pair always matches the height of the pairings -->
					<div class="size-placeholder"></div>
				</div>
			</div>
		`;
	}

	@state()
	private accessor pairingQuiz: PairingQuizState | null = null;

	private resetPairingQuiz() {
		this.pairingQuiz = {
			leftItemIds: randomizeArray(this.solution.map(([a]) => a)),
			rightItemIds: randomizeArray(this.solution.map(([, b]) => b)),
			assignments: new BiMap(),
		};
	}

	private renderPairingView() {
		if (!this.pairingQuiz) return nothing;
		const { leftItemIds, rightItemIds, assignments } = this.pairingQuiz;
		return html`
			<div class="pairing-container" @ww-dragcommit=${this.dropPairingCard}>
				<div class="pairing-grid pairing-left" data-ww-drop="card">
					${leftItemIds.map(
						id =>
							html`<div class="pairing-cell" data-cell-id=${id}>
								<div class="pairing-backdrop"></div>
								${assignments.hasKey(id) ? nothing : this.renderPairingCard(id)}
							</div>`,
					)}
				</div>
				<div class="divider"></div>
				<div class="pairing-grid pairing-right">
					${rightItemIds.map(id => {
						const assignedId = assignments.getKey(id);
						const correct = assignedId !== undefined && this.pairIndex(assignedId) === this.pairIndex(id);
						const feedback = this.showFeedback ? (correct ? " correct" : " incorrect") : "";
						return html`<div
							class=${classMap({ "pairing-cell": true, "pairing-assigned": !!assignedId })}
							data-ww-drop="card"
							data-ww-drop-max="1"
							data-ww-drop-full="swap"
							data-drop-target-id=${id}
						>
							${this.renderPairingCard(id, "pairing-card-normal", false)}
							${assignedId ? this.renderPairingCard(assignedId, `pairing-card-assigned${feedback}`) : nothing}
						</div>`;
					})}
				</div>
			</div>
		`;
	}

	private renderPairingCard(id: string, variant = "", draggable = true) {
		const index = this.showFeedback ? this.pairIndex(id) : -1;
		return html`<div class="pairing-card ${variant}" data-card-id=${id} data-ww-key=${id}
			data-ww-drag=${ifDefined(draggable && !this.graded ? "card" : undefined)}>
			<slot data-child-id=${id}></slot>
			${index < 0 ? nothing : html`<span class="pairing-index">${index + 1}</span>`}
		</div>`;
	}

	private applyPairingDrop(cardId: string, rightId: string | undefined) {
		const { assignments } = this.pairingQuiz!;
		if (rightId === undefined) {
			assignments.deleteKey(cardId);
			return;
		}

		// If both cells are taken, the card that has to make room takes the freed one.
		const displacedId = assignments.getKey(rightId);
		const originId = assignments.getValue(cardId);
		if (displacedId !== undefined && originId !== undefined) assignments.set(displacedId, originId);
		assignments.set(cardId, rightId);
	}

	private dropPairingCard = ({ detail }: CustomEvent<DragCommitDetail>) => {
		if (!detail.key || !this.pairingQuiz) return;
		// Only the right cells carry an ID; the left grid takes a card back.
		this.applyPairingDrop(detail.key, detail.target.dataset.dropTargetId);
		this.requestUpdate("pairingQuiz");
	};

	@state()
	private accessor memoryGame: MemoryGameState | null = null;
	private flipBackTimeout?: ReturnType<typeof setTimeout>;

	private resetMemoryGame() {
		if (this.flipBackTimeout !== undefined) clearTimeout(this.flipBackTimeout);
		this.flipBackTimeout = undefined;
		this.memoryGame = {
			itemIds: randomizeArray(this.solution.flat()),
			flippedItemIds: [],
			matchedItemIds: [],
		};
	}

	private flipMemoryItem(id: string) {
		if (this.graded || !this.memoryGame) return;
		const { flippedItemIds, matchedItemIds } = this.memoryGame;
		if (this.flipBackTimeout !== undefined || flippedItemIds.includes(id) || matchedItemIds.includes(id)) return;

		if (flippedItemIds.length === 0) {
			this.memoryGame = { ...this.memoryGame, flippedItemIds: [id] };
			return;
		}

		const firstId = flippedItemIds[0];
		this.memoryGame = { ...this.memoryGame, flippedItemIds: [firstId, id] };
		const isPair = this.solution.some(([a, b]) => (a === firstId && b === id) || (a === id && b === firstId));

		if (isPair) {
			this.memoryGame = {
				...this.memoryGame,
				flippedItemIds: [],
				matchedItemIds: [...matchedItemIds, firstId, id],
			};
			return;
		}

		this.flipBackTimeout = setTimeout(() => {
			this.flipBackTimeout = undefined;
			this.memoryGame = { ...this.memoryGame!, flippedItemIds: [] };
		}, 800);
	}

	private renderMemoryGame() {
		if (!this.memoryGame) return nothing;
		return html`<p class="print-note">${this.msg("Interactive content: open the document online")}</p>
		<div class="memory-grid">
			${this.memoryGame.itemIds.map(id => {
				const matched = this.memoryGame!.matchedItemIds.includes(id);
				const flipped = matched || this.memoryGame!.flippedItemIds.includes(id);

				return html`<button
					type="button"
					class=${classMap({ "memory-card": true, flipped, matched })}
					?disabled=${this.graded || matched}
					@click=${() => this.flipMemoryItem(id)}
				>
					<span class="memory-card-inner">
						<span class="memory-card-face memory-card-back">?</span>
						<span class="memory-card-face memory-card-front">
							<slot data-child-id=${id}></slot>
						</span>
					</span>
				</button>`;
			})}
		</div>`;
	}

	checkValidity(): boolean {
		return true;
	}

	checkAnswer(detailedFeedback: boolean): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		if (this.solution.length === 0) return 0;

		if (this.mode === "memory") return (this.memoryGame?.matchedItemIds.length ?? 0) / 2 / this.solution.length;

		const assignments = this.pairingQuiz?.assignments;
		const correct = this.solution.filter(([a, b]) => assignments?.getValue(a) === b);
		return correct.length / this.solution.length;
	}

	reset(): void {
		this.graded = false;
		this.detailedFeedback = false;
		if (this.mode === "memory") this.resetMemoryGame();
		else this.resetPairingQuiz();
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		const children = Array.from(this.children).filter(child => child.localName === "webwriter-pairing-item" && !child.slot);
		this.slots.forEach(slot => {
			const refId = slot.dataset.childId;
			const item = children.find(child => child.id === refId);
			if (item) slot.assign(item);
			else slot.assign();
		});
	}

	protected willUpdate(changed: PropertyValues<this>): void {
		if (changed.has("solution") || changed.has("mode")) {
			if (this.mode === "pairing") this.resetPairingQuiz();
			else if (this.mode === "memory") this.resetMemoryGame();
		}
	}

	disconnectedCallback(): void {
		super.disconnectedCallback();
		if (this.flipBackTimeout !== undefined) clearTimeout(this.flipBackTimeout);
		this.flipBackTimeout = undefined;
	}

	protected renderAnswer() {
		if (this.editing) return this.renderAuthoringView();
		if (this.mode === "pairing") return this.renderPairingView();
		if (this.mode === "memory") return this.renderMemoryGame();
		console.warn("[webwriter-pairing] Invalid mode:", this.mode);
		return nothing;
	}
}
