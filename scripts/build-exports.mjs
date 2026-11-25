import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

// WebWriter's release command builds widget entries. Use its bundler for the
// task base class, the quiz API, the migration and the Mocha test modules as well (the release build of @webwriter/build only builds widget entries), with the same
// browser target, and emit the declarations that the ./api and ./task exports
// point to.
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("@webwriter/build/test"))("esbuild");

const { exports } = JSON.parse(readFileSync("package.json", "utf8"));
const tests = Object.fromEntries(Object.entries(exports)
	.filter(([key]) => key.startsWith("./tests/"))
	.map(([, value]) => [value.default.replace(/^\.\/dist\//, "").replace(/\.\*$/, ""), value.source]));

await build({
	entryPoints: { task: "src/components/webwriter-task.ts", "api/quiz-api": "src/model/quiz-api.ts", migrate: exports["./migrate.js"].source, ...tests },
	outdir: "dist",
	bundle: true,
	format: "esm",
	target: "es2022",
	loader: { ".svg": "dataurl" },
});

// The project's declarations land in dist/types; the API ones are also served
// from dist/api, where the ./api export looks for them.
execFileSync("npx", ["tsc", "-p", ".", "--noEmit", "false", "--declaration", "--emitDeclarationOnly", "--outDir", "dist/types", "--rootDir", "."], { stdio: "inherit" });
mkdirSync("dist/api", { recursive: true });
copyFileSync("dist/types/src/model/quiz-api.d.ts", "dist/api/quiz-api.d.ts");
