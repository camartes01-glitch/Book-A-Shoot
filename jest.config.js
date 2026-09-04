/** Only pure business-logic modules (engine/) are unit tested here — no
 * native rendering required, so a plain ts-jest setup is enough and fast. */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/engine/**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { types: ["jest", "node"] } }],
  },
};
