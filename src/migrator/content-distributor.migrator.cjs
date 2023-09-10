'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const { exec } = require('promisify-child-process');
const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

const { mode, restart } = utils.checkInputArguments([
  { name: 'mode', alias: 'm', type: String },
  { name: 'restart', alias: 'r', type: Boolean },
]);

utils.printBaseMigratorInfo(mode);

const targetDirectory = submodules.contentDistributor.path;
const containerName = submodules.contentDistributor.containerName;
const allStages = restart ? 4 : 3;
let currentStage = 1;

async function restartApacheWebServer(stage) {
  const endMessage = 'restarted ApacheWeb server';
  const spinner = promisifyUtils.createAndStartSpinner({
    stage,
    allStages,
    messages: 'Restarting ApacheWeb server',
  });
  try {
    await exec(`docker exec ${containerName} apachectl restart`);
    utils.stopSucessSpinner(
      spinner,
      `Successfully ${endMessage}`,
      stage,
      allStages
    );
  } catch (err) {
    utils.execCommonErrorContent(
      spinner,
      err,
      `Failure ${endMessage}`,
      stage,
      allStages
    );
  }
}

async function processing() {
  try {
    await promisifyUtils.checkIfDockerContainerIsRunning({
      containerName,
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} rm -rf /var/www/html/`,
      messOnStart: 'Clear docker container /var/www/html directory',
      messOnEnd: 'cleared docker container /var/www/html directory',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${targetDirectory}/content ${containerName}:/var/www/html/`,
      messOnStart: 'Migrate static content into docker container',
      messOnEnd: 'migrated static content into docker container',
      stage: currentStage++,
      allStages,
    });
    if (restart) {
      await restartApacheWebServer(currentStage++);
    }
  } catch (err) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage(
    'Migrated content-distributor into docker container.'
  );
});
