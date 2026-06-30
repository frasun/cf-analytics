type Props = {
	label: string;
	value?: string | number;
	unit?: string;
	info?: string;
	className?: string;
};

export default function Cart({ label, value, unit, info, className }: Props) {
	const defaultValue = "-";
	let elClassName = "card";

	if (className?.length) {
		elClassName += ` ${className}`;
	}

	return (
		<div className={elClassName}>
			<div className="label">{label}</div>
			<div className="value">{value?.toString() || defaultValue}</div>
			<span className="unit">{unit}</span>
			{info && <div className="info">{info}</div>}
		</div>
	);
}
