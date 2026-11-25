# Tasks (`@webwriter/tasks@3.0.0`)
[License: MIT](LICENSE) | Version: 3.0.0

Add interactive tasks (multiple choice, order, free text, highlighting, or speech input). Make a quiz out of multiple tasks.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Single/Multiple Choice | `@webwriter/tasks/snippets/choice.html` |
| True/False | `@webwriter/tasks/snippets/true-or-false.html` |
| Highlights | `@webwriter/tasks/snippets/mark.html` |
| Text | `@webwriter/tasks/snippets/text.html` |
| Number | `@webwriter/tasks/snippets/numeric.html` |
| Gap text | `@webwriter/tasks/snippets/gap.html` |
| Dictation | `@webwriter/tasks/snippets/dictation.html` |
| Sequence | `@webwriter/tasks/snippets/order.html` |
| Pairing | `@webwriter/tasks/snippets/pairing.html` |
| Groups | `@webwriter/tasks/snippets/categorize.html` |
| Voice recording | `@webwriter/tasks/snippets/speech.html` |
| Image Hotspots | `@webwriter/tasks/snippets/image.html` |
| Image Placements | `@webwriter/tasks/snippets/image-placements.html` |
| Sketch | `@webwriter/tasks/snippets/drawing.html` |
| About WebWriter quiz | `@webwriter/tasks/snippets/about-webwriter.html` |

The task type switcher and WebWriter’s insertion menu both list Select, Write, Arrange, Speak, and Draw in that order. The insertion menu lists each preset once. Change the Number variant from its hint row. In Gap text, use the chevron at the end of a gap to add answer choices. Readers type in gaps without choices.

**Self-assessment** is available under **Configure** on every task. Use **Rubric** beside the check and feedback controls to define criteria. Learners check the criteria after submitting, and their score reflects the fraction checked.

In **Image Hotspots**, use **Add label pin** to create a target for a label answer and **Add hotspot** to create a region learners can identify. A single image can contain both kinds of marker.

For **Dictation**, add an audio source and enter the solution transcript. The Tolerance popover controls how punctuation, capitalization, and minor typos are scored.

In **Voice recording**, record a solution in edit mode and use **Transcript** to review or edit the recognized text. The default grading option compares the learner’s spoken words with that transcript. **Partial credit** scores the response word by word. Use the language picker to set the recognition language, which defaults to the document language. The widget uses the browser’s speech recognition service.

For **Image Placements**, set the background, add text or image items, and choose the correct item in each zone’s settings. Learners can drag an item, or select the item and then the destination.

New choice tasks default to multiple choice. Turn on **Single choice** beside **Grid** in the hint row to allow one answer (one per row in a grid).

Use the Grid switch in the hint row of Single/Multiple Choice. The layout is saved on the task’s `grid` attribute. Turning Grid off can discard grid-only content and scoring settings.

Choice, Sequence, Pairing, and Groups items each accept one content element, such as a paragraph, image, audio player, table, or embedded widget. Non-text content sits flush against the item edges with room for the task controls.

In **Pairing**, click two dots or drag between them to connect items across the columns. **Add left item** and **Add right item** insert a blank item in the chosen column. Press Enter in an item’s text to split it, or Backspace at the start to join it to the previous item in that column. Each column contains at least one item. Enable **Multi-connect** to connect an item to more than one match. Switching it off keeps the first connection for each item. The task stores connections in `solution`.

**Groups** starts with one group and one option and requires at least one of each. Use **Add item** and **Add group** in the hint row. Drag an option into a group, or use the **+** button in its header to choose an option. Use **×** on a placement to remove it from the group. Items stay in **Options** after assignment. Press Enter to split an item or Backspace at the start to join it with the previous item. The task stores options as `<webwriter-categorize-item>` children and assignments in `solution`. Existing `card-ids` lists are migrated into the authored option order.

