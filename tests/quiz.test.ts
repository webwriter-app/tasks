/// <reference types="mocha" />
import "mocha/mocha.js";
import { assert } from "chai";
import { getMochaConfig } from "@webwriter/build/test";
import { registerQuizType } from "../src/model/quiz-api";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-true-false";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import "../src/widgets/webwriter-speech";
import type { WebwriterSpeech } from "../src/widgets/webwriter-speech";
import "../src/widgets/webwriter-mark";
import "../src/widgets/webwriter-quiz-feedback";
import "../src/widgets/webwriter-quiz-hint";
import "../src/widgets/webwriter-quiz";
import type { WebwriterQuiz } from "../src/widgets/webwriter-quiz";
import { WebwriterTask } from "../src/components/webwriter-task";
import "../src/widgets/webwriter-text";

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
	const button = Array.from(root.querySelectorAll("sl-button")).find(button => button.textContent.trim() === label);
	assert.ok(button instanceof HTMLElement, `Missing button ${label}`);
	button.click();
}

async function authoring(fixture: HTMLElement) {
	fixture.contentEditable = "true";
	const quiz = document.createElement("webwriter-quiz") as WebwriterQuiz;
	fixture.append(quiz);
	await quiz.updateComplete;
	assert.ok(Object.keys(quiz.actions ?? {}).length === 0, "The quiz drawer must omit question insertion actions");
	assert.ok(quiz.shadowRoot!.querySelectorAll(".insert-task-grid sl-button").length === 9,
		"An empty quiz must show all built-in insertion buttons");
	clickButton(quiz.shadowRoot!, "True or False");
	assert.ok(quiz.firstElementChild?.matches("webwriter-true-false"), "An inline button must insert a direct task");
	await settleUpdates();
	const firstTask = quiz.querySelector("webwriter-true-false")!;
	assert.ok(firstTask.shadowRoot!.querySelector(".authoring-row sl-dropdown .insert-task-grid"),
		"Show the question picker in the last question's authoring row");
	quiz.firstElementChild?.remove();
	await settleUpdates();
	assert.ok(!quiz.hasAttribute("hide-points") && !quiz.hidePoints, "The absent setting must use the widget default");
	quiz.setAttribute("hide-points", "");
	assert.ok(quiz.hidePoints, "Drawer writes must update the reflected property");
	quiz.removeAttribute("hide-points");
	assert.ok(!quiz.hidePoints, "Removing an attribute must restore its default");

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
	const comment = document.createComment("preserve me");
	quiz.append(comment);
	for (const label of ["True or False", "Single Choice", "Multiple Choice", "Order", "Text", "Mark", "Speech", "Gap", "Pairing", "External type"]) {
		await settleUpdates();
		clickButton((quiz.lastElementChild ?? quiz).shadowRoot!, label);
	}
	assert.ok(quiz.children.length === 10, "The question picker must insert built-in and externally registered questions");
	assert.ok(Array.from(quiz.children).every(task => task instanceof WebwriterTask), "Task types must be direct quiz children");
	await settleUpdates();
	assert.ok(Array.from(quiz.children).every(task => task.shadowRoot!.querySelector(".add-feedback")),
		"Every task type must have an Add Feedback button");
	const tasksWithPicker = Array.from(quiz.children).filter(task => task.shadowRoot?.querySelector(".authoring-row .add-question"));
	assert.ok(tasksWithPicker.length === 1 && tasksWithPicker[0] === quiz.lastElementChild,
		"Move the single question picker to the new last question");
	const first = quiz.firstElementChild as HTMLElement;
	assert.ok(first.localName === "webwriter-true-false", "Insert the task type without a wrapper");
	assert.ok(first.firstElementChild?.matches('p[slot="prompt"]'), "New questions must include a slotted native paragraph");
	action(first, "Move question down");
	assert.ok(quiz.children[1] === first, "Question move must resolve the current siblings");
	action(first, "Move question up");
	action(first, "Delete question");
	assert.ok(!first.isConnected && quiz.firstChild === comment, "Drawer edits must preserve unrelated nodes");

	const choice = quiz.querySelector("webwriter-choice")!;
	assert.ok(choice.options?.points && choice.options.mode, "A task drawer must contain shared and type-specific options");
	assert.ok(choice.querySelector("webwriter-choice-item"), "A new choice must include its initial option");
	const pairing = quiz.querySelector("webwriter-pairing")!;
	action(pairing, "Add Pair");
	const cards = pairing.querySelectorAll("webwriter-pairing-item");
	assert.ok(cards.length === 2 && cards[0].id !== cards[1].id && pairing.firstElementChild?.slot === "prompt",
		"Adding a pair must create two identified authored items");
	await settleUpdates();
	assert.ok(pairing.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prompt"]')!.assignedElements().length === 1,
		"Pairing cards must not steal the prompt's slot");
	const hintPopup = pairing.shadowRoot!.querySelector("hint-popup")!;
	const hintButton = hintPopup.shadowRoot!.querySelector<HTMLElement>("sl-icon-button")!;
	hintButton.click();
	await settleUpdates();
	const hint = pairing.firstElementChild;
	assert.ok(hint?.matches('webwriter-quiz-hint[slot="hint"]'), "The hint popup must insert a direct task child");
	assert.ok(pairing.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="hint"]')!.assignedElements()[0] === hint,
		"A manual task slot must assign the direct hint");
}

