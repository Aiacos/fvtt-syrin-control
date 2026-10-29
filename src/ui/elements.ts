import ElementsComponent from '@/components/Elements.svelte';
import { Context } from '@/services/context';

export function openElements(ctx: Context) {
	ctx.stores.elementsApp.update((store) => {
		if (!store.app) {
			store.app = ctx.game.createDialog(ctx, ElementsComponent, {
				title: 'Syrinscape: Elements',
				width: 790
			});
		}
		store.app.render({ force: true });
		return store;
	});
}
