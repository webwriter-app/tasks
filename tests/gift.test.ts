/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";

import "../src/widgets/webwriter-quiz-results";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-order";
import "../src/widgets/webwriter-order-item";
import "../src/widgets/webwriter-true-false";
import "../src/widgets/webwriter-text";
import "../src/widgets/webwriter-numeric";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-gap-item";
import "../src/widgets/webwriter-pairing";
import "../src/widgets/webwriter-pairing-item";
import { formatGift, GiftError, parseGift } from "../src/model/gift";
import { sampleGift } from "./fixtures/sample-gift";
import { assert, done, mount, unmount, until, type Any } from "./helpers";

mocha.setup(getMochaConfig());

/** A Quiz Results card without questions: GIFT goes in and out through it. */
const emptyQuiz = async (): Promise<Any> => {
	const quiz = mount(`<webwriter-quiz-results hide-task-title></webwriter-quiz-results>`).firstElementChild as Any;
	await done(quiz);
	return quiz;
};

const importInto = async (quiz: Any, text: string) => (await quiz.importGift(new File([text], "quiz.gift")))();
const kinds = (quiz: Any) => (quiz.tasks as Element[]).map(task => task.localName.replace("webwriter-", ""));

describe("GIFT model", function () {
	it("reads every supported question type of the fixture", function () {
		const questions = parseGift(sampleGift);
		assert.deepEqual(questions.map(question => question.kind), ["choice", "choice", "true-false", "short", "short", "essay", "matching", "gap"]);
		const [single, multiple, truth, text, numeric, , matching, gap] = questions as Any[];
		assert.equal(single.text, "What is the capital of France?");
		assert.deepEqual(single.options, [{ text: "Paris", correct: true }, { text: "Rome", correct: false }, { text: "Berlin", correct: false }]);
		assert.isTrue(multiple.multiple);
		assert.deepEqual(multiple.options.map((option: Any) => option.correct), [true, true, false]);
		assert.isFalse(truth.answer);
		assert.equal(text.text, "Who wrote {Faust}: a drama?", "escaped characters are read as text");
		assert.deepEqual(numeric.answers, ["8"]);
		assert.deepEqual(matching.pairs, [["France", "Paris"], ["Italy", "Rome"], ["Spain", "Madrid"]]);
		assert.deepEqual(gap.segments, ["The ", " sat on the ", "."]);
		assert.deepEqual(gap.solutions, ["cat", "mat"]);
	});

	it("rejects an unclosed brace and a file without questions", function () {
		assert.throws(() => parseGift("Question {=a ~b"), GiftError);
		assert.throws(() => parseGift("Just a description.\n\n// nothing else"), GiftError);
	});

	it("writes text that it reads back unchanged", function () {
		const questions = parseGift(sampleGift);
		assert.deepEqual(parseGift(formatGift(questions)), questions);
	});
});

describe("GIFT import and export of <webwriter-quiz-results>", function () {
	afterEach(unmount);

	it("imports the fixture as questions before the card, and the apply function is what changes the document", async function () {
		const quiz = await emptyQuiz();
		const apply = await quiz.importGift(new File([sampleGift], "quiz.gift"));
		assert.equal(quiz.tasks.length, 0, "nothing changes before the apply function runs");
		apply();
		assert.deepEqual(kinds(quiz), ["choice", "choice", "true-false", "text", "numeric", "text", "pairing", "gap"]);
		assert.ok(quiz.tasks.every((task: Element) => task.nextElementSibling && !quiz.contains(task)), "the questions go before the card");
		const [single, multiple] = quiz.tasks as Any[];
		assert.equal(single.getAttribute("mode"), "single");
		assert.equal(multiple.getAttribute("mode"), "multiple");
		await done(single);
		const options = Array.from(single.querySelectorAll("webwriter-choice-item")) as Element[];
		assert.deepEqual(options.map(option => option.textContent), ["Paris", "Rome", "Berlin"]);
		assert.deepEqual(options.map(option => single.solution[option.id]), [true, false, false]);
		const text = quiz.tasks[3] as Any;
		await done(text);
		assert.equal(text.solution, "Goethe");
		assert.equal(quiz.tasks[5].getAttribute("grading-method"), "completion");
		assert.equal(quiz.tasks[4].solution, 8);
	});

	it("imported tasks can be answered and graded", async function () {
		const quiz = await emptyQuiz();
		await importInto(quiz, "The sky is blue. {T}");
		const task = quiz.tasks[0] as Any;
		await done(task);
		await done(quiz);
		(task.shadowRoot.querySelector('input[value="true"]') as HTMLElement).click();
		await done(task);
		(quiz.shadowRoot.querySelector("sl-button[variant=primary]") as HTMLElement).click();
		await until(() => quiz.shadowRoot.querySelector(".total-result"), "the result");
		assert.equal(quiz.signals.score.get(), 1);
	});

	it("an invalid file throws a message and leaves the quiz as it is", async function () {
		const quiz = await emptyQuiz();
		await importInto(quiz, "Q {T}");
		for (const text of ["Q {=a ~b", "nothing to import"]) {
			let message = "";
			try {
				await quiz.importGift(new File([text], "bad.gift"));
			} catch (error) {
				message = (error as Error).message;
			}
			assert.match(message, /GIFT/, text);
		}
		assert.equal(quiz.tasks.length, 1);
	});

	it("exports the tasks and writes comments for the types GIFT cannot express", async function () {
		const quiz = await emptyQuiz();
		await importInto(quiz, sampleGift);
		quiz.before(mount(`<webwriter-order><p slot="prompt">Sort</p><webwriter-order-item id="o1"><p>A</p></webwriter-order-item></webwriter-order>`).firstElementChild!);
		const file = quiz.exportGift() as File;
		assert.equal(file.name, "quiz.gift");
		const text = await file.text();
		assert.include(text, "What is the capital of France? {\n\t=Paris\n\t~Rome\n\t~Berlin\n}");
		assert.include(text, "The Earth is flat. {F}");
		assert.include(text, "How many legs does a spider have? {#8}");
		assert.include(text, "The {=cat} sat on the {=mat}.");
		assert.include(text, "// Skipped: webwriter-order");
	});

	it("round trip: export then import gives the same quiz", async function () {
		const quiz = await emptyQuiz();
		await importInto(quiz, sampleGift);
		const first = await (quiz.exportGift() as File).text();
		quiz.tasks.forEach((task: Element) => task.remove());
		await importInto(quiz, first);
		assert.equal(await (quiz.exportGift() as File).text(), first);
		assert.deepEqual(parseGift(first), parseGift(sampleGift));
	});

	it("pads a GIFT choice with only one answer", async function () {
		const quiz = await emptyQuiz();
		await importInto(quiz, "A choice {=Correct ~}");
		const [choice] = quiz.tasks;
		const options = Array.from(choice.querySelectorAll(":scope > webwriter-choice-item")) as HTMLElement[];
		assert.deepEqual(options.map(item => item.textContent), ["Correct", ""]);
		assert.isTrue(choice.solution[options[0].id]);
	});
});

