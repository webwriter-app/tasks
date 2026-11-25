import { registerHooks } from "node:module";

const builder = new URL("./build.js", import.meta.resolve("@webwriter/build/test")).href;
const legacyFilter = 'const buildableKeys = Object.keys(pkg?.exports ?? {}).filter(k => k.startsWith("./widgets/"))';
const iconAwareFilter = 'const buildableKeys = Object.keys(pkg?.exports ?? {}).filter(k => k.startsWith("./widgets/") && !k.endsWith(".icon.svg"))';

// The released builder still passes SVG exports to esbuild as widget entries.
// Remove this hook once webwriter-app/webwriter@f0a93df1 ships in @webwriter/build.
registerHooks({
	load(url, context, nextLoad) {
		const loaded = nextLoad(url, context);
		if (url !== builder) return loaded;
		const source = Buffer.from(loaded.source).toString("utf8");
		return { ...loaded, source: source.replace(legacyFilter, iconAwareFilter) };
	},
});

await import(builder);
