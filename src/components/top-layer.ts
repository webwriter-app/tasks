import { css, type ReactiveController, type ReactiveControllerHost } from "lit";
import { closeWhenEditorMovesOn } from "./follow-editor";

/**
 * A popover shown by `TopLayerPopup`. In the top layer it is in front of the page, of other
 * cards and of the editor's controls, and no ancestor clips it. Its content brings its own look.
 */
export const topLayerStyles = css`
	.top-layer {
		position: fixed;
		inset: auto;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		overflow: visible;
	}
`;

type Align = "start" | "end";

/** Puts the panel below its anchor, or above it when there is no room below, and keeps it in the viewport. */
function place(panel: HTMLElement, anchor: HTMLElement, align: Align, gap = 4, scrollArea?: HTMLElement | null) {
	const margin = 8;
	const viewport = panel.ownerDocument.documentElement;
	const box = anchor.getBoundingClientRect();
	const { width, height } = panel.getBoundingClientRect();
	const toEnd = (align === "end") !== (getComputedStyle(anchor).direction === "rtl");
	const above = box.top - gap - margin;
	const below = viewport.clientHeight - box.bottom - gap - margin;
	const left = Math.round(Math.max(margin, Math.min(toEnd ? box.right - width : box.left, viewport.clientWidth - width - margin)));
	let top = box.bottom + gap;
	if (scrollArea) {
		const naturalHeight = height + Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);
		const flip = naturalHeight > below && above > below;
		panel.dataset.placement = flip ? "above" : "below";
		panel.style.setProperty("--popup-space", `${Math.max(0, flip ? above : below)}px`);
		panel.style.setProperty("--popup-anchor-x", `${(box.left + box.right) / 2 - left}px`);
		if (flip) top = box.top - gap - panel.getBoundingClientRect().height;
	} else if (height > below && height <= above) {
		top = box.top - gap - height;
	}
	panel.style.top = `${Math.round(top)}px`;
	panel.style.left = `${left}px`;
	panel.style.setProperty("--popup-side-space", `${Math.max(left, viewport.clientWidth - left - width) - margin}px`);
}

type Parts = {
	trigger?: HTMLElement | null;
	panel?: HTMLElement | null;
	keep?: HTMLElement | null;
	/** Used when the panel opens from a different element than the one that opens it. */
	anchor?: HTMLElement | null;
	/** A scrollable body to fit tall content within the available space. */
	scrollArea?: HTMLElement | null;
};

type Options = {
	/** Which edge of the trigger the panel lines up with. */
	align?: Align | (() => Align);
	gap?: number;
	/** Whether the popup closes when the focus leaves `keep`; a popup that authors type in keeps it open. */
	followFocus?: boolean | (() => boolean);
	onShow?: () => void;
	onHide?: () => void;
};

/**
 * A popup in the top layer: a `popover="manual"` panel placed next to its trigger. It closes on
 * Escape, on a press outside of `keep` (the trigger and the panel), and once the editor moves the
 * selection or the focus elsewhere.
 */
export class TopLayerPopup implements ReactiveController {
	open = false;

	#host: ReactiveControllerHost;
	#parts: () => Parts;
	#options: Options;
	#stop: (() => void)[] = [];
	#shown?: { trigger: HTMLElement; panel: HTMLElement; anchor: HTMLElement };

	constructor(host: ReactiveControllerHost, parts: () => Parts, options: Options = {}) {
		this.#host = host;
		this.#parts = parts;
		this.#options = options;
		host.addController(this);
	}

	hostDisconnected() {
		this.hide();
	}

	hostUpdated() {
		if (!this.#shown) return;
		const { trigger, panel, anchor = trigger } = this.#parts();
		if (panel !== this.#shown.panel || trigger !== this.#shown.trigger || anchor !== this.#shown.anchor) this.hide();
	}

	toggle() {
		if (this.open) this.hide();
		else this.show();
	}

	show() {
		const { trigger, panel, keep, anchor = trigger, scrollArea } = this.#parts();
		if (this.open || !trigger || !panel || !keep || !anchor || !panel.isConnected) return;
		this.open = true;
		this.#shown = { trigger, panel, anchor };
		panel.showPopover();
		const align = typeof this.#options.align === "function" ? this.#options.align() : this.#options.align ?? "start";
		const position = () => place(panel, anchor, align, this.#options.gap, scrollArea);
		position();
		if (scrollArea) {
			const observer = new ResizeObserver(position);
			observer.observe(panel);
			observer.observe(anchor);
			this.#stop.push(() => observer.disconnect());
		}

		const document = panel.ownerDocument;
		const view = document.defaultView!;
		let pressingPanel = false;
		let pressEnd = 0;
		const onOutsidePress = (event: PointerEvent) => {
			const path = event.composedPath();
			if (!path.includes(keep)) this.hide();
			else {
				view.clearTimeout(pressEnd);
				pressingPanel = path.includes(panel);
			}
		};
		const onPressEnd = () => {
			// Clicking blank panel space can clear the active field or the editor's selection.
			view.clearTimeout(pressEnd);
			pressEnd = view.setTimeout(() => { pressingPanel = false; });
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			this.hide();
			trigger.focus();
		};
		view.addEventListener("scroll", position, { capture: true, passive: true });
		view.addEventListener("resize", position);
		document.addEventListener("pointerdown", onOutsidePress, true);
		document.addEventListener("pointerup", onPressEnd, true);
		document.addEventListener("pointercancel", onPressEnd, true);
		keep.addEventListener("keydown", onKeyDown);
		this.#stop.push(() => {
			view.removeEventListener("scroll", position, { capture: true });
			view.removeEventListener("resize", position);
			document.removeEventListener("pointerdown", onOutsidePress, true);
			document.removeEventListener("pointerup", onPressEnd, true);
			document.removeEventListener("pointercancel", onPressEnd, true);
			view.clearTimeout(pressEnd);
			keep.removeEventListener("keydown", onKeyDown);
		});

		// The selection counts from after the click that opened the popup, which the editor may still handle.
		let following = true;
		let stopFollowing: (() => void) | undefined;
		const { followFocus = true } = this.#options;
		requestAnimationFrame(() => setTimeout(() => {
			if (!following) return;
			stopFollowing = closeWhenEditorMovesOn(keep, () => {
				if (!pressingPanel) this.hide();
			}, { focus: typeof followFocus === "function" ? followFocus() : followFocus });
		}));
		this.#stop.push(() => {
			following = false;
			stopFollowing?.();
		});

		this.#host.requestUpdate();
		this.#options.onShow?.();
	}

	hide() {
		if (!this.open) return;
		this.open = false;
		this.#stop.forEach(stop => stop());
		this.#stop = [];
		const panel = this.#shown?.panel;
		this.#shown = undefined;
		if (panel?.matches(":popover-open")) panel.hidePopover();
		this.#host.requestUpdate();
		this.#options.onHide?.();
	}
}