const hidePointsLabel = (quiz: WebwriterQuiz) => quiz.options!.hidePoints.label as string;

async function languages(fixture: HTMLElement) {
	const german = document.createElement("webwriter-quiz") as WebwriterQuiz;
	const french = document.createElement("webwriter-quiz") as WebwriterQuiz;
	fixture.lang = "de-AT";
	french.lang = "fr-CA";
	fixture.append(german, french);
	for (let attempt = 0; attempt < 60 && (
		hidePointsLabel(german) !== "Punkte ausblenden" ||
		hidePointsLabel(french) !== "Masquer les points"
	); attempt++) await settleUpdates();
	await Promise.all([german.updateComplete, french.updateComplete]);
	assert.ok(german.getAttribute("lang") === null, "Inherited language must stay out of authored HTML");
	assert.ok(hidePointsLabel(german) === "Punkte ausblenden", "Use the inherited German drawer label");
	assert.ok(hidePointsLabel(french) === "Masquer les points", "Use the French widget override");
	assert.ok(german.shadowRoot!.textContent.includes("Abgeben"), "Render German learner labels");
	assert.ok(french.shadowRoot!.textContent.includes("Envoyer"), "Render French learner labels");
	fixture.lang = "en-GB";
	await settleUpdates();
	await german.updateComplete;
	assert.ok(german.getAttribute("lang") === null, "Changing the ancestor language must not add an attribute");
	assert.ok(german.shadowRoot!.textContent.includes("Submit"), "Respond to a language change on the ancestor");
	assert.ok(french.shadowRoot!.textContent.includes("Envoyer"), "Keep the other widget's language");

	const questionLabels = (quiz: WebwriterQuiz) =>
		Array.from(quiz.shadowRoot?.querySelectorAll(".insert-task-grid sl-button") ?? [], button => button.textContent.trim());
	fixture.contentEditable = "true";
	fixture.lang = "dv";
	french.lang = "zh-Hant";
	for (let attempt = 0; attempt < 60 && (
		!questionLabels(german).includes("ގިނަ އިޚްތިޔާރު") ||
		!questionLabels(french).includes("多選")
	); attempt++) await settleUpdates();
	assert.ok(questionLabels(german).includes("ގިނަ އިޚްތިޔާރު"), "Use the inherited Dhivehi question type label");
	assert.ok(questionLabels(french).includes("多選"), "Use the Traditional Chinese question type label in the other quiz");

	const filipino = document.createElement("webwriter-quiz") as WebwriterQuiz;
	filipino.lang = "tl";
	fixture.append(filipino);
	for (let attempt = 0; attempt < 60 && !questionLabels(filipino).includes("Maramihang pagpipilian"); attempt++) {
		await settleUpdates();
	}
	assert.ok(questionLabels(filipino).includes("Maramihang pagpipilian"), "Resolve the canonical Filipino locale from tl");

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
	const quiz = document.createElement("webwriter-quiz") as WebwriterQuiz;
	const task = document.createElement("webwriter-true-false");
	const prompt = addPrompt(task, "The authored prompt");
	quiz.append(task);
	fixture.append(quiz);
	await settleUpdates();
	assert.ok(!quiz.shadowRoot!.querySelector(".insert-task-grid"), "Hide authoring buttons in use mode");
	assert.ok(task.shadowRoot!.querySelector(".title")?.textContent === "Question 1", "Show titles by default");
	quiz.setAttribute("hide-question-title", "");
	quiz.setAttribute("hide-points", "");
	await settleUpdates();
	assert.ok(!task.shadowRoot!.querySelector(".quiz-header"), "Hide the title and points without leaving an empty header");
	assert.ok(task.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="prompt"]')!.assignedElements()[0] === prompt,
		"The authored prompt must still be rendered");
	quiz.removeAttribute("hide-question-title");
	await settleUpdates();
	assert.ok(task.shadowRoot!.querySelector(".title"), "Restore the title when clearing the option");
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
	choice.reset();
	await choice.updateComplete;
	assert.ok(choice.outerHTML === authored, "Shuffling and grading must leave authored choices intact");
	choice.querySelector("#first")!.remove();
	await settleUpdates();
	assert.ok(choice.shadowRoot!.querySelector<HTMLSlotElement>("slot:not([name])")!.assignedElements().length === 1,
		"Use current items after a DOM change");
}

