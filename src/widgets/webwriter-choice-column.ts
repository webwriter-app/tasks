import { customElement } from "lit/decorators.js";
import { ChoiceGridHeader } from "./webwriter-grid-item";

/** An editable column label in a Choice grid. */
@customElement("webwriter-choice-column")
export class WebwriterChoiceColumn extends ChoiceGridHeader {}
