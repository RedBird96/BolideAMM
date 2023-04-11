const pattern = process.env.EVM_TEST_PATTERN ? `${process.env.EVM_TEST_PATTERN}.evm-spec.ts$` : '.evm-spec.ts$'

module.exports = {
  "moduleFileExtensions": ["js", "json", "ts"],
  "moduleNameMapper": {
    "^src(.*)$": "<rootDir>/../../src/$1",
    "^test(.*)$": "<rootDir>/../../test/$1"
  },
  "rootDir": ".",
  "testRegex": pattern,
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "coverageDirectory": "../coverage",
  "testEnvironment": "jest-environment-node-single-context",
  "maxWorkers": 1,
  'runner': './utils/jest-serial-runner.ts',
}
