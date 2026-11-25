import type { MsgFn } from "@lit/localize";
import SlIconButton from "@shoelace-style/shoelace/dist/components/icon-button/icon-button.component.js";
import UndoIcon from "@tabler/icons/outline/arrow-back-up.svg";
import BrushIcon from "@tabler/icons/outline/brush.svg";
import ChevronDownIcon from "@tabler/icons/outline/chevron-down.svg";
import CircleIcon from "@tabler/icons/outline/circle.svg";
import EraserIcon from "@tabler/icons/outline/eraser.svg";
import PencilIcon from "@tabler/icons/outline/pencil.svg";
import SlashIcon from "@tabler/icons/outline/slash.svg";
import SquareIcon from "@tabler/icons/outline/square.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import { GraphicCanvas, loadGraphicMarkup, type GraphicCanvasTool } from "@webwriter/widget/graphic";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { name as packageId } from "../../package.json";
import { encryptedProperty, encryptPlaintextAttributes } from "../components/encrypted-property";
import { messageFor } from "../components/localization";
import { WebwriterTask } from "../components/webwriter-task";
import { registerQuizType } from "../model/quiz-api";
import { selfAssessmentOption } from "../components/rubric-popover";
import { TopLayerPopup } from "../components/top-layer";

declare global {
	interface HTMLElementTagNameMap {
		"webwriter-drawing": WebwriterDrawing;
	}
}

function pictureHasSource(picture: HTMLPictureElement | null): boolean {
	if (!picture) return false;
	const img = picture.querySelector("img");
	if (img?.getAttribute("src")?.trim() || img?.getAttribute("srcset")?.trim()) return true;
	return Array.from(picture.querySelectorAll("source")).some(source => Boolean(source.getAttribute("srcset")?.trim()));
}

const COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#ca8a04"];
const WIDTHS = [2, 5, 10];
const VIEWBOX_WIDTH = 800;
const DEFAULT_CANVAS_HEIGHT = 320;
const MIN_CANVAS_HEIGHT = 120;

registerQuizType({
	packageId,
	widgetPosition: 100,
	section: "show",
	id: "webwriter-drawing",
	getName: (locale, translate = messageFor(locale)) => translate("Sketch"),
	icon: BrushIcon,
	createInstance: () => document.createElement("webwriter-drawing"),
});

/**
 * An SVG sketchpad response task powered by `@webwriter/graphic` with an optional
 * author-provided background image and an optional edit-mode comparison solution.
 * Authors can award completion credit or let learners assess their work with a rubric.
 */