Turn on **Multi-group** to add an item from **Options** to several groups. Moving an item from a group affects only that placement. In a graded task, an item is correct when it appears in all of its expected groups and has no extra placements. Turning **Multi-group** off keeps the first placement in group order for each item.

Existing grids for Groups migrate to groups, with one group per cell and the same item destinations. Grading uses group placement. For documents with standalone grid tags, parse the saved HTML into a DOM document or fragment and pass it to `migrateGridLayouts(root)` from `@webwriter/tasks/migrate.js` before importing it. The converter updates the old tags to their current task layouts. WebWriter’s automatic migration can only find tags that the installed package exports.

## `WebwriterQuizHint` (`<webwriter-quiz-hint>`)
A generic hint element that can be used inside a variety of elements that
explicitly mention it in their documentation, such as quiz tasks and choice items.

Unless otherwise specified, it should be assigned to the `hint` slot of its
parent element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-hint.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-hint.js"></script>
<webwriter-quiz-hint></webwriter-quiz-hint>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-quiz-hint.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-quiz-hint.js"></script>
<webwriter-quiz-hint></webwriter-quiz-hint>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebwriterQuizFeedback` (`<webwriter-quiz-feedback>`)
Formatted feedback authored in the feedback slot of a task.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-feedback.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-feedback.js"></script>
<webwriter-quiz-feedback></webwriter-quiz-feedback>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-quiz-feedback.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-quiz-feedback.js"></script>
<webwriter-quiz-feedback></webwriter-quiz-feedback>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebwriterTrueFalse` (`<webwriter-true-false>`)
An answer where learners decide whether a statement is true or false.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-true-false.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-true-false.js"></script>
<webwriter-true-false></webwriter-true-false>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-true-false.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-true-false.js"></script>
<webwriter-true-false></webwriter-true-false>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `solution` (`solution`) | `TrueFalse` | The value counting as correct.<br><br>- `true`: The statement is true.<br>- `false`: The statement is false. | `"true"` | ✓ |
| `WebwriterTrueFalse.actions` | `object` | - | `{}` | ✗ |
| `WebwriterTrueFalse.options` | `object` | - | `{ label: { type: "string" as const, label: (widget: { msg: MsgFn }) => widget.msg("Label"), placeholder: (widget: WebwriterTask) => widget.defaultLabel, }, points: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Points") }, }` | ✗ |
| `WebwriterTrueFalse.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `reset` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterChoice` (`<webwriter-choice>`)
An answer where learners pick one or more options.

The options must be `<webwriter-choice-item>` elements assigned to the
default slot.

Conversion: the options can be converted to a `ul` (the solution is not carried over), and a `ul`
or `ol` becomes a single-choice task with one option per list item and no option marked correct.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice.js"></script>
<webwriter-choice></webwriter-choice>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-choice.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-choice.js"></script>
<webwriter-choice></webwriter-choice>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterChoice.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterChoice.actions` | `object` | - | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") }, }` | ✗ |
| `WebwriterChoice.convertFrom` | `object` | - | `{ ul: "loadList", ol: "loadList" }` | ✗ |
| `WebwriterChoice.convertTo` | `object` | - | `{ ul: "toList" }` | ✗ |
| `WebwriterChoice.options` | `object` | - | `{ ...WebwriterTask.options, "mode": { type: "select", options: [ { value: "single", label: (widget: { msg: MsgFn }) => widget.msg("Single choice", { id: "s9daa676c05ab2a68" }) }, { value: "multiple", label: (widget: { msg: MsgFn }) => widget.msg("Multiple Choice") }, { value: "true-false", label: (widget: { msg: MsgFn }) => widget.msg("True/False") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Mode"), }, randomizeOrder: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Randomize Order") }, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every right option and no wrong option is selected."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"), description: (widget: { msg: MsgFn }) => widget.msg("Right selections add credit; wrong selections subtract from it (min. 0)."), }, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, }` | ✗ |
| `mode` (`mode`) | `ChoiceMode` | How many options learners may select. Multiple choice is the default task type.<br><br>- `multiple`: Any number of options can be selected.<br>- `single`: Exactly one option can be selected. | `"multiple"` | ✓ |
| `gradingMethod` (`grading-method`) | `ChoiceGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct options are selected.<br>- `partial`: Correct selections earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `ChoiceSolution` | The options counting as correct, as a map from option ID to whether it has to be selected.<br>It is obfuscated in the markup so that learners cannot read it directly. | `{}` | ✓ |
| `WebwriterChoice.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`
| `reset` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterChoiceItem` (`<webwriter-choice-item>`)
A single option of a `<webwriter-choice>`.

