/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import { widgetDeclarations, widgetOptionType } from "@webwriter/lit";
import { findQuizTypeById, registerQuizType } from "../src/model/quiz-api";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-true-false";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
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
import type { WebwriterSpeech } from "../src/widgets/webwriter-speech";
import "../src/widgets/webwriter-mark";
import "../src/widgets/webwriter-quiz-feedback";
import "../src/widgets/webwriter-quiz-hint";
import "../src/widgets/webwriter-quiz-results";
import type { WebwriterQuizResults } from "../src/widgets/webwriter-quiz-results";
import { WebwriterTask } from "../src/components/webwriter-task";
import { messageFor } from "../src/components/localization";
import "../src/widgets/webwriter-text";
import "../src/widgets/webwriter-dictation";
import "../src/widgets/webwriter-image-placements";
import { centre, until, type Any } from "./helpers";
import editingConfig from "../editing-config.json";
import { exports as packageExports } from "../package.json";

const insertedChoiceMarkup = `<webwriter-choice><p></p>
	<webwriter-choice-item><p></p></webwriter-choice-item>
	<webwriter-choice-item><p></p></webwriter-choice-item>
</webwriter-choice>`;

const taskSections: [string, string[]][] = [
	["Select", ["Single/Multiple Choice", "True/False", "Highlights"]],
	["Write", ["Text", "Number", "Gap text", "Dictation"]],
	["Arrange", ["Sequence", "Pairing", "Groups"]],
	["Speak", ["Voice recording"]],
	["Draw", ["Image Hotspots", "Image Placements", "Sketch"]],
];

function action(element: HTMLElement, label: string) {
	const methods = element as unknown as Record<string, () => void> & {
		actions: Record<string, { label: string }>;
	};
	const name = Object.keys(methods.actions).find(name => methods.actions[name].label === label);
	assert.ok(name, `Missing drawer action ${label}`);
	methods[name]();
}

async function settleUpdates() {
	// WebWriter runs package tests in an offscreen frame that may skip animation frames.
	await new Promise(resolve => setTimeout(resolve, 0));
}

function addPrompt(task: HTMLElement, text = "") {
	const prompt = document.createElement("p");
	prompt.slot = "prompt";
	prompt.textContent = text;
	task.prepend(prompt);
	return prompt;
}

function clickButton(root: ShadowRoot, label: string) {
	const button = Array.from(root.querySelectorAll("sl-button, sl-menu-item, button"))
		.find(button => button.textContent.trim() === label || button.getAttribute("aria-label") === label);
	assert.ok(button instanceof HTMLElement, `Missing button ${label}`);
	button.click();
}

function addHint(task: HTMLElement) {
	const hint = task.shadowRoot!.querySelector(".add-hint")!;
	clickButton(hint.shadowRoot!, "Add Hint");
}

async function authoring(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	const results = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	fixture.append(results);
	await results.updateComplete;
	assert.ok(!results.hasAttribute("hide-points") && !results.hidePoints, "The absent setting must use the widget default");
	results.setAttribute("hide-points", "");
	assert.ok(results.hidePoints, "Drawer writes must update the reflected property");
	results.removeAttribute("hide-points");
	assert.ok(!results.hidePoints, "Removing an attribute must restore its default");

	assert.ok(!results.shadowRoot!.querySelector(".add-question"), "The results card does not insert questions");
	// What the editor inserts for Single/Multiple Choice, placed before the card.
	results.insertAdjacentHTML("beforebegin", insertedChoiceMarkup);
	await settleUpdates();
	const first = fixture.firstElementChild as Any;
	await first.updateComplete;
	await settleUpdates();
	assert.ok(first?.matches("webwriter-choice") && first.mode === "multiple" && results.tasks.includes(first),
		"An inserted question is multiple choice and belongs to the results card after it");
	assert.ok(first.firstElementChild?.matches('p[slot="prompt"]'), "New questions get a slotted native paragraph as prompt");
	assert.ok(first.shadowRoot!.querySelector(".title")?.textContent === "#1", "The questions of a results card are numbered");

	class ExternalTask extends WebwriterTask {
		checkValidity() { return true; }
		reset() {}
		protected renderAnswer() { return "External answer"; }
	}
	customElements.define("fixture-external-type", ExternalTask);
	registerQuizType({
		id: "fixture-external-type", packageId: "fixture", icon: "", getName: () => "External type",
		createInstance: () => document.createElement("fixture-external-type") as ExternalTask,
	});
	await settleUpdates();
	const menu = (first.shadowRoot as ShadowRoot).querySelector(".type-menu")!;
	const sections = Array.from(menu.children).slice(0, -1).map(entry => {
		const submenu = entry.querySelector('sl-menu[slot="submenu"]')!;
		assert.exists(submenu, "Categories open submenus");
		assert.notExists(submenu.querySelector("sl-menu"), "Tasks and variants share the same level");
		return [submenu.getAttribute("aria-label"), Array.from(submenu.children, item => item.textContent!.trim())];
	});
	assert.deepEqual(sections, [
		...taskSections,
		["Other tasks", ["External type"]],
	], "Each task preset is directly selectable under its section");
	assert.equal(menu.lastElementChild?.textContent?.trim(), "Task Results");
	assert.notExists(menu.lastElementChild?.querySelector("sl-menu"));
	menu.querySelector<HTMLElement>('sl-menu-item[value="select"]')!.click();
	assert.equal(fixture.firstElementChild, first, "Selecting a section leaves the task in place");

	const prompt = first.querySelector('p[slot="prompt"]') as HTMLElement;
	prompt.textContent = "Which planets are rocky?";
	first.querySelector("webwriter-choice-item p")!.textContent = "Mars";
	first.setAttribute("label", "Planets");
	first.setAttribute("points", "3");
	first.setAttribute("hide-scoring", "");
	clickButton(first.shadowRoot!, "Sequence");
	await settleUpdates();
	const order = fixture.querySelector("webwriter-order") as Any;
	assert.ok(order && !first.isConnected && order.querySelector('p[slot="prompt"]') === prompt &&
		order.getAttribute("label") === "Planets" && order.getAttribute("points") === "3" && order.hasAttribute("hide-scoring"),
		"Switching the type keeps the prompt, the label, the points and scoring visibility");
	assert.ok(order.querySelector("webwriter-order-item")?.textContent === "Mars" && order.solution.length === 2,
		"Choice options become order items in their authored order");
	assert.equal(order.shadowRoot!.querySelector(".helper").textContent, "Arrange the items in the correct order.");

	order.querySelector("webwriter-order-item:last-of-type")!.remove();
	clickButton(order.shadowRoot!, "Single/Multiple Choice");
	await settleUpdates();
	const choice = fixture.querySelector("webwriter-choice") as Any;
	assert.deepEqual(Array.from(choice.querySelectorAll(":scope > webwriter-choice-item") as NodeListOf<HTMLElement>, item => item.textContent),
		["Mars", ""], "Converting a one-item order adds a blank second choice");
	assert.notExists(choice.shadowRoot!.querySelector('#task-configuration input[name="widget-header-mode"]'),
		"Choice mode is controlled by the inline Single choice switch");

	const authorInstructions: Record<string, string> = {
		"True/False": "Select the correct answer.",
		Text: "Enter the solution.",
		Highlights: "Right-click to mark the solution.",
		"Voice recording": "Record the solution or enter its transcript.",
		"Gap text": "Select the solution text for each gap.",
		Dictation: "Add audio and enter the solution transcript.",
		Number: "Enter the solution number.",
		"Pairing": "Connect the matching items.",
		Groups: "Place each item in its correct group.",
		"Image Hotspots": "solution hotspots",
		"Image Placements": "solution zones",
	};
	let current: Any = choice;
	for (const label of ["True/False", "Text", "Highlights", "Voice recording", "Gap text", "Dictation", "Number", "Pairing", "Groups", "Image Hotspots", "Image Placements", "Sketch", "External type"]) {
		clickButton(current.shadowRoot!, label);
		await settleUpdates();
		current = results.previousElementSibling;
		assert.ok(current.contains(prompt), `Switching to ${label} keeps the prompt`);
		if (label === "Text") assert.ok(current.hasAttribute("ignore-case"), "New text questions ignore capitalization");
		if (label === "Gap text") {
			assert.notProperty(widgetDeclarations(current, "options"), "mode");
			assert.notExists(current.shadowRoot!.querySelector('#task-configuration input[name="widget-header-mode"]'));
		}
		if (label === "Image Hotspots") assert.notExists(current.shadowRoot!.querySelector('#task-configuration input[name="widget-header-mode"]'));
		if (authorInstructions[label]) assert.include(current.shadowRoot!.querySelector(".helper")?.textContent ?? "", authorInstructions[label], label);
		const hint = current.querySelector(':scope > webwriter-quiz-hint[slot="hint"]');
		assert.ok(current.shadowRoot!.querySelector(".add-feedback") && (hint || current.shadowRoot!.querySelector(".add-hint")),
			`${label} questions offer Add Feedback, and Add Hint while they have no hint`);
		if (label === "External type") assert.ok(hint, "The hint goes along when the type changes");
		if (label === "Pairing") {
			clickButton(current.shadowRoot!, "Add left item");
			const [left, right] = current.querySelectorAll("webwriter-pairing-column");
			assert.equal(left.querySelectorAll("webwriter-pairing-item").length, 2, "Add left item appends to the left column");
			assert.equal(right.querySelectorAll("webwriter-pairing-item").length, 1, "The right column is independent");
			await settleUpdates();
			assert.ok((current.shadowRoot!.querySelector('slot[name="prompt"]') as HTMLSlotElement).assignedElements().length === 1,
				"Pairing cards must not steal the prompt's slot");
			addHint(current);
			await settleUpdates();
			const hint = current.firstElementChild;
			assert.ok(hint?.matches('webwriter-quiz-hint[slot="hint"]') && hint.firstElementChild?.matches("p"),
				"Add Hint must insert a direct task child with an editable paragraph");
			assert.ok((current.shadowRoot!.querySelector('slot[name="hint"]') as HTMLSlotElement).assignedElements()[0] === hint,
				"A manual task slot must assign the direct hint");
		}
	}
	assert.ok(current.localName === "fixture-external-type" && current.getAttribute("points") === "3" && fixture.children.length === 2,
		"An externally registered type is a switch target, and every switch replaces the question in place");
}

/** Authors resize questions and the results card in width only; their content sets their height. */
function inlineResize() {
	const config = editingConfig as Record<string, { resize?: string }>;
	const cards = ["true-false", "choice", "order", "speech", "text", "gap", "dictation", "mark", "pairing", "categorize", "numeric", "image", "image-placements", "drawing", "quiz-results"];
	const other = cards.filter(name => config[`./widgets/webwriter-${name}`]?.resize !== "inline");
	assert.ok(!other.length, `Every question resizes in width only: ${other.join()}`);
}

/** The editor's package button inserts the first insertable member; the others are in its submenu. */
function insertableMembers() {
	const config = editingConfig as Record<string, { category?: Record<string, string>; uninsertable?: boolean; label?: Record<string, string> }>;
	const insertable = Object.keys(packageExports)
		.filter(key => key.startsWith("./snippets/") || (key.startsWith("./widgets/") && !key.endsWith(".icon.svg")))
		.map(key => key.replace(/\.(\*|html)$/, ""))
		.filter(key => !config[key]?.uninsertable);
	assert.equal(insertable[0], "./snippets/choice", "The package button inserts a multiple choice task with its two starter options");
	assert.equal(config["."].label?._, "Tasks");
	const standaloneGrids = /^(?:\.\/widgets\/webwriter-|\.\/snippets\/)(?:choice|gap|sort)-grid(?:[.-]|$)/;
	assert.deepEqual(Object.keys(packageExports).filter(key => standaloneGrids.test(key)), []);
	const snippets = Object.keys(packageExports).filter(key => key.startsWith("./snippets/"));
	assert.deepEqual(snippets, [
		"choice", "true-or-false", "mark", "text", "numeric", "gap", "dictation", "order", "pairing", "categorize", "speech", "image", "image-placements", "drawing", "about-webwriter",
	].map(name => `./snippets/${name}.html`));
	assert.deepEqual(insertable.map(member => [config[member].category?._, config[member].label?._]), [
		...taskSections.flatMap(([category, labels]) => labels.map(label => [category, label])),
		[undefined, "Task Results"],
		[undefined, "About WebWriter quiz"],
	], "The insertion list shows each preset once and ends with results and the example");
	const trueFalse = findQuizTypeById("webwriter-true-false-choice")!;
	for (const locale of ["en", "it", "nl"]) {
		const label = config["./snippets/true-or-false"].label?.[locale];
		assert.equal(config["./widgets/webwriter-true-false"].label?.[locale], label);
		assert.equal(trueFalse.getName(locale), label);
		assert.equal(messageFor(locale)("Task Results"), config["./widgets/webwriter-quiz-results"].label?.[locale]);
	}
}

async function insertedQuestion(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	// What the editor inserts for Single/Multiple Choice: its required paragraphs, without slots.
	fixture.innerHTML = insertedChoiceMarkup;
	const choice = fixture.firstElementChild as Any;
	await settleUpdates();
	await choice.updateComplete;
	const prompt = choice.firstElementChild as HTMLElement;
	assert.ok(prompt.slot === "prompt", "The first paragraph becomes the prompt");
	assert.ok(choice.shadowRoot!.querySelector('slot[name="prompt"]').assignedElements()[0] === prompt &&
		!choice.shadowRoot!.querySelector("slot:not([name])").assignedElements().includes(prompt),
		"The prompt shows in the prompt slot, not among the options");
	assert.lengthOf(choice.shadowRoot!.querySelector("slot:not([name])").assignedElements(), 2);
	assert.equal(getComputedStyle(prompt).getPropertyValue("--ww-placeholder").trim(), '"Task/question"');
	assert.ok(choice.shadowRoot!.querySelector(".quiz-header > .edit-toolbar .type-switch") && !choice.shadowRoot!.querySelector(".task-prompt .type-switch"),
		"The type switch ends the header line, and the prompt wraps as learners see it");
}

/**
 * Edit mode only adds controls: each question of a quiz is laid out as learners see it. Feedback,
 * which learners see after checking, is left out here; it comes after the buttons in both modes.
 * Every question has its top row, on its own and in a quiz.
 */
