import { mockedGame } from '@/mock';
import { FVTTGame } from './game';
import { MAX_CONCURRENT_REQUESTS, RETRY_DELAYS_MS, RawApiImpl } from './raw';
import { Utils } from './utils';

describe('Raw API requests', () => {
	let game: FVTTGame;
	let raw: RawApiImpl;
	let fetchMock: jest.Mock;

	const ok = (body: any) => ({ ok: true, status: 200, json: async () => body } as any);
	const corsBlocked = () => new TypeError('Failed to fetch');

	beforeEach(() => {
		jest.useFakeTimers();
		game = mockedGame();
		game.isGM = jest.fn(() => true);
		game.getSetting = jest.fn((name: string) => {
			if (name === 'authToken') return 'token';
			if (name === 'address') return 'https://syrinscape.test/api';
			return false;
		}) as any;
		raw = new RawApiImpl(game, new Utils(game));
		fetchMock = jest.fn();
		global.fetch = fetchMock;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('retries a request blocked by the CORS-less 429', async () => {
		fetchMock.mockRejectedValueOnce(corsBlocked()).mockResolvedValueOnce(ok([{ pk: 1 }]));

		const moods = raw.getMoods('1234');
		await jest.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);

		expect(await moods).toEqual([{ pk: 1 }]);
		expect(fetchMock).toBeCalledTimes(2);
		expect(game.notifyError).not.toBeCalled();
	});

	it('gives up and notifies once retries are exhausted', async () => {
		fetchMock.mockRejectedValue(corsBlocked());

		const moods = raw.getMoods('1234');
		for (const delay of RETRY_DELAYS_MS) {
			await jest.advanceTimersByTimeAsync(delay);
		}

		expect(await moods).toEqual([]);
		expect(fetchMock).toBeCalledTimes(RETRY_DELAYS_MS.length + 1);
		expect(game.notifyError).toBeCalledTimes(1);
	});

	it('does not retry other errors', async () => {
		fetchMock.mockRejectedValue(new Error('boom'));

		expect(await raw.getElements('1234')).toEqual([]);
		expect(fetchMock).toBeCalledTimes(1);
	});

	it('limits the number of concurrent requests', async () => {
		const pending: ((value: any) => void)[] = [];
		fetchMock.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));

		const requests = [1, 2, 3, 4, 5].map((id) => raw.getMoods(String(id)));
		await jest.advanceTimersByTimeAsync(0);
		expect(fetchMock).toBeCalledTimes(MAX_CONCURRENT_REQUESTS);

		while (pending.length > 0) {
			pending.shift()!(ok([]));
			await jest.advanceTimersByTimeAsync(0);
		}

		await Promise.all(requests);
		expect(fetchMock).toBeCalledTimes(5);
		expect(raw.activeRequests).toBe(0);
	});
});
