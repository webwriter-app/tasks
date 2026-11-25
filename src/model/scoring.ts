/**
 * Shared pure scoring and matching helpers for `@webwriter/tasks` task widgets.
 */

export type TextMatchOptions = {
	ignoreCase?: boolean;
	ignorePunctuation?: boolean;
	allowTypos?: boolean;
	useRegex?: boolean;
};

export type NumericScoreOptions = {
	tolerance?: number;
	toleranceMode?: "absolute" | "relative";
	partialRange?: number;
};

/** Clamps finite values to `[0, 1]`, returning `0` for non-finite inputs. */
export function clampUnit(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

/** Returns `1` only when every expected item (`total > 0`) is correct, otherwise `0`. */
export function scoreAllOrNothing(correct: number, total: number): number {
	return total > 0 && correct === total ? 1 : 0;
}

/** Returns the fraction of expected items answered correctly (`correct / total`), clamped to `[0, 1]`. */
export function scoreProportion(correct: number, total: number): number {
	return total > 0 ? clampUnit(correct / total) : 0;
}

/** Penalized multi-select score: `(correctSelected - wrongSelected) / totalCorrect`, clamped to `[0, 1]`. */
export function scorePenalizedSelection(correctSelected: number, wrongSelected: number, totalCorrect: number): number {
	if (totalCorrect <= 0) return wrongSelected === 0 ? 1 : 0;
	return clampUnit((correctSelected - wrongSelected) / totalCorrect);
}

/** Per-option accuracy: fraction of all options whose selected/unselected state matches the key. */
export function scoreOptionAccuracy(
	correctSelected: number,
	wrongSelected: number,
	totalCorrect: number,
	totalOptions: number,
): number {
	if (totalOptions <= 0) return 0;
	const trueNegatives = Math.max(0, totalOptions - totalCorrect - wrongSelected);
	return clampUnit((correctSelected + trueNegatives) / totalOptions);
}

/** Fraction of items placed at their exact expected index. */
export function scoreOrderPosition(actual: readonly string[], expected: readonly string[]): number {
	if (!actual.length || actual.length !== expected.length) return 0;
	const matches = actual.filter((id, index) => id === expected[index]).length;
	return matches / actual.length;
}

/**
 * Kendall-tau concordant pair ratio: fraction of all item pairs `(i < j)` appearing in the same
 * relative order in `actual` as in `expected`.
 */
export function scoreOrderRelative(actual: readonly string[], expected: readonly string[]): number {
	const n = expected.length;
	if (n === 0) return 0;
	if (n === 1) return actual[0] === expected[0] ? 1 : 0;
	const expectedIndex = new Map(expected.map((id, index) => [id, index]));
	const filtered = actual.filter(id => expectedIndex.has(id));
	let concordant = 0;
	const totalPairs = (n * (n - 1)) / 2;
	for (let i = 0; i < filtered.length; i++) {
		const posI = expectedIndex.get(filtered[i])!;
		for (let j = i + 1; j < filtered.length; j++) {
			const posJ = expectedIndex.get(filtered[j])!;
			if (posI < posJ) concordant++;
		}
	}
	return clampUnit(concordant / totalPairs);
}

/**
 * Scores a numeric answer against `target` with optional absolute/relative tolerance
 * and optional linear partial-credit falloff band beyond tolerance.
 */
export function scoreNumeric(answer: number | undefined, target: number, options: NumericScoreOptions = {}): number {
	if (answer === undefined || !Number.isFinite(answer) || !Number.isFinite(target)) return 0;
	const rawTol = Number.isFinite(options.tolerance) ? Math.abs(options.tolerance!) : 0;
	const tolMode = options.toleranceMode ?? "absolute";
	const effTol = tolMode === "relative" ? Math.abs(target) * (rawTol / 100) : rawTol;
	const diff = Math.abs(answer - target);
	if (diff <= effTol + 1e-9) return 1;

	const rawPartial = Number.isFinite(options.partialRange) ? Math.abs(options.partialRange!) : 0;
	const effBand = tolMode === "relative" ? Math.abs(target) * (rawPartial / 100) : rawPartial;
	if (effBand > 0 && diff < effTol + effBand) {
		return clampUnit(1 - (diff - effTol) / effBand);
	}
	return 0;
}


/** The Levenshtein single-character edit distance between two strings. */
export function editDistance(a: string, b: string): number {
	return sequenceDistance(a, b, (left, right) => left === right ? 0 : 1);
}

function sequenceDistance(a: ArrayLike<string>, b: ArrayLike<string>, substitution: (left: string, right: string) => number): number {
	const row = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const current = row[j];
			row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + substitution(a[i - 1], b[j - 1]));
			previous = current;
		}
	}
	return row[b.length];
}

/** Penalties for missing, extra, or changed words, ignoring punctuation when requested. */
export function scoreDictation(answer: string, transcript: string, options: TextMatchOptions, language?: string): number {
	let segmenter: Intl.Segmenter | undefined;
	if (typeof Intl.Segmenter === "function") {
		try { segmenter = new Intl.Segmenter(language || undefined, { granularity: "word" }); }
		catch { segmenter = new Intl.Segmenter(undefined, { granularity: "word" }); }
	}
	const tokens = (text: string) => {
		text = text.normalize("NFC");
		if (options.ignoreCase) text = segmenter ? text.toLocaleLowerCase(segmenter.resolvedOptions().locale) : text.toLowerCase();
		const parts = segmenter ? Array.from(segmenter.segment(text), ({ segment }) => segment) : text.match(/\S+/g) ?? [];
		return parts.map(part => (options.ignorePunctuation ? part.replace(/\p{P}/gu, "") : part).trim()).filter(Boolean);
	};
	const expected = tokens(transcript);
	if (!expected.length) return 0;
	const distance = sequenceDistance(expected, tokens(answer), (left, right) => {
		if (left === right) return 0;
		return options.allowTypos && left.length >= 4 && Math.abs(left.length - right.length) <= 1
			&& editDistance(left, right) === 1 ? 0.5 : 1;
	});
	return clampUnit(1 - distance / expected.length);
}
/** Normalizes text for answer comparison according to whitespace, punctuation/diacritics, and case rules. */
export function normalizeText(text: string, options: TextMatchOptions = {}): string {
	let result = text.trim().replace(/\s+/g, " ");
	if (options.ignorePunctuation) {
		result = result
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "")
			.replace(/\p{P}/gu, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
	if (options.ignoreCase) result = result.toLowerCase();
	return result;
}

/** Tests whether `answer` matches any candidate in `accepted` under normalization, typo tolerance, or regex rules. */
export function matchText(answer: string, accepted: readonly string[], options: TextMatchOptions = {}): boolean {
	if (options.useRegex) {
		const trimmed = answer.trim();
		if (trimmed !== "") {
			const flags = options.ignoreCase ? "i" : "";
			for (const pattern of accepted) {
				if (!pattern.trim()) continue;
				try {
					if (new RegExp(pattern, flags).test(trimmed)) return true;
				} catch {
					// Ignore invalid author regex patterns safely.
				}
			}
		}
		return false;
	}

	const normAnswer = normalizeText(answer, options);
	for (const candidate of accepted) {
		const normCandidate = normalizeText(candidate, options);
		if (normCandidate === normAnswer) return true;
		if (options.allowTypos && normCandidate.length >= 4 && normAnswer !== "") {
			const maxDist = normCandidate.length >= 8 ? 2 : 1;
			if (editDistance(normAnswer, normCandidate) <= maxDist) return true;
		}
	}
	return false;
}