It must be assigned to the default slot of its parent element. Options have no hints of their
own; a hint on an option from an earlier version stays in the markup but is not shown.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-item.js"></script>
<webwriter-choice-item></webwriter-choice-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-choice-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-choice-item.js"></script>
<webwriter-choice-item></webwriter-choice-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterChoiceItem.options` | `Record<string, Declared<OptionDeclaration>>` | - | `{ feedbackSelected: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Feedback if selected") }, feedbackNotSelected: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Feedback if not selected") }, }` | ✗ |
| `feedbackSelected` (`feedback-selected`) | `string` | The feedback shown after submitting if learners selected this option. | `""` | ✓ |
| `feedbackNotSelected` (`feedback-not-selected`) | `string` | The feedback shown after submitting if learners did not select this option. | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebwriterQuizResults` (`<webwriter-quiz-results>`)
The results card of a quiz. Without it, each task is checked on its own. With it, the
tasks are submitted, graded and reset together here, and learners see their score, how many
tasks they got right, and the feedback on the whole quiz. Optionally, author that feedback in
a `<webwriter-quiz-feedback>` assigned to the `feedback` slot.

A task belongs to the first Task Results widget that follows it in the document. Tasks
after the last one belong to that one, so a single Task Results widget anywhere grades all
tasks, and several of them divide a document into several quizzes.

Insert the card after the tasks it grades, and further tasks before it.

Conversions: the card imports and exports GIFT (`.gift`, Moodle's plain-text format) for
true/false, single and multiple choice, short answer and numeric, essay, matching (pairing) and
missing-word (gap) tasks. Order, mark and speech tasks have no GIFT form and are written
as comments on export. GIFT keeps plain text only (formatting, hints, feedback, points and
grading settings are dropped) and cannot carry the case option, so imported text answers are
case sensitive. A short answer keeps all its accepted answers. Imported tasks are inserted
before the card.

Signals: `score` (number from 0 to 1, the share of the points reached; 0 before submitting) and
`complete` (boolean, true once the answers are submitted). Both go back to their start values
when the answers are reset.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-results.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-quiz-results.js"></script>
<webwriter-quiz-results></webwriter-quiz-results>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-quiz-results.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-quiz-results.js"></script>
<webwriter-quiz-results></webwriter-quiz-results>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterQuizResults.convertFrom` | `object` | - | `{ ".gift": "importGift" }` | ✗ |
| `WebwriterQuizResults.convertTo` | `object` | - | `{ ".gift": "exportGift" }` | ✗ |
| `WebwriterQuizResults.options` | `Record<string, Declared<OptionDeclaration>>` | - | `{ detailedFeedback: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show detailed feedback") }, confirmSubmit: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before submitting") }, confirmReset: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before resetting") }, hideTaskTitle: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide task labels") }, hidePoints: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide points") }, }` | ✗ |
| `detailedFeedback` (`detailed-feedback`) | `boolean` | Whether learners see per-answer feedback and the solution after submitting. | `false` | ✓ |
| `confirmSubmit` (`confirm-submit`) | `boolean` | Whether learners have to confirm a dialog before submitting. | `false` | ✓ |
| `confirmReset` (`confirm-reset`) | `boolean` | Whether learners have to confirm a dialog before resetting. | `false` | ✓ |
| `hideTaskTitle` (`hide-task-title`) | `boolean` | Whether task labels in the header are hidden. | `false` | ✓ |
| `hidePoints` (`hide-points`) | `boolean` | Whether the points of each task and the total score are hidden. | `false` | ✓ |
| `signals` | `object` | Public signals for other widgets: see the class description. | `{ score: computed(() => this.#score.get()), complete: computed(() => this.#complete.get()), }` | ✗ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| final | The card with the submit and reset buttons. |
| result | The total score with its progress bar, shown after submitting. |
| feedback | The feedback on the whole quiz, shown in a popover after submitting. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, or custom CSS properties.*


