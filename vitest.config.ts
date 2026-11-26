import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // the packages and the site (the repository's script tests); the playground and the
        // examples apps join with the React Epic
        projects: ["packages/*", "site"],
    },
});
