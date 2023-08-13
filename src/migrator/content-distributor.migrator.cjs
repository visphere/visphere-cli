/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: content-distributor.migrator.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-13, 14:53:15
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

'use strict';

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
