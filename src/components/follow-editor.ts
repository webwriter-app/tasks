/**
 * Closes a popup once the editor moves on: when the document selection changes to a place outside
 * of `keep`, or, with `focus`, when the focus leaves `keep`. `keep` is the popup with its trigger;
 * authored content slotted into it counts as inside, so authors can type in a popup. The selection
 * as it is now counts as unchanged, also when the event for it arrives late. Returns the function
 * that stops listening.
 */
export function closeWhenEditorMovesOn(keep: HTMLElement, close: () => void, { focus = true } = {}) {
	const document = keep.ownerDocument;
	const selection = document.getSelection();
	const position = () => (selection ? [selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset] : []);
	const start = position();

	const onSelectionChange = () => {
		const now = position();
		if (now.every((value, index) => value === start[index])) return;
		if (selection?.anchorNode && isInside(keep, selection.anchorNode)) return;
		close();
	};
	const onFocusOut = (event: FocusEvent) => {
		const next = event.relatedTarget;
		if (!(next instanceof Node) || !isInside(keep, next)) close();
	};

	document.addEventListener("selectionchange", onSelectionChange);
	if (focus) keep.addEventListener("focusout", onFocusOut);
	return () => {
		document.removeEventListener("selectionchange", onSelectionChange);
		keep.removeEventListener("focusout", onFocusOut);
	};
}

/** Whether `node` is rendered inside `ancestor`, following slots and shadow roots. */
function isInside(ancestor: Node, node: Node) {
	for (let current: Node | null = node; current; ) {
		if (current === ancestor) return true;
		const slot: HTMLSlotElement | null = current instanceof Element || current instanceof Text ? current.assignedSlot : null;
		current = slot ?? current.parentNode ?? (current instanceof ShadowRoot ? current.host : null);
	}
	return false;
}
