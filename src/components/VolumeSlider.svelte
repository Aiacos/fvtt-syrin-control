<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';

	// Params & State
	export let volume: number;
	export let title: string;
	export let name: string;

	const dispatch = createEventDispatcher();
	let row: HTMLLIElement;
	let picker: any;

	// V13+ - The <range-picker> reads min/max/step in its constructor, before Svelte would set any attribute
	// (it ends up as a 0..0 slider), so it is built with the core factory instead.
	// Its classes must not include `global-volume-slider`: the PlaylistDirectory handles every change event of
	// those as a core volume setting.
	onMount(() => {
		// The core volume rows changed markup across versions: mirror whatever row the core renders next to ours.
		const coreRow = Array.from(row.parentElement?.children ?? []).find(
			(el) => !el.classList.contains('syrin-volume') && el.querySelector('range-picker') !== null
		);
		if (coreRow !== undefined) {
			row.className = `${coreRow.className} syrin-volume`;
		}

		picker = (foundry as any).applications.elements.HTMLRangePickerElement.create({
			name,
			value: volume,
			min: 0,
			max: 100,
			step: 1
		});
		picker.id = `syrin-${name}`;
		picker.setAttribute('aria-label', title);
		picker.addEventListener('change', onChange);
		row.append(picker);
	});

	// Store updates coming from elsewhere (e.g. another client). Setting `value` dispatches a change event,
	// which `onChange` ignores because the value is already the current one.
	$: if (picker !== undefined && picker.value !== volume) {
		picker.value = volume;
	}

	function onChange() {
		const value = Number(picker.value);
		if (value === volume) {
			return;
		}
		volume = value;
		dispatch('change');
	}
</script>

<li class="flexrow syrin-volume" bind:this={row}>
	<label for="syrin-{name}">{title}</label>
	<i class="volume-icon fa-fw fa-solid fa-volume-low" inert />
</li>
