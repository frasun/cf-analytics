import type { CFData } from "./data";

interface Props {
	data: CFData[];
}

export default function ATCRequestTable({ data }: Props) {
	const formatTime = (time: string) =>
		new Date(time).toLocaleTimeString([], {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});

	const sortData = (a: CFData, b: CFData) =>
		b.originResponseDurationMs - a.originResponseDurationMs;

	return (
		<>
			{data.length > 0 && (
				<table className="request-table">
					<thead>
						<tr>
							<th>Duration (ms)</th>
							<th>Country</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{data
							.sort(sortData)
							.map(
								({
									originResponseDurationMs: duration,
									clientCountryName: country,
									datetime: time,
								}) => (
									<tr key={time}>
										<td>{duration}</td>
										<td>{country}</td>
										<td>{formatTime(time)}</td>
									</tr>
								),
							)}
					</tbody>
				</table>
			)}
		</>
	);
}
