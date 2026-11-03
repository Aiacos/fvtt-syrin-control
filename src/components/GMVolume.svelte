<script lang="ts">
	import Context from '@/services/context';
	import VolumeSlider from './VolumeSlider.svelte';

	// Context
	const ctx = Context();

	// Params & State
	let globalVolume = ctx.stores.globalVolume;
	let oneshotsVolume = ctx.stores.oneshotsVolume;

	// Event handlers - the stores and settings are on a 0-100 scale, Syrinscape on 0-1.
	function onGlobalVolumeChange(event: CustomEvent<number>) {
		globalVolume.set(event.detail);
		ctx.api.changeMoodVolume(event.detail / 100);
	}
	function onOneshotsVolumeChange(event: CustomEvent<number>) {
		oneshotsVolume.set(event.detail);
		ctx.api.changeOneShotVolume(event.detail / 100);
	}
</script>

<VolumeSlider
	name="syrinscapeGlobalVolume"
	title={ctx.game.localize('playlist.globalVolume')}
	volume={$globalVolume}
	on:change={onGlobalVolumeChange}
/>
<VolumeSlider
	name="oneShotsVolume"
	title={ctx.game.localize('playlist.oneShotsVolume')}
	volume={$oneshotsVolume}
	on:change={onOneshotsVolumeChange}
/>
