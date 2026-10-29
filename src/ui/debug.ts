import DebugComponent from '@/components/Debug.svelte';
import { Context } from '@/services/context';

export function openDebug(ctx: Context) {
	ctx.game
		.createDialog(ctx, DebugComponent, {
			title: 'Debug',
			width: 1024,
			resizable: true
		})
		.render({ force: true });
}
