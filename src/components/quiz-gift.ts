import { isQuizTask } from "../model/quiz-api";
import { formatGift, parseGift, type GiftQuestion, type GiftSkipped } from "../model/gift";
import { createChoiceItem, withMinimumChoiceItems } from "./choice-items";
import { encryptedProperty } from "./encrypted-property";
import { createPairingItem } from "./migrate-pairing-columns";

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
			if (task.getAttribute("mode") === "true-false") {
				return { kind: "true-false", text, answer: !solution.false || Boolean(solution.true) };
			}
			const multiple = task.getAttribute("mode") === "multiple";
			const options = items(task, "webwriter-choice-item").map(item => ({ text: contentText(item), correct: Boolean(item.id && solution[item.id]) }));
			const firstCorrect = options.findIndex(option => option.correct);
			return { kind: "choice", text, multiple, options: multiple ? options : options.map((option, index) => ({ ...option, correct: index === firstCorrect })) };
		}
		case "webwriter-text": {
			const answers = [solutionOf<string | string[]>(task, "")].flat().map(collapse).filter(answer => answer !== "");
			const method = task.getAttribute("grading-method");
			const openEnded = method === null ? task.hasAttribute("free-text") : method !== "exact";
			if (openEnded || answers.length === 0) return { kind: "essay", text };
			return { kind: "short", text, answers, numeric: task.getAttribute("type") === "number" };
		}
		case "webwriter-numeric": {
			const mode = task.getAttribute("mode") ?? "input";
			const method = task.getAttribute("grading-method") ?? "exact";
			const answer = solutionOf<number>(task, 0);
			return mode === "input" && method === "exact" && Number.isFinite(answer)
				? { kind: "short", text, answers: [String(answer)], numeric: true }
				: { kind: "skipped", type: task.localName };
		}
		case "webwriter-pairing": {
			const columns = items(task, "webwriter-pairing-column");
			const byId = (container: Element) =>
				new Map(items(container, "webwriter-pairing-item").map(item => [item.id, contentText(item)]));
			const leftItems = byId(columns[0] ?? task);
			const rightItems = columns[1] ? byId(columns[1]) : leftItems;
			const links = solutionOf<[string, string][]>(task, [])
				.filter(([left, right]) => leftItems.get(left) && rightItems.get(right));
			const multi = task.hasAttribute("multiple-connections")
				&& [0, 1].some(side => new Set(links.map(link => link[side])).size < links.length);
			const pairs = links.map(([left, right]) => [leftItems.get(left)!, rightItems.get(right)!] as [string, string]);
			return pairs.length && !multi ? { kind: "matching", text, pairs } : { kind: "skipped", type: task.localName };
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

/** Questions as the text of a GIFT file. */
export function exportGift(tasks: Element[]) {
	return formatGift(tasks.filter(isQuizTask).map(giftQuestionOf));
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
				const items = options.map(option => {
					const item = createChoiceItem(document, option.text);
					item.id = option.id;
					return item;
				});
				return element(document, "webwriter-choice", { mode: question.multiple ? "multiple" : "single", solution: encrypted(solution) }, prompt,
					...withMinimumChoiceItems(document, items));
			}
			case "short":
				if (question.numeric) {
					return element(document, "webwriter-numeric", {
						solution: encryptedProperty.toAttribute!(Number(question.answers[0]), Number) as string,
					}, prompt);
				}
				return element(document, "webwriter-text", {
					solution: encryptedProperty.toAttribute!(question.answers.length > 1 ? question.answers : question.answers[0], String) as string,
				}, prompt);
			case "essay":
				return element(document, "webwriter-text", { "grading-method": "completion", rows: "4" }, prompt);
			case "matching": {
				const pairs = question.pairs.map(texts => ({ ids: [newId(), newId()], texts }));
				const columns = [0, 1].map(side => {
					const cards = pairs.map(({ ids, texts }) =>
						element(document, "webwriter-pairing-item", { id: ids[side] }, paragraph(document, texts[side])));
					return element(document, "webwriter-pairing-column", {}, ...(cards.length ? cards : [createPairingItem(document)]));
				});
				return element(document, "webwriter-pairing", { solution: encrypted(pairs.map(pair => pair.ids)) }, prompt, ...columns);
			}
		}
	});
}

/** Parses a GIFT file completely and returns the tasks it describes. */
export function importGift(document: Document, text: string) {
	return tasksFromGift(document, parseGift(text));
}
