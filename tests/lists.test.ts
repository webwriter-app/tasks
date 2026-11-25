/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { widgetDeclarations } from "@webwriter/lit";

import "../src/widgets/webwriter-quiz-feedback";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import { assert, above, below, drag, done, editMode, mount, unmount, until, type Any } from "./helpers";

mocha.setup(getMochaConfig());

const itemsHtml = (kind: string, n = 4) =>
	Array.from({ length: n }, (_, i) => `<webwriter-${kind}-item id="i${i + 1}"><p>Item ${i + 1}</p></webwriter-${kind}-item>`).join("");

async function listWidget(kind: string, { edit = false, legacyTiles = false } = {}): Promise<Any> {
	const root = mount(`<div><webwriter-${kind}${legacyTiles ? ' layout="tiles"' : ""}><p slot="prompt">P</p>${itemsHtml(kind)}</webwriter-${kind}></div>`);
	const w = root.querySelector(`webwriter-${kind}`) as Any;
	await done(w);
	if (edit) { editMode(w); await done(w); }
	return w;
}
const shown = (w: Any) => (w.shadowRoot.querySelector("slot:not([name])").assignedElements() as Element[]).map(i => i.id).join();
const authored = (w: Any) => ([...w.children] as Element[]).filter(c => c.localName.endsWith("-item")).map(i => i.id).join();
const body = (item: Any, kind: string) => item.shadowRoot.querySelector(`.${kind}-item`);
const grip = (item: Any) => item.shadowRoot.querySelector("[data-ww-drag-handle]");