@customElement("webwriter-drawing")
export class WebwriterDrawing extends WebwriterTask {
	static styles = [WebwriterTask.styles, css`
		:host {
			display: block;
		}

		.task-helper {
			margin-block-end: var(--sl-spacing-x-small);
		}

		.modify-bg-btn {
			margin-block: -1px;
			border: 1px solid var(--sl-color-neutral-300);
			background: var(--sl-color-neutral-0);
			font-size: var(--sl-font-size-small);
		}

		.toolbar-region {
			container: sketch-toolbar / inline-size;
		}

		.toolbar {
			--control-size: 1.75rem;
			display: flex;
			align-items: center;
			gap: var(--sl-spacing-2x-small);
			padding: var(--sl-spacing-2x-small);
			overflow-x: auto;
			scrollbar-width: none;
			border: 1px solid var(--sl-color-neutral-300);
			border-start-start-radius: var(--sl-border-radius-medium);
			border-start-end-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
		}

		.tools,
		.inline-options,
		.toolbar-actions,
		.toolbar-picker {
			display: flex;
			flex: none;
			align-items: center;
		}

		.toolbar-actions {
			margin-inline-start: auto;
		}

		.tools {
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-small);
			background: var(--sl-color-neutral-0);

			> button {
				border: 0;
				border-radius: 0;
			}

			> button + button {
				border-inline-start: 1px solid var(--sl-color-neutral-300);
			}

			> button:first-child {
				border-start-start-radius: inherit;
				border-end-start-radius: inherit;
			}

			> button:last-child {
				border-start-end-radius: inherit;
				border-end-end-radius: inherit;
			}
		}

		.tool-btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex: none;
			gap: var(--sl-spacing-3x-small);
			box-sizing: border-box;
			min-inline-size: max(24px, var(--control-size));
			min-block-size: max(24px, var(--control-size));
			padding: 0;
			border: 1px solid transparent;
			border-radius: var(--sl-border-radius-small);
			background: transparent;
			color: var(--sl-color-neutral-700);
			font: inherit;
			font-size: 1rem;
			line-height: 1;
			cursor: pointer;

			&[aria-pressed="true"],
			&[aria-expanded="true"] {
				box-shadow: inset 0 0 0 1px var(--ww-theme-accent-1, var(--sl-color-primary-500));
				background: var(--sl-color-primary-50);
				color: var(--ww-theme-accent-1, var(--sl-color-primary-700));
			}

			&:focus-visible {
				position: relative;
				z-index: 1;
				outline-offset: -2px;
			}

			&[aria-disabled="true"] {
				opacity: 0.45;
				cursor: default;
			}
		}

		@media (hover: hover) {
			.tool-btn:hover:not([aria-disabled="true"]):not([aria-pressed="true"]):not([aria-expanded="true"]) {
				background: var(--sl-color-neutral-100);
			}
		}

		.divider {
			flex: none;
			block-size: 1.125rem;
			border-inline-start: 1px solid var(--sl-color-neutral-300);
		}

		.swatch {
			display: block;
			inline-size: 1rem;
			block-size: 1rem;
			box-sizing: border-box;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: 50%;
			background: var(--swatch-color);
			forced-color-adjust: none;
		}

		.size-option {
			min-inline-size: 2.375rem;
			white-space: nowrap;
		}

		.size-option,
		.size-picker .picker-trigger {
			font-size: var(--sl-font-size-x-small);
			font-variant-numeric: tabular-nums;
		}

		.picker-trigger {
			padding-inline: var(--sl-spacing-2x-small);
			border-color: var(--sl-color-neutral-300);
			background: var(--sl-color-neutral-0);
		}

		.picker-chevron {
			font-size: 0.75rem;
		}

		.toolbar-popover-body {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--sl-spacing-2x-small);
			box-sizing: border-box;
			max-inline-size: calc(100vw - 16px);
			max-block-size: var(--popup-space, calc(100dvh - 16px));
			padding: var(--sl-spacing-2x-small);
			overflow: auto;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-large);
		}

		.inline-options {
			display: none;
		}

		/* Expand each picker only when the whole group fits alongside the remaining controls. */
		@container sketch-toolbar (min-width: 27rem) {
			.size-picker .inline-options { display: flex; }
			.size-picker > .picker-trigger { display: none; }
		}

		@container sketch-toolbar (min-width: 33rem) {
			.color-picker .inline-options { display: flex; }
			.color-picker > .picker-trigger { display: none; }
		}

		@media (pointer: coarse) {
			@container sketch-toolbar (min-width: 36rem) {
				.toolbar { --control-size: 2rem; }
			}
		}

		@container sketch-toolbar (max-width: 21rem) {
			.toolbar {
				--control-size: 1.5rem;
				gap: var(--sl-spacing-3x-small);
			}

			.divider { display: none; }
			.picker-trigger { padding-inline: 0; }
		}

		@container sketch-toolbar (max-width: 17rem) {
			.toolbar {
				padding-inline: var(--sl-spacing-3x-small);
			}

			.picker-chevron { display: none; }
		}

		@media (forced-colors: active) {
			.tool-btn:is([aria-pressed="true"], [aria-expanded="true"]) {
				outline: 1px solid Highlight;
				outline-offset: -2px;
			}
		}

		@supports not selector(:popover-open) {
			.toolbar .inline-options { display: flex; }
			.toolbar .picker-trigger,
			.toolbar .toolbar-popover { display: none; }
		}

		.canvas-stage {
			position: relative;
			box-sizing: content-box;
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			overflow: hidden;
			overflow: clip;
		}

		.toolbar-region + .canvas-stage {
			border-block-start: 0;
			border-start-start-radius: 0;
			border-start-end-radius: 0;
		}

		.canvas-stage:has(.resize-canvas:is(:hover, :focus-visible)) {
			border-block-end-color: var(--ww-theme-accent-1, var(--sl-color-primary-600, Highlight));
		}

		.resize-canvas {
			position: absolute;
			inset-block-end: 0;
			inset-inline: 0;
			block-size: 0.5rem;
			padding: 0;
			border: 0;
			background: none;
			cursor: ns-resize;
			touch-action: none;
			-webkit-user-select: none;
			user-select: none;
		}

		slot[name="background"] {
			position: absolute;
			inset: 0;
			display: block;
			pointer-events: none;
		}

		.canvas-stage.with-image slot[name="background"] {
			opacity: 0;
		}

		::slotted(picture[slot="background"]) {
			display: block;
			width: 100%;
			height: 100%;
			margin: 0;
		}

		.canvas-stage.awaiting-bg slot[name="background"] {
			pointer-events: auto;
		}

		.bg-image {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			pointer-events: none;
			user-select: none;
		}

		svg.draw-svg,
		svg.solution-svg {
			position: absolute;
			inset: 0;
			display: block;
			width: 100%;
			height: 100%;
			touch-action: none;
			cursor: crosshair;
		}

		svg.draw-svg.locked,
		svg.solution-svg {
			cursor: default;
		}

		.canvas-stage.awaiting-bg svg.draw-svg {
			pointer-events: none;
		}

		.solution-comparison {
			margin-top: var(--sl-spacing-small);
			padding: var(--sl-spacing-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-50);
		}

		.solution-title {
			margin-bottom: var(--sl-spacing-x-small);
			font-size: var(--sl-font-size-small);
			font-weight: var(--sl-font-weight-semibold);
			color: var(--sl-color-neutral-700);
		}
	`];

