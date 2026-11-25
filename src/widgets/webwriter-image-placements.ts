import { str } from "@lit/localize";
import GripVerticalIcon from "@tabler/icons/outline/grip-vertical.svg";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { name as packageId } from "../../package.json";
import { assignGridSlots, newGridId } from "../components/grid-helpers";
import { gridCardStyles, gridPoolStyles } from "../components/grid-styles";
import { createImagePlacementItem, imagePlacementItems, migrateImagePlacementContent } from "../components/image-placement-content";
import { itemContent, itemContentLabel } from "../components/item-content";
import { messageFor } from "../components/localization";
import PlacementIcon from "../icons/image-placements.svg";
import { registerQuizType } from "../model/quiz-api";
import { randomizeArray } from "../model/randomize-array";
import { scoreAllOrNothing, scoreProportion } from "../model/scoring";
import { imagePlacementCardStyles, WebwriterImagePlacementItem } from "./webwriter-image-placement-item";
import { createEmptyPicture, markerStyle, WebwriterImage, type ImageMarker } from "./webwriter-image";

type PlacementTarget = { kind: "zone" | "piece"; id: string };

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-image-placements": WebwriterImagePlacements;
	}
}

registerQuizType({
	packageId,
	widgetPosition: 95,
	section: "show",
	id: "webwriter-image-placements",
	getName: (locale, translate = messageFor(locale)) => translate("Image Placements"),
	icon: PlacementIcon,
	createInstance: () => {
		const task = document.createElement("webwriter-image-placements");
		task.append(createEmptyPicture(document), createImagePlacementItem(document));
		return task;
	},
});

/** A background with authored drop zones and movable text or image pieces. */
@customElement("webwriter-image-placements")
export class WebwriterImagePlacements extends WebwriterImage {
	static shadowRootOptions: ShadowRootInit = { ...WebwriterImage.shadowRootOptions, slotAssignment: "manual" };
	static styles = [...WebwriterImage.styles, gridCardStyles, gridPoolStyles, imagePlacementCardStyles, css`
		.placement-options .grid-card {
			min-inline-size: min(8rem, 100%);
		}

		.placement-options > slot { display: contents; }
		.placement-options > slot::slotted(webwriter-image-placement-item) {
			inline-size: auto;
			min-inline-size: min(8rem, 100%);
			max-inline-size: 100%;
		}

		@container (inline-size < 22rem) {
			.task-helper-switches:has(.add-item) > button { padding-inline: var(--sl-spacing-2x-small); }
		}

		.piece,
		.zone-button {
			color: inherit;
			font: inherit;
			cursor: pointer;
		}

		.placement-zone {
			position: absolute;
			z-index: 2;
			transform: translate(-50%, -50%);
			box-sizing: border-box;
			border: 2px dashed var(--ww-theme-accent-1, var(--sl-color-primary-600));
			border-radius: var(--sl-border-radius-small);
			background: color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-100)) 30%, transparent);

			&[data-correct="true"] { border-color: var(--ww-success, var(--sl-color-success-700)); }
			&[data-correct="false"] { border-color: var(--ww-danger, var(--sl-color-danger-700)); }
		}

		:is(.placement-zone, .marker-ring)[data-ww-drop="image-piece"][data-ww-drop-over] {
			border-color: var(--ww-theme-accent-1, var(--sl-color-primary-500));
			background-color: var(--sl-color-primary-50);
		}

		.zone-button {
			box-sizing: border-box;
			display: grid;
			place-items: center;
			inline-size: 100%;
			block-size: 100%;
			padding: 0.125rem;
			overflow: hidden;
			border: 0;
			border-radius: inherit;
			background: transparent;
		}

		.zone-button[data-ww-drag] {
			cursor: grab;
			touch-action: none;
		}

		:is(.piece, .zone-button)[aria-pressed="true"] {
			outline: 2px solid var(--ww-theme-accent-1, var(--sl-color-primary-600));
			outline-offset: -2px;
			background: var(--sl-color-primary-50);
		}

		.zone-preview.grid-card {
			position: absolute;
			inset: 2px;
			justify-content: center;
			padding-inline: var(--sl-spacing-2x-small);
			overflow: hidden;
			border: 0;
			background-color: transparent;
			pointer-events: none;
		}

		.zone-preview.grid-card:has(img) { padding: 0; }

		.zone-preview > span {
			min-inline-size: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.zone-preview img {
			display: block;
			inline-size: 100%;
			block-size: 100%;
			object-fit: contain;
		}

		.marker-ring:has(> .zone-preview) > .marker-center {
			inset: 0 auto auto 0;
		}

		.piece-picture {
			display: block;
			inline-size: 6rem;
		}

		.piece-picture img {
			display: block;
			inline-size: 100%;
			block-size: 4rem;
			object-fit: contain;
		}

		.zone-preview .piece-picture {
			inline-size: 100%;
			block-size: 100%;
		}

		.marker-popover-card select {
			max-inline-size: 100%;
			font: inherit;
		}
	`];

