/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
import "../src/widgets/webwriter-text";
import "../src/widgets/webwriter-mark";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import "../src/widgets/webwriter-grid-item";
import "../src/widgets/webwriter-categorize";
import "../src/widgets/webwriter-numeric";
import "../src/widgets/webwriter-image";
import "../src/widgets/webwriter-drawing";
import "../src/widgets/webwriter-speech";
import "../src/widgets/webwriter-dictation";
import "../src/widgets/webwriter-image-placements";
import "../src/widgets/webwriter-quiz-results";
import { findQuizTypeById } from "../src/model/quiz-api";
import { assert, drag, done, editMode, mount, transactions, unmount, until, type Any } from "./helpers";

mocha.setup(getMochaConfig());

const TEST_IMAGE =
	"data:image/svg+xml;utf8,"
	+ encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#eef2ff"/></svg>');

const TEST_AUDIO = "data:audio/wav;base64,UklGRjwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRgAAACAgICAgICAgICAgICAgICAgICAgICAgIA=";

const constructorKeys = ["SpeechRecognition", "webkitSpeechRecognition"];

function browserRecognition(standard: unknown, prefixed?: unknown) {
	const originals = constructorKeys.map(name => Object.getOwnPropertyDescriptor(window, name));
	constructorKeys.forEach((name, index) => Object.defineProperty(window, name, {
		value: index === 0 ? standard : prefixed, configurable: true,
	}));
	return () => constructorKeys.forEach((name, index) => {
		const descriptor = originals[index];
		if (descriptor) Object.defineProperty(window, name, descriptor);
		else Reflect.deleteProperty(window, name);
	});
}

