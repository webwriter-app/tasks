import { assert } from "chai";

type Point = { x: number; y: number };
// The widgets are loosely typed here: the tests read their shadow DOM and properties by name.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

const mounted: HTMLElement[] = [];

export const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const frame = (count = 1) => new Promise<void>(resolve => {
	const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step));
	requestAnimationFrame(step);
});

export async function until<T>(fn: () => T, message: string, timeout = 5000): Promise<NonNullable<T>> {
	const end = performance.now() + timeout;
	for (;;) {
		const value = fn();
		if (value) return value as NonNullable<T>;
		if (performance.now() > end) throw new Error("timeout: " + message);
		await wait(20);
	}
}

export const centre = (el: Element): Point => {
	const rect = el.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

export const below = (el: Element): Point => {
	const rect = el.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.bottom - 2 };
};

export const above = (el: Element): Point => {
	const rect = el.getBoundingClientRect();
	return { x: rect.left + rect.width / 2, y: rect.top + 2 };
};

const fire = (target: Element, type: string, at: Point, init: PointerEventInit = {}) =>
	target.dispatchEvent(new PointerEvent(type, {
		bubbles: true, composed: true, cancelable: true, pointerId: 7, button: 0, isPrimary: true,
		clientX: at.x, clientY: at.y, ...init,
	}));

const settle = () => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));

export async function drag(from: Element, to: Element | Point, { cancel = false } = {}) {
	const start = centre(from);
	fire(from, "pointerdown", start);
	fire(from, "pointermove", { x: start.x + 6, y: start.y + 6 });
	await frame(2);
	const end = to instanceof Element ? centre(to) : to;
	fire(from, "pointermove", end);
	await frame(2);
	if (cancel) window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
	else fire(from, "pointerup", end);
	await frame(3);
	await settle();
}

export function mount(html: string): HTMLElement {
	const host = document.body.appendChild(document.createElement("div"));
	host.setHTMLUnsafe(html);
	mounted.push(host);
	return host;
}

/** Removes everything `mount` added and leaves edit mode. */
export function unmount() {
	document.designMode = "off";
	while (mounted.length) mounted.pop()!.remove();
}

export async function done(el: Element) {
	await customElements.whenDefined(el.localName);
	await (el as Any).updateComplete;
	await frame(2);
}

/** Edit mode as the editor makes it: contenteditable on the widget, designMode on the document. */
export function editMode(el: Element) {
	el.setAttribute("contenteditable", "");
	document.designMode = "on";
}

/** Runs `run` and returns the transaction events it caused, for example "start,end". */
export async function transactions(run: () => Promise<void>): Promise<string> {
	const seen: string[] = [];
	const log = (event: Event) => seen.push(event.type.replace("ww-transaction", ""));
	document.addEventListener("ww-transactionstart", log);
	document.addEventListener("ww-transactionend", log);
	try {
		await run();
		await frame(3);
	} finally {
		document.removeEventListener("ww-transactionstart", log);
		document.removeEventListener("ww-transactionend", log);
	}
	return seen.join();
}

export { assert };