	@state() private accessor placements = new Map<string, string>();
	@state() private accessor selectedPiece = "";
	@state() private accessor placementGraded = false;
	@state() private accessor showPlacementFeedback = false;
	@state() private accessor placementStatus = "";
	@state() private accessor hoveredTarget: PlacementTarget | undefined;
	@state() private accessor focusedTarget: PlacementTarget | undefined;
	private pieceOrder: string[] = [];
	#temporaryIds = new WeakMap<HTMLElement, string>();
	#pieceObserver = new MutationObserver(() => this.requestUpdate());
	#placementDrag = new Drag(this, {
		can: () => this.editing ? this.hasImage && this.markers.length > 0 : !this.placementGraded && this.isConfigured,
		lift: { pointerEvents: "none" },
	});

	override connectedCallback() {
		super.connectedCallback();
		this.#pieceObserver.observe(this, {
			subtree: true, characterData: true, attributeFilter: ["id", "aria-label", "title", "poster"],
		});
	}

	override disconnectedCallback() {
		this.#pieceObserver.disconnect();
		this.hoveredTarget = undefined;
		this.focusedTarget = undefined;
		super.disconnectedCallback();
	}

	protected override get isPlacementTask() {
		return true;
	}

	private get pieces() {
		return imagePlacementItems(this);
	}

	private pieceId(piece: HTMLElement) {
		if (piece.id) return piece.id;
		let id = this.#temporaryIds.get(piece);
		if (!id) this.#temporaryIds.set(piece, id = newGridId());
		return id;
	}

	private get isConfigured() {
		if (!this.hasImage || !this.markers.length) return false;
		const ids = new Set(this.pieces.map(piece => this.pieceId(piece)));
		const assigned = this.markers.map(marker => marker.pieceId);
		return new Set(assigned).size === assigned.length && assigned.every(id => Boolean(id && ids.has(id)));
	}

	protected override get canAddOption() {
		return !this.mediaElement;
	}

	protected override get addOptionLabel() {
		return this.msg("Add image");
	}

	protected override addOption() {
		if (!this.isConnected || !this.editing || this.mediaElement) return;
		transaction(this, () => {
			this.insertBefore(createEmptyPicture(this.ownerDocument), this.pieces[0] ?? this.feedbackElement);
		});
	}

	private addItem = () => {
		if (!this.isConnected || !this.editing) return;
		const piece = createImagePlacementItem(this.ownerDocument);
		void transaction(this, async () => {
			this.insertBefore(piece, this.feedbackElement);
			await this.updateComplete;
			if (piece.firstElementChild) this.placeCaret(piece.firstElementChild);
		});
	};

	protected override renderImageActions() {
		return html`${super.renderImageActions()}
			<button type="button" class="header-control helper-action edit-only add-item" data-ww-capture-selection="false" @click=${this.addItem}>
				${this.msg("Add item")}
			</button>`;
	}

	private pieceName(piece: HTMLElement, index: number) {
		return itemContentLabel(piece) || this.msg(str`Item ${index + 1}`);
	}

	private renderPiece(piece: HTMLElement) {
		const picture = itemContent(piece);
		const img = picture?.matches("picture") ? picture.querySelector("img") : null;
		return img && picture ? this.renderPiecePicture(picture, img) : html`<slot data-child-id=${this.pieceId(piece)}></slot>`;
	}

	private renderPiecePicture(picture: Element, img: HTMLImageElement) {
		return html`<picture class="piece-picture">
			${Array.from(picture.querySelectorAll("source")).map(source => html`<source srcset=${source.srcset}
				sizes=${ifDefined(source.getAttribute("sizes") ?? undefined)} media=${ifDefined(source.getAttribute("media") ?? undefined)}
				type=${ifDefined(source.getAttribute("type") ?? undefined)}>`)}
			<img src=${ifDefined(img.getAttribute("src") ?? undefined)} srcset=${ifDefined(img.getAttribute("srcset") ?? undefined)}
				sizes=${ifDefined(img.getAttribute("sizes") ?? undefined)} alt=${img.alt} draggable="false">
		</picture>`;
	}

	private renderZonePreview(piece: HTMLElement, name: string) {
		const id = this.pieceId(piece);
		const content = itemContent(piece);
		const image = content instanceof HTMLImageElement ? content : content?.querySelector("img");
		const source = image?.currentSrc || image?.getAttribute("src") || (content instanceof HTMLVideoElement ? content.poster : "");
		const preview = content?.matches("picture") && image ? this.renderPiecePicture(content, image)
			: source ? html`<img src=${source} alt="" draggable="false">` : html`<span>${name}</span>`;
		return html`<span class=${classMap({
			"grid-card": true,
			"zone-preview": true,
			"counterpart-hovered": this.isActiveTarget("piece", id),
		})} aria-hidden="true">${preview}</span>`;
	}

	protected override renderAuthorMarkerPreview(marker: ImageMarker) {
		const pieces = this.pieces;
		const index = pieces.findIndex(piece => this.pieceId(piece) === marker.pieceId);
		return index < 0 ? nothing : this.renderZonePreview(pieces[index], this.pieceName(pieces[index], index));
	}

	private interactionTarget(event: Event): PlacementTarget | undefined {
		for (const node of event.composedPath()) {
			if (!(node instanceof HTMLElement) || node.getRootNode() !== this.renderRoot) continue;
			const { markerId, zoneId, childId, wwKey } = node.dataset;
			const zone = markerId ?? zoneId;
			const piece = wwKey ?? childId;
			if (zone && node.matches(".marker-ring, .placement-zone")) return { kind: "zone", id: zone };
			if (piece && node.matches(".piece, .placement-options > slot")) return { kind: "piece", id: piece };
		}
	}

	private isActiveTarget(kind: PlacementTarget["kind"], id: string) {
		return [this.hoveredTarget, this.focusedTarget].some(target => target?.kind === kind && target.id === id);
	}

	protected override renderMarkerSettings(marker: ImageMarker) {
		const pieces = this.pieces;
		const selected = pieces.some(piece => this.pieceId(piece) === marker.pieceId) ? marker.pieceId : "";
		return html`<label>
			<span>${this.msg("Correct item")}</span>
			<select .value=${live(selected ?? "")} @change=${(event: Event) =>
				this.setZonePiece(marker.id, (event.currentTarget as HTMLSelectElement).value || undefined)}>
				<option value="">${this.msg("Choose an item")}</option>
				${pieces.map((piece, index) => {
					const id = this.pieceId(piece);
					return html`<option value=${id}>${this.pieceName(piece, index)}</option>`;
				})}
			</select>
		</label>`;
	}

	private setZonePiece(zoneId: string, pieceId?: string) {
		const zone = this.markers.find(marker => marker.id === zoneId);
		if (!this.editing || !zone || zone.pieceId === pieceId) return;
		const piece = pieceId ? this.pieces.find(item => this.pieceId(item) === pieceId) : undefined;
		if (pieceId && !piece) return;
		transaction(this, () => {
			if (piece && !piece.id) piece.id = this.pieceId(piece);
			this.markers = this.markers.map(marker => {
				if (marker === zone) return { ...marker, pieceId };
				if (pieceId && marker.pieceId === pieceId) return { ...marker, pieceId: zone.pieceId };
				return marker;
			});
		});
	}

	override checkValidity() {
		return !this.isConfigured || this.markers.every(zone => this.placements.has(zone.id));
	}

	override checkAnswer(detailedFeedback = false) {
		this.placementGraded = true;
		this.showPlacementFeedback = detailedFeedback && this.isConfigured;
		this.selectedPiece = "";
		if (!this.isConfigured) return Number.NaN;
		const correct = this.markers.filter(zone => this.placements.get(zone.id) === zone.pieceId).length;
		return this.gradingMethod === "pass-fail" ? scoreAllOrNothing(correct, this.markers.length) : scoreProportion(correct, this.markers.length);
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (!this.editing) this.placementGraded = submitted;
	}

	override reset() {
		super.reset();
		this.placementGraded = false;
		this.showPlacementFeedback = false;
		this.placements = new Map();
		this.selectedPiece = "";
		this.placementStatus = "";
		this.pieceOrder = randomizeArray(this.pieces.map(piece => this.pieceId(piece)));
	}

	private placePiece(pieceId: string, zoneId?: string) {
		const pieces = this.pieces;
		const piece = pieces.find(item => this.pieceId(item) === pieceId);
		const zone = this.markers.find(item => item.id === zoneId);
		if (this.editing || this.placementGraded || !this.isConfigured || !piece || (zoneId && !zone)) return;
		const next = new Map(this.placements);
		const previous = Array.from(next).find(([, id]) => id === pieceId)?.[0];
		if (previous) next.delete(previous);
		if (zoneId) {
			const displaced = next.get(zoneId);
			if (previous && displaced) next.set(previous, displaced);
			next.set(zoneId, pieceId);
		}
		this.placements = next;
		this.selectedPiece = "";
		const label = this.pieceName(piece, pieces.indexOf(piece));
		this.placementStatus = zone ? this.msg(str`${label} placed in ${zone.label || this.msg("Zone")}.`)
			: this.msg(str`${label} returned to Options.`);
		if (this.checkValidity()) this.showRequiredWarning(false);
	}

	private handlePieceDrop = ({ detail }: CustomEvent<DragCommitDetail>) => {
		if (this.editing) {
			const id = detail.target.dataset.markerId;
			if (id && this.pieces.includes(detail.item)) this.setZonePiece(id, this.pieceId(detail.item));
		} else if (detail.key) {
			this.placePiece(detail.key, detail.target.dataset.zoneId);
		}
	};

	protected override willUpdate(changed: PropertyValues<this>) {
		super.willUpdate(changed);
		if (!this.editing) return;
		migrateImagePlacementContent(this);
		// The editor's minimum-content repair may be unable to fill a missing picture.
		const media = this.mediaElement;
		if (!media && !this.src.trim()) {
			this.insertBefore(createEmptyPicture(this.ownerDocument), this.pieces[0] ?? this.feedbackElement);
		} else if (media?.localName === "picture" && !media.querySelector(":scope > img")) {
			media.append(this.ownerDocument.createElement("img"));
		}
	}

	protected override updated(changed: PropertyValues) {
		super.updated(changed);
		const media = this.mediaElement;
		const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="media"]');
		if (slot && slot.assignedElements()[0] !== media) slot.assign(...(media ? [media] : []));
		const pieces = new Map(this.pieces.map(piece => [this.pieceId(piece), piece]));
		assignGridSlots(this, pieces);
		const canDragToZone = this.editing && this.hasImage && this.markers.length > 0;
		const zonesByPiece = new Map(this.markers.map(zone => [zone.pieceId, zone.id]));
		for (const [id, piece] of pieces) {
			if (!(piece instanceof WebwriterImagePlacementItem)) continue;
			const zoneId = this.editing ? zonesByPiece.get(id) : undefined;
			piece.canDragToZone = canDragToZone;
			piece.dimmed = zoneId !== undefined && this.#placementDrag.item !== piece;
			piece.counterpartHovered = zoneId !== undefined && this.isActiveTarget("zone", zoneId);
		}

		const zoneIds = new Set(this.markers.map(zone => zone.id));
		const pieceIds = new Set(pieces.keys());
		const current = Array.from(this.placements).filter(([zone, piece]) => zoneIds.has(zone) && pieceIds.has(piece));
		if (current.length !== this.placements.size) this.placements = new Map(current);
		if (this.selectedPiece && !pieceIds.has(this.selectedPiece)) this.selectedPiece = "";
		if (this.pieceOrder.length !== pieceIds.size || this.pieceOrder.some(id => !pieceIds.has(id))) {
			this.pieceOrder = randomizeArray([...pieceIds]);
			this.requestUpdate();
		}
	}

	protected override renderPlacementTargets() {
		const pieces = this.pieces;
		const valid = this.isConfigured && !this.placementGraded;
		return this.markers.map((zone, index) => {
			const id = this.placements.get(zone.id);
			const piece = pieces.find(item => this.pieceId(item) === id);
			const pieceName = piece ? this.pieceName(piece, pieces.indexOf(piece)) : "";
			const zoneName = zone.label || this.msg(str`Zone ${index + 1}`);
			const result = this.placementGraded && this.showPlacementFeedback ? id === zone.pieceId : undefined;
			const name = [
				zoneName,
				pieceName,
				result === undefined ? undefined : result ? this.msg("Correct") : this.msg("Incorrect"),
			].filter(Boolean).join(" · ");
			return html`<div class="placement-zone"
				style=${markerStyle(zone)}
				data-ww-drop="image-piece" data-ww-drop-max="1" data-ww-drop-full="swap" data-zone-id=${zone.id}
				data-correct=${ifDefined(result === undefined ? undefined : String(result))}>
				<button type="button" class="zone-button" title=${name} aria-label=${name}
					aria-pressed=${ifDefined(id ? String(this.selectedPiece === id) : undefined)}
					?disabled=${!valid}
					data-ww-drag=${ifDefined(id && valid ? "image-piece" : undefined)} data-ww-key=${ifDefined(id)} data-ww-drag-via="pointer"
					@click=${() => {
						if (this.selectedPiece) this.placePiece(this.selectedPiece, zone.id);
						else if (id) this.selectedPiece = id;
					}}>
					${piece ? this.renderZonePreview(piece, pieceName) : html`<span>${index + 1}</span>`}
				</button>
			</div>`;
		});
	}

	private renderPieces() {
		const pieces = this.pieces;
		const label = this.msg("Options");
		if (this.editing) {
			const draggable = this.hasImage && this.markers.length > 0;
			return html`<div class="grid-pool placement-options" role="group" aria-label=${label}>
				<span class="pool-label">${label}</span>
				${pieces.length ? pieces.map(piece => html`<slot data-child-id=${this.pieceId(piece)}
						data-ww-drag=${ifDefined(draggable ? "image-piece" : undefined)}
						?data-ww-drag-handle=${draggable} data-ww-drag-via="pointer keyboard" data-ww-drag-effect="copy"></slot>`)
					: html`<span class="slot-placeholder">${this.msg("Empty")}</span>`}
			</div>`;
		}

		if (!this.isConfigured) return html`<p role="status">${this.msg("This task needs an image and a correct item for each zone.")}</p>`;
		const zonesByPiece = new Map(Array.from(this.placements, ([zone, piece]) => [piece, zone]));
		const byId = new Map(pieces.map((piece, index) => [this.pieceId(piece), { piece, index }]));
		const ordered = this.pieceOrder.map(id => byId.get(id)).filter(entry => entry !== undefined);
		return html`<div class="grid-pool placement-options" role="group" aria-label=${label} data-ww-drop="image-piece">
			<span class="pool-label">${label}</span>
			${ordered.length ? ordered.map(({ piece, index }) => {
				const id = this.pieceId(piece);
				const name = this.pieceName(piece, index);
				const zoneId = zonesByPiece.get(id);
				return html`<button type="button" class=${classMap({
					"grid-card": true,
					piece: true,
					dimmed: zoneId !== undefined,
					"counterpart-hovered": zoneId !== undefined && this.isActiveTarget("zone", zoneId),
				})} aria-label=${name}
					aria-pressed=${String(this.selectedPiece === id)} data-ww-key=${id}
					data-ww-drag=${ifDefined(!this.placementGraded ? "image-piece" : undefined)} data-ww-drag-via="pointer"
					?disabled=${this.placementGraded}
					@click=${() => { this.selectedPiece = this.selectedPiece === id ? "" : id; }}>
					<span class="drag-handle" data-ww-drag-handle aria-hidden="true"><sl-icon src=${GripVerticalIcon}></sl-icon></span>
					${this.renderPiece(piece)}
				</button>`;
			}) : html`<span class="slot-placeholder">${this.msg("Empty")}</span>`}
			${!this.placementGraded && zonesByPiece.has(this.selectedPiece) ? html`<button type="button" class="header-control"
				@click=${() => this.placePiece(this.selectedPiece)}>${this.msg("Return selected item")}</button>` : nothing}
		</div>`;
	}

	protected override renderAnswer() {
		return html`<div @ww-dragcommit=${this.handlePieceDrop}
			@pointerover=${(event: PointerEvent) => {
				if (event.pointerType !== "touch") this.hoveredTarget = this.interactionTarget(event);
			}}
			@pointerleave=${() => { this.hoveredTarget = undefined; }}
			@focusin=${(event: FocusEvent) => {
				const target = event.composedPath()[0];
				this.focusedTarget = target instanceof Element && target.matches(":focus-visible") ? this.interactionTarget(event) : undefined;
			}}
			@focusout=${() => { this.focusedTarget = undefined; }}>
			${super.renderAnswer()}${this.renderPieces()}
			<span class="visually-hidden" role="status">${this.placementStatus}</span>
		</div>`;
	}
}