## `WebwriterOrder` (`<webwriter-order>`)
An answer where learners drag items into the correct order.

The items must be `<webwriter-order-item>` elements assigned to the default
slot.

Conversion: the items can be converted to an `ol` in their correct order.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-order.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-order.js"></script>
<webwriter-order></webwriter-order>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-order.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-order.js"></script>
<webwriter-order></webwriter-order>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterOrder.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterOrder.actions` | `object` | - | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add item") }, }` | ✗ |
| `WebwriterOrder.convertTo` | `object` | - | `{ ol: "toList" }` | ✗ |
| `WebwriterOrder.options` | `object` | - | `{ ...WebwriterTask.options, "direction": { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Direction"), options: [ { value: "ascending", label: (widget: { msg: MsgFn }) => widget.msg("Ascending") }, { value: "descending", label: (widget: { msg: MsgFn }) => widget.msg("Descending") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The order direction to use."), }, numberingStyle: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Numbering"), options: [ { value: "none", label: (widget: { msg: MsgFn }) => widget.msg("None") }, { value: "numeric", label: (widget: { msg: MsgFn }) => widget.msg("Numeric") }, { value: "alphabetic", label: (widget: { msg: MsgFn }) => widget.msg("Alphabetic") }, { value: "roman", label: (widget: { msg: MsgFn }) => widget.msg("Roman") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The numbering style to use."), }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Exact order only"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every item is in its exact position."), }, { value: "partial-position", label: (widget: { msg: MsgFn }) => widget.msg("Correct positions"), description: (widget: { msg: MsgFn }) => widget.msg("Credit for each item placed in its exact slot."), }, { value: "partial-relative", label: (widget: { msg: MsgFn }) => widget.msg("Relative order"), description: (widget: { msg: MsgFn }) => widget.msg("Credit for each pair of items ordered correctly relative to each other."), }, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, acceptReverse: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Accept reverse order"), }, }` | ✗ |
| `direction` (`direction`) | `OrderDirection` | The direction in which the items are numbered.<br><br>- `ascending`: The first item carries the lowest position.<br>- `descending`: The first item carries the highest position. | `"ascending"` | ✓ |
| `numberingStyle` (`numbering-style`) | `OrderNumberingStyle` | How the position of each item is labelled.<br><br>- `none`: No position is shown.<br>- `numeric`: Arabic numerals (1., 2., 3., ...).<br>- `alphabetic`: Latin letters (A., B., C., ...).<br>- `roman`: Roman numerals (I., II., III., ...). | `"numeric"` | ✓ |
| `gradingMethod` (`grading-method`) | `OrderGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if every item is in its correct position.<br>- `partial-position`: Credit for each item in its correct position.<br>- `partial-relative`: Credit for each pair in the correct relative order.<br>- `ungraded`: Record responses without scoring. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `OrderSolution` | The IDs of the items in their correct order. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `WebwriterOrder.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `reset` | - | -
| `checkAnswer` | - | `detailedFeedback=false`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterOrderItem` (`<webwriter-order-item>`)
A single item of a `<webwriter-order>`.

It must be assigned to the default slot of its parent element. An optional
`<webwriter-quiz-hint>` may be assigned to its `hint` slot.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-order-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-order-item.js"></script>
<webwriter-order-item></webwriter-order-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-order-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-order-item.js"></script>
<webwriter-order-item></webwriter-order-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebwriterSpeech` (`<webwriter-speech>`)
An answer where learners record a spoken response.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-speech.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-speech.js"></script>
<webwriter-speech></webwriter-speech>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-speech.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-speech.js"></script>
<webwriter-speech></webwriter-speech>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterSpeech.options` | `object` | - | `{ ...WebwriterTask.options, required: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require a recording before submitting") }, }` | ✗ |
| `required` (`required`) | `boolean` | Whether learners have to record an answer before they can submit the quiz. The recording is never graded. | `false` | ✓ |
| `src` (`src`) | `string \| null` | An existing recording URL saved in authored HTML. | `null` | ✓ |
| `WebwriterSpeech.actions` | `object` | - | `{}` | ✗ |
| `WebwriterSpeech.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `reset` | - | -
| `checkValidity` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterText` (`<webwriter-text>`)
A full-width text answer that starts with one visible line. Authors can drag the bottom border to change the saved height. Grading Method controls how text responses are scored.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-text.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-text.js"></script>
<webwriter-text></webwriter-text>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-text.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-text.js"></script>
<webwriter-text></webwriter-text>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `rows` (`rows`) | `number` | Authored number of visible lines. | `1` | ✓ |
| `allowReaderResize` (`allow-reader-resize`) | `boolean` | Allows readers to resize the field for themselves. | `false` | ✓ |
| `maxWords` (`max-words`) | `number` | Maximum number of words before submission. Zero allows any length. | `0` | ✓ |
| `maxCharacters` (`max-characters`) | `number` | Maximum number of characters in a response. Zero allows any length. | `0` | ✓ |
| `gradingMethod` (`grading-method`) | `string` | `exact`, `completion`, `self-assess`, or `ungraded`. | `"exact"` | ✓ |
| `placeholder` (`placeholder`) | `string` | The placeholder shown while the field is empty. | `""` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether the answer is compared to the solution case-insensitively. | `false` | ✓ |
| `correctMessage` (`correct-message`) | `string` | Legacy feedback shown after submitting if the answer is correct. | `""` | ✓ |
| `wrongMessage` (`wrong-message`) | `string` | Legacy feedback shown after submitting if the answer is wrong. | `""` | ✓ |
| `solution` (`solution`) | `string \| string[]` | The value counting as correct, or a list of values that all count as correct. It is obfuscated in the markup so that learners cannot read it directly. | `""` | ✓ |
| `WebwriterText.actions` | `object` | - | `{}` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `focus` | - | -
| `checkValidity` | - | -
| `reset` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## Numeric Date/Time

In Number and Slider, set tolerance and unit beside the answer. The tolerance selector switches between absolute and percentage values. Open **Partial credit band** beside Unit to set the additional range for partial credit.

In Slider, edit the minimum and maximum below the track. When an endpoint changes, the solution moves to the nearest selectable value if needed.

The Date/Time variant uses `<webwriter-numeric mode="datetime">`. It defaults to **Date**. The buttons beside the field switch between **Date**, **Time**, and **Date & time**. The `datetime-type` attribute stores the selection as `date`, `time`, or `datetime-local`. The `datetime-solution` attribute stores the expected value. Existing date-and-time answers use the combined input when the type is omitted.

## `WebWriterMark` (`<webwriter-mark>`)
An answer where learners mark the words of a text that fit the task.

Put the text to mark in the default slot.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-mark.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-mark.js"></script>
<webwriter-mark></webwriter-mark>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-mark.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-mark.js"></script>
<webwriter-mark></webwriter-mark>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebWriterMark.actions` | `object` | - | `{ ...WebwriterTask.actions, toggleMarkingAtPosition: { label: (widget: { msg: MsgFn }) => widget.msg("Toggle Marking at Position") }, }` | ✗ |
| `WebWriterMark.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Pass/Fail") }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial Credit") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, hideTargetCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide total marks to find") }, }` | ✗ |
| `gradingMethod` (`grading-method`) | `MarkGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct words are marked.<br>- `partial`: Correctly marked words earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `hideTargetCount` (`hide-target-count`) | `boolean` | Hides the total number of marks to find in reader mode. | `false` | ✓ |
| `solution` (`solution`) | `number[]` | The indices of the word-like segments counting as correct. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `WebWriterMark.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`
| `reset` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterGap` (`<webwriter-gap>`)
An answer where learners fill the gaps in a text.

