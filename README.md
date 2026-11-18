# Quiz (`@webwriter/quiz@3.0.0`)
[License: MIT](LICENSE) | Version: 3.0.0

Add interactive tasks (multiple choice, order, free text, highlighting, or speech input). Make a quiz out of multiple tasks.

## Snippets
[Snippets](https://webwriter.app/docs/snippets/snippets/) are examples and templates using the package's widgets.

| Name | Import Path |
| :--: | :---------: |
| True Or False | `@webwriter/quiz/snippets/true-or-false.html` |
| Single Choice | `@webwriter/quiz/snippets/single-choice.html` |
| Multiple Choice | `@webwriter/quiz/snippets/multiple-choice.html` |
| Order | `@webwriter/quiz/snippets/order.html` |
| Text | `@webwriter/quiz/snippets/text.html` |
| Mark | `@webwriter/quiz/snippets/mark.html` |
| Speech | `@webwriter/quiz/snippets/speech.html` |
| Gap | `@webwriter/quiz/snippets/gap.html` |
| Pairing | `@webwriter/quiz/snippets/pairing.html` |



## `WebwriterQuiz` (`<webwriter-quiz>`)
A quiz groups multiple question elements into one exercise that is
submitted, graded and reset as a whole.

The tasks must be assigned to the default slot.

In WebWriter 2, use the quiz's question buttons to insert questions. The
package includes one-question snippets for each built-in type with question
titles and points hidden.

In edit mode, "Add Feedback" inserts a block that can be edited and
formatted in the question. Choice and Order group it with "Add Option" in
both layouts. The last question shares that row with "Add Question" on the
right. Learners see the feedback block after a valid submission, including
for open-ended and ungraded questions. "Show detailed feedback" controls
answer-specific feedback and solution reveal.

On paper the buttons are hidden and the questions print with a box or line
to write into.

Conversions: the quiz imports and exports GIFT (`.gift`, Moodle's plain-text
format) for true/false, single and multiple choice, short answer and numeric,
essay, matching (pairing) and missing-word (gap) tasks. Order, mark and speech
tasks have no GIFT form and are written as comments on export. GIFT keeps
plain text only (formatting, hints, feedback, points and grading settings
are dropped), gives a short answer one solution, and cannot carry the case
option, so imported text answers are case sensitive. Importing replaces the
tasks of the quiz. A `ul` or `ol` becomes a single-choice task with one option
per list item and no option marked correct.

Signals: `score` (number from 0 to 1, the share of the points reached; 0
before submitting) and `complete` (boolean, true once the answers are
submitted). Both go back to their start values when the answers are reset.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz.js"></script>
<webwriter-quiz></webwriter-quiz>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-quiz.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-quiz.js"></script>
<webwriter-quiz></webwriter-quiz>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterQuiz.convertFrom` | `object` | - | `{ ".gift": "importGift", ul: "loadList", ol: "loadList" }` | ✗ |
| `WebwriterQuiz.convertTo` | `object` | - | `{ ".gift": "exportGift" }` | ✗ |
| `WebwriterQuiz.options` | `Record<string, Declared<OptionDeclaration>>` | - | `{ detailedFeedback: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Show detailed feedback") }, confirmSubmit: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before submitting") }, confirmReset: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Require confirmation before resetting") }, hideQuestionTitle: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide question titles") }, hidePoints: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Hide points") }, }` | ✗ |
| `detailedFeedback` (`detailed-feedback`) | `boolean` | Whether learners see per-answer feedback and the solution after submitting. | `false` | ✓ |
| `confirmSubmit` (`confirm-submit`) | `boolean` | Whether learners have to confirm a dialog before submitting. | `false` | ✓ |
| `confirmReset` (`confirm-reset`) | `boolean` | Whether learners have to confirm a dialog before resetting. | `false` | ✓ |
| `hideQuestionTitle` (`hide-question-title`) | `boolean` | Whether the generated question titles are hidden. | `false` | ✓ |
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
| result | The total score with its progress bar, shown after submitting. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public methods, slots, or custom CSS properties.*


