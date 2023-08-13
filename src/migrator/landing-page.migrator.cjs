'use strict';
/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: landing-page.migrator.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-14, 01:56:47
 *
 *   Project name: moonsphere
 *   Module name: moonsphere-cli
 *
 * This project is a part of "MoonSphere" instant messenger system. This system is a part of
 * completing an engineers degree in computer science at Silesian University of Technology.
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
const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

const { mode } = utils.checkInputArguments([
  { name: 'mode', alias: 'm', type: String },
]);

utils.printBaseMigratorInfo(mode);

const targetDirectory = submodules.landingPage.path;
const containerName = submodules.landingPage.containerName;
const outputDir = '/msph-landing-page-content/dist/';

const allStages = 5;
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
      messOnStart: 'Compiling vite (astro) bundles',
      messOnEnd: 'compiled vite (astro) bundles',
      stage: currentStage++,
      allStages,
      options: { cwd: targetDirectory },
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} rm -rf ${outputDir}`,
      messOnStart: 'Clear docker container /dist directory',
      messOnEnd: 'cleared docker container /dist directory',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${targetDirectory}/dist ${containerName}:${outputDir}`,
      messOnStart: 'Migrate bundled content into docker container',
      messOnEnd: 'migrated bundled content into docker container',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker restart ${containerName}`,
      messOnStart: 'Restarting Astro Node web server',
      messOnEnd: 'restarted Astro Node web server',
      stage: currentStage++,
      allStages,
    });
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('Migrated landing-page into docker container.');
});
