export const Status = {
	IDLE: "idle",
	FETCHING: "fetching",
	OK: "ok",
	ERROR: "error",
};

export type StatusValue = (typeof Status)[keyof typeof Status];