## `WebwriterQuizHint` (`<webwriter-quiz-hint>`)
A generic hint element that can be used inside a variety of elements that
explicitly mention it in their documentation, such as quiz tasks and choice items.

Unless otherwise specified, it should be assigned to the `hint` slot of its
parent element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz-hint.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz-hint.js"></script>
<webwriter-quiz-hint></webwriter-quiz-hint>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-quiz-hint.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-quiz-hint.js"></script>
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
Formatted feedback authored in the feedback slot of a question.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz-feedback.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-quiz-feedback.js"></script>
<webwriter-quiz-feedback></webwriter-quiz-feedback>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-quiz-feedback.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-quiz-feedback.js"></script>
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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-true-false.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-true-false.js"></script>
<webwriter-true-false></webwriter-true-false>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-true-false.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-true-false.js"></script>
<webwriter-true-false></webwriter-true-false>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `solution` (`solution`) | `TrueFalse` | The value counting as correct.<br><br>- `true`: The statement is true.<br>- `false`: The statement is false. | `"true"` | ✓ |
| `WebwriterTrueFalse.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ moveQuestionUp: { label: (widget: { msg: MsgFn }) => widget.msg("Move question up") }, moveQuestionDown: { label: (widget: { msg: MsgFn }) => widget.msg("Move question down") }, deleteQuestion: { label: (widget: { msg: MsgFn }) => widget.msg("Delete question"), intent: "danger" as const }, }` | ✗ |
| `WebwriterTrueFalse.options` | `object` | - | `{ points: { type: Number, label: (widget: { msg: MsgFn }) => widget.msg("Points") }, }` | ✗ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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

Conversion: the options can be converted to a `ul` (the solution is not carried over).

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-choice.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-choice.js"></script>
<webwriter-choice></webwriter-choice>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-choice.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-choice.js"></script>
<webwriter-choice></webwriter-choice>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterChoice.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterChoice.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") }, }` | ✗ |
| `WebwriterChoice.convertTo` | `object` | - | `{ ul: "toList" }` | ✗ |
| `WebwriterChoice.options` | `object` | - | `{ ...WebwriterTask.options, "mode": { type: "select", options: [ { value: "single", label: (widget: { msg: MsgFn }) => widget.msg("Single Choice") }, { value: "multiple", label: (widget: { msg: MsgFn }) => widget.msg("Multiple Choice") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Mode"), }, "layout": { type: "select", options: [ { value: "list", label: (widget: { msg: MsgFn }) => widget.msg("List") }, { value: "tiles", label: (widget: { msg: MsgFn }) => widget.msg("Tiles") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Layout"), }, randomizeOrder: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Randomize Order") }, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Pass/Fail") }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial Credit") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, }` | ✗ |
| `mode` (`mode`) | `ChoiceMode` | How many options learners may select.<br><br>- `single`: Exactly one option can be selected.<br>- `multiple`: Any number of options can be selected. | `"single"` | ✓ |
| `layout` (`layout`) | `ChoiceLayout` | How the options are arranged.<br><br>- `list`: One option per row.<br>- `tiles`: A responsive grid of equally sized tiles. | `"list"` | ✓ |
| `gradingMethod` (`grading-method`) | `ChoiceGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct options are selected.<br>- `partial`: Correct selections earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `ChoiceSolution` | The options counting as correct, as a map from option ID to whether it has to be selected.<br>It is obfuscated in the markup so that learners cannot read it directly. | `{}` | ✓ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebwriterChoiceItem` (`<webwriter-choice-item>`)
A single option of a `<webwriter-choice>`.

