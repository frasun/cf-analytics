import {
	Chart as ChartJS,
	LinearScale,
	CategoryScale,
	BarElement,
	PointElement,
	LineElement,
	Legend,
	Tooltip,
	LineController,
	BarController,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import type { CFData } from "./data";
import * as Utils from "./utils";

type ATCChart = {
	dataset: CFData[];
	avg?: number;
};

ChartJS.register(
	LinearScale,
	CategoryScale,
	BarElement,
	PointElement,
	LineElement,
	Legend,
	Tooltip,
	LineController,
	BarController,
	annotationPlugin,
);

const labels = Utils.getLabels();

export default function ATCChart({ dataset, avg }: ATCChart) {
	const atcRequests = Utils.getATCRequests(dataset, labels);
	const data = {
		labels: labels.map((time) =>
			time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		),
		datasets: [
			{
				type: "line" as const,
				data: atcRequests.map((req) =>
					Utils.median(req.map((r) => r.originResponseDurationMs)),
				),
				label: "Avg.",
				yAxisID: "y1",
				backgroundColor: "#f97316",
				borderColor: "#f97316",
				borderWidth: 2,
				spanGaps: true,
			},
			{
				type: "bar" as const,
				data: atcRequests.map((req) => req.length),
				label: "Request count",
				yAxisID: "y",
				backgroundColor: "rgba(102,107,128,0.25)",
				borderColor: "rgba(102,107,128,0.5)",
				borderWidth: 1,
				borderRadius: 3,
			},
		],
	};

	return (
		<>
			{dataset.length > 0 && (
				<Chart
					type="bar"
					data={data}
					options={{
						maintainAspectRatio: false,
						scales: {
							y: { type: "linear", position: "right" },
							y1: {
								type: "linear",
								position: "left",
								grid: { drawOnChartArea: false },
							},
						},
						plugins: {
							legend: { display: false },
							tooltip: {
								callbacks: {
									label: (ctx) =>
										ctx.dataset.type === "line"
											? `${ctx.dataset.label}: ${ctx.parsed.y} ms`
											: `${ctx.dataset.label}: ${ctx.parsed.y}`,
								},
							},
							annotation: {
								annotations: {
									avgLine: {
										type: "line",
										yMin: avg,
										yMax: avg,
										yScaleID: "y1",
										borderColor: "#0bf597",
										borderWidth: 1,
										borderDash: [15, 5],
									},
								},
							},
						},
					}}
				/>
			)}
		</>
	);
}
