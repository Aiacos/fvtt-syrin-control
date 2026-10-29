/**
 * Prepares a document config sheet for being replaced by a Svelte component.
 *
 * In V13+ the sheets are ApplicationV2 - the root element is the `<form>` and `.window-content` lives inside it,
 * so the content itself is the mount target (the submit button rendered by the component still submits the sheet).
 * Older (V1) layouts had the `<form>` nested inside `.window-content`.
 *
 * @returns the emptied element to mount the component into, or `undefined` when the layout is unknown.
 */
export function prepareConfigForm(root: HTMLElement): HTMLElement | undefined {
	const windowContent = root.querySelector<HTMLElement>('.window-content');
	if (windowContent === null) {
		return undefined;
	}
	windowContent.setAttribute('style', 'padding: 0;');

	const form = root.matches('form') ? windowContent : windowContent.querySelector('form');
	if (form === null) {
		return undefined;
	}
	form.replaceChildren();
	return form;
}
