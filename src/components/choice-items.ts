export function createChoiceItem(document: Document, text = "") {
	const item = document.createElement("webwriter-choice-item");
	const paragraph = document.createElement("p");
	paragraph.textContent = text;
	item.append(paragraph);
	return item;
}

export function withMinimumChoiceItems(document: Document, items: HTMLElement[] = []) {
	const missing = Math.max(0, 2 - items.length);
	return [...items, ...Array.from({ length: missing }, () => createChoiceItem(document))];
}
