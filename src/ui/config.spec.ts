import { prepareConfigForm } from './config';

describe('Config form preparation', () => {
	it('uses the window content of an ApplicationV2 sheet (V13+)', () => {
		document.body.innerHTML = `
			<form class="application sheet">
				<header class="window-header"></header>
				<section class="window-content"><div class="form-group">Foundry</div></section>
			</form>`;
		const root = document.querySelector<HTMLElement>('form')!;

		const target = prepareConfigForm(root);

		expect(target).toBe(root.querySelector('.window-content'));
		expect(target).toBeEmptyDOMElement();
		expect(target).toHaveAttribute('style', 'padding: 0;');
		expect(root.querySelector('.window-header')).not.toBeNull();
	});

	it('uses the nested form of an Application V1 sheet', () => {
		document.body.innerHTML = `
			<div class="app">
				<section class="window-content"><form><input name="name"></form></section>
			</div>`;
		const root = document.querySelector<HTMLElement>('.app')!;

		const target = prepareConfigForm(root);

		expect(target).toBe(root.querySelector('form'));
		expect(target).toBeEmptyDOMElement();
	});

	it('returns undefined for an unknown layout', () => {
		document.body.innerHTML = `<div class="app"><p>nothing here</p></div>`;
		const root = document.querySelector<HTMLElement>('.app')!;

		expect(prepareConfigForm(root)).toBeUndefined();
		expect(root).toHaveTextContent('nothing here');
	});
});
