/** The questions of a GIFT file (Moodle's plain-text question format) that map to quiz tasks. */
export type GiftQuestion =
	| { kind: "choice"; text: string; multiple: boolean; options: { text: string; correct: boolean }[] }
	| { kind: "true-false"; text: string; answer: boolean }
	| { kind: "short"; text: string; answers: string[]; numeric: boolean }
	| { kind: "essay"; text: string }
	| { kind: "matching"; text: string; pairs: [string, string][] }
	/** `segments` has one more entry than `solutions`: the text around the gaps. */
	| { kind: "gap"; segments: string[]; solutions: string[] };

/** A question of the quiz that GIFT cannot express. It is written as a comment. */
export type GiftSkipped = { kind: "skipped"; type: string };

/** Why a file is not GIFT. The widget turns the code into a message in the reader's language. */
export class GiftError extends Error {
	constructor(readonly code: "unbalanced" | "empty") {
		super(code);
	}
}

const special = /[\\~=#{}:]/g;

const escapeGift = (text: string) => text.replace(special, character => "\\" + character);

/** Splits at the first unescaped `separator`, or returns undefined. */
function indexOfUnescaped(text: string, separator: string, from = 0) {
	for (let i = from; i < text.length; i++) {
		if (text[i] === "\\") i++;
		else if (text.startsWith(separator, i)) return i;
	}
	return -1;
}

function unescapeGift(text: string, trim = true) {
	const plain = text.replace(/\\n/g, " ").replace(/\\(.)/gs, "$1").replace(/\s+/g, " ");
	return trim ? plain.trim() : plain;
}

type Token = { mark: "=" | "~" | ""; weight: number | undefined; text: string };

/** The answers of one `{…}` block: each starts with `=` or `~`, may carry a `%weight%` and ends at a `#` (feedback). */
function tokenize(block: string): Token[] {
	const tokens: Token[] = [];
	let mark: Token["mark"] = "";
	let raw = "";
	let feedback = false;
	const flush = () => {
		const weight = /^\s*%(-?\d+(?:\.\d+)?)%/.exec(raw);
		const text = weight ? raw.slice(weight[0].length) : raw;
		if (mark !== "" || text.trim() !== "") tokens.push({ mark, weight: weight ? Number(weight[1]) : undefined, text });
		raw = "";
		feedback = false;
	};
	for (let i = 0; i < block.length; i++) {
		const character = block[i];
		if (character === "\\") {
			if (!feedback) raw += character + (block[i + 1] ?? "");
			i++;
		} else if (character === "=" || character === "~") {
			flush();
			mark = character;
		} else if (character === "#") {
			feedback = true;
		} else if (!feedback) {
			raw += character;
		}
	}
	flush();
	return tokens;
}

function numericValue(text: string) {
	const [value] = unescapeGift(text).split(/:|\.\./);
	return Number.isFinite(Number(value)) && value.trim() !== "" ? value.trim() : undefined;
}

function parseTyped(prompt: string, block: string): GiftQuestion | null {
	const head = block.trim();
	if (head === "") return { kind: "essay", text: prompt };

	const boolean = /^(T|F|TRUE|FALSE)\s*(?:#.*)?$/is.exec(head);
	if (boolean) return { kind: "true-false", text: prompt, answer: boolean[1].toUpperCase().startsWith("T") };

	if (head.startsWith("#")) {
		const tokens = tokenize(head.slice(1));
		const value = numericValue((tokens.find(token => token.mark === "=") ?? tokens[0])?.text ?? "");
		return value === undefined ? null : { kind: "short", text: prompt, answers: [value], numeric: true };
	}

	const tokens = tokenize(head);
	if (tokens.length > 0 && tokens.every(token => token.mark === "=" && indexOfUnescaped(token.text, "->") >= 0)) {
		const pairs = tokens.map(token => {
			const at = indexOfUnescaped(token.text, "->");
			return [unescapeGift(token.text.slice(0, at)), unescapeGift(token.text.slice(at + 2))] as [string, string];
		}).filter(([left, right]) => left !== "" && right !== "");
		return pairs.length > 0 ? { kind: "matching", text: prompt, pairs } : null;
	}

	if (tokens.some(token => token.mark === "~")) {
		const options = tokens
			.filter(token => token.mark !== "")
			.map(token => ({
				text: unescapeGift(token.text),
				correct: token.mark === "=" || (token.weight ?? 0) > 0,
				weighted: token.weight !== undefined,
			}))
			.filter(option => option.text !== "");
		const multiple = options.filter(option => option.correct).length > 1 || options.some(option => option.weighted);
		return { kind: "choice", text: prompt, multiple, options: options.map(({ text, correct }) => ({ text, correct })) };
	}

	const answers = tokens.filter(token => token.mark === "=").map(token => unescapeGift(token.text)).filter(Boolean);
	return answers.length > 0 ? { kind: "short", text: prompt, answers, numeric: false } : null;
}

function parseQuestion(source: string): GiftQuestion | null {
	let text = source.trim();
	if (text.startsWith("::")) {
		const end = indexOfUnescaped(text, "::", 2);
		if (end >= 0) text = text.slice(end + 2).trim();
	}
	text = text.replace(/^\[(?:html|plain|markdown|moodle)\]/i, "");

	const segments: string[] = [];
	const blocks: string[] = [];
	let segment = "";
	for (let i = 0; i < text.length; i++) {
		const character = text[i];
		if (character === "\\") {
			segment += character + (text[i + 1] ?? "");
			i++;
		} else if (character === "{") {
			const end = indexOfUnescaped(text, "}", i + 1);
			if (end < 0 || indexOfUnescaped(text.slice(i + 1, end), "{") >= 0) throw new GiftError("unbalanced");
			segments.push(segment);
			blocks.push(text.slice(i + 1, end));
			segment = "";
			i = end;
		} else if (character === "}") {
			throw new GiftError("unbalanced");
		} else {
			segment += character;
		}
	}
	segments.push(segment);

	if (blocks.length === 0) return null;
	if (blocks.length === 1 && unescapeGift(segments[1]) === "") return parseTyped(unescapeGift(segments[0]), blocks[0]);

	const solutions: string[] = [];
	for (const block of blocks) {
		const answer = tokenize(block).find(token => token.mark === "=");
		const solution = answer ? unescapeGift(answer.text) : "";
		if (solution === "") return null;
		solutions.push(solution);
	}
	return { kind: "gap", segments: segments.map(segment => unescapeGift(segment, false)), solutions };
}

/**
 * Reads the questions of a GIFT file that the quiz can take over. Descriptions, categories and
 * question types without a counterpart are skipped. A brace that is not closed makes the file invalid.
 */
export function parseGift(source: string): GiftQuestion[] {
	const lines = source.replace(/^﻿/, "").split(/\r\n|\r|\n/).filter(line => !/^\s*\/\//.test(line));
	const questions: GiftQuestion[] = [];
	for (const block of lines.join("\n").split(/\n\s*\n/)) {
		const trimmed = block.trim();
		if (trimmed === "" || trimmed.startsWith("$")) continue;
		const question = parseQuestion(trimmed.replace(/\s*\n\s*/g, " "));
		if (question) questions.push(question);
	}
	if (questions.length === 0) throw new GiftError("empty");
	return questions;
}

function formatBlock(question: GiftQuestion) {
	switch (question.kind) {
		case "choice": {
			const correct = question.options.filter(option => option.correct).length;
			const weight = Number((100 / Math.max(correct, 1)).toFixed(5));
			const options = question.options.map(option => question.multiple
				? `~%${option.correct ? weight : -100}%${escapeGift(option.text)}`
				: `${option.correct ? "=" : "~"}${escapeGift(option.text)}`);
			return `{\n\t${options.join("\n\t")}\n}`;
		}
		case "true-false":
			return question.answer ? "{T}" : "{F}";
		case "short":
			return question.numeric ? `{#${escapeGift(question.answers[0])}}` : `{${question.answers.map(answer => "=" + escapeGift(answer)).join(" ")}}`;
		case "essay":
			return "{}";
		case "matching":
			return `{\n\t${question.pairs.map(([left, right]) => `=${escapeGift(left)} -> ${escapeGift(right)}`).join("\n\t")}\n}`;
		default:
			return "";
	}
}

/** Writes questions as GIFT. A question that GIFT cannot express is left as a `//` comment. */
export function formatGift(questions: (GiftQuestion | GiftSkipped)[]): string {
	return questions.map(question => {
		if (question.kind === "skipped") return `// Skipped: ${question.type} has no GIFT equivalent.`;
		if (question.kind === "gap") {
			return question.segments.map((segment, index) =>
				escapeGift(segment) + (index < question.solutions.length ? `{=${escapeGift(question.solutions[index])}}` : "")).join("");
		}
		return `${escapeGift(question.text)} ${formatBlock(question)}`.trim();
	}).join("\n\n") + "\n";
}
