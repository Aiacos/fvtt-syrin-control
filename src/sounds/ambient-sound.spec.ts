import { Mocked, mocked } from '@/mock';
import { AmbientSound, SyrinAmbientSoundFlags } from './ambient-sound';

describe('Ambient sound controller', () => {
	let mock: Mocked;
	let flags: SyrinAmbientSoundFlags;

	beforeEach(() => {
		mock = mocked();
		mock.game.isGM = jest.fn(() => false);
		mock.game.userId = jest.fn(() => 'frondeus');
		mock.raw.getState = jest.fn(() => 'active');

		flags = {
			type: 'mood',
			mood: 4321
		};
	});

	it('does nothing when player is not active', async () => {
		const provider = {
			key: () => 'syrinscape:1.wav',
			ctx: () => mock.ctx
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		mock.raw.getState = jest.fn(() => 'inactive');

		await sound.sync(true, 1);

		expect(mock.game.socket?.executeAsGM).not.toBeCalled();
	});

	it('also does nothing when id is unknown', async () => {
		const provider = {
			key: () => null,
			ctx: () => mock.ctx
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		await sound.sync(true, 1);

		expect(mock.game.socket?.executeAsGM).not.toBeCalled();
	});

	it('stops sound when is not audible', async () => {
		const spy = jest.spyOn(mock.ctx.syrin, 'stopAmbientSound');
		const provider = {
			key: () => 'syrinscape:1.wav',
			ctx: () => mock.ctx
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		await sound.sync(false, 1);

		expect(spy).toBeCalledWith('syrinscape:1.wav', 'frondeus');
	});

	it('plays mood when audible', async () => {
		const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
		const provider = {
			key: () => 'syrinscape:1.wav',
			ctx: () => mock.ctx
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		await sound.sync(true, 1);

		expect(spy).toBeCalledWith('syrinscape:1.wav', {
			kind: 'mood',
			volume: 1,
			userId: 'frondeus',
			moodId: 4321
		});
	});

	it('plays element when audible', async () => {
		const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
		const provider = {
			key: () => 'syrinscape:1.wav',
			ctx: () => mock.ctx
		};
		flags = {
			type: 'element',
			element: 4321
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		await sound.sync(true, 1);

		expect(spy).toBeCalledWith('syrinscape:1.wav', {
			kind: 'element',
			volume: 1,
			userId: 'frondeus',
			elementId: 4321
		});
	});

	it('returns empty user when is not present', async () => {
		mock.game.userId = jest.fn(() => null);
		const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
		const provider = {
			key: () => 'syrinscape:1.wav',
			ctx: () => mock.ctx
		};
		const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

		await sound.sync(true, 1);

		expect(spy).toBeCalledWith('syrinscape:1.wav', {
			kind: 'mood',
			volume: 1,
			userId: '',
			moodId: 4321
		});
	});

	describe('fade', () => {
		const provider = () => ({ key: () => 'syrinscape:1.wav', ctx: () => mock.ctx });

		it('reports the volume Foundry computes from the distance, the closer the louder', async () => {
			const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider());

			await sound.sync(true, 0.35);

			expect(spy).toBeCalledWith('syrinscape:1.wav', expect.objectContaining({ volume: 0.35 }));
		});

		it('does not report again a volume that did not change', async () => {
			const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider());

			await sound.sync(true, 0.35);
			await sound.sync(true, 0.352);
			await sound.sync(true, 0.6);

			expect(spy).toBeCalledTimes(2);
		});

		it('reports again after being stopped', async () => {
			const spy = jest.spyOn(mock.ctx.syrin, 'playAmbientSound');
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider());

			await sound.sync(true, 0.35);
			await sound.sync(false, 0);
			await sound.sync(true, 0.35);

			expect(spy).toBeCalledTimes(2);
		});

		it('fades the local volume of this client', async () => {
			const spy = jest.spyOn(mock.ctx.syrin, 'setLocalAmbient');
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider());

			await sound.sync(true, 0.35);
			await sound.sync(false, 0);

			expect(spy).toHaveBeenNthCalledWith(1, 'syrinscape:1.wav', { moodId: 4321, volume: 0.35 });
			expect(spy).toHaveBeenNthCalledWith(2, 'syrinscape:1.wav', undefined);
		});

		it('keeps the local volume up to date while the Syrinscape player starts', async () => {
			mock.raw.getState = jest.fn(() => 'inactive');
			const spy = jest.spyOn(mock.ctx.syrin, 'setLocalAmbient');
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider());

			await sound.sync(true, 0.35);

			expect(spy).toBeCalledWith('syrinscape:1.wav', { moodId: 4321, volume: 0.35 });
		});
	});

	describe('bugs', () => {
		it('can be flattened', () => {
			const provider = {
				key: () => 'syrinscape:1.wav',
				ctx: () => mock.ctx
			};
			const sound = new AmbientSound({ flags: { syrinscape: flags } }, provider);

			const flattened = foundry.utils.flattenObject(sound);

			expect(flattened).toMatchSnapshot();
		});
	});
});
