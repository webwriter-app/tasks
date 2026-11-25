import { migrateCategorizeGrid, migrateCategorizeItems } from "./components/migrate-categorize-grid";
import { migrateChoiceGridHeaders } from "./components/migrate-choice-grid-headers";
import { migrateImagePlacementContent } from "./components/image-placement-content";

import { migratePairingColumns } from "./components/migrate-pairing-columns";

const taskByLegacyGrid = {
	"webwriter-choice-grid": "webwriter-choice",
	"webwriter-gap-grid": "webwriter-gap",
	"webwriter-sort-grid": "webwriter-categorize",
} as const;

const gridTags = [...Object.keys(taskByLegacyGrid), "webwriter-categorize", "webwriter-choice"];

/** Convert old grid layouts to their current tasks, preserving their authored HTML. */
export function migrateGridLayouts(root: ParentNode) {
	const grids = Array.from(root.querySelectorAll<HTMLElement>(gridTags.join(", ")));
	if (root instanceof HTMLElement && gridTags.includes(root.localName)) grids.unshift(root);
	for (const grid of grids) {
		if (grid.namespaceURI !== "http://www.w3.org/1999/xhtml") continue;
		if (grid.localName === "webwriter-choice") {
			migrateChoiceGridHeaders(grid);
			continue;
		}
		if (grid.localName === "webwriter-categorize") {
			migrateCategorizeGrid(grid);
			migrateCategorizeItems(grid);
			continue;
		}
		if (!grid.parentNode) continue;
		const name = taskByLegacyGrid[grid.localName as keyof typeof taskByLegacyGrid];
		const task = grid.ownerDocument.createElement(name);
		for (const attribute of grid.attributes) {
			if (attribute.namespaceURI) task.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
			else task.setAttribute(attribute.name, attribute.value);
		}
		task.toggleAttribute("grid", grid.getAttribute("grid") !== "false");
		if (name === "webwriter-choice") {
			if (!task.hasAttribute("mode")) task.setAttribute("mode", "single");
			if (!task.hasAttribute("grading-method")) task.setAttribute("grading-method", "partial");
		}
		if (name === "webwriter-gap") {
			task.toggleAttribute("ignore-case", !grid.hasAttribute("match-case"));
			task.removeAttribute("match-case");
		}
		task.append(...grid.childNodes);
		if (name === "webwriter-choice") migrateChoiceGridHeaders(task);
		if (name === "webwriter-categorize") {
			migrateCategorizeGrid(task);
			migrateCategorizeItems(task);
		}
		grid.replaceWith(task);
	}
}

/** Keep all authored content from older items that allowed several direct children. */
function migrateItemContent(item: Element) {
	const children = Array.from(item.childNodes);
	const isContent = (node: Node) => node instanceof Text || node instanceof Element
		&& !node.slot && !node.matches("webwriter-quiz-hint, script, template");
	const content = children.filter(node => isContent(node) && (!(node instanceof Text) || node.data.trim()));
	if (content.length <= 1) return;
	const first = children.indexOf(content[0]);
	const last = children.indexOf(content[content.length - 1]);
	const wrapper = item.ownerDocument.createElement("div");
	item.insertBefore(wrapper, content[0]);
	wrapper.append(...children.slice(first, last + 1).filter(node => isContent(node) || node instanceof Comment));
}

document.addEventListener("migrate", event => {
	if (!(event.target instanceof Element)) return;
	if (event.target.localName === "webwriter-pairing") migratePairingColumns(event.target);
	else if (event.target.localName === "webwriter-image-placements" && event.target instanceof HTMLElement) migrateImagePlacementContent(event.target);
	else if (event.target.matches("webwriter-choice-item, webwriter-order-item")) migrateItemContent(event.target);
	else migrateGridLayouts(event.target);
});
