<script lang="ts">
	import Context from '@/services/context';
	import type { SyrinAmbientSoundFlags } from '@/sounds/ambient-sound';
	import type { Soundsets } from '@/models/store';
	import { hashPath } from '@/utils';

	// Context
	const ctx = Context();

	// Params & State
	interface Darkness {
		min: number;
		max: number;
	}

	export let x: number;
	export let y: number;
	export let radius: number;
	export let walls: boolean;
	export let darkness: Darkness;
	// The fade by distance: the volume at the center of the area, and whether it fades out towards the edge.
	export let volume: number = 0.5;
	export let easing: boolean = true;

	export let flags: SyrinAmbientSoundFlags;
	export let create: boolean;

	$: hashedPath = hashPath(flags.type, (flags as any)[flags.type]);

	let soundsets = ctx.stores.soundsets;
	let soundsetName: string = '...';
	let ambientName: string = '...';
	let style = '';
	let class_ = 'inner syrin-config';

	const reactiveAmbientSoundName = async (flags: SyrinAmbientSoundFlags, soundsets: Soundsets) => {
		if (flags.type === 'mood') {
			const soundset = await ctx.stores.hydrateSoundsetInner(
				(await ctx.api.soundsetIdForMood(Number(flags.mood))) ?? '',
				soundsets
			);

			if (soundset === undefined) {
				return;
			}

			const mood = soundset.moods[flags.mood];
			ambientName = mood.name;
			soundsetName = soundset.name;
			if (soundset.artworkUrl !== undefined) {
				style = `background-image: linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.85)), url('${soundset.artworkUrl}');`;
				class_ = 'inner syrin-config syrin-cover';
			}
		}
	};

	$: reactiveAmbientSoundName(flags, $soundsets);
</script>

<div class={class_} {style} data-test="syrin-ambient-sound-config">
	<div>
		<p class="notes">
			{ctx.game.localizeCore('SOUND.ConfigTitle')}
		</p>

		<div class="form-group">
			<label for="">{ctx.game.localize('config.soundset')}</label>
			<input
				type="text"
				data-test="syrin-soundset-name"
				disabled
				value={soundsetName}
				title={soundsetName}
			/>
		</div>
		<div class="form-group">
			<label for="">
				{ctx.game.localize('config.' + flags.type)}
			</label>
			<div class="form-fields">
				<input
					type="text"
					disabled
					data-test="syrin-ambient-name"
					value={ambientName}
					title={ambientName}
				/>
			</div>
		</div>
		<div class="form-group">
			<label for=""
				>{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.x.label')}
				<span class="units">({ctx.game.localizeCore('MEASUREMENT.Pixels')})</span></label
			>
			<div class="form-fields">
				<input type="number" data-test="syrin-x" name="x" step="1" bind:value={x} />
			</div>
		</div>
		<div class="form-group">
			<label for=""
				>{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.y.label')}
				<span class="units">({ctx.game.localizeCore('MEASUREMENT.Pixels')})</span></label
			>
			<div class="form-fields">
				<input type="number" data-test="syrin-y" name="y" step="1" bind:value={y} />
			</div>
		</div>
		<div class="form-group">
			<label for="">{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.radius.label')}</label>
			<div class="form-fields">
				<input
					type="number"
					data-test="syrin-radius"
					name="radius"
					step="any"
					bind:value={radius}
				/>
			</div>
		</div>
		<div class="form-group">
			<label for="">{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.volume.label')}</label>
			<div class="form-fields">
				<input
					type="range"
					data-test="syrin-volume"
					name="volume"
					min="0"
					max="1"
					step="0.05"
					bind:value={volume}
				/>
				<span class="range-value">{Math.round(volume * 100)}%</span>
			</div>
			<p class="hint">
				{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.volume.hint')}
			</p>
		</div>
		<div class="form-group">
			<label for="">{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.easing.label')}</label>
			<input type="checkbox" data-test="syrin-easing" name="easing" bind:checked={easing} />
			<p class="hint">
				{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.easing.hint')}
			</p>
		</div>
		<div class="form-group">
			<label for="">{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.walls.label')}</label>
			<input type="checkbox" data-test="syrin-walls" name="walls" bind:checked={walls} />
			<p class="hint">
				{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.walls.hint')}
			</p>
		</div>
		<div class="form-group">
			<label for="">{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.darkness.label')}</label>
			<div class="form-fields">
				<label for="darkness.min"
					>{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.darkness.min.label')}</label
				>
				<input
					type="number"
					data-test="syrin-darkness-min"
					name="darkness.min"
					value={darkness.min}
					min="0"
					max="1"
					step="any"
					placeholder="0"
				/>
				<label for="darkness.max"
					>{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.darkness.max.label')}</label
				>
				<input
					type="number"
					data-test="syrin-darkness-max"
					name="darkness.max"
					value={darkness.max}
					min="0"
					max="1"
					step="any"
					placeholder="1"
				/>
			</div>
			<p class="hint">
				{ctx.game.localizeCore('AMBIENT_SOUND.FIELDS.darkness.hint')}
			</p>
		</div>
	</div>
	<input type="hidden" data-test="syrin-path" name="path" value={hashedPath} />
	<input
		type="hidden"
		data-test="syrin-flags-type"
		name="flags.syrinscape.type"
		value={flags.type}
	/>
	{#if flags.type === 'mood'}
		<input
			type="hidden"
			data-test="syrin-flags-mood"
			name="flags.syrinscape.mood"
			value={flags.mood}
		/>
	{/if}
	<div>
		<div data-test="syrin-controlled">
			{ctx.game.localize('config.controlled', { name: ctx.game.localize('config.ambientSound') })}
		</div>
		<button type="submit">
			<i class="far fa-save" />
			{#if create}
				{ctx.game.localizeCore('AMBIENT_SOUND.ACTIONS.CREATE')}
			{:else}
				{ctx.game.localizeCore('AMBIENT_SOUND.ACTIONS.UPDATE')}
			{/if}
		</button>
	</div>
</div>

<style>
	div {
		padding: 2px;
	}
</style>
