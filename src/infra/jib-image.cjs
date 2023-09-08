'use strict';
/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: jib-image.cjs
 *   Created at: 2023-09-08, 16:39:08
 *   Last updated at: 2023-09-08, 16:39:08
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
const fs = require('fs');
const path = require('path');
const os = require('os');
const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

const availableLibraries = ['msph-shared-lib'];

const { service, libs } = utils.checkInputArguments([
  { name: 'service', alias: 's', type: String },
  { name: 'libs', alias: 'l', type: String },
]);

if (!availableLibraries.some(s => libs.split(',').includes(s))) {
  utils.printErrorMessage(
    `Unrecognized library. Available only ${availableLibraries.join(', ')}.`
  );
  process.exit(1);
}

utils.printCopyHeader();
utils.printExecutableScriptInfo();
utils.printNewLine();

const monorepoDir = submodules.infraMonorepo.path;
const rootPomProjectName = 'moonsphere-infra-monorepo';
const m2Repository = path.join(
  os.homedir(),
  '.m2',
  'repository',
  'pl',
  'moonsphere'
);
const allStages = libs ? 8 : 5;
let currentStage = 1;

async function cleanupM2Repository() {
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: 'Removing old artifacts from .m2 local repository',
  });
  try {
    await fs.promises.rm(path.join(m2Repository, rootPomProjectName), {
      recursive: true,
    });
    for (const library of libs.split(',')) {
      await fs.promises.rm(path.join(m2Repository, library), {
        recursive: true,
      });
    }
    utils.stopSucessSpinner(
      spinner,
      `Successfully removed old artifacts from .m2 local repository`,
      currentStage++,
      allStages
    );
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      'Unable to remove old artifacts from .m2 local repository',
      currentStage,
      allStages
    );
    throw new Error(err);
  }
}

async function processing() {
  try {
    await promisifyUtils.createPromisifyProcess({
      execCommand: `mvn -version`,
      messOnStart: 'Checking Maven installation',
      messOnEnd: 'checked maven installation',
      stage: currentStage++,
      allStages,
    });
    if (libs) {
      await cleanupM2Repository();
      await promisifyUtils.createPromisifyProcess({
        execCommand: `mvn -f ${path.join(
          monorepoDir,
          'pom.xml'
        )} -N install -U`,
        messOnStart:
          'Maven installing root pom.xml file to local .m2 repository',
        messOnEnd: 'installed root pom.xml file to local .m2 repository',
        stage: currentStage++,
        allStages,
      });
      await promisifyUtils.createPromisifyProcess({
        execCommand: `mvn -f ${path.join(
          monorepoDir,
          'pom.xml'
        )} -pl ${libs.replace(/,/g, ' ')} install -U`,
        messOnStart: 'Maven installing libraries to local .m2 repository',
        messOnEnd: 'installed libraries to local .m2 repository',
        stage: currentStage++,
        allStages,
      });
    }
    await promisifyUtils.createPromisifyProcess({
      execCommand: `mvn -f ${path.join(monorepoDir, service, 'pom.xml')} clean`,
      messOnStart: 'Maven cleaning',
      messOnEnd: 'cleaned target directory',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `mvn -f ${path.join(
        monorepoDir,
        service,
        'pom.xml'
      )} compile`,
      messOnStart: 'Maven compiling',
      messOnEnd: 'compiled source code',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `mvn -f ${path.join(
        monorepoDir,
        service,
        'pom.xml'
      )} package`,
      messOnStart: 'Maven packaging',
      messOnEnd: 'packaged source code into .jar containers',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `mvn -f ${path.join(
        monorepoDir,
        service,
        'pom.xml'
      )} jib:build`,
      messOnStart:
        'Maven JIB generating docker image and push into DockerHub repository',
      messOnEnd: 'generated docker image and pushed into DockerHub repository',
      stage: currentStage++,
      allStages,
    });
  } catch (err) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage(
    `Create JIB docker image from service ${service} and deploy to DockerHub.`
  );
});