The text must be assigned to the default slot, with a `<webwriter-gap-item>`
in place of each gap.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-gap.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-gap.js"></script>
<webwriter-gap></webwriter-gap>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-gap.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-gap.js"></script>
<webwriter-gap></webwriter-gap>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterGap.actions` | `object` | - | `{ ...WebwriterTask.actions, insertGapAtSelection: { label: (widget: { msg: MsgFn }) => widget.msg("Insert gap at selection") }, }` | ✗ |
| `WebwriterGap.options` | `object` | Grading and text-matching settings. | - | ✗ |
| `mode` (`mode`) | `GapMode` | Legacy setting for documents that used a task-wide mode. | `"input"` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether answers are compared to the solution case-insensitively. Only applies in `input` mode. | `false` | ✓ |
| `WebwriterGap.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `reset` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| change | Dispatched when learners move an answer into or out of a gap. Only in `drag-and-drop` mode. |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterGapItem` (`<webwriter-gap-item>`)
A single gap of a `<webwriter-gap>`, whose content is the correct answer.

It must be placed inside the text assigned to the default slot of its parent
element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-gap-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-gap-item.js"></script>
<webwriter-gap-item></webwriter-gap-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-gap-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-gap-item.js"></script>
<webwriter-gap-item></webwriter-gap-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterGapItem.options` | `Record<string, Declared<OptionDeclaration>>` | - | `{ placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, }` | ✗ |
| `options` | - | A placeholder only applies to the Gap text mode. | - | ✗ |
| `placeholder` (`placeholder`) | `string` | The placeholder shown while the gap is empty. Only applies in `input` mode. | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, custom CSS properties, or CSS parts.*


