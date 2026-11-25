import { choiceColumnTag, choiceGridItems, choiceRowTag, createGridItem, newGridId } from "./grid-helpers";
import { withMinimumChoiceItems } from "./choice-items";

type LayoutTask = HTMLElementTagNameMap["webwriter-choice"];
type Conversion = {
	consumed: readonly Node[];
	apply(target: LayoutTask): void;
};

export function gridLayoutTarget(task: HTMLElement) {
	if (task.localName === "webwriter-choice") return "webwriter-choice";
}

export function isGridLayout(task: HTMLElement) {
	return gridLayoutTarget(task) !== undefined && (task as LayoutTask).grid;
}

function copyAttributes(from: Element, to: Element, exclude: readonly string[]) {
	for (const attribute of from.attributes) {
		if (exclude.includes(attribute.name)) continue;
		if (attribute.namespaceURI) to.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
		else to.setAttribute(attribute.name, attribute.value);
	}
}

function directBody(task: HTMLElement) {
	return Array.from(task.children).filter(child => !["prompt", "hint", "feedback"].includes(child.slot));
}

function itemsById(task: LayoutTask) {
	return new Map(choiceGridItems(task).map(item => [task.gridHeaderId(item), item]));
}

function wrapItem(item: HTMLElement, tag: "webwriter-choice-item" | typeof choiceColumnTag) {
	const wrapper = item.ownerDocument.createElement(tag);
	copyAttributes(item, wrapper, []);
	if (!wrapper.id) wrapper.id = newGridId();
	wrapper.append(...item.childNodes);
	return wrapper;
}

function choiceToGrid(source: HTMLElementTagNameMap["webwriter-choice"]): Conversion | undefined {
	if (source.mode === "true-false" || source.gradingMethod === "accuracy" || source.hasAttribute("randomize-order")) return;
	const options = directBody(source).filter((item): item is HTMLElement => item.localName === "webwriter-choice-item");
	if (options.length < 2 || options.some(item => item.children.length !== 1)) return;
	return {
		consumed: options,
		apply(target: HTMLElementTagNameMap["webwriter-choice"]) {
			const row = createGridItem(source.ownerDocument, undefined, "", choiceRowTag);
			const columns = options.map(item => wrapItem(item, choiceColumnTag));
			target.mode = source.mode === "single" ? "single" : "multiple";
			target.gradingMethod = source.gradingMethod === "partial" ? "partial-cell"
				: source.gradingMethod === "ungraded" || source.gradingMethod === "self-assess" ? source.gradingMethod : "pass-fail";
			target.ungraded = source.gradingMethod === "ungraded";
			target.solution = { [row.id]: columns.filter((_, i) => source.solution[options[i].id]).map(column => column.id) };
			target.append(...columns, row);
		},
	};
}

function gridToChoice(source: HTMLElementTagNameMap["webwriter-choice"]): Conversion {
	const [row] = source.rows;
	const items = itemsById(source);
	const columns = [...new Set(source.columns)].flatMap(id => items.get(id) ?? []);
	return {
		consumed: choiceGridItems(source),
		apply(target: HTMLElementTagNameMap["webwriter-choice"]) {
			target.mode = source.mode;
			target.gradingMethod = source.gradingMethod === "self-assess" ? "self-assess"
				: source.ungraded || source.gradingMethod === "ungraded" ? "ungraded" : source.gradingMethod === "partial-cell" ? "partial" : "pass-fail";
			const key = source.solution[row];
			const correct = new Set(Array.isArray(key) ? key : []);
			target.solution = Object.fromEntries(columns.filter(item => correct.has(item.id)).map(item => [item.id, true]));
			const options = columns.map(item => wrapItem(item, "webwriter-choice-item"));
			target.append(...withMinimumChoiceItems(target.ownerDocument, options));
			target.columns = [];
			target.rows = [];
			target.ungraded = false;
		},
	};
}

export function gridLayoutChange(task: HTMLElement) {
	if (!gridLayoutTarget(task)) return;
	const host = task as LayoutTask;
	const grid = host.grid;
	const change = grid ? gridToChoice(host) : choiceToGrid(host);
	if (!change || (!grid && directBody(host).some(child => !change.consumed.includes(child)))) return;

	return () => {
		const feedback = host.querySelector(":scope > [slot=feedback]");
		const changed = new Set(change.consumed);
		// The conversion owns only its answer content. Keep the host and named slots in place.
		for (const node of changed) node.parentNode?.removeChild(node);
		change.apply(host);
		if (feedback) {
			const body = directBody(host);
			for (const node of body) {
				if (feedback.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) host.insertBefore(node, feedback);
			}
		}
		host.grid = !grid;
		return host;
	};
}
