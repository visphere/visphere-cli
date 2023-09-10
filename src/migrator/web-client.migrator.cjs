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

const targetDirectory = submodules.webClient.path;
const containerName = submodules.webClient.containerName;

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
