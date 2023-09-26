'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

utils.loadEnvVariables();

utils.printCopyHeader();
utils.printExecutableScriptInfo();

const containerName = submodules.s3Static.containerName;
const s3ContainerPort = 9000;

const allStages = 4;
let currentStage = 1;

function dockerExec(command) {
  return `docker exec ${containerName} ${command}`;
}

async function processing() {
  try {
    await promisifyUtils.checkIfDockerContainerIsRunning({
      containerName,
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: dockerExec(utils.s3estabilishedConnCmd(s3ContainerPort)),
      messOnStart: 'Etabilishing connection with s3 bucket',
      messOnEnd: 'etabilished connection with s3 bucket',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: dockerExec('mc rm --force --recursive miniotr/static/'),
      messOnStart: 'Clearing s3 bucket',
      messOnEnd: 'cleared s3 bucket',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: dockerExec(
        'mc cp --recursive /s3-transfer/ miniotr/static/'
      ),
      messOnStart: 'Migrating s3 content into static bucket',
      messOnEnd: 'migrated s3 content into static bucket',
      stage: currentStage++,
      allStages,
    });
  } catch (err) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('Migrated s3 static into docker container.');
});
