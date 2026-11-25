import { css, unsafeCSS } from "lit";

const authoredContent = ":not([slot]:not([slot='']), script, template, webwriter-quiz-hint)";
const textContent = "p, h1, h2, h3, h4, h5, h6, hgroup, address, blockquote, pre, ul, ol, menu, dl, a, abbr, b, cite, code, em, i, kbd, mark, q, s, samp, small, span, strong, sub, sup, u, var";
const nonTextContent = `${authoredContent}:not(${textContent})`;

export const itemContentStyles = css`
	::slotted(${unsafeCSS(nonTextContent)}) {
		box-sizing: border-box;
		max-inline-size: 100%;
		margin: 0;
	}

	::slotted(:is(audio, canvas, iframe, img, picture, svg, video)) {
		display: block;
	}

	::slotted(details) {
		inline-size: 100%;
		/* The disclosure already has its own frame. Remove the document theme's outer spacing. */
		margin: 0 !important;
	}

	::slotted(:is(ul, ol, menu, dl)) {
		margin-inline-start: 0 !important;
		padding-inline-start: 0 !important;
		list-style-position: inside;
	}

	/* Let editor media controls shrink inside an item with its own side controls. */
	::slotted(:is(audio, video)) {
		min-inline-size: 0 !important;
	}
`;

export const itemContent = (item: Element | undefined) =>
	item?.querySelector(`:scope > ${authoredContent}`) ?? null;

export const hasNonTextContent = (item: Element | undefined) =>
	itemContent(item)?.matches(nonTextContent) ?? false;

export function itemContentLabel(item: Element | undefined) {
	const content = itemContent(item);
	if (!content) return item?.textContent?.trim() ?? "";
	const image = content instanceof HTMLImageElement ? content : content?.querySelector("img");
	return content.getAttribute("aria-label")?.trim() || content.getAttribute("title")?.trim()
		|| content.textContent?.trim() || image?.alt || "";
}