async function savedRecording(fixture: HTMLElement) {
	const recording = document.createElement("webwriter-speech") as WebwriterSpeech;
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
	const quiz = document.createElement("webwriter-quiz") as WebwriterQuiz;
	order.setAttribute("solution", "[]");
	quiz.append(choice, order);
	fixture.append(quiz);
	await settleUpdates();
	assert.ok(order.shadowRoot!.querySelector(".authoring-row > sl-button-group > .add-option") &&
		order.shadowRoot!.querySelector(".authoring-row > sl-button-group > .add-feedback") &&
		order.shadowRoot!.querySelector(".authoring-row > .add-question"),
		"Group the task buttons on the same row as the question picker");
	for (const task of [choice, order]) {
		for (const layout of ["list", "tiles"] as const) {
			task.layout = layout;
			await task.updateComplete;
			const count = task.children.length;
			clickButton(task.shadowRoot!, "Add Option");
			assert.ok(task.children.length === count + 1 && task.lastElementChild?.firstElementChild?.localName === "p",
				`The ${layout} button must append one editable answer`);
		}
	}
	assert.ok(order.solution.join() === Array.from(order.children, item => item.id).join(),
		"Inline insertion must extend the authored order solution");
	fixture.contentEditable = "false";
	await settleUpdates();
	assert.ok(!choice.shadowRoot!.querySelector(".add-option") && !order.shadowRoot!.querySelector(".add-option"),
		"Hide answer insertion in use mode");
}

async function questionFeedback(fixture: HTMLElement) {
	const quiz = document.createElement("webwriter-quiz") as WebwriterQuiz;
	const text = document.createElement("webwriter-text");
	text.freeText = true;
	const speech = document.createElement("webwriter-speech");
	speech.setAttribute("feedback", "Listen to your response.\nCompare it with a model.");
	fixture.contentEditable = "true";
	quiz.append(text, speech);
	fixture.append(quiz);
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
	fixture.contentEditable = "false";
	await settleUpdates();
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(!text.shadowRoot!.querySelector(".question-feedback"), "Keep feedback hidden when submission is incomplete");
	const input = text.shadowRoot!.querySelector("sl-textarea") as HTMLElement & { value: string };
	input.value = "An open-ended response";
	input.dispatchEvent(new Event("sl-change"));
	speech.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(text.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="feedback"]')?.assignedElements()[0] === feedback &&
		feedback.querySelector("strong")?.textContent === "approach",
		"Show the original formatted feedback for open-ended text on submission");
	assert.ok(speech.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="feedback"]')?.assignedElements()[0] === speechFeedback,
		"Show feedback even for a question without a score");
	assert.ok(quiz.shadowRoot!.querySelector(".total-result strong")?.textContent === "1 / 1",
		"Ungraded feedback must leave the quiz score alone");
	clickButton(quiz.shadowRoot!, "Reset answers");
	await settleUpdates();
	assert.ok(!text.shadowRoot!.querySelector(".question-feedback") && !speech.shadowRoot!.querySelector(".question-feedback") &&
		text.contains(feedback) && speech.contains(speechFeedback), "Reset must hide feedback and preserve authored content");
}

async function mixedQuiz(fixture: HTMLElement) {
	const quiz = document.createElement("webwriter-quiz") as WebwriterQuiz;
	const first = document.createElement("webwriter-true-false");
	const order = document.createElement("webwriter-order");
	first.setAttribute("points", "2");
	order.setAttribute("points", "3");
	const item = document.createElement("webwriter-order-item");
	item.id = "one";
	item.textContent = "Only item";
	order.append(item);
	quiz.append(first, order);
	fixture.append(quiz);
	await settleUpdates();
	assert.ok(order.shadowRoot!.querySelector(".title")?.textContent === "Question 2", "Number tasks across different types");
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(first.shadowRoot!.querySelector(".required-warning"), "Show the unanswered warning on the task itself");
	clickButton(first.shadowRoot!, "True");
	clickButton(quiz.shadowRoot!, "Submit");
	await settleUpdates();
	assert.ok(quiz.shadowRoot!.querySelector(".total-result strong")?.textContent === "5 / 5", "Grade the direct tasks together");
	clickButton(quiz.shadowRoot!, "Reset answers");
	await settleUpdates();
	assert.ok(!first.checkValidity() && !quiz.shadowRoot!.querySelector(".total-result"), "Reset direct tasks and their results");
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
	selection.removeAllRanges();
}

mocha.setup(getMochaConfig());

describe("<webwriter-quiz>", function () {
	let fixture: HTMLDivElement;
	beforeEach(function () {
		fixture = document.createElement("div");
		document.body.append(fixture);
	});
	afterEach(function () {
		fixture.remove();
		document.getSelection()?.removeAllRanges();
	});

	it("authoring: inserts questions and keeps its settings in attributes", () => authoring(fixture));
	it("languages: localizes the drawer and the questions", () => languages(fixture));
	it("titleVisibility: hides question titles on request", () => titleVisibility(fixture));
	it("learnerOrder: shuffles order items for the learner only", () => learnerOrder(fixture));
	it("learnerChoice: grades the learner's choice", () => learnerChoice(fixture));
	it("savedRecording: keeps a saved speech recording", () => savedRecording(fixture));
	it("answerInsertion: inserts answers into gap and mark tasks", () => answerInsertion(fixture));
	it("questionFeedback: shows the feedback of a question", () => questionFeedback(fixture));
	it("mixedQuiz: grades direct tasks together", () => mixedQuiz(fixture));
	it("promptIsolation: keeps prompts out of marks and gaps", () => promptIsolation(fixture));
});

mocha.run();
