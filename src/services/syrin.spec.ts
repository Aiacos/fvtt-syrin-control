import { Mocked, mocked } from '@/mock';
import { SocketCalls } from '@/socket';
import { get } from 'svelte/store';
import { AMBIENT_FADE_OUT_MS, Syrin, SyrinComponent } from './syrin';

describe('Syrin service', () => {
	let mock: Mocked;
	let syrin: Syrin;
	beforeEach(() => {
		mock = mocked();
		syrin = mock.ctx.syrin;
	});

	describe('renderComponent', () => {
		it('mounts each component only once per target', () => {
			const target = document.createElement('ol');
			const con = jest.fn();

			syrin.renderComponent(mock.ctx, SyrinComponent.PlayerVolume, con, target);
			syrin.renderComponent(mock.ctx, SyrinComponent.PlayerVolume, con, target);
			syrin.renderComponent(mock.ctx, SyrinComponent.GMVolume, con, target);

			expect(con).toBeCalledTimes(2);
			expect(target).toHaveAttribute('data-syrin-playervolume');
			expect(target).toHaveAttribute('data-syrin-gmvolume');
		});

		it('mounts again into a re-rendered target', () => {
			const con = jest.fn();

			syrin.renderComponent(mock.ctx, SyrinComponent.Playlist, con, document.createElement('ol'));
			syrin.renderComponent(mock.ctx, SyrinComponent.Playlist, con, document.createElement('ol'));

			expect(con).toBeCalledTimes(2);
		});
	});

	describe('stopAll', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.stopAll();

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(SocketCalls.StopAll);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(mock.game.callHookAll).not.toBeCalled();
		});

		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.stopAll();

			expect(mock.game.callHookAll).toBeCalledWith('moodChange', undefined);
			expect(mock.game.callHookAll).toBeCalledTimes(1);

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});

	describe('setMood', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.setMood(1234);

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(SocketCalls.PlayMood, 1234);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(mock.game.callHookAll).not.toBeCalled();
		});

		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.setMood(1234);

			expect(mock.game.callHookAll).toBeCalledWith('moodChange', 1234);
			expect(mock.game.callHookAll).toBeCalledTimes(1);

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});

	describe('playAmbientSound', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.playAmbientSound('abcd', {
				kind: 'mood',
				volume: 1.0,
				moodId: 1234,
				userId: 'frondeus'
			});

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(
				SocketCalls.PlayAmbient,
				'abcdfrondeus',
				{
					kind: 'mood',
					volume: 1.0,
					moodId: 1234,
					userId: 'frondeus'
				}
			);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(get(mock.ctx.stores.possibleAmbientSounds)).toStrictEqual({});
		});

		jest.useFakeTimers();
		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.playAmbientSound('abcd', {
				kind: 'mood',
				volume: 1.0,
				moodId: 1234,
				userId: 'frondeus'
			});

			jest.runOnlyPendingTimers();

			expect(get(mock.ctx.stores.possibleAmbientSounds)).toEqual({
				abcd: {
					kind: 'mood',
					volume: 1.0,
					moodId: 1234,
					userId: 'frondeus'
				}
			});

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});
	describe('stopAmbientSound', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.stopAmbientSound('abcd', 'frondeus');

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(
				SocketCalls.StopAmbient,
				'abcdfrondeus',
				'frondeus'
			);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(get(mock.ctx.stores.possibleAmbientSounds)).toStrictEqual({});
		});

		jest.useFakeTimers();
		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			mock.ctx.stores.possibleAmbientSounds.set({
				abcd: {
					kind: 'mood',
					volume: 1.0,
					moodId: 1234,
					userId: 'frondeus'
				},
				efgh: {
					kind: 'mood',
					volume: 1.0,
					moodId: 5678,
					userId: 'alice'
				}
			});

			jest.runOnlyPendingTimers();

			syrin.stopAmbientSound('abcd', 'frondeus');

			jest.runOnlyPendingTimers();

			expect(get(mock.ctx.stores.possibleAmbientSounds)).toEqual({
				efgh: {
					kind: 'mood',
					volume: 1.0,
					moodId: 5678,
					userId: 'alice'
				}
			});

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});

	describe('playElement', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.playElement(1234);

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(SocketCalls.PlayElement, 1234);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(mock.raw.playElement).not.toBeCalled();
		});

		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.playElement(1234);

			expect(mock.raw.playElement).toBeCalledWith(1234);
			expect(mock.raw.playElement).toBeCalledTimes(1);

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});
	describe('stopElement', () => {
		it('calls socket and nothing else when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.stopElement(1234);

			expect(mock.game.socket?.executeAsGM).toBeCalledWith(SocketCalls.StopElement, 1234);
			expect(mock.game.socket?.executeAsGM).toBeCalledTimes(1);

			expect(mock.raw.stopElement).not.toBeCalled();
		});

		it('calls hook and not socket when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.stopElement(1234);

			expect(mock.raw.stopElement).toBeCalledWith(1234);
			expect(mock.raw.stopElement).toBeCalledTimes(1);

			expect(mock.game.socket?.executeAsGM).not.toBeCalled();
		});
	});

	// The ambient mood is one for the whole session (the loudest pin among everyone's tokens), but each client fades
	// it with its own local volume, by how close its own tokens are, like Foundry does with ambient sounds.
	describe('ambient fade', () => {
		beforeEach(() => {
			mock.game.getSetting = jest.fn((name: string) => (name === 'playerVolume' ? 80 : 50)) as any;
			mock.ctx.stores.playerVolume.refresh();
			mock.raw.getState = jest.fn(() => 'active');
			mock.game.getSceneAmbientMoods = jest.fn(() => [1, 2]);
		});
		const lastLocalVolume = () => {
			const calls = (mock.raw.changePlayerVolume as jest.Mock).mock.calls;
			return calls[calls.length - 1]?.[0];
		};

		it('keeps the full local volume when no mood is playing', () => {
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.3 });

			expect(lastLocalVolume()).toBeCloseTo(0.8);
		});

		it('fades the ambient mood by the volume Foundry computes for the closest pin of that mood', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.3 });
			expect(lastLocalVolume()).toBeCloseTo(0.24);

			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.9 });
			expect(lastLocalVolume()).toBeCloseTo(0.72);
		});

		// A mood with pins on the scene follows them even when started from a playlist: the same mood playing from a
		// playlist and from a pin must not be loud outside the area and faded inside.
		it('silences a playlist mood with pins on the scene outside their areas', () => {
			syrin.setSessionMood(1);

			expect(lastLocalVolume()).toBe(0);
		});

		it('keeps the full local volume for a mood without pins on the scene', () => {
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.3 });
			syrin.setSessionMood(3);

			expect(lastLocalVolume()).toBeCloseTo(0.8);
		});

		it('follows the pins of the scene this client is looking at', () => {
			syrin.setSessionMood(3);
			mock.game.getSceneAmbientMoods = jest.fn(() => [3]);

			syrin.fadeLocalVolume();

			expect(lastLocalVolume()).toBe(0);
		});

		it('ignores pins of other moods', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.25 });
			syrin.setLocalAmbient('syrinscape:b.wav', { moodId: 2, volume: 1 });

			expect(lastLocalVolume()).toBeCloseTo(0.2);
		});

		it('silences the ambient mood when no token of this client is in its area', () => {
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', undefined);

			expect(lastLocalVolume()).toBe(0);
		});

		// Syrinscape fades the stopped mood out (in a second): at the full volume its tail would jump up.
		it('restores the full local volume once the stopped ambient mood faded out', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });
			syrin.setSessionMood(undefined);

			expect(lastLocalVolume()).toBeCloseTo(0.4);
			jest.advanceTimersByTime(AMBIENT_FADE_OUT_MS);
			expect(lastLocalVolume()).toBeCloseTo(0.8);
		});

		it('keeps fading when another ambient mood starts before the restore', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });
			syrin.setLocalAmbient('syrinscape:b.wav', { moodId: 2, volume: 0.25 });
			syrin.setSessionMood(undefined);
			syrin.setSessionMood(2);
			jest.advanceTimersByTime(AMBIENT_FADE_OUT_MS);

			expect(lastLocalVolume()).toBeCloseTo(0.2);
		});

		it('does not send the same local volume twice', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });
			(mock.raw.changePlayerVolume as jest.Mock).mockClear();
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.501 });

			expect(mock.raw.changePlayerVolume).not.toBeCalled();
		});

		it('waits for the Syrinscape player before changing the local volume', () => {
			mock.raw.getState = jest.fn(() => 'inactive');

			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });

			expect(mock.raw.changePlayerVolume).not.toBeCalled();
		});

		it('applies the faded volume when the player becomes active', () => {
			mock.raw.getState = jest.fn(() => 'inactive');
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });

			syrin.applyVolumes();

			expect(lastLocalVolume()).toBeCloseTo(0.4);
		});

		it('fades a volume dragged on the slider too', () => {
			syrin.setSessionMood(1);
			syrin.setLocalAmbient('syrinscape:a.wav', { moodId: 1, volume: 0.5 });

			syrin.applyLocalVolume(40);

			expect(lastLocalVolume()).toBeCloseTo(0.2);
		});
	});

	describe('ambient mood choice', () => {
		const nextAmbientMood = () => get(mock.ctx.stores.nextAmbientMood);
		beforeEach(() => {
			mock.game.isGM = jest.fn(() => true);
		});

		it('plays the loudest ambient mood', () => {
			syrin.playAmbientSound('a', { kind: 'mood', volume: 0.2, moodId: 1, userId: 'u' });
			syrin.playAmbientSound('b', { kind: 'mood', volume: 0.7, moodId: 2, userId: 'u' });
			jest.runOnlyPendingTimers();

			expect(nextAmbientMood()).toBe(2);
		});

		it('is not stuck on the previous mood when the loudest pin is an element', () => {
			syrin.playAmbientSound('a', { kind: 'mood', volume: 0.2, moodId: 1, userId: 'u' });
			jest.runOnlyPendingTimers();
			syrin.stopAmbientSound('a', 'u');
			syrin.playAmbientSound('b', { kind: 'element', volume: 1, elementId: 9, userId: 'u' });
			jest.runOnlyPendingTimers();

			expect(nextAmbientMood()).toBeUndefined();
		});

		it('picks a mood below a louder element', () => {
			syrin.playAmbientSound('a', { kind: 'mood', volume: 0.2, moodId: 1, userId: 'u' });
			syrin.playAmbientSound('b', { kind: 'element', volume: 1, elementId: 9, userId: 'u' });
			jest.runOnlyPendingTimers();

			expect(nextAmbientMood()).toBe(1);
		});
	});

	// The Syrinscape player starts at its own volumes (the local one at 1, the maximum): the saved ones
	// (0-100 settings) have to be applied once the player is active.
	describe('applyVolumes', () => {
		const saved: Record<string, number> = {
			playerVolume: 73,
			globalVolume: 40,
			oneshotsVolume: 25
		};
		beforeEach(() => {
			mock.game.getSetting = jest.fn((name: string) => saved[name]) as any;
			mock.ctx.stores.playerVolume.refresh();
			mock.ctx.stores.globalVolume.refresh();
			mock.ctx.stores.oneshotsVolume.refresh();
		});

		it('applies only the local volume when its not GM', () => {
			mock.game.isGM = jest.fn(() => false);

			syrin.applyVolumes();

			expect(mock.raw.changePlayerVolume).toBeCalledTimes(1);
			expect(mock.raw.changePlayerVolume).toBeCalledWith(0.73);
			expect(mock.raw.changeMoodVolume).not.toBeCalled();
			expect(mock.raw.changeOneShotVolume).not.toBeCalled();
		});

		it('applies the local volume and the session volumes when its GM', () => {
			mock.game.isGM = jest.fn(() => true);

			syrin.applyVolumes();

			expect(mock.raw.changePlayerVolume).toBeCalledWith(0.73);
			expect(mock.raw.changeMoodVolume).toBeCalledWith(0.4);
			expect(mock.raw.changeOneShotVolume).toBeCalledWith(0.25);
		});

		it('keeps the volumes in the 0-1 range of Syrinscape', () => {
			mock.game.isGM = jest.fn(() => true);
			Object.assign(saved, { playerVolume: 150, globalVolume: -5, oneshotsVolume: NaN });
			mock.ctx.stores.playerVolume.refresh();
			mock.ctx.stores.globalVolume.refresh();
			mock.ctx.stores.oneshotsVolume.refresh();

			syrin.applyVolumes();

			expect(mock.raw.changePlayerVolume).toBeCalledWith(1);
			expect(mock.raw.changeMoodVolume).toBeCalledWith(0);
			expect(mock.raw.changeOneShotVolume).toBeCalledWith(0.5);
		});
	});
});
