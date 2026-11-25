import type { MsgFn } from "@lit/localize";

export type QuizType = {
	packageId: string;
	widgetPosition?: number;
	/** Optional section in the task type switcher. */
	section?: "select" | "write" | "arrange" | "speak" | "show";
	/** This type is reached through a layout control rather than the type picker. */
	layoutOnly?: boolean;
	id: string;
	icon: string;
	getName(locale?: string, translate?: MsgFn): string;
	/** Creates a new task; `translate` gives preset content in the widget's language. */
	createInstance(locale?: string, translate?: MsgFn): QuizTaskElement;
	/** Whether an element is a task of this type. Without it, the element's tag name has to equal `id`. */
	matches?(element: Element): boolean;
	/** Optional in-place updater when switching between subtypes of the same element. */
	applyTo?(element: HTMLElement): void;
	/** Subtype that represents the family's default action in the type switcher. */
	defaultSubtype?: string;
	/** Optional parent type ID when registering a subtype of another task type. */
	parentId?: string;
	/** Optional variants of this task type. */
	subtypes?: QuizType[];
};

interface IWebWriterQuizType {
	checkValidity(): boolean;
	reset(): void;
	checkAnswer?(detailedFeedback: boolean): number;
}

/** A task. The tasks and the Task Results widget may be loaded from separate bundles. */
export interface QuizTaskElement extends HTMLElement, IWebWriterQuizType {
	readonly maximumPoints: number;
	showRequiredWarning(show: boolean): void;
	showScore(score: number | undefined, submitted?: boolean): void;
	resetFeedback(): void;
	requestUpdate(): void;
}

/** A Task Results widget, which submits, grades and resets its tasks together. */
export interface QuizResultsElement extends HTMLElement {
	readonly hideTaskTitle: boolean;
	readonly hidePoints: boolean;
	requestUpdate(): void;
	updateTaskScore?(task: QuizTaskElement, share: number | undefined): void;
}

export function isQuizTask(element: Element): element is QuizTaskElement {
	const task = element as Partial<QuizTaskElement>;
	return typeof task.checkValidity === "function" && typeof task.resetFeedback === "function";
}

type WebwriterQuizRegistry = {
	version: number;
	quizTypes: QuizType[];
	listeners: ((types: readonly QuizType[]) => void)[];
	pendingSubtypes?: Map<string, QuizType[]>;
	/** The connected tasks and Task Results widgets of all bundles. */
	tasks?: Set<QuizTaskElement>;
	results?: Set<QuizResultsElement>;
	memberListeners?: Set<() => void>;
	notifyScheduled?: boolean;
};

declare global {
	interface Window {
		__wwQuizTaskRegistry__: WebwriterQuizRegistry;
	}
}

function getRegistry(): Required<Pick<WebwriterQuizRegistry, "tasks" | "results" | "memberListeners" | "pendingSubtypes">> & WebwriterQuizRegistry {
	const registry = (window.__wwQuizTaskRegistry__ ??= { version: 3, quizTypes: [], listeners: [] });
	registry.pendingSubtypes ??= new Map();
	registry.tasks ??= new Set();
	registry.results ??= new Set();
	registry.memberListeners ??= new Set();
	return registry as Required<Pick<WebwriterQuizRegistry, "tasks" | "results" | "memberListeners" | "pendingSubtypes">> & WebwriterQuizRegistry;
}

export function getQuizTypes(): readonly QuizType[] {
	const registry = getRegistry();
	return [...registry.quizTypes, ...Array.from(registry.pendingSubtypes.values()).flat()];
}

function insertOrdered(list: QuizType[], item: QuizType) {
	let i = 0;

	// First, order by package id
	// The @webwriter/tasks package is always first, regardless of its package id
	if (item.packageId !== "@webwriter/tasks") {
		while (i < list.length) {
			if (list[i].packageId.localeCompare(item.packageId) >= 0) break;
			i++;
		}
	}

	// Then, order by widget position (ascending), and then by widget id (ascending)
	const newPosition = item.widgetPosition ?? Infinity;
	while (i < list.length && list[i].packageId === item.packageId) {
		const currentPosition = list[i].widgetPosition ?? Infinity;
		if (currentPosition > newPosition) break;
		// Use id as a tiebreaker (alphabetical order)
		if (currentPosition === newPosition && list[i].id.localeCompare(item.id) >= 0) break;
		i++;
	}

	list.splice(i, 0, item);
}

