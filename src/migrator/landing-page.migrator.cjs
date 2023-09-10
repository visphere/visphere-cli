'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
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
const outputDir = '/msph-landing-page-content/';

const allStages = 8;
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
      execCommand: `docker exec ${containerName} rm -rf ${outputDir}/*`,
      messOnStart: `Clearing docker container ${outputDir} directory`,
      messOnEnd: `cleared docker container ${outputDir} directory`,
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${targetDirectory}/package.json ${containerName}:${outputDir}`,
      messOnStart: 'Moving package.json file into docker container',
      messOnEnd: 'moved package.json file into docker container',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${targetDirectory}/yarn.lock ${containerName}:${outputDir}`,
      messOnStart: 'Moving yarn.lock file into docker container',
      messOnEnd: 'moved yarn.lock file into docker container',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} yarn install --prod -C ${outputDir}/package.json`,
      messOnStart: `Installing dependencies via yarn install`,
      messOnEnd: `installed dependencies via yarn install`,
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
