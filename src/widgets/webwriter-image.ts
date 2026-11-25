import type { MsgFn } from "@lit/localize";
import { str } from "@lit/localize";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import CircleIcon from "@tabler/icons/outline/circle.svg";
import RectangleIcon from "@tabler/icons/outline/rectangle.svg";
import TagIcon from "@tabler/icons/outline/tag.svg";
import TargetIcon from "@tabler/icons/outline/target.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import { Drag, type DragCommitDetail } from "@webwriter/lit/drag";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { createRef, ref } from "lit/directives/ref.js";
import { styleMap } from "lit/directives/style-map.js";
import { name as packageId } from "../../package.json";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { newGridId } from "../components/grid-helpers";
import { messageFor } from "../components/localization";
import { TopLayerPopup, topLayerStyles } from "../components/top-layer";
import { WebwriterTask } from "../components/webwriter-task";
import PhotoScanIcon from "../icons/image.svg";
import { registerQuizType } from "../model/quiz-api";
import { randomizeArray } from "../model/randomize-array";
import { clampUnit, scoreAllOrNothing } from "../model/scoring";
import { selfAssessmentOption } from "../components/rubric-popover";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-image": WebwriterImage;
	}
}

type ImageGrading = "ungraded" | "pass-fail" | "partial" | "self-assess";
type MarkerKind = "hotspot" | "label";
type HotspotShape = "circle" | "rectangle";
type ResizeEdge = "left" | "right" | "top" | "bottom";

export type ImageMarker = {
	id: string;
	x: number;
	y: number;
	r: number;
	label: string;
	kind?: MarkerKind;
	shape?: HotspotShape;
	width?: number;
	height?: number;
	pieceId?: string;
};

type LearnerPin = {
	x: number;
	y: number;
};

function rectangleSize(marker: ImageMarker) {
	return {
		width: Math.max(2, Math.min(100, marker.width || (marker.r || 8) * 2)),
		height: Math.max(2, Math.min(100, marker.height || (marker.r || 8) * 2)),
	};
}

function fitCenter(position: number, size: number) {
	return Math.max(size / 2, Math.min(100 - size / 2, position));
}

function resizeRectangle(marker: ImageMarker, edge: ResizeEdge, dx: number, dy: number) {
	const { width, height } = rectangleSize(marker);
	const x = fitCenter(marker.x, width);
	const y = fitCenter(marker.y, height);
	let left = x - width / 2;
	let right = x + width / 2;
	let top = y - height / 2;
	let bottom = y + height / 2;
	switch (edge) {
		case "left": left = Math.max(0, Math.min(right - 2, left + dx)); break;
		case "right": right = Math.min(100, Math.max(left + 2, right + dx)); break;
		case "top": top = Math.max(0, Math.min(bottom - 2, top + dy)); break;
		case "bottom": bottom = Math.min(100, Math.max(top + 2, bottom + dy)); break;
	}
	return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}

export function markerStyle(marker: ImageMarker, label = false) {
	const rectangle = !label && marker.shape === "rectangle" ? rectangleSize(marker) : undefined;
	return styleMap({
		left: `${marker.x}%`,
		top: `${marker.y}%`,
		width: label ? "1.75rem" : `${rectangle?.width ?? (marker.r || 8) * 2}%`,
		height: rectangle ? `${rectangle.height}%` : undefined,
	});
}

export function createEmptyPicture(doc: Document) {
	// WebWriter renders its native placeholder on the empty picture.
	const picture = doc.createElement("picture");
	picture.append(doc.createElement("img"));
	return picture;
}

function createImageTask(doc: Document = document) {
	const task = doc.createElement("webwriter-image");
	const prompt = doc.createElement("p");
	prompt.setAttribute("slot", "prompt");
	task.append(prompt, createEmptyPicture(doc));
	return task;
}

function mediaHasSource(media: HTMLPictureElement | HTMLImageElement | null): boolean {
	if (!media) return false;
	if (media instanceof HTMLImageElement) {
		return Boolean(media.getAttribute("src")?.trim() || media.getAttribute("srcset")?.trim());
	}
	const img = media.querySelector("img");
	if (img?.getAttribute("src")?.trim() || img?.getAttribute("srcset")?.trim()) return true;
	return Array.from(media.querySelectorAll("source")).some(source => Boolean(source.getAttribute("srcset")?.trim()));
}

registerQuizType({
	packageId,
	widgetPosition: 90,
	section: "show",
	id: "webwriter-image",
	getName: (locale, translate = messageFor(locale)) => translate("Image Hotspots"),
	icon: PhotoScanIcon,
	createInstance: () => createImageTask(),
	matches: element => element.localName === "webwriter-image",
});

/**
 * Learners find hidden regions and match labels to numbered markers on the same image.
 */
