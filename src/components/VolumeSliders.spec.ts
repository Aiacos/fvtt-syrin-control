import GMVolume from './GMVolume.svelte';
import PlayerVolume from './PlayerVolume.svelte';
import WithSyrinContext from '@/components/WithSyrinContext.svelte';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { Mocked, mocked, mockedGame } from '@/mock';
import { FakeRangePicker } from '../../jest/range-picker';

const VOLUME_SETTINGS = ['playerVolume', 'globalVolume', 'oneshotsVolume'];

/** A game whose volume settings hold `saved` (on the 0-100 scale of the registered settings). */
function gameWithVolumes(saved: Record<string, number>, ready: boolean) {
	const game = mockedGame();
	const getSetting = game.getSetting as jest.Mock;
	const fallback = getSetting.getMockImplementation()!;
	getSetting.mockImplementation((name: string) =>
		VOLUME_SETTINGS.includes(name) ? saved[name] : fallback(name)
	);
	game.isReady = jest.fn(() => ready);
	return game;
}

const slider = (name: string) =>
	document.querySelector<FakeRangePicker>(`range-picker[name="${name}"]`)!;
const playerSlider = () => slider('globalSyrinscapeVolume');
const globalSlider = () => slider('syrinscapeGlobalVolume');
const oneshotsSlider = () => slider('oneShotsVolume');

describe('Volume sliders', () => {
	describe('GM', () => {
		let mock: Mocked;
		beforeEach(() => {
			mock = mocked(gameWithVolumes({ globalVolume: 50, oneshotsVolume: 50 }, true));
			render(WithSyrinContext, { props: { Component: GMVolume, ctx: mock.ctx } });
		});

		it('shows the saved volume on a 0-100 slider', () => {
			for (const picker of [globalSlider(), oneshotsSlider()]) {
				expect(picker.min).toBe(0);
				expect(picker.max).toBe(100);
				expect(picker.step).toBe(1);
				expect(picker.value).toBe(50);
			}
		});

		it('does not write the settings when the sidebar renders', () => {
			expect(mock.game.setSetting).not.toHaveBeenCalled();
			expect(mock.raw.changeMoodVolume).not.toHaveBeenCalled();
			expect(mock.raw.changeOneShotVolume).not.toHaveBeenCalled();
		});

		it('does not let the core playlist directory handle its sliders', () => {
			expect(globalSlider()).not.toHaveClass('global-volume-slider');
			expect(oneshotsSlider()).not.toHaveClass('global-volume-slider');
		});

		it('sends a dragged volume to Syrinscape once, on a 0-1 scale', async () => {
			globalSlider().drag(35);
			oneshotsSlider().drag(80);
			await tick();

			expect(mock.raw.changeMoodVolume).toHaveBeenCalledTimes(1);
			expect((mock.raw.changeMoodVolume as jest.Mock).mock.calls[0][0]).toBeCloseTo(0.35);
			expect(mock.raw.changeOneShotVolume).toHaveBeenCalledTimes(1);
			expect((mock.raw.changeOneShotVolume as jest.Mock).mock.calls[0][0]).toBeCloseTo(0.8);
			expect(mock.game.setSetting).toHaveBeenCalledWith('globalVolume', 35);
			expect(mock.game.setSetting).toHaveBeenCalledWith('oneshotsVolume', 80);
		});

		it('follows a volume changed elsewhere without sending it back', async () => {
			(mock.game.getSetting as jest.Mock).mockImplementation((name: string) =>
				name === 'globalVolume' ? 20 : 50
			);

			mock.ctx.stores.globalVolume.refresh();
			await tick();

			expect(globalSlider().value).toBe(20);
			expect(mock.raw.changeMoodVolume).not.toHaveBeenCalled();
		});
	});

	// Foundry renders the sidebar before `ready`: the sliders mount while the stores still hold their placeholders,
	// then the stores are refreshed with the saved settings.
	describe('at startup', () => {
		it('shows the default 50% until the settings are loaded', () => {
			const mock = mocked(gameWithVolumes({}, false));
			render(WithSyrinContext, { props: { Component: GMVolume, ctx: mock.ctx } });
			render(WithSyrinContext, { props: { Component: PlayerVolume, ctx: mock.ctx } });

			expect(playerSlider().value).toBe(50);
			expect(globalSlider().value).toBe(50);
			expect(oneshotsSlider().value).toBe(50);
		});

		it.each([
			[{ playerVolume: 50, globalVolume: 50, oneshotsVolume: 50 }],
			[{ playerVolume: 73, globalVolume: 12, oneshotsVolume: 100 }]
		])('shows the saved volumes %o and sends nothing to Syrinscape', async (saved) => {
			const game = gameWithVolumes(saved, false);
			const mock = mocked(game);
			render(WithSyrinContext, { props: { Component: GMVolume, ctx: mock.ctx } });
			render(WithSyrinContext, { props: { Component: PlayerVolume, ctx: mock.ctx } });
			await tick();

			game.isReady = jest.fn(() => true);
			mock.ctx.stores.playerVolume.refresh();
			mock.ctx.stores.globalVolume.refresh();
			mock.ctx.stores.oneshotsVolume.refresh();
			await tick();

			expect(playerSlider().value).toBe(saved.playerVolume);
			expect(globalSlider().value).toBe(saved.globalVolume);
			expect(oneshotsSlider().value).toBe(saved.oneshotsVolume);
			expect(mock.raw.changePlayerVolume).not.toHaveBeenCalled();
			expect(mock.raw.changeMoodVolume).not.toHaveBeenCalled();
			expect(mock.raw.changeOneShotVolume).not.toHaveBeenCalled();
			expect(game.setSetting).not.toHaveBeenCalled();
		});
	});

	it('does not send a saved volume that the slider rounds to its step', async () => {
		const game = gameWithVolumes({ globalVolume: 50, oneshotsVolume: 50 }, true);
		const mock = mocked(game);
		render(WithSyrinContext, { props: { Component: GMVolume, ctx: mock.ctx } });

		(game.getSetting as jest.Mock).mockImplementation(() => 12.5);
		mock.ctx.stores.globalVolume.refresh();
		await tick();

		expect(globalSlider().value).toBe(13);
		expect(mock.raw.changeMoodVolume).not.toHaveBeenCalled();
		expect(game.setSetting).not.toHaveBeenCalled();
	});

	describe('Player', () => {
		it('sends a dragged volume to the local player, on a 0-1 scale', async () => {
			const mock = mocked(gameWithVolumes({ playerVolume: 50 }, true));
			render(WithSyrinContext, { props: { Component: PlayerVolume, ctx: mock.ctx } });

			playerSlider().drag(35);
			await tick();

			expect(mock.raw.changePlayerVolume).toHaveBeenCalledTimes(1);
			expect((mock.raw.changePlayerVolume as jest.Mock).mock.calls[0][0]).toBeCloseTo(0.35);
		});
	});
});
