/** Returns a unique DOM-safe element ID for a grid item. */
export const newGridId = () => `ww${crypto.randomUUID()}`;

export const choiceColumnTag = "webwriter-choice-column";
export const choiceRowTag = "webwriter-choice-row";
export type ChoiceGridHeaderTag = typeof choiceColumnTag | typeof choiceRowTag;

/** Direct `<webwriter-grid-item>` children that belong to the task body (not a named slot). */
export function gridItems(host: HTMLElement, tags: readonly string[] = ["webwriter-grid-item"]): HTMLElement[] {
	return Array.from(host.children).filter(
		(child): child is HTMLElement => tags.includes(child.localName) && !child.slot,
	);
}

export function choiceGridItems(host: HTMLElement): HTMLElement[] {
	return gridItems(host, ["webwriter-grid-item", choiceColumnTag, choiceRowTag]);
}

/** Creates an identified item containing an editable paragraph. */
export function createGridItem(doc: Document, id = newGridId(), text = "",
	tag: "webwriter-grid-item" | ChoiceGridHeaderTag | "webwriter-image-placement-item" = "webwriter-grid-item"): HTMLElement {
	const item = doc.createElement(tag);
	item.id = id;
	const p = doc.createElement("p");
	if (text) p.textContent = text;
	item.append(p);
	return item;
}

/** Inserts a `<webwriter-grid-item>` before `before` (typically `feedbackElement`). */
export function insertGridItem(host: HTMLElement, before: Element | null, id = newGridId()): string {
	const item = createGridItem(host.ownerDocument, id);
	host.insertBefore(item, before);
	return item.id;
}

/** Removes any direct `<webwriter-grid-item>` child whose ID is in `ids`. */
export function removeGridItems(host: HTMLElement, ids: Iterable<string>) {
	const targets = new Set(ids);
	for (const child of gridItems(host)) {
		if (targets.has(child.id)) child.remove();
	}
}

/** Reads the plain-text content of an identified `<webwriter-grid-item>`. */
export function gridItemText(host: HTMLElement, id: string): string {
	return gridItems(host).find(child => child.id === id)?.textContent?.trim() ?? "";
}

/** Assigns manual `slot[data-child-id]` slots to matching authored children. */
export function assignGridSlots(host: HTMLElement, byId = new Map(gridItems(host).map(child => [child.id, child]))) {
	const root = host.shadowRoot;
	if (!root) return;
	for (const slot of root.querySelectorAll<HTMLSlotElement>("slot[data-child-id]")) {
		const id = slot.dataset.childId;
		const item = id ? byId.get(id) : undefined;
		const assigned = slot.assignedElements();
		if (item) {
			if (assigned.length !== 1 || assigned[0] !== item) slot.assign(item);
		} else if (assigned.length > 0) {
			slot.assign();
		}
	}
}