describe("list conversions", function () {
	afterEach(unmount);

	it("a ul or ol becomes a single-choice question", async function () {
		for (const tag of ["ul", "ol"]) {
			const choice = mount(`<webwriter-choice></webwriter-choice>`).firstElementChild as Any;
			await done(choice);
			const fragment = document.createDocumentFragment();
			fragment.append(mount(`<${tag}><li>One</li><li>Two</li></${tag}>`).firstElementChild!);
			assert.isTrue(choice.loadList(fragment));
			assert.equal(choice.getAttribute("mode"), "single");
			assert.ok(choice.firstElementChild?.matches('p[slot="prompt"]'), "the question gets an empty prompt");
			assert.deepEqual(Array.from(choice.querySelectorAll("webwriter-choice-item"), (item: Element) => item.textContent), ["One", "Two"]);
			fragment.firstElementChild!.lastElementChild!.remove();
			assert.isTrue(choice.loadList(fragment));
			assert.deepEqual(Array.from(choice.querySelectorAll("webwriter-choice-item"), (item: Element) => item.textContent), ["One", ""]);
			assert.isFalse(choice.loadList(document.createDocumentFragment()), "an empty fragment is declined");
		}
	});

	it("choice options become a ul and order items an ol in the correct order", async function () {
		const root = mount(`<div><webwriter-choice><p slot="prompt">P</p><webwriter-choice-item id="c1"><p>A</p></webwriter-choice-item><webwriter-choice-item id="c2"><p>B</p></webwriter-choice-item></webwriter-choice>
			<webwriter-order><p slot="prompt">P</p><webwriter-order-item id="o1"><p>First</p></webwriter-order-item><webwriter-order-item id="o2"><p>Second</p></webwriter-order-item></webwriter-order></div>`);
		const [choice, order] = Array.from(root.querySelectorAll("webwriter-choice, webwriter-order")) as Any[];
		await done(choice);
		order.solution = ["o2", "o1"];
		await done(order);
		assert.equal(choice.toList().outerHTML, "<ul><li>A</li><li>B</li></ul>");
		assert.equal(order.toList().outerHTML, "<ol><li>Second</li><li>First</li></ol>");
	});
});

describe("quiz signals", function () {
	afterEach(unmount);

	it("score and complete follow submit and reset", async function () {
		const root = mount(`<webwriter-true-false solution="true"><p slot="prompt">T</p></webwriter-true-false><webwriter-quiz-results hide-task-title></webwriter-quiz-results>`);
		const quiz = root.querySelector("webwriter-quiz-results") as Any;
		const task = root.querySelector("webwriter-true-false") as Any;
		await done(quiz);
		await done(task);
		const { score, complete } = quiz.signals;
		assert.equal(score.get(), 0);
		assert.isFalse(complete.get());
		assert.strictEqual(quiz.signals.score, score, "the signal instances are stable");

		(quiz.shadowRoot.querySelector("sl-button[variant=primary]") as HTMLElement).click();
		await done(quiz);
		assert.isFalse(complete.get(), "an unanswered quiz is not submitted");

		(task.shadowRoot.querySelector('input[value="true"]') as HTMLElement).click();
		await done(task);
		(quiz.shadowRoot.querySelector("sl-button[variant=primary]") as HTMLElement).click();
		await done(quiz);
		assert.equal(score.get(), 1);
		assert.isTrue(complete.get());

		(quiz.shadowRoot.querySelector(".final-card .reset") as HTMLElement).click();
		await done(quiz);
		assert.equal(score.get(), 0);
		assert.isFalse(complete.get());
	});
});

mocha.run();