describe("<webwriter-order> and <webwriter-choice>", function () {
	afterEach(unmount);

	it("fits disclosures and removes the leading list indent within task items", async function () {
		mount(`<style>
			:is(webwriter-order-item, webwriter-choice-item) > details { margin: 1rem; }
			:is(webwriter-order-item, webwriter-choice-item) > :is(ul, ol) {
				margin-inline-start: 1rem;
				padding-inline-start: 2rem;
			}
		</style>`);
		for (const kind of ["order", "choice"]) {
			const task = await listWidget(kind);
			const disclosureItem = task.querySelector("#i1") as HTMLElement;
			const listItem = task.querySelector("#i2") as HTMLElement;
			disclosureItem.innerHTML = "<details><summary>Show more</summary><p>More content</p></details>";
			listItem.innerHTML = "<ol><li>First</li><li>Second</li></ol>";
			await Promise.all([done(disclosureItem), done(listItem)]);
			const disclosure = disclosureItem.querySelector("details")!;
			const list = listItem.querySelector("ol")!;
			const style = getComputedStyle(list);
			const content = disclosure.assignedSlot!.getBoundingClientRect();
			const bounds = disclosure.getBoundingClientRect();
			assert.closeTo(bounds.width, content.width, 1);
			assert.closeTo(bounds.height, content.height, 1);
			assert.equal(getComputedStyle(disclosure).margin, "0px");
			assert.equal(style.marginInlineStart, "0px");
			assert.equal(style.paddingInlineStart, "0px");
			assert.equal(getComputedStyle(list.firstElementChild!).listStylePosition, "inside");
		}
	});

	for (const legacyTiles of [false, true]) {
		describe(legacyTiles ? "order with legacy tile markup" : "order list", function () {
			it("a reader's drag changes the learner's order and leaves the authored children alone", async function () {
				const w = await listWidget("order", { legacyTiles });
				const authoredBefore = authored(w);
				const before = shown(w).split(",");
				const first = w.querySelector(`#${before[0]}`), last = w.querySelector(`#${before[3]}`);
				await drag(body(first, "order"), below(last)); await done(w);
				assert.ok(shown(w) === [...before.slice(1), before[0]].join(), `learner order: ${shown(w)} from ${before}`);
				assert.ok(authored(w) === authoredBefore, "authored order is unchanged: " + authored(w));
				assert.ok(!first.hasAttribute("style") && !first.hasAttribute("class") && !first.hasAttribute("data-ww-dragging"), "nothing written onto the authored item");
				assert.ok(!w.hasAttribute("style"), "nothing written onto the widget");
				await drag(body(w.querySelector(`#${before[3]}`), "order"), above(w.querySelector(`#${shown(w).split(",")[0]}`))); await done(w);
				assert.ok(authored(w) === authoredBefore, "authored order is still unchanged");
			});

			it("the learner's order is graded", async function () {
				const w = await listWidget("order", { legacyTiles });
				w.solution = ["i1", "i2", "i3", "i4"];
				await done(w);
				for (const id of ["i1", "i2", "i3", "i4"]) {
					const index = ["i1", "i2", "i3", "i4"].indexOf(id);
					if (shown(w).split(",")[index] === id) continue;
					const target = w.querySelector(`#${shown(w).split(",")[index]}`);
					await drag(body(w.querySelector(`#${id}`), "order"), above(target)); await done(w);
				}
				assert.ok(shown(w) === "i1,i2,i3,i4", "solved by dragging: " + shown(w));
				assert.ok(w.checkAnswer(false) === 1, "the order the learner built is graded as correct");
			});

			it("an author's drag by the grip moves the authored child and updates the solution", async function () {
				const w = await listWidget("order", { edit: true, legacyTiles });
				w.solution = ["i1", "i2", "i3", "i4"]; await done(w);
				await drag(grip(w.querySelector("#i1")), below(w.querySelector("#i4"))); await done(w);
				assert.ok(authored(w) === "i2,i3,i4,i1", "authored order: " + authored(w));
				assert.ok(w.solution.join() === "i2,i3,i4,i1", "solution follows: " + w.solution.join());
				assert.ok(shown(w) === "i2,i3,i4,i1", "shown in the authored order in edit mode");
				assert.ok(!w.querySelector("#i1").hasAttribute("style"), "no style written on the item");
			});
		});
	}

	describe("order", function () {
		it("the item body is not a drag handle in edit mode", async function () {
			const w = await listWidget("order", { edit: true });
			await drag(body(w.querySelector("#i1"), "order"), below(w.querySelector("#i4"))); await done(w);
			assert.ok(authored(w) === "i1,i2,i3,i4", "dragging the text does not reorder: " + authored(w));
		});

		it("Escape during a drag changes nothing", async function () {
			const w = await listWidget("order");
			const before = shown(w);
			await drag(body(w.querySelector(`#${before.split(",")[0]}`), "order"), below(w.querySelector(`#${before.split(",")[3]}`)), { cancel: true }); await done(w);
			assert.ok(shown(w) === before && authored(w) === "i1,i2,i3,i4", "unchanged");
		});

		it("readers and authors see the same grip and arrows; authors drag by the grip only", async function () {
			const w = await listWidget("order");
			const item = () => w.querySelector("#i1").shadowRoot;
			const box = () => item().querySelector(".order-item").getBoundingClientRect();
			const read = box();
			assert.ok(item().querySelector(".grip") && item().querySelector(".move") && item().querySelector(".order-item[data-ww-drag-handle]"),
				"readers drag the whole item, by the grip or the arrows");
			editMode(w);
			await until(() => item().querySelector(".grip[data-ww-drag-handle]"), "the grip is the handle of authors");
			assert.ok(item().querySelector(".move") && !item().querySelector(".order-item[data-ww-drag-handle]"), "authors keep the arrows and edit the text");
			const edit = box();
			assert.ok(read.width === edit.width && read.height === edit.height, `the item keeps its size: ${read.width}x${read.height} and ${edit.width}x${edit.height}`);
		});

		it("an author's arrows move the authored child and update the solution", async function () {
			const w = await listWidget("order", { edit: true });
			w.solution = ["i1", "i2", "i3", "i4"]; await done(w);
			const first = w.querySelector("#i1") as Any;
			await done(first);
			(first.shadowRoot.querySelectorAll(".move sl-icon-button")[1] as HTMLElement).click();
			await done(w);
			assert.ok(authored(w) === "i2,i1,i3,i4" && w.solution.join() === "i2,i1,i3,i4", "authored order and solution: " + authored(w));
		});

		it("an order item has no hint of its own", async function () {
			for (const legacyTiles of [false, true]) {
				for (const edit of [false, true]) {
					const w = await listWidget("order", { edit, legacyTiles });
					const item = w.querySelector("#i1") as Any;
					await done(item);
					assert.ok(!item.shadowRoot.querySelector("hint-popup"), "no hint popup on order item");
					unmount();
				}
			}
		});

		it("touch scrolling is switched off on the handles only", async function () {
			const w = await listWidget("order");
			const item = w.querySelector("#i1");
			assert.ok(getComputedStyle(body(item, "order")).touchAction === "none", "the handle sets touch-action none");
			assert.ok(getComputedStyle(w.shadowRoot.querySelector("[data-ww-drop]")).touchAction === "auto", "the container scrolls");
		});
	});

	describe("choice", function () {
		for (const legacyTiles of [false, true]) {
			const markup = legacyTiles ? "legacy tile markup" : "current markup";
			it(`an option stays in a row with ${markup}`, async function () {
				for (const edit of [false, true]) {
					const w = await listWidget("choice", { edit, legacyTiles });
					const item = w.querySelector("#i1") as Any;
					await done(item);
					assert.ok(!item.shadowRoot.querySelector("[data-ww-drag-handle], hint-popup"), "no grip and no hint");
					const marker = item.shadowRoot.querySelector(".marker").getBoundingClientRect();
					const text = item.querySelector("p").getBoundingClientRect();
					assert.ok(marker.right <= text.left && Math.abs(marker.top + marker.height / 2 - (text.top + text.height / 2)) < text.height,
						"the marker is beside the text");
					unmount();
				}
			});
		}

		it("a click selects an option", async function () {
			const w = await listWidget("choice");
			w.querySelector("#i2").click(); await done(w);
			assert.ok(w.checkValidity(), "the click selected an option");
		});

		it("clicking the marker in edit mode sets the solution", async function () {
			const w = await listWidget("choice", { edit: true });
			w.querySelector("#i2").shadowRoot.querySelector(".marker-container").click(); await done(w);
			assert.ok(w.solution.i2 === true, "solution: " + JSON.stringify(w.solution));
		});
	});

	it("legacy tile tasks render in rows without offering a layout setting", async function () {
		for (const kind of ["choice", "order"]) {
			const widget = await listWidget(kind, { edit: true, legacyTiles: true });
			const list = widget.shadowRoot.querySelector(".container-list");
			assert.equal(getComputedStyle(list).flexDirection, "column");
			assert.notProperty(widgetDeclarations(widget, "options"), "layout");
			unmount();
		}
	});
});

mocha.run();