export function registerQuizType(type: QuizType): void {
	const registry = getRegistry();

	if (type.parentId) {
		const parent = registry.quizTypes.find(entry => entry.id === type.parentId);
		if (parent) {
			parent.subtypes = [...(parent.subtypes ?? [])];
			insertOrdered(parent.subtypes, type);
		} else {
			const pending = registry.pendingSubtypes.get(type.parentId) ?? [];
			insertOrdered(pending, type);
			registry.pendingSubtypes.set(type.parentId, pending);
		}
	} else {
		const pending = registry.pendingSubtypes.get(type.id);
		if (pending?.length) {
			type = { ...type, subtypes: [...(type.subtypes ?? [])] };
			for (const sub of pending) insertOrdered(type.subtypes!, sub);
			registry.pendingSubtypes.delete(type.id);
		}
		insertOrdered(registry.quizTypes, type);
	}

	const quizTypes = getQuizTypes();
	registry.listeners.forEach(cb => cb(quizTypes));
}

const matchesType = (type: QuizType, element: Element) =>
	type.matches ? type.matches(element) : element.localName === type.id;

/** The registered type of a task element, checking subtypes first. */
export function quizTypeOf(element: Element): QuizType | undefined {
	for (const type of getQuizTypes()) {
		const sub = type.subtypes?.find(entry => matchesType(entry, element));
		if (sub) return sub;
		if (matchesType(type, element)) return type;
	}
	return undefined;
}

/** Finds a registered top-level quiz type or subtype by its `id`. */
export function findQuizTypeById(id: string): QuizType | undefined {
	for (const type of getQuizTypes()) {
		if (type.id === id) return type;
		const sub = type.subtypes?.find(entry => entry.id === id);
		if (sub) return sub;
	}
	return undefined;
}

export function onQuizTypesChanged(cb: (types: readonly QuizType[]) => void): () => void {
	const registry = getRegistry();
	cb(getQuizTypes());
	registry.listeners.push(cb);
	return () => registry.listeners = registry.listeners.filter(l => l !== cb);
}

function notifyMembers() {
	const registry = getRegistry();
	if (registry.notifyScheduled) return;
	registry.notifyScheduled = true;
	// Moving an element disconnects and connects it again; one notification covers both.
	queueMicrotask(() => {
		registry.notifyScheduled = false;
		registry.memberListeners.forEach(cb => cb());
	});
}

/** Call from `connectedCallback` and `disconnectedCallback` of a task. */
export function setQuizTaskConnected(task: QuizTaskElement, connected: boolean) {
	const { tasks } = getRegistry();
	if (connected) tasks.add(task);
	else tasks.delete(task);
	notifyMembers();
}

/** Call from `connectedCallback` and `disconnectedCallback` of a Task Results widget. */
export function setQuizResultsConnected(results: QuizResultsElement, connected: boolean) {
	const registry = getRegistry();
	if (connected) registry.results.add(results);
	else registry.results.delete(results);
	notifyMembers();
}

/** Calls `cb` whenever tasks or Task Results widgets come or go. Returns the function that stops it. */
export function onQuizMembersChanged(cb: () => void): () => void {
	const { memberListeners } = getRegistry();
	memberListeners.add(cb);
	return () => memberListeners.delete(cb);
}

const byDocumentOrder = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

/**
 * The Task Results widget that grades a task: the first one that follows it in the document.
 * Tasks after the last Task Results widget belong to that one. Without one, a task stands alone.
 */
export function resultsOf(task: Element): QuizResultsElement | null {
	if (!task.isConnected) return null;
	const root = task.getRootNode();
	const results = [...getRegistry().results].filter(r => r.isConnected && r.getRootNode() === root).sort(byDocumentOrder);
	return results.find(r => task.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) ?? results.at(-1) ?? null;
}

/** The tasks a Task Results widget grades, in document order. */
export function tasksOf(results: QuizResultsElement): QuizTaskElement[] {
	if (!results.isConnected) return [];
	return tasksIn(results.getRootNode()).filter(task => resultsOf(task) === results);
}

/** The tasks numbered together, in document order. */
export function taskGroupOf(task: QuizTaskElement): QuizTaskElement[] {
	const results = resultsOf(task);
	return results ? tasksOf(results) : tasksIn(task.getRootNode());
}

function tasksIn(root: Node): QuizTaskElement[] {
	return [...getRegistry().tasks]
		.filter(task => task.isConnected && task.getRootNode() === root)
		.sort(byDocumentOrder);
}
