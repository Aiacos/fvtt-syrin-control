/**
 * Test double of Foundry's `<range-picker>` (foundry.applications.elements.HTMLRangePickerElement, V13+),
 * reproducing the parts of its contract the module depends on:
 * - min/max/step are read once, in the constructor (from the options, else from the attributes);
 * - the value is rounded to the step and clamped to [min, max];
 * - setting `value` dispatches `input` and `change`, programmatic sets included;
 * - the inner range input is built when the element is connected.
 */
export class FakeRangePicker extends HTMLElement {
	min: number;
	max: number;
	step: number | undefined;
	private current = 0;
	range: HTMLInputElement | undefined;

	constructor({ value, step, min, max }: { value?: any; step?: any; min?: any; max?: any } = {}) {
		super();
		this.min = Number(min ?? this.getAttribute('min'));
		if (isNaN(this.min)) this.min = 0;
		this.max = Number(max ?? this.getAttribute('max'));
		if (isNaN(this.max)) this.max = 1;
		this.step = Number(step ?? this.getAttribute('step')) || undefined;
		this.setValue(value ?? this.getAttribute('value'));
	}

	static create(config: { name: string; value: number; min: number; max: number; step?: number }) {
		const picker = new FakeRangePicker(config);
		picker.setAttribute('name', config.name);
		return picker;
	}

	get name() {
		return this.getAttribute('name');
	}

	set name(value) {
		this.setAttribute('name', value ?? '');
	}

	get value(): number {
		return this.current;
	}

	set value(value: number) {
		this.setValue(value);
		this.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
		this.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		this.refresh();
	}

	connectedCallback() {
		const range = document.createElement('input');
		range.type = 'range';
		range.min = String(this.min);
		range.max = String(this.max);
		range.step = String(this.step ?? 0.1);
		range.addEventListener('change', (event) => {
			event.stopPropagation();
			this.value = range.valueAsNumber;
		});
		this.range = range;
		this.replaceChildren(range);
		this.refresh();
	}

	/** Simulates the user dragging the slider and releasing it. */
	drag(value: number) {
		this.range!.value = String(value);
		this.range!.dispatchEvent(new Event('change', { bubbles: true }));
	}

	private setValue(value: unknown) {
		let v = Number(value);
		if (this.step !== undefined) {
			v = this.min + Math.round((v - this.min) / this.step) * this.step;
		}
		this.current = Math.min(Math.max(v, this.min), this.max);
	}

	private refresh() {
		if (this.range !== undefined) {
			this.range.value = String(this.current);
		}
	}
}

if (customElements.get('range-picker') === undefined) {
	customElements.define('range-picker', FakeRangePicker);
}
