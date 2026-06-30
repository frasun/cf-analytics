import Card from "./Card";
import StatusPill from "./StatusPill";
import useCFData from "./data";
import * as Utils from "./utils";
import ATCChart from "./Chart";

function App() {
	const [fetchingStatus, data, error, timestamp] = useCFData();
	const requestsDuration = data.map((d) => d.originResponseDurationMs);
	const requestsDurationRecent = data
		.filter(
			(d) =>
				new Date(d.datetime) >=
				new Date(new Date().getTime() - 2 * 60 * 60 * 1000),
		)
		.map((d) => d.originResponseDurationMs);
	const requestsCountRecent = requestsDurationRecent.length;
	const requestsCountLabel = requestsCountRecent === 1 ? "request" : "requests";
	const avg24 = Utils.median(requestsDuration);
	const avg2 = Utils.median(requestsDurationRecent);
	const p95 = Utils.percentile(requestsDurationRecent, 95);
	const [delta, pct] = Utils.delta(avg24, avg2);
	const getDelta = (delta?: number, pct?: number) => {
		if (!delta || !pct) return "";

		return delta > 0 ? `▲ +${delta} ms (+${pct}%)` : `▼ ${delta} ms (${pct}%)`;
	};
	const getDeltaClassName = (delta?: number) =>
		delta === undefined ? "" : delta < 0 ? "down" : delta > 0 ? "up" : "";

	return (
		<>
			<header>
				<h1>
					add_to_cart <span>/ latency</span>
				</h1>
				<StatusPill status={fetchingStatus} />
			</header>

			{error && <div id="error-box">{error}</div>}

			<div className="grid">
				<Card
					label="Avg. last 2h"
					value={avg2}
					unit="ms"
					info={getDelta(delta, pct)}
					className={getDeltaClassName(delta)}
				/>
				<Card label="P95 last 2h" value={p95} unit="ms" />
				<Card
					label="Last 2h"
					value={requestsCountRecent}
					unit={requestsCountLabel}
				/>
				<Card label="Avg. last 24h" value={avg24} unit="ms" />
			</div>

			<div className="chart-wrap">
				<ATCChart dataset={data} avg={avg24} />
			</div>

			<footer>Cloudflare GraphQL Analytics: {timestamp}</footer>
		</>
	);
}

export default App;
