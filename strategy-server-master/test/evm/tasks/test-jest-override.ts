// import type { AggregatedResult } from '@jest/test-result';
// import type { Config } from '@jest/types';
import chalk from 'chalk';
import { TASK_COMPILE } from 'hardhat/builtin-tasks/task-names';
import { task } from 'hardhat/config';
import { HARDHAT_NETWORK_NAME } from 'hardhat/internal/constants';

const TASK_JEST_RUN_TESTS = 'jest:run';
// const TASK_JEST_RUN_TESTS = 'jest:run:override';
const TASK_JEST_OVERRIDE = 'test:jest:override';

// subtask(TASK_JEST_RUN_TESTS)
//   .addFlag('watch', "Enables 'watch-mode'")
//   .setAction(async ({ watch }: { watch: boolean }, { config }) => {
//     const { runCLI } = await import('jest');

//     return new Promise<{
//       results: AggregatedResult;
//       globalConfig: Config.GlobalConfig;
//       // eslint-disable-next-line no-async-promise-executor, @typescript-eslint/no-misused-promises
//     }>(async (resolve, reject) => {
//       const jestConfig: any = { watch };

//       try {
//         const result = await runCLI(jestConfig, [
//           config.paths.root + '/jest.config.js',
//         ]);
//         console.log({ result });

//         return resolve(result);
//       } catch (error) {
//         console.log({ error });

//         return reject(error);
//       }
//     });
//   });

// @docs https://github.com/rryter/hardhat-jest-plugin/blob/master/src/index.ts#L28
task(TASK_JEST_OVERRIDE, 'Runs override jest tests')
  .addFlag('watch', 'Watch-Mode')
  .addFlag('noCompile', "Don't compile before running this task")
  .setAction(
    async (
      {
        watch,
        noCompile,
      }: {
        watch: boolean;
        noCompile: boolean;
      },
      { run, network },
    ) => {
      if (!noCompile) {
        await run(TASK_COMPILE, { quiet: true });
      }

      const testFailures = await run(TASK_JEST_RUN_TESTS, { watch });

      if (network.name === HARDHAT_NETWORK_NAME) {
        const stackTracesFailures = await network.provider.send(
          'hardhat_getStackTraceFailuresCount',
        );

        if (stackTracesFailures !== 0) {
          console.warn(
            chalk.yellow(
              `Failed to generate ${stackTracesFailures} stack trace(s). Run Hardhat with --verbose to learn more.`,
            ),
          );
        }
      }

      process.exitCode = testFailures.success ? 0 : 1;

      return testFailures;
    },
  );