async function editParity() {
	const prompt = `<p slot="prompt">A prompt long enough to wrap in a narrow card, where a control beside it would change the lines.</p>`;
	const hint = `<webwriter-quiz-hint slot="hint"><p>A hint</p></webwriter-quiz-hint>`;
	const questions = {
		"true/false": `<webwriter-true-false solution="false">${hint}${prompt}</webwriter-true-false>`,
		"multiple choice": `<webwriter-choice solution='{"c1":true}'>${prompt}<webwriter-choice-item id="c1"><p>Headings and paragraphs</p></webwriter-choice-item><webwriter-choice-item id="c2"><p>Programs that readers have to install first</p></webwriter-choice-item></webwriter-choice>`,
		"order": `<webwriter-order>${prompt}<webwriter-order-item id="o1"><p>First</p></webwriter-order-item><webwriter-order-item id="o2"><p>Second</p></webwriter-order-item></webwriter-order>`,
		"text": `<webwriter-text type="text" solution="browser">${prompt}</webwriter-text>`,
		"text with limits": `<webwriter-text rows="3" max-words="20" max-characters="150" solution="browser">${prompt}</webwriter-text>`,
		"text with rubric and feedback": `<webwriter-text grading-method="self-assess" rubric="Include an example">${prompt}
			<webwriter-quiz-feedback slot="feedback"><p>Feedback</p></webwriter-quiz-feedback></webwriter-text>`,
		"date/time": `<webwriter-numeric mode="datetime" datetime-solution="2026-11-24T10:00">${prompt}</webwriter-numeric>`,
		"slider": `<webwriter-numeric mode="slider" solution="14" tolerance="2" unit="m/s">${prompt}</webwriter-numeric>`,
		"mark": `<webwriter-mark solution="[1]">${prompt}<p>Authors arrange headings and images.</p></webwriter-mark>`,
		"gap": `<webwriter-gap>${prompt}<p>Authors work in <webwriter-gap-item>edit</webwriter-gap-item> mode.</p></webwriter-gap>`,
		"drag-and-drop gap": `<webwriter-gap mode="drag-and-drop">${prompt}<p>A <webwriter-gap-item>theme</webwriter-gap-item> styles the page, while a <webwriter-gap-item>snippet</webwriter-gap-item> inserts prepared content.</p></webwriter-gap>`,
		"voice recording": `<webwriter-speech>${prompt}</webwriter-speech>`,
		"drawing": `<webwriter-drawing>${prompt}</webwriter-drawing>`,
	};
	const containers = ["true", "false"].map(editable => {
		const container = document.createElement("div");
		container.contentEditable = editable;
		document.body.append(container);
		return container;
	});
	const cases = Object.entries(questions).flatMap(([name, markup]) => [
		{ name: `${name} on its own`, markup, width: 320 },
		{ name: `${name} in a quiz`, markup: markup + "<webwriter-quiz-results></webwriter-quiz-results>", width: 320 },
	]);
	cases.push({
		name: "narrow text and results cards with the task heading hidden",
		markup: questions["text with rubric and feedback"] + "<webwriter-quiz-results hide-task-title hide-points></webwriter-quiz-results>",
		width: 240,
	}, {
		name: "sequence with long words at narrow widths",
		markup: questions.order.replace("<p>First</p>", "<p>Insert a quiz into the document</p>"),
		width: 240,
	}, {
		name: "multiple choice with controls at narrow widths",
		markup: questions["multiple choice"],
		width: 240,
	});
	try {
		for (const { name, markup, width } of cases) {
			containers.forEach(container => {
				container.style.width = `${width}px`;
				container.innerHTML = markup;
			});
			await settleUpdates();
			const [edit, read] = containers.map(container => container.firstElementChild as Any);
			await edit.updateComplete; await read.updateComplete;
			await settleUpdates();
			for (const part of [".card", ".quiz-header", ".task-prompt", "hint-popup", ".answer", ".task-actions"]) {
				const [a, b] = [edit, read].map(host => {
					const element = host.shadowRoot!.querySelector(part);
					if (!element) return "none";
					const box = element.getBoundingClientRect(), origin = host.getBoundingClientRect();
					return [box.left - origin.left, box.top - origin.top, box.width, box.height].map(Math.round).join();
				});
				assert.ok(a === b, `${name}: ${part} is at ${a} in edit mode and at ${b} in read mode`);
			}
			const results = containers.map(container => container.querySelector("webwriter-quiz-results"));
			if (results[0]) {
				const [editHeight, readHeight] = results.map(card => card!.getBoundingClientRect().height);
				assert.closeTo(editHeight, readHeight, 0.5, `${name}: Task Results card height`);
			}
		}
	} finally {
		containers.forEach(container => container.remove());
	}
}

/** The menus of the toolbar and the hint close once the editor moves the selection or the focus away from them. */
async function popupsFollowEditor(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	fixture.innerHTML = `<p id="outside">Text before the question</p><webwriter-choice mode="single">
		<webwriter-quiz-hint slot="hint"><p>A hint</p></webwriter-quiz-hint><p slot="prompt">Water is wet.</p>
		<webwriter-choice-item id="yes"><p>Yes</p></webwriter-choice-item><webwriter-choice-item id="no"><p>No</p></webwriter-choice-item>
	</webwriter-choice>`;
	const choice = fixture.querySelector("webwriter-choice") as Any;
	const outside = fixture.querySelector("#outside")!.firstChild!;
	await settleUpdates();
	await choice.updateComplete;

	const items = Array.from(choice.shadowRoot!.querySelectorAll(".type-switch sl-menu[slot='submenu'] > sl-menu-item")) as Any[];
	// The external type of the authoring test has no icon.
	assert.ok(items.length > 2 && items.filter(item => item.textContent.trim() !== "External type").every(item => item.querySelector('sl-icon[slot="prefix"]')),
		"The type switch is a list of the types, each with its icon");
	assert.ok(items.filter(item => item.getAttribute("aria-current") === "true").map(item => item.textContent.trim()).join() === "Single/Multiple Choice",
		"The list marks the current type");

	// With the caret in the prompt, the card is active and its controls show.
	document.getSelection()!.collapse(choice.querySelector('p[slot="prompt"]')!.firstChild!, 1);
	await new Promise(resolve => setTimeout(resolve, 250));
	const trigger = choice.shadowRoot!.querySelector(".type-switch > button") as HTMLElement;
	const panel = choice.shadowRoot!.querySelector(".type-switch > [popover]") as HTMLElement;
	assert.closeTo(trigger.getBoundingClientRect().right,
		choice.shadowRoot!.querySelector(".quiz-header")!.getBoundingClientRect().right, 0.5);
	const following = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 20)));
	trigger.click();
	await choice.updateComplete;
	const below = trigger.getBoundingClientRect(), menu = panel.getBoundingClientRect();
	assert.ok(panel.matches(":popover-open") && trigger.getAttribute("aria-expanded") === "true",
		"The type switch opens its menu in the top layer, in front of the editor's controls");
	assert.ok(menu.top >= below.bottom && Math.abs(menu.right - below.right) < 2, "The menu opens below its trigger, at its end");
	assert.ok((choice.shadowRoot!.activeElement as Element | null)?.matches('[aria-current="true"], [data-active="true"]'), "The menu starts at the current type");
	const press = (key: string) => choice.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
	press("ArrowDown");
	assert.equal(choice.shadowRoot!.activeElement?.getAttribute("value"), "write", "The arrow keys move between sections");
	press("ArrowRight");
	await until(() => choice.shadowRoot!.activeElement?.getAttribute("value") === "webwriter-text", "Opening the section focuses its first task");
	press("Escape");
	assert.isTrue(panel.matches(":popover-open"), "Escape from a submenu keeps the top level open");
	assert.equal(choice.shadowRoot!.activeElement?.getAttribute("value"), "write", "Escape returns to the section");
	choice.shadowRoot!.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
	await choice.updateComplete;
	assert.ok(!panel.matches(":popover-open") && choice.shadowRoot!.activeElement === trigger, "Escape closes the menu and returns to its trigger");
	trigger.click();
	await following();
	document.getSelection()!.collapse(outside, 2);
	await new Promise(resolve => setTimeout(resolve, 50));
	assert.ok(!panel.matches(":popover-open"), "Moving the selection elsewhere closes the type switch");

	const popup = choice.shadowRoot!.querySelector("hint-popup") as Any;
	const prompt = choice.querySelector('p[slot="prompt"]') as HTMLElement;
	const lines = prompt.getClientRects();
	const last = lines[lines.length - 1], box = popup.getBoundingClientRect();
	assert.ok(box.left - last.right > 0 && box.left - last.right < 16 && box.top < last.bottom && box.bottom > last.top,
		`The hint follows the last word of the prompt: at ${box.left},${box.top} after ${last.right},${last.top}`);

	popup.show();
	await popup.updateComplete;
	await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 20)));
	const hintText = choice.querySelector("webwriter-quiz-hint p")!.firstChild!;
	document.getSelection()!.collapse(hintText, 1);
	await new Promise(resolve => setTimeout(resolve, 50));
	assert.ok(popup.shadowRoot.querySelector("[popover]:popover-open"), "Typing in the hint keeps it open, in the top layer");
	document.getSelection()!.collapse(outside, 1);
	await new Promise(resolve => setTimeout(resolve, 50));
	assert.ok(!popup.shadowRoot.querySelector("[popover]:popover-open"), "Moving the selection out of the hint closes it");
	// Add Option hands selection to the newly inserted answer. The other controls keep the task selected.
	const marked = (root: ShadowRoot) => root.querySelector('[data-ww-capture-selection="false"]:not(.add-option)');
	assert.ok(!marked(choice.shadowRoot!) && !marked(popup.shadowRoot),
		"The controls and popups keep the question selected in the editor while authors use them");
}

/**
 * The controls of authors show while the card is active: hovered, focused, selected by the editor,
 * or with the selection in its content. Hidden, they keep their room. The fixture sits off screen,
 * so that the pointer cannot hover it.
 */
async function editControlsFollowActivity(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	Object.assign(fixture.style, { position: "fixed", left: "-2000px", top: "0", width: "480px" });
	fixture.innerHTML = `<p id="outside">Text before the quiz</p><webwriter-choice><p slot="prompt">Water is wet.</p>
		<webwriter-choice-item id="yes"><p>Yes</p></webwriter-choice-item></webwriter-choice><webwriter-quiz-results>
		<webwriter-quiz-feedback slot="feedback"><p>Well done.</p></webwriter-quiz-feedback></webwriter-quiz-results>`;
	const choice = fixture.querySelector("webwriter-choice") as Any;
	const results = fixture.querySelector("webwriter-quiz-results") as Any;
	await settleUpdates();
	await choice.updateComplete; await results.updateComplete;
	const settle = () => new Promise(resolve => setTimeout(resolve, 300));
	const shown = (host: Any, selector: string) => getComputedStyle(host.shadowRoot.querySelector(selector)).visibility === "visible";
	const header = () => choice.shadowRoot!.querySelector(".quiz-header").getBoundingClientRect().height;

	document.getSelection()!.collapse(fixture.querySelector("#outside")!.firstChild!, 1);
	await settle();
	const idle = header();
	assert.ok(!shown(choice, ".edit-toolbar") && !shown(choice, ".configure-label") && !shown(choice, ".single-choice-switch") && !shown(results, ".edit-toolbar") && !shown(results, ".feedback-toggle"),
		"Without hover, focus or selection, the controls of authors are hidden");

	document.getSelection()!.collapse(choice.querySelector('p[slot="prompt"]')!.firstChild!, 2);
	await settle();
	assert.ok(shown(choice, ".edit-toolbar") && shown(choice, ".configure-label") && shown(choice, ".single-choice-switch") && !shown(results, ".edit-toolbar"), "The caret in the prompt shows the controls of that question only");
	assert.ok(header() === idle, "Showing the controls moves nothing");

	results.selectionStates.add("ww-element-selected");
	await settle();
	clickButton(results.shadowRoot!, "Feedback");
	document.getSelection()!.collapse(results.querySelector("webwriter-quiz-feedback p")!.firstChild!, 1);
	results.selectionStates.delete("ww-element-selected");
	await settle();
	assert.ok(shown(results, ".edit-toolbar") && shown(results, ".feedback-toggle") && !shown(choice, ".edit-toolbar"),
		"The caret in the overall feedback shows the controls of the results card");
	assert.ok(results.shadowRoot!.querySelector(".feedback-popover:popover-open"), "Editing results feedback keeps the popover open");

	document.getSelection()!.collapse(fixture.querySelector("#outside")!.firstChild!, 1);
	choice.selectionStates.add("ww-element-selected");
	await settle();
	assert.ok(shown(choice, ".edit-toolbar"), "The editor's selection of the card shows its controls");
	choice.selectionStates.delete("ww-element-selected");
	await settle();
	assert.ok(!shown(choice, ".edit-toolbar"), "The controls hide again once the card is no longer selected");
	fixture.removeAttribute("style");
}

