/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: web-client.migrator.cjs
 *   Created at: 2023-08-06, 18:12:54
 *   Last updated at: 2023-08-10, 21:20:38
 *
 *   Project name: moonsphere
 *   Module name: moonsphere-scripts
 *
 * This project is a part of "MoonSphere" instant messenger system. This is a project
 * completing a engineers degree in computer science at Silesian University of Technology.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *   <http://www.apache.org/license/LICENSE-2.0>
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the license.
 */

'use scrict';

const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

const { mode } = utils.checkInputArguments([{ name: 'mode', alias: 'm', type: String }]);

utils.loadEnvVariables();
utils.printBaseMigratorInfo(mode);

const targetDirectory = submodules.webClient.path;
const containerName = submodules.webClient.dockerContainerName;

const allStages = 4;
let currentStage = 1;

async function processing() {
  try {
    await promisifyUtils.checkIfDockerContainerIsRunning({
      containerName,
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `yarn run docker:${mode}`,
      messOnStart: 'Compiling webpack bundles',
      messOnEnd: 'compiled webpack bundles',
      stage: currentStage++,
      allStages,
      options: { cwd: targetDirectory },
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} rm -rf /var/www/html/`,
      messOnStart: 'Clear docker container /var/www/html directory',
      messOnEnd: 'cleared docker container /var/www/html directory',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${targetDirectory}/dist ${containerName}:/var/www/html/`,
      messOnStart: 'Migrate bundled content into docker container',
      messOnEnd: 'migrated bundled content into docker container',
      stage: currentStage++,
      allStages,
    });
  } catch (error) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('Migrated web-client into docker container.');
});
