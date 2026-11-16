// The Lit localization CLI emits the locale index as JavaScript without declarations.
declare module "*/localization/generated/locale-codes" {
	export const sourceLocale: string;
	export const targetLocales: readonly string[];
}

// @webwriter/build ships its test helper without declarations.
declare module "@webwriter/build/test" {
	export const getMochaConfig: () => Mocha.MochaOptions;
}