	/** @internal */
	static scopedElements = {
		...WebwriterTask.scopedElements,
		"sl-icon-button": SlIconButton,
	};

	static options = {
		...WebwriterTask.options,
		required: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require a drawing before submitting") },
		canvasHeight: {
			type: "number",
			label: (widget: { msg: MsgFn }) => widget.msg("Canvas height"),
			min: MIN_CANVAS_HEIGHT,
		},
		gradingMethod: {
			type: "select",
			label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"),
			options: [
				{
					value: "completion",
					label: (widget: { msg: MsgFn }) => widget.msg("Completion credit"),
					description: (widget: { msg: MsgFn }) => widget.msg("Full credit when a drawing is submitted."),
				},
				selfAssessmentOption,
				{
					value: "ungraded",
					label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"),
					description: (widget: { msg: MsgFn }) => widget.msg("Shows the optional sample for comparison without scoring."),
				},
			],
		},
	};

	static gradingOptions = ["points", "gradingMethod"];

	/** Legacy fallback background image URL or data URL when no `<picture slot="background">` child is present. */
	@property({ type: String, attribute: "background-src", reflect: true, useDefault: true })
	accessor backgroundSrc = "";

	/** Whether learners must draw at least one shape or stroke before submitting. */
	@property({ type: Boolean, attribute: true, reflect: true, useDefault: true })
	accessor required = false;

	/** Canvas height in CSS pixels, including when a background image is present. */
	@property({ type: Number, attribute: "canvas-height", reflect: true, useDefault: true })
	accessor canvasHeight = DEFAULT_CANVAS_HEIGHT;

	/** SVG reference drawn in edit mode and shown for comparison after submission. */
	@property({ type: String, attribute: true, reflect: true, useDefault: true, converter: encryptedProperty })
	accessor solution = "";

	/** When true, submitting a non-empty drawing earns full credit instead of leaving the task ungraded. */
	@property({ type: Boolean, attribute: "completion-credit", reflect: true, useDefault: true })
	accessor completionCredit = false;

	/** How to grade the drawing, if at all. */
	@property({
		type: String,
		attribute: "grading-method",
		reflect: true,
		useDefault: true,
		converter: value => value === "completion" || value === "self-assess" ? value : "ungraded",
	})
	accessor gradingMethod: "ungraded" | "completion" | "self-assess" = "ungraded";

	@state() private accessor tool: GraphicCanvasTool = "pen";
	@state() private accessor color = COLORS[0];
	@state() private accessor strokeWidth = WIDTHS[1];
	@state() private accessor graded = false;
	@state() private accessor canUndo = false;
	@state() private accessor hasActiveDrawing = false;
	@state() private accessor resizeHeight: number | undefined;

