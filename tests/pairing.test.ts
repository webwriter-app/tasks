/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import { assert, centre, drag, done, editMode, mount, unmount, until } from "./helpers";

mocha.setup(getMochaConfig());

const pairingHtml = `<div><webwriter-pairing solution='[["a1","b1"],["a2","b2"],["a3","b3"]]'>
	<p slot="prompt">Match</p>
	<webwriter-pairing-item id="a1"><p>A1</p></webwriter-pairing-item><webwriter-pairing-item id="b1"><p>B1</p></webwriter-pairing-item>
	<webwriter-pairing-item id="a2"><p>A2</p></webwriter-pairing-item><webwriter-pairing-item id="b2"><p>B2</p></webwriter-pairing-item>
	<webwriter-pairing-item id="a3"><p>A3</p></webwriter-pairing-item><webwriter-pairing-item id="b3"><p>B3</p></webwriter-pairing-item>
</webwriter-pairing></div>`;

type Pairing = HTMLElementTagNameMap["webwriter-pairing"];
const dot = (p: Pairing, id: string) =>
	p.querySelector<HTMLElementTagNameMap["webwriter-pairing-item"]>(`[id="${id}"]`)!.connector!;
const column = (p: Pairing, side: string) =>
	p.querySelectorAll("webwriter-pairing-column")[side === "left" ? 0 : 1];
const line = (p: Pairing, a: string, b: string) =>
	p.shadowRoot!.querySelector<SVGLineElement>(`line[data-left="${a}"][data-right="${b}"]:not(.expected)`);
const pairItems = (p: Pairing, side: string) =>
	Array.from(column(p, side).children, item => item.id).sort();
const clickPair = (p: Pairing, a: string, b: string) => {
	dot(p, a).click();
	dot(p, b).click();
};
const hover = (target: Element) => target.dispatchEvent(new PointerEvent("pointerover", {
	bubbles: true, composed: true, pointerType: "mouse",
}));
const leaveBoard = (p: Pairing) => p.shadowRoot!.querySelector(".pair-board")!
	.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
const opacity = (p: Pairing, a: string, b: string) => Number(getComputedStyle(line(p, a, b)!).opacity);

async function pairing(edit = false) {
	const p = mount(pairingHtml).querySelector("webwriter-pairing")!;
	if (edit) editMode(p);
	await done(p);
	return p;
}

