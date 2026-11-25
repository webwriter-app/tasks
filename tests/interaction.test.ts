/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { readWidgetOption, widgetDeclarations } from "@webwriter/lit";

import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-categorize";
import "../src/widgets/webwriter-grid-item";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-quiz-results";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-mark";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import "../src/widgets/webwriter-speech";
import { assert, below, centre, done, drag, frame, mount, unmount, until, type Any } from "./helpers";

mocha.setup(getMochaConfig());

const key = (target: Element, name: string) =>
	target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true, composed: true, cancelable: true }));

const orderHtml = (items = 4) => `<div><webwriter-order><p slot="prompt">P</p>${
	Array.from({ length: items }, (_, i) => `<webwriter-order-item id="i${i + 1}"><p>Item ${i + 1}</p></webwriter-order-item>`).join("")
}</webwriter-order></div>`;
const shown = (w: Any) => (w.shadowRoot.querySelector("slot:not([name])").assignedElements() as Element[]).map(i => i.id).join();

describe("content in task items", function () {
	afterEach(unmount);

	it("keeps embedded content flush with the item and reserves space for the controls", async function () {
		const root = mount(`<div style="width: 480px">
			<webwriter-choice mode="multiple">
				<webwriter-choice-item id="choice"><button type="button">Play</button></webwriter-choice-item>
				<webwriter-choice-item><p>Text choice</p></webwriter-choice-item>
			</webwriter-choice>
			<webwriter-order>
				<webwriter-order-item id="order"><video controls></video></webwriter-order-item>
				<webwriter-order-item><p>Text item</p></webwriter-order-item>
			</webwriter-order>
			<webwriter-pairing>
				<webwriter-pairing-column><webwriter-pairing-item id="pair"><svg viewBox="0 0 2 1"><rect width="2" height="1" /></svg></webwriter-pairing-item></webwriter-pairing-column>
				<webwriter-pairing-column><webwriter-pairing-item><p>Text match</p></webwriter-pairing-item></webwriter-pairing-column>
			</webwriter-pairing>
			<webwriter-categorize categories='["c1"]' solution='{"c1":["group"]}'>
				<webwriter-grid-item id="c1"><p>Group heading</p></webwriter-grid-item>
				<webwriter-grid-item id="group"><audio controls aria-label="Audio clue"></audio></webwriter-grid-item>
			</webwriter-categorize>
		</div>`);
		for (const task of root.firstElementChild!.children) await done(task);
		for (const [id, frameSelector] of [["choice", ".choice-item"], ["order", ".order-item"], ["pair", ".pair-tile"], ["group", "slot"]]) {
			const item = root.querySelector(`#${id}`)!;
			const frame = item.shadowRoot!.querySelector(frameSelector)!;
			assert.equal(getComputedStyle(frame).padding, "0px", id);
			const slot = item.shadowRoot!.querySelector("slot")!;
			assert.strictEqual(slot.assignedElements()[0], item.firstElementChild);
		}
		const choice = root.querySelector("webwriter-choice")!;
		const option = root.querySelector("#choice")!;
		const marker = option.shadowRoot!.querySelector<HTMLButtonElement>(".marker")!;
		assert.isAtMost(marker.getBoundingClientRect().right, option.firstElementChild!.getBoundingClientRect().left);
		assert.notEqual(getComputedStyle(option.nextElementSibling!.shadowRoot!.querySelector(".choice-item")!).padding, "0px");
		option.querySelector("button")!.click();
		assert.isFalse(choice.checkValidity(), "embedded buttons can be used independently of the answer");
		marker.click();
		assert.isTrue(choice.checkValidity());

		const order = root.querySelector("#order")!.shadowRoot!;
		assert.exists(order.querySelector(".grip[data-ww-drag-handle]"));
		assert.notExists(order.querySelector(".order-item[data-ww-drag-handle]"));
		const pair = root.querySelector("#pair")!.shadowRoot!;
		assert.isAtMost(pair.querySelector("slot")!.getBoundingClientRect().right, pair.querySelector(".pair-dot")!.getBoundingClientRect().left);

		const groups = root.querySelector("webwriter-categorize")!;
		const group = groups.querySelector("#group")!;
		assert.equal(getComputedStyle(group.shadowRoot!.querySelector(".card-content")!).padding, "0px");
		groups.scrollIntoView({ block: "center" });
		await frame();
		await drag(group.shadowRoot!.querySelector(".drag-handle")!, groups.shadowRoot!.querySelector(".bucket-zone")!);
		await done(groups);
		assert.include(groups.shadowRoot!.querySelector(".bucket-zone")!.textContent, "Audio clue");
		assert.exists(root.querySelector("#group audio"));
	});
});

