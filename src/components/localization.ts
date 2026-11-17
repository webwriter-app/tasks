import type { msg } from "@lit/localize";
import { runtimeMsg } from "@lit/localize/internal/runtime-msg.js";
import { LitElementWw, resolveDeclarations } from "@webwriter/lit";
import { localizer, type LocalizeOptions } from "@webwriter/lit/localize";
import { Permissions } from "@webwriter/lit/permissions";
import type { PropertyValues } from "lit";
import { templates as de } from "../../localization/generated/de-DE";
import { templates as es } from "../../localization/generated/es-ES";
import { templates as fr } from "../../localization/generated/fr-FR";
import { templates as it } from "../../localization/generated/it";
import { templates as nl } from "../../localization/generated/nl";
import { sourceLocale, targetLocales } from "../../localization/generated/locale-codes";

/** The languages of one widget instance: it follows the `lang` of the element or of its ancestors. */
const localizeOptions: LocalizeOptions = {
	sourceLocale,
	targetLocales,
	load: locale => import(`../../localization/generated/${locale}.ts`),
	drawer: true,
};

const translations = new Map(Object.entries({ "de-de": de, "es-es": es, "fr-fr": fr, it, nl }));
const fallbacks = new Map(Object.entries({ de, es, fr, it, nl }));

// Reuse Lit's message IDs and template substitution without setting a global locale.
export function messageFor(locale = ""): typeof msg {
	const tag = locale.toLowerCase();
	const templates = translations.get(tag) ?? fallbacks.get(tag.split("-")[0]);
	return runtimeMsg.bind(null, templates) as typeof msg;
}

export class QuizElement extends LitElementWw {
	localize = localizer(this, localizeOptions);
	#permissions = new Permissions(this);

	/** True in edit mode. The widget renders again when the mode changes. */
	protected get editing() {
		return this.#permissions.editing;
	}

	/** The static declarations of this class as the editor reads them, without the entries that do not apply at the moment. */
	protected declarationsWithout(kind: "options" | "actions", omitted: string[]) {
		const declared = (this.constructor as typeof LitElementWw)[kind];
		const resolved: Record<string, object> = resolveDeclarations(this, declared as never) ?? {};
		return Object.fromEntries(Object.entries(resolved).filter(([name]) => !omitted.includes(name)));
	}

	protected get msg() {
		return this.localize.msg;
	}

	protected updated(changed: PropertyValues) {
		super.updated(changed);
		if (changed.has("editable")) this.refreshDrawer();
	}

	protected refreshDrawer() {
		this.dispatchEvent(new Event("optionschange", { bubbles: true }));
	}
}