It must be assigned to the default slot of its parent element. An optional
`<webwriter-quiz-hint>` may be assigned to its `hint` slot.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-choice-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-choice-item.js"></script>
<webwriter-choice-item></webwriter-choice-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-choice-item.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-choice-item.js"></script>
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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-order.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-order.js"></script>
<webwriter-order></webwriter-order>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-order.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-order.js"></script>
<webwriter-order></webwriter-order>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterOrder.shadowRootOptions` | `ShadowRootInit` | - | `{ ...WebwriterTask.shadowRootOptions, slotAssignment: "manual" }` | ✗ |
| `WebwriterOrder.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ ...WebwriterTask.actions, addOption: { label: (widget: { msg: MsgFn }) => widget.msg("Add Option") }, }` | ✗ |
| `WebwriterOrder.convertTo` | `object` | - | `{ ol: "toList" }` | ✗ |
| `WebwriterOrder.options` | `object` | - | `{ ...WebwriterTask.options, "layout": { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Layout"), options: [ { value: "list", label: (widget: { msg: MsgFn }) => widget.msg("List") }, { value: "tiles", label: (widget: { msg: MsgFn }) => widget.msg("Tiles") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The layout variant to use."), }, "direction": { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Direction"), options: [ { value: "ascending", label: (widget: { msg: MsgFn }) => widget.msg("Ascending") }, { value: "descending", label: (widget: { msg: MsgFn }) => widget.msg("Descending") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The order direction to use."), }, numberingStyle: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Numbering"), options: [ { value: "none", label: (widget: { msg: MsgFn }) => widget.msg("None") }, { value: "numeric", label: (widget: { msg: MsgFn }) => widget.msg("Numeric") }, { value: "alphabetic", label: (widget: { msg: MsgFn }) => widget.msg("Alphabetic") }, { value: "roman", label: (widget: { msg: MsgFn }) => widget.msg("Roman") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The numbering style to use."), }, gradingMethod: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Grading"), options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Pass/Fail") }, { value: "partial-position", label: (widget: { msg: MsgFn }) => widget.msg("Partial (Position)") }, { value: "partial-sequence", label: (widget: { msg: MsgFn }) => widget.msg("Partial (Sequence)") }, ], description: (widget: { msg: MsgFn }) => widget.msg("The grading method to use."), }, }` | ✗ |
| `layout` (`layout`) | `OrderLayout` | How the items are arranged.<br><br>- `list`: One item per row.<br>- `tiles`: A responsive grid of equally sized tiles. | `"list"` | ✓ |
| `direction` (`direction`) | `OrderDirection` | The direction in which the items are numbered.<br><br>- `ascending`: The first item carries the lowest position.<br>- `descending`: The first item carries the highest position. | `"ascending"` | ✓ |
| `numberingStyle` (`numbering-style`) | `OrderNumberingStyle` | How the position of each item is labelled.<br><br>- `none`: No position is shown.<br>- `numeric`: Arabic numerals (1., 2., 3., ...).<br>- `alphabetic`: Latin letters (A., B., C., ...).<br>- `roman`: Roman numerals (I., II., III., ...). | `"numeric"` | ✓ |
| `gradingMethod` (`grading-method`) | `OrderGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if every item is in its correct position.<br>- `partial-position`: Credit for each item in its correct position.<br>- `partial-sequence`: Credit for each pair of adjacent items in the correct order. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `OrderSolution` | The IDs of the items in their correct order. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
| `feedback` (`feedback`) | `string` | - | `""` | ✓ |
| `localize` | - | - | - | ✗ |

