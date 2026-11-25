/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-quiz-feedback";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
import { assert, done, editMode, mount, transactions, unmount, type Any } from "./helpers";

mocha.setup(getMochaConfig());

// A change in several steps is one transaction: one ww-transactionstart / ww-transactionend pair.
describe("undo steps", function () {
	afterEach(unmount);

	it("Add item on a Sequence is one transaction that includes the solution", async function () {
		const root = mount(`<div><webwriter-order><p slot="prompt">P</p><webwriter-order-item id="i1"><p>1</p></webwriter-order-item><webwriter-order-item id="i2"><p>2</p></webwriter-order-item><webwriter-order-item id="i3"><p>3</p></webwriter-order-item><webwriter-order-item id="i4"><p>4</p></webwriter-order-item></webwriter-order></div>`);
		const w = root.querySelector("webwriter-order") as Any;
		await done(w); editMode(w); await done(w);
		w.solution = ["i1", "i2", "i3", "i4"]; await done(w);
		const seen = await transactions(async () => { w.shadowRoot.querySelector(".task-helper .add-item").click(); await w.updateComplete; });
		assert.ok(seen === "start,end", "one pair: " + seen);
		assert.ok(w.querySelectorAll("webwriter-order-item").length === 5 && w.solution.length === 5, "item and solution added");
	});

	it("adding an unmatched item and connecting it each use one transaction", async function () {
		const root = mount(`<div><webwriter-pairing><p slot="prompt">Match</p>
			<webwriter-pairing-item id="a1"><p>A1</p></webwriter-pairing-item><webwriter-pairing-item id="b1"><p>B1</p></webwriter-pairing-item>
			<webwriter-pairing-item id="a2"><p>A2</p></webwriter-pairing-item><webwriter-pairing-item id="b2"><p>B2</p></webwriter-pairing-item>
			<webwriter-pairing-item id="a3"><p>A3</p></webwriter-pairing-item><webwriter-pairing-item id="b3"><p>B3</p></webwriter-pairing-item>
		</webwriter-pairing></div>`);
		const p = root.querySelector("webwriter-pairing") as Any;
		await done(p);
		p.solution = [["a1", "b1"], ["a2", "b2"], ["a3", "b3"]];
		editMode(p); await done(p);
		const added = await transactions(async () => { p.shadowRoot.querySelector(".add-left-item").click(); await p.updateComplete; });
		assert.equal(added, "start,end", "adding an item takes one transaction");
		const item = p.querySelector("webwriter-pairing-column").lastElementChild;
		assert.lengthOf(p.solution, 3);
		assert.lengthOf(p.querySelectorAll("webwriter-pairing-item"), 7);
		assert.equal(item.id, "", "unconnected items need no persisted ID");
		const linked = await transactions(async () => {
			item.connector.click();
			p.querySelector("#b1").connector.click();
			await p.updateComplete;
		});
		assert.equal(linked, "start,end", "assigning a new ID and linking take one transaction");
		assert.includeDeepMembers(p.solution, [[item.id, "b1"]]);
	});

	it("Add Feedback replaces the legacy attribute in one transaction", async function () {
		const root = mount(`<div><webwriter-order layout="list" feedback="Old text"><p slot="prompt">P</p><webwriter-order-item id="i1"><p>1</p></webwriter-order-item><webwriter-order-item id="i2"><p>2</p></webwriter-order-item></webwriter-order></div>`);
		const w = root.querySelector("webwriter-order") as Any;
		await done(w); editMode(w); await done(w);
		const seen = await transactions(async () => { w.shadowRoot.querySelector(".add-feedback").click(); await w.updateComplete; });
		assert.ok(seen === "start,end", "one pair: " + seen);
		assert.ok(w.querySelector("webwriter-quiz-feedback")?.textContent.includes("Old text") && !w.hasAttribute("feedback"), "feedback element created, attribute removed");
	});

	it("inserting a gap by key is one transaction", async function () {
		const root = mount(`<webwriter-gap><p slot="prompt">P</p><p>Make a gap here</p></webwriter-gap>`);
		const g = root.firstElementChild as Any;
		await done(g); editMode(g); await done(g);
		const p = g.querySelector("p:not([slot])") as HTMLElement;
		document.getSelection()!.setBaseAndExtent(p.firstChild!, 0, p.firstChild!, 4);
		const seen = await transactions(async () => {
			const apple = /mac/i.test(navigator.platform);
			p.dispatchEvent(new KeyboardEvent("keydown", { key: "g", ctrlKey: !apple, metaKey: apple, bubbles: true, composed: true, cancelable: true }));
		});
		assert.ok(seen === "start,end", "one pair: " + seen);
		assert.ok(p.querySelector("webwriter-gap-item")?.textContent === "Make", "gap inserted");
	});

	it("the remove button of a gap is one transaction and leaves the text", async function () {
		const root = mount(`<webwriter-gap><p slot="prompt">P</p><p>Make a <webwriter-gap-item>gap</webwriter-gap-item> here</p></webwriter-gap>`);
		const g = root.firstElementChild as Any;
		await done(g); editMode(g); await done(g);
		const item = g.querySelector("webwriter-gap-item") as Any;
		await done(item);
		const seen = await transactions(async () => { item.shadowRoot.querySelector(".remove-gap").click(); });
		assert.ok(seen === "start,end", "one pair: " + seen);
		assert.ok(!g.querySelector("webwriter-gap-item") && g.querySelector("p:not([slot])").textContent === "Make a gap here", "the gap is text again");
	});

	it("deleting an emptied gap item with Backspace is one transaction", async function () {
		const root = mount(`<webwriter-gap><p slot="prompt">P</p><p>Make a <webwriter-gap-item>gap</webwriter-gap-item> here</p></webwriter-gap>`);
		const g = root.firstElementChild as Any;
		await done(g); editMode(g); await done(g);
		const item = g.querySelector("webwriter-gap-item") as Any;
		await done(item);
		const input = item.shadowRoot.querySelector("input.edit-input") as HTMLInputElement;
		input.focus();
		input.select();
		const seen = await transactions(async () => {
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true, cancelable: true }));
		});
		assert.ok(seen === "start,end", "one pair: " + seen);
		assert.ok(!g.querySelector("webwriter-gap-item"), "gap deleted");
	});
});

mocha.run();
