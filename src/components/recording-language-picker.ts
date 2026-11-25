import { LanguagePicker } from "@webwriter/widget/language-picker";
import { css } from "lit";

export class RecordingLanguagePicker extends LanguagePicker {
	private caption?: HTMLSpanElement;

	constructor() {
		super();
		const root = this.shadowRoot;
		const select = root?.querySelector<HTMLSelectElement>('select[part~="control"]');
		if (!root || !select) return;
		for (const option of select.options) {
			if (!option.value || !option.text.endsWith(")")) continue;
			const native = new Intl.DisplayNames(option.value, { type: "language", fallback: "none" }).of(option.value);
			if (!native) continue;
			const suffix = ` (${native})`;
			if (!option.text.endsWith(suffix)) continue;
			const name = option.text.slice(0, -suffix.length);
			option.dataset.languageName = name;
			option.text = `${name} [${native}]`;
		}

		if (!CSS.supports("appearance", "base-select")) return;
		const button = this.ownerDocument.createElement("button");
		button.type = "button";
		this.caption = this.ownerDocument.createElement("span");
		button.append(this.caption);
		select.prepend(button);

		const style = this.ownerDocument.createElement("style");
		style.textContent = `
			select, ::picker(select) { appearance: base-select; }
			select::picker-icon {
				content: "";
				flex: none;
				align-self: center;
				margin-inline-start: auto;
				inline-size: .4rem;
				block-size: .4rem;
				border-right: 1.5px solid currentColor;
				border-bottom: 1.5px solid currentColor;
				transform: translateY(-.12rem) rotate(45deg);
			}
			::picker(select) {
				inline-size: max-content;
				max-inline-size: min(26rem, calc(100vw - 1rem));
				max-block-size: min(22rem, 60vh);
			}
			button { min-inline-size: 0; }
			button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		`;
		root.append(style);
	}

	override connectedCallback() {
		super.connectedCallback();
		this.updateCaption();
	}

	override attributeChangedCallback(name: string, previous: string | null, current: string | null) {
		super.attributeChangedCallback(name, previous, current);
		if (name === "value" || name === "placeholder") this.updateCaption();
	}

	private updateCaption() {
		if (!this.caption) return;
		const selected = this.caption.closest("select")?.selectedOptions[0];
		this.caption.textContent = selected?.dataset.languageName ?? selected?.text ?? this.placeholder;
	}
}

export const recordingLanguageStyles = css`
	.recording-language {
		inline-size: min(10rem, 44cqi);
		min-inline-size: 0;
	}

	.recording-language::part(control) {
		inline-size: 100%;
		min-block-size: var(--sl-input-height-small);
		padding-inline: var(--sl-spacing-x-small) .625rem;
		border: 1px solid var(--sl-input-border-color);
		border-radius: var(--sl-input-border-radius-small);
		background: var(--sl-input-background-color, Canvas);
		color: inherit;
		font-size: var(--sl-font-size-small);
		text-overflow: ellipsis;
	}

`;

export function inheritedRecordingLanguage(widget: HTMLElement) {
	return widget.lang.trim() || widget.ownerDocument.documentElement.lang.trim()
		|| widget.ownerDocument.defaultView?.navigator.language || "en";
}

export function recordingLanguageName(language: string, locale: string) {
	try {
		return new Intl.DisplayNames(locale, { type: "language" }).of(language) ?? language;
	} catch {
		return language;
	}
}
