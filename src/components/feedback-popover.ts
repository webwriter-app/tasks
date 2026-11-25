import type { MsgFn } from "@lit/localize";
import FeedbackIcon from "@tabler/icons/outline/message-2.svg";
import TrashIcon from "@tabler/icons/outline/trash.svg";
import XIcon from "@tabler/icons/outline/x.svg";
import { css, html, nothing, type ReactiveControllerHost } from "lit";
import { createRef, ref } from "lit/directives/ref.js";
import { TopLayerPopup } from "./top-layer";

export const feedbackStyles = css`
	.header-control.feedback-toggle {
		color: var(--sl-color-neutral-600);
		font-size: var(--sl-font-size-small);

		> .label {
			min-inline-size: 0;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.feedback-popover {
		--feedback-surface: var(--sl-color-neutral-0, Canvas);
		--feedback-border: var(--sl-color-neutral-300, GrayText);
		inline-size: max-content;
		min-inline-size: min(18rem, calc(100% - 16px));
		max-inline-size: min(24rem, calc(100% - 16px));

		&::before {
			content: "";
			position: absolute;
			z-index: 1;
			left: clamp(12px, var(--popup-anchor-x), calc(100% - 12px));
			top: 0;
			width: 10px;
			height: 10px;
			transform: translate(-50%, -50%) rotate(45deg);
			border: solid var(--feedback-border);
			border-width: 1px 0 0 1px;
			background: var(--feedback-surface);
			pointer-events: none;
		}

		&[data-placement="above"]::before {
			top: 100%;
			border-width: 0 1px 1px 0;
		}
	}

	.feedback-body {
		box-sizing: border-box;
		display: flex;
		align-items: flex-start;
		gap: var(--sl-spacing-x-small, 0.5rem);
		max-block-size: var(--popup-space, 100dvh);
		padding: var(--sl-spacing-small, 0.75rem);
		border: 1px solid var(--feedback-border);
		border-radius: var(--sl-border-radius-medium, 0.5rem);
		background: var(--feedback-surface);
		box-shadow: var(--sl-shadow-medium);
		overflow: auto;
		overflow-wrap: anywhere;

		.feedback-content {
			flex: 1;
			min-inline-size: 0;
		}

		slot {
			display: block;
			min-inline-size: 0;
			-webkit-user-select: text;
			user-select: text;
		}

		slot::slotted(*) {
			margin: 0;
		}
	}

	.feedback-panel-actions {
		display: flex;
		flex: none;
		margin-block-start: calc(-1 * var(--sl-spacing-2x-small, 0.25rem));

		sl-icon-button::part(base) {
			padding: var(--sl-spacing-2x-small, 0.25rem);
		}
	}
`;

/** The feedback bubble used by tasks and the results card. */
export class FeedbackPopover extends TopLayerPopup {
	readonly id = "task-feedback";
	readonly anchor = createRef<HTMLElement>();
	readonly actions = createRef<HTMLElement>();

	private readonly authorButton = createRef<HTMLElement>();
	private readonly panel = createRef<HTMLElement>();
	private readonly body = createRef<HTMLElement>();
	private readonly dismiss: () => void;

	constructor(host: ReactiveControllerHost, editing: () => boolean) {
		const trigger = () => editing() ? this.authorButton.value : this.anchor.value;
		super(host, () => ({
			trigger: trigger(),
			anchor: this.anchor.value,
			panel: this.panel.value,
			scrollArea: this.body.value,
			keep: this.actions.value,
		}), {
			gap: 10,
			followFocus: () => !editing(),
			onShow: () => {
				if (!editing()) this.panel.value?.focus({ preventScroll: true });
			},
		});
		this.dismiss = () => {
			this.hide();
			trigger()?.focus();
		};
	}

	get expanded() {
		return String(this.open);
	}

	renderAuthorButton(msg: MsgFn, add?: () => void) {
		const label = msg("Feedback");
		const actionLabel = add ? msg("Add Feedback") : label;
		return html`<button type="button" class=${`header-control feedback-toggle edit-only${add ? " add-feedback vacant" : ""}`} ${ref(this.authorButton)}
			title=${actionLabel} aria-label=${actionLabel} aria-expanded=${add ? nothing : this.expanded}
			aria-controls=${add ? nothing : this.id} @click=${add ?? (() => this.toggle())}>
			<sl-icon src=${FeedbackIcon}></sl-icon><span class="label">${label}</span>
		</button>`;
	}

	render(msg: MsgFn, remove?: () => void, content = html`<slot name="feedback"></slot>`) {
		return html`<div id=${this.id} class="top-layer feedback-popover" popover="manual" role="region"
			aria-label=${msg("Feedback")} aria-describedby="task-feedback-content" tabindex="-1" ${ref(this.panel)}>
			<div class="feedback-body" part="feedback" ${ref(this.body)}>
				<div id="task-feedback-content" class="feedback-content">${content}</div>
				<div class="feedback-panel-actions">
					${remove ? html`<sl-icon-button class="remove-feedback edit-only" src=${TrashIcon}
						label=${msg("Remove feedback")} @click=${remove}></sl-icon-button>` : nothing}
					<sl-icon-button class="close-feedback" src=${XIcon} label=${msg("Close")} @click=${this.dismiss}></sl-icon-button>
				</div>
			</div>
		</div>`;
	}
}