describe("<webwriter-pairing>", function () {
	afterEach(unmount);

	it("spaces the slotted items in each column without theme spacing", async function () {
		const p = await pairing();
		p.style.setProperty("--sl-spacing-small", "initial");
		for (const side of ["left", "right"]) {
			const group = column(p, side);
			group.style.display = "block";
			const [first, second] = group.items;
			assert.isAbove(second.getBoundingClientRect().top, first.getBoundingClientRect().bottom);
		}
	});

	it("dims only unrelated connections while hovering either endpoint", async function () {
		const p = await pairing(true);
		p.multipleConnections = true;
		p.solution = [...p.solution, ["a1", "b2"]];
		await done(p);

		hover(p.querySelector("#a1 p")!);
		await done(p);
		assert.equal(opacity(p, "a1", "b1"), 1);
		assert.equal(opacity(p, "a1", "b2"), 1);
		assert.isBelow(opacity(p, "a2", "b2"), 1);

		hover(dot(p, "b2"));
		await done(p);
		assert.equal(opacity(p, "a1", "b2"), 1);
		assert.equal(opacity(p, "a2", "b2"), 1);
		assert.isBelow(opacity(p, "a1", "b1"), 1);

		leaveBoard(p);
		await done(p);
		assert.equal(opacity(p, "a1", "b1"), 1);
		assert.equal(opacity(p, "a3", "b3"), 1);
	});

	it("highlights connections for the caret, text range, or selected item", async function () {
		const p = await pairing(true);
		const selection = p.ownerDocument.getSelection()!;
		selection.collapse(p.querySelector("#a1 p")!.firstChild, 1);
		await until(() => opacity(p, "a2", "b2") < 1, "caret inside an item dims unrelated links");
		assert.equal(opacity(p, "a1", "b1"), 1);

		const text = p.querySelector("#b2 p")!.firstChild!;
		selection.setBaseAndExtent(text, 2, text, 0);
		await until(() => opacity(p, "a1", "b1") < 1, "the backwards text range highlights its item");
		assert.equal(opacity(p, "a2", "b2"), 1);

		const range = p.ownerDocument.createRange();
		range.selectNode(p.querySelector("#a3")!);
		selection.removeAllRanges();
		selection.addRange(range);
		await until(() => opacity(p, "a2", "b2") < 1 && opacity(p, "a3", "b3") === 1, "a fully selected item also highlights its links");

		selection.collapse(p.querySelector('[slot="prompt"]'), 0);
		await until(() => opacity(p, "a1", "b1") === 1 && opacity(p, "a2", "b2") === 1, "leaving the item restores the links");
	});

	it("keeps the origin highlighted until the connection is cancelled", async function () {
		const p = await pairing(true);
		const selection = p.ownerDocument.getSelection()!;
		selection.collapse(p.querySelector("#a3 p")!.firstChild, 1);
		await until(() => opacity(p, "a1", "b1") < 1, "selection highlights the third connection");
		dot(p, "a1").click();
		hover(dot(p, "b2"));
		await done(p);
		assert.equal(opacity(p, "a1", "b1"), 1);
		assert.isBelow(opacity(p, "a2", "b2"), 1);

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		await done(p);
		assert.isBelow(opacity(p, "a1", "b1"), 1);
		assert.equal(opacity(p, "a2", "b2"), 1);
		leaveBoard(p);
		await done(p);
		assert.isBelow(opacity(p, "a2", "b2"), 1);
		assert.equal(opacity(p, "a3", "b3"), 1);
	});

	it("keeps both columns visible and draws a line after clicking two dots", async function () {
		const p = await pairing();
		assert.deepEqual(pairItems(p, "left"), ["a1", "a2", "a3"]);
		assert.deepEqual(pairItems(p, "right"), ["b1", "b2", "b3"]);
		assert.notExists(p.shadowRoot!.querySelector(".pair-pool, .add-left-item, .add-right-item"));
		clickPair(p, "b1", "a1");
		await until(() => Boolean(line(p, "a1", "b1")), "clicking the dots draws a connection");
		assert.isAbove(parseFloat(line(p, "a1", "b1")!.getAttribute("x2")!), parseFloat(line(p, "a1", "b1")!.getAttribute("x1")!));
		assert.deepEqual(pairItems(p, "right"), ["b1", "b2", "b3"]);
		assert.deepEqual(p.solution, [["a1", "b1"], ["a2", "b2"], ["a3", "b3"]]);
		await done(p);
		clickPair(p, "a1", "b1");
		await until(() => !line(p, "a1", "b1"), "selecting the existing connection again removes it");
	});

	it("connects by dragging and swaps when both dots already have a connection", async function () {
		const p = await pairing();
		await drag(dot(p, "b1"), dot(p, "a1"));
		await done(p);
		await drag(dot(p, "a2"), dot(p, "b2"));
		await done(p);
		assert.exists(line(p, "a1", "b1"));
		assert.exists(line(p, "a2", "b2"));
		await drag(dot(p, "b1"), dot(p, "a2"));
		await done(p);
		assert.exists(line(p, "a2", "b1"));
		assert.exists(line(p, "a1", "b2"));
	});

	it("cancels a pointer connection with Escape", async function () {
		const p = await pairing();
		await drag(dot(p, "b1"), dot(p, "a1"), { cancel: true });
		await done(p);
		assert.notExists(line(p, "a1", "b1"));
		assert.notExists(p.shadowRoot!.querySelector("[data-ww-dragging]"));
	});

	it("connects dots with the keyboard", async function () {
		const p = await pairing();
		const source = dot(p, "a1");
		source.focus();
		// Native Enter/Space activation dispatches click. Arrow navigation focuses the opposite connector.
		source.click();
		source.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true, cancelable: true }));
		const candidate = column(p, "right").items[0];
		assert.equal(candidate.shadowRoot!.activeElement, candidate.connector);
		candidate.connector!.click();
		await until(() => !!p.shadowRoot!.querySelector('line[data-left="a1"]'), "keyboard draws a connection");
	});

	it("grades connections, shows the answer key, and releases the dots on reset", async function () {
		const p = await pairing();
		await drag(dot(p, "b1"), dot(p, "a1"));
		await done(p);
		await drag(dot(p, "b3"), dot(p, "a2"));
		await done(p);
		assert.closeTo(p.checkAnswer(true), 1 / 3, 1e-9);
		await done(p);
		assert.isTrue(line(p, "a1", "b1")!.classList.contains("correct"));
		assert.isTrue(line(p, "a2", "b3")!.classList.contains("wrong"));
		assert.exists(p.shadowRoot!.querySelector('line.expected[data-left="a2"][data-right="b2"]'));
		assert.isTrue(dot(p, "a3").disabled);
		p.reset();
		await done(p);
		assert.isFalse(dot(p, "a3").disabled);
		assert.notExists(p.shadowRoot!.querySelector(".pair-lines line[data-left]"));
	});

	it("authors use the same dots, and new items start without a connection", async function () {
		const p = await pairing(true);
		assert.exists(line(p, "a1", "b1"));
		await drag(dot(p, "b1"), dot(p, "a2"));
		await done(p);
		assert.deepEqual(p.solution, [["a1", "b2"], ["a2", "b1"], ["a3", "b3"]]);
		assert.notInclude(p.getAttribute("solution"), "a1");
		p.shadowRoot!.querySelector<HTMLButtonElement>(".add-left-item")!.click();
		await done(p);
		assert.lengthOf(pairItems(p, "left"), 4);
		assert.lengthOf(pairItems(p, "right"), 3);
		const item = column(p, "left").firstElementChild!;
		assert.exists(item.shadowRoot!.querySelector(".pair-tile"));
		assert.isAbove(parseFloat(getComputedStyle(item).borderTopWidth), 0, "the authored item owns the visible block");
		assert.notExists(item.shadowRoot!.querySelector(".remove-item, [data-ww-capture-selection=false]"));
		assert.lengthOf(p.solution, 3);

		clickPair(p, "a1", "b2");
		await until(() => !p.solution.some(([id]) => id === "a1"), "authors can disconnect a pair");
		assert.include(pairItems(p, "left"), "a1");
		const reopened = mount(p.outerHTML).querySelector("webwriter-pairing")!;
		await done(reopened);
		assert.deepEqual(pairItems(reopened, "left"), pairItems(p, "left"));
		assert.deepEqual(pairItems(reopened, "right"), pairItems(p, "right"));
	});

	it("follows the cursor after a click and hides the preview when connecting or cancelling", async function () {
		const p = await pairing();
		const preview = p.shadowRoot!.querySelector<SVGLineElement>(".connection-preview")!;
		dot(p, "a1").click();
		const end = centre(dot(p, "b2"));
		window.dispatchEvent(new PointerEvent("pointermove", { clientX: end.x, clientY: end.y }));
		assert.equal(getComputedStyle(preview).visibility, "visible");
		assert.notEqual(preview.getAttribute("x1"), preview.getAttribute("x2"));
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		assert.equal(getComputedStyle(preview).visibility, "hidden");
		assert.notExists(line(p, "a1", "b2"));
		clickPair(p, "a1", "b2");
		await until(() => line(p, "a1", "b2"), "the second click commits");
		assert.equal(getComputedStyle(preview).visibility, "hidden");
	});

	it("saves multiple connections on either side and penalizes extra reader guesses", async function () {
		const p = await pairing(true);
		const control = p.shadowRoot!.querySelector<HTMLElement & { checked: boolean }>(".multiple-connections")!;
		assert.isFalse(control.checked);
		control.checked = true;
		control.dispatchEvent(new CustomEvent("sl-change"));
		await done(p);
		assert.isTrue(p.hasAttribute("multiple-connections"));
		clickPair(p, "a1", "b2");
		await done(p);
		assert.includeDeepMembers(p.solution, [["a1", "b1"], ["a1", "b2"], ["a2", "b2"]]);
		document.designMode = "off";
		const reader = mount(p.outerHTML).querySelector("webwriter-pairing")!;
		reader.removeAttribute("contenteditable");
		await done(reader);
		assert.isFalse(reader.editable);
		assert.isTrue(reader.multipleConnections);
		assert.deepEqual(reader.solution, p.solution);
		for (const [a, b] of p.solution) {
			clickPair(reader, a, b);
			await done(reader);
		}
		clickPair(reader, "a1", "b3");
		await done(reader);
		assert.closeTo(reader.checkAnswer(true), 0.75, 1e-9);
		await done(reader);
		assert.isTrue(line(reader, "a1", "b3")!.classList.contains("wrong"));
		editMode(p);
		control.checked = false;
		control.dispatchEvent(new CustomEvent("sl-change"));
		await done(p);
		assert.isFalse(p.hasAttribute("multiple-connections"));
		assert.deepEqual(p.solution, [["a1", "b1"], ["a2", "b2"], ["a3", "b3"]]);
	});

	it("migrates an uneven legacy answer with an explicit left column", async function () {
		const p = mount(`<webwriter-pairing left-items='["a"]' solution='[["a","b"]]'>
			<p slot="prompt">Match</p>
			<webwriter-pairing-item id="b"><p>B</p></webwriter-pairing-item>
			<webwriter-pairing-item id="c"><p>C</p></webwriter-pairing-item>
			<webwriter-pairing-item id="a"><p>A</p></webwriter-pairing-item>
		</webwriter-pairing>`).querySelector("webwriter-pairing")!;
		await done(p);
		assert.deepEqual(pairItems(p, "left"), ["a"]);
		assert.deepEqual(pairItems(p, "right"), ["b", "c"]);
		assert.isFalse(p.hasAttribute("left-items"));
		assert.deepEqual(p.solution, [["a", "b"]]);
	});
});

mocha.run();
