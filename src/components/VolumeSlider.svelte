<script lang="ts">
	// Params & State
	export let volume: number;
	export let title: string;
	export let name: string;

	// V13+ - Same markup as the core volume rows in the playlist directory, so it inherits their styling.
	function onChange(event: Event) {
		volume = Number((event.currentTarget as HTMLInputElement).value);
	}
</script>

<li class="flexrow syrin-volume">
	<label for="">{title}</label>
	<i class="volume-icon fa-fw fa-solid fa-volume-low" inert />
	<range-picker
		class="global-volume-slider"
		{name}
		min="0"
		max="100"
		step="1"
		value={volume}
		aria-label={title}
		on:change={onChange}
		on:change
	/>
</li>
