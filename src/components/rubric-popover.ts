import { str, type MsgFn } from "@lit/localize";
import ListCheckIcon from "@tabler/icons/outline/list-check.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { transaction } from "@webwriter/widget/transaction";
import { css, html, nothing, type ReactiveControllerHost } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { TopLayerPopup } from "./top-layer";

export const selfAssessmentOption = {
	value: "self-assess",
	label: (widget: { msg: MsgFn }) => widget.msg("Self-assessment"),
	description: (widget: { msg: MsgFn }) => widget.msg("Score is based on self-check rubric items checked after submitting."),
} as const;

export const rubricStyles = css`
	.rubric-control {
		display: flex;
	}

	.rubric-control:has(> :popover-open) {
		opacity: 1;
		visibility: visible;
		transition: none;
	}

	.header-control.rubric-toggle {
		font-size: var(--sl-font-size-small);
	}

	.rubric-toggle.vacant {
		opacity: 0.5;
	}

	.rubric-popover {
		inline-size: min(24rem, calc(100% - 16px));
	}

	.rubric-editor {
		display: grid;
		gap: var(--sl-spacing-x-small);
		max-block-size: var(--popup-space, calc(100dvh - 16px));
		overflow: auto;
	}

	.rubric-editor ul {
		display: grid;
		margin: 0;
		padding-inline-start: 1.25em;
		overflow-wrap: anywhere;
	}

	.rubric-item,
	.rubric-entry {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--sl-spacing-2x-small);
	}

	.rubric-entry input {
		box-sizing: border-box;
		min-inline-size: 0;
		block-size: var(--sl-input-height-small);
		padding-inline: var(--sl-input-spacing-small);
		border: 1px solid var(--sl-input-border-color);
		border-radius: var(--sl-input-border-radius-small);
		background: var(--sl-input-background-color);
		color: inherit;
		font: inherit;
	}

	.rubric-checklist {
		margin-block-start: var(--sl-spacing-small);
		padding: var(--sl-spacing-small);
		border: 1px solid var(--sl-color-neutral-200);
		border-radius: var(--sl-border-radius-medium);
		background: var(--sl-color-neutral-50);
		font-size: var(--sl-font-size-small);
		overflow-wrap: anywhere;
	}

	.rubric-title {
		font-weight: var(--sl-font-weight-semibold);
		margin-block-end: var(--sl-spacing-2x-small);
	}

	.rubric-checklist label {
		display: flex;
		align-items: flex-start;
		gap: var(--sl-spacing-x-small);
		padding-block: var(--sl-spacing-3x-small);
		cursor: pointer;

		input {
			margin-block-start: 0.2em;
			accent-color: var(--ww-theme-accent-1, var(--sl-color-primary-600));
		}
	}
`;

/** Edits the newline-separated rubric on a task. */
export class RubricPopover extends TopLayerPopup {
	private readonly keep = createRef<HTMLElement>();
	private readonly trigger = createRef<HTMLButtonElement>();
	private readonly panel = createRef<HTMLElement>();
	private readonly body = createRef<HTMLElement>();
	private readonly entry = createRef<HTMLInputElement>();

	constructor(
		private readonly host: HTMLElement & ReactiveControllerHost,
		private readonly canEdit: () => boolean,
		private readonly getCriteria: () => string[],
	) {
		super(host, () => ({
			trigger: this.trigger.value,
			panel: this.panel.value,
			keep: this.keep.value,
			scrollArea: this.body.value,
		}), {
			followFocus: false,
			onShow: () => this.entry.value?.focus({ preventScroll: true }),
		});
	}

	private save(criteria: string[]) {
		transaction(this.host, () => {
			if (criteria.length) this.host.setAttribute("rubric", criteria.join("\n"));
			else this.host.removeAttribute("rubric");
		});
	}

	private add = () => {
		const input = this.entry.value;
		const criterion = input?.value.trim();
		if (!this.host.isConnected || !this.canEdit() || !input || !criterion) return;
		this.save([...this.getCriteria(), criterion]);
		input.value = "";
		input.focus();
	};

	render(msg: MsgFn) {
		const criteria = this.getCriteria();
		const label = msg("Rubric");
		return html`<span class="rubric-control edit-only" ${ref(this.keep)} data-ww-capture-selection="false">
			<button type="button" class=${`header-control rubric-toggle${criteria.length ? "" : " vacant"}`} aria-haspopup="dialog"
				title=${label} aria-controls="task-rubric" aria-expanded=${String(this.open)} ${ref(this.trigger)} @click=${() => this.toggle()}>
				<sl-icon src=${ListCheckIcon}></sl-icon><span class="label">${label}</span>
			</button>
			<div id="task-rubric" class="top-layer rubric-popover" popover="manual" role="dialog" aria-label=${label} ${ref(this.panel)}>
				<div class="dropdown-container rubric-editor" ${ref(this.body)}>
					${criteria.length ? html`<ul>${criteria.map((criterion, index) => html`<li><div class="rubric-item">
						<span>${criterion}</span>
						<sl-icon-button src=${XIcon} label=${msg(str`Remove criterion: ${criterion}`)} @click=${() => {
							const current = this.getCriteria();
							if (!this.host.isConnected || !this.canEdit() || current[index] !== criterion) return;
							this.save(current.filter((_, i) => i !== index));
							this.entry.value?.focus();
						}}></sl-icon-button>
					</div></li>`)}</ul>` : nothing}
					<div class="rubric-entry">
						<input type="text" aria-label=${msg("Rubric criterion")} placeholder=${msg("Rubric criterion")} ${ref(this.entry)}
							@keydown=${(event: KeyboardEvent) => {
								if (event.key !== "Enter" || event.isComposing) return;
								event.preventDefault();
								event.stopPropagation();
								this.add();
							}} />
						<sl-button size="small" @click=${this.add}>${msg("Add")}</sl-button>
					</div>
				</div>
			</div>
		</span>`;
	}
}