*Fields including [properties](https://developer.mozilla.org/en-US/docs/Glossary/Property/JavaScript) and [attributes](https://developer.mozilla.org/en-US/docs/Glossary/Attribute) define the current state of the widget and offer customization options.*

## Methods
| Name | Description | Parameters |
| :--: | :---------: | :-------: |
| `checkValidity` | - | -
| `reset` | - | -
| `checkAnswer` | - | `_detailedFeedback: boolean`

*[Methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Method_definitions) allow programmatic access to the widget.*

## Events
| Name | Description |
| :--: | :---------: |
| optionschange | - |

*[Events](https://developer.mozilla.org/en-US/docs/Web/Events) are dispatched by the widget after certain triggers.*

## CSS parts
| Name | Description |
| :--: | :---------: |
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-order-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-order-item.js"></script>
<webwriter-order-item></webwriter-order-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-order-item.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-order-item.js"></script>
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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-speech.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-speech.js"></script>
<webwriter-speech></webwriter-speech>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-speech.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-speech.js"></script>
<webwriter-speech></webwriter-speech>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `src` (`src`) | `string \| null` | An existing recording URL saved in authored HTML. | `null` | ✓ |
| `WebwriterSpeech.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ moveQuestionUp: { label: (widget: { msg: MsgFn }) => widget.msg("Move question up") }, moveQuestionDown: { label: (widget: { msg: MsgFn }) => widget.msg("Move question down") }, deleteQuestion: { label: (widget: { msg: MsgFn }) => widget.msg("Delete question"), intent: "danger" as const }, }` | ✗ |
| `WebwriterSpeech.options` | `object` | - | `{ points: { type: Number, label: (widget: { msg: MsgFn }) => widget.msg("Points") }, }` | ✗ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-text.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-text.js"></script>
<webwriter-text></webwriter-text>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-text.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-text.js"></script>
<webwriter-text></webwriter-text>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterText.options` | `object` | - | `{ ...WebwriterTask.options, type: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Type"), options: [ { value: "long-text", label: (widget: { msg: MsgFn }) => widget.msg("Long Text") }, { value: "text", label: (widget: { msg: MsgFn }) => widget.msg("Short Text") }, { value: "number", label: (widget: { msg: MsgFn }) => widget.msg("Number") }, { value: "date", label: (widget: { msg: MsgFn }) => widget.msg("Date") }, { value: "time", label: (widget: { msg: MsgFn }) => widget.msg("Time") }, { value: "datetime-local", label: (widget: { msg: MsgFn }) => widget.msg("Date & Time") }, ], }, placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, freeText: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Free answer") }, ignoreCase: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Ignore capitalization") }, correctMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for correct solution") }, wrongMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for wrong solution") }, }` | ✗ |
| `WebwriterText.options` | `object` | - | `{ ...WebwriterTask.options, type: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Type"), options: [ { value: "long-text", label: (widget: { msg: MsgFn }) => widget.msg("Long Text") }, { value: "text", label: (widget: { msg: MsgFn }) => widget.msg("Short Text") }, { value: "number", label: (widget: { msg: MsgFn }) => widget.msg("Number") }, { value: "date", label: (widget: { msg: MsgFn }) => widget.msg("Date") }, { value: "time", label: (widget: { msg: MsgFn }) => widget.msg("Time") }, { value: "datetime-local", label: (widget: { msg: MsgFn }) => widget.msg("Date & Time") }, ], }, placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, freeText: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Free answer") }, ignoreCase: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Ignore capitalization") }, correctMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for correct solution") }, wrongMessage: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Message for wrong solution") }, }` | ✗ |
| `type` (`type`) | `TextType` | The kind of input field learners answer in.<br><br>- `long-text`: A multi-line text area.<br>- `text`: A single-line text field.<br>- `number`: A number field.<br>- `date`: A date picker.<br>- `time`: A time picker.<br>- `datetime-local`: A combined date and time picker. | `"long-text"` | ✓ |
| `placeholder` (`placeholder`) | `string` | The placeholder shown while the field is empty. | `""` | ✓ |
| `freeText` (`free-text`) | `boolean` | Whether any non-empty answer counts as correct, without comparing it to the solution. | `false` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether the answer is compared to the solution case-insensitively. | `false` | ✓ |
| `correctMessage` (`correct-message`) | `string` | The feedback shown after submitting if the answer is correct. | `""` | ✓ |
| `wrongMessage` (`wrong-message`) | `string` | The feedback shown after submitting if the answer is wrong. | `""` | ✓ |
| `solution` (`solution`) | `string` | The value counting as correct. It is obfuscated in the markup so that learners cannot read it directly. | `""` | ✓ |
| `WebwriterText.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ moveQuestionUp: { label: (widget: { msg: MsgFn }) => widget.msg("Move question up") }, moveQuestionDown: { label: (widget: { msg: MsgFn }) => widget.msg("Move question down") }, deleteQuestion: { label: (widget: { msg: MsgFn }) => widget.msg("Delete question"), intent: "danger" as const }, }` | ✗ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


