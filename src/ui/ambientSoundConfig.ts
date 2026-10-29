import { Context } from '@/services/context';
import AmbientSoundConfigComponent from '@/components/config/ambient-sound/index.svelte';
import { prepareConfigForm } from './config';

export interface AmbientSoundDetails {
	data: {
		x: number;
		y: number;
		radius: number;
		walls: boolean;
		darkness: {
			min: number;
			max: number;
		};
		flags: any;
		_id: null | string;
	};
}

export async function onAmbientSoundConfig(
	ctx: Context,
	window: HTMLElement,
	details: AmbientSoundDetails
) {
	if (details.data.flags?.syrinscape === undefined) {
		return;
	}

	const form = prepareConfigForm(window);
	if (form === undefined) {
		return;
	}

	let component = new AmbientSoundConfigComponent({
		target: form,
		props: {
			x: details.data.x,
			y: details.data.y,
			radius: details.data.radius,
			walls: details.data.walls,
			darkness: details.data.darkness,
			flags: details.data.flags.syrinscape,
			create: details.data._id == null
		},
		context: ctx.map()
	});

	ctx.utils.trace('on AmbientSound config', { details, window, form, component });
}