/** In edit mode, one control opens the label and grading fields. */
async function headerEditors(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	fixture.style.width = "320px";
	fixture.innerHTML = `<webwriter-choice mode="multiple" solution='{"a":true}'><p slot="prompt">Pick one.</p>
		<webwriter-choice-item id="a"><p>Alpha</p></webwriter-choice-item><webwriter-choice-item id="b"><p>Beta</p></webwriter-choice-item></webwriter-choice>
		<webwriter-quiz-results></webwriter-quiz-results>`;
	const choice = fixture.querySelector("webwriter-choice")!;
	await settleUpdates();
	await choice.updateComplete;
	const root = choice.shadowRoot!;

	const label = root.querySelector(".header-editor > button") as HTMLElement;
	assert.ok(label?.querySelector(".title")?.textContent === "#1", "The configuration button contains the task label");
	const title = label.querySelector<HTMLElement>(".title")!;
	const titleHeight = title.getBoundingClientRect().height;
	assert.isAtMost(title.scrollWidth, title.clientWidth + 1, "A short label fits without truncation");
	label.click();
	await choice.updateComplete;
	const labelPanel = root.querySelector(".header-editor > [popover]") as HTMLElement;
	const labelInput = labelPanel.querySelector('input[type="text"]') as HTMLInputElement;
	const inlinePoints = labelPanel.querySelector('input[type="number"]') as HTMLInputElement;
	assert.lengthOf(root.querySelectorAll(".header-editor > button"), 1);
	assert.equal(label.lastElementChild?.textContent?.trim(), "Configure");
	assert.exists(label.lastElementChild?.querySelector("sl-icon"));
	assert.isBelow(labelInput.getBoundingClientRect().left, inlinePoints.getBoundingClientRect().left);
	assert.closeTo(labelInput.getBoundingClientRect().top, inlinePoints.getBoundingClientRect().top, 0.5);
	assert.equal(root.activeElement, labelInput);
	await new Promise(resolve => setTimeout(resolve, 60));
	const panelBackground = labelPanel.querySelector(".header-options")!;
	panelBackground.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
	labelInput.blur();
	panelBackground.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, composed: true }));
	await settleUpdates();
	assert.isTrue(labelPanel.matches(":popover-open"), "Clicking the panel background does not dismiss the popup");
	assert.ok(labelPanel.matches(":popover-open") && labelInput?.placeholder === "#1", "Clicking it opens a field with the numbered label as its placeholder");
	labelInput.value = "Warm-up";
	const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true });
	labelInput.dispatchEvent(enter);
	await settleUpdates();
	assert.ok(choice.getAttribute("label") === "Warm-up" && root.querySelector(".title")?.textContent === "Warm-up" && !labelPanel.matches(":popover-open"),
		"Enter sets the label on the question and closes the field");
	assert.ok(enter.defaultPrevented, "Enter is consumed before reaching the configuration button");
	label.click();
	await choice.updateComplete;
	labelInput.value = "";
	labelInput.dispatchEvent(new Event("change", { bubbles: true }));
	await settleUpdates();
	assert.ok(!choice.hasAttribute("label") && root.querySelector(".title")?.textContent === "#1", "An empty label brings the number back");
	document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));

	const points = label;
	assert.ok(points.querySelector(".max-points")?.textContent?.trim() === "1 point", "The same configuration button contains the points");
	points.click();
	await choice.updateComplete;
	const gradingPanel = labelPanel;
	assert.ok(gradingPanel.matches(":popover-open"), "The common panel opens the grading fields");
	const pointsInput = gradingPanel.querySelector('input[type="number"]') as HTMLInputElement;
	pointsInput.value = "3";
	pointsInput.dispatchEvent(new Event("change", { bubbles: true }));
	await settleUpdates();
	assert.ok(choice.getAttribute("points") === "3" && points.querySelector(".max-points")?.textContent?.trim() === "3 points", "The points are set on the question");
	const partial = gradingPanel.querySelector('input[type="radio"][value="partial"]') as HTMLInputElement;
	assert.ok(partial, "The grading methods are radio buttons");
	const gradingMethods = () => Array.from(root.querySelectorAll<HTMLInputElement>('input[name="widget-header-gradingMethod"]'), input => input.value);
	assert.deepEqual(gradingMethods(), ["pass-fail", "partial", "self-assess", "ungraded"], "Multiple choice offers only supported grading methods");
	partial.click();
	await settleUpdates();
	assert.ok(choice.getAttribute("grading-method") === "partial", "The grading method is set on the question");
	const longLabel = "A deliberately long task label that exceeds the space available in the card header";
	choice.setAttribute("label", longLabel);
	await settleUpdates();
	assert.closeTo(title.getBoundingClientRect().height, titleHeight, 0.5, "Long labels stay on one line");
	assert.isAbove(title.scrollWidth, title.clientWidth, "Only the part that does not fit is clipped");
	assert.equal(labelInput.value, longLabel, "The configuration field shows the full label");

	choice.mode = "single";
	await settleUpdates();
	assert.deepEqual(gradingMethods(), ["pass-fail", "self-assess", "ungraded"]);
	fixture.contentEditable = "false";
	await settleUpdates();
	assert.ok(!root.querySelector(".header-editor, .configure-label") && root.querySelector(".quiz-header .max-points")?.textContent?.trim() === "3 points",
		"Learners read the label and points as text");

	// True/False hides its own radio inputs visually; those rules must not hide the header option fields.
	fixture.contentEditable = "true";
	fixture.innerHTML = `<webwriter-true-false><p slot="prompt">Water is wet.</p></webwriter-true-false><webwriter-quiz-results></webwriter-quiz-results>`;
	const trueFalse = fixture.querySelector("webwriter-true-false") as Any;
	await settleUpdates();
	await trueFalse.updateComplete;
	assert.ok(trueFalse.options?.label && trueFalse.options?.points, "True/False exposes label and points options");
	const tfRoot = trueFalse.shadowRoot!;
	const tfLabel = tfRoot.querySelector(".header-editor > button") as HTMLElement;
	tfLabel.click();
	await trueFalse.updateComplete;
	const tfLabelInput = tfRoot.querySelector(".header-editor > [popover] input") as HTMLInputElement;
	const tfLabelStyle = getComputedStyle(tfLabelInput);
	assert.ok(tfLabelStyle.opacity === "1" && tfLabelStyle.pointerEvents !== "none" && tfLabelStyle.position !== "absolute" && tfLabelInput.getBoundingClientRect().height > 0,
		"True/False label input is visible and interactive");
	tfLabelInput.value = "Bonus";
	tfLabelInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true }));
	await settleUpdates();
	assert.ok(trueFalse.getAttribute("label") === "Bonus" && tfRoot.querySelector(".title")?.textContent === "Bonus",
		"True/False sets its label from the header editor");
	const tfPoints = tfRoot.querySelector(".header-editor > button") as HTMLElement;
	tfPoints.click();
	await trueFalse.updateComplete;
	const tfPointsInput = tfRoot.querySelector('.header-editor > [popover] input[type="number"]') as HTMLInputElement;
	const tfPointsStyle = getComputedStyle(tfPointsInput);
	assert.ok(tfPointsStyle.opacity === "1" && tfPointsStyle.pointerEvents !== "none" && tfPointsStyle.position !== "absolute" && tfPointsInput.getBoundingClientRect().height > 0,
		"True/False points input is visible and interactive");
	tfPointsInput.value = "2";
	tfPointsInput.dispatchEvent(new Event("change", { bubbles: true }));
	await settleUpdates();
	assert.ok(trueFalse.getAttribute("points") === "2" && tfPoints.querySelector(".max-points")?.textContent?.trim() === "2 points",
		"True/False sets its points from the header editor");
}

/** The text the widgets generate cannot be selected; authored content and the fields learners type in can. */
async function generatedTextUnselectable(fixture: HTMLElement) {
	for (const editable of ["true", "false"]) {
		fixture.contentEditable = editable;
		fixture.innerHTML = `<webwriter-choice><webwriter-quiz-hint slot="hint"><p>A hint</p></webwriter-quiz-hint><p slot="prompt">Pick one.</p>
			<webwriter-choice-item id="a"><p>Alpha</p></webwriter-choice-item></webwriter-choice>
			<webwriter-order><p slot="prompt">Sort.</p><webwriter-order-item id="o1"><p>First</p></webwriter-order-item></webwriter-order>
			<webwriter-text type="text" solution="x"><p slot="prompt">Type.</p></webwriter-text>
			<webwriter-quiz-results><webwriter-quiz-feedback slot="feedback"><p>Done.</p></webwriter-quiz-feedback></webwriter-quiz-results>`;
		await settleUpdates();
		for (const element of Array.from(fixture.querySelectorAll("*")) as Any[]) await element.updateComplete;
		await settleUpdates();
		const choice = fixture.querySelector("webwriter-choice") as Any;
		const item = fixture.querySelector("webwriter-choice-item") as Any;
		const orderItem = fixture.querySelector("webwriter-order-item") as Any;
		const text = fixture.querySelector("webwriter-text") as Any;
		const results = fixture.querySelector("webwriter-quiz-results") as Any;
		const selectable = (element: Element | null) => !!element && getComputedStyle(element).userSelect !== "none";
		const mode = editable === "true" ? "edit" : "read";
		const generated = [
			choice.shadowRoot.querySelector(".quiz-header"),
			choice.shadowRoot.querySelector(".helper"),
			choice.shadowRoot.querySelector("hint-popup").shadowRoot.querySelector(".trigger"),
			item.shadowRoot.querySelector(".marker"),
			orderItem.shadowRoot.querySelector(".position"),
			results.shadowRoot.querySelector(".final-actions"),
		];
		assert.ok(generated.every(element => element && !selectable(element)), `In ${mode} mode, generated text cannot be selected`);
		const authored = [
			choice.querySelector('p[slot="prompt"]'),
			choice.querySelector("webwriter-quiz-hint p"),
			item.querySelector("p"),
			orderItem.querySelector("p"),
			results.querySelector("webwriter-quiz-feedback p"),
			text.shadowRoot.querySelector(".answer-field"),
		];
		assert.ok(authored.every(selectable), `In ${mode} mode, authored content and input fields can be selected: ${authored.map(selectable)}`);
	}
}

/** In edit mode, a question and the results card look as learners see them, with the buttons disabled. */
async function authoringPreview(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	const task = document.createElement("webwriter-true-false") as Any;
	task.style.width = "320px";
	addPrompt(task, "Does freezing water change its state or the substance it is made from?");
	fixture.append(task);
	await settleUpdates();
	const check = task.shadowRoot!.querySelector(".task-actions .check");
	assert.ok(check?.disabled && check.textContent.trim() === "Check", "A standalone question shows its Check button, disabled");

	const emptyTrigger = task.shadowRoot!.querySelector(".add-hint")!;
	const emptyFeedback = task.shadowRoot!.querySelector(".add-feedback")!;
	const prompt = task.querySelector('[slot="prompt"]')!;
	const layout = () => {
		const card = task.getBoundingClientRect();
		return [prompt, task.shadowRoot!.querySelector("hint-popup").shadowRoot.querySelector(".trigger"), check].map(element => {
			const { x, y, width, height } = element.getBoundingClientRect();
			return [x - card.left, y - card.top, width, height];
		});
	};
	const before = layout();
	assert.equal(getComputedStyle(emptyTrigger).visibility, "hidden");
	assert.equal(getComputedStyle(emptyFeedback).visibility, "hidden");
	task.selectionStates.add("ww-element-selected");
	await until(() => getComputedStyle(emptyTrigger).opacity === "0.5", "a selected task shows the vacant hint at half opacity");
	const vacantColor = getComputedStyle(emptyTrigger.shadowRoot!.querySelector(".trigger")!).color;
	assert.equal(getComputedStyle(emptyFeedback).opacity, "0.5");
	assert.deepEqual(layout(), before, "revealing Add Hint keeps the prompt and controls in place");
	addHint(task);
	await settleUpdates();
	const hint = task.querySelector(':scope > webwriter-quiz-hint[slot="hint"]') as HTMLElement;
	const popup = task.shadowRoot!.querySelector("hint-popup") as Any;
	await popup.updateComplete;
	assert.ok(popup?.hasAttribute("labelled") && popup.shadowRoot.querySelector("[popover]:popover-open"),
		"Add Hint opens the hint in its popup");
	assert.ok((task.shadowRoot!.querySelector('hint-popup > slot[name="hint"]') as HTMLSlotElement).assignedElements()[0] === hint,
		"Authors edit the hint inside the popup");
	assert.ok(!task.shadowRoot!.querySelector(".add-hint"), "Add Hint is gone while the question has a hint");
	assert.notEqual(getComputedStyle(popup.shadowRoot.querySelector(".trigger")).color, vacantColor,
		"An authored hint uses the accent color instead of the vacant control's neutral color");
	assert.deepEqual(layout(), before, "adding a hint keeps the prompt and controls in place");
	await new Promise(resolve => setTimeout(resolve, 20));
	assert.ok(document.getSelection()?.anchorNode === hint.firstElementChild, "Once the click is handled, the caret is in the new hint");
	document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
	await popup.updateComplete;
	assert.ok(!popup.shadowRoot.querySelector("[popover]:popover-open"), "A press outside closes the hint");
	popup.shadowRoot.querySelector(".trigger").click();
	await popup.updateComplete;
	assert.ok(popup.shadowRoot.querySelector(".remove") && popup.shadowRoot.querySelector(".close"),
		"An open hint in edit mode shows both delete and close buttons");
	popup.shadowRoot.querySelector(".close").click();
	await popup.updateComplete;
	assert.ok(!popup.shadowRoot.querySelector("[popover]:popover-open") && hint.isConnected && task.shadowRoot!.querySelector("hint-popup"),
		"Clicking the close button closes the hint without removing it");
	popup.shadowRoot.querySelector(".trigger").click();
	await popup.updateComplete;
	popup.shadowRoot.querySelector(".remove").click();
	await settleUpdates();
	assert.ok(!hint.isConnected && task.shadowRoot!.querySelector("hint-popup.add-hint"),
		"Removing the hint in its popup brings Add Hint back");
	assert.deepEqual(layout(), before, "removing a hint keeps the same layout");

	clickButton(task.shadowRoot!, "Add Feedback");
	await settleUpdates();
	const feedback = task.querySelector(':scope > webwriter-quiz-feedback[slot="feedback"]')!;
	const feedbackPanel = task.shadowRoot!.querySelector(".feedback-popover:popover-open") as HTMLElement | null;
	assert.ok(feedbackPanel?.querySelector<HTMLSlotElement>('slot[name="feedback"]')?.assignedElements()[0] === feedback,
		"Add Feedback opens the original editable content in the top layer");
	assert.ok(check.nextElementSibling?.matches(".feedback-toggle"), "The Feedback control is beside Check");
	assert.isFalse(check.nextElementSibling!.matches(".vacant"));
	(feedbackPanel!.querySelector(".remove-feedback") as HTMLElement).click();
	await settleUpdates();
	assert.ok(!feedback.isConnected && check.nextElementSibling?.matches(".feedback-toggle.add-feedback.vacant"),
		"Removing feedback restores the inline add control");

	const results = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	fixture.append(results);
	await settleUpdates();
	const submit = results.shadowRoot!.querySelector(".final-actions .submit") as Any;
	const reset = results.shadowRoot!.querySelector(".final-actions .reset") as Any;
	assert.ok(submit?.disabled && reset?.disabled && submit.nextElementSibling === reset,
		"The results card shows Submit and, beside it, Reset answers, disabled");
	assert.ok(results.shadowRoot!.querySelector(".final-actions > .edit-toolbar .author-note"), "The count of questions ends the row of buttons");
	assert.equal(task.shadowRoot!.querySelector(".task-actions .task-progress")?.textContent, "1/1 tasks",
		"A grouped task shows its position and total in the bottom row");
	clickButton(results.shadowRoot!, "Add Feedback");
	await settleUpdates();
	const overall = results.querySelector(':scope > webwriter-quiz-feedback[slot="feedback"]')!;
	assert.ok(results.shadowRoot!.querySelector<HTMLSlotElement>('.feedback-popover:popover-open slot[name="feedback"]')!.assignedElements()[0] === overall,
		"Add Feedback opens the authored feedback on the results card");
	assert.ok(reset.nextElementSibling?.matches(".feedback-toggle"), "The Feedback control follows Reset answers");
	assert.ok(!results.shadowRoot!.querySelector(".add-feedback"), "Add Feedback is gone while the card has feedback");

	const emptyHint = Object.assign(document.createElement("webwriter-quiz-hint"), { slot: "hint" });
	task.prepend(emptyHint);
	fixture.contentEditable = "false";
	await settleUpdates();
	await task.shadowRoot!.querySelector("hint-popup")?.updateComplete;
	assert.ok(!task.shadowRoot!.querySelector("hint-popup")?.shadowRoot.querySelector("[popover]"), "Learners do not see an empty hint");

	emptyHint.innerHTML = "<p>Read the prompt carefully.</p>";
	fixture.contentEditable = "true";
	await settleUpdates();
	fixture.contentEditable = "false";
	await settleUpdates();
	const learnerPopup = task.shadowRoot!.querySelector("hint-popup") as Any;
	await learnerPopup.updateComplete;
	learnerPopup.shadowRoot.querySelector(".trigger").click();
	await learnerPopup.updateComplete;
	assert.ok(learnerPopup.shadowRoot.querySelector("[popover]:popover-open"), "Learners can open a non-empty hint");
	assert.ok(!learnerPopup.shadowRoot.querySelector(".remove") && learnerPopup.shadowRoot.querySelector(".close"),
		"Learners see the close button without a delete button");
	learnerPopup.shadowRoot.querySelector(".close").click();
	await learnerPopup.updateComplete;
	assert.ok(!learnerPopup.shadowRoot.querySelector("[popover]:popover-open") && emptyHint.isConnected,
		"Learners can close the hint without removing it");
}

