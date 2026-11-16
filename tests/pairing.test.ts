/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-quiz";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import { assert, drag, done, editMode, mount, unmount, type Any } from "./helpers";

mocha.setup(getMochaConfig());

const pairingHtml = `<webwriter-quiz hide-question-title hide-points><webwriter-pairing>
	<p slot="prompt">Match</p>
	<webwriter-pairing-item id="a1"><p>A1</p></webwriter-pairing-item><webwriter-pairing-item id="b1"><p>B1</p></webwriter-pairing-item>
	<webwriter-pairing-item id="a2"><p>A2</p></webwriter-pairing-item><webwriter-pairing-item id="b2"><p>B2</p></webwriter-pairing-item>
	<webwriter-pairing-item id="a3"><p>A3</p></webwriter-pairing-item><webwriter-pairing-item id="b3"><p>B3</p></webwriter-pairing-item>
</webwriter-pairing></webwriter-quiz>`;

async function pairing(edit = false): Promise<Any> {
	const root = mount(pairingHtml);
	const p = root.querySelector("webwriter-pairing") as Any;
	await done(p);
	p.solution = [["a1", "b1"], ["a2", "b2"], ["a3", "b3"]];
	if (edit) editMode(p);
	await done(p);
	return p;
}
const card = (p: Any, id: string) => p.shadowRoot.querySelector(`.pairing-card[data-card-id="${id}"]`);
const cellOfRight = (p: Any, id: string) => p.shadowRoot.querySelector(`.pairing-right [data-drop-target-id="${id}"]`);
const assigned = (p: Any, rightId: string) => cellOfRight(p, rightId).querySelector(".pairing-card-assigned")?.dataset.cardId;

describe("<webwriter-pairing>", function () {
	afterEach(unmount);

	describe("read mode", function () {
		it("a left card dropped on a right cell is assigned", async function () {
			const p = await pairing();
			await drag(card(p, "a1"), cellOfRight(p, "b2"));
			await done(p);
			assert.ok(assigned(p, "b2") === "a1", "a1 is in the cell of b2, got " + assigned(p, "b2"));
			assert.ok(!p.shadowRoot.querySelector('.pairing-left [data-card-id="a1"]'), "a1 left the left grid");
			assert.ok(p.getAttribute("style") === null && !card(p, "a2").hasAttribute("style"), "no leftover inline style");
		});

		it("an assigned card dropped on an occupied cell swaps, the displaced one takes its place", async function () {
			const p = await pairing();
			await drag(card(p, "a1"), cellOfRight(p, "b1")); await done(p);
			await drag(card(p, "a2"), cellOfRight(p, "b2")); await done(p);
			assert.ok(assigned(p, "b1") === "a1" && assigned(p, "b2") === "a2", "both assigned");
			await drag(card(p, "a1"), cellOfRight(p, "b2")); await done(p);
			assert.ok(assigned(p, "b2") === "a1" && assigned(p, "b1") === "a2", `swapped: b1=${assigned(p, "b1")} b2=${assigned(p, "b2")}`);
		});

		it("an assigned card dropped on the left grid returns", async function () {
			const p = await pairing();
			await drag(card(p, "a1"), cellOfRight(p, "b1")); await done(p);
			const assignedCard = cellOfRight(p, "b1").querySelector(".pairing-card-assigned");
			await drag(assignedCard, p.shadowRoot.querySelector(".pairing-left")); await done(p);
			assert.ok(!assigned(p, "b1"), "cell is empty again");
			assert.ok(p.shadowRoot.querySelector('.pairing-left [data-card-id="a1"]'), "a1 is back in the left grid");
		});

		it("Escape cancels a drag and nothing is assigned", async function () {
			const p = await pairing();
			await drag(card(p, "a1"), cellOfRight(p, "b1"), { cancel: true }); await done(p);
			assert.ok(!assigned(p, "b1"), "nothing assigned");
			assert.ok(!p.shadowRoot.querySelector("[data-ww-dragging]"), "nothing is left lifted");
		});

		it("checking the answer locks the cards", async function () {
			const p = await pairing();
			await drag(card(p, "a1"), cellOfRight(p, "b1")); await done(p);
			p.checkAnswer(true); await done(p);
			assert.ok(!p.shadowRoot.querySelector(".pairing-card[data-ww-drag]"), "no card is draggable after checking");
			await drag(card(p, "a2"), cellOfRight(p, "b2")); await done(p);
			assert.ok(!assigned(p, "b2"), "a graded pairing does not accept a drop");
			p.reset(); await done(p);
			assert.ok(p.shadowRoot.querySelector(".pairing-card[data-ww-drag]"), "cards are draggable after reset");
		});
	});

	describe("edit mode", function () {
		it("dragging a pair by its handle reorders the solution", async function () {
			const p = await pairing(true);
			const pairs = [...p.shadowRoot.querySelectorAll(".pair")] as Element[];
			assert.ok(pairs.length === 3, "three pairs");
			await drag(pairs[0].querySelector(".drag-handle")!, pairs[2]); await done(p);
			const order = p.solution.map(([a]: string[]) => a).join();
			assert.ok(order === "a2,a3,a1" || order === "a2,a1,a3", "pair moved to the dropped place: " + order);
			const rendered = [...p.shadowRoot.querySelectorAll(".pair")].map((el: Element) => el.getAttribute("data-ww-key")).join();
			assert.ok(rendered === "0,1,2", "pairs are rendered anew in the new order: " + rendered);
			const again = [...p.shadowRoot.querySelectorAll(".pair")] as Element[];
			await drag(again[2].querySelector(".drag-handle")!, again[0]); await done(p);
			const second = p.solution.map(([a]: string[]) => a).join();
			assert.ok(second !== order && second.split(",").length === 3, "a second drag reorders again: " + second);
			assert.ok(p.solution.every(([a, b]: string[]) => a.slice(1) === b.slice(1)), "each pair keeps its two items");
		});

		it("the add-pair tile is not draggable", async function () {
			const p = await pairing(true);
			assert.ok(!p.shadowRoot.querySelector("#add-pair[data-ww-drag]"), "add-pair is no drag item");
			const pairs = [...p.shadowRoot.querySelectorAll(".pair")] as Element[];
			await drag(pairs[0].querySelector(".drag-handle")!, p.shadowRoot.querySelector("#add-pair")); await done(p);
			assert.ok(p.solution.length === 3, "no pair was lost or created");
		});
	});
});

mocha.run();
