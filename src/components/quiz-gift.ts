import { isQuizTask } from "../model/quiz-api";
import { formatGift, parseGift, type GiftQuestion, type GiftSkipped } from "../model/gift";
import { encryptedProperty } from "./encrypted-property";

const collapse = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

const promptOf = (task: Element) =>
	collapse(Array.from(task.children).filter(child => child.slot === "prompt").map(child => child.textContent).join(" "));

/** The text of an element without its named slots (a hint, for example). */
const contentText = (element: Element) =>
	collapse(Array.from(element.childNodes).filter(node => !(node instanceof Element && node.slot)).map(node => node.textContent).join(" "));

/** The authored children of a task that are not in a named slot. */
const items = (task: Element, tag: string) =>
	Array.from(task.children).filter(child => child.localName === tag && !child.slot);

/** Reads the solution attribute directly, so that a task that is not upgraded yet still exports. */
function solutionOf<T>(task: Element, fallback: T): T {
	const raw = task.getAttribute("solution");
	if (raw === null) return fallback;
	return (encryptedProperty.fromAttribute?.(raw, Array) as T | null | undefined) ?? fallback;
}

/** The text of a gap task with the solution of each gap in place of the gap. */
function gapSegments(task: Element) {
	const segments = [""];
	const solutions: string[] = [];
	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) segments[segments.length - 1] += node.textContent ?? "";
		else if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as Element;
			if (element.localName === "webwriter-gap-item") {
				solutions.push(collapse(element.textContent));
				segments.push("");
			} else {
				element.childNodes.forEach(walk);
				if (element.localName === "p") segments[segments.length - 1] += " ";
			}
		}
	};
	for (const child of task.children) if (!child.slot) walk(child);
	return { segments: segments.map(segment => segment.replace(/\s+/g, " ")), solutions };
}

/** The task as GIFT question, or the name of the task type if GIFT cannot express it. */
export function giftQuestionOf(task: Element): GiftQuestion | GiftSkipped {
	const text = promptOf(task);
	switch (task.localName) {
		case "webwriter-true-false":
			return { kind: "true-false", text, answer: task.getAttribute("solution") !== "false" };
		case "webwriter-choice": {
			const solution = solutionOf<Record<string, boolean>>(task, {});
			const multiple = task.getAttribute("mode") === "multiple";
			const options = items(task, "webwriter-choice-item").map(item => ({ text: contentText(item), correct: Boolean(item.id && solution[item.id]) }));
			const firstCorrect = options.findIndex(option => option.correct);
			return { kind: "choice", text, multiple, options: multiple ? options : options.map((option, index) => ({ ...option, correct: index === firstCorrect })) };
		}
		case "webwriter-text": {
			const solution = collapse(solutionOf<string>(task, ""));
			if (task.hasAttribute("free-text") || solution === "") return { kind: "essay", text };
			return { kind: "short", text, answers: [solution], numeric: task.getAttribute("type") === "number" };
		}
		case "webwriter-pairing": {
			const byId = new Map(items(task, "webwriter-pairing-item").map(item => [item.id, contentText(item)]));
			const pairs = solutionOf<[string, string][]>(task, [])
				.map(([left, right]) => [byId.get(left) ?? "", byId.get(right) ?? ""] as [string, string])
				.filter(([left, right]) => left !== "" && right !== "");
			return pairs.length > 0 ? { kind: "matching", text, pairs } : { kind: "skipped", type: task.localName };
		}
		case "webwriter-gap": {
			const { segments, solutions } = gapSegments(task);
			if (solutions.length === 0 || solutions.some(solution => solution === "")) return { kind: "skipped", type: task.localName };
			return { kind: "gap", segments: [text ? `${text} ${segments[0]}`.trimStart() : segments[0], ...segments.slice(1)], solutions };
		}
		default:
			return { kind: "skipped", type: task.localName };
	}
}

/** The tasks of the quiz as the text of a GIFT file. */
export function exportGift(quiz: Element) {
	return formatGift(Array.from(quiz.children).filter(isQuizTask).map(giftQuestionOf));
}

const newId = () => "ww" + crypto.randomUUID();

function element(document: Document, tag: string, attributes: Record<string, string> = {}, ...children: (Node | string)[]) {
	const created = document.createElement(tag);
	for (const [name, value] of Object.entries(attributes)) created.setAttribute(name, value);
	created.append(...children);
	return created;
}

const paragraph = (document: Document, text: string, slot?: string) =>
	element(document, "p", slot ? { slot } : {}, text);

const encrypted = (value: unknown) => encryptedProperty.toAttribute!(value, Array) as string;

/** Builds the task elements for the questions of a GIFT file. Nothing is attached to a document. */
export function tasksFromGift(document: Document, questions: GiftQuestion[]): HTMLElement[] {
	return questions.map(question => {
		if (question.kind === "gap") {
			const body = element(document, "p");
			question.segments.forEach((segment, index) => {
				body.append(segment);
				if (index < question.solutions.length) body.append(element(document, "webwriter-gap-item", {}, question.solutions[index]));
			});
			return element(document, "webwriter-gap", {}, paragraph(document, "", "prompt"), body);
		}
		const prompt = paragraph(document, question.text, "prompt");
		switch (question.kind) {
			case "true-false":
				return element(document, "webwriter-true-false", { solution: question.answer ? "true" : "false" }, prompt);
			case "choice": {
				const options = question.options.map(option => ({ id: newId(), ...option }));
				const solution = Object.fromEntries(options.map(option => [option.id, option.correct]));
				return element(document, "webwriter-choice", { mode: question.multiple ? "multiple" : "single", solution: encrypted(solution) }, prompt,
					...options.map(option => element(document, "webwriter-choice-item", { id: option.id }, paragraph(document, option.text))));
			}
			case "short":
				return element(document, "webwriter-text", { type: question.numeric ? "number" : "text", solution: encryptedProperty.toAttribute!(question.answers[0], String) as string }, prompt);
			case "essay":
				return element(document, "webwriter-text", { "free-text": "" }, prompt);
			case "matching": {
				const pairs = question.pairs.map(([left, right]) => ({ left: newId(), right: newId(), texts: [left, right] }));
				return element(document, "webwriter-pairing", { solution: encrypted(pairs.map(pair => [pair.left, pair.right])) }, prompt,
					...pairs.flatMap(pair => [
						element(document, "webwriter-pairing-item", { id: pair.left }, paragraph(document, pair.texts[0])),
						element(document, "webwriter-pairing-item", { id: pair.right }, paragraph(document, pair.texts[1])),
					]));
			}
		}
	});
}

/** Parses a GIFT file completely and returns the tasks it describes. */
export function importGift(document: Document, text: string) {
	return tasksFromGift(document, parseGift(text));
}
