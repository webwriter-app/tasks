# Tasks (`@webwriter/tasks@3.0.1`)
[License: MIT](LICENSE) | Version: 3.0.1

Create interactive quizzes with multiple-choice, ordering, free-text, highlighting, and speech tasks.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| Choice | `@webwriter/tasks/snippets/choice.html` |
| True Or False | `@webwriter/tasks/snippets/true-or-false.html` |
| Mark | `@webwriter/tasks/snippets/mark.html` |
| Text | `@webwriter/tasks/snippets/text.html` |
| Numeric | `@webwriter/tasks/snippets/numeric.html` |
| Gap | `@webwriter/tasks/snippets/gap.html` |
| Dictation | `@webwriter/tasks/snippets/dictation.html` |
| Order | `@webwriter/tasks/snippets/order.html` |
| Pairing | `@webwriter/tasks/snippets/pairing.html` |
| Categorize | `@webwriter/tasks/snippets/categorize.html` |
| Speech | `@webwriter/tasks/snippets/speech.html` |
| Image | `@webwriter/tasks/snippets/image.html` |
| Image Placements | `@webwriter/tasks/snippets/image-placements.html` |
| Drawing | `@webwriter/tasks/snippets/drawing.html` |
| About Webwriter | `@webwriter/tasks/snippets/about-webwriter.html` |



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
Legacy true/false element kept for backwards compatibility with existing documents.
New true/false tasks use `<webwriter-choice mode="true-false">`.

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
| `WebwriterTrueFalse.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Exact match"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit for selecting the correct option."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `WebwriterTrueFalse.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `gradingMethod` (`grading-method`) | `TrueFalseGradingMethod` | Whether responses are scored (`pass-fail`) or left ungraded (`ungraded`). | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `TrueFalse` | The value counting as correct.<br><br>- `true`: The statement is true.<br>- `false`: The statement is false. | `"true"` | ✓ |
| `WebwriterTrueFalse.actions` | `object` | - | `{}` | ✗ |
| `WebwriterTrueFalse.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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
An answer where learners pick one or more options, or decide true vs. false.

Author at least two `<webwriter-choice-item>` children in the default slot.
True/False mode shows its own two answers.

Conversion: the options can be converted to a `ul` (the solution is not carried over), and a `ul`
or `ol` becomes a single-choice task with one option per list item and no option marked correct.
A one-item list gets a blank second option.

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
| `WebwriterChoice.actions` | `object` | - | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") }, }` | ✗ |
| `WebwriterChoice.convertFrom` | `object` | - | `{ ul: "loadList", ol: "loadList" }` | ✗ |
| `WebwriterChoice.convertTo` | `object` | - | `{ ul: "toList" }` | ✗ |
| `WebwriterChoice.options` | `object` | - | `{ ...WebwriterTask.options, "mode": { type: "select", options: [ { value: "single", label: (widget: { msg: MsgFn }) => widget.msg("Single choice", { id: "s9daa676c05ab2a68" }) }, { value: "multiple", label: (widget: { msg: MsgFn }) => widget.msg("Multiple Choice") }, { value: "true-false", label: (widget: { msg: MsgFn }) => widget.msg("True/False") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Mode"), }, randomizeOrder: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Randomize Order") }, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every right option and no wrong option is selected."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"), description: (widget: { msg: MsgFn }) => widget.msg("Right selections add credit; wrong selections subtract from it (min. 0)."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, }` | ✗ |
| `WebwriterChoice.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `WebwriterChoice.options` | `object` | - | `{ ...WebwriterTask.options, "mode": { type: "select", options: [ { value: "single", label: (widget: { msg: MsgFn }) => widget.msg("Single choice", { id: "s9daa676c05ab2a68" }) }, { value: "multiple", label: (widget: { msg: MsgFn }) => widget.msg("Multiple Choice") }, { value: "true-false", label: (widget: { msg: MsgFn }) => widget.msg("True/False") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Mode"), }, randomizeOrder: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Randomize Order") }, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every right option and no wrong option is selected."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"), description: (widget: { msg: MsgFn }) => widget.msg("Right selections add credit; wrong selections subtract from it (min. 0)."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, }` | ✗ |
| `WebwriterChoice.actions` | `object` | - | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") }, }` | ✗ |
| `mode` (`mode`) | `"single" \| "multiple" \| "true-false"` | How many options learners may select, or `true-false` tiles. Multiple choice is the default.<br><br>- `multiple`: Any number of options can be selected.<br>- `single`: Exactly one option can be selected.<br>- `true-false`: Built-in True / False tiles. | `"multiple"` | ✓ |
| `gradingMethod` (`grading-method`) | `ChoiceGradingMethod \| ChoiceGridGrading` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct options are selected.<br>- `partial`: Correct selections earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `ChoiceSolution \| ChoiceGridSolution` | The options counting as correct, as a map from option ID (or `"true"`/`"false"`) to whether it has to be selected.<br>It is obfuscated in the markup so that learners cannot read it directly. | `{}` | ✓ |
| `WebwriterChoice.gridActions` | `object` | - | `{ ...WebwriterTask.actions, addRow: { label: (widget: { msg: MsgFn }) => widget.msg("Add Row") }, addColumn: { label: (widget: { msg: MsgFn }) => widget.msg("Add Column") }, }` | ✗ |
| `ungraded` (`ungraded`) | `boolean` | When true, no answer key is stored or graded (for survey / rating / Likert scales). | `false` | ✓ |
| `columns` | - | - | - | ✗ |
| `rows` | - | - | - | ✗ |
| `grid` (`grid`) | `boolean` | - | `false` | ✓ |
| `WebwriterChoice.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback: boolean`
| `reset` | - | -
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`

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


## `WebwriterChoiceColumn` (`<webwriter-choice-column>`)
An editable column label in a Choice grid.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-column.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-column.js"></script>
<webwriter-choice-column></webwriter-choice-column>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-choice-column.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-choice-column.js"></script>
<webwriter-choice-column></webwriter-choice-column>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `selectionStates` | - | - | - | ✗ |
| `WebwriterChoiceColumn.scopedElements` | `object` | - | `{ "sl-icon": SlIcon }` | ✗ |
| `placeholder` (`placeholder`) | `string` | Placeholder label shown inside an empty item in edit mode. | `""` | ✗ |
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


## `WebwriterChoiceRow` (`<webwriter-choice-row>`)
An editable row label in a Choice grid.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-row.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-choice-row.js"></script>
<webwriter-choice-row></webwriter-choice-row>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-choice-row.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-choice-row.js"></script>
<webwriter-choice-row></webwriter-choice-row>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `selectionStates` | - | - | - | ✗ |
| `WebwriterChoiceRow.scopedElements` | `object` | - | `{ "sl-icon": SlIcon }` | ✗ |
| `placeholder` (`placeholder`) | `string` | Placeholder label shown inside an empty item in edit mode. | `""` | ✗ |
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
| `WebwriterOrder.options` | `object` | - | `{ ...WebwriterTask.options, "direction": { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Direction"), options: [ { value: "ascending", label: (widget: { msg: MsgFn }) => widget.msg("Ascending") }, { value: "descending", label: (widget: { msg: MsgFn }) => widget.msg("Descending") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The order direction to use."), }, numberingStyle: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Numbering"), options: [ { value: "none", label: (widget: { msg: MsgFn }) => widget.msg("None") }, { value: "numeric", label: (widget: { msg: MsgFn }) => widget.msg("Numeric") }, { value: "alphabetic", label: (widget: { msg: MsgFn }) => widget.msg("Alphabetic") }, { value: "roman", label: (widget: { msg: MsgFn }) => widget.msg("Roman") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The numbering style to use."), }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Exact order only"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every item is in its exact position."), }, { value: "partial-position", label: (widget: { msg: MsgFn }) => widget.msg("Correct positions"), description: (widget: { msg: MsgFn }) => widget.msg("Credit for each item placed in its exact slot."), }, { value: "partial-relative", label: (widget: { msg: MsgFn }) => widget.msg("Relative order"), description: (widget: { msg: MsgFn }) => widget.msg("Credit for each pair of items ordered correctly relative to each other."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, acceptReverse: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Accept reverse order"), }, }` | ✗ |
| `WebwriterOrder.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `direction` (`direction`) | `OrderDirection` | The direction in which the items are numbered.<br><br>- `ascending`: The first item carries the lowest position.<br>- `descending`: The first item carries the highest position. | `"ascending"` | ✓ |
| `numberingStyle` (`numbering-style`) | `OrderNumberingStyle` | How the position of each item is labelled.<br><br>- `none`: No position is shown.<br>- `numeric`: Arabic numerals (1., 2., 3., ...).<br>- `alphabetic`: Latin letters (A., B., C., ...).<br>- `roman`: Roman numerals (I., II., III., ...). | `"numeric"` | ✓ |
| `gradingMethod` (`grading-method`) | `OrderGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if every item is in its correct position.<br>- `partial-position`: Credit for each item in its correct position.<br>- `partial-relative`: Credit for each pair in the correct relative order.<br>- `ungraded`: Record responses without scoring. | `"pass-fail"` | ✓ |
| `acceptReverse` (`accept-reverse`) | `boolean` | Whether reversing the solution sequence also counts as correct. | `false` | ✓ |
| `solution` (`solution`) | `OrderSolution` | The IDs of the items in their correct order. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `WebwriterOrder.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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

It must be assigned to the default slot of its parent element. Items have no hints of their
own; a hint on an item from an earlier version stays in the markup but is not shown.

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
| `WebwriterSpeech.options` | `object` | - | `{ ...WebwriterTask.options, required: { type: "boolean", label: (widget: WebwriterSpeech) => widget.msg("Require a recording before submitting"), }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "transcript", label: (widget: { msg: MsgFn }) => widget.msg("Match transcript"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the spoken words match the reference transcript."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial credit"), description: (widget: { msg: MsgFn }) => widget.msg("Give credit word by word, with deductions for missing, extra, or changed words."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Shows the optional sample for comparison without scoring."), }, ], }, }` | ✗ |
| `WebwriterSpeech.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `speechLanguage` (`speech-language`) | `string` | Language used for speech recognition. Defaults to the task's language. | `""` | ✓ |
| `transcript` (`transcript`) | `string` | Text expected from the learner, saved with the reference recording. | `""` | ✓ |
| `required` (`required`) | `boolean` | - | `false` | ✓ |
| `src` (`src`) | `string \| null` | An existing learner recording URL supplied by the document. | `null` | ✓ |
| `solution` (`solution`) | `string` | Optional reference recording authored in edit mode. | `""` | ✓ |
| `gradingMethod` (`grading-method`) | `"transcript" \| "partial" \| "ungraded" \| "self-assess"` | - | `"transcript"` | ✓ |
| `WebwriterSpeech.actions` | `object` | - | `{}` | ✗ |
| `WebwriterSpeech.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkAnswer` | - | `detailedFeedback=false`
| `checkValidity` | - | -
| `reset` | - | -
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`

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
An answer where learners type a value into an input field.

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
| `WebwriterText.options` | `object` | - | `{ ...WebwriterTask.options, placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, allowReaderResize: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Allow readers to resize") }, minWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum words") }, maxWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum words") }, minCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum characters") }, maxCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum characters") }, showWordCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show word count") }, gradingMethod: { type: "select", attribute: "grading-method", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "exact", label: (widget: { msg: MsgFn }) => widget.msg("Match answer key"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the answer matches an accepted solution."), }, { value: "completion", label: (widget: { msg: MsgFn }) => widget.msg("Completion credit"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the response meets the answer limits."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, ...textToleranceOptions, useRegex: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Advanced: Match as regular expression") }, }` | ✗ |
| `WebwriterText.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `WebwriterText.options` | `object` | - | `{ ...WebwriterTask.options, placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, allowReaderResize: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Allow readers to resize") }, minWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum words") }, maxWords: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum words") }, minCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Minimum characters") }, maxCharacters: { type: Number, min: 0, step: 1, label: (widget: { msg: MsgFn }) => widget.msg("Maximum characters") }, showWordCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show word count") }, gradingMethod: { type: "select", attribute: "grading-method", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "exact", label: (widget: { msg: MsgFn }) => widget.msg("Match answer key"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the answer matches an accepted solution."), }, { value: "completion", label: (widget: { msg: MsgFn }) => widget.msg("Completion credit"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when the response meets the answer limits."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, ...textToleranceOptions, useRegex: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Advanced: Match as regular expression") }, }` | ✗ |
| `rows` (`rows`) | `number \| undefined` | The authored number of visible lines. | - | ✓ |
| `allowReaderResize` (`allow-reader-resize`) | `boolean` | Allows readers to adjust the answer field height for themselves. | `false` | ✓ |
| `minWords` (`min-words`) | `number` | Minimum words in a reader's answer, or zero for no limit. | `0` | ✓ |
| `maxWords` (`max-words`) | `number` | Maximum words in a reader's answer, or zero for no limit. | `0` | ✓ |
| `minCharacters` (`min-characters`) | `number` | Minimum characters in a reader's answer, or zero for no limit. | `0` | ✓ |
| `maxCharacters` (`max-characters`) | `number` | Maximum characters in a reader's answer, or zero for no limit. | `0` | ✓ |
| `placeholder` (`placeholder`) | `string` | The placeholder shown while the field is empty. | `""` | ✓ |
| `showWordCount` (`show-word-count`) | `boolean` | Whether to display the live word count while answering. | `false` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether the answer is compared to the solution case-insensitively. | `false` | ✓ |
| `ignorePunctuation` (`ignore-punctuation`) | `boolean` | Whether punctuation and diacritics are ignored when comparing text answers. | `false` | ✓ |
| `allowTypos` (`allow-typos`) | `boolean` | Whether minor spelling typos are accepted when comparing text answers. | `false` | ✓ |
| `useRegex` (`use-regex`) | `boolean` | Whether accepted answers are evaluated as regular expression patterns. | `false` | ✓ |
| `gradingMethod` | `TextGradingMethod` | How answers are scored. | - | ✗ |
| `correctMessage` (`correct-message`) | `string` | Legacy feedback shown after submitting if the answer is correct. | `""` | ✓ |
| `wrongMessage` (`wrong-message`) | `string` | Legacy feedback shown after submitting if the answer is wrong. | `""` | ✓ |
| `solution` (`solution`) | `string \| string[]` | The value counting as correct, or a list of values that all count as correct. It is obfuscated in the markup so that learners cannot read it directly. | `""` | ✓ |
| `WebwriterText.actions` | `object` | - | `{}` | ✗ |
| `WebwriterText.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`

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


## `WebwriterDictation` (`<webwriter-dictation>`)
An audio prompt with a typed transcription, and an optional slower recording.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-dictation.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-dictation.js"></script>
<webwriter-dictation></webwriter-dictation>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-dictation.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-dictation.js"></script>
<webwriter-dictation></webwriter-dictation>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterDictation.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterDictation.scopedElements` | `object` | - | `{ ...WebwriterTask.scopedElements, "ww-language-picker": RecordingLanguagePicker }` | ✗ |
| `WebwriterDictation.options` | `object` | - | `{ ...WebwriterTask.options, ignoreCase: textToleranceOptions.ignoreCase, ignorePunctuation: { type: "boolean", label: (task: { msg: MsgFn }) => task.msg("Ignore punctuation") }, allowTypos: { type: "boolean", label: (task: { msg: MsgFn }) => task.msg("Give partial credit for minor typos") }, gradingMethod: { type: "select", label: (task: { msg: MsgFn }) => task.msg("Grading Method"), options: [ { value: "pass-fail", label: (task: { msg: MsgFn }) => task.msg("All or nothing") }, { value: "partial", label: (task: { msg: MsgFn }) => task.msg("Partial credit") }, selfAssessmentOption, { value: "ungraded", label: (task: { msg: MsgFn }) => task.msg("Ungraded") }, ], }, }` | ✗ |
| `WebwriterDictation.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `transcript` (`transcript`) | `string` | Expected transcript, saved as an obfuscated attribute. | `""` | ✓ |
| `playLimit` (`play-limit`) | `number` | Maximum number of plays per recording. Zero allows unlimited playback. | `0` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | - | `false` | ✓ |
| `ignorePunctuation` (`ignore-punctuation`) | `boolean` | - | `false` | ✓ |
| `allowTypos` (`allow-typos`) | `boolean` | - | `false` | ✓ |
| `gradingMethod` (`grading-method`) | `"partial" \| "pass-fail" \| "self-assess" \| "ungraded"` | - | `"partial"` | ✓ |
| `WebwriterDictation.actions` | `object` | - | `{}` | ✗ |
| `WebwriterDictation.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback=false`
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`
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
| `WebWriterMark.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if exactly the right words are marked."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial (penalize wrong)"), description: (widget: { msg: MsgFn }) => widget.msg("Right marks add credit; wrong marks subtract from it (min. 0)."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, hideTargetCount: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide total marks to find") }, }` | ✗ |
| `WebWriterMark.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `gradingMethod` (`grading-method`) | `MarkGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct words are marked.<br>- `partial`: Correctly marked words earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `hideTargetCount` (`hide-target-count`) | `boolean` | Hides the total number of marks to find in reader mode. | `false` | ✓ |
| `solution` (`solution`) | `number[]` | The indices of the word-like segments counting as correct. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `WebWriterMark.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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
| `WebwriterGap.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every gap is filled correctly."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per gap"), description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly filled gap."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, ...textToleranceOptions, }` | ✗ |
| `WebwriterGap.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `WebwriterGap.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every gap is filled correctly."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per gap"), description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly filled gap."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, ...textToleranceOptions, }` | ✗ |
| `WebwriterGap.actions` | `object` | - | `{ ...WebwriterTask.actions, insertGapAtSelection: { label: (widget: { msg: MsgFn }) => widget.msg("Insert gap at selection") }, }` | ✗ |
| `mode` (`mode`) | `"input" \| "drag-and-drop" \| "dropdown"` | How learners fill the gaps.<br><br>- `input`: Each gap is a text field learners type into.<br>- `drag-and-drop`: The gaps are filled from a shared pool of draggable answers. | `"input"` | ✓ |
| `gradingMethod` (`grading-method`) | `GapGridGrading` | Whether points are awarded per correct gap (`partial`) or all-or-nothing (`pass-fail`). | `"partial"` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether answers are compared to the solution case-insensitively. Only applies in `input` mode. | `false` | ✓ |
| `ignorePunctuation` (`ignore-punctuation`) | `boolean` | Whether punctuation and diacritics are ignored when comparing typed answers. Only applies in `input` mode. | `false` | ✓ |
| `allowTypos` (`allow-typos`) | `boolean` | Whether minor spelling typos are accepted when comparing typed answers. Only applies in `input` mode. | `false` | ✓ |
| `WebwriterGap.gridActions` | `object` | - | `{ ...WebwriterTask.actions, addRow: { label: (widget: { msg: MsgFn }) => widget.msg("Add Row") }, addColumn: { label: (widget: { msg: MsgFn }) => widget.msg("Add Column") }, }` | ✗ |
| `showColumnHeaders` (`show-column-headers`) | `boolean` | Whether learners see the top column header row. | `true` | ✓ |
| `showRowHeaders` (`show-row-headers`) | `boolean` | Whether learners see the leading row header column. | `true` | ✓ |
| `columns` (`columns`) | `string[]` | Column header item IDs. | `[]` | ✓ |
| `rows` (`rows`) | `string[]` | Row header item IDs. | `[]` | ✓ |
| `cells` (`cells`) | `string[][]` | Matrix of body cell item IDs indexed `[rowIndex][colIndex]`. | `[]` | ✓ |
| `gaps` (`gaps`) | `string[]` | IDs of body cells that act as gaps. | `[]` | ✓ |
| `grid` (`grid`) | `boolean` | - | `false` | ✓ |
| `WebwriterGap.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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
| `options` | - | Authors can set a placeholder for a typed answer. | - | ✗ |
| `placeholder` (`placeholder`) | `string` | The placeholder shown while the gap is empty. Only applies in `input` mode. | `""` | ✓ |
| `distractors` (`distractors`) | `string` | Legacy `\|`-separated alternatives, used until this gap has its own saved choices. | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `focusEdit` | Focuses the internal edit input and places or selects its range. | `selection: "start" | "end" | "all"="end"`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, custom CSS properties, or CSS parts.*


## `WebwriterPairing` (`<webwriter-pairing>`)
An answer where learners match items into pairs.

The two `<webwriter-pairing-column>` children contain the editable items.

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
| `WebwriterPairing.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every pair matches."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per correct pair"), description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each correctly matched pair."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `WebwriterPairing.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `gradingMethod` (`grading-method`) | `PairingGradingMethod` | Whether points are awarded per correct pair (`partial`) or all-or-nothing (`pass-fail`). | `"partial"` | ✓ |
| `solution` (`solution`) | `Link[]` | The pairs counting as correct, as tuples of the two item IDs. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `multipleConnections` (`multiple-connections`) | `boolean` | Allow an item to connect to several items across the two columns. | `false` | ✓ |
| `WebwriterPairing.actions` | `object` | - | `{}` | ✗ |
| `WebwriterPairing.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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


## `WebwriterPairingColumn` (`<webwriter-pairing-column>`)
One column of a Pairing task. Its authored item order is used in edit mode.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing-column.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-pairing-column.js"></script>
<webwriter-pairing-column></webwriter-pairing-column>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-pairing-column.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-pairing-column.js"></script>
<webwriter-pairing-column></webwriter-pairing-column>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterPairingColumn.shadowRootOptions` | `object` | - | `{ ...LitElement.shadowRootOptions, slotAssignment: "manual" as const }` | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, events, custom CSS properties, or CSS parts.*