async function languages(fixture: HTMLElement) {
	const hidePointsLabel = (results: WebwriterQuizResults) => results.options!.hidePoints.label as string;
	const questionLabels = (task: Element) =>
		Array.from(task.shadowRoot?.querySelectorAll(".type-switch sl-menu-item") ?? [], item => item.textContent!.trim());
	const first = document.createElement("webwriter-text");
	const second = document.createElement("webwriter-text");
	const german = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	const french = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	fixture.lang = "de-AT";
	french.lang = "fr-CA";
	fixture.append(first, german, second, french);
	for (let attempt = 0; attempt < 60 && (
		hidePointsLabel(german) !== "Punkte ausblenden" ||
		hidePointsLabel(french) !== "Masquer les points"
	); attempt++) await settleUpdates();
	await Promise.all([german.updateComplete, french.updateComplete]);
	assert.ok(german.getAttribute("lang") === null, "Inherited language must stay out of authored HTML");
	assert.ok(hidePointsLabel(german) === "Punkte ausblenden", "Use the inherited German drawer label");
	assert.ok(hidePointsLabel(french) === "Masquer les points", "Use the French widget override");
	assert.ok(german.shadowRoot!.textContent!.includes("Abgeben"), "Render German learner labels");
	assert.ok(french.shadowRoot!.textContent!.includes("Envoyer"), "Render French learner labels");
	fixture.lang = "en-GB";
	await settleUpdates();
	await german.updateComplete;
	assert.ok(german.getAttribute("lang") === null, "Changing the ancestor language must not add an attribute");
	assert.ok(german.shadowRoot!.textContent!.includes("Submit"), "Respond to a language change on the ancestor");
	assert.ok(french.shadowRoot!.textContent!.includes("Envoyer"), "Keep the other widget's language");

	fixture.contentEditable = "true";
	fixture.lang = "dv";
	second.lang = "zh-Hant";
	const dhivehiChoice = "އެއް އިޚްތިޔާރު / ގިނަ އިޚްތިޔާރު";
	const traditionalChineseChoice = "單選 / 多選";
	for (let attempt = 0; attempt < 60 && (
		!questionLabels(first).includes(dhivehiChoice) ||
		!questionLabels(second).includes(traditionalChineseChoice)
	); attempt++) await settleUpdates();
	assert.ok(questionLabels(first).includes(dhivehiChoice), "Use the inherited Dhivehi question type label");
	assert.ok(questionLabels(second).includes(traditionalChineseChoice), "Use the Traditional Chinese question type label in the other question");

	const filipino = document.createElement("webwriter-text");
	filipino.lang = "tl";
	fixture.append(filipino);
	const filipinoChoice = "Iisang pagpipilian / Maramihang pagpipilian";
	for (let attempt = 0; attempt < 60 && !questionLabels(filipino).includes(filipinoChoice); attempt++) {
		await settleUpdates();
	}
	assert.ok(questionLabels(filipino).includes(filipinoChoice), "Resolve the canonical Filipino locale from tl");

	fixture.contentEditable = "false";
	await settleUpdates();
	german.confirmSubmit = true;
	await german.updateComplete;
	clickButton(german.shadowRoot!, "ފޮނުވާ");
	await german.updateComplete;
	const confirmation = german.shadowRoot!.querySelector("sl-dialog[open]");
	assert.ok(confirmation?.getAttribute("label") === "ޖަވާބުތައް ފޮނުވަންތޯ؟",
		"Render the submit confirmation in the learner's language");
}

async function titleVisibility(fixture: HTMLElement) {
	const task = document.createElement("webwriter-text");
	const prompt = addPrompt(task, "The authored prompt");
	fixture.append(task);
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".quiz-header .title")?.textContent === "#1" &&
		task.shadowRoot!.querySelector(".quiz-header .max-points")?.textContent?.trim() === "1 point" &&
		task.shadowRoot!.querySelector(".task-actions .check"),
		"A question without a results card stands alone: its top row shows #1 and its points, and it has its own Check button");
	const results = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	fixture.append(results);
	await settleUpdates();
	assert.equal(task.shadowRoot!.querySelector(".title")?.textContent, "#1");
	assert.equal(task.shadowRoot!.querySelector(".task-actions .task-progress")?.textContent, "1/1 tasks");
	assert.notExists(task.shadowRoot!.querySelector(".task-actions .check"));
	results.setAttribute("hide-task-title", "");
	results.setAttribute("hide-points", "");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".quiz-header") && !task.shadowRoot!.querySelector(".title, .max-points"),
		"The top row stays when the results card hides the titles and points");
	assert.ok(task.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prompt"]')!.assignedElements()[0] === prompt,
		"The authored prompt must still be rendered");
	results.removeAttribute("hide-task-title");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".title"), "Restore the title when clearing the option");
	results.remove();
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".title")?.textContent === "#1" && task.shadowRoot!.querySelector(".task-actions .check"),
		"Removing the results card makes the question stand alone again");
	task.setAttribute("label", "Warm-up");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".title")?.textContent === "Warm-up", "An author's label replaces the number in the top row");
}

async function standalone(fixture: HTMLElement) {
	const task = document.createElement("webwriter-true-false") as Any;
	addPrompt(task, "Water is wet.");
	task.setAttribute("solution", "true");
	fixture.append(task);
	await settleUpdates();
	clickButton(task.shadowRoot!, "Check");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".task-actions .unanswered") && !task.shadowRoot!.querySelector(".result"),
		"Checking without an answer asks for one");
	task.shadowRoot!.querySelector('input[value="true"]').click();
	clickButton(task.shadowRoot!, "Check");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector('.result[data-state="correct"]') && task.shadowRoot!.querySelector(".result .points"),
		"A standalone question shows its result with the points of its top row");
	assert.ok(task.shadowRoot!.querySelector(".cell.correct"), "A standalone question shows which answer was right");
	clickButton(task.shadowRoot!, "Try again");
	await settleUpdates();
	assert.ok(!task.shadowRoot!.querySelector(".result") && !task.checkValidity() && task.shadowRoot!.querySelector(".check"),
		"Try again resets the question");
}

function assertFeedbackWidth(panel: HTMLElement) {
	const root = panel.ownerDocument.documentElement;
	const available = root.clientWidth - 16;
	const minimum = Math.min(18 * parseFloat(getComputedStyle(root).fontSize), available);
	const { left, right, width } = panel.getBoundingClientRect();
	assert.isAtLeast(width, minimum - 1, "Feedback has a readable minimum width");
	assert.isAtLeast(left, 7, "Feedback leaves room at the left edge");
	assert.isAtMost(right, root.clientWidth - 7, "Feedback leaves room at the right edge");
}

async function feedbackPopover(fixture: HTMLElement) {
	fixture.style.cssText = "position: fixed; inset: 12px auto auto 12px; width: 300px; overflow: hidden";
	fixture.contentEditable = "true";
	fixture.innerHTML = `<webwriter-choice mode="true-false" solution='{"true":true}'>
		<p slot="prompt">Water is wet.</p>
		<webwriter-quiz-feedback slot="feedback"><p>Think about how the word <em>wet</em> is used.</p></webwriter-quiz-feedback>
	</webwriter-choice>`;
	const task = fixture.firstElementChild as WebwriterTask;
	const root = task.shadowRoot!;
	await settleUpdates();
	const height = task.getBoundingClientRect().height;
	const check = root.querySelector<HTMLElement>(".check")!;
	const trigger = root.querySelector<HTMLElement>(".feedback-toggle")!;
	const panel = root.querySelector<HTMLElement>(".feedback-popover")!;
	assert.equal(getComputedStyle(trigger).visibility, "hidden", "An idle task hides its Feedback control");
	task.selectionStates.add("ww-element-selected");
	await until(() => getComputedStyle(trigger).visibility === "visible", "Selecting the task shows its Feedback control");
	assert.equal(check.nextElementSibling, trigger);
	assert.isNotNull(trigger.querySelector("sl-icon"));
	assert.equal(trigger.textContent?.trim(), "Feedback");
	trigger.click();
	await settleUpdates();
	assert.isTrue(panel.matches(":popover-open"));
	assertFeedbackWidth(panel);
	assert.equal(panel.dataset.placement, "below");
	assert.isAbove(panel.getBoundingClientRect().top, check.getBoundingClientRect().bottom);
	assert.equal(task.getBoundingClientRect().height, height);

	fixture.style.top = "auto";
	fixture.style.bottom = "6px";
	window.dispatchEvent(new Event("resize"));
	assert.equal(panel.dataset.placement, "above");
	assert.isBelow(panel.getBoundingClientRect().bottom, check.getBoundingClientRect().top);
	assert.equal(task.getBoundingClientRect().height, height);
	panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	assert.isFalse(panel.matches(":popover-open"));
	assert.equal(root.activeElement, trigger);

	fixture.contentEditable = "false";
	await settleUpdates();
	assert.notExists(root.querySelector(".feedback-toggle, .feedback-popover"));
	check.click();
	await settleUpdates();
	assert.notExists(root.querySelector(".feedback-popover"), "A task must be answered first");
	root.querySelector<HTMLInputElement>('input[value="true"]')!.click();
	check.click();
	await settleUpdates();
	const readerPanel = root.querySelector<HTMLElement>(".feedback-popover:popover-open")!;
	assert.equal(readerPanel.querySelector("slot")?.assignedElements()[0].querySelector("em")?.textContent, "wet");
	assert.notExists(readerPanel.querySelector(".remove-feedback"));
	readerPanel.querySelector<HTMLElement>(".close-feedback")!.click();
	assert.isFalse(readerPanel.matches(":popover-open"));
	check.click();
	assert.isTrue(readerPanel.matches(":popover-open"), "Check reopens feedback on a submitted task");
	root.querySelector<HTMLElement>(".retry")!.click();
	await settleUpdates();
	assert.notExists(root.querySelector(".feedback-popover"));
	assert.exists(task.querySelector("webwriter-quiz-feedback"));
}

async function resultsFeedback(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	fixture.style.cssText = "position: fixed; inset: 12px auto auto 12px; width: 320px; overflow: hidden";
	const results = document.createElement("webwriter-quiz-results");
	fixture.append(results);
	const root = results.shadowRoot!;
	await settleUpdates();
	const feedback = document.createElement("webwriter-quiz-feedback");
	feedback.slot = "feedback";
	feedback.innerHTML = "<p></p>";
	results.append(feedback);
	await settleUpdates();
	const submit = root.querySelector(".submit")!;
	const reset = root.querySelector(".reset")!;
	const trigger = root.querySelector<HTMLElement>(".feedback-toggle")!;
	const panel = root.querySelector<HTMLElement>(".feedback-popover")!;
	assert.equal(submit.nextElementSibling, reset);
	assert.equal(reset.nextElementSibling, trigger);
	assert.equal(getComputedStyle(trigger).visibility, "hidden", "An idle results card hides its Feedback control");
	results.selectionStates.add("ww-element-selected");
	await until(() => getComputedStyle(trigger).visibility === "visible", "Selecting the results card shows its Feedback control");
	const height = results.getBoundingClientRect().height;
	trigger.click();
	await settleUpdates();
	assert.isTrue(panel.matches(":popover-open"));
	assertFeedbackWidth(panel);
	assert.equal(panel.dataset.placement, "below");
	assert.isAbove(panel.getBoundingClientRect().top, submit.getBoundingClientRect().bottom);
	assert.equal(results.getBoundingClientRect().height, height);
	fixture.style.top = "auto";
	fixture.style.bottom = "6px";
	// The Submit row can wrap, so put Submit itself at the bottom of the viewport.
	fixture.style.transform = `translateY(${document.documentElement.clientHeight - 6 - submit.getBoundingClientRect().bottom}px)`;
	window.dispatchEvent(new Event("resize"));
	assert.equal(panel.dataset.placement, "above");
	assert.isBelow(panel.getBoundingClientRect().bottom, submit.getBoundingClientRect().top);
	assert.equal(results.getBoundingClientRect().height, height);
	panel.querySelector<HTMLElement>(".remove-feedback")!.click();
	await settleUpdates();
	assert.isFalse(feedback.isConnected);
	assert.notExists(root.querySelector(".feedback-popover"));
	assert.exists(root.querySelector(".feedback-toggle.add-feedback.vacant"));
}

async function groups(fixture: HTMLElement) {
	const [a, b, c, d] = ["a", "b", "c", "d"].map(() => document.createElement("webwriter-text"));
	const first = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	const second = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	const section = document.createElement("section");
	section.append(b);
	fixture.append(a, section, first, c, second);
	await settleUpdates();
	assert.ok(first.tasks.join() === [a, b].join() && second.tasks.join() === [c].join(),
		"A question belongs to the first results card after it, also inside other elements");
	const labels = (...tasks: HTMLElement[]) => tasks.map(task => task.shadowRoot!.querySelector(".title")?.textContent);
	const counts = (...tasks: HTMLElement[]) => tasks.map(task => task.shadowRoot!.querySelector(".task-progress")?.textContent);
	assert.deepEqual(labels(a, b, c), ["#1", "#2", "#1"], "Numbering starts fresh in each group");
	assert.deepEqual(counts(a, b, c), ["1/2 tasks", "2/2 tasks", "1/1 tasks"]);
	fixture.append(d);
	await settleUpdates();
	assert.ok(second.tasks.includes(d), "Tasks after the last results card belong to it");
	assert.deepEqual(labels(c, d), ["#1", "#2"]);
	b.setAttribute("label", "Warm-up");
	fixture.insertBefore(section, a);
	await settleUpdates();
	assert.deepEqual(labels(b, a, c, d), ["Warm-up", "#2", "#1", "#2"], "Manual labels survive renumbering");
	assert.deepEqual(counts(b, a, c, d), ["1/2 tasks", "2/2 tasks", "1/2 tasks", "2/2 tasks"]);
}

