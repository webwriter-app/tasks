/// <reference types="mocha" />
import "mocha/mocha.js";
import { getMochaConfig } from "@webwriter/build/test";
import { encryptedProperty } from "../src/components/encrypted-property";
import { migrateGridLayouts } from "../src/migrate";

import { type ChoiceGridHeader } from "../src/widgets/webwriter-grid-item";
import "../src/widgets/webwriter-choice";
import "../src/widgets/webwriter-choice-item";
import "../src/widgets/webwriter-gap";
import "../src/widgets/webwriter-categorize";
import "../src/widgets/webwriter-true-false";
import { assert, drag, done, editMode, mount, transactions, unmount, type Any } from "./helpers";

mocha.setup(getMochaConfig());

describe("task grid layouts", function () {
	afterEach(unmount);

	it("converts standalone grid markup without losing the authored answer content or defaults", function () {
		const fragment = document.createElement("template");
		fragment.innerHTML = `
			<webwriter-choice-grid id="choice" data-custom="preserved" rows='["r1"]' solution='{"r1":["c1"]}'>
				<p slot="prompt">Choose a cell.</p><!-- author comment -->
				<webwriter-grid-item id="c1"><p><svg viewBox="0 0 10 10"></svg></p></webwriter-grid-item>
			</webwriter-choice-grid>
			<webwriter-gap-grid mode="drag-and-drop" grid="false" match-case><p slot="prompt">Fill a gap.</p><p></p></webwriter-gap-grid>
			<webwriter-gap-grid id="ignores-case"></webwriter-gap-grid>
			<webwriter-sort-grid order-matters><p slot="prompt">Sort.</p></webwriter-sort-grid>
			<webwriter-choice id="already-current" mode="multiple"></webwriter-choice>`;
		const root = fragment.content;
		const headerContent = root.querySelector("webwriter-grid-item > p");
		const current = root.querySelector("#already-current");
		migrateGridLayouts(root);

		const choice = root.querySelector("#choice")!;
		assert.equal(choice.localName, "webwriter-choice");
		assert.isTrue(choice.hasAttribute("grid"));
		assert.equal(choice.getAttribute("mode"), "single");
		assert.equal(choice.getAttribute("grading-method"), "partial");
		assert.equal(choice.getAttribute("data-custom"), "preserved");
		assert.equal(choice.getAttribute("solution"), '{"r1":["c1"]}');
		assert.strictEqual(choice.querySelector("webwriter-choice-column > p"), headerContent);
		assert.exists(choice.querySelector('webwriter-choice-row[id="r1"] > p'));
		assert.equal(choice.querySelector("svg")?.namespaceURI, "http://www.w3.org/2000/svg");
		assert.isTrue(Array.from(choice.childNodes).some(node => node.nodeType === Node.COMMENT_NODE));

		const gaps = root.querySelector("webwriter-gap")!;
		assert.isFalse(gaps.hasAttribute("grid"));
		assert.isFalse(gaps.hasAttribute("ignore-case"));
		assert.isFalse(gaps.hasAttribute("match-case"));
		assert.isTrue(root.querySelector("#ignores-case")!.hasAttribute("ignore-case"));
		const grouped = root.querySelector("webwriter-categorize")!;
		assert.isFalse(grouped.hasAttribute("grid"));
		assert.isFalse(grouped.hasAttribute("order-matters"));
		assert.equal(grouped.querySelector('[slot="prompt"]')?.textContent, "Sort.");
		assert.strictEqual(root.querySelector("#already-current"), current);

		const converted = fragment.innerHTML;
		migrateGridLayouts(root);
		assert.equal(fragment.innerHTML, converted);
	});

	it("wraps legacy multi-element items during migration without replacing their content", function () {
		const root = mount(`<webwriter-choice-item>
			<webwriter-quiz-hint slot="hint"><p>Hint</p></webwriter-quiz-hint>
			<p>First</p><!-- keep this comment --><audio controls></audio>
		</webwriter-choice-item>`);
		const item = root.querySelector("webwriter-choice-item")!;
		const audio = item.querySelector("audio");
		item.dispatchEvent(new CustomEvent("migrate", { bubbles: true }));
		assert.deepEqual(Array.from(item.children, child => child.localName), ["webwriter-quiz-hint", "div"]);
		assert.strictEqual(item.querySelector("div > audio"), audio);
		assert.include(item.querySelector("div")!.innerHTML, "<!-- keep this comment -->");
	});

	it("keeps an option's content available outside a current choice parent", async function () {
		const root = mount(`<div><webwriter-choice-item><p>Legacy option</p></webwriter-choice-item></div>`);
		const item = root.querySelector("webwriter-choice-item")!;
		await done(item);
		assert.equal(item.shadowRoot!.querySelector("slot")?.assignedElements()[0]?.textContent, "Legacy option");
	});

	describe("<webwriter-choice grid>", function () {
		const html = `<div><webwriter-choice grid mode="single" grading-method="partial" columns='["c1","c2"]' rows='["r1","r2"]'>
			<p slot="prompt">Classify each item.</p>
			<webwriter-grid-item id="c1"><p>True</p></webwriter-grid-item>
			<webwriter-grid-item id="c2"><p>False</p></webwriter-grid-item>
			<webwriter-grid-item id="r1"><p>Water freezes at 0 °C.</p></webwriter-grid-item>
			<webwriter-grid-item id="r2"><p>The sun is cold.</p></webwriter-grid-item>
		</webwriter-choice></div>`;

		it("converts a rich choice to a flush grid header without replacing its content", async function () {
			const choice = mount(`<webwriter-choice mode="multiple">
				<webwriter-choice-item id="video"><video controls></video></webwriter-choice-item>
				<webwriter-choice-item><p>Text</p></webwriter-choice-item>
			</webwriter-choice>`).querySelector("webwriter-choice")!;
			editMode(choice);
			await done(choice);
			const video = choice.querySelector("video");
			const control = choice.shadowRoot!.querySelector<HTMLElement & { checked: boolean; disabled: boolean }>(".grid-layout-switch")!;
			assert.isFalse(control.disabled);
			control.checked = true;
			control.dispatchEvent(new CustomEvent("sl-change"));
			await done(choice);
			assert.isTrue(choice.hasAttribute("grid"));
			assert.strictEqual(choice.querySelector("webwriter-choice-column > video"), video);
			assert.equal(getComputedStyle(choice.shadowRoot!.querySelector(".col-header")!).padding, "0px");
		});

		it("authors the key and adds rows and columns in undo steps", async function () {
			const root = mount(html);
			const grid = root.querySelector("webwriter-choice") as Any;
			editMode(grid);
			await done(grid);

			const inputs = grid.shadowRoot.querySelectorAll('tbody input[type="radio"]');
			assert.equal(inputs.length, 4, "2x2 radio inputs rendered");
			inputs[0].checked = true;
			inputs[0].dispatchEvent(new Event("change", { bubbles: true }));
			inputs[3].checked = true;
			inputs[3].dispatchEvent(new Event("change", { bubbles: true }));
			await done(grid);

			assert.deepEqual(grid.solution, { r1: ["c1"], r2: ["c2"] }, "solution updated from edit-mode clicks");
			const rawAttr = grid.getAttribute("solution") ?? "";
			assert.notEqual(rawAttr, JSON.stringify(grid.solution), "solution attribute is obfuscated");
			assert.deepEqual(encryptedProperty.fromAttribute?.(rawAttr, Object), grid.solution, "the obfuscated key round-trips");

			assert.equal(await transactions(async () => {
				grid.shadowRoot.querySelector(".task-helper .add-option").click();
				await grid.updateComplete;
			}), "start,end", "adding a row is one transaction");
			await done(grid);
			assert.equal(grid.rows.length, 3, "a third row was added");
			assert.equal(grid.querySelectorAll("webwriter-choice-row").length, 3, "new row item added to light DOM");

			assert.equal(await transactions(async () => {
				grid.shadowRoot.querySelector(".task-helper .add-column").click();
				await grid.updateComplete;
			}), "start,end", "adding a column is one transaction");
			await done(grid);
			assert.equal(grid.columns.length, 3, "a third column was added");
			assert.notExists(grid.shadowRoot.querySelector(".add-col-cell"));
			const newColumn = grid.querySelector("webwriter-choice-column:last-of-type")!;
			assert.equal(newColumn.nextElementSibling?.localName, "webwriter-choice-row", "columns stay adjacent in the document");
			assert.equal(document.getSelection()?.anchorNode, newColumn.firstElementChild);

			assert.notExists(grid.shadowRoot.querySelector("th button, th sl-icon-button"));
			const headers = grid.shadowRoot.querySelectorAll("thead th");
			assert.isTrue(Array.from(headers).every(header => getComputedStyle(header as Element).borderBottomWidth === "1px"),
				"a divider runs the full width of the header row");
		});

		it("grades single and multiple modes and resets cleanly", async function () {
			const root = mount(html);
			const grid = root.querySelector("webwriter-choice") as Any;
			await done(grid);
			grid.solution = { r1: ["c1"], r2: ["c2"] };
			await done(grid);

			assert.equal(grid.checkValidity(), false, "single mode requires one selection per row");
			const row1Radios = grid.shadowRoot.querySelectorAll("tbody tr:nth-child(1) input");
			const row2Radios = grid.shadowRoot.querySelectorAll("tbody tr:nth-child(2) input");
			row1Radios[0].checked = true;
			row1Radios[0].dispatchEvent(new Event("change", { bubbles: true }));
			row2Radios[0].checked = true; // wrong
			row2Radios[0].dispatchEvent(new Event("change", { bubbles: true }));
			await done(grid);

			assert.equal(grid.checkValidity(), true, "valid once every row has a selection");
			assert.equal(grid.checkAnswer(true), 0.5, "partial credit scores 1/2 rows");
			await done(grid);
			assert.ok(grid.shadowRoot.querySelector("tbody tr:nth-child(1) td:nth-of-type(1).cell-correct"), "correct cell highlighted");
			assert.ok(grid.shadowRoot.querySelector("tbody tr:nth-child(2) td:nth-of-type(1).cell-wrong"), "wrong cell highlighted");
			assert.ok(grid.shadowRoot.querySelector("tbody tr:nth-child(2) td:nth-of-type(2).cell-missed"), "missed solution highlighted");

			grid.gradingMethod = "pass-fail";
			assert.equal(grid.checkAnswer(false), 0, "pass-fail returns 0 when any row is wrong");

			grid.reset();
			await done(grid);
			assert.equal(grid.checkValidity(), false, "reset clears selections");

			// Multiple-choice mode
			grid.mode = "multiple";
			grid.gradingMethod = "partial";
			grid.solution = { r1: ["c1", "c2"], r2: ["c1"] };
			await done(grid);
			const mRow1 = grid.shadowRoot.querySelectorAll('tbody tr:nth-child(1) input[type="checkbox"]');
			const mRow2 = grid.shadowRoot.querySelectorAll('tbody tr:nth-child(2) input[type="checkbox"]');
			for (const cb of [mRow1[0], mRow1[1], mRow2[0]]) {
				cb.checked = true;
				cb.dispatchEvent(new Event("change", { bubbles: true }));
			}
			await done(grid);
			assert.equal(grid.checkAnswer(false), 1, "multiple mode grades all matching combinations as 1");
		});

		it("uses the authored label order for split rows and columns", async function () {
			const grid = mount(html).querySelector("webwriter-choice")!;
			editMode(grid);
			await done(grid);
			const root = grid.shadowRoot!;
			const originalColumn = grid.querySelector("#c1")!;
			const originalRow = grid.querySelector("#r1")!;
			// The editor creates an adjacent continuation of the same type with no ID.
			const column = document.createElement("webwriter-choice-column");
			const row = document.createElement("webwriter-choice-row");
			column.innerHTML = "<p>New choice</p>";
			row.innerHTML = "<p>New row</p>";
			originalColumn.after(column);
			originalRow.after(row);
			await done(grid);
			assert.lengthOf(grid.columns, 3);
			assert.lengthOf(grid.rows, 3);
			assert.strictEqual(root.querySelectorAll<HTMLSlotElement>("thead .col-header slot")[1].assignedElements()[0], column);
			assert.strictEqual(root.querySelectorAll<HTMLSlotElement>("tbody .row-header slot")[1].assignedElements()[0], row);

			const input = root.querySelector<HTMLInputElement>("tbody tr:nth-child(2) td:nth-of-type(2) input")!;
			input.click();
			await done(grid);
			assert.isNotEmpty(column.id);
			assert.isNotEmpty(row.id);
			assert.deepEqual(grid.solution[row.id], [column.id]);

			column.remove();
			row.remove();
			await done(grid);
			assert.deepEqual(grid.columns, ["c1", "c2"]);
			assert.deepEqual(grid.rows, ["r1", "r2"]);
			originalColumn.after(column);
			originalRow.after(row);
			await done(grid);
			assert.isTrue(root.querySelector<HTMLInputElement>("tbody tr:nth-child(2) td:nth-of-type(2) input")!.checked,
				"restoring the labels also restores their marked answer");
		});

		it("matches the hint font and leaves a text target in empty labels", async function () {
			const grid = mount(html).querySelector("webwriter-choice")!;
			const theme = document.createElement("style");
			theme.textContent = `
				webwriter-choice p { font-size: var(--font-size); }
				webwriter-choice p:empty::before {
					content: var(--ww-placeholder);
					display: inline-block;
					width: 0;
					white-space: nowrap;
				}
			`;
			grid.before(theme);
			grid.style.setProperty("--font-size", "18px");
			editMode(grid);
			await done(grid);
			const root = grid.shadowRoot!;
			const hintSize = getComputedStyle(root.querySelector(".helper")!).fontSize;
			assert.equal(getComputedStyle(grid.querySelector("#c1 p")!).fontSize, hintSize);
			assert.equal(getComputedStyle(grid.querySelector("#r1 p")!).fontSize, hintSize);

			const styledLabel = grid.querySelector<HTMLElement>("#c2 p")!;
			styledLabel.style.fontSize = "20px";
			assert.equal(getComputedStyle(styledLabel).fontSize, "20px");

			root.querySelector<HTMLButtonElement>(".task-helper .add-option")!.click();
			root.querySelector<HTMLButtonElement>(".task-helper .add-column")!.click();
			await done(grid);
			const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
			for (const axis of ["row", "column"]) {
				const label = grid.querySelector(`webwriter-choice-${axis}:last-of-type p`)!;
				assert.equal(label.textContent, "");
				const bounds = label.getBoundingClientRect();
				assert.isAtLeast(bounds.width, 2.5 * rem);
				assert.isAtLeast(bounds.height, 1.5 * rem);
			}
			const blankColumn = grid.querySelector("webwriter-choice-column:last-of-type p")!;
			const paragraph = blankColumn.getBoundingClientRect();
			const columns = root.querySelectorAll("th.col-header");
			const cell = columns[columns.length - 1].getBoundingClientRect();
			assert.closeTo(paragraph.left + paragraph.width / 2, cell.left + cell.width / 2, 1);
			assert.equal(getComputedStyle(blankColumn).justifyItems, "center");
			assert.isAbove(parseFloat(getComputedStyle(blankColumn, "::before").width), 0,
				"the editor's placeholder text participates in centering");
		});

		it("uses the saved inline and block sizes for grid tracks", async function () {
			const grid = mount(html).querySelector("webwriter-choice")!;
			editMode(grid);
			await done(grid);
			const column = grid.querySelector<ChoiceGridHeader>("webwriter-choice-column")!;
			const row = grid.querySelector<ChoiceGridHeader>("webwriter-choice-row")!;
			column.style.maxWidth = "148px";
			row.style.maxHeight = "96px";
			await done(grid);
			const root = grid.shadowRoot!;
			assert.closeTo(root.querySelector("th.col-header")!.getBoundingClientRect().width, 148, 1);
			assert.closeTo(root.querySelector("tbody tr")!.getBoundingClientRect().height, 96, 1);
			for (const [header, axis, size] of [[column, "width", 148], [row, "height", 96]] as const) {
				header.selectionStates.add("ww-element-selected");
				assert.closeTo(parseFloat(getComputedStyle(header)[axis]), size, 1, "the resize gesture starts at the existing track size");
				header.selectionStates.delete("ww-element-selected");
			}
		});

		it("explains disabled keys for ungraded choice tasks", async function () {
			const grid = mount(html).querySelector("webwriter-choice")!;
			const tasks = mount(`<div>
				<webwriter-choice grading-method="ungraded"><p>Choices</p>
					<webwriter-choice-item><p>First</p></webwriter-choice-item>
					<webwriter-choice-item><p>Second</p></webwriter-choice-item>
				</webwriter-choice>
				<webwriter-choice mode="true-false" grading-method="ungraded"><p>True or false?</p></webwriter-choice>
				<webwriter-true-false grading-method="ungraded"><p>Legacy true or false?</p></webwriter-true-false>
			</div>`);
			const answers = [...tasks.querySelectorAll("webwriter-choice, webwriter-true-false"), grid];
			grid.gradingMethod = "ungraded";
			for (const task of answers) editMode(task);
			await Promise.all(answers.map(done));
			const option = tasks.querySelector("webwriter-choice-item")!;
			await done(option);
			const controls = [
				option.shadowRoot!.querySelector<HTMLButtonElement>(".marker")!,
				...answers.slice(1).map(task => task.shadowRoot!.querySelector<HTMLInputElement>('.answer input[type="radio"]')!),
			];
			for (const [index, control] of controls.entries()) {
				assert.isTrue(control.disabled, `${answers[index].localName} ${answers[index].getAttribute("mode")} author control`);
				assert.equal(control.title, "This task is ungraded.");
				assert.equal(control.parentElement?.title, control.title);
				assert.equal(getComputedStyle(control.parentElement!).cursor, "not-allowed");
			}
			document.designMode = "off";
			for (const task of answers) task.removeAttribute("contenteditable");
			await Promise.all(answers.map(done));
			await done(option);
			for (const control of controls) {
				assert.isFalse(control.disabled);
				assert.isFalse(control.hasAttribute("title"));
			}
		});
	});

	describe("<webwriter-gap grid>", function () {
		const html = `<div><webwriter-gap grid ignore-case columns='["c1","c2"]' rows='["r1","r2"]' cells='[["g00","g01"],["g10","g11"]]' gaps='["g01","g11"]'>
			<p slot="prompt">Complete the table.</p>
			<webwriter-grid-item id="c1"><p>Country</p></webwriter-grid-item>
			<webwriter-grid-item id="c2"><p>Capital</p></webwriter-grid-item>
			<webwriter-grid-item id="r1"><p>1</p></webwriter-grid-item>
			<webwriter-grid-item id="r2"><p>2</p></webwriter-grid-item>
			<webwriter-grid-item id="g00"><p>France</p></webwriter-grid-item>
			<webwriter-grid-item id="g01"><p>Paris|Lutèce</p></webwriter-grid-item>
			<webwriter-grid-item id="g10"><p>Japan</p></webwriter-grid-item>
			<webwriter-grid-item id="g11"><p>Tokyo</p></webwriter-grid-item>
		</webwriter-gap></div>`;

		it("offers per-cell choices while other gaps remain typed", async function () {
			const grid = mount(html).querySelector("webwriter-gap")!;
			editMode(grid);
			await done(grid);
			assert.notProperty(grid.options, "mode");
			assert.exists(grid.shadowRoot!.querySelector(".tolerance-trigger"));
			const editor = grid.shadowRoot!.querySelector("gap-choices-editor")!.shadowRoot!;
			editor.querySelector<HTMLButtonElement>(".trigger")!.click();
			editor.querySelector<HTMLInputElement>(".add-option-row input")!.value = "Lyon";
			editor.querySelector<HTMLButtonElement>(".add-option-row button")!.click();
			await done(grid);
			assert.equal(grid.querySelector("#g01")!.getAttribute("choices"), '["Lyon"]');

			grid.removeAttribute("contenteditable");
			document.designMode = "off";
			await done(grid);
			const select = grid.shadowRoot!.querySelector<HTMLSelectElement>("select.gap-input")!;
			assert.sameMembers([...select.options].map(option => option.value), ["", "Paris", "Lutèce", "Lyon"]);
			assert.exists(grid.shadowRoot!.querySelector("input.gap-input"));
			select.value = "Lutèce";
			select.dispatchEvent(new Event("change", { bubbles: true }));
			const typed = grid.shadowRoot!.querySelector<HTMLInputElement>("input.gap-input")!;
			typed.value = "tokyo";
			typed.dispatchEvent(new Event("input", { bubbles: true }));
			assert.isTrue(grid.checkValidity());
			assert.equal(grid.checkAnswer(false), 1);
		});

		it("toggles gaps and adds rows/columns in transactions in edit mode", async function () {
			const root = mount(html);
			const grid = root.querySelector("webwriter-gap") as Any;
			editMode(grid);
			await done(grid);

			const toggleBtns = grid.shadowRoot.querySelectorAll(".toggle-gap-btn");
			assert.notExists(grid.shadowRoot.querySelector(".grid-layout-switch"));
			assert.equal(toggleBtns.length, 4, "4 cell toggle buttons");
			assert.equal(toggleBtns[0].getAttribute("aria-pressed"), "false");
			assert.equal(toggleBtns[1].getAttribute("aria-pressed"), "true");

			assert.equal(await transactions(async () => {
				toggleBtns[0].click();
				await grid.updateComplete;
			}), "start,end", "toggling a gap cell is one transaction");
			await done(grid);
			assert.ok(grid.gaps.includes("g00"), "g00 became a gap");

			assert.equal(await transactions(async () => {
				grid.shadowRoot.querySelector(".grid-footer-actions .add-inline-btn").click();
				await grid.updateComplete;
			}), "start,end", "adding a row is one transaction");
			await done(grid);
			assert.equal(grid.rows.length, 3);
			assert.equal(grid.cells.length, 3);
		});

		it("grades typed input with alternatives and case sensitivity, and resets", async function () {
			const root = mount(html);
			const grid = root.querySelector("webwriter-gap") as Any;
			await done(grid);

			const inputs = grid.shadowRoot.querySelectorAll("input.gap-input");
			assert.equal(inputs.length, 2, "two gap inputs in read mode");
			assert.equal(grid.checkValidity(), false, "empty gaps fail validity");

			inputs[0].value = "lutèce";
			inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
			inputs[1].value = "Osaka";
			inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
			await done(grid);

			assert.equal(grid.checkValidity(), true);
			assert.equal(grid.checkAnswer(true), 0.5, "accepts | alternative case-insensitively and marks wrong cell");
			await done(grid);
			assert.ok(grid.shadowRoot.querySelector("tbody tr:nth-child(1) td.cell-correct"), "first gap correct");
			const wrongCell = grid.shadowRoot.querySelector("tbody tr:nth-child(2) td.cell-wrong");
			assert.ok(wrongCell && wrongCell.querySelector(".correction")?.textContent?.trim() === "Tokyo", "shows expected answer for wrong gap");

			grid.reset();
			grid.ignoreCase = false;
			await done(grid);
			const resetInputs = grid.shadowRoot.querySelectorAll("input.gap-input");
			resetInputs[0].value = "paris"; // wrong case when ignoreCase = false
			resetInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
			resetInputs[1].value = "Tokyo";
			resetInputs[1].dispatchEvent(new Event("input", { bubbles: true }));
			await done(grid);
			assert.equal(grid.checkAnswer(false), 0.5, "respects ignoreCase = false");
		});

		it("supports drag-and-drop mode with chip pool, swap, and grading", async function () {
			const root = mount(html);
			const grid = root.querySelector("webwriter-gap") as Any;
			grid.mode = "drag-and-drop";
			await done(grid);

			const chip = (id: string) => grid.shadowRoot.querySelector(`.gap-chip[data-chip-id="${id}"]`);
			const drop = (id: string) => grid.shadowRoot.querySelector(`.gap-drop[data-cell-id="${id}"]`);
			assert.ok(chip("g01") && chip("g11"), "both gap chips start in pool");

			await drag(chip("g01"), drop("g01"));
			await done(grid);
			await drag(chip("g11"), drop("g11"));
			await done(grid);
			assert.equal(grid.checkAnswer(true), 1, "dragging both chips to matching cells scores 1");

			grid.reset();
			await done(grid);
			assert.equal(grid.shadowRoot.querySelectorAll(".grid-pool .gap-chip").length, 2, "reset returns chips to pool");
		});
	});

	it("migrates Groups matrices to categories while retaining cards and destinations", async function () {
		const fragment = document.createElement("template");
		fragment.innerHTML = `<webwriter-categorize grid order-matters points="3" columns='["c1","c2"]' rows='["r1","r2"]'>
			<p slot="prompt">Sort the animals.</p><!-- author comment -->
			<webwriter-grid-item id="c1"><p>Fast</p></webwriter-grid-item>
			<webwriter-grid-item id="c2"><p>Slow</p></webwriter-grid-item>
			<webwriter-grid-item id="r1"><p>Small</p></webwriter-grid-item>
			<webwriter-grid-item id="r2"><p>Large</p></webwriter-grid-item>
			<webwriter-grid-item id="k1"><p><strong>Bee</strong></p></webwriter-grid-item>
			<webwriter-grid-item id="k2"><p>Whale</p></webwriter-grid-item>
		</webwriter-categorize>`;
		const task = fragment.content.querySelector("webwriter-categorize")!;
		const solution = { "r1:c1": ["k1"], "r2:c2": ["k2"] };
		task.setAttribute("solution", String(encryptedProperty.toAttribute?.(solution, Object)));
		const bee = task.querySelector("#k1 strong");
		const row = task.querySelector("#r1");
		migrateGridLayouts(task);

		assert.strictEqual(task.querySelector("#k1 strong"), bee);
		assert.strictEqual(task.querySelector("#r1"), row);
		assert.equal(task.getAttribute("points"), "3");
		assert.isTrue(Array.from(task.childNodes).some(node => node.nodeType === Node.COMMENT_NODE));
		assert.notExists(task.getAttribute("grid"));
		assert.notExists(task.getAttribute("order-matters"));
		const migrated = task.outerHTML;
		migrateGridLayouts(task);
		assert.equal(task.outerHTML, migrated, "migration is idempotent");

		const widget = mount(migrated).querySelector("webwriter-categorize")!;
		await done(widget);
		assert.deepEqual(widget.categories.map(id => widget.querySelector(`#${id}`)?.textContent),
			["Small / Fast", "Small / Slow", "Large / Fast", "Large / Slow"]);
		assert.deepEqual(widget.categories.map(id => widget.solution[id]), [["k1"], [], [], ["k2"]]);
		assert.lengthOf(widget.shadowRoot!.querySelectorAll(".bucket-zone"), 4);
	});
});

mocha.run();