	@query("svg.draw-svg")
	private accessor svg!: SVGSVGElement | null;

	@query("svg.solution-svg")
	private accessor solutionSvg!: SVGSVGElement | null;

	@query("img.legacy-bg")
	private accessor legacyBackground!: HTMLImageElement | null;

	@query(".toolbar")
	private accessor toolbar!: HTMLElement | null;

	private controller?: GraphicCanvas;
	private backgroundObserver?: MutationObserver;
	private toolbarObserver?: ResizeObserver;
	private toolbarTabStop?: HTMLButtonElement;
	private lastModeEditing?: boolean;
	private learnerHasDrawing = false;
	private resizeDrag?: {
		handle: HTMLButtonElement;
		pointerId: number;
		startY: number;
		startHeight: number;
	};

	private get backgroundPicture(): HTMLPictureElement | null {
		return this.querySelector<HTMLPictureElement>(':scope > picture[slot="background"]');
	}

	private get awaitingBackground(): boolean {
		return this.editing && Boolean(this.backgroundPicture) && !pictureHasSource(this.backgroundPicture);
	}

	private get authoredHeight(): number {
		return Number.isFinite(this.canvasHeight) && this.canvasHeight >= MIN_CANVAS_HEIGHT
			? this.canvasHeight
			: DEFAULT_CANVAS_HEIGHT;
	}

	private get canResizeCanvas(): boolean {
		return this.editing && !this.awaitingBackground;
	}

	private resizeCanvas(height: number) {
		if (!this.isConnected || !this.canResizeCanvas) return;
		const next = Math.max(MIN_CANVAS_HEIGHT, Math.round(height));
		if (next !== this.authoredHeight) {
			transaction(this, () => this.setAttribute("canvas-height", String(next)));
		}
	}

	private startResize(event: PointerEvent) {
		if (!this.canResizeCanvas || this.resizeDrag || event.button !== 0) return;
		const handle = event.currentTarget as HTMLButtonElement;
		handle.setPointerCapture(event.pointerId);
		this.resizeDrag = {
			handle,
			pointerId: event.pointerId,
			startY: event.clientY,
			startHeight: this.authoredHeight,
		};
		event.preventDefault();
	}

	private moveResize(event: PointerEvent) {
		const drag = this.resizeDrag;
		if (drag?.pointerId !== event.pointerId) return;
		this.resizeHeight = Math.max(MIN_CANVAS_HEIGHT, Math.round(drag.startHeight + event.clientY - drag.startY));
	}

	private finishResize(event: PointerEvent) {
		const drag = this.resizeDrag;
		if (drag?.pointerId !== event.pointerId) return;
		this.moveResize(event);
		const height = this.resizeHeight;
		this.cancelResize();
		if (height !== undefined && drag.startHeight === this.authoredHeight) this.resizeCanvas(height);
	}

	private cancelResize(event?: PointerEvent) {
		const drag = this.resizeDrag;
		if (!drag || (event && drag.pointerId !== event.pointerId)) return;
		this.resizeDrag = undefined;
		this.resizeHeight = undefined;
		if (drag.handle.hasPointerCapture(drag.pointerId)) drag.handle.releasePointerCapture(drag.pointerId);
	}

	private renderResizeCanvas() {
		if (!this.canResizeCanvas) return nothing;
		return html`<button type="button" class="resize-canvas" data-ww-capture-selection="false"
			aria-label=${this.msg("Canvas height")} aria-keyshortcuts="ArrowUp ArrowDown"
			@pointerdown=${this.startResize} @pointermove=${this.moveResize} @pointerup=${this.finishResize}
			@pointercancel=${this.cancelResize} @lostpointercapture=${this.cancelResize}
			@keydown=${(event: KeyboardEvent) => {
				if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
				event.preventDefault();
				this.resizeCanvas(this.authoredHeight + (event.key === "ArrowDown" ? 16 : -16));
			}}></button>`;
	}

	private get isCanvasLocked(): boolean {
		return (!this.editing && this.graded) || this.awaitingBackground;
	}

	private pickerParts(id: string) {
		const panel = this.renderRoot.querySelector<HTMLElement>(`#${id}`);
		const keep = panel?.parentElement;
		const trigger = keep?.querySelector<HTMLButtonElement>(".picker-trigger");
		return { panel, keep, trigger, scrollArea: panel?.querySelector<HTMLElement>(".toolbar-popover-body") };
	}

