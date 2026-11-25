import { createGridItem, gridItems } from "./grid-helpers";

const itemTag = "webwriter-image-placement-item";

export function imagePlacementItems(task: HTMLElement) {
	return gridItems(task, [itemTag, "webwriter-grid-item"]);
}

export function createImagePlacementItem(doc: Document) {
	return createGridItem(doc, undefined, "", itemTag);
}

/** Adapt older placements to the current background and option schema. */
export function migrateImagePlacementContent(task: HTMLElement) {
	const image = task.querySelector(":scope > img");
	if (image && !task.querySelector(":scope > picture")) {
		const picture = task.ownerDocument.createElement("picture");
		image.before(picture);
		picture.append(image);
	}

	// Keep saved IDs and content while giving each legacy option its own editing rules.
	const pieces = imagePlacementItems(task);
	for (const previous of pieces) {
		if (previous.localName === itemTag) continue;
		const item = task.ownerDocument.createElement(itemTag);
		for (const attribute of previous.attributes) {
			if (attribute.namespaceURI) item.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
			else item.setAttribute(attribute.name, attribute.value);
		}
		item.append(...previous.childNodes);
		previous.replaceWith(item);
	}
	if (!pieces.length) {
		task.insertBefore(createImagePlacementItem(task.ownerDocument), task.querySelector(":scope > webwriter-quiz-feedback"));
	}
}