async function trueFalse(fixture: HTMLElement) {
	const task = document.createElement("webwriter-true-false");
	task.setAttribute("solution", "false");
	addPrompt(task, "The sun is cold.");
	fixture.append(task);
	await task.updateComplete;
	const radio = (value: string) => task.shadowRoot!.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!;
	const tile = (value: string) => radio(value).closest(".cell")!;
	assert.ok(!radio("true").checked && !radio("false").checked && !task.checkValidity(), "Start without an answer");
	radio("true").click();
	await task.updateComplete;
	assert.ok(radio("true").checked && tile("true").matches(".selected") && task.checkValidity(), "Answer with the native radio");
	assert.ok(task.checkAnswer(true) === 0, "Grade the wrong answer");
	await task.updateComplete;
	assert.ok(radio("true").disabled && radio("false").disabled, "Lock the answer after grading");
	assert.ok(tile("true").matches(".wrong") && tile("false").matches(".missed"), "Mark the wrong answer and the missed solution");
	assert.ok(tile("false").querySelector(".note")?.textContent === "Solution", "Label the correct answer Solution");
	task.reset();
	await task.updateComplete;
	assert.ok(!radio("true").checked && !radio("true").disabled && !tile("false").matches(".missed"), "Reset clears the answer and its feedback");
	assert.ok(task.getAttribute("solution") === "false", "Answering must leave the solution alone");

	fixture.contentEditable = "true";
	const authored = document.createElement("webwriter-true-false");
	fixture.append(authored);
	await settleUpdates();
	const authoredRadio = (value: string) => authored.shadowRoot!.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
	assert.ok(authoredRadio("true").checked, "Show the default solution in edit mode");
	authoredRadio("false").click();
	await authored.updateComplete;
	assert.ok(authored.getAttribute("solution") === "false" && authoredRadio("false").checked, "Choosing in edit mode sets the solution");
}

async function learnerOrder(fixture: HTMLElement) {
	const order = document.createElement("webwriter-order");
	const prompt = addPrompt(order, "Arrange the letters");
	order.setAttribute("solution", '["a","b","c"]');
	for (const id of ["a", "b", "c"]) {
		const item = document.createElement("webwriter-order-item");
		item.id = id;
		item.textContent = id;
		order.append(item);
	}
	const authored = order.outerHTML;
	fixture.append(order);
	await order.updateComplete;
	const slot = order.shadowRoot!.querySelector<HTMLSlotElement>("slot:not([name])")!;
	assert.ok(order.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prompt"]')!.assignedElements()[0] === prompt,
		"Order must assign the prompt independently of the shuffled items");
	assert.ok(slot.assignedElements().length === 3, "Learner items must still be slotted");
	const grid = order.shadowRoot!.querySelector("[data-ww-drop]")!;
	for (const id of ["a", "b", "c"]) {
		grid.dispatchEvent(new CustomEvent("ww-dragcommit", { detail: { item: order.querySelector(`#${id}`), before: null }, cancelable: true }));
	}
	await order.updateComplete;
	assert.ok(slot.assignedElements().map(item => item.id).join("") === "abc", "Drop order must be visible");
	assert.ok(order.checkAnswer(true) === 1, "Grade the order shown to the learner");
	order.reset();
	await order.updateComplete;
	assert.ok(order.outerHTML === authored, "Playing and resetting must preserve authored item order and solution");
}

async function learnerChoice(fixture: HTMLElement) {
	const choice = document.createElement("webwriter-choice");
	addPrompt(choice, "Choose an answer");
	choice.setAttribute("mode", "single");
	choice.setAttribute("solution", '{"first":true,"second":true}');
	choice.setAttribute("randomize-order", "");
	for (const id of ["first", "second"]) {
		const item = document.createElement("webwriter-choice-item");
		item.id = id;
		item.textContent = id;
		choice.append(item);
	}
	const authored = choice.outerHTML;
	fixture.append(choice);
	await choice.updateComplete;
	choice.querySelector<HTMLElement>("#first")!.click();
	assert.ok(choice.checkValidity() && choice.checkAnswer(true) === 1, "Grade the first correct choice in single mode");
	await settleUpdates();
	const firstItem = choice.querySelector("#first") as HTMLElement;
	assert.ok(firstItem.shadowRoot!.querySelector(".tag")?.textContent.includes("Correct"),
		"Label a graded option in words, not only in color");
	choice.reset();
	await choice.updateComplete;
	assert.ok(choice.outerHTML === authored, "Shuffling and grading must leave authored choices intact");
	choice.setAttribute("mode", "multiple");
	choice.setAttribute("grading-method", "accuracy");
	await choice.updateComplete;
	choice.querySelector<HTMLElement>("#first")!.click();
	assert.equal(choice.checkAnswer(true), 0.5, "Saved accuracy grading still scores each option");
	choice.querySelector("#first")!.remove();
	await settleUpdates();
	assert.ok(choice.shadowRoot!.querySelector<HTMLSlotElement>("slot:not([name])")!.assignedElements().length === 1,
		"Use current items after a DOM change");
}

async function textAnswers(fixture: HTMLElement) {
	const text = document.createElement("webwriter-text") as Any;
	text.setAttribute("ignore-case", "");
	text.solution = ["Goethe", "Johann Wolfgang von Goethe"];
	fixture.append(text);
	await text.updateComplete;
	text.currentAnswer = "johann wolfgang  von goethe";
	assert.ok(text.checkAnswer(true) === 1, "Accept every listed answer, ignoring capitalization and extra spaces");
	text.reset();
	text.currentAnswer = "Gothe";
	assert.ok(text.checkAnswer(true) === 0, "A misspelled answer is wrong");
	await text.updateComplete;
	assert.ok(text.shadowRoot!.querySelector(".near-miss")?.textContent.includes("spelling") &&
		text.shadowRoot!.querySelector(".solution")?.textContent.includes("Goethe"),
		"Point out a near miss next to the solution");
	text.reset();
	text.solution = "Goethe";
	assert.ok(text.acceptedAnswers.join() === "Goethe", "A single solution stays plain text");
}

async function orderFeedback(fixture: HTMLElement) {
	const order = document.createElement("webwriter-order") as Any;
	order.setAttribute("solution", '["a","b","c"]');
	for (const id of ["a", "b", "c"]) {
		const item = document.createElement("webwriter-order-item");
		item.id = id;
		item.textContent = id.toUpperCase();
		order.append(item);
	}
	fixture.append(order);
	await settleUpdates();
	const [first] = order.items;
	(first.shadowRoot!.querySelectorAll(".move sl-icon-button")[1] as HTMLElement).click();
	await settleUpdates();
	assert.ok(order.items[1] === first, "The move buttons reorder the learner's items");
	order.checkAnswer(true);
	await settleUpdates();
	assert.ok(order.items.every((item: Any) => item.shadowRoot.querySelector(".tag") && !item.shadowRoot.querySelector(".move")),
		"After grading, each item says whether it is in place, and the move buttons are gone");
	assert.ok(!order.items.some((item: Any) => item.shadowRoot.querySelector(".order-item[data-ww-drag-handle]")),
		"A graded order can no longer be dragged");
	order.reset();
	await settleUpdates();
	assert.ok(order.items.every((item: Any) => !item.shadowRoot.querySelector(".tag") && item.shadowRoot.querySelector(".move")),
		"Reset unlocks the order");
}

async function savedRecording(fixture: HTMLElement) {
	const recording = document.createElement("webwriter-speech") as WebwriterSpeech;
	assert.ok(recording.checkValidity(), "A recording is optional by default, so an empty one does not block submitting");
	recording.required = true;
	recording.setAttribute("src", "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
	fixture.append(recording);
	assert.ok(recording.checkValidity(), "A saved recording must still be available");
	recording.reset();
	assert.ok(!recording.checkValidity() && recording.hasAttribute("src"), "Reset must leave the saved audio attribute intact");
	recording.remove();
	fixture.append(recording);
	assert.ok(recording.checkValidity(), "Reinsertion must restore the saved audio");
}

async function answerInsertion(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	const choice = document.createElement("webwriter-choice");
	const order = document.createElement("webwriter-order");
	choice.style.width = order.style.width = "320px";
	order.setAttribute("solution", "[]");
	fixture.append(choice, order);
	await settleUpdates();
	for (const [task, name, label] of [[choice, "add-option", "Add Option"], [order, "add-item", "Add item"]] as const) {
		const root = task.shadowRoot!;
		assert.notExists(root.querySelector(".add-menu"));
		assert.exists(root.querySelector(".task-prompt .add-hint"));
		assert.exists(root.querySelector(".task-actions .add-feedback"));
		const row = root.querySelector(".task-helper")!;
		const button = row.querySelector<HTMLButtonElement>(`.${name}`)!;
		assert.equal(button.textContent?.trim(), label);
		assert.equal(button.getAttribute("data-ww-capture-selection"), "false");
		assert.closeTo(button.getBoundingClientRect().right, row.getBoundingClientRect().right, 1,
			"Align the button with the right edge of the hint row");
		assert.isAtLeast(row.nextElementSibling!.getBoundingClientRect().top - button.getBoundingClientRect().bottom, 4,
			"Leave a gap between the add button and the items");
		if (task === order) {
			const reverse = button.previousElementSibling!;
			assert.equal(reverse.textContent?.trim(), "Accept reverse order");
			reverse.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
			assert.isTrue(order.hasAttribute("accept-reverse"));
			assert.notInclude(root.querySelector("#task-configuration")!.textContent, "Accept reverse order");
		}
		const count = task.children.length;
		button.click();
		assert.ok(task.children.length === count + 1 && task.lastElementChild?.firstElementChild?.localName === "p",
			`${label} appends one editable answer`);
		if (task === choice) {
			const paragraph = task.lastElementChild!.firstElementChild!;
			const selection = task.ownerDocument.getSelection()!;
			await until(() => selection.anchorNode === paragraph, "the caret moves to the new option paragraph");
			assert.isTrue(selection.isCollapsed);
			assert.equal(selection.anchorOffset, 0);
			assert.equal(paragraph.textContent, "");
		}
	}
	assert.ok(order.solution.join() === Array.from(order.children, item => item.id).join(),
		"Inline insertion must extend the authored order solution");
	fixture.contentEditable = "false";
	await settleUpdates();
	assert.ok(!choice.shadowRoot!.querySelector(".add-option") && !order.shadowRoot!.querySelector(".add-item"),
		"Hide answer insertion in use mode");
	assert.notInclude(order.shadowRoot!.querySelector(".task-helper")!.textContent, "Accept reverse order");
}

async function taskFeedback(fixture: HTMLElement) {
	const quiz = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	const text = document.createElement("webwriter-text");
	text.gradingMethod = "completion";
	const speech = document.createElement("webwriter-speech");
	speech.setAttribute("feedback", "Listen to your response.\nCompare it with a model.");
	fixture.contentEditable = "true";
	fixture.append(text, speech, quiz);
	await settleUpdates();
	clickButton(text.shadowRoot!, "Add Feedback");
	clickButton(text.shadowRoot!, "Add Feedback");
	clickButton(speech.shadowRoot!, "Add Feedback");
	await settleUpdates();
	const feedback = text.querySelector("webwriter-quiz-feedback[slot=feedback]")!;
	const speechFeedback = speech.querySelector("webwriter-quiz-feedback[slot=feedback]")!;
	assert.ok(feedback?.firstElementChild?.matches("p") && text.children.length === 1,
		"Add Feedback must insert a single editable block");
	assert.ok(speechFeedback?.children.length === 2 && !speech.hasAttribute("feedback"),
		"Convert old feedback to editable paragraphs when adding a feedback block");
	feedback.innerHTML = "<p>Compare your <strong>approach</strong>.</p><p>Consider another example.</p>";
	assert.ok(text.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="feedback"]')?.assignedElements()[0] === feedback,
		"Authors must see the editable feedback content");
	assert.equal(text.shadowRoot!.querySelector(".task-progress")?.nextElementSibling?.textContent?.trim(), "Feedback");
	fixture.contentEditable = "false";
	await settleUpdates();
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(!text.shadowRoot!.querySelector(".feedback-popover"), "Keep feedback hidden when submission is incomplete");
	const input = text.shadowRoot!.querySelector(".answer-field") as HTMLElement & { value: string };
	input.value = "An open-ended response";
	input.dispatchEvent(new Event("change"));
	speech.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
	// The questions above grow with their results, so the button is measured within the card.
	const resetIn = () => {
		const reset = quiz.shadowRoot!.querySelector(".final-actions .reset")!.getBoundingClientRect(), card = quiz.getBoundingClientRect();
		return [reset.left - card.left, reset.top - card.top].join();
	};
	const resetBefore = resetIn();
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(resetIn() === resetBefore &&
		(quiz.shadowRoot!.querySelector(".final-actions .submit") as Any)?.disabled, "Submitting keeps the buttons in place, with Submit done");
	assert.notExists(text.shadowRoot!.querySelector(".feedback-toggle, .feedback-popover:popover-open"));
	clickButton(text.shadowRoot!, "1/2 tasks");
	assert.ok(text.shadowRoot!.querySelector<HTMLSlotElement>('.feedback-popover:popover-open slot[name="feedback"]')?.assignedElements()[0] === feedback &&
		feedback.querySelector("strong")?.textContent === "approach",
		"The count opens the original formatted feedback for a submitted task");
	text.shadowRoot!.querySelector<HTMLElement>(".close-feedback")!.click();
	clickButton(speech.shadowRoot!, "2/2 tasks");
	assert.ok(speech.shadowRoot!.querySelector<HTMLSlotElement>('.feedback-popover:popover-open slot[name="feedback"]')?.assignedElements()[0] === speechFeedback,
		"Readers can open feedback for an ungraded task too");
	assert.ok(quiz.shadowRoot!.querySelector(".total-result strong")?.textContent.replace(/\s+/g, " ").trim() === "1 of 1 point",
		"Ungraded feedback must leave the quiz score alone");
	clickButton(quiz.shadowRoot!, "Reset answers");
	await settleUpdates();
	assert.ok(!text.shadowRoot!.querySelector(".feedback-popover") && !speech.shadowRoot!.querySelector(".feedback-popover") &&
		text.contains(feedback) && speech.contains(speechFeedback), "Reset must hide feedback and preserve authored content");
}

