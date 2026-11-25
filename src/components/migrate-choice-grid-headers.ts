import { choiceColumnTag, choiceGridItems, choiceRowTag, createGridItem, type ChoiceGridHeaderTag } from "./grid-helpers";

function headerIds(task: Element, axis: "columns" | "rows"): string[] {
	try {
		const value: unknown = JSON.parse(task.getAttribute(axis) ?? "[]");
		return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === "string" && Boolean(id)))] : [];
	} catch {
		return [];
	}
}

/** Give earlier grid headers a type per axis, preserving their IDs and displayed order. */
export function migrateChoiceGridHeaders(task: HTMLElement) {
	if (!task.matches("webwriter-choice[grid]") || task.getAttribute("grid") === "false") return;
	const items = choiceGridItems(task);
	if (items.some(item => item.localName !== "webwriter-grid-item")) return;
	const columns = headerIds(task, "columns");
	const rows = headerIds(task, "rows").filter(id => !columns.includes(id));
	const byId = new Map(items.map(item => [item.id, item]));
	const loose = items.filter(item => !columns.includes(item.id) && !rows.includes(item.id));
	const headers = task.ownerDocument.createDocumentFragment();
	const replaced: HTMLElement[] = [];
	const appendAxis = (tag: ChoiceGridHeaderTag, ids: string[]) => {
		const entries = ids.length ? ids.map(id => ({ id, item: byId.get(id) }))
			: loose.splice(0).map(item => ({ id: item.id, item }));
		for (const { id, item } of entries.length ? entries : [{ id: "", item: undefined }]) {
			if (!item) {
				headers.append(createGridItem(task.ownerDocument, id || undefined, "", tag));
				continue;
			}
			const header = task.ownerDocument.createElement(tag);
			for (const attribute of item.attributes) header.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
			header.append(...item.childNodes);
			headers.append(header);
			replaced.push(item);
		}
	};
	appendAxis(choiceColumnTag, columns);
	appendAxis(choiceRowTag, rows);
	task.insertBefore(headers, items[0] ?? task.querySelector(":scope > [slot=feedback]"));
	for (const item of replaced) item.remove();
}
