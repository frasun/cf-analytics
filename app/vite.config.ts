import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			"/cf.php": "http://localhost:9000",
		},
	},
	test: {
		globals: true,
		environment: "node",
	},
});
