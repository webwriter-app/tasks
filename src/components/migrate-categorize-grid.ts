import { defaultConverter } from "lit";
import { encryptedProperty } from "./encrypted-property";
import { createGridItem, gridItems } from "./grid-helpers";

/** Preserve each former destination as a category without changing the card nodes. */
export function migrateCategorizeGrid(task: HTMLElement) {
	if (!task.hasAttribute("grid")) return;

	if (task.getAttribute("grid") !== "false") {
		const rows = defaultConverter.fromAttribute?.(task.getAttribute("rows"), Array) ?? [];
		const columns = defaultConverter.fromAttribute?.(task.getAttribute("columns"), Array) ?? [];
		const solution = encryptedProperty.fromAttribute?.(task.getAttribute("solution"), Object) ?? {};
		if (!Array.isArray(rows) || !Array.isArray(columns) || typeof solution !== "object") return;

		const headings = new Map(gridItems(task).map(item => [item.id, item.textContent?.trim()]));
		const cardsByCell = solution as Record<string, string[]>;
		const categories: string[] = [];
		const groupedSolution: [string, string[]][] = [];
		const newHeadings = task.ownerDocument.createDocumentFragment();
		for (const row of rows.length ? rows : [""]) {
			for (const column of columns) {
				let categoryId = column;
				if (rows.length > 1) {
					const label = [headings.get(row) || row, headings.get(column) || column].join(" / ");
					const heading = createGridItem(task.ownerDocument, undefined, label);
					categoryId = heading.id;
					newHeadings.append(heading);
				}
				categories.push(categoryId);
				groupedSolution.push([categoryId, cardsByCell[`${row}:${column}`] ?? []]);
			}
		}

		task.insertBefore(newHeadings, task.querySelector(":scope > [slot=feedback]"));
		task.setAttribute("categories", JSON.stringify(categories));
		const encoded = encryptedProperty.toAttribute?.(Object.fromEntries(groupedSolution), Object);
		if (typeof encoded === "string") task.setAttribute("solution", encoded);
	}

	for (const attribute of ["grid", "rows", "columns", "order-matters", "show-row-headers", "show-column-headers"]) {
		task.removeAttribute(attribute);
	}
}

/** Give the old answer cards their own editing rules, keeping their IDs and authored content. */
export function migrateCategorizeItems(task: HTMLElement) {
	const categories = defaultConverter.fromAttribute?.(task.getAttribute("categories"), Array);
	const inventory = defaultConverter.fromAttribute?.(task.getAttribute("card-ids"), Array);
	const solution = encryptedProperty.fromAttribute?.(task.getAttribute("solution"), Object);
	const ids = Array.isArray(inventory) ? inventory : solution && typeof solution === "object" ? Object.values(solution).flat() : [];
	const headings = new Set(Array.isArray(categories) ? categories : []);
	const cards = new Map(gridItems(task).filter(item => !headings.has(item.id)).map(item => [item.id, item]));
	const feedback = task.querySelector(":scope > webwriter-quiz-feedback");
	for (const id of new Set(ids)) {
		const previous = cards.get(id);
		if (!previous) continue;
		const item = task.ownerDocument.createElement("webwriter-categorize-item");
		for (const attribute of previous.attributes) item.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
		item.append(...previous.childNodes);
		previous.remove();
		task.insertBefore(item, feedback);
	}
	task.removeAttribute("card-ids");
}
