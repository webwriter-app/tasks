import type { MsgFn } from "@lit/localize";
import ChevronDownIcon from "@tabler/icons/outline/chevron-down.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { LitElement, css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { transaction } from "@webwriter/widget/transaction";
import { randomizeArray } from "../model/randomize-array";
import { TopLayerPopup, topLayerStyles } from "./top-layer";

export const gapChoicesAttribute = "choices";

/** Read the authored alternatives. An explicit empty list overrides an old task-wide mode. */
export function gapChoices(gap: Element | undefined): string[] | undefined {
	if (!gap) return undefined;
	const raw = gap.getAttribute(gapChoicesAttribute);
	if (raw !== null) {
		try {
			const values: unknown = JSON.parse(raw);
			if (Array.isArray(values)) {
				return [...new Set(values.filter((value): value is string => typeof value === "string")
					.map(value => value.trim()).filter(Boolean))];
			}
		} catch { /* An invalid attribute leaves the legacy choices available. */ }
	}
	const legacy = (gap.getAttribute("distractors") ?? "").split("|").map(value => value.trim()).filter(Boolean);
	return legacy.length ? [...new Set(legacy)] : undefined;
}

const choiceOrder = new WeakMap<Element, { source: string; options: string[] }>();

/** Shuffle once per set of choices, so updates do not move the learner's options around. */
export function shuffledGapChoices(gap: Element, values: string[]): string[] {
	const unique = [...new Set(values.filter(Boolean))];
	const source = JSON.stringify(unique);
	const saved = choiceOrder.get(gap);
	if (saved?.source === source) return saved.options;
	const options = randomizeArray(unique);
	choiceOrder.set(gap, { source, options });
	return options;
}

export class GapChoicesEditor extends LitElement {
	static styles = [topLayerStyles, css`
		:host { display: inline-flex; flex: none; }
		.trigger, .remove {
			display: inline-grid;
			place-items: center;
			border: 0;
			padding: 0;
			background: transparent;
			color: var(--sl-color-neutral-600);
			cursor: pointer;
		}
		.trigger { inline-size: 1.5em; block-size: 100%; border-inline-start: 1px solid var(--sl-color-neutral-200); }
		.trigger:hover, .remove:hover { background: var(--sl-color-neutral-100); }
		.trigger img, .remove img { inline-size: 1em; block-size: 1em; }
		.choice-panel {
			box-sizing: border-box;
			inline-size: min(15rem, calc(100vw - 16px));
			max-block-size: var(--popup-space, calc(100dvh - 16px));
			overflow: auto;
			padding: var(--sl-spacing-2x-small);
			border: 1px solid var(--sl-color-neutral-200);
			border-radius: var(--sl-border-radius-medium);
			background: var(--sl-color-neutral-0);
			box-shadow: var(--sl-shadow-medium);
			color: var(--sl-color-neutral-800);
			font-size: var(--sl-font-size-small);
			line-height: 1.4;
		}
		.choice-row {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--sl-spacing-2x-small);
			padding-inline: var(--sl-spacing-2x-small);
			min-block-size: 1.75rem;
			overflow-wrap: anywhere;
		}
		.solution { color: var(--sl-color-success-700); }
		.remove { inline-size: 1.5rem; block-size: 1.5rem; flex: none; }
		.add-option-row { display: flex; gap: var(--sl-spacing-2x-small); margin-block-start: var(--sl-spacing-2x-small); }
		.add-option-row input { min-inline-size: 0; flex: 1; }
		.add-option-row input, .add-option-row button {
			box-sizing: border-box;
			padding: var(--sl-spacing-2x-small);
			border: 1px solid var(--sl-color-neutral-300);
			border-radius: var(--sl-border-radius-small);
			background: var(--sl-color-neutral-0);
			color: inherit;
			font: inherit;
		}
		.add-option-row button { cursor: pointer; }
	`];

	@property({ attribute: false }) accessor gap: HTMLElement | undefined;
	@property({ attribute: false }) accessor solutions: string[] = [];
	@property({ attribute: false }) accessor alternatives: string[] = [];
	@property({ attribute: false }) accessor message!: MsgFn;
	private trigger = createRef<HTMLButtonElement>();
	private panel = createRef<HTMLElement>();
	private body = createRef<HTMLElement>();
	private addField = createRef<HTMLInputElement>();
	private popup = new TopLayerPopup(this, () => ({
		trigger: this.trigger.value,
		panel: this.panel.value,
		keep: this,
		anchor: this.parentElement,
		scrollArea: this.body.value,
	}), { onShow: () => this.addField.value?.focus({ preventScroll: true }) });

	private save(alternatives: string[]) {
		const gap = this.gap;
		const root = this.getRootNode();
		if (!gap?.isConnected || !(root instanceof ShadowRoot) || (gap !== root.host && gap.parentElement !== root.host)) return;
		transaction(gap, () => gap.setAttribute(gapChoicesAttribute, JSON.stringify(alternatives)));
		this.alternatives = alternatives;
	}

	private add = () => {
		const field = this.addField.value;
		const value = field?.value.trim();
		if (!field || !value) return;
		const alternatives = gapChoices(this.gap) ?? [];
		if (!this.solutions.includes(value) && !alternatives.includes(value)) this.save([...alternatives, value]);
		field.value = "";
		field.focus();
	};

	render() {
		if (!this.gap || !this.message) return nothing;
		const label = this.message("Gap options");
		const add = this.message("Add option");
		return html`<button type="button" class="trigger" ${ref(this.trigger)}
			aria-label=${label} title=${label} aria-haspopup="dialog" aria-controls="gap-choices"
			aria-expanded=${String(this.popup.open)} data-ww-capture-selection="false" @click=${() => this.popup.toggle()}>
			<img src=${ChevronDownIcon} alt="">
		</button>
		<div class="top-layer" id="gap-choices" role="dialog" aria-label=${label} popover="manual"
			data-ww-capture-selection="false" ${ref(this.panel)}>
			<div class="choice-panel" ${ref(this.body)}>
				${this.solutions.filter(Boolean).map(value => html`<div class="choice-row solution"
					title=${this.message("Solution")}>${value}</div>`)}
				${this.alternatives.map(value => html`<div class="choice-row"><span>${value}</span>
					<button type="button" class="remove" aria-label=${`${this.message("Remove answer")}: ${value}`}
						@click=${() => {
							this.save((gapChoices(this.gap) ?? []).filter(option => option !== value));
							this.addField.value?.focus();
						}}><img src=${XIcon} alt=""></button></div>`)}
				<div class="add-option-row">
					<input type="text" aria-label=${add} placeholder=${add} ${ref(this.addField)}
						@keydown=${(event: KeyboardEvent) => {
							if (event.key !== "Enter" || event.isComposing) return;
							event.preventDefault();
							event.stopPropagation();
							this.add();
						}}>
					<button type="button" @click=${this.add}>${this.message("Add")}</button>
				</div>
			</div>
		</div>`;
	}
}
