import { describe, it, expect, vi, afterEach } from "vitest";
import { median, percentile, delta, getATCRequests, getLabels } from "./utils";
import type { CFData } from "./data";

describe("median", () => {
	it("returns undefined for empty array", () => {
		expect(median([])).toBeUndefined();
	});

	it("returns the single value for one element", () => {
		expect(median([42])).toBe(42);
	});

	it("returns the middle value for odd-length array", () => {
		expect(median([3, 1, 2])).toBe(2);
	});

	it("returns the avg of two middle values for even-length array", () => {
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it("does not mutate the input array", () => {
		const input = [3, 1, 2];
		median(input);
		expect(input).toEqual([3, 1, 2]);
	});
});

describe("percentile", () => {
	it("returns undefined for empty array", () => {
		expect(percentile([], 95)).toBeUndefined();
	});

	it("returns the only value for single-element array", () => {
		expect(percentile([10], 95)).toBe(10);
	});

	it("returns correct p95 for a known dataset", () => {
		const data = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
		expect(percentile(data, 95)).toBe(95);
	});

	it("returns correct p50 (matches median for even sets approx)", () => {
		const data = [10, 20, 30, 40];
		expect(percentile(data, 50)).toBe(20);
	});

	it("returns max value for p100", () => {
		expect(percentile([5, 1, 9, 3], 100)).toBe(9);
	});

	it("does not mutate the input array", () => {
		const input = [5, 1, 9, 3];
		percentile(input, 95);
		expect(input).toEqual([5, 1, 9, 3]);
	});
});

describe("delta", () => {
	it("returns [undefined, undefined] when med24 is undefined", () => {
		expect(delta(undefined, 100)).toEqual([undefined, undefined]);
	});

	it("returns [undefined, undefined] when med2 is undefined", () => {
		expect(delta(100, undefined)).toEqual([undefined, undefined]);
	});

	it("returns [undefined, undefined] when med24 is 0 (falsy)", () => {
		expect(delta(0, 100)).toEqual([undefined, undefined]);
	});

	it("computes positive diff and pct when med2 > med24", () => {
		expect(delta(100, 150)).toEqual([50, 50]);
	});

	it("computes negative diff and pct when med2 < med24", () => {
		expect(delta(200, 150)).toEqual([-50, -25]);
	});

	it("rounds diff and pct to whole numbers", () => {
		expect(delta(300, 333)).toEqual([33, 11]);
	});
});

describe("getLabels", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("generates correct number of blocks for default 60min", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		expect(getLabels(60)).toHaveLength(24);
	});

	it("generates correct number of blocks for 30min", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		expect(getLabels(30)).toHaveLength(48);
	});

	it("rounds down to the nearest block boundary", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30);
		const last = labels[labels.length - 1];
		expect(last.getMinutes()).toBe(30);
		expect(last.getUTCHours()).toBe(14);
	});

	it("rounds down to 0 minutes when below the block threshold", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:10:00Z"));
		const labels = getLabels(30);
		const last = labels[labels.length - 1];
		expect(last.getMinutes()).toBe(0);
	});

	it("returns labels in ascending order", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30);
		for (let i = 1; i < labels.length; i++) {
			expect(labels[i].getTime()).toBeGreaterThan(labels[i - 1].getTime());
		}
	});
});

describe("getATCRequests", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	const makeRequest = (datetime: string, ms = 100): CFData => ({
		clientRequestQuery: "?wc_ajax=add_to_cart",
		datetime,
		originResponseDurationMs: ms,
	});

	it("returns one bucket per label", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30);
		const result = getATCRequests([], labels, 30);
		expect(result).toHaveLength(labels.length);
	});

	it("places requests into the correct block", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30); // last label = 14:30
		const data = [makeRequest("2026-06-30T14:35:00Z")];
		const result = getATCRequests(data, labels, 30);
		expect(result[result.length - 1]).toHaveLength(1);
	});

	it("excludes requests outside any block", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30);
		const data = [makeRequest("2026-06-28T00:00:00Z")]; // way outside 24h window
		const result = getATCRequests(data, labels, 30);
		const totalPlaced = result.flat().length;
		expect(totalPlaced).toBe(0);
	});

	it("extends the last block to 'now' instead of a fixed boundary", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30); // last label = 14:30
		// this falls AFTER what a fixed 30min block (14:30-15:00) would normally allow,
		// but BEFORE "now" (14:45) -- should still be included since last block end = now
		const data = [makeRequest("2026-06-30T14:44:00Z")];
		const result = getATCRequests(data, labels, 30);
		expect(result[result.length - 1]).toHaveLength(1);
	});

	it("does not duplicate a request across two buckets", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-30T14:45:00Z"));
		const labels = getLabels(30);
		const data = [makeRequest("2026-06-30T14:30:00Z")]; // exact boundary
		const result = getATCRequests(data, labels, 30);
		const totalPlaced = result.flat().length;
		expect(totalPlaced).toBe(1);
	});
});
