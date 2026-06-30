import type { StatusValue } from "./constants";

type Props = {
	status: StatusValue;
};

export default function StatusPill({ status }: Props) {
	return (
		<span id="status-pill" className={status}>
			{status}
		</span>
	);
}