describe("keyboard, pointer and touch input", function () {
	afterEach(unmount);

	describe("choice", function () {
		for (const [mode, role] of [["single", "radio"], ["multiple", "checkbox"]]) {
			it(`${mode} choice: the marker is a labelled ${role} that follows the selection`, async function () {
				const root = mount(`<div><webwriter-choice mode="${mode}"><p slot="prompt">P</p>
					<webwriter-choice-item id="a"><p>Alpha</p></webwriter-choice-item>
					<webwriter-choice-item id="b"><p>Beta</p></webwriter-choice-item></webwriter-choice></div>`);
				const w = root.querySelector("webwriter-choice") as Any;
				await done(w);
				const items = [...w.querySelectorAll("webwriter-choice-item")] as Any[];
				for (const item of items) await done(item);
				const marker = (i: number) => items[i].shadowRoot.querySelector(".marker") as HTMLElement;
				assert.equal(marker(0).getAttribute("role"), role);
				assert.equal(marker(0).getAttribute("aria-checked"), "false");
				assert.equal(marker(0).tabIndex, 0, "the marker is a tab stop");
				const label = marker(0).getAttribute("aria-labelledby")!;
				assert.ok(items[0].shadowRoot.getElementById(label), "the marker is named by the option text");
				marker(0).click(); await done(items[0]); await done(items[1]);
				assert.equal(marker(0).getAttribute("aria-checked"), "true", "activating the marker (as Enter or Space does) selects");
				assert.equal(w.shadowRoot.querySelector("[role=radiogroup], [role=group]") !== null, true);
			});
		}

		it("the options of a choice have no handle of their own; the editor moves them", async function () {
			const root = mount(`<div><webwriter-choice><p slot="prompt">P</p><webwriter-choice-item id="a"><p>A</p></webwriter-choice-item></webwriter-choice></div>`);
			const item = root.querySelector("webwriter-choice-item") as Any;
			await done(item);
			assert.ok(!item.shadowRoot.querySelector("[data-ww-drag-handle]"), "no drag handle on an option");
		});
	});

	describe("order", function () {
		it("a reader reorders with the keyboard: Space picks up, the arrow keys move, Enter drops", async function () {
			const w = mount(orderHtml()).querySelector("webwriter-order") as Any;
			await done(w);
			const first = w.querySelector("#" + shown(w).split(",")[0]) as Any;
			await done(first);
			const stop = first.shadowRoot.querySelector(".order-item") as HTMLElement;
			assert.equal(stop.tabIndex, 0, "each item is a tab stop for readers");
			const before = shown(w);
			stop.focus();
			key(stop, " "); await frame(2);
			key(stop, "ArrowDown"); await frame(2);
			key(stop, "Enter"); await frame(4);
			await done(w);
			assert.notEqual(shown(w), before, "the keyboard moved the item: " + shown(w));
		});

		it("a touch drag reorders like a mouse drag", async function () {
			const w = mount(orderHtml()).querySelector("webwriter-order") as Any;
			await done(w);
			const ids = shown(w).split(",");
			const first = w.querySelector("#" + ids[0]) as Any, last = w.querySelector("#" + ids[3]) as Any;
			await drag(first.shadowRoot.querySelector(".order-item"), below(last), { pointerType: "touch" });
			await done(w);
			assert.equal(shown(w), [...ids.slice(1), ids[0]].join(), "learner order after the touch drag");
		});

		it("the item handles are 24 by 24 pixels at least", async function () {
			const root = mount(orderHtml(2));
			const w = root.querySelector("webwriter-order") as Any;
			w.setAttribute("contenteditable", ""); document.designMode = "on";
			await done(w);
			const item = w.querySelector("webwriter-order-item") as Any;
			await done(item);
			const rect = item.shadowRoot.querySelector("sl-icon-button").getBoundingClientRect();
			assert.ok(rect.width >= 24 && rect.height >= 24, `${rect.width}x${rect.height}`);
		});
	});

	describe("mark", function () {
		it("a reader marks words with the keyboard", async function () {
			const root = mount(`<div><webwriter-mark><p slot="prompt">P</p><p>one two three</p></webwriter-mark></div>`);
			const w = root.querySelector("webwriter-mark") as Any;
			await done(w);
			const text = w.shadowRoot.querySelector("slot:not([name])") as HTMLElement;
			assert.equal(text.tabIndex, 0, "the text is a tab stop");
			text.focus(); await done(w);
			key(text, "ArrowRight"); key(text, " "); await done(w);
			assert.deepEqual(w.currentAnswer, [1], "the second word is marked");
			key(text, "ArrowRight"); key(text, "Enter"); await done(w);
			assert.deepEqual(w.currentAnswer, [1, 2]);
			key(text, "Home"); key(text, " "); await done(w);
			assert.deepEqual(w.currentAnswer, [0, 1, 2]);
			key(text, " "); await done(w);
			assert.deepEqual(w.currentAnswer, [1, 2], "Space toggles again");
			assert.include(w.shadowRoot.querySelector(".announcement").textContent, "one");
		});

		it("the text has no tab stop in edit mode", async function () {
			const root = mount(`<div><webwriter-mark><p slot="prompt">P</p><p>one two</p></webwriter-mark></div>`);
			const w = root.querySelector("webwriter-mark") as Any;
			w.setAttribute("contenteditable", ""); document.designMode = "on";
			await done(w);
			assert.notEqual(w.shadowRoot.querySelector("slot:not([name])").getAttribute("tabindex"), "0");
		});

		it("can hide the target count while keeping the reader's mark count", async function () {
			const root = mount(`<webwriter-mark solution="[0,1]"><p slot="prompt">P</p><p>one two three</p></webwriter-mark>`);
			const mark = root.querySelector("webwriter-mark")!;
			const helper = (task: HTMLElement) => task.shadowRoot!.querySelector(".task-helper > .helper")!.textContent!;
			await done(mark);
			const option = readWidgetOption(mark, "hideTargetCount", widgetDeclarations(mark, "options").hideTargetCount, "en");
			assert.include(option, { attribute: "hide-target-count", label: "Hide total marks to find", type: "boolean", value: false });
			assert.include(helper(mark), "2 to find");

			mark.hideTargetCount = true;
			await done(mark);
			assert.isTrue(mark.hasAttribute("hide-target-count"));
			const restored = mount(mark.outerHTML).querySelector("webwriter-mark")!;
			await done(restored);
			assert.notInclude(helper(restored), "to find");
			assert.notInclude(helper(restored), "·");
			const text = restored.shadowRoot!.querySelector<HTMLElement>("slot:not([name])")!;
			text.focus();
			key(text, " ");
			await done(restored);
			assert.include(helper(restored), "1 marked");

			restored.removeAttribute("hide-target-count");
			await done(restored);
			assert.include(helper(restored), "2 to find");
		});
	});

	describe("gap", function () {
		it("a touch drag moves an answer into a gap", async function () {
			const root = mount(`<div><webwriter-gap mode="drag-and-drop"><p slot="prompt">P</p><p>The <webwriter-gap-item>cat</webwriter-gap-item> sat on the <webwriter-gap-item>mat</webwriter-gap-item>.</p></webwriter-gap></div>`);
			const w = root.querySelector("webwriter-gap") as Any;
			await done(w);
			const items = [...w.querySelectorAll("webwriter-gap-item")] as Any[];
			for (const item of items) await done(item);
			const chip = [...w.shadowRoot.querySelectorAll(".choice")].find((c: Any) => c.textContent === "cat") as HTMLElement;
			const target = items[0].shadowRoot.querySelector("button") as HTMLElement;
			assert.ok(getComputedStyle(chip).touchAction === "none", "only the chips start a drag");
			await drag(chip, centre(target), { pointerType: "touch" });
			await done(w); await done(items[0]);
			assert.equal(items[0].shadowRoot.querySelector("button").getAttribute("aria-label"), "cat");
		});
	});

	describe("pairing", function () {
		it("authors add items independently from the hint row", async function () {
			const root = mount(`<div><webwriter-pairing><p slot="prompt">P</p></webwriter-pairing></div>`);
			const w = root.querySelector("webwriter-pairing") as Any;
			w.setAttribute("contenteditable", ""); document.designMode = "on";
			await done(w);
			const helper = w.shadowRoot.querySelector(".task-helper");
			assert.isTrue(helper.firstElementChild.classList.contains("helper"));
			const controls = [...helper.querySelector(".task-helper-switches").children] as Any[];
			assert.deepEqual(controls.map(control => control.querySelector(".pair-control-full").textContent),
				["Multi-connect", "Add left item", "Add right item"]);
			assert.deepEqual(controls.slice(1).map(control => control.getAttribute("data-ww-capture-selection")), ["false", "false"]);
			assert.isFalse(controls[0].checked);
			assert.notExists(w.shadowRoot.querySelector(".edit-toolbar .add-option"));
			controls[2].click();
			const [left, right] = w.querySelectorAll("webwriter-pairing-column");
			await until(() => right.children.length === 2, "the button adds a right item");
			assert.lengthOf(left.children, 1);
		});
	});
});

