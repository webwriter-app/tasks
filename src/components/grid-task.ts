import { property } from "lit/decorators.js";
import type { PropertyValues } from "lit";
import { WebwriterTask } from "./webwriter-task";

/** Shared host behavior for tasks that can display their answer as a grid. */
export abstract class GridTask extends WebwriterTask {
	@property({
		type: Boolean, reflect: true, useDefault: true,
		converter: { fromAttribute: value => value !== null && value !== "false" },
	})
	accessor grid = false;

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (changed.has("grid")) this.refreshDrawer();
	}
}