async function mixedQuiz(fixture: HTMLElement) {
	const quiz = document.createElement("webwriter-quiz-results") as WebwriterQuizResults;
	const first = document.createElement("webwriter-true-false");
	const order = document.createElement("webwriter-order");
	const overall = document.createElement("webwriter-quiz-feedback");
	overall.slot = "feedback";
	overall.innerHTML = "<p>Well done.</p>";
	first.setAttribute("points", "2");
	order.setAttribute("points", "3");
	const item = document.createElement("webwriter-order-item");
	item.id = "one";
	item.textContent = "Only item";
	order.append(item);
	quiz.append(overall);
	fixture.append(first, order, quiz);
	await settleUpdates();
	assert.ok(order.shadowRoot!.querySelector(".title")?.textContent === "#2", "Number tasks across different types");
	assert.notExists(quiz.shadowRoot!.querySelector(".feedback-toggle, .feedback-popover"), "Keep overall feedback hidden before submitting");
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.notExists(quiz.shadowRoot!.querySelector(".feedback-popover"), "Incomplete submissions keep overall feedback hidden");
	assert.ok(first.shadowRoot!.querySelector(".required-warning"), "Show the unanswered warning on the task itself");
	const unanswered = quiz.shadowRoot!.querySelector(".unanswered");
	assert.ok(unanswered?.textContent.includes("1 task is unanswered.") && unanswered.querySelector(".link")?.textContent.trim() === "Go to task 1",
		"Say next to Submit which question is unanswered");
	first.shadowRoot!.querySelector<HTMLInputElement>('input[value="true"]')!.click();
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(quiz.shadowRoot!.querySelector(".total-result strong")?.textContent.replace(/\s+/g, " ").trim() === "5 of 5 points",
		"Grade the direct tasks together");
	assert.ok(first.shadowRoot!.querySelector('.result[data-state="correct"]') && quiz.shadowRoot!.querySelector(".tally .correct"),
		"Show each question's result and count the correct questions");
	const overallPanel = quiz.shadowRoot!.querySelector<HTMLElement>(".feedback-popover:popover-open")!;
	assert.equal(overallPanel.querySelector("slot")?.assignedElements()[0], overall, "Submitting opens overall feedback");
	assert.notExists(quiz.shadowRoot!.querySelector(".feedback-toggle, .remove-feedback"));
	overallPanel.querySelector<HTMLElement>(".close-feedback")!.click();
	assert.isFalse(overallPanel.matches(":popover-open"));
	clickButton(quiz.shadowRoot!, "Submit");
	assert.isTrue(overallPanel.matches(":popover-open"), "Submit reopens the feedback after checking");
	quiz.confirmReset = true;
	clickButton(quiz.shadowRoot!, "Reset answers");
	await settleUpdates();
	assert.isFalse(overallPanel.matches(":popover-open"), "Reset confirmation clears the bubble from the top layer");
	quiz.shadowRoot!.querySelector<HTMLElement>('sl-dialog[open] sl-button[variant="danger"]')!.click();
	await settleUpdates();
	assert.ok(!first.checkValidity() && !quiz.shadowRoot!.querySelector(".total-result"), "Reset direct tasks and their results");
	assert.notExists(quiz.shadowRoot!.querySelector(".feedback-popover"));
	assert.isTrue(overall.isConnected, "Reset preserves the authored feedback");
}

async function promptIsolation(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	const mark = document.createElement("webwriter-mark");
	const markPrompt = addPrompt(mark, "Ignore these words");
	const answer = document.createTextNode("Highlight this");
	const markBody = document.createElement("p");
	markBody.append(answer);
	mark.append(markBody);
	const gap = document.createElement("webwriter-gap");
	const gapPrompt = addPrompt(gap, "Keep this prompt");
	const paragraph = document.createElement("p");
	paragraph.textContent = "Make a gap here";
	gap.append(paragraph);
	fixture.append(mark, gap);
	await settleUpdates();
	const selection = document.getSelection()!;
	selection.setBaseAndExtent(markPrompt.firstChild!, 0, markPrompt.firstChild!, 6);
	action(mark, "Toggle Marking at Position");
	assert.ok(!mark.solution.length, "Prompt text must not be selectable as a mark answer");
	selection.setBaseAndExtent(answer, 0, answer, 0);
	action(mark, "Toggle Marking at Position");
	assert.ok(mark.solution.join() === "0", "Mark indices must start in the answer body");
	selection.setBaseAndExtent(gapPrompt.firstChild!, 0, gapPrompt.firstChild!, 4);
	action(gap, "Insert gap at selection");
	assert.ok(!gap.querySelector("webwriter-gap-item"), "Prompt text must not become a gap");
	selection.setBaseAndExtent(paragraph.firstChild!, 0, paragraph.firstChild!, 4);
	action(gap, "Insert gap at selection");
	assert.ok(paragraph.querySelector("webwriter-gap-item")?.textContent === "Make", "Insert a gap in the answer body");

	const markButton = mark.shadowRoot!.querySelector(".task-helper .toggle-mark.edit-only") as HTMLButtonElement;
	const gapButton = gap.shadowRoot!.querySelector(".task-helper .toggle-gap.edit-only") as HTMLButtonElement;
	assert.ok(markButton && markButton.getAttribute("data-ww-capture-selection") === "false",
		"Mark helper row shows an edit-only toggle button that preserves text selection");
	assert.ok(gapButton && gapButton.getAttribute("data-ww-capture-selection") === "false",
		"Gap helper row shows an edit-only toggle button that preserves text selection");

	await (paragraph.querySelector("webwriter-gap-item") as Any)?.updateComplete;
	selection.removeAllRanges();
	(document.activeElement as HTMLElement | null)?.blur?.();
	await until(() => markButton.disabled && gapButton.disabled, "Both toggles disable without a target");
	const assertPrimaryStyle = (button: HTMLButtonElement, shade: string) => {
		const style = getComputedStyle(button);
		assert.equal(style.getPropertyValue("--helper-action-color"), style.getPropertyValue(`--sl-color-primary-${shade}`));
	};
	for (const [task, button] of [[mark, markButton], [gap, gapButton]] as const) {
		task.selectionStates.add("ww-element-selected");
		await until(() => getComputedStyle(button).visibility === "visible", "The disabled button is visible on a selected task");
		assertPrimaryStyle(button, "300");
		task.selectionStates.delete("ww-element-selected");
	}

	const punctuation = document.createTextNode("  ... ");
	markBody.append(punctuation);
	selection.setBaseAndExtent(punctuation, 2, punctuation, 5);
	await settleUpdates();
	assert.isTrue(markButton.disabled, "Selecting only punctuation does not enable highlighting");
	selection.setBaseAndExtent(gapPrompt.firstChild!, 0, gapPrompt.firstChild!, 4);
	await settleUpdates();
	assert.isTrue(gapButton.disabled, "Selecting the prompt does not enable a gap");

	selection.setBaseAndExtent(answer, 10, answer, 10);
	await until(() => !markButton.disabled, "Placing the caret in a word enables highlighting");
	assertPrimaryStyle(markButton, "600");
	markButton.dispatchEvent(new MouseEvent("mouseenter"));
	await mark.updateComplete;
	assert.ok((CSS.highlights.get("webwriter-mark-preview")?.size ?? 0) === 1,
		"Hovering the mark toggle button highlights the target word subtly");
	markButton.dispatchEvent(new MouseEvent("mouseleave"));
	await mark.updateComplete;
	assert.ok((CSS.highlights.get("webwriter-mark-preview")?.size ?? 0) === 0,
		"Leaving the mark toggle button clears the preview highlight");
	markButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
	markButton.click();
	await mark.updateComplete;
	assert.ok(mark.solution.join() === "0,1", "Mark toggle button marks the word at the caret");
	markButton.click();
	await mark.updateComplete;
	assert.ok(mark.solution.join() === "0", "Mark toggle button unmarks a marked word");

	const gapText = paragraph.lastChild!;
	const hereOffset = (gapText.textContent ?? "").indexOf("here") + 1;
	selection.setBaseAndExtent(gapText, hereOffset, gapText, hereOffset);
	await until(() => !gapButton.disabled && markButton.disabled, "Moving the caret enables the gap and disables highlighting");
	assertPrimaryStyle(gapButton, "600");
	gapButton.dispatchEvent(new MouseEvent("mouseenter"));
	assert.ok((CSS.highlights.get("webwriter-gap-preview")?.size ?? 0) === 1,
		"Hovering the gap toggle button highlights the target word subtly");
	gapButton.dispatchEvent(new MouseEvent("mouseleave"));
	assert.ok((CSS.highlights.get("webwriter-gap-preview")?.size ?? 0) === 0,
		"Leaving the gap toggle button clears the preview highlight");
	gapButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
	gapButton.click();
	await gap.updateComplete;
	const createdGap = paragraph.querySelectorAll("webwriter-gap-item")[1] as Any;
	assert.ok(createdGap?.textContent === "here", "Gap toggle button turns the word at the caret into a gap");
	await createdGap.updateComplete;
	await new Promise(resolve => setTimeout(resolve, 0));
	const createdInput = createdGap.shadowRoot.querySelector("input.edit-input") as HTMLInputElement;
	assert.ok(createdGap.shadowRoot.activeElement === createdInput && createdInput.selectionStart === 0 && createdInput.selectionEnd === "here".length,
		"Toggling a gap selects its whole contents inside the item's input");
	assert.isFalse(gapButton.disabled, "A focused gap can be turned back into text");
	gapButton.click();
	await gap.updateComplete;
	assert.ok(paragraph.querySelectorAll("webwriter-gap-item").length === 1 && paragraph.textContent?.includes("here"),
		"Gap toggle button unwraps a gap back to text when focused");
	gapButton.click();
	await gap.updateComplete;
	const recreatedGap = paragraph.querySelectorAll("webwriter-gap-item")[1] as Any;
	assert.ok(paragraph.querySelectorAll("webwriter-gap-item").length === 2 && recreatedGap?.textContent === "here",
		"Gap toggle button turns the restored selection back into a gap");
	await recreatedGap.updateComplete;
	gapButton.click();
	await gap.updateComplete;

	// Toggling also works from the start or end of a word, across Element or split-Text boundaries.
	selection.collapse(paragraph, paragraph.childNodes.length);
	gapButton.click();
	await gap.updateComplete;
	const endBoundaryGap = paragraph.querySelectorAll("webwriter-gap-item")[1] as Any;
	assert.ok(endBoundaryGap?.textContent === "here", "Gap toggle button works at the end of a word on an element boundary");
	await endBoundaryGap.updateComplete;
	gapButton.click();
	await gap.updateComplete;
	const hereText = Array.from(paragraph.childNodes).find((node): node is Text => node instanceof Text && node.data.includes("here"))!;
	const beforeHereText = hereText.previousSibling as Text;
	selection.collapse(beforeHereText, beforeHereText.data.length);
	gapButton.click();
	await gap.updateComplete;
	const startBoundaryGap = paragraph.querySelectorAll("webwriter-gap-item")[1] as Any;
	assert.ok(startBoundaryGap?.textContent === "here", "Gap toggle button works at the start of a word across split text nodes");
	await startBoundaryGap.updateComplete;
	gapButton.click();
	await gap.updateComplete;

	const firstGap = paragraph.querySelector("webwriter-gap-item") as Any;
	await firstGap.updateComplete;
	const editInput = firstGap.shadowRoot.querySelector("input.edit-input") as HTMLInputElement | null;
	assert.ok(editInput?.getAttribute("data-ww-capture-selection") === "false" && editInput.value === "Make",
		"Gap edit box renders an opted-out internal input synced to the answer");
	editInput!.value = "Build";
	editInput!.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
	assert.ok(firstGap.textContent === "Build", "Typing in the gap input updates its light-DOM answer");
	firstGap.textContent = "Make";
	await new Promise(resolve => setTimeout(resolve, 0));
	await firstGap.updateComplete;
	assert.ok(editInput!.value === "Make", "External light-DOM edits sync back to the gap input");

	// Arrow navigation seamlessly enters and leaves a gap item.
	assert.ok(parseFloat(getComputedStyle(firstGap).marginLeft) > 0 && parseFloat(getComputedStyle(firstGap).marginRight) > 0,
		"Gap item leaves horizontal breathing room so adjacent carets stay visible");
	paragraph.focus();
	selection.collapse(paragraph, 0);
	document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true, cancelable: true }));
	assert.ok(firstGap.shadowRoot.activeElement === editInput && editInput!.selectionStart === 0 && editInput!.selectionEnd === 0,
		"ArrowRight before a gap enters its input at the start");
	editInput!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true, cancelable: true }));
	const atBeforeGap = (selection.anchorNode === firstGap.previousSibling && firstGap.previousSibling instanceof Text && selection.anchorOffset === firstGap.previousSibling.data.length)
		|| (selection.anchorNode === paragraph && selection.anchorOffset === Array.prototype.indexOf.call(paragraph.childNodes, firstGap));
	assert.ok(!firstGap.shadowRoot.activeElement && atBeforeGap,
		"ArrowLeft at the start of a gap input moves back to surrounding text");
	selection.collapse(firstGap.nextSibling!, 0);
	document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true, cancelable: true }));
	assert.ok(firstGap.shadowRoot.activeElement === editInput && editInput!.selectionStart === "Make".length && editInput!.selectionEnd === "Make".length,
		"ArrowLeft after a gap enters its input at the end");
	editInput!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true, cancelable: true }));
	assert.ok(!firstGap.shadowRoot.activeElement && selection.anchorNode === firstGap.nextSibling && selection.anchorOffset === 0,
		"ArrowRight at the end of a gap input moves forward to surrounding text");

	// Backspace deletes a gap item when it is empty or would become empty.
	const tempText = Array.from(paragraph.childNodes).find((node): node is Text => node instanceof Text && node.data.includes("here"))!;
	const backspaceWordStart = tempText.data.indexOf("here");
	selection.collapse(tempText, backspaceWordStart);
	gapButton.click();
	await gap.updateComplete;
	const tempGap = paragraph.querySelectorAll("webwriter-gap-item")[1] as Any;
	await tempGap.updateComplete;
	const tempInput = tempGap.shadowRoot.querySelector("input.edit-input") as HTMLInputElement;
	tempInput.value = "h";
	tempInput.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
	tempInput.setSelectionRange(1, 1);
	tempInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, composed: true, cancelable: true }));
	await gap.updateComplete;
	assert.ok(!tempGap.isConnected && paragraph.querySelectorAll("webwriter-gap-item").length === 1,
		"Backspace deletes a gap item once it would become empty");

	fixture.contentEditable = "false";
	await settleUpdates();
	assert.ok(!mark.shadowRoot!.querySelector(".toggle-mark") && mark.shadowRoot!.querySelector(".helper"),
		"Mark keeps the learner helper row and hides the toggle button in read mode");
	assert.ok(!gap.shadowRoot!.querySelector(".toggle-gap") && gap.shadowRoot!.querySelector(".helper"),
		"Gap shows the learner helper row and hides the toggle button in read mode");
	const gapItem = gap.querySelector("webwriter-gap-item") as Any;
	gapItem.inputAnswer = "Make";
	gap.checkAnswer(true);
	await gap.updateComplete;
	assert.ok(!gap.shadowRoot!.querySelector(".helper"), "Gap hides its helper row after grading");

	selection.removeAllRanges();
}