describe("theme", function () {
	afterEach(unmount);

	it("text and accent colors follow the page theme", async function () {
		const root = mount(`<div style="--ww-text-color: rgb(1, 2, 3); --ww-font-family: Georgia, serif; --ww-theme-accent-1: rgb(200, 10, 20)">
			<div><webwriter-choice><p slot="prompt">P</p><webwriter-choice-item id="a"><p>A</p></webwriter-choice-item></webwriter-choice><webwriter-quiz-results></webwriter-quiz-results></div></div>`);
		const quiz = root.querySelector("webwriter-quiz-results") as Any;
		const w = root.querySelector("webwriter-choice") as Any;
		const item = root.querySelector("webwriter-choice-item") as Any;
		await done(quiz); await done(w); await done(item);
		for (const host of [quiz, w]) {
			const style = getComputedStyle(host);
			assert.equal(style.color, "rgb(1, 2, 3)");
			assert.include(style.fontFamily, "Georgia");
		}
		item.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: { id: "a" } }));
		await done(w); await done(item);
		const marker = item.shadowRoot.querySelector(".marker") as HTMLElement;
		await until(() => getComputedStyle(marker).backgroundColor === "rgb(200, 10, 20)", "the selected marker takes accent 1");
	});

	it("without a theme the selected marker keeps its Shoelace color", async function () {
		const root = mount(`<div><webwriter-choice><p slot="prompt">P</p><webwriter-choice-item id="a"><p>A</p></webwriter-choice-item></webwriter-choice></div>`);
		const w = root.querySelector("webwriter-choice") as Any;
		const item = root.querySelector("webwriter-choice-item") as Any;
		await done(w); await done(item);
		item.dispatchEvent(new CustomEvent("select", { bubbles: true, detail: { id: "a" } }));
		await done(w); await done(item);
		const color = getComputedStyle(item.shadowRoot.querySelector(".marker")).backgroundColor;
		assert.notEqual(color, "rgba(0, 0, 0, 0)");
	});

	it("the hosts limit their width between 300 and 2100 pixels", async function () {
		const root = mount(`<div><webwriter-choice><p slot="prompt">P</p><webwriter-choice-item id="a"><p>A</p></webwriter-choice-item></webwriter-choice><webwriter-quiz-results></webwriter-quiz-results></div>`);
		for (const host of Array.from(root.querySelectorAll("webwriter-choice, webwriter-quiz-results")) as Any[]) {
			await done(host);
			const style = getComputedStyle(host);
			assert.equal(style.maxWidth, "2100px");
			assert.equal(style.boxSizing, "border-box");
		}
	});
});

describe("print", function () {
	afterEach(unmount);

	it("the note for interactive content is hidden on screen", async function () {
		const root = mount(`<webwriter-quiz><webwriter-speech><p slot="prompt">P</p></webwriter-speech></webwriter-quiz>`);
		const w = root.querySelector("webwriter-speech") as Any;
		await done(w);
		const note = w.shadowRoot.querySelector(".print-note") as HTMLElement;
		assert.ok(note, "the recording task carries a note for paper");
		assert.equal(getComputedStyle(note).display, "none");
	});
});

mocha.run();
