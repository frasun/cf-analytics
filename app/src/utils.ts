import type { CFData } from "./data";

export function median(arr: number[]) {
	if (!arr.length) return;
	const s = [...arr].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentile(arr: number[], p: number) {
	if (!arr.length) return;
	const s = [...arr].sort((a, b) => a - b);
	return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
}

export function delta(med24?: number, med2?: number) {
	if (!med24 || !med2) return [undefined, undefined];

	const diff = Math.round(med2 - med24);
	const pct = Math.round((diff / med24) * 100);

	return [diff, pct];
}

export function getATCRequests(
	data: CFData[],
	labels: Date[],
	timeBlock: number = 60,
): CFData[][] {
	return labels.map((label, i) => {
		const isLast = i === labels.length - 1;
		const blockEnd = isLast
			? new Date()
			: new Date(label.getTime() + timeBlock * 60 * 1000);

		const requests = data.filter((d) => {
			const dt = new Date(d.datetime);
			return dt >= label && dt < blockEnd;
		});

		return requests;
	});
}

export function getLabels(timeBlock: number = 60): Date[] {
	const labels: Date[] = [];
	const now = new Date();

	const minutes = now.getMinutes() >= timeBlock ? timeBlock : 0;
	now.setMinutes(minutes, 0, 0);

	const blockCount = (24 * 60) / timeBlock;

	for (let i = blockCount - 1; i >= 0; i--) {
		labels.push(new Date(now.getTime() - i * timeBlock * 60 * 1000));
	}

	return labels;
}