mocha.setup(getMochaConfig());

describe("quiz questions and <webwriter-quiz-results>", function () {
	let fixture: HTMLDivElement;
	beforeEach(function () {
		fixture = document.createElement("div");
		document.body.append(fixture);
	});
	afterEach(function () {
		fixture.remove();
		document.getSelection()?.removeAllRanges();
	});

	it("authoring: adds questions from the results card and switches their type", function () {
		// The test walks one question through every type.
		this.timeout(10000);
		return authoring(fixture);
	});
	it("switches a task to Task Results from the top-level menu", async () => {
		fixture.contentEditable = "true";
		fixture.innerHTML = `<webwriter-text><p slot="prompt">First task</p></webwriter-text>
			<webwriter-text id="end-of-group" style="inline-size: 420px" lang="en">
				<p slot="prompt">Old prompt</p>
				<webwriter-quiz-feedback slot="feedback"><p>Feedback</p></webwriter-quiz-feedback>
			</webwriter-text>`;
		const first = fixture.firstElementChild!;
		const task = fixture.lastElementChild as WebwriterTask;
		const feedback = task.querySelector("webwriter-quiz-feedback")!;
		await task.updateComplete;
		const root = task.shadowRoot!;
		root.querySelector<HTMLButtonElement>(".type-switch > button")!.click();
		const menu = root.querySelector(".type-menu")!;
		const option = menu.lastElementChild as HTMLElement;
		assert.equal(option.getAttribute("value"), "webwriter-quiz-results");
		assert.notExists(option.querySelector("sl-icon"));
		const label = option.querySelector("i")!;
		assert.equal(label.textContent, "Task Results");
		assert.equal(getComputedStyle(label).fontStyle, "italic");
		option.click();

		const results = fixture.querySelector("webwriter-quiz-results")!;
		await results.updateComplete;
		assert.isFalse(task.isConnected);
		assert.strictEqual(fixture.lastElementChild, results);
		assert.deepEqual(results.tasks, [first]);
		assert.deepEqual(Array.from(results.children), [feedback]);
		assert.equal(results.id, "end-of-group");
		assert.equal(results.style.inlineSize, "420px");
		assert.equal(results.lang, "en");
	});
	it("languages: localizes the drawer and the questions", () => languages(fixture));
	it("titleVisibility: numbers tasks, and hides titles on request", () => titleVisibility(fixture));
	it("standalone: checks and retries a question without a results card", () => standalone(fixture));
	it("feedbackPopover: opens from Check, flips above, and leaves the task height alone", () => feedbackPopover(fixture));
	it("resultsFeedback: opens from Submit, flips above, and follows the author controls", () => resultsFeedback(fixture));
	it("uses the task padding as a capture surface while leaving the prompt editable", async () => {
		fixture.contentEditable = "true";
		fixture.innerHTML = '<webwriter-text style="padding: 24px"><p slot="prompt">Edit this prompt.</p></webwriter-text>';
		const task = fixture.querySelector("webwriter-text")!;
		await task.updateComplete;
		const background = task.shadowRoot!.querySelector(".card-background")!;
		const bounds = background.getBoundingClientRect();
		const card = task.shadowRoot!.querySelector(".card")!.getBoundingClientRect();
		assert.isBelow(bounds.top, card.top);
		assert.isBelow(bounds.left, card.left);
		assert.isAbove(bounds.right, card.right);
		const press = () => new MouseEvent("mousedown", { button: 0, bubbles: true, composed: true, cancelable: true });
		assert.isFalse(background.dispatchEvent(press()), "pressing the frame suppresses the native caret");
		assert.isTrue(task.querySelector("p")!.dispatchEvent(press()), "pressing authored text keeps native selection");
	});
	it("styles the visible task and results cards with the document's inline styles", async () => {
		fixture.contentEditable = "true";
		fixture.innerHTML = `${insertedChoiceMarkup}<webwriter-quiz-results></webwriter-quiz-results>`;
		const task = fixture.querySelector("webwriter-choice")!;
		const results = fixture.querySelector("webwriter-quiz-results")!;
		const styles = "background-color: rgb(225, 240, 255); border: 3px solid navy; border-radius: 18px; padding: 23px; font-size: 20px;";
		for (const widget of [task, results]) widget.setAttribute("style", styles);
		for (const editable of ["true", "false"]) {
			fixture.contentEditable = editable;
			await settleUpdates();
			await Promise.all([task.updateComplete, results.updateComplete]);
			for (const [widget, selector] of [[task, ".card"], [results, ".final-card"]] as const) {
				const card = getComputedStyle(widget.shadowRoot!.querySelector(selector)!);
				const host = getComputedStyle(widget);
				assert.equal(host.backgroundColor, "rgb(225, 240, 255)");
				assert.equal(host.borderTopWidth, "3px");
				assert.equal(host.borderTopLeftRadius, "18px");
				assert.equal(host.paddingTop, "23px");
				assert.equal(card.backgroundColor, "rgba(0, 0, 0, 0)");
				assert.equal(card.borderTopWidth, "0px");
				assert.equal(card.paddingTop, "0px");
				assert.equal(card.fontSize, "20px");
			}
		}
	});
	it("rubricOptions: all task types offer self-assessment and show the rubric after feedback", async () => {
		fixture.contentEditable = "true";
		const types = [
			"choice", 'choice mode="single"', 'choice mode="true-false"', "choice grid ungraded", "true-false",
			"mark", "text", "numeric", 'numeric mode="datetime"', "gap", "gap grid", "order",
			"pairing", "categorize", "speech", "dictation", "image", "image-placements", "drawing completion-credit",
		];
		fixture.innerHTML = types.map(type => `<webwriter-${type}>
			<p slot="prompt">Task</p><webwriter-quiz-feedback slot="feedback"><p>Feedback</p></webwriter-quiz-feedback>
		</webwriter-${type.split(" ")[0]}>`).join("");
		await settleUpdates();
		for (const task of Array.from(fixture.children) as WebwriterTask[]) {
			const root = task.shadowRoot!;
			const options = widgetDeclarations(task, "options");
			const checks = Object.values(options).map(option => widgetOptionType((option as { type?: unknown }).type) === "boolean");
			assert.notInclude(checks.slice(checks.indexOf(true)), false, `${task.localName} puts drawer checkboxes last`);
			assert.notProperty(options, "correctMessage");
			assert.notProperty(options, "wrongMessage");
			const configure = root.querySelector("#task-configuration")!;
			const inputs = [...configure.querySelectorAll("input, select, textarea")];
			const firstCheckbox = inputs.findIndex(input => input.matches('[type="checkbox"]'));
			if (firstCheckbox >= 0) {
				assert.isTrue(inputs.slice(firstCheckbox).every(input => input.matches('[type="checkbox"]')),
					`${task.localName} puts Configure checkboxes last`);
			}
			const grading = options.gradingMethod as { options: { value: string }[] };
			assert.isAtLeast(Object.keys(options).indexOf("hideScoring"), 3, `${task.localName} keeps Hide scoring after the primary drawer fields`);
			assert.notProperty(options.hideScoring as object, "group", task.localName);
			assert.notProperty(widgetDeclarations(task, "optionGroups"), "advanced", task.localName);
			assert.notInclude(configure.textContent, "Hide scoring", task.localName);
			assert.equal(grading.options.filter(option => option.value === "self-assess").length, 1, task.localName);
			assert.equal(grading.options[grading.options.findIndex(option => option.value === "ungraded") - 1]?.value,
				"self-assess", task.localName);
			const option = root.querySelector<HTMLInputElement>('#task-configuration input[value="self-assess"]');
			assert.exists(option, task.localName);
			option!.click();
			await settleUpdates();
			assert.equal(task.getAttribute("grading-method"), "self-assess", task.localName);
			assert.isFunction(task.checkAnswer, task.localName);
			assert.exists(root.querySelector(".task-actions > .feedback-toggle + span .rubric-toggle"), task.localName);
			assert.exists(root.querySelector(".rubric-toggle.vacant"), task.localName);
		}
	});
	it("hideScoring: hides individual points while grading the task normally", async () => {
		fixture.innerHTML = `<webwriter-choice mode="true-false" points="2" hide-scoring solution='{"true":true}'>
			<p slot="prompt">Is ice solid?</p>
		</webwriter-choice><webwriter-quiz-results></webwriter-quiz-results>`;
		const task = fixture.querySelector("webwriter-choice")!;
		const results = fixture.querySelector("webwriter-quiz-results")!;
		await settleUpdates();
		const root = task.shadowRoot!;
		assert.isTrue(task.hideScoring);
		assert.notExists(root.querySelector(".max-points"));
		root.querySelector<HTMLInputElement>('.tf-choices input[value="true"]')!.click();
		await task.updateComplete;
		results.shadowRoot!.querySelector<HTMLElement>(".submit")!.click();
		await Promise.all([task.updateComplete, results.updateComplete]);
		assert.exists(root.querySelector('.result[data-state="correct"]'));
		assert.notExists(root.querySelector(".result .points"));
		assert.equal(results.shadowRoot!.querySelector(".total-result strong")?.textContent?.trim(), "2 of 2 points");

		task.hideScoring = false;
		await task.updateComplete;
		assert.isFalse(task.hasAttribute("hide-scoring"));
		assert.equal(root.querySelector(".max-points")?.textContent, "2 points");
		assert.equal(root.querySelector(".result .points")?.textContent, "2 of 2 points");
	});
	it("rubricScores: criteria update the submitted task and quiz total, and reset with the answers", async () => {
		fixture.contentEditable = "false";
		fixture.innerHTML = `<webwriter-numeric grading-method="self-assess" points="4" rubric="Reasonable value&#10;Correct units">
			<p slot="prompt">Estimate the distance.</p>
		</webwriter-numeric>
		<webwriter-choice mode="true-false" solution='{"true":true}' points="2"><p slot="prompt">Is it daytime?</p></webwriter-choice>
		<webwriter-quiz-results detailed-feedback></webwriter-quiz-results>`;
		const numeric = fixture.querySelector("webwriter-numeric")!;
		const choice = fixture.querySelector("webwriter-choice")!;
		const results = fixture.querySelector("webwriter-quiz-results")!;
		await settleUpdates();
		const submit = () => results.shadowRoot!.querySelector<HTMLElement>(".submit")!.click();
		const answer = () => {
			const number = numeric.shadowRoot!.querySelector<HTMLInputElement>("input.num-input")!;
			number.value = "37";
			number.dispatchEvent(new Event("input", { bubbles: true }));
			choice.shadowRoot!.querySelector<HTMLInputElement>('input[value="true"]')!.click();
		};
		const total = () => results.shadowRoot!.querySelector(".total-result strong")?.textContent?.trim();
		const criteria = () => numeric.shadowRoot!.querySelectorAll<HTMLInputElement>(".rubric-checklist input");
		answer();
		submit();
		await settleUpdates();
		assert.equal(total(), "2 of 6 points");
		assert.lengthOf(criteria(), 2);
		assert.notExists(numeric.shadowRoot!.querySelector(".solution-text, .rubric-toggle"));
		criteria()[0].click();
		await settleUpdates();
		assert.equal(total(), "4 of 6 points");
		assert.include(numeric.shadowRoot!.querySelector(".result")!.textContent, "2 of 4");
		criteria()[1].click();
		await settleUpdates();
		assert.equal(total(), "6 of 6 points");
		results.shadowRoot!.querySelector<HTMLElement>(".reset")!.click();
		await settleUpdates();
		assert.lengthOf(criteria(), 0);
		answer();
		submit();
		await settleUpdates();
		assert.equal(total(), "2 of 6 points");
		assert.isFalse(criteria()[0].checked);
	});
	it("choiceMinimum: every Choice variant starts with two editable options", () => {
		assert.include(editingConfig["./widgets/webwriter-choice"].content, "webwriter-choice-item{2,}");
		for (const id of ["webwriter-choice", "webwriter-true-false-choice"]) {
			const choice = findQuizTypeById(id)!.createInstance();
			assert.lengthOf(choice.querySelectorAll(":scope > webwriter-choice-item"), 2, id);
			assert.lengthOf(choice.querySelectorAll(":scope > webwriter-choice-item > p"), 2, id);
		}
	});
	it("orderMinimum: Sequence starts with two editable items and requires both", async () => {
		assert.include(editingConfig["./widgets/webwriter-order"].content, "webwriter-order-item{2,}");
		const starter = findQuizTypeById("webwriter-order")!.createInstance();
		assert.lengthOf(starter.querySelectorAll(":scope > webwriter-order-item > p"), 2);
		fixture.contentEditable = "true";
		fixture.innerHTML = `<webwriter-order><p slot="prompt"></p>
			<webwriter-order-item><p></p></webwriter-order-item>
			<webwriter-order-item><p></p></webwriter-order-item>
		</webwriter-order>`;
		const order = fixture.querySelector("webwriter-order")!;
		await order.updateComplete;
		const items = Array.from(order.querySelectorAll("webwriter-order-item"));
		const ids = items.map(item => item.id);
		assert.ok(ids.every(Boolean) && new Set(ids).size === 2, "Both items get a separate ID");
		for (const item of items) {
			await item.updateComplete;
			assert.equal(getComputedStyle(item.querySelector("p")!).getPropertyValue("--ww-placeholder").trim(), '"Item"');
		}
	});
	it("choiceMarkerAlignment: radios and checkboxes are centered vertically in their option rows", async () => {
		fixture.style.width = "320px";
		for (const editable of ["true", "false"]) {
			fixture.contentEditable = editable;
			for (const mode of ["single", "multiple"]) {
				fixture.innerHTML = `<webwriter-choice mode="${mode}"><p slot="prompt">Pick an answer.</p>
					<webwriter-choice-item id="short"><p>Short answer</p></webwriter-choice-item>
					<webwriter-choice-item id="long"><p>An answer with enough text to wrap over multiple lines in a narrow quiz card.</p></webwriter-choice-item>
				</webwriter-choice>`;
				await settleUpdates();
				for (const item of fixture.querySelectorAll("webwriter-choice-item")) {
					const row = item.shadowRoot!.querySelector(".choice-item")!;
					const marker = row.querySelector(".marker")!;
					assert.isAbove(marker.getBoundingClientRect().height, 0, "The marker is visible");
					assert.closeTo(centre(marker).y, centre(row).y, 0.5, `${mode}, contenteditable=${editable}, ${item.id} answer`);
				}
			}
		}
	});
	it("insertedQuestion: a question from the editor gets its prompt and an inline type switch", () => insertedQuestion(fixture));
	it("authoringPreview: edit mode shows hint and feedback popovers and disabled buttons", () => authoringPreview(fixture));
	it("popupsFollowEditor: menus and the hint close when the editor moves on", () => popupsFollowEditor(fixture));
	it("generatedTextUnselectable: generated text cannot be selected, authored content can", () => generatedTextUnselectable(fixture));
	it("headerEditors: one header control opens Label and Points side by side", () => headerEditors(fixture));
	it("gradingBadgeHeight: Not graded keeps the height of the points row", async () => {
		fixture.style.cssText = "width: 320px; font: 16px/normal system-ui";
		fixture.innerHTML = insertedChoiceMarkup;
		const task = fixture.querySelector("webwriter-choice")!;
		const headerHeight = () => task.shadowRoot!.querySelector(".quiz-header")!.getBoundingClientRect().height;
		for (const editing of ["false", "true"]) {
			fixture.contentEditable = editing;
			task.removeAttribute("grading-method");
			await settleUpdates();
			const gradedHeight = headerHeight();
			assert.isAbove(gradedHeight, 0);
			task.setAttribute("grading-method", "ungraded");
			await settleUpdates();
			assert.equal(task.shadowRoot!.querySelector(".badge")?.textContent, "Not graded");
			assert.closeTo(headerHeight(), gradedHeight, 0.5, `contenteditable=${editing}`);
		}
	});
	it("editControlsFollowActivity: the controls of authors show while the card is active", function () {
		this.timeout(5000);
		return editControlsFollowActivity(fixture);
	});
	it("editParity: each question is laid out in edit mode as learners see it", function () {
		this.timeout(10000);
		return editParity();
	});
	it("insertableMembers: the package categories match the task switcher", () => insertableMembers());
	it("gridLayouts: switches related tasks and retains content that fits both layouts", async function () {
		this.timeout(5000);
		fixture.contentEditable = "true";
		fixture.style.width = "320px";
		fixture.innerHTML = `
			<webwriter-choice label="Planets" points="3" solution='{"a":true}'>
				<webwriter-quiz-hint slot="hint"><p>A hint</p></webwriter-quiz-hint>
				<p slot="prompt">Choose a planet.</p>
				<webwriter-choice-item id="a"><p><em>Mars</em></p></webwriter-choice-item>
				<webwriter-choice-item id="b"><p>Moon</p></webwriter-choice-item>
				<webwriter-quiz-feedback slot="feedback"><p>Feedback</p></webwriter-quiz-feedback>
			</webwriter-choice>
			<webwriter-gap><p slot="prompt">Complete the sentence.</p><p>Water <webwriter-gap-item>freezes</webwriter-gap-item> at <em>zero</em>.</p></webwriter-gap>
			<webwriter-categorize categories='["cc1","cc2"]' solution='{"cc1":["item-a"]}'>
				<p slot="prompt">Sort the cards.</p>
				<webwriter-grid-item id="cc1"><p>First</p></webwriter-grid-item>
				<webwriter-grid-item id="cc2"><p>Second</p></webwriter-grid-item>
				<webwriter-grid-item id="item-a"><p>A</p></webwriter-grid-item>
			</webwriter-categorize>
			<webwriter-choice mode="true-false"><p slot="prompt">Is ice solid?</p></webwriter-choice>
			<webwriter-quiz-results></webwriter-quiz-results>`;
		await settleUpdates();
		const toggle = (task: Element) => task.shadowRoot!.querySelector(".task-helper .grid-layout-switch") as Any;
		const singleChoice = (task: Element) => task.shadowRoot!.querySelector(".task-helper .single-choice-switch") as Any;
		const addOption = (task: Element) => task.shadowRoot!.querySelector<HTMLElement>(".task-helper .add-option");
		const clickSwitch = (control: Any) => control.shadowRoot.querySelector('input[role="switch"]').click();
		const swap = async <T extends HTMLElement>(task: T, grid: boolean) => {
			const control = toggle(task);
			assert.isFalse(control.disabled);
			clickSwitch(control);
			await until(() => !!task.shadowRoot!.querySelector("table.grid") === grid, "the layout toggles in place");
			await settleUpdates();
			assert.isTrue(fixture.contains(task), "the original task element stays connected");
			assert.equal(toggle(task).checked, grid);
			return task;
		};
		const choice = fixture.querySelector("webwriter-choice")!;
		const prompt = choice.querySelector("p[slot=prompt]")!;
		const option = choice.querySelector("#a em")!;
		const hint = choice.querySelector("[slot=hint]")!;
		const feedback = choice.querySelector("[slot=feedback]")!;
		assert.equal(choice.shadowRoot!.querySelector(".task-helper .helper")?.textContent, "Select the correct answers.");
		assert.equal(choice.mode, "multiple");
		assert.notProperty(choice.options, "mode");
		assert.isFalse(singleChoice(choice).checked);
		assert.strictEqual(singleChoice(choice).nextElementSibling, toggle(choice));
		const trueFalse = fixture.querySelector('webwriter-choice[mode="true-false"]')!;
		assert.equal(trueFalse.shadowRoot!.querySelector(".task-helper .helper")?.textContent, "Select the correct answer.");
		assert.notExists(toggle(trueFalse));
		assert.notExists(singleChoice(trueFalse));
		assert.notExists(addOption(trueFalse));
		document.getSelection()!.collapse(prompt.firstChild, 1);
		await until(() => getComputedStyle(toggle(choice)).visibility === "visible", "the switch shows when the selection is in the task");
		assert.strictEqual(toggle(choice).nextElementSibling, addOption(choice));
		assert.closeTo(addOption(choice)!.getBoundingClientRect().right, toggle(choice).closest(".task-helper").getBoundingClientRect().right, 1);
		clickSwitch(singleChoice(choice));
		await choice.updateComplete;
		assert.equal(choice.getAttribute("mode"), "single");
		assert.notProperty(choice.options, "mode");
		assert.equal(choice.shadowRoot!.querySelector(".task-helper .helper")?.textContent, "Select the correct answer.");
		assert.deepEqual(choice.solution, { a: true });

		const choiceGrid = await swap(choice, true);
		assert.equal(choiceGrid.shadowRoot!.querySelector(".task-helper .helper")?.textContent, "Mark one correct choice per row.");
		assert.isTrue(toggle(choiceGrid).checked);
		assert.isTrue(choiceGrid.hasAttribute("grid"));
		assert.strictEqual(toggle(choiceGrid).nextElementSibling, addOption(choiceGrid));
		assert.equal(addOption(choiceGrid)?.getAttribute("aria-label"), "Add Row");
		assert.isAtLeast(choiceGrid.shadowRoot!.querySelector(".grid-wrap")!.getBoundingClientRect().top
			- addOption(choiceGrid)!.getBoundingClientRect().bottom, 4, "Leave a gap below Add Row");
		assert.notProperty(choiceGrid.options, "mode");
		assert.notExists(choiceGrid.shadowRoot!.querySelector('#task-configuration input[name="widget-header-mode"]'));
		assert.equal(choiceGrid.mode, "single");
		assert.deepEqual(choiceGrid.solution, { [choiceGrid.rows[0]]: ["a"] });
		assert.isTrue(singleChoice(choiceGrid).checked);
		clickSwitch(singleChoice(choiceGrid));
		await choiceGrid.updateComplete;
		assert.equal(choiceGrid.getAttribute("mode"), "multiple");
		assert.notProperty(choiceGrid.options, "mode");
		assert.exists(choiceGrid.shadowRoot!.querySelector('td.choice-cell input[type="checkbox"]'));
		assert.deepEqual(choiceGrid.solution, { [choiceGrid.rows[0]]: ["a"] });
		clickSwitch(singleChoice(choiceGrid));
		await choiceGrid.updateComplete;
		assert.exists(choiceGrid.shadowRoot!.querySelector('td.choice-cell input[type="radio"]'));
		assert.deepEqual([choiceGrid.label, choiceGrid.points], ["Planets", 3]);
		assert.deepEqual([choiceGrid.querySelector("p[slot=prompt]"), choiceGrid.querySelector("#a em"), choiceGrid.querySelector("[slot=hint]"), choiceGrid.querySelector("[slot=feedback]")],
			[prompt, option, hint, feedback]);
		const saved = document.createElement("div");
		saved.innerHTML = choiceGrid.outerHTML;
		fixture.append(saved);
		const reopened = saved.querySelector("webwriter-choice")!;
		await reopened.updateComplete;
		// Let the nested menu controls finish resolving their anchors before detaching the fixture.
		await settleUpdates();
		assert.isTrue(reopened.grid);
		assert.deepEqual(reopened.solution, choiceGrid.solution);
		assert.exists(reopened.shadowRoot!.querySelector("table.grid"));
		saved.remove();
		const header = choiceGrid.querySelector(`#${choiceGrid.rows[0]} p`)!;
		header.textContent = "A separate row prompt";
		const anotherRow = document.createElement("webwriter-grid-item");
		anotherRow.id = "choice-row-2";
		anotherRow.innerHTML = "<p>Another row prompt</p>";
		choiceGrid.append(anotherRow);
		choiceGrid.rows = [...choiceGrid.rows, anotherRow.id];
		await settleUpdates();
		const list = await swap(choiceGrid, false);
		assert.isFalse(list.hasAttribute("grid"));
		assert.deepEqual(list.solution, { a: true });
		assert.strictEqual(list.querySelector("#a em"), option);
		assert.notInclude(list.textContent, "Another row prompt");

		const gaps = fixture.querySelector("webwriter-gap")!;
		assert.notExists(toggle(gaps));
		assert.exists(gaps.shadowRoot!.querySelector(".task-helper .toggle-gap"));

		const cards = fixture.querySelector("webwriter-categorize")!;
		assert.notExists(toggle(cards));
		assert.lengthOf(cards.shadowRoot!.querySelectorAll(".bucket-zone"), 2);
		fixture.contentEditable = "false";
		await settleUpdates();
		assert.notExists(toggle(list));
		assert.notExists(singleChoice(list));
		assert.notExists(toggle(gaps));
		assert.notExists(toggle(cards));
	});
	it("inlineResize: questions resize in width only", () => inlineResize());
	it("groups: divides questions among several results cards", () => groups(fixture));
	it("trueFalse: answers, grades and authors with the true/false tiles", () => trueFalse(fixture));
	it("learnerOrder: shuffles order items for the learner only", () => learnerOrder(fixture));
	it("learnerChoice: grades the learner's choice", () => learnerChoice(fixture));
	it("savedRecording: keeps a saved speech recording", () => savedRecording(fixture));
	it("textAnswers: accepts several answers and points out near misses", () => textAnswers(fixture));
	it("orderFeedback: moves items with buttons and marks them after grading", () => orderFeedback(fixture));
	it("answerInsertion: adds Choice options and Sequence items from their author controls", () => answerInsertion(fixture));
	it("taskFeedback: shows the feedback of a question", () => taskFeedback(fixture));
	it("mixedQuiz: grades direct tasks together", () => mixedQuiz(fixture));
	it("promptIsolation: keeps prompts out of marks and gaps", () => promptIsolation(fixture));
	it("nativeGapTable: places and grades multiple gaps inside an authored table cell", async () => {
		fixture.contentEditable = "true";
		fixture.innerHTML = `<webwriter-gap>
			<p slot="prompt">Complete the table.</p>
			<table style="margin: 0"><tbody><tr><th scope="row"><p>Ice</p></th><td><p>Water freezes at <em>zero</em> degrees.</p></td></tr></tbody></table>
			<p>Use Celsius.</p>
		</webwriter-gap>`;
		assert.include(editingConfig["./widgets/webwriter-gap"].content, "(p | table)+");
		const task = fixture.querySelector("webwriter-gap")!;
		await task.updateComplete;
		const table = task.querySelector("table")!;
		const paragraph = table.querySelector("td p")!;
		const emphasis = paragraph.querySelector("em")!;
		const selection = document.getSelection()!;
		const toggle = task.shadowRoot!.querySelector<HTMLButtonElement>(".toggle-gap")!;

		selection.setBaseAndExtent(paragraph.firstChild!, 6, paragraph.firstChild!, 13);
		await until(() => !toggle.disabled, "Selecting text in a table cell enables the gap button");
		toggle.click();
		await settleUpdates();
		selection.setBaseAndExtent(emphasis.firstChild!, 0, emphasis.firstChild!, 4);
		toggle.click();
		await settleUpdates();
		assert.deepEqual(Array.from(paragraph.querySelectorAll("webwriter-gap-item"), gap => gap.textContent), ["freezes", "zero"]);
		assert.equal(emphasis.querySelector("webwriter-gap-item")?.textContent, "zero");
		assert.equal(task.shadowRoot!.querySelector<HTMLSlotElement>("slot:not([name])")?.assignedElements()[0], table);
		const helper = task.shadowRoot!.querySelector(".task-helper")!;
		const controlsBottom = Math.max(helper.getBoundingClientRect().bottom, toggle.getBoundingClientRect().bottom);
		assert.isAtLeast(table.getBoundingClientRect().top - controlsBottom, 6);
		assert.notExists(task.shadowRoot!.querySelector(".grid-layout-switch"));

		fixture.contentEditable = "false";
		await settleUpdates();
		for (const gap of paragraph.querySelectorAll("webwriter-gap-item")) {
			const input = gap.shadowRoot!.querySelector<HTMLElement & { value: string }>("sl-input")!;
			input.value = gap.textContent ?? "";
			input.dispatchEvent(new Event("sl-input", { bubbles: true }));
		}
		assert.equal(task.checkAnswer(true), 1);
	});

	it("markPlaceholder: uses the editor placeholder with a sentence-case label", async () => {
		fixture.contentEditable = "true";
		fixture.innerHTML = `<webwriter-mark><p slot="prompt">Find all nouns.</p><p></p></webwriter-mark>`;
		const mark = fixture.querySelector("webwriter-mark")!;
		await settleUpdates();
		const answer = mark.querySelector("p:not([slot])")!;
		const slot = mark.shadowRoot!.querySelector("slot:not([name])")!;
		assert.equal(getComputedStyle(answer).getPropertyValue("--ww-placeholder").trim(), '"Text to highlight"');
		assert.equal(getComputedStyle(slot, "::after").content, "none", "The editor draws the only placeholder");
		assert.equal(answer.textContent, "", "The answer remains empty in the document");

		fixture.contentEditable = "false";
		await settleUpdates();
		assert.equal(slot.getAttribute("aria-label"), "Text to highlight");
	});
});

mocha.run();
