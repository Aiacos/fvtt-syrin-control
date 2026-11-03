<script lang="ts">
	import Context from '@/services/context';
	import VolumeSlider from './VolumeSlider.svelte';

	// Context
	const ctx = Context();

	// Params & State
	let volume = ctx.stores.playerVolume;

	// Event handlers - the store and setting are on a 0-100 scale, Syrinscape on 0-1.
	function onVolumeChange(event: CustomEvent<number>) {
		volume.set(event.detail);
		ctx.api.changePlayerVolume(event.detail / 100);
	}
</script>

<VolumeSlider
	name="globalSyrinscapeVolume"
	title="Syrinscape"
	volume={$volume}
	on:change={onVolumeChange}
/>