## `WebwriterPairingItem` (`<webwriter-pairing-item>`)
The complete selectable block for one item of a Pairing task.

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


## `WebwriterCategorize` (`<webwriter-categorize>`)
A task where learners sort answers into named groups. Group headings are
`<webwriter-grid-item>` children, and answers are `<webwriter-categorize-item>` children.
The solution maps group IDs to the answers assigned to them.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-categorize.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-categorize.js"></script>
<webwriter-categorize></webwriter-categorize>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-categorize.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-categorize.js"></script>
<webwriter-categorize></webwriter-categorize>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterCategorize.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every item is sorted into its right group."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per item"), description: (widget: { msg: MsgFn }) => widget.msg("Proportional credit for each item placed in its right group."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `WebwriterCategorize.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `gradingMethod` (`grading-method`) | `CategorizeGrading` | Whether points are awarded per correctly categorized item (`partial`) or all-or-nothing (`pass-fail`). | `"partial"` | ✓ |
| `categories` (`categories`) | `string[]` | Category header item IDs, in display order. | `[]` | ✓ |
| `solution` (`solution`) | `CategorizeSolution` | Expected card IDs per category ID, obfuscated in markup. | `{}` | ✓ |
| `multiGroup` (`multi-group`) | `boolean` | Allow each item to have a placement in more than one group. | `false` | ✓ |
| `WebwriterCategorize.actions` | `object` | - | `{}` | ✗ |
| `WebwriterCategorize.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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


## `WebwriterCategorizeItem` (`<webwriter-categorize-item>`)
One editable answer in the Groups task.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-categorize-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-categorize-item.js"></script>
<webwriter-categorize-item></webwriter-categorize-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-categorize-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-categorize-item.js"></script>
<webwriter-categorize-item></webwriter-categorize-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterCategorizeItem.scopedElements` | `object` | - | `{ "sl-icon": SlIcon }` | ✗ |
| `placeholder` (`placeholder`) | `string` | Placeholder label shown inside an empty item in edit mode. | `""` | ✗ |
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


## `WebwriterNumeric` (`<webwriter-numeric>`)
A numeric answer task supporting an exact/tolerant number field or an estimation slider.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-numeric.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-numeric.js"></script>
<webwriter-numeric></webwriter-numeric>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-numeric.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-numeric.js"></script>
<webwriter-numeric></webwriter-numeric>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterNumeric.options` | `object` | - | `{ ...WebwriterTask.options, mode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Input type"), options: [ { value: "input", label: (widget: { msg: MsgFn }) => widget.msg("Number") }, { value: "slider", label: (widget: { msg: MsgFn }) => widget.msg("Slider") }, { value: "datetime", label: (widget: { msg: MsgFn }) => widget.msg("Date/Time") }, ], }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "exact", label: (widget: { msg: MsgFn }) => widget.msg("Within tolerance"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit within tolerance, with optional linear partial-credit band."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, tolerance: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Tolerance (±)") }, toleranceMode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Tolerance type"), options: [ { value: "absolute", label: (widget: { msg: MsgFn }) => widget.msg("Absolute (± value)") }, { value: "relative", label: (widget: { msg: MsgFn }) => widget.msg("Relative (± %)") }, ], }, partialRange: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Partial credit band"), description: (widget: { msg: MsgFn }) => widget.msg("Extra range beyond tolerance where credit decays linearly to zero."), }, unit: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Unit") }, min: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Minimum") }, max: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Maximum") }, step: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Step") }, }` | ✗ |
| `WebwriterNumeric.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `WebwriterNumeric.options` | `object` | - | `{ ...WebwriterTask.options, mode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Input type"), options: [ { value: "input", label: (widget: { msg: MsgFn }) => widget.msg("Number") }, { value: "slider", label: (widget: { msg: MsgFn }) => widget.msg("Slider") }, { value: "datetime", label: (widget: { msg: MsgFn }) => widget.msg("Date/Time") }, ], }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "exact", label: (widget: { msg: MsgFn }) => widget.msg("Within tolerance"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit within tolerance, with optional linear partial-credit band."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, tolerance: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Tolerance (±)") }, toleranceMode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Tolerance type"), options: [ { value: "absolute", label: (widget: { msg: MsgFn }) => widget.msg("Absolute (± value)") }, { value: "relative", label: (widget: { msg: MsgFn }) => widget.msg("Relative (± %)") }, ], }, partialRange: { type: Number, min: 0, label: (widget: { msg: MsgFn }) => widget.msg("Partial credit band"), description: (widget: { msg: MsgFn }) => widget.msg("Extra range beyond tolerance where credit decays linearly to zero."), }, unit: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Unit") }, min: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Minimum") }, max: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Maximum") }, step: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Step") }, }` | ✗ |
| `mode` (`mode`) | `NumericMode` | Whether learners enter a number, use a range slider, or enter a date and time. | `"input"` | ✓ |
| `gradingMethod` (`grading-method`) | `NumericGradingMethod` | Whether numeric answers are scored (`exact`) or recorded without scoring (`ungraded`). | `"exact"` | ✓ |
| `solution` (`solution`) | `number` | Target numeric value counting as correct, obfuscated in markup. | `0` | ✓ |
| `dateTimeType` (`datetime-type`) | `DateTimeType \| ""` | Which native field the Date/Time mode uses. Omit to infer the type from an existing solution or default to Date. | `""` | ✓ |
| `dateTimeSolution` (`datetime-solution`) | `string` | Target date, time, or local date and time in Date/Time mode, obfuscated in markup. | `""` | ✓ |
| `tolerance` (`tolerance`) | `number` | Maximum allowed deviation (`\|answer - solution\| <= tolerance`). | `0` | ✓ |
| `toleranceMode` (`tolerance-mode`) | `ToleranceMode` | Whether `tolerance` and `partialRange` are absolute values or percentages of the target. | `"absolute"` | ✓ |
| `partialRange` (`partial-range`) | `number` | Extra distance beyond tolerance where score tapers linearly from 1 down to 0. | `0` | ✓ |
| `unit` (`unit`) | `string` | Optional unit displayed beside the field or value readout (e.g. `m/s`, `%`). | `""` | ✓ |
| `min` (`min`) | `number` | Lower bound for `slider` mode. | `0` | ✓ |
| `max` (`max`) | `number` | Upper bound for `slider` mode. | `100` | ✓ |
| `step` (`step`) | `number` | Increment size for `slider` mode. | `1` | ✓ |
| `WebwriterNumeric.actions` | `object` | - | `{}` | ✗ |
| `WebwriterNumeric.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
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