## `WebWriterMark` (`<webwriter-mark>`)
An answer where learners mark the words of a text that fit the question.

Put the text to mark in the default slot.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-mark.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-mark.js"></script>
<webwriter-mark></webwriter-mark>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-mark.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-mark.js"></script>
<webwriter-mark></webwriter-mark>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebWriterMark.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ ...WebwriterTask.actions, toggleMarkingAtPosition: { label: (widget: { msg: MsgFn }) => widget.msg("Toggle Marking at Position") }, }` | ✗ |
| `WebWriterMark.options` | `object` | - | `{ ...WebwriterTask.options, gradingMethod: { type: "select", options: [ { value: "pass-fail", label: (widget: { msg: MsgFn }) => widget.msg("Pass/Fail") }, { value: "partial", label: (widget: { msg: MsgFn }) => widget.msg("Partial Credit") }, ], label: (widget: { msg: MsgFn }) => widget.msg("Grading Method"), }, }` | ✗ |
| `gradingMethod` (`grading-method`) | `MarkGradingMethod` | How the score of this answer is calculated.<br><br>- `pass-fail`: Full score only if exactly the correct words are marked.<br>- `partial`: Correctly marked words earn credit, wrong ones subtract from it. | `"pass-fail"` | ✓ |
| `solution` (`solution`) | `number[]` | The indices of the word-like segments counting as correct. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-gap.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-gap.js"></script>
<webwriter-gap></webwriter-gap>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-gap.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-gap.js"></script>
<webwriter-gap></webwriter-gap>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterGap.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ ...WebwriterTask.actions, insertGapAtSelection: { label: (widget: { msg: MsgFn }) => widget.msg("Insert gap at selection") }, }` | ✗ |
| `WebwriterGap.options` | `object` | - | `{ ...WebwriterTask.options, mode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Mode"), options: [ { value: "input", label: (widget: { msg: MsgFn }) => widget.msg("Freeform input") }, { value: "drag-and-drop", label: (widget: { msg: MsgFn }) => widget.msg("Drag and drop") }, ], }, ignoreCase: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Ignore case") }, }` | ✗ |
| `WebwriterGap.options` | `object` | - | `{ ...WebwriterTask.options, mode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Mode"), options: [ { value: "input", label: (widget: { msg: MsgFn }) => widget.msg("Freeform input") }, { value: "drag-and-drop", label: (widget: { msg: MsgFn }) => widget.msg("Drag and drop") }, ], }, ignoreCase: { type: "boolean", label: (widget: { msg: MsgFn }) => widget.msg("Ignore case") }, }` | ✗ |
| `mode` (`mode`) | `GapMode` | How learners fill the gaps.<br><br>- `input`: Each gap is a text field learners type into.<br>- `drag-and-drop`: The gaps are filled from a shared pool of draggable answers. | `"input"` | ✓ |
| `ignoreCase` (`ignore-case`) | `boolean` | Whether answers are compared to the solution case-insensitively. Only applies in `input` mode. | `false` | ✓ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-gap-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-gap-item.js"></script>
<webwriter-gap-item></webwriter-gap-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-gap-item.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-gap-item.js"></script>
<webwriter-gap-item></webwriter-gap-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterGapItem.options` | `Record<string, Declared<OptionDeclaration>>` | - | `{ placeholder: { type: "string", label: (widget: { msg: MsgFn }) => widget.msg("Placeholder") }, }` | ✗ |
| `options` | - | A placeholder only applies to freeform input. | - | ✗ |
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

The items must be `<webwriter-pairing-item>` children of this element.

### Usage

Use with a CDN (e.g. [jsdelivr](https://jsdelivr.com)):
```html
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-pairing.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-pairing.js"></script>
<webwriter-pairing></webwriter-pairing>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-pairing.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-pairing.js"></script>
<webwriter-pairing></webwriter-pairing>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterPairing.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ ...WebwriterTask.actions, addPair: { label: (widget: { msg: MsgFn }) => widget.msg("Add Pair") }, }` | ✗ |
| `WebwriterPairing.options` | `object` | - | `{ ...WebwriterTask.options, mode: { type: "select", label: (widget: { msg: MsgFn }) => widget.msg("Mode"), options: [ { value: "pairing", label: (widget: { msg: MsgFn }) => widget.msg("Pairing") }, { value: "memory", label: (widget: { msg: MsgFn }) => widget.msg("Memory") }, ], }, }` | ✗ |
| `mode` (`mode`) | `PairingMode` | How learners match the items.<br><br>- `pairing`: All items are visible and learners drag them together.<br>- `memory`: The items are face down and learners uncover two at a time. | `"pairing"` | ✓ |
| `solution` (`solution`) | `[string, string][]` | The pairs counting as correct, as tuples of the two item IDs. It is obfuscated in the markup so that learners cannot read it directly. | `[]` | ✓ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

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
<link href="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-pairing-item.css" rel="stylesheet">
<script type="module" src="https://cdn.jsdelivr.net/npm/@webwriter/quiz/widgets/webwriter-pairing-item.js"></script>
<webwriter-pairing-item></webwriter-pairing-item>
```