	private createToolbarPopup(id: string) {
		return new TopLayerPopup(this, () => this.pickerParts(id), {
			onShow: () => {
				const { panel } = this.pickerParts(id);
				const target = panel?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
					?? panel?.querySelector<HTMLButtonElement>('button:not([aria-disabled="true"])')
					?? panel?.querySelector<HTMLButtonElement>("button");
				target?.focus({ preventScroll: true });
			},
		});
	}

	private colorPopup = this.createToolbarPopup("sketch-color");
	private sizePopup = this.createToolbarPopup("sketch-size");

	private toolbarButtons() {
		return Array.from(this.toolbar?.querySelectorAll<HTMLButtonElement>("button") ?? [])
			.filter(button => !button.closest(".toolbar-popover, [inert]") && button.getClientRects().length);
	}

	private syncToolbar = () => {
		const locked = this.isCanvasLocked;
		if (this.colorPopup.open && (locked || !this.pickerParts("sketch-color").trigger?.getClientRects().length)) this.colorPopup.hide();
		if (this.sizePopup.open && (locked || !this.pickerParts("sketch-size").trigger?.getClientRects().length)) this.sizePopup.hide();
		if (!("focusGroup" in HTMLElement.prototype)) this.setToolbarTabStop();
	};

	private setToolbarTabStop(button = this.toolbarTabStop) {
		const buttons = this.toolbarButtons();
		if (button && !buttons.includes(button)) button = undefined;
		this.toolbarTabStop = button ?? buttons[0];
		for (const control of buttons) control.tabIndex = control === this.toolbarTabStop ? 0 : -1;
	}

	private handleToolbarFocus(event: FocusEvent) {
		if ("focusGroup" in HTMLElement.prototype || !(event.target instanceof HTMLButtonElement)) return;
		if (!event.target.closest(".toolbar-popover")) this.setToolbarTabStop(event.target);
	}

	private handleToolbarKey(event: KeyboardEvent) {
		if ("focusGroup" in HTMLElement.prototype || !(event.target instanceof HTMLButtonElement)) return;
		const buttons = this.toolbarButtons();
		const index = buttons.indexOf(event.target);
		if (index < 0) return;
		const direction = getComputedStyle(event.currentTarget as HTMLElement).direction === "rtl" ? -1 : 1;
		let next: HTMLButtonElement;
		switch (event.key) {
			case "Home": next = buttons[0]; break;
			case "End": next = buttons[buttons.length - 1]; break;
			case "ArrowRight": next = buttons[(index + direction + buttons.length) % buttons.length]; break;
			case "ArrowLeft": next = buttons[(index - direction + buttons.length) % buttons.length]; break;
			default: return;
		}
		event.preventDefault();
		next.focus();
	}

	private closeToolbarPopup(id: string, popup: TopLayerPopup) {
		if (!popup.open) return;
		popup.hide();
		this.pickerParts(id).trigger?.focus({ preventScroll: true });
	}

	private async editBackground(event: Event) {
		event.stopPropagation();
		if (!this.isConnected || !this.editing) return;
		const button = event.currentTarget as HTMLButtonElement;
		let picture = this.backgroundPicture;
		if (!picture) {
			const next = this.ownerDocument.createElement("picture");
			next.slot = "background";
			const image = this.ownerDocument.createElement("img");
			const source = this.backgroundSrc.trim();
			if (source) image.src = source;
			next.append(image);
			transaction(this, () => {
				this.insertBefore(next, this.feedbackElement);
				if (source) this.removeAttribute("background-src");
				this.requestUpdate();
			});
			picture = next;
			await this.updateComplete;
		}
		if (!this.isConnected || !this.editing || this.backgroundPicture !== picture) return;
		const rect = picture.getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;
		button.blur();
		picture.dispatchEvent(new PointerEvent("pointerdown", {
			bubbles: true,
			composed: true,
			cancelable: true,
			button: 0,
			pointerType: "mouse",
			clientX,
			clientY,
		}));
		picture.dispatchEvent(new MouseEvent("click", {
			bubbles: true,
			composed: true,
			cancelable: true,
			button: 0,
			clientX,
			clientY,
		}));
	}