## `WebwriterPairing` (`<webwriter-pairing>`)
An answer where learners match items into pairs.

Add two `<webwriter-pairing-column>` children, each containing one or more `<webwriter-pairing-item>` elements.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing.js"></script>
<webwriter-pairing></webwriter-pairing>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-pairing.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-pairing.js"></script>
<webwriter-pairing></webwriter-pairing>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterPairing.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every pair matches."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per correct pair"), description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly matched pair."), }, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `solution` (`solution`) | `[string, string][]` | The pairs counting as correct, as tuples of the two item IDs. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `WebwriterPairing.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`
| `reset` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterPairing` (`<webwriter-pairing-item>`)
A single item of a `<webwriter-pairing>`.

It must be a child of its parent element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing-item.js"></script>
<webwriter-pairing-item></webwriter-pairing-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-pairing-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-pairing-item.js"></script>
<webwriter-pairing-item></webwriter-pairing-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterPairing.actions` | `object` | - | `{}` | ✗ |
| `WebwriterPairing.options` | `object` | - | `{ label: { type: "string" as const, label: (widget: { msg: MsgFn }) => widget.msg("Label"), placeholder: (widget: WebwriterTask) => widget.defaultLabel, }, points: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Points") }, }` | ✗ |
| `WebwriterPairing.gradingOptions` | `array` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod", "ignoreCase", "freeText"]` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `reset` | - | -

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| card | The card that holds the task. |
| title | The generated task label ("#1"). |
| prompt | The prompt of the task. |
| answer | The area with the answer controls. |
| result | The correctness and points shown after submitting. |
| feedback | The author's feedback in a popover. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


---
*Generated with @webwriter/build@1.14.0*