@customElement("webwriter-image")
export class WebwriterImage extends WebwriterTask {
	static styles = [WebwriterTask.styles, topLayerStyles, css`
		:host {
			display: block;
			outline: none !important;
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small);
		}

		.helper {
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);
		}

		.task-helper-switches {
			gap: var(--sl-spacing-2x-small);
		}

		.task-helper-switches > .helper-action {
			margin: 0;
			padding-block: var(--sl-spacing-3x-small);
			font-size: var(--sl-font-size-x-small);
		}

		.hint-btn {
			display: inline-flex;
			align-items: center;
			gap: var(--sl-spacing-3x-small);
			padding: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			color: var(--sl-color-neutral-800);
			font: inherit;
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-medium);
			cursor: pointer;

			&:hover {
				border-color: var(--sl-color-neutral-400);
				background: var(--sl-color-neutral-50);
			}
		}

		@container (inline-size < 22rem) {
			.task-helper-switches:has(.add-label-pin-btn) > button {
				padding-inline: var(--sl-spacing-2x-small);
			}
		}

		@container (inline-size <= 20rem) {
			.task-helper-switches:has(.add-label-pin-btn) {
				gap: var(--sl-spacing-3x-small);

				> button { padding-inline: var(--sl-spacing-3x-small); }
			}
		}

		.empty-stage {
			display: grid;
			place-items: center;
			min-height: 11rem;
			padding: var(--sl-spacing-large);
			border: 1px dashed var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
			color: var(--sl-color-neutral-500);
			font-size: var(--sl-font-size-small);
			text-align: center;
		}

		.image-stage {
			position: relative;
			display: inline-block;
			max-width: 100%;
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			overflow: hidden;
			background: var(--sl-color-neutral-50);
			user-select: none;
		}

		.image-stage.empty {
			display: block;
			width: 100%;
			min-height: 8rem;
		}

		.image-stage slot {
			display: block;
		}

		.image-stage ::slotted(picture),
		.image-stage ::slotted(img) {
			display: block;
			width: 100%;
			height: auto;
			margin: 0;
		}

		.stage-img {
			display: block;
			max-width: 100%;
			height: auto;
			user-select: none;
			-webkit-user-drag: none;
		}

		.marker-capture {
			position: absolute;
			inset: 0;
			z-index: 1;
			cursor: crosshair;
		}

		/* Hotspot rings and learner pins */
		.marker-ring {
			position: absolute;
			z-index: 2;
			transform: translate(-50%, -50%);
			aspect-ratio: 1 / 1;
			border: 2px solid var(--ww-theme-accent-1, var(--sl-color-primary-600));
			border-radius: 50%;
			background: color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 18%, transparent);
			box-sizing: border-box;
			display: grid;
			place-items: center;
			pointer-events: none;
		}

		.marker-ring.editable {
			pointer-events: auto;
			cursor: grab;
			touch-action: none;

			&::before {
				content: "";
				position: absolute;
				inset: -8px;
				border-radius: 50%;
			}

			&.selected,
			&:focus-visible {
				outline: none;
				box-shadow: 0 0 0 3px color-mix(in srgb, var(--ww-theme-accent-1, var(--sl-color-primary-500)) 35%, transparent);
			}

			&.dragging {
				cursor: grabbing;
			}
		}

		.marker-ring.rectangle {
			aspect-ratio: auto;
			border-radius: var(--sl-border-radius-x-small);

			&::before {
				border-radius: inherit;
			}
		}

		.marker-edge {
			position: absolute;
			z-index: 2;
			padding: 0;
			border: 0;
			background: transparent;
		}

		.marker-edge:is([data-edge="left"], [data-edge="right"]) {
			width: 10px;
			top: 4px;
			bottom: 4px;
			cursor: ew-resize;
		}

		.marker-edge:is([data-edge="top"], [data-edge="bottom"]) {
			height: 10px;
			left: 4px;
			right: 4px;
			cursor: ns-resize;
		}

		.marker-edge[data-edge="left"] { left: -5px; }
		.marker-edge[data-edge="right"] { right: -5px; }
		.marker-edge[data-edge="top"] { top: -5px; }
		.marker-edge[data-edge="bottom"] { bottom: -5px; }

		.marker-edge:focus-visible {
			outline: var(--sl-focus-ring-width) solid var(--sl-focus-ring-color);
		}

		.marker-center {
			position: absolute;
			z-index: 3;
			left: 50%;
			top: 50%;
			translate: -50% -50%;
			box-sizing: border-box;
			min-width: 1.25rem;
			height: 1.25rem;
			margin: 0;
			padding: 0 0.2em;
			border: 2px solid var(--sl-color-neutral-0);
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-neutral-900);
			color: var(--sl-color-neutral-0);
			font: inherit;
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);
			line-height: 1;
			display: inline-grid;
			place-items: center;
			cursor: pointer;
			box-shadow: var(--sl-shadow-small);
			transition: transform 0.1s ease, background-color 0.1s ease;

			&:hover {
				background: var(--ww-theme-accent-1, var(--sl-color-primary-600));
				transform: scale(1.06);
			}
		}

		.marker-ring.target-missed {
			border-style: dashed;
			border-color: var(--sl-color-warning-600);
			background: color-mix(in srgb, var(--sl-color-warning-500) 20%, transparent);
		}

		.ring-badge {
			padding: 0 0.35em;
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-neutral-900);
			color: var(--sl-color-neutral-0);
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);
			white-space: nowrap;
		}

		.learner-pin {
			position: absolute;
			z-index: 2;
			transform: translate(-50%, -50%);
			width: 1.5rem;
			height: 1.5rem;
			padding: 0;
			border: 2px solid var(--sl-color-neutral-0);
			border-radius: 50%;
			background: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			color: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-medium);
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-bold);
			display: grid;
			place-items: center;
			cursor: pointer;

			&:disabled {
				cursor: default;
			}

			&.pin-correct {
				background: var(--sl-color-success-600);
			}

			&.pin-wrong {
				background: var(--sl-color-danger-600);
			}
		}

		/* Label drop zones */
		.label-anchor {
			position: absolute;
			z-index: 2;
			transform: translate(-50%, -50%);
		}

		.label-drop {
			min-width: 2rem;
			min-height: 1.75rem;
			padding: 2px var(--sl-spacing-2x-small);
			box-sizing: border-box;
			border: 2px dashed var(--ww-theme-accent-1, var(--sl-color-primary-600));
			border-radius: var(--sl-border-radius-pill);
			background: color-mix(in srgb, var(--sl-color-neutral-0) 92%, transparent);
			box-shadow: var(--sl-shadow-small);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 0.25rem;
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);

			&.filled {
				border-style: solid;
				border-color: var(--sl-color-neutral-400);
			}

			&[data-ww-drop-over] {
				background: var(--sl-color-primary-100);
			}

			&.correct {
				border-color: var(--sl-color-success-600);
				background: var(--sl-color-success-50);
			}

			&.wrong {
				border-color: var(--sl-color-danger-600);
				background: var(--sl-color-danger-50);
			}

			&.missed {
				border-color: var(--sl-color-warning-600);
				background: var(--sl-color-warning-50);
			}
		}

		.label-chip {
			display: inline-flex;
			align-items: center;
			padding: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-pill);
			background: var(--sl-color-neutral-0);
			font-size: var(--sl-font-size-small);
			user-select: none;
			cursor: grab;

			&:hover {
				border-color: var(--sl-color-primary-400);
				background: var(--sl-color-primary-50);
			}

			&[data-ww-dragging] {
				z-index: 1000;
				pointer-events: none;
				cursor: grabbing;
			}
		}

		.grid-pool {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--sl-spacing-x-small);
			min-height: 2.5rem;
			margin-top: var(--sl-spacing-small);
			padding: var(--sl-spacing-x-small);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);

			&[data-ww-drop-over] {
				background: var(--sl-color-primary-50);
			}
		}

		.pool-label {
			color: var(--sl-color-neutral-600);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
		}

		.correction {
			color: var(--sl-color-success-700);
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-semibold);
		}

		/* Hotspot editor popover */
		.marker-popover-card {
			display: flex;
			flex-direction: column;
			gap: var(--sl-spacing-2x-small);
			min-width: 13rem;
			padding: var(--sl-spacing-x-small);
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-large);
			font-size: var(--sl-font-size-small);
		}

		.marker-popover-header,
		.marker-popover-label-row {
			display: flex;
			align-items: center;
			gap: var(--sl-spacing-x-small);
		}

		.marker-delete-btn {
			margin-inline-start: auto;
		}

		.marker-shapes,
		.marker-types {
			display: inline-flex;
			flex: none;

			button {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: var(--sl-spacing-2x-small);
				min-block-size: 1.5rem;
				border: 1px solid var(--sl-input-border-color);
				background: var(--sl-color-neutral-0);
				color: inherit;
				font: inherit;
				cursor: pointer;

				&:first-child {
					border-start-start-radius: var(--sl-border-radius-small);
					border-end-start-radius: var(--sl-border-radius-small);
				}

				&:last-child {
					border-start-end-radius: var(--sl-border-radius-small);
					border-end-end-radius: var(--sl-border-radius-small);
					margin-inline-start: -1px;
				}

				&[aria-pressed="true"] {
					position: relative;
					border-color: var(--sl-color-primary-600);
					background: var(--sl-color-primary-50);
					color: var(--sl-color-primary-700);
				}

				&:focus-visible {
					position: relative;
					z-index: 1;
				}
			}
		}

		.marker-shapes > button {
			inline-size: 1.75rem;
			padding: 0;
			font-size: 1rem;
		}

		.marker-types > button {
			padding: 0 var(--sl-spacing-x-small);
			border-color: var(--sl-color-primary-600);
			color: var(--sl-color-primary-700);
			font-weight: var(--sl-font-weight-semibold);
			white-space: nowrap;

			sl-icon { font-size: 1rem; }
			&:hover { background: var(--sl-color-primary-50); }
			&[aria-pressed="true"] {
				background: var(--sl-color-primary-600);
				color: var(--sl-color-neutral-0);
			}
		}

		.marker-index {
			display: inline-grid;
			place-items: center;
			width: 1.4rem;
			height: 1.4rem;
			border-radius: 50%;
			background: var(--ww-theme-accent-1, var(--sl-color-primary-600));
			color: var(--sl-color-neutral-0);
			font-size: var(--sl-font-size-x-small);
			font-weight: var(--sl-font-weight-bold);
			flex: none;
		}

		.marker-label-input {
			flex: 1 1 0;
			min-width: 0;
			box-sizing: border-box;
			padding: var(--sl-spacing-3x-small) var(--sl-spacing-x-small);
			border: 1px solid var(--sl-input-border-color);
			border-radius: var(--sl-input-border-radius-medium);
			font: inherit;
		}

	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"sl-icon-button": SlIconButton,
	};

	static createInstance(doc: Document) {
		return createImageTask(doc);
	}

	static options = {
		...WebwriterTask.options,
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "pass-fail",
					label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every marker matches with no wrong pins."),
				},
				{
					value: "partial",
					label: (widget: { msg: MsgFn }) => widget.msg("Per marker"),
					description: (widget: { msg: MsgFn }) => widget.msg("Credit per matched marker, subtracting extra wrong pins."),
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

	/** Legacy fallback image URL or data URL when no slotted `<picture slot="media">` is present. */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor src = "";

	/** Legacy fallback alt text for `src`. */
	@property({ type: String, attribute: true, reflect: true, useDefault: true })
	accessor alt = "";

	/** How partial vs all-or-nothing credit is computed across markers. */
	@property({ type: String, attribute: "grading-method", reflect: true, useDefault: true })
	accessor gradingMethod: ImageGrading = "partial";

	/** Authored target markers on the image (`x`, `y`, `r` in `%`), obfuscated in markup. */
	@property({ type: Array, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor markers: ImageMarker[] = [];

	private isLabelMarker(marker: ImageMarker) {
		// Saved label tasks used one mode for the whole image before markers had a kind.
		return marker.kind ? marker.kind === "label" : this.getAttribute("mode") === "label";
	}

	private get labelMarkers() {
		return this.markers.filter(marker => this.isLabelMarker(marker));
	}

	private get hotspots() {
		return this.markers.filter(marker => !this.isLabelMarker(marker));
	}

	@state() private accessor learnerPins: LearnerPin[] = [];
	@state() private accessor labelPlacements: Record<string, string> = {};
	@state() private accessor labelPoolOrder: string[] = [];
	@state() private accessor graded = false;
	@state() private accessor detailedFeedback = false;
	@state() private accessor selectedMarkerId: string | null = null;
	@state() private accessor popoverMarkerId: string | null = null;
	@state() private accessor dragPreview: ImageMarker | null = null;

	#drag = new Drag(this, { can: () => !this.isPlacementTask && !this.editing && !this.graded && this.labelMarkers.length > 0 });
	private mediaObserver?: MutationObserver;
	private cancelMarkerDrag?: () => void;
	private markerPanel = createRef<HTMLElement>();
	private lastHiddenPopover: { id: string; at: number } | null = null;
	private suppressNextCenterClick = false;
	private markerPopup = new TopLayerPopup(
		this,
		() => ({
			trigger: this.popoverMarkerId
				? this.shadowRoot?.querySelector<HTMLElement>(`.marker-center[data-marker-id="${this.popoverMarkerId}"]`) ?? null
				: null,
			panel: this.markerPanel.value,
			keep: this.markerPanel.value,
		}),
		{
			onHide: () => {
				if (this.popoverMarkerId) this.lastHiddenPopover = { id: this.popoverMarkerId, at: performance.now() };
				this.popoverMarkerId = null;
			},
		},
	);

	protected get isPlacementTask() {
		return false;
	}

	protected get mediaElement(): HTMLPictureElement | HTMLImageElement | null {
		return this.querySelector<HTMLPictureElement | HTMLImageElement>(":scope > picture, :scope > img");
	}

	protected get hasImage(): boolean {
		const media = this.mediaElement;
		return mediaHasSource(media) || (!media && Boolean(this.src.trim()));
	}

	private get showFeedback() {
		return this.graded && this.detailedFeedback;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.mediaObserver = new MutationObserver(() => this.requestUpdate());
		this.mediaObserver.observe(this, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["src", "srcset", "sizes", "media", "type", "alt", "slot"],
		});
	}

	override disconnectedCallback(): void {
		this.cancelMarkerDrag?.();
		this.mediaObserver?.disconnect();
		this.mediaObserver = undefined;
		super.disconnectedCallback();
	}

	private coordsFromClick(event: MouseEvent): LearnerPin {
		const current = event.currentTarget as HTMLElement;
		const target = current.closest<HTMLElement>(".image-stage") ?? current;
		const rect = target.getBoundingClientRect();
		const width = rect.width || 1;
		const height = rect.height || 1;
		const x = Math.round(Math.max(0, Math.min(100, ((event.clientX - rect.left) / width) * 100)) * 10) / 10;
		const y = Math.round(Math.max(0, Math.min(100, ((event.clientY - rect.top) / height) * 100)) * 10) / 10;
		return { x, y };
	}

	private addMarkerAt(x: number, y: number, kind: MarkerKind = "hotspot", openPopover = false) {
		if (!this.editing || !this.hasImage) return;
		const num = this.markers.length + 1;
		const placements = this.isPlacementTask;
		const label = placements ? this.msg("Zone") : kind === "label" ? this.msg("Label pin") : this.msg("Region");
		const marker: ImageMarker = {
			id: newGridId(),
			x: placements ? fitCenter(x, 20) : x,
			y: placements ? fitCenter(y, 22) : y,
			r: 8,
			label: `${label} ${num}`,
			kind,
			...(placements ? { shape: "rectangle", width: 20, height: 22 } : {}),
		};
		transaction(this, () => {
			this.markers = [...this.markers, marker];
		});
		this.selectedMarkerId = marker.id;
		if (openPopover) void this.openMarkerPopover(marker.id);
		return marker;
	}

	private addMarkerAtDefault(kind: MarkerKind = "hotspot") {
		const offset = ((this.markers.length % 5) - 2) * 5;
		const x = Math.round(Math.max(10, Math.min(90, 50 + offset)) * 10) / 10;
		const y = Math.round(Math.max(10, Math.min(90, 50 + offset)) * 10) / 10;
		this.addMarkerAt(x, y, kind, true);
	}

	private modifyImage(event: Event) {
		event.stopPropagation();
		if (!this.editing) return;
		this.markerPopup.hide();
		this.selectedMarkerId = null;
		this.popoverMarkerId = null;
		this.dragPreview = null;
		let media = this.mediaElement;
		if (!media && this.src.trim()) {
			transaction(this, () => {
				const img = this.ownerDocument.createElement("img");
				img.src = this.src;
				if (this.alt) img.alt = this.alt;
				this.appendChild(img);
				this.src = "";
				this.alt = "";
				media = img;
			});
		}
		if (!media) return;
		const rect = media.getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;
		(event.currentTarget as HTMLElement | null)?.blur?.();
		media.dispatchEvent(new PointerEvent("pointerdown", {
			bubbles: true,
			composed: true,
			cancelable: true,
			button: 0,
			pointerType: "mouse",
			clientX,
			clientY,
		}));
		media.dispatchEvent(new MouseEvent("click", {
			bubbles: true,
			composed: true,
			cancelable: true,
			button: 0,
			clientX,
			clientY,
		}));
	}

	private async openMarkerPopover(markerId: string) {
		if (this.markerPopup.open && this.popoverMarkerId !== markerId) this.markerPopup.hide();
		this.selectedMarkerId = markerId;
		this.popoverMarkerId = markerId;
		await this.updateComplete;
		if (this.editing && this.popoverMarkerId === markerId) {
			this.markerPopup.show();
			this.markerPanel.value?.querySelector<HTMLElement>(this.isPlacementTask ? "select" : ".marker-label-input")?.focus({ preventScroll: true });
		}
	}

	private borderResizeCursor(ring: HTMLElement, clientX: number, clientY: number): string | null {
		if (ring.matches(".label-marker, .rectangle")) return null;
		const rect = ring.getBoundingClientRect();
		const radius = rect.width / 2;
		if (radius <= 0) return null;
		const dx = clientX - (rect.left + radius);
		const dy = clientY - (rect.top + rect.height / 2);
		const dist = Math.hypot(dx, dy);
		const innerBand = Math.min(6, Math.max(3, radius * 0.25));
		if (dist < radius - innerBand || dist > radius + 8) return null;
		const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 180;
		if (deg < 22.5 || deg >= 157.5) return "ew-resize";
		if (deg < 67.5) return "nwse-resize";
		if (deg < 112.5) return "ns-resize";
		return "nesw-resize";
	}

	private handleMarkerPointerMove = (event: PointerEvent) => {
		if (this.dragPreview) return;
		const ring = event.currentTarget as HTMLElement;
		const onCenter = Boolean((event.target as Element | null)?.closest(".marker-center"));
		if (onCenter) {
			ring.style.cursor = "pointer";
			return;
		}
		ring.style.cursor = this.borderResizeCursor(ring, event.clientX, event.clientY) ?? "grab";
	};

	private handleMarkerPointerDown(event: PointerEvent, marker: ImageMarker) {
		if (!this.editing || event.button !== 0) return;
		event.stopPropagation();
		const ring = event.currentTarget as HTMLElement;
		const stage = ring.closest<HTMLElement>(".image-stage");
		if (!stage) return;
		this.cancelMarkerDrag?.();
		this.selectedMarkerId = marker.id;

		const target = event.target as Element;
		const onCenter = Boolean(target.closest(".marker-center"));
		const edge = target.closest<HTMLElement>(".marker-edge")?.dataset.edge as ResizeEdge | undefined;
		if (!onCenter && !edge) ring.focus({ preventScroll: true });
		const resizeCursor = onCenter ? null : this.borderResizeCursor(ring, event.clientX, event.clientY);

		const stageRect = stage.getBoundingClientRect();
		const stageWidth = stageRect.width || 1;
		const stageHeight = stageRect.height || 1;
		const centerX = stageRect.left + marker.x * stageWidth / 100;
		const centerY = stageRect.top + marker.y * stageHeight / 100;
		const startX = event.clientX;
		const startY = event.clientY;
		const { width, height } = marker.shape === "rectangle" && !this.isLabelMarker(marker)
			? rectangleSize(marker) : { width: 0, height: 0 };
		let started = false;
		if (resizeCursor) ring.style.cursor = resizeCursor;

		const win = this.ownerDocument.defaultView ?? window;
		const onMove = (moveEvent: PointerEvent) => {
			if (moveEvent.pointerId !== event.pointerId) return;
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;
			if (!started && Math.hypot(dx, dy) < 4) return;
			if (!started) {
				started = true;
				try { ring.setPointerCapture(event.pointerId); }
				catch { /* Synthetic PointerEvents may not have an active pointer id. */ }
				this.markerPopup.hide();
			}
			if (edge) {
				this.dragPreview = { ...marker, ...resizeRectangle(marker, edge, dx * 100 / stageWidth, dy * 100 / stageHeight) };
			} else if (resizeCursor) {
				const distance = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);
				const radius = Math.max(2, Math.min(40, distance * 100 / stageWidth));
				this.dragPreview = { ...marker, r: Math.round(radius * 10) / 10 };
			} else {
				this.dragPreview = {
					...marker,
					x: fitCenter(Math.round((marker.x + dx * 100 / stageWidth) * 10) / 10, width),
					y: fitCenter(Math.round((marker.y + dy * 100 / stageHeight) * 10) / 10, height),
				};
				ring.style.cursor = "grabbing";
			}
		};

		const finish = (commit: boolean) => {
			win.removeEventListener("pointermove", onMove);
			win.removeEventListener("pointerup", onEnd);
			win.removeEventListener("pointercancel", onEnd);
			this.cancelMarkerDrag = undefined;
			if (ring.hasPointerCapture(event.pointerId)) ring.releasePointerCapture(event.pointerId);
			ring.style.cursor = "";
			const preview = this.dragPreview;
			this.dragPreview = null;
			if (commit && started && preview?.id === marker.id) {
				const current = this.markers.find(candidate => candidate.id === marker.id);
				if (current !== marker) return;
				this.suppressNextCenterClick = onCenter;
				queueMicrotask(() => { this.suppressNextCenterClick = false; });
				const { x, y, r, width, height } = preview;
				this.updateMarker(marker.id, { x, y, r, width, height });
			}
		};
		const onEnd = (endEvent: PointerEvent) => {
			if (endEvent.pointerId === event.pointerId) finish(endEvent.type === "pointerup");
		};

		this.cancelMarkerDrag = () => finish(false);
		win.addEventListener("pointermove", onMove);
		win.addEventListener("pointerup", onEnd);
		win.addEventListener("pointercancel", onEnd);
	}

	private handleMarkerCenterClick(event: MouseEvent, markerId: string) {
		event.stopPropagation();
		if (!this.editing) return;
		if (this.suppressNextCenterClick) {
			this.suppressNextCenterClick = false;
			return;
		}
		if (this.lastHiddenPopover?.id === markerId && performance.now() - this.lastHiddenPopover.at < 300) {
			this.lastHiddenPopover = null;
			return;
		}
		void this.openMarkerPopover(markerId);
	}

	private handleMarkerKeyDown(event: KeyboardEvent, index: number) {
		if (!this.editing) return;
		if ((event.target as Element | null)?.closest("input, textarea")) return;
		if (this.isPlacementTask && event.target === event.currentTarget) {
			const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
			const marker = this.markers[index];
			if (offset && marker) {
				const { width, height } = rectangleSize(marker);
				this.updateMarker(marker.id, { x: fitCenter(marker.x + offset[0], width), y: fitCenter(marker.y + offset[1], height) });
				event.preventDefault();
				event.stopPropagation();
				return;
			}
		}
		if (event.key === "Backspace" || event.key === "Delete") {
			event.preventDefault();
			event.stopPropagation();
			this.removeMarker(index);
		}
	}

	private handleAuthorImageDoubleClick(event: MouseEvent) {
		if (!this.editing || !this.hasImage) return;
		const { x, y } = this.coordsFromClick(event);
		this.addMarkerAt(x, y);
	}

	private handleLearnerImageClick(event: MouseEvent) {
		const maxPins = this.hotspots.length;
		if (this.editing || this.graded || !maxPins) return;
		const pin = this.coordsFromClick(event);
		if (maxPins === 1) {
			this.learnerPins = [pin];
		} else if (this.learnerPins.length < maxPins) {
			this.learnerPins = [...this.learnerPins, pin];
		} else {
			this.learnerPins = [...this.learnerPins.slice(1), pin];
		}
	}

	protected updateMarker(id: string, patch: Partial<ImageMarker>) {
		if (!this.editing || !this.markers.some(marker => marker.id === id)) return;
		transaction(this, () => {
			this.markers = this.markers.map(marker => marker.id === id ? { ...marker, ...patch } : marker);
		});
	}

	private setMarkerShape(id: string, shape: HotspotShape) {
		const marker = this.hotspots.find(candidate => candidate.id === id);
		if (!marker || (marker.shape ?? "circle") === shape) return;
		if (shape === "circle") {
			this.updateMarker(id, { shape });
			return;
		}
		const stage = this.shadowRoot?.querySelector(".image-stage")?.getBoundingClientRect();
		const width = marker.width ?? (marker.r || 8) * 2;
		const height = marker.height ?? width * ((stage?.width || 1) / (stage?.height || 1));
		const size = rectangleSize({ ...marker, width, height });
		this.updateMarker(id, { shape, ...size, x: fitCenter(marker.x, size.width), y: fitCenter(marker.y, size.height) });
	}

	private resizeMarkerWithKey(event: KeyboardEvent, id: string, edge: ResizeEdge) {
		if (!this.editing) return;
		const marker = this.hotspots.find(candidate => candidate.id === id);
		if (marker?.shape !== "rectangle") return;
		const horizontal = edge === "left" || edge === "right";
		const key = event.key;
		const delta = key === (horizontal ? "ArrowLeft" : "ArrowUp") ? -1
			: key === (horizontal ? "ArrowRight" : "ArrowDown") ? 1 : 0;
		if (!delta) return;
		event.preventDefault();
		event.stopPropagation();
		this.updateMarker(id, resizeRectangle(marker, edge, horizontal ? delta : 0, horizontal ? 0 : delta));
	}

	private markerEdges(marker: ImageMarker) {
		const edges = [
			["left", this.msg("Resize left edge")],
			["right", this.msg("Resize right edge")],
			["top", this.msg("Resize top edge")],
			["bottom", this.msg("Resize bottom edge")],
		] as const;
		return edges.map(([edge, label]) => html`<button type="button" class="marker-edge" data-edge=${edge}
			aria-label=${label} @keydown=${(event: KeyboardEvent) => this.resizeMarkerWithKey(event, marker.id, edge)}></button>`);
	}

	private shapeButtons(marker: ImageMarker) {
		const active = marker.shape ?? "circle";
		const circle = this.msg("Circle");
		const rectangle = this.msg("Rectangle");
		return html`<div class="marker-shapes" role="group" aria-label=${this.msg("Shape")}>
			<button type="button" aria-label=${circle} title=${circle} aria-pressed=${String(active === "circle")}
				@click=${() => this.setMarkerShape(marker.id, "circle")}>
				<sl-icon src=${CircleIcon} aria-hidden="true"></sl-icon>
			</button>
			<button type="button" aria-label=${rectangle} title=${rectangle} aria-pressed=${String(active === "rectangle")}
				@click=${() => this.setMarkerShape(marker.id, "rectangle")}>
				<sl-icon src=${RectangleIcon} aria-hidden="true"></sl-icon>
			</button>
		</div>`;
	}

	private markerTypeButtons(marker: ImageMarker) {
		const active = this.isLabelMarker(marker) ? "label" : "hotspot";
		const options = [
			["hotspot", this.msg("Hotspot"), TargetIcon],
			["label", this.msg("Label pin"), TagIcon],
		] as const;
		return html`<div class="marker-types" role="group" aria-label=${this.msg("Marker type")}>
			${options.map(([kind, label, icon]) => html`<button type="button" aria-pressed=${String(active === kind)}
				@click=${() => { if (active !== kind) this.updateMarker(marker.id, { kind }); }}>
				<sl-icon src=${icon} aria-hidden="true"></sl-icon>${label}
			</button>`)}
		</div>`;
	}

	private removeMarker(index: number) {
		if (!this.editing) return;
		const target = this.markers[index];
		if (!target) return;
		if (this.popoverMarkerId === target.id) {
			this.markerPopup.hide();
			this.popoverMarkerId = null;
		}
		if (this.selectedMarkerId === target.id) {
			this.selectedMarkerId = null;
		}
		transaction(this, () => {
			this.markers = this.markers.filter((_, i) => i !== index);
		});
	}

	private handleLabelDrop = ({ detail }: CustomEvent<DragCommitDetail>) => {
		if (this.isPlacementTask) return;
		const chipMarkerId = detail.key;
		const targetMarkerId = detail.target.dataset.markerId;
		const labels = this.labelMarkers;
		if (!chipMarkerId || this.editing || this.graded || !labels.some(marker => marker.id === chipMarkerId)) return;
		if (targetMarkerId && !labels.some(marker => marker.id === targetMarkerId)) return;
		const next = { ...this.labelPlacements };
		const originMarkerId = Object.keys(next).find(id => next[id] === chipMarkerId);

		if (!targetMarkerId) {
			if (originMarkerId) delete next[originMarkerId];
			this.labelPlacements = next;
			return;
		}
		const displaced = next[targetMarkerId];
		next[targetMarkerId] = chipMarkerId;
		if (originMarkerId && originMarkerId !== targetMarkerId) {
			if (displaced && displaced !== chipMarkerId) next[originMarkerId] = displaced;
			else delete next[originMarkerId];
		}
		this.labelPlacements = next;
	};

	/** Matches each pin and hotspot at most once. */
	private evaluatePins() {
		const stage = this.shadowRoot?.querySelector(".image-stage")?.getBoundingClientRect();
		const aspect = stage?.width && stage.height ? stage.height / stage.width : 1;
		const candidates = new Map<string, number[]>();
		for (const marker of this.hotspots) {
			const rectangle = marker.shape === "rectangle" ? rectangleSize(marker) : undefined;
			const radius = marker.r > 0 ? marker.r : 8;
			const inside = this.learnerPins.flatMap((pin, index) => {
				const dx = pin.x - marker.x;
				const dy = pin.y - marker.y;
				const contains = rectangle
					? Math.abs(dx) <= rectangle.width / 2 && Math.abs(dy) <= rectangle.height / 2
					: Math.hypot(dx, dy * aspect) <= radius;
				return contains ? [index] : [];
			});
			candidates.set(marker.id, inside);
		}

		// A pin in an overlap can be reassigned to make room for another marker.
		const markerByPin = new Map<number, string>();
		const match = (id: string, seen: Set<number>): boolean => {
			for (const index of candidates.get(id) ?? []) {
				if (seen.has(index)) continue;
				seen.add(index);
				const previous = markerByPin.get(index);
				if (previous === undefined || match(previous, seen)) {
					markerByPin.set(index, id);
					return true;
				}
			}
			return false;
		};
		for (const id of candidates.keys()) match(id, new Set());
		return { matchedMarkers: new Set(markerByPin.values()), matchedPinIndices: new Set(markerByPin.keys()) };
	}

	private isLabelCorrect(marker: ImageMarker): boolean {
		const placedId = this.labelPlacements[marker.id];
		if (!placedId) return false;
		const placedMarker = this.labelMarkers.find(m => m.id === placedId);
		if (!placedMarker) return false;
		return placedMarker.label.trim() === marker.label.trim();
	}

	checkValidity(): boolean {
		return this.labelMarkers.every(marker => Boolean(this.labelPlacements[marker.id]))
			&& (!this.hotspots.length || this.learnerPins.length > 0);
	}

	reset(): void {
		this.graded = false;
		this.detailedFeedback = false;
		this.learnerPins = [];
		this.labelPlacements = {};
		this.labelPoolOrder = randomizeArray(this.labelMarkers.map(marker => marker.id));
	}

	checkAnswer(detailedFeedback = false): number {
		this.graded = true;
		this.detailedFeedback = detailedFeedback;
		const total = this.markers.length;
		if (total === 0) return 0;

		const correctLabels = this.labelMarkers.filter(marker => this.isLabelCorrect(marker)).length;
		const exact = this.gradingMethod === "pass-fail";
		const { matchedPinIndices, matchedMarkers } = this.evaluatePins();
		const correct = correctLabels + matchedMarkers.size;
		const wrongPins = this.learnerPins.length - matchedPinIndices.size;
		return exact
			? wrongPins === 0 ? scoreAllOrNothing(correct, total) : 0
			: clampUnit((correct - wrongPins) / total);
	}

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected willUpdate(changed: PropertyValues<this>): void {
		super.willUpdate(changed);
		if (changed.has("markers")) {
			const labels = new Set(this.labelMarkers.map(marker => marker.id));
			this.labelPoolOrder = randomizeArray([...labels]);
			this.labelPlacements = Object.fromEntries(Object.entries(this.labelPlacements)
				.filter(([target, chip]) => labels.has(target) && labels.has(chip)));
			this.learnerPins = this.learnerPins.slice(0, this.hotspots.length);
		}
		if (!this.editing || !this.hasImage) {
			this.cancelMarkerDrag?.();
			this.selectedMarkerId = null;
			this.popoverMarkerId = null;
			this.dragPreview = null;
		}
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		if (this.markerPopup.open && (!this.editing || !this.popoverMarkerId || !this.markers.some(m => m.id === this.popoverMarkerId))) {
			this.markerPopup.hide();
		}
	}

	private renderLabelChip(markerId: string) {
		const marker = this.labelMarkers.find(m => m.id === markerId);
		if (!marker) return nothing;
		return html`<div
			class="label-chip"
			data-chip-id=${marker.id}
			data-ww-key=${marker.id}
			data-ww-drag=${ifDefined(!this.graded ? "img-label" : undefined)}
		>${marker.label || marker.id}</div>`;
	}

	protected renderPlacementTargets(): unknown {
		return nothing;
	}

	protected renderAuthorMarkerPreview(_marker: ImageMarker): unknown {
		return nothing;
	}

	protected renderMarkerSettings(_marker: ImageMarker): unknown {
		return nothing;
	}

	protected renderImageActions() {
		if (!this.hasImage) return nothing;
		const placements = this.isPlacementTask;
		const modifyImage = html`<button type="button" class="hint-btn edit-only modify-image-btn"
			@click=${(event: Event) => this.modifyImage(event)}>${this.msg("Modify image")}</button>`;
		const addHotspot = html`<button type="button" class="header-control helper-action edit-only add-hotspot-btn"
			data-ww-capture-selection="false" @click=${() => this.addMarkerAtDefault()}>
			${placements ? this.msg("Add zone") : this.msg("Add hotspot")}
		</button>`;
		if (placements) return html`${modifyImage}${addHotspot}`;
		return html`${modifyImage}${addHotspot}
			<button type="button" class="header-control helper-action edit-only add-label-pin-btn" data-ww-capture-selection="false"
				@click=${() => this.addMarkerAtDefault("label")}>${this.msg("Add label pin")}</button>`;
	}

	protected renderAnswer() {
		const editing = this.editing;
		const labelMarkers = this.labelMarkers;
		const hotspots = this.hotspots;
		const showFeedback = this.showFeedback;
		const { matchedMarkers, matchedPinIndices } = showFeedback
			? this.evaluatePins()
			: { matchedMarkers: new Set<string>(), matchedPinIndices: new Set<number>() };

		const hasImage = this.hasImage;
		const captureClicks = hasImage && (editing || (!this.isPlacementTask && hotspots.length > 0 && !this.graded));
		const popoverIndex = this.popoverMarkerId ? this.markers.findIndex(m => m.id === this.popoverMarkerId) : -1;
		const popoverMarker = popoverIndex !== -1 ? this.markers[popoverIndex] : null;

		const hints: string[] = [];
		if (editing) {
			if (!hasImage) {
				hints.push(this.isPlacementTask ? this.msg("Add an image to define the solution zones.")
					: this.msg("Add an image to mark the solution hotspots."));
			} else {
				hints.push(this.isPlacementTask ? this.msg("Add a zone, then choose its correct item.")
					: this.msg("Double-click a correct spot. Drag or click its center to edit."));
			}
		} else if (this.isPlacementTask) {
			hints.push(this.msg("Drag an item to a zone, or select an item and then a zone."));
		} else if (showFeedback) {
			const correctLabels = labelMarkers.filter(marker => this.isLabelCorrect(marker)).length;
			if (labelMarkers.length) hints.push(this.msg(str`${correctLabels} of ${labelMarkers.length} labels are correct.`));
			if (hotspots.length) hints.push(this.msg(str`${matchedMarkers.size} of ${hotspots.length} targets found.`));
		} else if (!this.graded) {
			if (labelMarkers.length) hints.push(this.msg("Drag each label onto its marker on the image."));
			if (hotspots.length) hints.push(this.msg("Click the target region(s) in the image."));
		}
		const helper = hints.join(" ");

		const placedLabelIds = new Set(Object.values(this.labelPlacements));
		const poolLabelIds = this.labelPoolOrder.filter(id => !placedLabelIds.has(id));
		const legacyImg = !this.mediaElement && this.src
			? html`<img class="stage-img" src=${this.src} alt=${this.alt} draggable="false">`
			: nothing;

		return html`
			${this.HelperRow(helper, editing ? this.renderImageActions() : nothing)}

			${!editing && !hasImage
				? html`<div class="empty-stage">${this.msg("No image selected.")}</div>`
				: html`<div @ww-dragcommit=${this.handleLabelDrop}>
					<div
						class=${classMap({
							"image-stage": true,
							empty: !hasImage,
							clickable: !editing && captureClicks,
							"edit-stage": editing,
						})}
					>
						<slot @slotchange=${() => this.requestUpdate()}></slot>
						<slot name="media" @slotchange=${() => this.requestUpdate()}></slot>
						${legacyImg}
						${captureClicks
							? html`<div
								class="marker-capture"
								style=${editing ? "cursor: default;" : ""}
								@click=${(e: MouseEvent) => {
									if (editing) {
										this.selectedMarkerId = null;
										this.markerPopup.hide();
									} else {
										this.handleLearnerImageClick(e);
									}
								}}
								@dblclick=${(e: MouseEvent) => {
									if (editing) this.handleAuthorImageDoubleClick(e);
								}}
							></div>`
							: nothing}

						${editing
							? this.markers.map((m, idx) => {
								const shown = this.dragPreview?.id === m.id ? this.dragPreview : m;
								const label = this.isLabelMarker(m);
								const rectangle = !label && m.shape === "rectangle";
								return html`<div
									class=${classMap({
										"marker-ring": true,
										"label-marker": label,
										rectangle,
										editable: true,
										selected: this.selectedMarkerId === m.id,
										dragging: this.dragPreview?.id === m.id,
									})}
									tabindex="0"
									role="group"
									data-marker-id=${m.id}
									data-ww-drop=${ifDefined(this.isPlacementTask && hasImage ? "image-piece" : undefined)}
									aria-label=${m.label || `${this.msg("Hotspot")} ${idx + 1}`}
									style=${markerStyle(shown, label)}
									@pointermove=${this.handleMarkerPointerMove}
									@pointerdown=${(e: PointerEvent) => this.handleMarkerPointerDown(e, m)}
									@dblclick=${(e: MouseEvent) => e.stopPropagation()}
									@keydown=${(e: KeyboardEvent) => this.handleMarkerKeyDown(e, idx)}
								>
									${this.renderAuthorMarkerPreview(m)}
									<button
										type="button"
										class="marker-center"
										data-marker-id=${m.id}
										aria-label=${this.isPlacementTask ? this.msg("Edit zone") : label ? this.msg("Edit label pin") : this.msg("Edit hotspot")}
										@click=${(e: MouseEvent) => this.handleMarkerCenterClick(e, m.id)}
									>${idx + 1}</button>
									${rectangle ? this.markerEdges(m) : nothing}
								</div>`;
							})
							: this.isPlacementTask ? this.renderPlacementTargets() : html`
								${labelMarkers.map((m, idx) => {
								const placedChip = this.labelPlacements[m.id];
								const correct = showFeedback && this.isLabelCorrect(m);
								const wrong = showFeedback && Boolean(placedChip) && !correct;
								const missed = showFeedback && !placedChip;
								return html`<div class="label-anchor" style=${styleMap({ left: `${m.x}%`, top: `${m.y}%` })}>
									<div
										class=${classMap({ "label-drop": true, filled: Boolean(placedChip), correct, wrong, missed })}
										data-ww-drop="img-label"
										data-ww-drop-max="1"
										data-ww-drop-full="swap"
										data-marker-id=${m.id}
									>
										${placedChip ? this.renderLabelChip(placedChip) : html`<span>${idx + 1}</span>`}
										${wrong || missed ? html`<span class="correction">${m.label}</span>` : nothing}
									</div>
								</div>`;
								})}
								${this.learnerPins.map((pin, idx) => {
									const correct = showFeedback && matchedPinIndices.has(idx);
									const wrong = showFeedback && !matchedPinIndices.has(idx);
									return html`<button
										type="button"
										class=${classMap({ "learner-pin": true, "pin-correct": correct, "pin-wrong": wrong })}
										style=${styleMap({ left: `${pin.x}%`, top: `${pin.y}%` })}
										?disabled=${this.graded}
										aria-label=${this.msg("Selected point")}
										@click=${(e: Event) => {
											e.stopPropagation();
											if (!this.graded) this.learnerPins = this.learnerPins.filter((_, i) => i !== idx);
										}}
									>${idx + 1}</button>`;
								})}
								${showFeedback
									? hotspots.filter(m => !matchedMarkers.has(m.id)).map((m, idx) => html`<div
										class=${classMap({ "marker-ring": true, "target-missed": true, rectangle: m.shape === "rectangle" })}
										style=${markerStyle(m)}
									><span class="ring-badge">${m.label || idx + 1}</span></div>`)
									: nothing}
								`}
					</div>

					${!editing && labelMarkers.length && !this.graded
						? html`<div class="grid-pool" data-ww-drop="img-label">
							<span class="pool-label">${this.msg("Labels")}</span>
							${poolLabelIds.length
								? poolLabelIds.map(id => this.renderLabelChip(id))
								: html`<span class="helper">${this.msg("All labels are placed.")}</span>`}
						</div>`
						: nothing}
				</div>`}

			${editing ? html`<div popover="manual" class="top-layer marker-popover" ${ref(this.markerPanel)}>
				${popoverMarker && popoverIndex !== -1 ? html`<div class="marker-popover-card">
					<div class="marker-popover-header">
						<span class="marker-index">${popoverIndex + 1}</span>
						${this.isPlacementTask ? nothing : this.markerTypeButtons(popoverMarker)}
						<sl-icon-button
							class="marker-delete-btn"
							src=${TrashIcon}
							label=${this.msg("Remove")}
							@click=${() => this.removeMarker(popoverIndex)}
						></sl-icon-button>
					</div>
					<div class="marker-popover-label-row">
						<input
							type="text"
							class="marker-label-input"
							aria-label=${this.msg("Label")}
							.value=${live(popoverMarker.label)}
							@change=${(e: Event) => this.updateMarker(popoverMarker.id, { label: (e.target as HTMLInputElement).value })}
						>
						${this.isPlacementTask || this.isLabelMarker(popoverMarker) ? nothing : this.shapeButtons(popoverMarker)}
					</div>
					${this.renderMarkerSettings(popoverMarker)}
				</div>` : nothing}
			</div>` : nothing}
		`;
	}
}
