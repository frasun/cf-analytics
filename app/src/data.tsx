import { useEffect, useState } from "react";
import type { StatusValue } from "./constants";
import { Status } from "./constants";

export type CFData = {
	clientRequestQuery: string;
	datetime: string;
	originResponseDurationMs: number;
};

type CFDataHook = [StatusValue, CFData[], string | null, string];

export default function useCFData(): CFDataHook {
	const [isFetching, setIsFetching] = useState<StatusValue>(Status.IDLE);
	const [cfData, setCfData] = useState<CFData[]>([]);
	const [error, setCfError] = useState<string | null>(null);
	const [timestamp, setTimestamp] = useState<string>(
		new Date().toLocaleString(),
	);

	const from = new Date(Date.now() - 24 * 3_600_000).toISOString();
	const to = new Date().toISOString();

	const fetchData = async () => {
		setIsFetching(Status.FETCHING);

		try {
			const res = await fetch("/cf.php", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from, to }),
			});

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			const json = await res.json();

			if (json.errors?.length) {
				throw new Error(json.errors.map((e: Error) => e.message).join("; "));
			}

			setCfData(
				filterData(json.data?.viewer?.zones?.[0]?.httpRequestsAdaptive),
			);
			setIsFetching(Status.OK);
			setCfError(null);
		} catch (error) {
			if (error instanceof Error) {
				setCfError(error.message);
			}
			setIsFetching(Status.ERROR);
		} finally {
			setTimestamp(new Date().toLocaleString());
		}
	};

	useEffect(() => {
		fetchData();
		const fetchInterval = setInterval(fetchData, 5 * 60 * 1000);
		return () => clearInterval(fetchInterval);
	}, []);

	return [isFetching, cfData, error, timestamp];
}

const filterData = (data: CFData[]) =>
	data.filter(
		(r) =>
			r.clientRequestQuery === "?wc-ajax=add_to_cart" &&
			r.originResponseDurationMs > 0,
	);
