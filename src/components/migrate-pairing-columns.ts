import { encryptedProperty } from "./encrypted-property";

export function createPairingItem(doc: Document) {
	const item = doc.createElement("webwriter-pairing-item");
	item.append(doc.createElement("p"));
	return item;
}

/** Move the old flat item list into the two schema-managed columns. */
export function migratePairingColumns(task: Element) {
	const columns = task.querySelectorAll(":scope > webwriter-pairing-column");
	if (columns.length) return;
	const items = Array.from(task.querySelectorAll<HTMLElement>(":scope > webwriter-pairing-item")).filter(item => !item.slot);
	const explicit = task.getAttribute("left-items");
	const saved = encryptedProperty.fromAttribute?.(task.getAttribute("solution"), Array);
	const pairs = Array.isArray(saved) ? saved.filter(pair => Array.isArray(pair) && pair.length === 2) : [];
	let leftIds = new Set(pairs.map(([id]) => id));
	if (explicit !== null) {
		try {
			const ids: unknown = JSON.parse(explicit);
			if (Array.isArray(ids)) leftIds = new Set(ids);
		} catch { /* Keep the column inferred from the answer key. */ }
	}
	const left = task.ownerDocument.createElement("webwriter-pairing-column");
	const right = task.ownerDocument.createElement("webwriter-pairing-column");
	const before = items[0] ?? task.querySelector(":scope > webwriter-quiz-feedback");
	task.insertBefore(left, before);
	task.insertBefore(right, before);
	items.forEach((item, index) => {
		const onLeft = explicit !== null || pairs.length ? leftIds.has(item.id) : index % 2 === 0;
		(onLeft ? left : right).append(item);
	});
	for (const column of [left, right]) {
		if (!column.firstElementChild) column.append(createPairingItem(task.ownerDocument));
	}
	task.removeAttribute("left-items");
}