	private syncStateFromController() {
		if (!this.controller) return;
		this.canUndo = this.controller.canUndo;
		this.hasActiveDrawing = !this.controller.isEmpty;
		if (!this.editing) {
			this.learnerHasDrawing = !this.controller.isEmpty;
		}
	}

	private handleGraphicChange() {
		if (!this.controller) return;
		this.syncStateFromController();
		if (this.editing) {
			const serialized = this.controller.serialize();
			if (serialized !== this.solution) {
				transaction(this, () => {
					this.solution = serialized;
				});
			}
		}
	}

	private undoStroke() {
		if (this.isCanvasLocked) return;
		this.controller?.undo();
	}

	private clearCanvas() {
		if (this.isCanvasLocked) return;
		this.controller?.clear();
	}

	protected override get isUngraded(): boolean {
		return !this.completionCredit && this.gradingMethod !== "completion";
	}

	protected willUpdate(changed: PropertyValues<this>): void {
		super.willUpdate(changed);
		if (this.isSelfAssessment) {
			this.completionCredit = false;
		} else if (changed.has("completionCredit") && (changed.get("completionCredit") !== undefined || this.completionCredit)) {
			this.gradingMethod = this.completionCredit ? "completion" : "ungraded";
		} else if (changed.has("gradingMethod")) {
			this.completionCredit = this.gradingMethod === "completion";
		}
	}

	checkAnswer(): number {
		this.graded = true;
		return this.learnerHasDrawing ? 1 : 0;
	}

	checkValidity(): boolean {
		return !this.required || this.learnerHasDrawing;
	}

	reset(): void {
		this.graded = false;
		this.learnerHasDrawing = false;
		this.controller?.load("");
		this.syncStateFromController();
	}

	override showScore(score: number | undefined, submitted = score !== undefined) {
		super.showScore(score, submitted);
		if (!this.editing) this.graded = submitted;
	}