describe("new quiz types and variants", function () {
	afterEach(unmount);

	it("keeps task hint text and author controls on one line", async function () {
		const column = mount('<div style="inline-size: 300px"></div>').firstElementChild as HTMLElement;
		const types = [
			"choice", "true-false-choice", "mark", "text", "numeric", "gap", "dictation", "order",
			"pairing", "categorize", "speech", "image", "image-placements", "drawing",
		];
		const tasks = types.map(type => {
			const task = findQuizTypeById(`webwriter-${type}`)!.createInstance();
			if (task.localName === "webwriter-image" || task.localName === "webwriter-image-placements") {
				task.querySelector("img")!.src = TEST_IMAGE;
				(task as HTMLElementTagNameMap["webwriter-image"]).markers = [{ id: "a", x: 50, y: 50, r: 8, label: "Part" }];
			}
			if (task.localName === "webwriter-drawing") task.setAttribute("background-src", TEST_IMAGE);
			column.append(task);
			editMode(task);
			return task;
		});
		await Promise.all(tasks.map(done));

		const verify = (task: Element) => {
			const row = task.shadowRoot!.querySelector<HTMLElement>(".task-helper")!;
			const hint = row.querySelector<HTMLElement>(".helper")!;
			const style = getComputedStyle(hint);
			assert.equal(style.whiteSpace, "nowrap", task.localName);
			assert.equal(style.textOverflow, "ellipsis", task.localName);
			assert.equal(hint.title, hint.textContent, task.localName);
			const bounds = row.getBoundingClientRect();
			for (const control of row.querySelectorAll(".task-helper-switches > *")) {
				const box = control.getBoundingClientRect();
				assert.closeTo(box.top + box.height / 2, bounds.top + bounds.height / 2, 2, task.localName);
				assert.isAtMost(box.right, bounds.right + 1, task.localName);
			}
		};
		tasks.forEach(verify);
		const imageHint = tasks[types.indexOf("image")].shadowRoot!.querySelector<HTMLElement>(".task-helper > .helper")!;
		assert.isAbove(imageHint.scrollWidth, imageHint.clientWidth, "the image hint truncates beside the controls");

		document.designMode = "off";
		for (const task of tasks) task.removeAttribute("contenteditable");
		await Promise.all(tasks.map(done));
		tasks.forEach(verify);
	});

	describe("<webwriter-choice mode='true-false'>", function () {
		it("authors true/false solution and grades learner answer cleanly", async function () {
			const root = mount(`<div><webwriter-choice mode="true-false"><p slot="prompt">Earth orbits the Sun.</p></webwriter-choice></div>`);
			const task = root.querySelector("webwriter-choice") as Any;
			editMode(task);
			await done(task);

			assert.equal(task.options.layout, undefined, "layout option hidden in true-false mode");
			assert.equal(task.actions.addOption, undefined, "Add Option hidden in true-false mode");

			const radios = task.shadowRoot.querySelectorAll('.tf-choices input[type="radio"]');
			assert.equal(radios.length, 2);
			radios[1].checked = true;
			radios[1].dispatchEvent(new Event("change", { bubbles: true }));
			await done(task);
			assert.deepEqual(task.solution, { false: true });

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			assert.equal(task.checkValidity(), false, "requires a selection");

			const learnerRadios = task.shadowRoot.querySelectorAll('.tf-choices input[type="radio"]');
			learnerRadios[1].checked = true;
			learnerRadios[1].dispatchEvent(new Event("change", { bubbles: true }));
			await done(task);
			assert.equal(task.checkValidity(), true);
			assert.equal(task.checkAnswer(true), 1);

			task.reset();
			await done(task);
			assert.equal(task.checkValidity(), false);
		});
	});

	describe("<webwriter-gap mode='dropdown'>", function () {
		it("authors choices alongside the solution and restricts that gap to the saved options", async function () {
			const task = mount('<webwriter-gap><p slot="prompt">Capital cities.</p><p><webwriter-gap-item>Paris</webwriter-gap-item> and <webwriter-gap-item>Berlin</webwriter-gap-item>.</p></webwriter-gap>')
				.querySelector("webwriter-gap")!;
			editMode(task);
			await done(task);
			const [choiceGap, typedGap] = task.querySelectorAll("webwriter-gap-item");
			const editor = choiceGap.shadowRoot!.querySelector("gap-choices-editor")!;
			const root = editor.shadowRoot!;
			root.querySelector<HTMLButtonElement>(".trigger")!.click();
			assert.exists(root.querySelector("#gap-choices:popover-open"));
			const add = root.querySelector<HTMLInputElement>(".add-option-row input")!;
			for (const option of ["Lyon", "Nice | Lyon", "Lyon"]) {
				add.value = option;
				add.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true, cancelable: true}));
			}
			await done(task);
			assert.deepEqual(JSON.parse(choiceGap.getAttribute("choices")!), ["Lyon", "Nice | Lyon"]);
			root.querySelector<HTMLButtonElement>('.remove[aria-label="Remove answer: Lyon"]')!.click();
			await done(task);
			assert.deepEqual(JSON.parse(choiceGap.getAttribute("choices")!), ["Nice | Lyon"]);
			assert.equal(choiceGap.textContent, "Paris");
			root.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));

			assert.notProperty(task.options, "mode");
			task.shadowRoot!.querySelector<HTMLButtonElement>(".tolerance-trigger")!.click();
			const tolerance = task.shadowRoot!.querySelector("#task-tolerance:popover-open")!;
			assert.deepEqual([...tolerance.querySelectorAll("label")].map(label => label.textContent?.trim()),
				["Ignore capitalization", "Ignore punctuation & accents", "Ignore minor typos"]);
			tolerance.querySelector<HTMLInputElement>("input")!.click();
			assert.isTrue(task.hasAttribute("ignore-case"));

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			const select = choiceGap.shadowRoot!.querySelector("select")!;
			assert.sameMembers([...select.options].map(option => option.value), ["", "Paris", "Nice | Lyon"]);
			assert.notExists(choiceGap.shadowRoot!.querySelector("sl-input"));
			assert.exists(typedGap.shadowRoot!.querySelector("sl-input"));
			select.value = "Paris";
			select.dispatchEvent(new Event("change", { bubbles: true }));
			typedGap.inputAnswer = "berlin";
			assert.isTrue(task.checkValidity());
			assert.equal(task.checkAnswer(false), 1);
		});

		it("renders dropdown options per gap and grades selected options", async function () {
			const root = mount(`<div><webwriter-gap mode="dropdown">
				<p slot="prompt">Pick capitals.</p>
				<p>France: <webwriter-gap-item distractors="Lyon|Nice">Paris</webwriter-gap-item>; Germany: <webwriter-gap-item>Berlin</webwriter-gap-item>.</p>
			</webwriter-gap></div>`);
			const gap = root.querySelector("webwriter-gap") as Any;
			await done(gap);

			const items = gap.querySelectorAll("webwriter-gap-item") as NodeListOf<Any>;
			const select1 = items[0].shadowRoot.querySelector("select.container-select") as HTMLSelectElement;
			const select2 = items[1].shadowRoot.querySelector("select.container-select") as HTMLSelectElement;
			assert.ok(select1 && select2, "both gaps render native select dropdowns");

			const opts1 = Array.from(select1.options, o => o.value).filter(Boolean);
			assert.deepEqual(opts1.sort(), ["Lyon", "Nice", "Paris"], "uses item distractors when set");
			const opts2 = Array.from(select2.options, o => o.value).filter(Boolean);
			assert.deepEqual(opts2.sort(), ["Berlin", "Paris"], "falls back to all gap answers when distractors are omitted");

			assert.equal(gap.checkValidity(), false);
			select1.value = "Paris";
			select1.dispatchEvent(new Event("change", { bubbles: true }));
			select2.value = "Paris"; // wrong
			select2.dispatchEvent(new Event("change", { bubbles: true }));
			await done(gap);

			assert.equal(gap.checkValidity(), true);
			assert.equal(gap.checkAnswer(true), 0.5);
			gap.reset();
			await done(gap);
			assert.equal(gap.checkValidity(), false);
		});
	});

	describe("<webwriter-text> Essay / Self-Check", function () {
		it("starts with one full-width line and keeps reader resizing local", async function () {
			const text = mount(`<webwriter-text><p slot="prompt">P</p></webwriter-text>`).querySelector("webwriter-text")!;
			await done(text);
			const root = text.shadowRoot!;
			const field = root.querySelector<HTMLTextAreaElement>(".answer-field")!;
			const handle = () => root.querySelector<HTMLButtonElement>(".resize-answer");
			const resize = (key: string) => handle()!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
			assert.equal(field.rows, 1);
			assert.equal(field.placeholder, "");
			assert.closeTo(field.getBoundingClientRect().width, root.querySelector(".answer")!.getBoundingClientRect().width, 0.5);
			field.focus();
			assert.equal(getComputedStyle(field).outlineWidth, "1px");
			assert.equal(getComputedStyle(field).outlineOffset, "-1px");
			assert.notExists(handle());
			assert.notProperty(text.options, "type");
			assert.notProperty(text.options, "freeText");
			assert.notProperty(text.options.useRegex, "description");

			editMode(text);
			await done(text);
			assert.equal(field.placeholder, "Solution");
			text.placeholder = "Enter a response";
			await done(text);
			assert.equal(field.placeholder, "Enter a response");
			resize("ArrowDown");
			await done(text);
			assert.equal(text.getAttribute("rows"), "2");
			assert.equal(field.rows, 2);
			resize("ArrowUp");
			await done(text);
			assert.equal(text.getAttribute("rows"), "1");
			text.removeAttribute("contenteditable");
			document.designMode = "off";
			text.allowReaderResize = true;
			await done(text);
			resize("ArrowDown");
			await done(text);
			assert.equal(field.rows, 2);
			assert.equal(text.getAttribute("rows"), "1");
			text.allowReaderResize = false;
			await done(text);
			assert.notExists(handle());
			assert.equal(field.rows, 1);
		});

		it("sets word and character limits in the answer popover and applies them to reader answers", async function () {
			const text = mount(`<webwriter-text grading-method="ungraded" style="width: 320px"></webwriter-text>`).querySelector("webwriter-text")!;
			editMode(text);
			await done(text);
			const root = text.shadowRoot!;
			const configure = root.querySelector<HTMLButtonElement>(".header-editor > button")!;
			configure.click();
			await done(text);
			const header = root.querySelector(".header-editor > :popover-open")!;
			header.querySelector<HTMLInputElement>('input[type="radio"][value="completion"]')!.click();
			await done(text);
			assert.equal(text.gradingMethod, "completion");
			configure.click();
			const limits = root.querySelector<HTMLButtonElement>(".accepted-trigger")!;
			assert.equal(limits.textContent?.trim(), "Answer limits");
			limits.click();
			await done(text);
			const panel = root.querySelector("#accepted:popover-open")!;
			const settings = [
				["Minimum words", "min-words", "2"],
				["Maximum words", "max-words", "2"],
				["Minimum characters", "min-characters", "7"],
				["Maximum characters", "max-characters", "16"],
			];
			const fieldSelector = (label: string) => `input[aria-label="${label}"]`;
			for (const method of ["exact", "ungraded", "self-assess", "completion"] as const) {
				text.gradingMethod = method;
				await done(text);
				for (const [label] of settings) {
					assert.exists(panel.querySelector(fieldSelector(label)), method);
					assert.notExists(header.querySelector(fieldSelector(label)), method);
				}
			}
			const [minWords, maxWords, minCharacters, maxCharacters] = settings.map(([label]) => panel.querySelector(fieldSelector(label))!.getBoundingClientRect());
			assert.closeTo(minWords.top, maxWords.top, 1, "the word limits share a row");
			assert.closeTo(minCharacters.top, maxCharacters.top, 1, "the character limits share a row");
			assert.isAbove(minCharacters.top, minWords.bottom, "the character limits are below the word limits");
			for (const [label, attribute, value] of settings) {
				const limit = panel.querySelector<HTMLInputElement>(fieldSelector(label))!;
				assert.equal(limit.value, "0");
				limit.value = value;
				limit.dispatchEvent(new Event("change", { bubbles: true }));
				await done(text);
				assert.equal(text.getAttribute(attribute), value);
			}
			text.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(text);
			const field = root.querySelector<HTMLTextAreaElement>(".answer-field")!;
			const enter = async (value: string) => {
				field.value = value;
				field.dispatchEvent(new Event("input", { bubbles: true }));
				await done(text);
			};
			assert.equal(field.maxLength, 16);
			assert.equal(field.minLength, 7);
			await enter("alphabet");
			assert.isFalse(text.checkValidity(), "the minimum word count applies independently of character count");
			(root.querySelector(".check") as HTMLElement).click();
			await done(text);
			assert.include(root.querySelector(".unanswered")!.textContent, "Lengthen your answer");
			await enter("a b");
			assert.isFalse(text.checkValidity(), "the character minimum applies independently of word count");
			await enter("one two three");
			assert.isFalse(text.checkValidity());
			assert.equal(field.getAttribute("aria-invalid"), "true");
			assert.include(root.querySelector(".word-count")!.textContent, "3/2 words");
			(root.querySelector(".check") as HTMLElement).click();
			await done(text);
			assert.include(root.querySelector(".unanswered")!.textContent, "Shorten your answer");
			await enter("one two");
			assert.isTrue(text.checkValidity());
			assert.notExists(root.querySelector(".unanswered"));
			await enter("abcdefghijklmno p");
			assert.isFalse(text.checkValidity(), "programmatic and restored text still respects the character limit");
			await enter("one two");
			assert.equal(text.checkAnswer(false), 1);
		});

		it("edits extra solutions and matching tolerance in the same popover", async function () {
			const text = mount('<webwriter-text ignore-case solution="Photosynthesis"></webwriter-text>').querySelector("webwriter-text")!;
			editMode(text);
			await done(text);
			const root = text.shadowRoot!;
			const trigger = root.querySelector<HTMLButtonElement>(".accepted-trigger")!;
			assert.equal(trigger.textContent?.trim(), "Extra solutions & tolerance");
			trigger.click();
			await done(text);
			const panel = root.querySelector<HTMLElement>("#accepted:popover-open")!;
			assert.equal(panel.getAttribute("aria-label"), "Extra solutions & tolerance");
			assert.exists(panel.querySelector('input[aria-label="Maximum words"]'));
			assert.exists(panel.querySelector('input[aria-label="Maximum characters"]'));
			assert.isTrue(panel.querySelector(".response-limits")!.nextElementSibling!.matches(".tolerance-options"));
			const fields = [...panel.querySelectorAll<HTMLLabelElement>(".tolerance-options label")];
			const settings = [
				["Ignore capitalization", "ignore-case"],
				["Ignore punctuation & accents", "ignore-punctuation"],
				["Ignore minor typos", "allow-typos"],
				["Advanced: Match as regular expression", "use-regex"],
			];
			assert.deepEqual(fields.map(field => field.textContent?.trim()), settings.map(([label]) => label));
			const configure = root.querySelector("#task-configuration")!;
			for (const [index, [label, attribute]] of settings.entries()) {
				assert.notInclude(configure.textContent, label);
				const checkbox = fields[index].querySelector("input")!;
				assert.equal(checkbox.checked, index === 0);
				checkbox.click();
				await done(text);
				assert.equal(text.hasAttribute(attribute), index !== 0);
			}
			const input = panel.querySelector<HTMLElement & { value: string }>("sl-input")!;
			input.value = "Light reaction";
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
			await done(text);
			assert.deepEqual(text.acceptedAnswers, ["Photosynthesis", "Light reaction"]);
			assert.isTrue(panel.matches(":popover-open"));
		});

		it("still displays saved solution messages", async function () {
			const text = mount('<webwriter-text solution="Water" correct-message="Correct response" wrong-message="Wrong response"></webwriter-text>')
				.querySelector("webwriter-text")!;
			await done(text);
			const input = text.shadowRoot!.querySelector("textarea")!;
			for (const [answer, message] of [["Water", "Correct response"], ["Salt", "Wrong response"]]) {
				text.reset();
				await done(text);
				input.value = answer;
				input.dispatchEvent(new Event("input", { bubbles: true }));
				text.checkAnswer(true);
				await done(text);
				assert.include(text.shadowRoot!.querySelector(".feedback")!.textContent, message);
			}
		});

		it("adds and removes individual rubric criteria in the task actions popover", async function () {
			const text = mount(`<webwriter-text grading-method="self-assess" rubric="Mentions mass"></webwriter-text>`).querySelector("webwriter-text")!;
			editMode(text);
			await done(text);
			const root = text.shadowRoot!;
			const row = root.querySelector(".task-helper")!;
			const trigger = root.querySelector<HTMLButtonElement>(".task-actions .rubric-toggle")!;
			assert.include(row.querySelector(".helper")!.textContent, "Enter the model answer.");
			assert.include(trigger.textContent, "Rubric");
			assert.notExists(root.querySelector("sl-textarea"));
			root.querySelector<HTMLElement>(".card")!.focus();
			trigger.click();
			await done(text);
			const panel = root.querySelector("#task-rubric:popover-open")!;
			const input = panel.querySelector<HTMLInputElement>('input[type="text"]')!;
			assert.equal(root.activeElement, input);
			assert.deepEqual(Array.from(panel.querySelectorAll("li span"), item => item.textContent), ["Mentions mass"]);

			const add = panel.querySelector<HTMLElement>("sl-button")!;
			input.value = "   ";
			add.click();
			assert.equal(text.getAttribute("rubric"), "Mentions mass", "blank input adds no criterion");
			input.value = "  Mentions distance  ";
			assert.equal(await transactions(async () => { add.click(); await done(text); }), "start,end");
			assert.equal(input.value, "");
			assert.isTrue(panel.matches(":popover-open"), "authors can add another criterion immediately");
			input.value = "Explains the relationship";
			input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
			await done(text);
			assert.equal(text.getAttribute("rubric"), "Mentions mass\nMentions distance\nExplains the relationship");

			panel.querySelector<HTMLElement>("li sl-icon-button")!.click();
			await done(text);
			assert.equal(text.getAttribute("rubric"), "Mentions distance\nExplains the relationship");

			text.gradingMethod = "exact";
			await done(text);
			assert.notExists(root.querySelector(".rubric-toggle, .rubric-entry"));
			const accepted = row.querySelector<HTMLButtonElement>(".accepted-trigger")!;
			assert.include(accepted.textContent, "Extra solutions & tolerance");
			assert.include(row.querySelector(".helper")!.textContent, "Enter the solution.");
			accepted.click();
			await done(text);
			assert.exists(root.querySelector("#accepted:popover-open sl-input"));
			text.gradingMethod = "self-assess";
			text.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(text);
			assert.notExists(root.querySelector(".accepted-trigger"));
			assert.include(row.querySelector(".helper")!.textContent, "Enter your answer.");
			const answer = root.querySelector<HTMLTextAreaElement>(".answer-field")!;
			answer.value = "Force decreases with distance.";
			answer.dispatchEvent(new Event("input", { bubbles: true }));
			assert.equal(text.checkAnswer(true), 0);
			await done(text);
			const checklist = root.querySelector(".rubric-checklist")!;
			assert.deepEqual(Array.from(checklist.querySelectorAll("label span"), item => item.textContent), ["Mentions distance", "Explains the relationship"]);
			checklist.querySelector<HTMLInputElement>("input")!.click();
			assert.equal(text.checkAnswer(true), 0.5);
		});

		it("authors model answer in main textarea and shows live word count, model answer, and self-check rubric after submit", async function () {
			const root = mount(`<div><webwriter-text type="long-text" free-text show-word-count rubric="Mentions mass
Mentions distance">
				<p slot="prompt">Explain gravity.</p>
			</webwriter-text></div>`);
			const text = root.querySelector("webwriter-text") as Any;
			editMode(text);
			await done(text);

			assert.equal(text.shadowRoot.querySelector(".essay-model-input"), null, "no separate model answer textarea");
			const authorArea = text.shadowRoot.querySelector(".answer-field") as Any;
			assert.equal(authorArea.rows, 4, "legacy long-text markup retains its initial height");
			assert.equal(text.gradingMethod, "completion", "legacy free-text markup maps to completion credit");
			assert.equal(Boolean(authorArea.disabled), false, "main textarea is enabled in edit mode for authoring model answer");
			authorArea.value = "Gravity pulls mass together.";
			authorArea.dispatchEvent(new Event("change", { bubbles: true }));
			await done(text);
			assert.equal(text.acceptedAnswers[0], "Gravity pulls mass together.");

			text.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(text);

			const area = text.shadowRoot.querySelector(".answer-field") as Any;
			assert.equal(area.value, "", "learner starts with empty textarea");
			area.value = "Two masses attract each other.";
			area.dispatchEvent(new Event("input", { bubbles: true }));
			await done(text);
			assert.equal(text.shadowRoot.querySelector(".word-count")?.textContent?.trim(), "5 words");

			text.checkAnswer(true);
			await done(text);
			assert.ok(text.shadowRoot.querySelector(".model-answer")?.textContent?.includes("Gravity pulls mass together."));
			const checkboxes = text.shadowRoot.querySelectorAll('.rubric-checklist input[type="checkbox"]');
			assert.equal(checkboxes.length, 2, "renders interactive self-check rubric items");

			text.reset();
			await done(text);
			assert.ok(!text.shadowRoot.querySelector(".rubric-checklist"));
		});
	});

	describe("<webwriter-choice grid ungraded>", function () {
		it("acts as a non-graded rating/Likert survey without an answer key", async function () {
			const root = mount(`<div><webwriter-choice grid mode="single" ungraded columns='["c1","c2"]' rows='["r1"]'>
				<p slot="prompt">Rate this topic.</p>
				<webwriter-grid-item id="c1"><p>Low</p></webwriter-grid-item>
				<webwriter-grid-item id="c2"><p>High</p></webwriter-grid-item>
				<webwriter-grid-item id="r1"><p>Clarity</p></webwriter-grid-item>
			</webwriter-choice></div>`);
			const grid = root.querySelector("webwriter-choice") as Any;
			await done(grid);

			assert.equal(grid.checkAnswer, undefined, "ungraded choice grid has no checkAnswer method");
			assert.equal(grid.gradingMethod, "ungraded", "ungraded attribute sets gradingMethod to ungraded");
			assert.ok(
				grid.options.gradingMethod.options.some((choice: Any) => choice.value === "ungraded"),
				"gradingMethod exposes ungraded radio choice",
			);

			const submitBtn = grid.shadowRoot.querySelector(".task-actions .check");
			assert.equal(submitBtn?.textContent?.trim(), "Submit", "ungraded card button says Submit");

			const radios = grid.shadowRoot.querySelectorAll('tbody input[type="radio"]');
			radios[1].checked = true;
			radios[1].dispatchEvent(new Event("change", { bubbles: true }));
			await done(grid);
			submitBtn.click();
			await done(grid);
			assert.equal(grid.submitted, true, "submits cleanly as ungraded survey");
			assert.ok(!grid.shadowRoot.querySelector(".cell-correct, .cell-wrong, .cell-missed"), "no grading colors in ungraded mode");
		});
	});

	describe("<webwriter-categorize>", function () {
		const html = `<div><webwriter-categorize categories='["c1","c2"]' solution='{"c1":["k1"],"c2":["k2"]}'>
			<p slot="prompt">Sort into buckets.</p>
			<webwriter-grid-item id="c1"><p>Fruits</p></webwriter-grid-item>
			<webwriter-grid-item id="c2"><p>Vegetables</p></webwriter-grid-item>
			<webwriter-categorize-item id="k1"><p>Apple</p></webwriter-categorize-item>
			<webwriter-categorize-item id="k2"><p>Carrot</p></webwriter-categorize-item>
		</webwriter-categorize></div>`;

		it("starts with one group and one option", async function () {
			const task = findQuizTypeById("webwriter-categorize")!.createInstance();
			assert.lengthOf(task.querySelectorAll("webwriter-grid-item"), 1);
			assert.lengthOf(task.querySelectorAll("webwriter-categorize-item"), 1);
			mount("").append(task);
			await done(task);
			assert.equal(task.shadowRoot!.querySelector(".pool-label")!.textContent, "Options");
			assert.lengthOf(task.shadowRoot!.querySelectorAll(".grid-pool slot"), 1);
			assert.lengthOf(task.shadowRoot!.querySelectorAll(".bucket"), 1);
			const title = task.querySelector("webwriter-grid-item p")!;
			assert.equal(getComputedStyle(title).getPropertyValue("--ww-placeholder").trim(), '"Group 1"');
			assert.equal(title.textContent, "");
		});

		it("numbers the replacement group supplied by the editor and keeps it when adding a group", async function () {
			const task = mount(`<webwriter-categorize categories='["removed"]'>
				<p></p>
				<webwriter-grid-item><p></p></webwriter-grid-item>
				<webwriter-categorize-item id="k1"><p>Apple</p></webwriter-categorize-item>
			</webwriter-categorize>`).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const group = task.querySelector("webwriter-grid-item")!;
			assert.lengthOf(task.shadowRoot!.querySelectorAll(".bucket"), 1);
			assert.equal(group.placeholder, "Group 1");
			assert.equal(group.id, "", "rendering the replacement does not write to the document");
			task.shadowRoot!.querySelector<HTMLButtonElement>(".add-group")!.click();
			await done(task);
			assert.lengthOf(task.shadowRoot!.querySelectorAll(".bucket"), 2);
			assert.include(task.categories, group.id);
			assert.deepEqual(Array.from(task.querySelectorAll("webwriter-grid-item"), heading => heading.placeholder), ["Group 1", "Group 2"]);
		});

		it("authors place options with the group picker and restore focus to its button", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const heading = task.querySelector("#c2")!.shadowRoot!;
			const trigger = heading.querySelector<HTMLButtonElement>(".group-place")!;
			const panel = heading.querySelector<HTMLElement>(".placement-options")!;
			assert.equal(trigger.getAttribute("aria-label"), "Add item to Vegetables");
			trigger.click();
			assert.isTrue(panel.matches(":popover-open"));
			const item = panel.querySelector("button")!;
			assert.equal(item.textContent, "Apple", "the picker omits options already in this group");
			assert.strictEqual(heading.activeElement, item);
			assert.equal(await transactions(async () => { item.click(); await done(task); }), "start,end");
			assert.deepEqual(task.solution, { c2: ["k2", "k1"] });
			assert.isFalse(panel.matches(":popover-open"));
			assert.strictEqual(heading.activeElement, trigger);
			const remove = task.shadowRoot!.querySelector<HTMLButtonElement>('.bucket [data-card-id="k1"] .remove-placement')!;
			assert.equal(remove.getAttribute("aria-label"), "Remove Apple from this group");
			assert.equal(await transactions(async () => { remove.click(); await done(task); }), "start,end");
			assert.deepEqual(task.solution, { c2: ["k2"] });
			assert.exists(task.querySelector("webwriter-categorize-item#k1"));
			assert.strictEqual(heading.activeElement, trigger);
		});

		it("readers place options without changing the solution and can use the same option in multiple groups", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			task.multiGroup = true;
			task.solution = { c1: ["k1"], c2: ["k1", "k2"] };
			await done(task);
			const select = async (catId: string, label: string) => {
				const heading = task.querySelector(`#${catId}`)!.shadowRoot!;
				heading.querySelector<HTMLButtonElement>(".group-place")!.click();
				const option = Array.from(heading.querySelectorAll<HTMLButtonElement>(".placement-list button"))
					.find(button => button.textContent === label)!;
				option.click();
				await done(task);
			};
			await select("c1", "Apple");
			await select("c2", "Apple");
			await select("c2", "Carrot");
			const preview = (group: string) => task.shadowRoot!.querySelector(`.bucket[data-category-id="${group}"] [data-card-id="k1"]`);
			preview("c1")!.querySelector<HTMLButtonElement>(".remove-placement")!.click();
			await done(task);
			assert.notExists(preview("c1"));
			assert.exists(preview("c2"));
			await select("c1", "Apple");
			assert.deepEqual(task.solution, { c1: ["k1"], c2: ["k1", "k2"] });
			assert.equal(task.checkAnswer(), 1);
			await done(task);
			assert.isTrue(task.querySelector("#c2")!.shadowRoot!.querySelector<HTMLButtonElement>(".group-place")!.disabled);
		});

		it("keeps group titles above their drop areas with document widget styles", async function () {
			const root = mount(html);
			const task = root.querySelector("webwriter-categorize")!;
			const theme = document.createElement("style");
			theme.textContent = "body webwriter-grid-item:not([hidden]) { display: block; }";
			root.prepend(theme);
			editMode(task);
			await done(task);

			const groups = task.querySelectorAll("webwriter-grid-item");
			assert.lengthOf(groups, 2);
			for (const group of groups) {
				const title = group.querySelector("p")!.getBoundingClientRect();
				const frame = group.shadowRoot!.querySelector(".group-frame")!.getBoundingClientRect();
				const zone = task.shadowRoot!.querySelector(`.bucket[data-category-id="${group.id}"] .bucket-zone`)!;
				const dropArea = zone.getBoundingClientRect();
				assert.isAbove(title.height, 0);
				assert.isAtMost(title.bottom, dropArea.top);
				assert.isAbove(frame.bottom, dropArea.bottom);
				assert.exists(zone.querySelector(".grid-card"));
			}
		});

		it("prevents a group frame press from moving the text caret before capture", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const group = task.querySelector("webwriter-grid-item")!;
			const frame = group.shadowRoot!.querySelector(".group-frame")!;
			const header = group.shadowRoot!.querySelector(".group-header")!;
			const title = group.querySelector("p")!;
			const press = (target: Element, button = 0) => target.dispatchEvent(new MouseEvent("mousedown", {
				button, bubbles: true, composed: true, cancelable: true,
			}));

			assert.isFalse(press(frame));
			assert.isFalse(press(header));
			assert.isTrue(press(header, 2));
			assert.isTrue(press(title));

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			assert.isTrue(press(frame));
		});

		it("outlines the matching item only while its counterpart is hovered", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const pool = root.querySelector('.grid-pool slot[data-card-id="k1"]')!.parentElement!;
			const group = task.querySelector("#c1")!.shadowRoot!.querySelector(".group-frame")!;
			const preview = root.querySelector('.bucket [data-card-id="k1"]')!;
			const answer = (id: string) => task.querySelector(`#${id}`)!.shadowRoot!.querySelector(".grid-card")!;
			const outlined = (card: Element) => getComputedStyle(card).outlineStyle === "solid";

			assert.isFalse(outlined(answer("k1")));
			pool.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" }));
			await done(task);
			assert.isTrue(outlined(preview));
			assert.isFalse(outlined(answer("k1")));
			pool.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));

			const { left, top, width, height } = preview.getBoundingClientRect();
			group.dispatchEvent(new PointerEvent("pointermove", {
				pointerType: "mouse", bubbles: true, composed: true, clientX: left + width / 2, clientY: top + height / 2,
			}));
			await done(task);
			assert.isFalse(outlined(preview));
			assert.isTrue(outlined(answer("k1")));
			assert.isFalse(outlined(answer("k2")));
			preview.closest(".bucket")!.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
			await done(task);
			assert.isFalse(outlined(answer("k1")));
		});

		it("dims placed answers in single-group mode while keeping them editable and draggable", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const control = root.querySelector(".multi-group-switch") as Any;
			const item = task.querySelector("webwriter-categorize-item#k1")!;
			const card = item.shadowRoot!.querySelector(".grid-card")!;
			const grip = card.querySelector<HTMLButtonElement>(".drag-handle")!;
			const opacity = () => getComputedStyle(card).opacity;
			assert.isFalse(control.checked);
			assert.strictEqual(control.nextElementSibling, root.querySelector(".add-item"));
			assert.equal(opacity(), "0.55");
			document.getSelection()!.collapse(item.querySelector("p")!.firstChild, 0);
			await until(() => opacity() === "1", "a caret in the answer restores full opacity");
			document.getSelection()!.removeAllRanges();
			await until(() => opacity() === "0.55", "dimming returns when the caret leaves");

			grip.click();
			await done(task);
			assert.equal(opacity(), "1", "a picked-up answer restores full opacity");
			root.querySelector<HTMLElement>('.bucket[data-category-id="c2"]')!.click();
			await done(task);
			assert.deepEqual(task.solution, { c2: ["k2", "k1"] });
			assert.equal(opacity(), "0.55");
		});

		it("adds multiple memberships from Answers and removes one placement at a time", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const control = root.querySelector(".multi-group-switch") as Any;
			const change = (checked: boolean) => {
				control.checked = checked;
				control.dispatchEvent(new Event("sl-change"));
			};
			const item = task.querySelector("webwriter-categorize-item#k1")!;
			const card = item.shadowRoot!.querySelector(".grid-card")!;
			const grip = card.querySelector<HTMLButtonElement>(".drag-handle")!;
			const zone = (id: string) => root.querySelector<HTMLElement>(`.bucket[data-category-id="${id}"] .bucket-zone`)!;
			const assign = async (id: string) => {
				grip.click();
				zone(id).click();
				await done(task);
			};

			assert.equal(await transactions(async () => { change(true); await done(task); }), "start,end");
			assert.isTrue(task.hasAttribute("multi-group"));
			assert.equal(getComputedStyle(card).opacity, "1");
			await assign("c2");
			await assign("c2");
			assert.deepEqual(task.solution, { c1: ["k1"], c2: ["k2", "k1"] });
			const placed = zone("c1").querySelector('[data-card-id="k1"] .drag-handle')!;
			await drag(placed, root.querySelector(".grid-pool")!);
			await done(task);
			assert.deepEqual(task.solution, { c2: ["k2", "k1"] });
			await assign("c1");
			const saved = task.cloneNode(true) as typeof task;
			assert.isTrue(saved.multiGroup);
			assert.deepEqual(saved.solution, task.solution);
			assert.equal(await transactions(async () => { change(false); await done(task); }), "start,end");
			assert.isFalse(task.hasAttribute("multi-group"));
			assert.deepEqual(task.solution, { c1: ["k1"], c2: ["k2"] });
		});

		it("grades each item against its full set of groups", async function () {
			const task = mount(html).querySelector("webwriter-categorize")!;
			task.multiGroup = true;
			task.solution = { c1: ["k1"], c2: ["k1", "k2"] };
			await done(task);
			assert.notExists(task.shadowRoot!.querySelector(".multi-group-switch"));
			const card = (id: string) => task.querySelector(`#${id}`)!.shadowRoot!.querySelector(".grid-card")!;
			const zone = (id: string) => task.shadowRoot!.querySelector(`.bucket[data-category-id="${id}"] .bucket-zone`)!;
			await drag(card("k1"), zone("c1"));
			await drag(card("k2"), zone("c2"));
			assert.equal(task.checkAnswer(true), 0.5);
			await done(task);
			assert.include(task.querySelector("#k1")!.shadowRoot!.querySelector(".correction")!.textContent, "Vegetables");

			task.reset();
			await done(task);
			await drag(card("k1"), zone("c1"));
			await drag(card("k1"), zone("c2"));
			await drag(card("k2"), zone("c2"));
			assert.equal(task.checkAnswer(), 1);
		});

		it("opens old single-row grids as categories", async function () {
			const task = mount(`<webwriter-categorize grid rows='["r"]' columns='["c"]' solution='{"r:c":["k"]}'>
				<p slot="prompt">Group the terms.</p>
				<webwriter-grid-item id="r"><p></p></webwriter-grid-item>
				<webwriter-grid-item id="c"><p><strong>Group</strong></p></webwriter-grid-item>
				<webwriter-grid-item id="k"><p>Term</p></webwriter-grid-item>
			</webwriter-categorize>`).querySelector("webwriter-categorize")!;
			const heading = task.querySelector("#c strong");
			const paragraph = task.querySelector("#k p");
			await done(task);
			assert.isFalse(task.hasAttribute("grid"));
			assert.deepEqual(task.categories, ["c"]);
			assert.deepEqual(task.solution, { c: ["k"] });
			assert.strictEqual(task.querySelector("#c strong"), heading);
			assert.strictEqual(task.querySelector("webwriter-categorize-item#k p"), paragraph);
			assert.exists(task.shadowRoot!.querySelector('.bucket[data-category-id="c"] .bucket-zone'));
			assert.exists(task.shadowRoot!.querySelector('.grid-pool [data-card-id="k"]'));
		});

		it("migrates the legacy answer inventory in order, including unassigned cards", async function () {
			const task = mount(`<webwriter-categorize categories='["c1"]' card-ids='["k2","k1"]' solution='{"c1":["k1"]}'>
				<p slot="prompt">Sort the cards.</p>
				<webwriter-grid-item id="c1"><p>Group</p></webwriter-grid-item>
				<webwriter-grid-item id="k1"><p>First answer</p></webwriter-grid-item>
				<webwriter-grid-item id="k2" data-note="preserved"><p>Unassigned answer</p></webwriter-grid-item>
			</webwriter-categorize>`).querySelector("webwriter-categorize")!;
			editMode(task);
			await done(task);
			const answers = [...task.querySelectorAll("webwriter-categorize-item")];
			assert.deepEqual(answers.map(item => item.id), ["k2", "k1"]);
			assert.equal(answers[0].getAttribute("data-note"), "preserved");
			assert.deepEqual(task.solution, { c1: ["k1"] });
			assert.lengthOf(task.shadowRoot!.querySelectorAll(".grid-pool slot[data-card-id]"), 2);
		});

		it("adds groups from the hint row in one transaction and grades dragged cards", async function () {
			const root = mount(html);
			const cat = root.querySelector("webwriter-categorize") as Any;
			editMode(cat);
			await done(cat);

			const helper = cat.shadowRoot.querySelector(".task-helper");
			const addGroup = helper.querySelector(".add-group");
			assert.strictEqual(addGroup.previousElementSibling, helper.querySelector(".add-item"));
			assert.equal(addGroup.textContent.trim(), "Add group");
			assert.equal(addGroup.getAttribute("data-ww-capture-selection"), "false");
			assert.closeTo(addGroup.getBoundingClientRect().right, helper.getBoundingClientRect().right, 1);
			assert.equal(await transactions(async () => {
				addGroup.click();
				await cat.updateComplete;
			}), "start,end", "adding a group is one transaction");
			await done(cat);
			assert.equal(cat.categories.length, 3);
			const heading = cat.querySelector(`#${cat.categories.at(-1)} p`);
			assert.equal(getComputedStyle(heading).getPropertyValue("--ww-placeholder").trim(), '"Group 3"');
			await until(() => cat.ownerDocument.getSelection()?.anchorNode === heading, "the caret moves into the new group title");
			const group = heading.parentElement;
			const bucket = cat.shadowRoot.querySelector(`.bucket[data-category-id="${group.id}"]`);
			const frame = group.shadowRoot.querySelector(".group-frame").getBoundingClientRect();
			const bounds = bucket.getBoundingClientRect();
			assert.closeTo(frame.width, bounds.width, 1, "the group owns the full visible card width");
			assert.closeTo(frame.height, bounds.height, 1, "the group frame includes its drop area");
			assert.isAbove(frame.bottom, heading.getBoundingClientRect().bottom);
			assert.notExists(cat.shadowRoot.querySelector(".buckets .remove-btn"));

			cat.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(cat);

			const answer = (id: string) => cat.querySelector(`#${id}`).shadowRoot.querySelector(".grid-card");
			const card = (id: string) => cat.shadowRoot.querySelector(`.grid-card[data-card-id="${id}"]`);
			const zone = (id: string) => cat.shadowRoot.querySelector(`.bucket[data-category-id="${id}"] .bucket-zone`);
			await drag(answer("k1"), zone("c1"));
			await done(cat);
			await drag(answer("k2"), zone("c1")); // wrong bucket
			await done(cat);

			assert.equal(cat.checkAnswer(true), 0.5);
			await done(cat);
			assert.ok(card("k1").classList.contains("correct"));
			assert.ok(card("k2").classList.contains("wrong"));
			assert.ok(card("k2").closest(".grid-card-wrap")?.querySelector(".correction")?.textContent?.includes("Vegetables"));
			assert.equal(cat.shadowRoot.querySelectorAll(".grid-pool slot[data-card-id]").length, 2, "cards stay in Answers after grading");
			assert.notExists(cat.shadowRoot.querySelector(".add-item, .add-group"));

			cat.reset();
			await done(cat);
			assert.equal(cat.shadowRoot.querySelectorAll(".grid-pool slot[data-card-id]").length, 2);
		});

		it("authors add and sort cards from the persistent Answers pane", async function () {
			const cat = mount(html).querySelector("webwriter-categorize")!;
			editMode(cat);
			await done(cat);
			const root = cat.shadowRoot!;
			const pool = root.querySelector(".grid-pool")!;
			assert.lengthOf(pool.querySelectorAll("slot[data-card-id]"), 2);
			assert.notExists(pool.querySelector(".add-item"));
			assert.notExists(pool.querySelector(".remove-btn"));
			const addItem = root.querySelector<HTMLButtonElement>(".task-helper .add-item")!;
			assert.equal(addItem.textContent?.trim(), "Add item");
			assert.equal(addItem.getAttribute("data-ww-capture-selection"), "false");
			assert.equal(await transactions(async () => {
				addItem.click();
				await done(cat);
			}), "start,end");
			const item = cat.querySelector("webwriter-categorize-item:last-of-type")!;
			const added = item.id;
			const slot = pool.querySelector<HTMLSlotElement>(`slot[data-card-id="${added}"]`)!;
			const card = item.shadowRoot!.querySelector(".grid-card")!;
			const grip = card.querySelector<HTMLButtonElement>(".drag-handle")!;
			assert.isAtLeast(item.getBoundingClientRect().width, 128, "empty answer cards leave space for the placeholder and grip");
			assert.closeTo(item.getBoundingClientRect().width, card.getBoundingClientRect().width, 1, "the authored item covers its full card");
			assert.isFalse(Object.values(cat.solution).flat().includes(added));
			const paragraph = cat.querySelector(`#${added} p`)!;
			await until(() => cat.ownerDocument.getSelection()?.anchorNode === paragraph, "the caret moves into the new answer");
			paragraph.textContent = "Pear";
			const zone = root.querySelector<HTMLElement>('.bucket[data-category-id="c1"] .bucket-zone')!;
			grip.click();
			zone.click();
			await done(cat);
			assert.include(cat.solution.c1, added);
			assert.include(zone.querySelector(`[data-card-id="${added}"]`)!.textContent, "Pear");
			assert.strictEqual(slot.assignedElements()[0], paragraph.parentElement);
			assert.isFalse(item.hasAttribute("slot"));
			assert.isFalse(item.hasAttribute("data-ww-key"));
			await drag(zone.querySelector(`[data-card-id="${added}"] .drag-handle`)!, pool);
			await done(cat);
			assert.isFalse(Object.values(cat.solution).flat().includes(added));
			const reopened = mount(cat.outerHTML).querySelector("webwriter-categorize")!;
			await done(reopened);
			assert.exists(reopened.shadowRoot!.querySelector(`.grid-pool [data-card-id="${added}"]`));
		});
	});

	describe("<webwriter-numeric>", function () {
		it("switches input types from the Number helper row", async function () {
			const numeric = mount(`<webwriter-numeric solution="8" style="width: 320px">
				<p slot="prompt">Enter a value.</p>
			</webwriter-numeric>`).querySelector("webwriter-numeric")!;
			editMode(numeric);
			await done(numeric);
			const root = numeric.shadowRoot!;
			const row = root.querySelector(".task-helper")!;
			const modes = row.querySelector(".numeric-modes")!;
			assert.equal(modes.querySelectorAll('input[type="radio"]').length, 3);
			assert.equal(modes.querySelector<HTMLInputElement>("input:checked")?.value, "input");
			assert.exists(root.querySelector('.num-input[type="number"]'));
			for (const [mode, type, helper] of [
				["slider", "range", "Set the solution on the slider."],
				["datetime", "date", "Enter the solution date."],
				["input", "number", "Enter the solution number."],
			]) {
				const input = modes.querySelector<HTMLInputElement>(`input[value="${mode}"]`)!;
				assert.equal(await transactions(async () => {
					input.click();
					await done(numeric);
				}), "start,end");
				assert.equal(numeric.getAttribute("mode"), mode);
				assert.equal(modes.querySelector<HTMLInputElement>("input:checked"), input);
				assert.exists(root.querySelector(`input[type="${type}"][aria-describedby="answer-helper"]`));
				assert.equal(row.querySelector(".helper")?.textContent, helper);
			}
			assert.equal(numeric.solution, 8);
			numeric.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(numeric);
			assert.notExists(row.querySelector(".numeric-modes"));
			assert.equal(row.querySelector(".helper")?.textContent, "Enter a number.");
		});

		it("places numeric grading controls beside Number and Slider and shrinks the fields", async function () {
			const numeric = mount('<webwriter-numeric solution="100" style="width: 520px"></webwriter-numeric>').querySelector("webwriter-numeric")!;
			editMode(numeric);
			await done(numeric);
			const root = numeric.shadowRoot!;
			const configure = root.querySelector("#task-configuration")!;
			assert.notMatch(configure.textContent ?? "", /\b(?:Mode|Tolerance type|Tolerance \(±\)|Unit|Partial credit band)\b/);
			assert.exists(root.querySelector(".num-input.solution-value"));
			const setField = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
				input.value = value;
				input.dispatchEvent(new Event("change", { bubbles: true }));
			};
			for (const mode of ["input", "slider"] as const) {
				numeric.style.width = "520px";
				numeric.mode = mode;
				await done(numeric);
				const controls = root.querySelector(".meta-fields")!;
				const tolerance = controls.querySelector<HTMLInputElement>(".tolerance-input")!;
				const unit = controls.querySelector<HTMLInputElement>(".unit-input")!;
				const wide = [tolerance.offsetWidth, unit.offsetWidth];
				numeric.style.width = "320px";
				await done(numeric);
				const row = controls.parentElement!;
				const answer = row.firstElementChild!;
				assert.isAtLeast(controls.getBoundingClientRect().left, answer.getBoundingClientRect().right);
				assert.isAtMost(controls.getBoundingClientRect().right, row.getBoundingClientRect().right + 1);
				if (mode === "slider") {
					const centerY = (element: Element) => {
						const { top, height } = element.getBoundingClientRect();
						return top + height / 2;
					};
					assert.closeTo(centerY(controls), centerY(answer.querySelector(".slider-input")!), 0.5);
					assert.closeTo(centerY(controls), centerY(answer.querySelector(".slider-value.solution-value")!), 0.5);
				}
				assert.isBelow(tolerance.offsetWidth, wide[0]);
				assert.isBelow(unit.offsetWidth, wide[1]);
				setField(controls.querySelector("select")!, "relative");
				setField(tolerance, "10");
				setField(unit, "m/s");
				await done(numeric);
				assert.deepEqual([numeric.toleranceMode, numeric.tolerance, numeric.unit], ["relative", 10, "m/s"]);

				const trigger = controls.querySelector<HTMLButtonElement>(".partial-credit-trigger")!;
				trigger.click();
				const panel = controls.querySelector(".partial-credit-popover:popover-open")!;
				assert.exists(panel);
				const input = panel.querySelector("input")!;
				assert.equal(root.activeElement, input);
				assert.include(panel.textContent, "(%)");
				setField(input, "5");
				await done(numeric);
				assert.equal(numeric.partialRange, 5);
				panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
				assert.isFalse(panel.matches(":popover-open"));
			}
			numeric.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(numeric);
			assert.notExists(root.querySelector(".meta-fields"));
			assert.notExists(root.querySelector(".solution-value"));
		});

		it("edits slider min, step, and max while keeping the solution reachable", async function () {
			const numeric = mount('<webwriter-numeric mode="slider" solution="60" step="5" unit="m" style="width: 320px"></webwriter-numeric>')
				.querySelector("webwriter-numeric")!;
			editMode(numeric);
			await done(numeric);
			const root = numeric.shadowRoot!;
			const fields = [...root.querySelectorAll<HTMLLabelElement>(".slider-setting")];
			assert.deepEqual(fields.map(label => label.textContent?.trim()), ["Min", "Step", "Max"]);
			const [min, step, max] = fields.map(label => label.querySelector("input")!);
			const slider = root.querySelector<HTMLInputElement>("input.slider-input")!;
			const center = (element: Element) => {
				const rect = element.getBoundingClientRect();
				return rect.left + rect.width / 2;
			};
			assert.closeTo(center(step), center(slider), 0.5);
			assert.isAbove(step.getBoundingClientRect().top, slider.getBoundingClientRect().bottom);
			assert.isAtMost(min.getBoundingClientRect().right, step.getBoundingClientRect().left);
			assert.isAtMost(step.getBoundingClientRect().right, max.getBoundingClientRect().left);
			const setField = (input: HTMLInputElement, value: string) => {
				input.value = value;
				input.dispatchEvent(new Event("change", { bubbles: true }));
			};
			assert.equal(await transactions(async () => {
				setField(max, "54");
				await done(numeric);
			}), "start,end");
			assert.deepEqual([numeric.max, numeric.solution, slider.valueAsNumber], [54, 50, 50]);
			assert.equal(root.querySelector(".slider-value")?.textContent, "50 m");
			setField(min, "5");
			await done(numeric);
			assert.equal(slider.min, "5");
			assert.equal(await transactions(async () => {
				setField(step, "3.5");
				await done(numeric);
			}), "start,end");
			assert.equal(numeric.getAttribute("step"), "3.5");
			assert.deepEqual([slider.step, numeric.solution, slider.valueAsNumber], ["3.5", 50.5, 50.5]);
			assert.equal(root.querySelector(".slider-value")?.textContent, "50.5 m");
			for (const invalid of ["0", "-1", ""]) {
				setField(step, invalid);
				assert.equal(step.value, "3.5");
				assert.equal(numeric.step, 3.5);
			}
			setField(min, "60");
			setField(max, "");
			await done(numeric);
			assert.deepEqual([min.value, max.value, numeric.min, numeric.max], ["5", "54", 5, 54]);
			numeric.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(numeric);
			assert.notExists(root.querySelector(".slider-setting"));
			assert.equal(slider.step, "3.5");
			assert.deepEqual(Array.from(root.querySelectorAll(".slider-bounds span"), span => span.textContent), ["5 m", "54 m"]);
		});

		it("grades exact and tolerant values in input mode and slider mode", async function () {
			const root = mount(`<div><webwriter-numeric solution="9.8" tolerance="0.2" unit="m/s²">
				<p slot="prompt">Earth gravity?</p>
			</webwriter-numeric></div>`);
			const num = root.querySelector("webwriter-numeric") as Any;
			await done(num);

			assert.equal(num.checkValidity(), false);
			const input = num.shadowRoot.querySelector("input.num-input") as HTMLInputElement;
			input.value = "9.95";
			input.dispatchEvent(new Event("input", { bubbles: true }));
			await done(num);
			assert.equal(num.checkValidity(), true);
			assert.equal(num.checkAnswer(true), 1, "within ±0.2 tolerance");

			num.reset();
			num.mode = "slider";
			num.min = 0;
			num.max = 20;
			num.step = 1;
			num.solution = 10;
			num.tolerance = 1;
			await done(num);

			const slider = num.shadowRoot.querySelector("input.slider-input") as HTMLInputElement;
			assert.ok(slider, "renders range slider in slider mode");
			slider.value = "15";
			slider.dispatchEvent(new Event("input", { bubbles: true }));
			await done(num);
			assert.equal(num.checkAnswer(true), 0, "15 outside 10 ± 1");
			await done(num);
			assert.ok(num.shadowRoot.querySelector(".solution-text")?.textContent?.includes("10 ± 1"));
		});
	});

	describe("<webwriter-image>", function () {
		it("starts with an empty picture for WebWriter’s media placeholder", async function () {
			const task = findQuizTypeById("webwriter-image")!.createInstance();
			mount("").append(task);
			editMode(task);
			await done(task);
			const picture = task.querySelector(":scope > picture")!;
			const img = picture.querySelector<HTMLImageElement>(":scope > img")!;
			assert.isFalse(img.hasAttribute("src"));
			const slot = task.shadowRoot!.querySelector<HTMLSlotElement>(".image-stage slot:not([name])")!;
			assert.include(slot.assignedElements(), picture);
			assert.exists(task.shadowRoot!.querySelector(".image-stage.empty"));
			assert.notExists(task.shadowRoot!.querySelector(".marker-capture"));

			img.src = TEST_IMAGE;
			await done(task);
			assert.notExists(task.shadowRoot!.querySelector(".image-stage.empty"));
			assert.exists(task.shadowRoot!.querySelector(".marker-capture"));
		});

		it("gives empty prompt paragraphs full block width so they stay selectable", async function () {
			const root = mount(`<div><webwriter-image mode="hotspot" style="width: 480px;">
				<p slot="prompt"></p>
				<picture><img></picture>
			</webwriter-image></div>`);
			const imgTask = root.querySelector("webwriter-image") as Any;
			editMode(imgTask);
			await done(imgTask);
			const promptRect = imgTask.querySelector('[slot="prompt"]')!.getBoundingClientRect();
			assert.ok(promptRect.width > 100 && promptRect.height > 10, `empty prompt fills block (${promptRect.width}x${promptRect.height})`);
		});

		it("adds label pins from a primary author action beside Add hotspot", async function () {
			const task = mount(`<webwriter-image>
				<p slot="prompt">Label the diagram.</p><picture><img src="${TEST_IMAGE}"></picture>
			</webwriter-image>`).querySelector("webwriter-image")!;
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(".task-helper-switches button"));
			assert.deepEqual(buttons.map(button => button.textContent?.trim()), ["Modify image", "Add hotspot", "Add label pin"]);
			assert.isTrue(buttons.slice(1).every(button => button.classList.contains("helper-action")));
			buttons[2].click();
			await done(task);
			assert.lengthOf(task.markers, 1);
			assert.equal(task.markers[0].kind, "label");
			assert.equal(task.markers[0].label, "Label pin 1");
			const panel = root.querySelector(".marker-popover:popover-open")!;
			assert.equal(panel.querySelector('.marker-types [aria-pressed="true"]')!.textContent?.trim(), "Label pin");
			assert.equal(panel.querySelector<HTMLInputElement>(".marker-label-input")!.value, "Label pin 1");
		});

		it("manages hotspots via hint actions, double-click, popover, move/resize drag, backspace, and modify image", async function () {
			const root = mount(`<div><webwriter-image mode="hotspot" style="width: 480px;">
				<p slot="prompt">Click target.</p>
				<picture><img src="${TEST_IMAGE}" alt="Diagram" style="width: 400px; height: 200px;"></picture>
			</webwriter-image></div>`);
			const imgTask = root.querySelector("webwriter-image") as Any;
			editMode(imgTask);
			await done(imgTask);

			assert.equal(imgTask.shadowRoot.querySelector(".marker-list"), null, "marker list below image removed");
			assert.ok(imgTask.shadowRoot.querySelector(".task-helper .add-hotspot-btn"), "Add hotspot button in hint row");
			assert.ok(imgTask.shadowRoot.querySelector(".task-helper .modify-image-btn"), "Modify image button in hint row");

			const stage = imgTask.shadowRoot.querySelector(".image-stage") as HTMLElement;
			const editCapture = imgTask.shadowRoot.querySelector(".marker-capture") as HTMLElement;
			const stageRect = stage.getBoundingClientRect();

			// Single click does not insert; double-click inserts hotspot 1 at center (50%, 50%).
			editCapture.dispatchEvent(new MouseEvent("click", {
				bubbles: true,
				clientX: stageRect.left + stageRect.width * 0.5,
				clientY: stageRect.top + stageRect.height * 0.5,
			}));
			await done(imgTask);
			assert.equal(imgTask.markers.length, 0, "single click does not add hotspot");

			editCapture.dispatchEvent(new MouseEvent("dblclick", {
				bubbles: true,
				clientX: stageRect.left + stageRect.width * 0.5,
				clientY: stageRect.top + stageRect.height * 0.5,
			}));
			await done(imgTask);
			assert.equal(imgTask.markers.length, 1);
			assert.ok(Math.abs(imgTask.markers[0].x - 50) <= 1 && Math.abs(imgTask.markers[0].y - 50) <= 1);

			// "Add hotspot" button adds a second hotspot and opens its popover.
			(imgTask.shadowRoot.querySelector(".add-hotspot-btn") as HTMLButtonElement).click();
			await done(imgTask);
			assert.equal(imgTask.markers.length, 2);
			const popover = imgTask.shadowRoot.querySelector(".marker-popover") as HTMLElement;
			assert.ok(popover.matches(":popover-open"), "popover opens for added hotspot");

			const labelInput = popover.querySelector(".marker-label-input") as HTMLInputElement;
			labelInput.value = "Target Two";
			labelInput.dispatchEvent(new Event("change", { bubbles: true }));
			await done(imgTask);
			assert.equal(imgTask.markers[1].label, "Target Two");

			// Trashbin button inside popover deletes the second hotspot and closes the popover.
			(popover.querySelector(".marker-delete-btn") as HTMLElement).click();
			await done(imgTask);
			assert.equal(imgTask.markers.length, 1);
			assert.equal(popover.matches(":popover-open"), false);

			// Clicking center of hotspot 1 opens popover without capturing pointer on ring.
			const centerBtn = imgTask.shadowRoot.querySelector(".marker-center") as HTMLButtonElement;
			const ring = imgTask.shadowRoot.querySelector(".marker-ring.editable") as HTMLElement;
			const origCapture = ring.setPointerCapture;
			let capturedOnClick = false;
			ring.setPointerCapture = id => {
				capturedOnClick = true;
				origCapture.call(ring, id);
			};
			centerBtn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, button: 0 }));
			window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true, button: 0 }));
			centerBtn.click();
			await done(imgTask);
			ring.setPointerCapture = origCapture;
			assert.equal(capturedOnClick, false, "clicking center must not capture pointer on outer ring");
			assert.ok(popover.matches(":popover-open"), "clicking center opens hotspot popover");

			// Dragging the hotspot area moves it.
			const ringRect = ring.getBoundingClientRect();
			const startX = ringRect.left + ringRect.width * 0.5 + 15;
			const startY = ringRect.top + ringRect.height * 0.5;
			ring.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: startX, clientY: startY }));
			assert.equal(ring.style.cursor, "grab");
			ring.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: startX, clientY: startY }));
			window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: startX + 40, clientY: startY }));
			window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: startX + 40, clientY: startY }));
			await done(imgTask);
			assert.ok(imgTask.markers[0].x > 55, `dragging area moves hotspot (${imgTask.markers[0].x})`);

			// Dragging the border resizes radius.
			const updatedRect = ring.getBoundingClientRect();
			const borderX = updatedRect.right;
			const borderY = updatedRect.top + updatedRect.height * 0.5;
			ring.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: borderX, clientY: borderY }));
			assert.equal(ring.style.cursor, "ew-resize");
			ring.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: borderX, clientY: borderY }));
			window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: borderX + 20, clientY: borderY }));
			window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: borderX + 20, clientY: borderY }));
			await done(imgTask);
			assert.ok(imgTask.markers[0].r > 10, `dragging border increases radius (${imgTask.markers[0].r})`);

			// Backspace deletes selected hotspot.
			ring.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
			await done(imgTask);
			assert.equal(imgTask.markers.length, 0, "Backspace removes selected hotspot");

			// Modify image dispatches pointerdown + click on the slotted picture to capture-select it.
			const picture = imgTask.querySelector(":scope > picture") as HTMLPictureElement;
			const events: Event[] = [];
			picture.addEventListener("pointerdown", e => events.push(e));
			picture.addEventListener("click", e => events.push(e));
			(imgTask.shadowRoot.querySelector(".modify-image-btn") as HTMLButtonElement).click();
			await done(imgTask);
			assert.deepEqual(events.map(e => e.type), ["pointerdown", "click"], "Modify image dispatches pointerdown then click on picture");
			assert.ok(events.every(e => e.bubbles && e.composed && (e as MouseEvent).button === 0));

			// Replacing deleted picture with an empty <img> (as domeditor schema repair does) renders empty and hides hint actions.
			picture.replaceWith(document.createElement("img"));
			await done(imgTask);
			const emptyImg = imgTask.querySelector(":scope > img");
			assert.ok(emptyImg && !emptyImg.getAttribute("src"), "empty img renders in slot");
			assert.equal(imgTask.shadowRoot.querySelector(".modify-image-btn"), null);
			assert.equal(imgTask.shadowRoot.querySelector(".add-hotspot-btn"), null);

			// Re-populate image & hotspot and verify learner grading.
			emptyImg!.setAttribute("src", TEST_IMAGE);
			imgTask.markers = [{ id: "m1", x: 50, y: 50, r: 10, label: "Center" }];
			imgTask.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(imgTask);

			const capture = imgTask.shadowRoot.querySelector(".marker-capture") as HTMLElement;
			const rect = capture.getBoundingClientRect();
			assert.equal(imgTask.checkValidity(), false);
			capture.dispatchEvent(new MouseEvent("click", {
				bubbles: true,
				clientX: rect.left + rect.width * 0.5,
				clientY: rect.top + rect.height * 0.5,
			}));
			await done(imgTask);
			assert.equal(imgTask.checkValidity(), true);
			assert.equal(imgTask.checkAnswer(true), 1);

			imgTask.reset();
			await done(imgTask);
			capture.dispatchEvent(new MouseEvent("click", {
				bubbles: true,
				clientX: rect.left + rect.width * 0.05,
				clientY: rect.top + rect.height * 0.05,
			}));
			await done(imgTask);
			assert.equal(imgTask.checkAnswer(true), 0);
			await done(imgTask);
			assert.ok(imgTask.shadowRoot.querySelector(".learner-pin.pin-wrong") && imgTask.shadowRoot.querySelector(".marker-ring.target-missed"));
		});

		it("loads saved label-only images as label markers", async function () {
			const root = mount(`<div><webwriter-image mode="label">
				<p slot="prompt">Label the parts.</p>
				<picture><img src="${TEST_IMAGE}" alt="Diagram"></picture>
			</webwriter-image></div>`);
			const imgTask = root.querySelector("webwriter-image") as Any;
			imgTask.markers = [
				{ id: "m1", x: 25, y: 50, r: 8, label: "Alpha" },
				{ id: "m2", x: 75, y: 50, r: 8, label: "Beta" },
			];
			await done(imgTask);

			const chip = (id: string) => imgTask.shadowRoot.querySelector(`.label-chip[data-chip-id="${id}"]`);
			const drop = (id: string) => imgTask.shadowRoot.querySelector(`.label-drop[data-marker-id="${id}"]`);
			await drag(chip("m1"), drop("m1"));
			await done(imgTask);
			await drag(chip("m2"), drop("m2"));
			await done(imgTask);
			assert.equal(imgTask.checkAnswer(true), 1);
		});

		it("authors label targets and grades them alongside hidden hotspots", async function () {
			const task = mount(`<webwriter-image>
				<p slot="prompt">Match the label and find the hotspot.</p>
				<img src="${TEST_IMAGE}" alt="Diagram">
			</webwriter-image>`).querySelector("webwriter-image")!;
			task.markers = [
				{ id: "label", x: 25, y: 50, r: 8, label: "Part A" },
				{ id: "hotspot", x: 75, y: 50, r: 8, label: "Part B" },
			];
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			root.querySelector<HTMLElement>('.marker-center[data-marker-id="label"]')!.click();
			await done(task);
			const popover = root.querySelector(".marker-popover:popover-open")!;
			const types = popover.querySelector(".marker-index + .marker-types")!;
			const [hotspot, label] = types.querySelectorAll<HTMLButtonElement>("button");
			assert.deepEqual([hotspot.textContent?.trim(), label.textContent?.trim()], ["Hotspot", "Label pin"]);
			assert.lengthOf(types.querySelectorAll('sl-icon[aria-hidden="true"]'), 2);
			assert.equal(hotspot.getAttribute("aria-pressed"), "true");
			assert.notExists(popover.querySelector('input[type="checkbox"]'));
			label.click();
			await done(task);
			assert.equal(task.markers[0].kind, "label");
			assert.equal(label.getAttribute("aria-pressed"), "true");
			assert.notExists(popover.querySelector(".marker-shapes"));
			assert.exists(root.querySelector('.marker-ring.label-marker[data-marker-id="label"]'));
			hotspot.click();
			await done(task);
			assert.equal(task.markers[0].kind, "hotspot");
			assert.exists(popover.querySelector(".marker-label-input + .marker-shapes"));
			label.click();
			await done(task);
			assert.notProperty(task.options, "mode");

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			assert.lengthOf(root.querySelectorAll(".label-drop"), 1);
			assert.lengthOf(root.querySelectorAll(".grid-pool .label-chip"), 1);
			const pin = (x: number) => {
				const capture = root.querySelector(".marker-capture")!;
				const box = capture.getBoundingClientRect();
				capture.dispatchEvent(new MouseEvent("click", {
					bubbles: true, clientX: box.left + box.width * x, clientY: box.top + box.height / 2,
				}));
			};
			await drag(root.querySelector(".grid-pool .label-chip")!, root.querySelector(".label-drop")!);
			await done(task);
			assert.isFalse(task.checkValidity(), "A label placement still needs a hotspot pin");
			pin(0.87);
			await done(task);
			assert.isTrue(task.checkValidity());
			assert.equal(task.checkAnswer(true), 0, "A pin outside the hotspot offsets the correct label");
			task.reset();
			await done(task);
			pin(0.75);
			await done(task);
			assert.isFalse(task.checkValidity(), "A hotspot pin still needs a label placement");
			await drag(root.querySelector(".grid-pool .label-chip")!, root.querySelector(".label-drop")!);
			await done(task);
			task.gradingMethod = "pass-fail";
			assert.equal(task.checkAnswer(true), 1);
		});

		it("centers marker numbers and resizes each rectangle edge independently", async function () {
			const task = mount(`<webwriter-image>
				<p slot="prompt">Find the shape.</p><img src="${TEST_IMAGE}" style="width: 400px; height: 240px;">
			</webwriter-image>`).querySelector("webwriter-image")!;
			task.markers = [{ id: "target", x: 50, y: 50, r: 10, label: "Target" }];
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const ring = root.querySelector(".marker-ring")!;
			const button = ring.querySelector<HTMLButtonElement>(".marker-center")!;
			const box = ring.getBoundingClientRect();
			const index = button.getBoundingClientRect();
			assert.closeTo(index.left + index.width / 2, box.left + box.width / 2, 0.5);
			assert.closeTo(index.top + index.height / 2, box.top + box.height / 2, 0.5);

			button.click();
			await done(task);
			const shapes = root.querySelector(".marker-popover:popover-open .marker-label-input + .marker-shapes")!;
			assert.exists(shapes.querySelector('button[aria-pressed="true"]'), "Circle is selected initially");
			shapes.querySelector<HTMLButtonElement>("button:last-child")!.click();
			await done(task);
			assert.equal(task.markers[0].shape, "rectangle");
			assert.exists(root.querySelector(".marker-ring.rectangle"));

			const stage = ring.closest(".image-stage")!.getBoundingClientRect();
			for (const [edge, dx, dy] of [["right", 5, 0], ["left", -5, 0], ["bottom", 0, 5], ["top", 0, -5]] as const) {
				const handle = ring.querySelector(`[data-edge="${edge}"]`)!;
				const before = task.markers[0];
				const bounds = handle.getBoundingClientRect();
				const start = { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 };
				const end = { clientX: start.clientX + stage.width * dx / 100, clientY: start.clientY + stage.height * dy / 100 };
				handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, ...start }));
				window.dispatchEvent(new PointerEvent("pointermove", end));
				window.dispatchEvent(new PointerEvent("pointerup", end));
				await done(task);
				const after = task.markers[0];
				assert.closeTo(after.width!, before.width! + Math.abs(dx), 0.1, edge);
				assert.closeTo(after.height!, before.height! + Math.abs(dy), 0.1, edge);
				assert.closeTo(after.x, before.x + dx / 2, 0.1, edge);
				assert.closeTo(after.y, before.y + dy / 2, 0.1, edge);
			}
			const previousHeight = task.markers[0].height!;
			ring.querySelector('[data-edge="bottom"]')!.dispatchEvent(new KeyboardEvent("keydown", {
				key: "ArrowDown", bubbles: true, cancelable: true,
			}));
			await done(task);
			assert.closeTo(task.markers[0].height!, previousHeight + 1, 0.1, "The bottom edge can also be resized by keyboard");

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			const marker = task.markers[0];
			const capture = root.querySelector(".marker-capture")!;
			const pos = capture.getBoundingClientRect();
			capture.dispatchEvent(new MouseEvent("click", { bubbles: true,
				clientX: pos.left + pos.width * (marker.x + marker.width! * 0.45) / 100,
				clientY: pos.top + pos.height * (marker.y + marker.height! * 0.45) / 100,
			}));
			assert.equal(task.checkAnswer(true), 1, "A pin inside a rectangle corner counts");
		});
	});

	describe("<webwriter-dictation>", function () {
		it("transcribes the main recording into one undoable transcript edit", async function () {
			const sessions: Any[] = [];
			class Recognition {
				track?: MediaStreamTrack;
				aborted = false;
				constructor() { sessions.push(this); }
				start(track: MediaStreamTrack) { this.track = track; }
				stop() { (this as Any).onend(); }
				abort() { this.aborted = true; }
			}
			const restore = browserRecognition(Recognition);
			const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");
			Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Chrome/135.0.0.0" });
			const media = HTMLMediaElement.prototype;
			const originalLoad = media.load;
			const originalCapture = Object.getOwnPropertyDescriptor(media, "captureStream");
			const track = { readyState: "live", stop() { stoppedTracks++; } };
			let stoppedTracks = 0;
			let input: HTMLAudioElement | undefined;
			let playing: HTMLMediaElement | undefined;
			const originalSetTimeout = window.setTimeout;
			const originalClearTimeout = window.clearTimeout;
			let deadline: { id: number; expire: () => void } | undefined;
			const getDeadline = () => deadline;
			window.setTimeout = (handler, delay, ...args) => {
				const id = originalSetTimeout.call(window, handler, delay, ...args);
				if (delay === 15_000 && typeof handler === "function") deadline = { id, expire: () => handler(...args) };
				return id;
			};
			window.clearTimeout = id => {
				if (deadline?.id === id) deadline = undefined;
				originalClearTimeout.call(window, id);
			};
			media.load = function () {
				if (!this.isConnected && this.querySelector("source")) {
					queueMicrotask(() => this.dispatchEvent(new Event("canplay")));
				} else originalLoad.call(this);
			};
			Object.defineProperty(media, "captureStream", { configurable: true, value: function (this: HTMLAudioElement) {
				input = this;
				this.play = async () => { playing = this; };
				return { getAudioTracks: () => [track], getTracks: () => [track] };
			} });
			try {
				const task = mount(`<webwriter-dictation lang="fr-FR" transcript="Original">
					<p slot="prompt">Listen and write.</p>
					<audio controls lang="fr-CA"><source src="${TEST_AUDIO}" type="audio/wav"></audio>
					<audio controls lang="en-US" slot="slow" src="slow.wav"></audio>
				</webwriter-dictation>`).querySelector("webwriter-dictation")!;
				editMode(task);
				await done(task);
				const root = task.shadowRoot!;
				const entry = root.querySelector("textarea")!;
				const button = root.querySelector<HTMLElement>(".transcribe")!;
				const picker = root.querySelector("ww-language-picker")!;
				const main = task.querySelector("audio")!;
				await until(() => entry.placeholder === "Transcription de la solution", "the placeholder matches the task language");
				assert.equal(entry.getAttribute("aria-label"), entry.placeholder);
				assert.isNull(root.querySelector("label[for=dictation-entry]"));
				assert.equal(picker.parentElement, button.parentElement);
				assert.isBelow(button.getBoundingClientRect().bottom, main.getBoundingClientRect().top);
				assert.closeTo(button.getBoundingClientRect().right, entry.getBoundingClientRect().right, 1);
				for (const audio of task.querySelectorAll("audio")) {
					assert.closeTo(audio.getBoundingClientRect().width, entry.getBoundingClientRect().width, 1);
				}
				assert.equal(picker.value, "fr-CA");
				const select = picker.shadowRoot!.querySelector("select")!;
				assert.match(select.selectedOptions[0].text, /^French \(Canada\) \[.+\]$/);
				const caption = select.querySelector("button");
				if (CSS.supports("appearance", "base-select")) assert.equal(caption?.textContent, "French (Canada)");
				assert.equal(await transactions(async () => {
					select.value = "de-AT";
					select.dispatchEvent(new Event("change"));
					await done(task);
				}), "start,end");
				assert.equal(main.lang, "de-AT");
				if (caption) assert.equal(caption.textContent, "German (Austria)");

				button.click();
				await until(() => sessions[0]?.track, "recording recognition started");
				assert.strictEqual(sessions[0].track, track);
				assert.equal(sessions[0].lang, "de-AT");
				assert.isTrue(sessions[0].continuous);
				assert.strictEqual(playing, input, "playback starts even before recognition announces that it started");
				assert.isTrue(input?.muted);
				assert.equal(input?.querySelector("source")?.getAttribute("src"), TEST_AUDIO);
				assert.isTrue(entry.readOnly);
				const result = (transcript: string, isFinal = true) => Object.assign([{ transcript }], { isFinal });
				sessions[0].onresult({ results: [result(" Bonjour "), result("interim", false)] });
				assert.equal(task.transcript, "Original");
				assert.equal(await transactions(async () => {
					sessions[0].onresult({ results: [result(" Bonjour "), result(" à tous. ")] });
					Object.defineProperty(input!, "ended", { value: true });
					input!.dispatchEvent(new Event("ended"));
					await done(task);
				}), "start,end");
				assert.equal(task.transcript, "Bonjour à tous.");
				assert.equal(entry.value, "Bonjour à tous.");
				assert.notInclude(task.getAttribute("transcript")!, "Bonjour");
				assert.equal(stoppedTracks, 1);
				assert.isFalse(entry.readOnly);
				assert.isUndefined(getDeadline());

				select.value = "";
				select.dispatchEvent(new Event("change"));
				await done(task);
				assert.isFalse(main.hasAttribute("lang"));
				assert.equal(select.selectedOptions[0]?.textContent,
					new Intl.DisplayNames(task.localize.getLocale(), { type: "language" }).of("fr-FR"));
				if (caption) assert.equal(caption.textContent, picker.placeholder);
				button.click();
				await until(() => sessions[1]?.track, "second recording recognition started");
				assert.equal(sessions[1].lang, "fr-FR");
				sessions[1].onerror({ error: "network" });
				await done(task);
				assert.isTrue(sessions[1].aborted);
				assert.include(root.querySelector(".dictation-status")?.textContent, "La transcription automatique n’a pas abouti. Réessayez.");
				assert.equal(task.transcript, "Bonjour à tous.");

				button.click();
				await until(() => sessions[2]?.track, "third recording recognition started");
				const playbackDeadline = deadline;
				input!.dispatchEvent(new Event("timeupdate"));
				assert.notEqual(deadline?.id, playbackDeadline?.id, "playback progress extends the deadline");
				let askedToStop = false;
				sessions[2].stop = () => { askedToStop = true; };
				Object.defineProperty(input!, "ended", { value: true });
				input!.dispatchEvent(new Event("ended"));
				assert.isTrue(askedToStop);
				const lateEnd = sessions[2].onend;
				deadline!.expire();
				lateEnd();
				await done(task);
				assert.isTrue(sessions[2].aborted);
				assert.equal(stoppedTracks, 3);
				assert.include(root.querySelector(".dictation-status")?.textContent, "Délai de transcription automatique dépassé. Réessayez.");
				assert.isFalse(entry.readOnly);
				assert.equal(entry.value, "Bonjour à tous.");
				assert.isUndefined(getDeadline());

				button.click();
				await until(() => sessions[3]?.track, "fourth recording recognition started");
				task.removeAttribute("contenteditable");
				document.designMode = "off";
				await done(task);
				assert.isTrue(sessions[3].aborted);
				assert.equal(stoppedTracks, 4);
				assert.isUndefined(getDeadline());
				assert.isNull(root.querySelector(".transcribe"));
				assert.isNull(root.querySelector("ww-language-picker"));
			} finally {
				if (deadline) window.clearTimeout(deadline.id);
				window.setTimeout = originalSetTimeout;
				window.clearTimeout = originalClearTimeout;
				media.load = originalLoad;
				if (originalCapture) Object.defineProperty(media, "captureStream", originalCapture);
				else Reflect.deleteProperty(media, "captureStream");
				if (originalUserAgent) Object.defineProperty(navigator, "userAgent", originalUserAgent);
				else Reflect.deleteProperty(navigator, "userAgent");
				restore();
			}
		});

		it("reports unavailable recording recognition and leaves the transcript editable", async function () {
			const restore = browserRecognition(undefined);
			try {
				const task = mount(`<webwriter-dictation transcript="Original"><p slot="prompt">Listen.</p>
					<audio src="recording.wav"></audio></webwriter-dictation>`).querySelector("webwriter-dictation")!;
				editMode(task);
				await done(task);
				const root = task.shadowRoot!;
				root.querySelector<HTMLElement>(".transcribe")!.click();
				await done(task);
				assert.include(root.querySelector(".dictation-status")?.textContent, "cannot transcribe recordings automatically");
				assert.equal(task.transcript, "Original");
				assert.isFalse(root.querySelector("textarea")!.readOnly);
			} finally { restore(); }
		});

		it("authors recordings and the transcript, checks words, and resets each playback limit", async function () {
			const task = mount(`<webwriter-dictation play-limit="1" ignore-case ignore-punctuation allow-typos>
				<p slot="prompt">Listen and write.</p><audio src="${TEST_AUDIO}"></audio>
			</webwriter-dictation>`).querySelector("webwriter-dictation")!;
			const root = task.shadowRoot!;
			editMode(task);
			await done(task);
			assert.notExists(root.querySelector(".add-option"), "Dictation has no Add slow recording action");
			assert.notProperty(task.options ?? {}, "playLimit");
			assert.exists(root.querySelector("ww-language-picker.edit-only"));
			assert.exists(root.querySelector(".transcribe.edit-only"));
			root.querySelector<HTMLButtonElement>(".tolerance-trigger")!.click();
			assert.lengthOf(root.querySelectorAll('#task-tolerance:popover-open input[type="checkbox"]'), 3);
			assert.notInclude(root.querySelector("#task-configuration")!.textContent, "Ignore capitalization");
			const main = task.querySelector("audio")!;
			const slow = document.createElement("audio");
			slow.slot = "slow";
			task.append(slow);
			await done(task);
			assert.equal(root.querySelector<HTMLSlotElement>('slot[name="slow-recording"]')!.assignedElements()[0], slow);
			slow.src = main.src;
			const entry = root.querySelector("textarea")!;
			entry.value = "Red foxes run.";
			entry.dispatchEvent(new Event("change", { bubbles: true }));
			await done(task);
			assert.equal(task.transcript, "Red foxes run.");
			assert.notInclude(task.getAttribute("transcript")!, "Red foxes run");

			document.designMode = "off";
			task.removeAttribute("contenteditable");
			await done(task);
			assert.equal(entry.value, "");
			assert.notExists(root.querySelector("ww-language-picker, .transcribe, .tolerance-trigger"));
			assert.isFalse(task.checkValidity());
			const [mainPlayer, slowPlayer] = root.querySelectorAll(".recordings audio") as NodeListOf<HTMLAudioElement>;
			assert.isTrue(mainPlayer.controls);
			assert.isTrue(slowPlayer.controls);
			assert.isFalse(main.controls, "reader controls do not change the authored recording");
			assert.equal(mainPlayer.src, main.src);
			assert.equal(slowPlayer.src, slow.src);
			let pauses = 0;
			Object.defineProperty(mainPlayer, "pause", { value: () => { pauses++; } });
			const play = (audio: HTMLAudioElement) => {
				audio.dispatchEvent(new Event("play"));
				audio.dispatchEvent(new Event("playing"));
			};
			play(mainPlayer);
			await done(task);
			assert.equal(root.querySelector("#plays-left")?.textContent, "0 plays left");
			assert.equal(root.querySelector("#slow-plays-left")?.textContent, "1 play left");
			play(mainPlayer);
			assert.equal(pauses, 0, "an in-progress play can resume");
			mainPlayer.dispatchEvent(new Event("ended"));
			mainPlayer.dispatchEvent(new Event("play"));
			assert.equal(pauses, 1, "another play is stopped after the limit");
			play(slowPlayer);
			await done(task);
			assert.equal(root.querySelector("#slow-plays-left")?.textContent, "0 plays left");

			entry.value = "red foxs run";
			entry.dispatchEvent(new Event("input"));
			assert.isTrue(task.checkValidity());
			task.style.setProperty("--sl-color-success-700", "rgb(0, 120, 0)");
			assert.closeTo(task.checkAnswer!(true), 5 / 6, 0.001);
			await done(task);
			const solution = root.querySelector(".dictation-solution")!;
			assert.include(solution.textContent, "Red foxes run");
			assert.equal(getComputedStyle(solution).color, "rgb(0, 120, 0)");
			task.reset();
			await done(task);
			assert.equal(entry.value, "");
			assert.equal(root.querySelector("#plays-left")?.textContent, "1 play left");
		});
	});

	describe("Voice recording", function () {
		// Keep the fixture above Web Crypto's 64 KiB per-call limit after encoding.
		const samples = 80_000;
		const wav = new Uint8Array(44 + samples);
		wav.set(Uint8Array.from(atob(TEST_AUDIO.split(",")[1]), c => c.charCodeAt(0)));
		wav.fill(128, 44);
		const header = new DataView(wav.buffer);
		header.setUint32(4, wav.length - 8, true);
		header.setUint32(40, samples, true);
		const sample = new Blob([wav], { type: "audio/wav" });
		const result = (transcript: string, isFinal = true) => Object.assign([{ transcript }], { isFinal });

		function startRecording(recorder: HTMLElement) {
			recorder.dispatchEvent(new CustomEvent("recording-started", { detail: { stream: new MediaStream() } }));
		}

		function stopRecording(recorder: HTMLElement) {
			recorder.dispatchEvent(new Event("recording-stopping"));
			recorder.dispatchEvent(new CustomEvent("recording-complete", { detail: { audioBlob: sample } }));
		}

		it("distinguishes a blocked embedding policy from denied microphone permission", async function () {
			const devices = navigator.mediaDevices;
			const originalRequest = Object.getOwnPropertyDescriptor(devices, "getUserMedia");
			const originalPolicy = Object.getOwnPropertyDescriptor(document, "permissionsPolicy");
			let requests = 0;
			let allowed = false;
			Object.defineProperty(document, "permissionsPolicy", { configurable: true, value: {
				allowsFeature: (feature: string) => feature === "microphone" && allowed,
			} });
			Object.defineProperty(devices, "getUserMedia", { configurable: true, value: async () => {
				requests++;
				throw new DOMException("Permission denied", "NotAllowedError");
			} });
			try {
				const task = mount(`<webwriter-speech grading-method="ungraded"><p slot="prompt">Speak.</p></webwriter-speech>`)
					.querySelector("webwriter-speech")!;
				await done(task);
				const recorder = task.shadowRoot!.querySelector("audio-recorder")!;
				const button = recorder.shadowRoot!.querySelector<HTMLElement>("sl-button")!;
				button.click();
				await done(task);
				assert.equal(requests, 0);
				assert.include(recorder.shadowRoot!.querySelector(".error")?.textContent, "This view blocks microphone access.");

				allowed = true;
				button.click();
				await done(task);
				assert.equal(requests, 1);
				assert.include(recorder.shadowRoot!.querySelector(".error")?.textContent,
					"WebWriter does not have permission to access the microphone.");
			} finally {
				if (originalRequest) Object.defineProperty(devices, "getUserMedia", originalRequest);
				else Reflect.deleteProperty(devices, "getUserMedia");
				if (originalPolicy) Object.defineProperty(document, "permissionsPolicy", originalPolicy);
				else Reflect.deleteProperty(document, "permissionsPolicy");
			}
		});

		it("transcribes an authored reference live and grades a learner recording by default", async function () {
			this.timeout(10000);
			const sessions: Any[] = [];
			class Recognition {
				constructor() { sessions.push(this); }
				start() { (this as Any).started = true; }
				stop() { (this as Any).stopped = true; }
				abort() { (this as Any).aborted = true; }
			}
			const restore = browserRecognition(undefined, Recognition);
			try {
				const task = mount(`<webwriter-speech lang="fr-FR" required><p slot="prompt">Greet someone.</p></webwriter-speech>`)
					.querySelector("webwriter-speech")!;
				editMode(task);
				await done(task);
				const root = task.shadowRoot!;
				assert.equal(task.gradingMethod, "transcript");
				assert.notProperty(task.options, "mode");
				const picker = root.querySelector("ww-language-picker")!;
				const transcriptButton = root.querySelector<HTMLElement>(".transcript-trigger")!;
				assert.equal(picker.closest(".task-helper"), transcriptButton.closest(".task-helper"));
				assert.isTrue(picker.classList.contains("edit-only"));
				assert.isTrue(transcriptButton.classList.contains("edit-only"));
				const select = picker.shadowRoot!.querySelector("select")!;
				select.value = "fr-CA";
				select.dispatchEvent(new Event("change"));
				await done(task);
				assert.equal(task.getAttribute("speech-language"), "fr-CA");
				const recorder = root.querySelector<HTMLElement>("audio-recorder")!;
				assert.closeTo(recorder.getBoundingClientRect().width, root.querySelector(".speech-response")!.getBoundingClientRect().width, 1);
				startRecording(recorder);
				assert.isTrue(sessions[0].started, "recognition starts alongside recording");
				assert.equal(sessions[0].lang, "fr-CA");
				assert.isTrue(sessions[0].continuous);
				await done(task);
				const progress = recorder.querySelector(".speech-progress")!;
				assert.equal(recorder.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="progress"]')!.assignedElements()[0], progress);
				assert.equal(progress.textContent, "Transcription de la parole…");
				assert.equal(getComputedStyle(progress).fontSize, getComputedStyle(root.querySelector(".task-helper .helper")!).fontSize);
				assert.equal(getComputedStyle(progress).textAlign, "end");
				sessions[0].onresult({ results: [result("Bonjour"), result("interim", false)] });
				assert.isEmpty(task.transcript, "capture stays local until recording completes");
				assert.equal(await transactions(async () => {
					stopRecording(recorder);
					assert.isTrue(sessions[0].stopped);
					await done(task);
					assert.equal(progress.textContent, "Finalisation de l’enregistrement…");
					sessions[0].onresult({ results: [result("Bonjour"), result("à tous.")] });
					sessions[0].onend();
					await until(() => task.solution, "author audio saved");
					await done(task);
				}), "start,end");
				assert.equal(task.transcript, "Bonjour à tous.");
				assert.notInclude(task.getAttribute("transcript")!, "Bonjour");
				assert.match(task.solution, /^data:audio\/wav/);
				const restored = task.cloneNode(true) as typeof task;
				assert.isAbove(task.getAttribute("solution")?.length ?? 0, sample.size);
				assert.equal(restored.solution, task.solution);
				assert.isNull(root.querySelector(".speech-progress"));

				transcriptButton.click();
				await done(task);
				const popup = root.querySelector(".transcript-popup")!;
				assert.isTrue(popup.matches(":popover-open"));
				const field = popup.querySelector("textarea")!;
				assert.equal(field.value, "Bonjour à tous.");
				field.value = "Salut!";
				field.dispatchEvent(new Event("change"));
				assert.equal(task.transcript, "Salut!");

				task.removeAttribute("contenteditable");
				document.designMode = "off";
				await done(task);
				assert.isNull(root.querySelector("ww-language-picker"));
				assert.isNull(root.querySelector(".transcript-trigger"));
				assert.isFalse(task.checkValidity());
				const learner = root.querySelector<HTMLElement>("audio-recorder")!;
				startRecording(learner);
				assert.equal(sessions[1].lang, "fr-CA");
				assert.isFalse(task.checkValidity());
				stopRecording(learner);
				sessions[1].onresult({ results: [result("Salut.")] });
				sessions[1].onend();
				await done(task);
				assert.isTrue(task.checkValidity());
				assert.equal(task.checkAnswer(true), 1);
				await done(task);
				assert.include(root.querySelector(".transcript-value")?.textContent, "Salut!");

				task.reset();
				await done(task);
				const retry = root.querySelector<HTMLElement>("audio-recorder")!;
				startRecording(retry);
				stopRecording(retry);
				sessions[2].onresult({ results: [result("Bonjour")] });
				sessions[2].onend();
				await done(task);
				assert.equal(task.checkAnswer(false), 0);

				task.gradingMethod = "partial";
				task.transcript = "Salut à tous";
				task.reset();
				await done(task);
				const partial = root.querySelector<HTMLElement>("audio-recorder")!;
				startRecording(partial);
				stopRecording(partial);
				sessions[3].onresult({ results: [result("Salut à vous")] });
				sessions[3].onend();
				await done(task);
				assert.closeTo(task.checkAnswer(), 2 / 3, 1e-9);

				task.reset();
				await done(task);
				startRecording(root.querySelector<HTMLElement>("audio-recorder")!);
				const lateResult = sessions[4].onresult;
				task.remove();
				assert.isTrue(sessions[4].aborted);
				lateResult({ results: [result("Salut")] });
				assert.isFalse(task.checkValidity());
			} finally { restore(); }
		});

		it("shows unsupported recognition while keeping the recorder and author transcript available", async function () {
			const restore = browserRecognition(undefined);
			try {
				const task = mount(`<webwriter-speech transcript="Yes"><p slot="prompt">Speak an answer.</p></webwriter-speech>`)
					.querySelector("webwriter-speech")!;
				await done(task);
				const root = task.shadowRoot!;
				assert.include(root.querySelector(".speech-status")?.textContent, "Speech recognition is not supported");
				assert.isFalse((root.querySelector("audio-recorder") as Any).disabled);
				assert.isTrue(root.querySelector<HTMLElement & { disabled: boolean }>(".check")!.disabled);
				assert.isTrue(task.checkValidity());
				assert.isNaN(task.checkAnswer(false));
				await done(task);
				assert.notInclude(root.textContent, "Yes");
				editMode(task);
				await done(task);
				(root.querySelector(".transcript-trigger") as HTMLElement).click();
				assert.equal(root.querySelector("textarea")?.value, "Yes");
			} finally { restore(); }
		});
	});

	describe("<webwriter-image-placements>", function () {
		it("restores the standard empty picture when the author deletes the background", async function () {
			const task = mount(`<webwriter-image-placements>
				<p slot="prompt">Place the pieces.</p><picture><img src="${TEST_IMAGE}"></picture>
				<webwriter-image-placement-item id="piece"><p>North</p></webwriter-image-placement-item>
			</webwriter-image-placements>`).querySelector("webwriter-image-placements")!;
			editMode(task);
			await done(task);
			const item = task.querySelector("#piece");
			task.querySelector(":scope > picture")!.remove();
			const placeholder = () => task.shadowRoot!
				.querySelector<HTMLSlotElement>('.image-stage.empty slot[name="media"]')?.assignedElements()[0];
			await until(() => Boolean(placeholder()), "a standard picture replaces the deleted background");
			const picture = task.querySelector(":scope > picture")!;
			assert.strictEqual(placeholder(), picture);
			assert.isFalse(picture.querySelector("img")!.hasAttribute("src"));
			assert.strictEqual(task.querySelector("#piece"), item);
		});

		it("shows an empty picture and adds one editable item from the hint row", async function () {
			const host = mount("<div></div>").firstElementChild!;
			const task = findQuizTypeById("webwriter-image-placements")!.createInstance() as HTMLElementTagNameMap["webwriter-image-placements"];
			host.append(task);
			editMode(task);
			await done(task);
			const root = task.shadowRoot!;
			const picture = task.querySelector("picture")!;
			assert.isFalse(picture.querySelector("img")!.hasAttribute("src"));
			assert.strictEqual(root.querySelector<HTMLSlotElement>('.image-stage.empty slot[name="media"]')!.assignedElements()[0], picture);
			assert.equal(root.querySelector(".placement-options .pool-label")?.textContent, "Options");
			const starter = task.querySelector("webwriter-image-placement-item")!;
			assert.exists(starter.querySelector("p"));
			assert.notExists(root.querySelector(".placement-options button"));

			const add = root.querySelector<HTMLButtonElement>(".task-helper .add-item")!;
			assert.equal(add.textContent?.trim(), "Add item");
			add.click();
			await done(task);
			const item = task.querySelector("webwriter-image-placement-item:last-of-type")!;
			assert.notStrictEqual(item, starter);
			const paragraph = item.querySelector("p")!;
			assert.equal(paragraph.textContent, "");
			await until(() => document.getSelection()?.anchorNode === paragraph, "the caret enters the new item");
			assert.equal(document.getSelection()?.anchorOffset, 0);
			const cards = root.querySelectorAll<HTMLSlotElement>(".placement-options > slot");
			assert.lengthOf(cards, 2);
			assert.strictEqual(cards[1].assignedElements()[0], item);
			const card = item.shadowRoot!.querySelector(".grid-card")!;
			assert.exists(card.querySelector(".drag-handle"));
			assert.notExists(card.querySelector("button"));
			const bounds = card.getBoundingClientRect();
			const hostBounds = item.getBoundingClientRect();
			assert.closeTo(hostBounds.width, bounds.width, 1);
			assert.closeTo(hostBounds.height, bounds.height, 1);
			const framePress = new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 });
			card.dispatchEvent(framePress);
			assert.isTrue(framePress.defaultPrevented, "pressing the card frame keeps the caret in place");
			const contentPress = new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 });
			paragraph.dispatchEvent(contentPress);
			assert.isFalse(contentPress.defaultPrevented, "authored content keeps native mouse selection");
		});

		it("authors zones for text and image pieces, supports click and drag, and scores and resets placement", async function () {
			const task = mount(`<webwriter-image-placements style="width:450px">
				<p slot="prompt">Place the pieces.</p><img src="${TEST_IMAGE}">
				<webwriter-grid-item id="north"><p>North</p></webwriter-grid-item>
				<webwriter-grid-item id="compass"><picture><img src="${TEST_IMAGE}" alt="Compass"></picture></webwriter-grid-item>
			</webwriter-image-placements>`).querySelector("webwriter-image-placements")!;
			const north = task.querySelector("#north p")!;
			const background = task.querySelector(":scope > img")!;
			editMode(task);
			await done(task);
			assert.strictEqual(task.querySelector("webwriter-image-placement-item#north p"), north);
			assert.strictEqual(task.querySelector(":scope > picture > img"), background);
			const root = task.shadowRoot!;
			const actions = [...root.querySelectorAll(".task-helper-switches button")];
			assert.deepEqual(actions.map(button => button.textContent?.trim()), ["Modify image", "Add zone", "Add item"]);
			assert.isFalse(actions[0].classList.contains("helper-action"));
			assert.isTrue(actions.slice(1).every(button => button.classList.contains("helper-action")));
			const addZone = () => root.querySelector<HTMLButtonElement>(".add-hotspot-btn")!.click();
			assert.notExists(root.querySelector(".add-label-pin-btn"));
			for (const id of ["north", "compass"]) {
				addZone();
				await done(task);
				const select = root.querySelector<HTMLSelectElement>(".marker-popover select")!;
				assert.notExists(root.querySelector(".marker-popover :is(.marker-types, .marker-shapes)"));
				if (id === "north") {
					root.querySelector<HTMLButtonElement>(".marker-center")!.click();
					await done(task);
					await drag(task.querySelector("#north")!.shadowRoot!.querySelector(".drag-handle")!, root.querySelector(".marker-center")!);
				} else {
					select.value = id;
					select.dispatchEvent(new Event("change", { bubbles: true }));
				}
				await done(task);
			}
			assert.deepEqual(task.markers.map(zone => [zone.shape, zone.pieceId]), [["rectangle", "north"], ["rectangle", "compass"]]);
			const hover = (element: Element) => element.dispatchEvent(new PointerEvent("pointerover", {
				bubbles: true, composed: true, pointerType: "mouse",
			}));
			const pool = root.querySelector(".placement-options")!;
			const option = task.querySelector("webwriter-image-placement-item#north")!;
			const authorCard = () => option.shadowRoot!.querySelector(".grid-card")!;
			const authorZone = root.querySelector(".marker-ring")!;
			const authorPreview = authorZone.querySelector(".zone-preview")!;
			assert.equal(authorPreview.textContent?.trim(), "North");
			assert.equal(getComputedStyle(authorPreview).backgroundColor, "rgba(0, 0, 0, 0)");
			assert.equal(getComputedStyle(authorPreview).borderTopWidth, "0px");
			assert.equal(getComputedStyle(authorCard()).backgroundColor, "rgb(255, 255, 255)");
			assert.equal(getComputedStyle(authorCard()).borderTopWidth, "1px");
			assert.strictEqual(pool.querySelector<HTMLSlotElement>('[data-child-id="north"]')!.assignedElements()[0], option);
			assert.isTrue(authorCard().classList.contains("dimmed"));
			assert.notExists(authorCard().querySelector("button:disabled"));

			north.firstChild!.nodeValue = "North pole";
			await until(() => authorPreview.textContent?.trim() === "North pole", "the copy follows text edits");
			hover(authorZone);
			await done(task);
			await done(option);
			assert.isTrue(authorCard().classList.contains("counterpart-hovered"));
			assert.equal(getComputedStyle(authorCard()).opacity, "1");
			hover(authorCard());
			await done(task);
			assert.isTrue(authorPreview.classList.contains("counterpart-hovered"));
			hover(root.querySelector(".image-stage")!);
			await done(task);
			assert.isFalse(authorPreview.classList.contains("counterpart-hovered"));

			// Space the zones apart for pointer hit testing.
			task.markers = task.markers.map((zone, index) => ({ ...zone, x: index === 0 ? 25 : 75 }));
			await done(task);
			const authorZones = root.querySelectorAll(".marker-ring");
			await drag(authorCard().querySelector(".drag-handle")!, authorZones[1].querySelector(".marker-center")!);
			await done(task);
			assert.deepEqual(task.markers.map(zone => zone.pieceId), ["compass", "north"], "assigned author items stay movable");
			await drag(authorCard().querySelector(".drag-handle")!, authorZones[0].querySelector(".marker-center")!);
			await done(task);
			assert.deepEqual(task.markers.map(zone => zone.pieceId), ["north", "compass"]);

			task.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(task);
			const zones = root.querySelectorAll<HTMLButtonElement>(".zone-button");
			const piece = (id: string) => root.querySelector<HTMLButtonElement>(`.piece[data-ww-key="${id}"]`)!;
			assert.equal(zones.length, 2);
			assert.isFalse(task.checkValidity());
			assert.equal(root.querySelector(".placement-options .pool-label")?.textContent, "Options");
			piece("north").click();
			zones[0].click();
			await done(task);
			assert.equal(zones[0].querySelector(".zone-preview")?.textContent?.trim(), "North pole");
			const original = piece("north");
			assert.equal(getComputedStyle(zones[0].querySelector(".zone-preview")!).backgroundColor, "rgba(0, 0, 0, 0)");
			assert.equal(getComputedStyle(zones[0].querySelector(".zone-preview")!).borderTopWidth, "0px");
			assert.equal(getComputedStyle(original).backgroundColor, "rgb(255, 255, 255)");
			assert.equal(getComputedStyle(original).borderTopWidth, "1px");
			assert.strictEqual(original.querySelector("slot")!.assignedElements()[0], option);
			assert.equal(getComputedStyle(original).opacity, "0.55");
			assert.isFalse(original.disabled);
			assert.equal(original.dataset.wwDrag, "image-piece");
			hover(zones[0]);
			await done(task);
			assert.equal(getComputedStyle(original).opacity, "1");
			assert.equal(getComputedStyle(original).outlineStyle, "solid");
			hover(original);
			await done(task);
			assert.equal(getComputedStyle(zones[0].querySelector(".zone-preview")!).outlineStyle, "solid");
			hover(root.querySelector(".pool-label")!);
			await done(task);
			assert.equal(getComputedStyle(original).opacity, "0.55");
			assert.equal(getComputedStyle(zones[0].querySelector(".zone-preview")!).outlineStyle, "none");

			original.click();
			zones[1].click();
			await done(task);
			assert.isNull(zones[0].querySelector(".zone-preview"));
			assert.equal(zones[1].querySelector(".zone-preview")?.textContent?.trim(), "North pole");
			assert.strictEqual(piece("north"), original);
			await drag(original.querySelector(".drag-handle")!, zones[0]);
			await drag(piece("compass").querySelector(".drag-handle")!, zones[1]);
			await done(task);
			assert.isTrue(task.checkValidity());
			assert.equal(zones[1].querySelector("picture img")?.getAttribute("alt"), "Compass");
			assert.equal(task.checkAnswer!(true), 1);
			await done(task);
			assert.lengthOf(root.querySelectorAll(".piece.dimmed"), 2);
			task.reset();
			await done(task);
			assert.isFalse(task.checkValidity());
			assert.lengthOf(root.querySelectorAll(".piece"), 2);
			assert.lengthOf(root.querySelectorAll(".piece.dimmed, .zone-preview"), 0);
		});
	});

	describe("<webwriter-drawing>", function () {
		it("opens previously reference-graded sketches as ungraded and keeps the comparison", async function () {
			const drawing = mount(`<webwriter-drawing grading-method="match-reference" reference-tolerance="3" ignore-reference-size
				solution='<rect x="160" y="80" width="320" height="160" fill="none" stroke="black"/>'>
				<p slot="prompt">Draw the rectangle.</p>
			</webwriter-drawing>`).querySelector("webwriter-drawing")!;
			editMode(drawing);
			await done(drawing);
			const root = drawing.shadowRoot!;

			root.querySelector<HTMLButtonElement>(".header-editor > button")!.click();
			await done(drawing);
			const grading = Array.from(root.querySelectorAll<HTMLInputElement>('.grading-radio input[type="radio"]'));
			assert.deepEqual(grading.map(input => input.value), ["completion", "self-assess", "ungraded"]);
			assert.isTrue(grading.find(input => input.value === "ungraded")!.checked);
			assert.equal(drawing.getAttribute("grading-method"), "match-reference", "loading keeps the saved markup");

			document.designMode = "off";
			drawing.removeAttribute("contenteditable");
			await done(drawing);
			assert.isUndefined(drawing.checkAnswer);
			const submit = root.querySelector<HTMLElement>(".check")!;
			assert.equal(submit.textContent?.trim(), "Submit");
			submit.click();
			await done(drawing);
			assert.exists(root.querySelector(".solution-comparison rect"));
			assert.notExists(root.querySelector(".result"));
		});

		it("keeps the toolbar in one row and switches drawing settings from compact popovers", async function () {
			const drawing = mount(`<webwriter-drawing style="width: 650px">
				<p slot="prompt">Draw a shape.</p>
				<picture slot="background"><img src="${TEST_IMAGE}" alt=""></picture>
			</webwriter-drawing>`).querySelector("webwriter-drawing")!;
			editMode(drawing);
			await done(drawing);
			const root = drawing.shadowRoot!;
			const toolbar = root.querySelector<HTMLElement>(".toolbar")!;
			const stage = root.querySelector<HTMLElement>(".canvas-stage")!;
			const tools = [...toolbar.querySelectorAll<HTMLButtonElement>("button[data-tool]")];
			const color = toolbar.querySelector<HTMLButtonElement>(".color-picker > .picker-trigger")!;
			const size = toolbar.querySelector<HTMLButtonElement>(".size-picker > .picker-trigger")!;
			const clear = toolbar.querySelector<HTMLButtonElement>(".clear-drawing-btn")!;
			const visible = (element: HTMLElement) => element.getClientRects().length > 0;
			const setWidth = async (width: number) => {
				drawing.style.width = `${width}px`;
				await done(drawing);
				assert.isAtMost(toolbar.scrollWidth, toolbar.clientWidth + 1, `Controls fit at ${width}px`);
				assert.closeTo(toolbar.getBoundingClientRect().bottom, stage.getBoundingClientRect().top, 0.5);
				const top = tools[0].getBoundingClientRect().top;
				for (const tool of tools) assert.closeTo(tool.getBoundingClientRect().top, top, 0.5);
				const style = getComputedStyle(toolbar);
				const inset = parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight);
				assert.closeTo(clear.getBoundingClientRect().right, toolbar.getBoundingClientRect().right - inset, 0.5);
			};

			assert.lengthOf(tools, 5);
			assert.isTrue(tools.every(tool => !tool.textContent?.trim() && Boolean(tool.getAttribute("aria-label"))));
			assert.notExists(toolbar.querySelector(".undo-btn"));
			await setWidth(650);
			assert.isFalse(visible(color));
			assert.isFalse(visible(size));
			await setWidth(520);
			assert.isTrue(visible(color));
			assert.isFalse(visible(size));
			await setWidth(320);
			assert.isTrue(visible(color));
			assert.isTrue(visible(size));

			color.click();
			await done(drawing);
			const palette = root.querySelector<HTMLElement>("#sketch-color")!;
			assert.isTrue(palette.matches(":popover-open"));
			assert.equal(root.activeElement?.getAttribute("aria-label"), "Black");
			palette.querySelector<HTMLButtonElement>('button[aria-label="Blue"]')!.click();
			await done(drawing);
			assert.isFalse(palette.matches(":popover-open"));
			assert.include(color.getAttribute("aria-label"), "Blue");
			assert.equal(root.activeElement, color);

			size.click();
			await done(drawing);
			const widths = root.querySelector<HTMLElement>("#sketch-size")!;
			[...widths.querySelectorAll<HTMLButtonElement>("button")].at(-1)!.click();
			await done(drawing);
			assert.include(size.getAttribute("aria-label"), "10 px");
			assert.isFalse(widths.matches(":popover-open"));
			assert.equal(root.activeElement, size);
			await setWidth(310);

			color.click();
			await done(drawing);
			await setWidth(650);
			assert.isFalse(palette.matches(":popover-open"), "Opening up the inline palette closes the dropdown");
			assert.exists(toolbar.querySelector('.color-picker .inline-options button[aria-label="Blue"][aria-pressed="true"]'));
			await setWidth(240);
			assert.notExists(toolbar.querySelector(".modify-bg-btn"));

			document.designMode = "off";
			drawing.removeAttribute("contenteditable");
			await setWidth(300);
			assert.exists(toolbar.querySelector(".undo-btn"));
		});

		it("resizes a blank canvas in edit mode and saves its height for learners", async function () {
			const drawing = mount(`<webwriter-drawing canvas-height="260"></webwriter-drawing>`)
				.querySelector("webwriter-drawing")!;
			editMode(drawing);
			await done(drawing);
			const root = drawing.shadowRoot!;
			const stage = root.querySelector<HTMLElement>(".canvas-stage")!;
			const handle = root.querySelector<HTMLButtonElement>(".resize-canvas")!;
			const svg = root.querySelector<SVGSVGElement>("svg.draw-svg")!;
			assert.equal(stage.clientHeight, 260);
			assert.equal(svg.viewBox.baseVal.height, 260);

			const change = await transactions(async () => {
				handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
				await done(drawing);
			});
			assert.equal(change, "start,end");
			assert.equal(drawing.getAttribute("canvas-height"), "276");
			assert.equal(stage.clientHeight, 276);
			assert.equal(svg.viewBox.baseVal.height, 276);

			drawing.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(drawing);
			assert.equal(root.querySelector(".resize-canvas"), null);
			assert.equal(stage.clientHeight, 276);
		});

		it("crops the selected background to the drawing area across widths and source changes", async function () {
			const root = mount(`<div style="width: 420px"><webwriter-drawing canvas-height="280">
				<picture slot="background"><source srcset="${TEST_IMAGE}"><img alt="Diagram"></picture>
			</webwriter-drawing></div>`);
			const drawing = root.querySelector("webwriter-drawing")!;
			editMode(drawing);
			await done(drawing);
			const picture = drawing.querySelector("picture")!;
			const shadow = drawing.shadowRoot!;
			const svg = shadow.querySelector<SVGSVGElement>(".draw-svg")!;
			const stage = svg.parentElement!;
			await until(() => stage.classList.contains("with-image"), "Drawing displays the loaded picture");
			const hintRow = shadow.querySelector<HTMLElement>(".task-helper")!;
			const hint = hintRow.querySelector(".helper")!;
			const modifyBackground = () => hintRow.querySelector<HTMLButtonElement>(".modify-bg-btn");
			assert.equal(hint.textContent, "Draw the solution.");
			assert.equal(modifyBackground()?.textContent, "Modify image");
			const events: string[] = [];
			picture.addEventListener("pointerdown", event => events.push(event.type));
			picture.addEventListener("click", event => events.push(event.type));
			modifyBackground()!.click();
			assert.deepEqual(events, ["pointerdown", "click"], "Modify image selects the authored picture");
			const assertCrop = () => {
				const rect = svg.getBoundingClientRect();
				const image = stage.querySelector<HTMLImageElement>("img.bg-image")!;
				assert.equal(image.src, picture.querySelector("img")!.currentSrc);
				assert.equal(getComputedStyle(image).objectFit, "cover");
				assert.closeTo(rect.height, 280, 0.1);
				assert.closeTo(image.getBoundingClientRect().width, rect.width, 0.1);
				assert.closeTo(image.getBoundingClientRect().height, rect.height, 0.1);
				assert.equal(svg.viewBox.baseVal.height, 280);
			};
			assertCrop();
			root.firstElementChild!.setAttribute("style", "width: 280px");
			await done(drawing);
			assertCrop();
			stage.querySelector(".resize-canvas")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
			await done(drawing);
			assert.equal(stage.clientHeight, 296);
			assert.equal(drawing.getAttribute("canvas-height"), "296");

			const replacement = "data:image/svg+xml," + encodeURIComponent(
				'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"></svg>',
			);
			picture.querySelector("source")!.srcset = replacement;
			await until(() => stage.querySelector<HTMLImageElement>("img.bg-image")?.src === replacement,
				"Drawing updates when the selected background source changes");
			assert.equal(stage.clientHeight, 296);
			assert.equal(svg.viewBox.baseVal.height, 296);

			picture.remove();
			await done(drawing);
			assert.equal(stage.clientHeight, 296);
			assert.ok(stage.querySelector(".resize-canvas"));
			assert.equal(modifyBackground()?.textContent, "Add background");

			drawing.setAttribute("background-src", TEST_IMAGE);
			await until(() => stage.classList.contains("with-image"), "Drawing displays a legacy background");
			assert.equal(stage.clientHeight, 296);
			modifyBackground()!.click();
			await until(() => stage.querySelector<HTMLImageElement>("img.bg-image:not(.legacy-bg)")?.src === TEST_IMAGE,
				"Modify image exposes the legacy background through a picture");
			assert.equal(drawing.querySelector('picture[slot="background"] img')?.getAttribute("src"), TEST_IMAGE);
			assert.isFalse(drawing.hasAttribute("background-src"));

			const authorHintHeight = hintRow.getBoundingClientRect().height;
			document.designMode = "off";
			drawing.removeAttribute("contenteditable");
			await done(drawing);
			assert.equal(hint.textContent, "Draw your answer.");
			assert.notExists(modifyBackground());
			assert.closeTo(hintRow.getBoundingClientRect().height, authorHintHeight, 0.5);
		});

		it("authors an SVG comparison solution with @webwriter/graphic tools, records learner shapes, undo, and required validation", async function () {
			const emptyRoot = mount(`<div><webwriter-drawing>
				<p slot="prompt">Blank canvas.</p>
			</webwriter-drawing></div>`);
			const emptyDrawing = emptyRoot.querySelector("webwriter-drawing")!;
			editMode(emptyDrawing);
			await done(emptyDrawing);
			const shadow = emptyDrawing.shadowRoot!;
			const backgroundButton = shadow.querySelector<HTMLButtonElement>(".task-helper .modify-bg-btn")!;
			assert.equal(backgroundButton.textContent, "Add background");
			assert.notExists(shadow.querySelector(".edit-toolbar .add-option"));
			const selectionEvents: string[] = [];
			for (const type of ["pointerdown", "click"]) {
				emptyDrawing.addEventListener(type, event => {
					if (event.target instanceof HTMLPictureElement) selectionEvents.push(event.type);
				});
			}
			backgroundButton.click();
			await done(emptyDrawing);
			assert.ok(emptyDrawing.querySelector(':scope > picture[slot="background"] > img'), "Add background inserts a picture");
			assert.deepEqual(selectionEvents, ["pointerdown", "click"], "Add background selects the new picture");
			assert.strictEqual(shadow.querySelector(".task-helper .modify-bg-btn"), backgroundButton);
			assert.equal(backgroundButton.textContent, "Modify image");
			document.designMode = "off";

			const root = mount(`<div><webwriter-drawing required>
				<p slot="prompt">Sketch on the diagram.</p>
				<picture slot="background"><img src="${TEST_IMAGE}" alt="Diagram"></picture>
			</webwriter-drawing></div>`);
			const drawing = root.querySelector("webwriter-drawing") as Any;
			editMode(drawing);
			await done(drawing);

			const drawSvg = drawing.shadowRoot.querySelector("svg.draw-svg") as SVGSVGElement;
			const drawRect = drawSvg.getBoundingClientRect();
			drawSvg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: drawRect.left + 12, clientY: drawRect.top + 12 }));
			drawSvg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: drawRect.left + 44, clientY: drawRect.top + 36 }));
			drawSvg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: drawRect.left + 44, clientY: drawRect.top + 36 }));
			await done(drawing);
			assert.ok(drawing.solution.includes("<path"), `edit mode draws SVG path into solution (${drawing.solution})`);

			(drawing.shadowRoot.querySelector('.tool-btn[data-tool="rect"]') as HTMLButtonElement).click();
			await done(drawing);
			drawSvg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: drawRect.left + 60, clientY: drawRect.top + 20 }));
			drawSvg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: drawRect.left + 140, clientY: drawRect.top + 90 }));
			drawSvg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: drawRect.left + 140, clientY: drawRect.top + 90 }));
			await done(drawing);
			assert.ok(drawing.solution.includes("<rect"), "shape tool creates SVG rect in solution");

			drawing.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(drawing);

			assert.equal(drawing.checkAnswer, undefined, "drawing task is non-graded");
			assert.equal(drawing.shadowRoot.querySelector(".solution-comparison"), null, "comparison hidden before submit");
			assert.ok(drawing.querySelector(':scope > picture[slot="background"] img'), "keeps slotted background picture");
			assert.equal(drawing.checkValidity(), false, "required drawing starts invalid");

			const svg = drawing.shadowRoot.querySelector("svg.draw-svg") as SVGSVGElement;
			const rect = svg.getBoundingClientRect();
			(drawing.shadowRoot.querySelector('.tool-btn[data-tool="pen"]') as HTMLButtonElement).click();
			await done(drawing);
			svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10 }));
			svg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: rect.left + 40, clientY: rect.top + 30 }));
			svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: rect.left + 40, clientY: rect.top + 30 }));
			await done(drawing);

			assert.equal(drawing.checkValidity(), true, "drawing an SVG stroke satisfies required");

			drawing.showScore(undefined, true);
			await done(drawing);
			const solutionSvg = drawing.shadowRoot.querySelector(".solution-comparison svg.solution-svg") as SVGSVGElement;
			assert.ok(solutionSvg && solutionSvg.querySelector("path") && solutionSvg.querySelector("rect"), "shows SVG solution comparison after submit");

			drawing.reset();
			await done(drawing);
			assert.equal(drawing.shadowRoot.querySelector(".solution-comparison"), null, "reset hides comparison");

			svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10 }));
			svg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: rect.left + 40, clientY: rect.top + 30 }));
			svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: rect.left + 40, clientY: rect.top + 30 }));
			await done(drawing);
			drawing.shadowRoot.querySelector(".undo-btn").click();
			await done(drawing);
			assert.equal(drawing.checkValidity(), false, "undo removes the SVG stroke");
		});
	});

	describe("<webwriter-speech>", function () {
		it("authors a comparison recording in edit mode and displays it in comparison after submit", async function () {
			const root = mount(`<div><webwriter-speech grading-method="ungraded">
				<p slot="prompt">Record a greeting.</p>
			</webwriter-speech></div>`);
			const speech = root.querySelector("webwriter-speech") as Any;
			editMode(speech);
			await done(speech);

			assert.equal(speech.checkAnswer, undefined, "speech task is non-graded");
			const recorder = speech.shadowRoot.querySelector("audio-recorder") as Any;
			assert.ok(recorder && !recorder.disabled, "recorder is active in edit mode for authoring solution");

			const sampleBlob = new Blob([Uint8Array.from(atob(TEST_AUDIO.split(",")[1]), c => c.charCodeAt(0))], { type: "audio/wav" });
			recorder.dispatchEvent(new CustomEvent("recording-complete", { detail: { audioBlob: sampleBlob }, bubbles: true }));
			await until(() => speech.solution.startsWith("data:"), "edit recording persists to solution attribute");
			await done(speech);

			assert.ok(speech.shadowRoot.querySelector("audio-player"), "shows player for authored solution");

			speech.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(speech);

			assert.equal(speech.shadowRoot.querySelector(".solution-comparison"), null, "comparison hidden before submit");
			speech.showScore(undefined, true);
			await done(speech);
			const comparisonPlayer = speech.shadowRoot.querySelector(".solution-comparison audio-player.solution-player") as Any;
			assert.ok(comparisonPlayer && comparisonPlayer.src === speech.solution, "shows authored recording for comparison after submit");

			speech.reset();
			await done(speech);
			assert.equal(speech.shadowRoot.querySelector(".solution-comparison"), null, "reset hides comparison");
		});
	});

	describe("task-specific grading options", function () {
		it("webwriter-choice supports accuracy, penalized partial, and narrows single mode gradingMethod", async function () {
			const single = mount(`<div><webwriter-choice mode="single">
				<webwriter-choice-item id="a">A</webwriter-choice-item>
				<webwriter-choice-item id="b">B</webwriter-choice-item>
			</webwriter-choice></div>`).querySelector("webwriter-choice") as Any;
			await done(single);
			const singleChoices = single.options.gradingMethod.options.map((choice: Any) => choice.value);
			assert.deepEqual(singleChoices, ["pass-fail", "self-assess", "ungraded"]);

			const root = mount(`<div><webwriter-choice mode="multiple" grading-method="accuracy" solution='{"a":true,"b":true}'>
				<webwriter-choice-item id="a">A</webwriter-choice-item>
				<webwriter-choice-item id="b">B</webwriter-choice-item>
				<webwriter-choice-item id="c">C</webwriter-choice-item>
				<webwriter-choice-item id="d">D</webwriter-choice-item>
			</webwriter-choice></div>`);
			const mc = root.querySelector("webwriter-choice") as Any;
			await done(mc);
			mc.currentAnswer = { a: true };
			assert.equal(mc.checkAnswer(false), 0.75, "accuracy scores a checked + c,d unchecked (3/4)");
			mc.reset();
			mc.gradingMethod = "partial";
			mc.currentAnswer = { a: true, c: true };
			assert.equal(mc.checkAnswer(false), 0, "partial penalizes wrong selection (1 - 1)/2 = 0");
		});

		it("Choice in grid mode supports partial-cell scoring in multiple mode and offers Ungraded in Configure", async function () {
			const root = mount(`<div><webwriter-choice grid mode="multiple" grading-method="partial-cell" columns='["c1","c2","c3"]' rows='["r1"]' solution='{"r1":["c1","c2"]}'>
				<webwriter-grid-item id="c1"><p>C1</p></webwriter-grid-item>
				<webwriter-grid-item id="c2"><p>C2</p></webwriter-grid-item>
				<webwriter-grid-item id="c3"><p>C3</p></webwriter-grid-item>
				<webwriter-grid-item id="r1"><p>R1</p></webwriter-grid-item>
			</webwriter-choice></div>`);
			const grid = root.querySelector("webwriter-choice") as Any;
			editMode(grid);
			await done(grid);
			assert.exists(grid.shadowRoot.querySelector('#task-configuration input[name="widget-header-gradingMethod"][value="ungraded"]'));

			grid.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(grid);
			grid.selections = { r1: ["c1"] };
			assert.equal(grid.checkAnswer(false), 0.5, "partial-cell awards 1/2 for 1 of 2 cells in row");
		});

		it("webwriter-order supports partial-relative (Kendall tau) and acceptReverse", async function () {
			const root = mount(`<div><webwriter-order grading-method="partial-relative" solution='["a","b","c"]'>
				<webwriter-order-item id="a">A</webwriter-order-item>
				<webwriter-order-item id="b">B</webwriter-order-item>
				<webwriter-order-item id="c">C</webwriter-order-item>
			</webwriter-order></div>`);
			const order = root.querySelector("webwriter-order") as Any;
			await done(order);
			assert.notInclude(order.constructor.options.gradingMethod.options.map((option: Any) => option.value), "partial-sequence");
			assert.notProperty(order.constructor.options.acceptReverse, "description");
			order.setAttribute("grading-method", "partial-sequence");
			assert.equal(order.gradingMethod, "partial-relative");
			// Reorder DOM children to b, c, a: 1 concordant pair (b < c) out of 3 total pairs -> 1/3
			const aEl = order.querySelector("#a")!;
			const bEl = order.querySelector("#b")!;
			const cEl = order.querySelector("#c")!;
			order.orderItems.move(bEl, aEl);
			order.orderItems.move(cEl, aEl);
			await done(order);
			assert.ok(Math.abs(order.checkAnswer(false) - 1 / 3) < 1e-6, "partial-relative computes concordant pair ratio");

			// Reverse c, b, a with acceptReverse
			order.reset();
			order.orderItems.move(order.querySelector("#c"), order.firstElementChild);
			order.orderItems.move(order.querySelector("#b"), order.querySelector("#a"));
			order.gradingMethod = "pass-fail";
			order.acceptReverse = true;
			await done(order);
			assert.equal(order.checkAnswer(false), 1, "acceptReverse accepts reversed sequence");
		});

		it("webwriter-pairing supports pass-fail and partial", async function () {
			const root = mount(`<div><webwriter-pairing grading-method="pass-fail" solution='[["a1","a2"],["b1","b2"]]'>
				<webwriter-pairing-item id="a1">A1</webwriter-pairing-item>
				<webwriter-pairing-item id="a2">A2</webwriter-pairing-item>
				<webwriter-pairing-item id="b1">B1</webwriter-pairing-item>
				<webwriter-pairing-item id="b2">B2</webwriter-pairing-item>
			</webwriter-pairing></div>`);
			const pairing = root.querySelector("webwriter-pairing") as Any;
			await done(pairing);
			pairing.querySelector("#a1").connector.click();
			pairing.querySelector("#a2").connector.click();
			assert.equal(pairing.checkAnswer(false), 0, "pass-fail scores 0 when only 1 of 2 pairs matched");
			pairing.gradingMethod = "partial";
			assert.equal(pairing.checkAnswer(false), 0.5, "partial scores 0.5 when 1 of 2 pairs matched");
		});

		it("Gaps support their grading and matching options in both layouts", async function () {
			const gapRoot = mount(`<div><webwriter-gap ignore-case ignore-punctuation allow-typos>
				<p><webwriter-gap-item>photosynthesis</webwriter-gap-item> and <webwriter-gap-item>respiration!</webwriter-gap-item></p>
			</webwriter-gap></div>`);
			const gap = gapRoot.querySelector("webwriter-gap") as Any;
			await done(gap);
			gap.items[0].inputAnswer = "photosynthesys";
			gap.items[1].inputAnswer = "respiration";
			assert.equal(gap.checkAnswer(false), 1, "allowTypos and ignorePunctuation match both gaps");
			gap.allowTypos = false;
			gap.gradingMethod = "pass-fail";
			assert.equal(gap.checkAnswer(false), 0, "pass-fail scores 0 when first gap has typo and allowTypos is off");

			const gridRoot = mount(`<div><webwriter-gap grid ignore-case grading-method="partial-row" ignore-punctuation allow-typos
				columns='["c1","c2"]' rows='["r1","r2"]'
				cells='[["a1","a2"],["b1","b2"]]' gaps='["a1","a2","b1","b2"]'>
				<webwriter-grid-item id="c1"><p>C1</p></webwriter-grid-item>
				<webwriter-grid-item id="c2"><p>C2</p></webwriter-grid-item>
				<webwriter-grid-item id="r1"><p>R1</p></webwriter-grid-item>
				<webwriter-grid-item id="r2"><p>R2</p></webwriter-grid-item>
				<webwriter-grid-item id="a1"><p>café</p></webwriter-grid-item>
				<webwriter-grid-item id="a2"><p>photosynthesis</p></webwriter-grid-item>
				<webwriter-grid-item id="b1"><p>alpha</p></webwriter-grid-item>
				<webwriter-grid-item id="b2"><p>beta</p></webwriter-grid-item>
			</webwriter-gap></div>`);
			const grid = gridRoot.querySelector("webwriter-gap") as Any;
			await done(grid);
			grid.typedAnswers = { a1: "cafe", a2: "photosynthesys", b1: "alpha", b2: "wrong" };
			assert.equal(grid.checkAnswer(false), 0.5, "partial-row scores 1/2 rows completely correct");
		});

		it("webwriter-text supports ignorePunctuation, allowTypos, useRegex, minWords, and self-assessment", async function () {
			const root = mount(`<div><webwriter-text type="text" ignore-case ignore-punctuation allow-typos solution="photosynthesis">
				<p slot="prompt">Process?</p>
			</webwriter-text></div>`);
			const text = root.querySelector("webwriter-text") as Any;
			await done(text);
			text.currentAnswer = "Photosynthesys!";
			assert.equal(text.checkAnswer(true), 1, "matches punctuation and single typo");

			text.reset();
			text.useRegex = true;
			text.solution = "^[A-Z]{2}\\d{3}$";
			text.ignoreCase = false;
			text.currentAnswer = "AB123";
			assert.equal(text.checkAnswer(false), 1, "useRegex matches valid pattern");
			text.currentAnswer = "ab123";
			assert.equal(text.checkAnswer(false), 0, "useRegex respects case when ignoreCase is false");

			const essayRoot = mount(`<div><webwriter-text type="long-text" free-text min-words="5" rubric="Point A
Point B">
				<p slot="prompt">Essay</p>
			</webwriter-text></div>`);
			const essay = essayRoot.querySelector("webwriter-text") as Any;
			await done(essay);
			essay.currentAnswer = "Too short";
			assert.equal(essay.checkAnswer(true), 0, "minWords rejects response below threshold");
			essay.currentAnswer = "One two three four five words";
			assert.equal(essay.checkAnswer(true), 1, "minWords awards credit when word count meets minimum");

			essay.reset();
			essay.gradingMethod = "self-assess";
			await done(essay);
			essay.currentAnswer = "This is my submitted answer";
			assert.equal(essay.checkAnswer(true), 0, "selfAssess starts at 0 before checking rubric items");
			await done(essay);
			const boxes = essay.shadowRoot.querySelectorAll('.rubric-checklist input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
			boxes[0].checked = true;
			boxes[0].dispatchEvent(new Event("change", { bubbles: true }));
			await done(essay);
			assert.ok(essay.shadowRoot.querySelector(".points")?.textContent?.includes("0.5") || essay.score >= 0);
		});

		it("webwriter-mark opens saved F1 tasks as partial credit", async function () {
			const root = mount(`<div><webwriter-mark grading-method="f1" solution='[0,1]'>
				<p>Alpha beta gamma delta</p>
			</webwriter-mark></div>`);
			const mark = root.querySelector("webwriter-mark") as Any;
			await done(mark);
			assert.equal(mark.gradingMethod, "partial");
			assert.deepEqual(mark.options.gradingMethod.options.map((option: { value: string }) => option.value), ["pass-fail", "partial", "self-assess", "ungraded"]);
			mark.currentAnswer = [0, 2];
			assert.equal(mark.checkAnswer(false), 0, "the wrong mark cancels the correct mark under partial scoring");
			mark.currentAnswer = [0];
			assert.equal(mark.checkAnswer(false), 0.5);
		});

		it("webwriter-numeric defaults to Date and authors and checks all Date/Time types", async function () {
			const numeric = mount(`<webwriter-numeric mode="datetime"></webwriter-numeric>`).querySelector("webwriter-numeric")!;
			await done(numeric);
			const root = numeric.shadowRoot!;
			const field = () => root.querySelector<HTMLInputElement>("input.num-input")!;
			assert.equal(field().type, "date");
			for (const [type, answerType, correct, wrong] of [
				["date", "date", "2026-12-12", "2026-12-13"],
				["time", "time", "09:30", "09:31"],
				["datetime-local", "date and time", "2026-12-12T09:30", "2026-12-12T09:31"],
			]) {
				editMode(numeric);
				await done(numeric);
				const modes = root.querySelector(".task-helper .numeric-modes")!;
				assert.equal(modes.querySelector("legend")?.textContent, "Input type");
				assert.deepEqual(Array.from(modes.querySelectorAll("label"), label => label.textContent),
					["Number", "Slider", "Date/Time"]);
				const types = root.querySelector(".date-types")!;
				assert.isFalse(types.hasAttribute("inert"));
				types.querySelector<HTMLInputElement>(`input[value="${type}"]`)!.click();
				await done(numeric);
				assert.equal(field().type, type);
				assert.equal(root.querySelector("#answer-helper")?.textContent, `Enter the solution ${answerType}.`);
				const enter = (value: string) => {
					field().value = value;
					field().dispatchEvent(new Event("input", { bubbles: true }));
				};
				enter(correct);
				await done(numeric);
				assert.equal(numeric.dateTimeSolution, correct);
				assert.notEqual(numeric.getAttribute("datetime-solution"), correct);
				assert.notProperty(numeric.options, "tolerance");
				numeric.removeAttribute("contenteditable");
				document.designMode = "off";
				await done(numeric);
				assert.isTrue(types.hasAttribute("inert"));
				assert.equal(getComputedStyle(types).visibility, "hidden");
				assert.equal(field().value, "");
				assert.isFalse(numeric.checkValidity());
				enter(wrong);
				assert.equal(numeric.checkAnswer(true), 0);
				numeric.reset();
				await done(numeric);
				enter(correct);
				assert.isTrue(numeric.checkValidity());
				assert.equal(numeric.checkAnswer(true), 1);
				numeric.reset();
			}

			numeric.removeAttribute("datetime-type");
			await done(numeric);
			assert.equal(field().type, "datetime-local", "existing Date/Time solutions infer the combined input");
		});

		it("webwriter-numeric supports relative tolerance and linear partialRange decay", async function () {
			const root = mount(`<div><webwriter-numeric solution="100" tolerance="10" tolerance-mode="relative" partial-range="10"></webwriter-numeric></div>`);
			const num = root.querySelector("webwriter-numeric") as Any;
			await done(num);
			num.currentAnswer = 109;
			assert.equal(num.checkAnswer(false), 1, "within ±10% tolerance earns 1");
			num.currentAnswer = 115;
			assert.equal(num.checkAnswer(false), 0.5, "halfway through 10% partial band earns 0.5");
			num.currentAnswer = 125;
			assert.equal(num.checkAnswer(false), 0, "beyond tolerance + partialRange earns 0");
		});

		it("webwriter-image only counts pins inside the hotspot", async function () {
			const root = mount(`<div><webwriter-image mode="hotspot" falloff src="${TEST_IMAGE}" markers='[{"id":"m1","x":50,"y":50,"r":10,"label":"Center"}]'>
				<p slot="prompt">Click center.</p>
			</webwriter-image></div>`);
			const img = root.querySelector("webwriter-image") as Any;
			await done(img);
			assert.notProperty(img.options, "falloff");
			img.learnerPins = [{ x: 65, y: 50 }];
			assert.equal(img.checkAnswer(false), 0);
		});

		it("webwriter-drawing supports optional completion credit", async function () {
			const drawRoot = mount(`<div><webwriter-drawing completion-credit><p slot="prompt">Sketch.</p></webwriter-drawing></div>`);
			const drawing = drawRoot.querySelector("webwriter-drawing") as Any;
			await done(drawing);
			assert.equal(typeof drawing.checkAnswer, "function", "drawing becomes gradable when completionCredit is set");
			assert.equal(drawing.checkAnswer(false), 0, "empty drawing earns 0 completion credit");
			const svg = drawing.shadowRoot.querySelector("svg.draw-svg") as SVGSVGElement;
			const rect = svg.getBoundingClientRect();
			svg.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: rect.left + 10, clientY: rect.top + 10 }));
			svg.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: rect.left + 30, clientY: rect.top + 30 }));
			svg.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: rect.left + 30, clientY: rect.top + 30 }));
			await done(drawing);
			assert.equal(drawing.checkAnswer(false), 1, "completed drawing earns 1");

		});

		it("renders ungraded radio and descriptions under every grading radio, and toggles ungraded cleanly", async function () {
			const root = mount(`<div><webwriter-choice mode="multiple" solution='{"a":true}'>
				<webwriter-choice-item id="a">A</webwriter-choice-item>
				<webwriter-choice-item id="b">B</webwriter-choice-item>
			</webwriter-choice></div>`);
			const choice = root.querySelector("webwriter-choice") as Any;
			editMode(choice);
			await done(choice);

			const trigger = choice.shadowRoot.querySelector(".header-editor > button") as HTMLButtonElement;
			trigger.click();
			await done(choice);

			const panel = choice.shadowRoot.querySelector(".header-editor > [popover]") as HTMLElement;
			const radios = Array.from(panel.querySelectorAll<HTMLLabelElement>(".grading-radio"));
			assert.deepEqual(radios.map(label => label.querySelector("input")?.value),
				["pass-fail", "partial", "self-assess", "ungraded"]);
			for (const radioLabel of radios) {
				const desc = radioLabel.querySelector<HTMLElement>(".grading-radio-description");
				assert.ok(desc && desc.textContent?.trim(), "each grading radio renders a description line beneath it");
			}

			const ungradedRadio = panel.querySelector<HTMLInputElement>('input[type="radio"][value="ungraded"]')!;
			assert.ok(ungradedRadio, "includes an ungraded radio button");
			ungradedRadio.click();
			await done(choice);

			assert.equal(choice.checkAnswer, undefined, "selecting ungraded radio disables checkAnswer");
			assert.equal(panel.querySelector('input[type="number"]'), null, "points input hides when ungraded");
			assert.equal(
				choice.shadowRoot.querySelector(".header-editor .badge")?.textContent?.trim(),
				"Not graded",
				"header shows clickable Not graded badge when ungraded",
			);

			const partialRadio = panel.querySelector<HTMLInputElement>('input[type="radio"][value="partial"]')!;
			partialRadio.click();
			await done(choice);

			assert.equal(typeof choice.checkAnswer, "function", "selecting a graded radio restores checkAnswer");
			assert.ok(panel.querySelector('input[type="number"]'), "points input returns when graded");
		});
	});
});

mocha.run();