Or use with a bundler (e.g. [Vite](https://vite.dev)):

```
npm install @webwriter/quiz
```

```html
<link href="@webwriter/quiz/widgets/webwriter-pairing-item.css" rel="stylesheet">
<script type="module" src="@webwriter/quiz/widgets/webwriter-pairing-item.js"></script>
<webwriter-pairing-item></webwriter-pairing-item>
```

## Fields
| Name (Attribute Name) | Type | Description | Default | Reflects |
| :-------------------: | :--: | :---------: | :-----: | :------: |
| `WebwriterPairing.actions` | `object` | Only questions inside a quiz can be moved or deleted from the drawer. | `{ moveQuestionUp: { label: (widget: { msg: MsgFn }) => widget.msg("Move question up") }, moveQuestionDown: { label: (widget: { msg: MsgFn }) => widget.msg("Move question down") }, deleteQuestion: { label: (widget: { msg: MsgFn }) => widget.msg("Delete question"), intent: "danger" as const }, }` | ✗ |
| `WebwriterPairing.options` | `object` | - | `{ points: { type: Number, label: (widget: { msg: MsgFn }) => widget.msg("Points") }, }` | ✗ |
| `points` (`points`) | `number` | The maximum score for this question. | `1` | ✓ |
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
| title | The generated question title ("Question 1"). |
| prompt | The prompt of the question. |
| answer | The area with the answer controls. |
| feedback | The feedback block shown after submitting. |

*[CSS parts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_shadow_parts) allow freely styling internals of the widget with CSS.*

## Editing config
| Name | Value |
| :--: | :---------: |


*The [editing config](https://webwriter.app/docs/packages/configuring/#editingconfig) defines how explorable authoring tools such as [WebWriter](https://webwriter.app) treat the widget.*

*No public slots, or custom CSS properties.*


---
*Generated with @webwriter/build@1.14.0*