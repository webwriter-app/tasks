/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-quiz";
import "../src/widgets/webwriter-quiz-feedback";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import { assert, above, below, drag, done, editMode, mount, unmount, until, type Any } from "./helpers";

mocha.setup(getMochaConfig());

const itemsHtml = (kind: string, n = 4) =>
	Array.from({ length: n }, (_, i) => `<webwriter-${kind}-item id="i${i + 1}"><p>Item ${i + 1}</p></webwriter-${kind}-item>`).join("");

async function listWidget(kind: string, { edit = false, layout = "list", extra = "" } = {}): Promise<Any> {
	const root = mount(`<webwriter-quiz hide-question-title hide-points><webwriter-${kind} layout="${layout}" ${extra}><p slot="prompt">P</p>${itemsHtml(kind)}</webwriter-${kind}></webwriter-quiz>`);
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

	for (const layout of ["list", "tiles"]) {
		describe(`order, ${layout} layout`, function () {
			it("a reader's drag changes the learner's order and leaves the authored children alone", async function () {
				const w = await listWidget("order", { layout });
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
				const w = await listWidget("order", { layout });
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
				const w = await listWidget("order", { edit: true, layout });
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

		it("the grip actions are hidden for readers and shown to authors", async function () {
			const w = await listWidget("order");
			const actions = () => w.querySelector("#i1").shadowRoot.querySelector(".actions");
			assert.ok(actions().hidden && getComputedStyle(actions()).display === "none", "hidden in read mode");
			editMode(w); await until(() => !actions().hidden, "actions shown in edit mode");
			document.designMode = "off"; w.removeAttribute("contenteditable"); await until(() => actions().hidden, "actions hidden again");
		});

		it("touch scrolling is switched off on the handles only", async function () {
			const w = await listWidget("order");
			const item = w.querySelector("#i1");
			assert.ok(getComputedStyle(body(item, "order")).touchAction === "none", "the handle sets touch-action none");
			assert.ok(getComputedStyle(w.shadowRoot.querySelector("[data-ww-drop]")).touchAction === "auto", "the container scrolls");
		});
	});

	describe("choice", function () {
		for (const layout of ["list", "tiles"]) {
			it(`dragging the grip moves the authored option (edit, ${layout} layout)`, async function () {
				const w = await listWidget("choice", { edit: true, layout });
				const first = w.querySelector("#i1").getBoundingClientRect();
				await drag(grip(w.querySelector("#i4")), layout === "tiles" ? { x: first.left + 4, y: first.top + first.height / 2 } : above(w.querySelector("#i1"))); await done(w);
				assert.ok(authored(w) === "i4,i1,i2,i3", "authored order: " + authored(w));
				assert.ok(w.querySelector("webwriter-choice-item").id === "i4", "moved in the DOM");
			});
		}

		it("the options stay in front of the question feedback in edit mode", async function () {
			const w = await listWidget("choice", { edit: true });
			const fb = document.createElement("webwriter-quiz-feedback"); fb.slot = "feedback"; fb.innerHTML = "<p>f</p>"; w.append(fb); await done(w);
			await drag(grip(w.querySelector("#i1")), below(w.querySelector("#i4"))); await done(w);
			assert.ok(authored(w) === "i2,i3,i4,i1", "authored order: " + authored(w));
			assert.ok(w.lastElementChild === fb || w.children[w.children.length - 1].slot === "feedback", "feedback is still last");
		});

		it("readers cannot drag options, and a click still selects", async function () {
			const w = await listWidget("choice");
			await drag(grip(w.querySelector("#i1")), below(w.querySelector("#i4"))); await done(w);
			assert.ok(authored(w) === "i1,i2,i3,i4" && shown(w) === "i1,i2,i3,i4", "no reorder: " + shown(w));
			w.querySelector("#i2").click(); await done(w);
			assert.ok(w.checkValidity(), "the click selected an option");
		});

		it("clicking the marker in edit mode sets the solution", async function () {
			const w = await listWidget("choice", { edit: true });
			w.querySelector("#i2").shadowRoot.querySelector(".marker-container").click(); await done(w);
			assert.ok(w.solution.i2 === true, "solution: " + JSON.stringify(w.solution));
		});
	});
});

mocha.run();