## `WebwriterImage` (`<webwriter-image>`)
Learners find hidden regions and match labels to numbered markers on the same image.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image.js"></script>
<webwriter-image></webwriter-image>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-image.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-image.js"></script>
<webwriter-image></webwriter-image>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterImage.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every marker matches with no wrong pins."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per marker"), description: (widget: { msg: MsgFn }) => widget.msg("Credit per matched marker, subtracting extra wrong pins."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `WebwriterImage.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `src` (`src`) | `string` | Legacy fallback image URL or data URL when no slotted `<picture slot="media">` is present. | `""` | ✓ |
| `alt` (`alt`) | `string` | Legacy fallback alt text for `src`. | `""` | ✓ |
| `gradingMethod` (`grading-method`) | `ImageGrading` | How partial vs all-or-nothing credit is computed across markers. | `"partial"` | ✓ |
| `markers` (`markers`) | `ImageMarker[]` | Authored target markers on the image (`x`, `y`, `r` in `%`), obfuscated in markup. | `[]` | ✓ |
| `WebwriterImage.actions` | `object` | - | `{}` | ✗ |
| `WebwriterImage.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `createInstance` | - | `doc: Document`
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


## `WebwriterImagePlacements` (`<webwriter-image-placements>`)
A background with authored drop zones and movable text or image pieces.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image-placements.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image-placements.js"></script>
<webwriter-image-placements></webwriter-image-placements>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-image-placements.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-image-placements.js"></script>
<webwriter-image-placements></webwriter-image-placements>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterImagePlacements.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterImage.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterImagePlacements.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("All or nothing"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit only if every marker matches with no wrong pins."), }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Per marker"), description: (widget: { msg: MsgFn }) => widget.msg("Credit per matched marker, subtracting extra wrong pins."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Responses are recorded without scoring."), }, ], }, }` | ✗ |
| `WebwriterImagePlacements.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `src` (`src`) | `string` | Legacy fallback image URL or data URL when no slotted `<picture slot="media">` is present. | `""` | ✓ |
| `alt` (`alt`) | `string` | Legacy fallback alt text for `src`. | `""` | ✓ |
| `gradingMethod` (`grading-method`) | `ImageGrading` | How partial vs all-or-nothing credit is computed across markers. | `"partial"` | ✓ |
| `markers` (`markers`) | `ImageMarker[]` | Authored target markers on the image (`x`, `y`, `r` in `%`), obfuscated in markup. | `[]` | ✓ |
| `WebwriterImagePlacements.actions` | `object` | - | `{}` | ✗ |
| `WebwriterImagePlacements.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `checkAnswer` | - | `detailedFeedback=false`
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`
| `reset` | - | -
| `createInstance` | - | `doc: Document`

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


## `WebwriterImagePlacementItem` (`<webwriter-image-placement-item>`)
An editable option in an Image Placements task.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image-placement-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-image-placement-item.js"></script>
<webwriter-image-placement-item></webwriter-image-placement-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-image-placement-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-image-placement-item.js"></script>
<webwriter-image-placement-item></webwriter-image-placement-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `counterpartHovered` | `boolean` | - | `false` | ✗ |
| `selectionStates` | - | - | - | ✗ |
| `WebwriterImagePlacementItem.scopedElements` | `object` | - | `{ "sl-icon": SlIcon }` | ✗ |
| `placeholder` (`placeholder`) | `string` | Placeholder label shown inside an empty item in edit mode. | `""` | ✗ |
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


## `WebwriterDrawing` (`<webwriter-drawing>`)
An SVG sketchpad response task powered by `@webwriter/graphic` with an optional
author-provided background image and an optional edit-mode comparison solution.
Authors can award completion credit or let learners assess their work with a rubric.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-drawing.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-drawing.js"></script>
<webwriter-drawing></webwriter-drawing>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-drawing.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-drawing.js"></script>
<webwriter-drawing></webwriter-drawing>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterDrawing.options` | `object` | - | `{ ...WebwriterTask.options, required: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require a drawing before submitting") }, canvasHeight: { type: "number", label: (widget: { msg: MsgFn }) => widget.msg("Canvas height"), min: MIN_CANVAS_HEIGHT, }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), options: [ { value: "completion", label: (widget: { msg: MsgFn }) => widget.msg("Completion credit"), description: (widget: { msg: MsgFn }) => widget.msg("Full credit when a drawing is submitted."), }, selfAssessmentOption, { value: "ungraded", label: (widget: { msg: MsgFn }) => widget.msg("Ungraded"), description: (widget: { msg: MsgFn }) => widget.msg("Shows the optional sample for comparison without scoring."), }, ], }, }` | ✗ |
| `WebwriterDrawing.gradingOptions` | `readonly string[]` | The options that the points in the top row open: the score and how answers earn it. | `["points", "gradingMethod"]` | ✗ |
| `backgroundSrc` (`background-src`) | `string` | Legacy fallback background image URL or data URL when no `<picture slot="background">` child is present. | `""` | ✓ |
| `required` (`required`) | `boolean` | Whether learners must draw at least one shape or stroke before submitting. | `false` | ✓ |
| `canvasHeight` (`canvas-height`) | `number` | Canvas height in CSS pixels, including when a background image is present. | `320` | ✓ |
| `solution` (`solution`) | `string` | SVG reference drawn in edit mode and shown for comparison after submission. | `""` | ✓ |
| `completionCredit` (`completion-credit`) | `boolean` | When true, submitting a non-empty drawing earns full credit instead of leaving the task ungraded. | `false` | ✓ |
| `gradingMethod` (`grading-method`) | `"ungraded" \| "completion" \| "self-assess"` | How to grade the drawing, if at all. | `"ungraded"` | ✓ |
| `WebwriterDrawing.actions` | `object` | - | `{}` | ✗ |
| `WebwriterDrawing.signals` | `object` | Public signals for other widgets: `score` (0 to 1) and `complete` (submitted). | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the task has been submitted." }, }, }` | ✗ |
| `label` (`label`) | `string` | The label of the task in its top row. Without it, the label is the task’s position in its group. | `""` | ✓ |
| `points` (`points`) | `number` | The maximum score for this task. | `1` | ✓ |
| `hideScoring` (`hide-scoring`) | `boolean` | Hide the grading badge and point values on this task. | `false` | ✓ |
| `rubric` (`rubric`) | `string` | Newline-separated self-assessment criteria. | `""` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkAnswer` | - | -
| `checkValidity` | - | -
| `reset` | - | -
| `showScore` | - | `score: number | undefined`, `submitted=score !== undefined`

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


## `WebwriterGridItem` (`<webwriter-grid-item>`)
A single header, cell, or card item inside a grid quiz task.

It must be a direct child of its parent grid task element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-grid-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/tasks/widgets/webwriter-grid-item.js"></script>
<webwriter-grid-item></webwriter-grid-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/tasks
```

```html
<link href="@webwriter/tasks/widgets/webwriter-grid-item.css" rel="stylesheet">
<script type="module" src="@webwriter/tasks/widgets/webwriter-grid-item.js"></script>
<webwriter-grid-item></webwriter-grid-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterGridItem.scopedElements` | `object` | - | `{ "sl-icon": SlIcon }` | ✗ |
| `placeholder` (`placeholder`) | `string` | Placeholder label shown inside an empty item in edit mode. | `""` | ✗ |
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
| `WebwriterQuizResults.signals` | `object` | - | `{ score: { shape: "number", label: { _: "Score" }, description: { _: "Share of points reached from 0 to 1 (0 before submitting)." }, }, complete: { shape: "boolean", label: { _: "Submitted" }, description: { _: "True once the quiz answers have been submitted." }, }, }` | ✗ |
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


---
*Generated with @webwriter/build@1.15.0*
