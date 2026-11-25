import { css } from "lit";

/** Keep pointer feedback on the wrapper even when the native control is disabled. */
export const solutionControlStyles = css`
	.solution-unavailable[title] { cursor: not-allowed; }
	.solution-unavailable :is(button, input):disabled {
		cursor: inherit;
		pointer-events: none;
	}
`;