	override connectedCallback() {
		super.connectedCallback();
		this.toolbarObserver = new ResizeObserver(this.syncToolbar);
		if (this.toolbar) this.toolbarObserver.observe(this.toolbar);
		this.addEventListener("load", this.refreshBackground, true);
		this.addEventListener("error", this.refreshBackground, true);
		this.backgroundObserver = new MutationObserver(() => this.requestUpdate());
		this.backgroundObserver.observe(this, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["src", "srcset", "sizes", "media", "type", "slot"],
		});
		this.requestUpdate();
	}

	override disconnectedCallback() {
		this.cancelResize();
		this.toolbarObserver?.disconnect();
		this.toolbarObserver = undefined;
		this.removeEventListener("load", this.refreshBackground, true);
		this.removeEventListener("error", this.refreshBackground, true);
		this.controller?.destroy();
		this.controller = undefined;
		this.backgroundObserver?.disconnect();
		this.backgroundObserver = undefined;
		super.disconnectedCallback();
	}

	private refreshBackground = () => this.requestUpdate();

	protected firstUpdated(changed: PropertyValues): void {
		super.firstUpdated(changed);
		if (this.toolbar) this.toolbarObserver?.observe(this.toolbar);
		if (this.editing) encryptPlaintextAttributes(this);
	}

	protected updated(changed: PropertyValues): void {
		super.updated(changed);
		this.syncToolbar();
		if (changed.has("completionCredit")) this.refreshDrawer();
		if (!this.canResizeCanvas || (this.resizeDrag && this.resizeDrag.startHeight !== this.authoredHeight)) {
			this.cancelResize();
		}
		const svg = this.svg;
		if (svg && this.controller?.svg !== svg) {
			this.controller?.destroy();
			this.controller = new GraphicCanvas(svg, {
				tool: this.tool,
				color: this.color,
				strokeWidth: this.strokeWidth,
				disabled: this.isCanvasLocked,
				onChange: () => this.handleGraphicChange(),
			});
			if (this.editing) this.controller.load(this.solution);
			this.syncStateFromController();
		}

		if (this.controller && this.lastModeEditing !== undefined && this.lastModeEditing !== this.editing) {
			this.controller.load(this.editing ? this.solution : "");
			this.syncStateFromController();
		}
		this.lastModeEditing = this.editing;

		if (this.controller && this.editing && changed.has("solution") && this.controller.serialize() !== this.solution) {
			this.controller.load(this.solution);
			this.syncStateFromController();
		}

		this.controller?.setOptions({
			tool: this.tool,
			color: this.color,
			strokeWidth: this.strokeWidth,
			disabled: this.isCanvasLocked,
		});

		if (!this.editing && this.graded && this.solution && this.solutionSvg) {
			loadGraphicMarkup(this.solutionSvg, this.solution);
		}
	}

	private toolbarPopover(id: string, label: string, options: TemplateResult) {
		return html`<div id=${id} class="top-layer toolbar-popover" popover="manual" focusgroup="none">
			<div class="toolbar-popover-body" role="group" aria-label=${label}>${options}</div>
		</div>`;
	}

	private renderPicker(kind: "color" | "size", label: string, selection: string, preview: TemplateResult, options: TemplateResult) {
		const id = `sketch-${kind}`;
		const popup = kind === "color" ? this.colorPopup : this.sizePopup;
		const description = `${label} (${selection})`;
		return html`<div class=${`toolbar-picker ${kind}-picker`}>
			<div class="inline-options" role="group" aria-label=${label}>${options}</div>
			<button type="button" class="tool-btn picker-trigger" aria-label=${description} title=${description}
				aria-controls=${id} aria-expanded=${String(popup.open)} aria-disabled=${String(this.isCanvasLocked)}
				@click=${() => { if (!this.isCanvasLocked) popup.toggle(); }}>
				${preview}<sl-icon class="picker-chevron" src=${ChevronDownIcon} aria-hidden="true"></sl-icon>
			</button>
			${this.toolbarPopover(id, label, options)}
		</div>`;
	}

	private renderHistory(locked: boolean) {
		const undo = this.msg("Undo");
		const clear = this.msg("Clear");
		return html`
			${this.editing ? nothing : html`<button type="button" class="tool-btn undo-btn" aria-label=${undo} title=${undo}
				aria-disabled=${String(locked || !this.canUndo)} @click=${() => {
					if (!this.editing && this.canUndo) this.undoStroke();
				}}><sl-icon src=${UndoIcon} aria-hidden="true"></sl-icon></button>`}
			<button type="button" class="tool-btn clear-drawing-btn" aria-label=${clear} title=${clear}
				aria-disabled=${String(locked || !this.hasActiveDrawing)} @click=${() => {
					if (this.hasActiveDrawing) this.clearCanvas();
				}}><sl-icon src=${TrashIcon} aria-hidden="true"></sl-icon></button>
		`;
	}

	private renderToolbar(locked: boolean) {
		const tools: Array<{ id: GraphicCanvasTool; label: string; icon: string }> = [
			{ id: "pen", label: this.msg("Pen"), icon: PencilIcon },
			{ id: "line", label: this.msg("Line"), icon: SlashIcon },
			{ id: "rect", label: this.msg("Rectangle"), icon: SquareIcon },
			{ id: "ellipse", label: this.msg("Ellipse"), icon: CircleIcon },
			{ id: "eraser", label: this.msg("Eraser"), icon: EraserIcon },
		];
		const colorNames = [this.msg("Black"), this.msg("Blue"), this.msg("Red"), this.msg("Green"), this.msg("Yellow")];
		const swatch = (color: string) => html`<span class="swatch" style=${styleMap({ "--swatch-color": color })} aria-hidden="true"></span>`;
		const colors = html`${COLORS.map((color, i) => html`<button type="button" class="tool-btn color-option"
			aria-label=${colorNames[i]} title=${colorNames[i]}
			aria-pressed=${String(this.tool !== "eraser" && this.color === color)} aria-disabled=${String(locked)}
			@click=${() => {
				if (this.isCanvasLocked) return;
				if (this.tool === "eraser") this.tool = "pen";
				this.color = color;
				this.closeToolbarPopup("sketch-color", this.colorPopup);
			}}>${swatch(color)}</button>`)}`;
		const sizes = html`${WIDTHS.map(width => html`<button type="button" class="tool-btn size-option"
			aria-pressed=${String(this.strokeWidth === width)} aria-disabled=${String(locked)}
			@click=${() => {
				if (this.isCanvasLocked) return;
				this.strokeWidth = width;
				this.closeToolbarPopup("sketch-size", this.sizePopup);
			}}>${width} px</button>`)}`;
		const toolsLabel = this.msg("Drawing tools");
		return html`
			<div class="toolbar-region">
				<div class="toolbar" role="toolbar" aria-label=${toolsLabel} focusgroup="toolbar wrap"
					@focusin=${this.handleToolbarFocus} @keydown=${this.handleToolbarKey}>
					<div class="tools" role="group" aria-label=${this.msg("Tool")}>
						${tools.map(tool => html`<button type="button" class="tool-btn" data-tool=${tool.id}
							aria-label=${tool.label} title=${tool.label}
							aria-pressed=${String(this.tool === tool.id)} aria-disabled=${String(locked)}
							@click=${() => { if (!this.isCanvasLocked) this.tool = tool.id; }}>
							<sl-icon src=${tool.icon} aria-hidden="true"></sl-icon>
						</button>`)}
					</div>
					<span class="divider" role="separator" aria-orientation="vertical"></span>
					${this.renderPicker("color", this.msg("Color"), colorNames[COLORS.indexOf(this.color)] ?? this.color, swatch(this.color), colors)}
					${this.renderPicker("size", this.msg("Stroke width"), `${this.strokeWidth} px`, html`${this.strokeWidth}`, sizes)}
					<div class="toolbar-actions">${this.renderHistory(locked)}</div>
				</div>
			</div>
		`;
	}

	protected renderAnswer() {
		const editing = this.editing;
		const awaitingBg = this.awaitingBackground;
		const locked = this.isCanvasLocked;
		const height = this.canResizeCanvas ? this.resizeHeight ?? this.authoredHeight : this.authoredHeight;
		const picture = this.backgroundPicture;
		const legacySrc = picture ? "" : this.backgroundSrc.trim();
		const pictureImg = picture?.querySelector("img");
		const image = pictureImg ?? (legacySrc ? this.legacyBackground : null);
		const imageUrl = image?.naturalWidth && image.naturalHeight ? image.currentSrc : undefined;
		const stageSize = { height: `${height}px` };
		const legacyBg = legacySrc
			? html`<img class="bg-image legacy-bg" src=${legacySrc} alt=""
				@load=${this.refreshBackground} @error=${this.refreshBackground}>`
			: nothing;
		// Both drawing layers share the authored SVG coordinate system as the card scales.
		const viewBox = `0 0 ${VIEWBOX_WIDTH} ${height}`;
		const hint = !editing ? this.msg("Draw your answer.")
			: awaitingBg ? this.msg("Choose a background image.") : this.msg("Draw the solution.");
		const backgroundButton = editing ? html`
			<button type="button" class="header-control edit-only modify-bg-btn" data-ww-capture-selection="false"
				@click=${this.editBackground}>${picture || legacySrc ? this.msg("Modify image") : this.msg("Add background")}</button>
		` : nothing;

		return html`
			${this.HelperRow(hint, backgroundButton)}
			${this.renderToolbar(locked)}
			<div class=${classMap({ "canvas-stage": true, "awaiting-bg": awaitingBg, "with-image": Boolean(imageUrl) })} style=${styleMap(stageSize)}>
				<slot name="background" @slotchange=${this.refreshBackground}></slot>
				${legacyBg}
				${pictureImg && imageUrl ? html`<img class="bg-image" src=${imageUrl} alt="">` : nothing}
				<svg
					class=${classMap({ "draw-svg": true, locked })}
					viewBox=${viewBox}
					preserveAspectRatio="none"
				></svg>
				${this.renderResizeCanvas()}
			</div>
			${!editing && this.graded && this.solution
				? html`<div class="solution-comparison">
					<div class="solution-title">${this.msg("Solution")}</div>
					<div class=${classMap({ "canvas-stage": true, "solution-stage": true, "with-image": Boolean(imageUrl) })} style=${styleMap(stageSize)}>
						${imageUrl ? html`<img class="bg-image" src=${imageUrl} alt="">` : nothing}
						<svg
							class="solution-svg"
							viewBox=${viewBox}
							preserveAspectRatio="none"
						></svg>
					</div>
				</div>`
				: nothing}
		`;
	}
}
