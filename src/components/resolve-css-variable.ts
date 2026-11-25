const resolvedCssVariableCache = new Map<string, string>();

export function resolveCssVariable(variableName: `--${string}`, fallback: string) {
	const cachedValue = resolvedCssVariableCache.get(variableName);
	if (cachedValue) return cachedValue;

	const value = getComputedStyle(document.body).getPropertyValue(variableName).trim() || fallback;

	resolvedCssVariableCache.set(variableName, value);
	return value;
}
