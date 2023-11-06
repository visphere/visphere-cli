'use strict';
/*
 * Copyright (c) 2023 by Visphere & Vsph Technologies
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const utils = require('../helpers/helpers.cjs');
const promisifyUtils = require('../helpers/promisify-utils.cjs');
const { submodules } = require('../config.cjs');

const { mode } = utils.checkInputArguments([
  { name: 'mode', alias: 'm', type: String },
]);

utils.loadEnvVariables();
utils.printBaseMigratorInfo(mode);

const allStages = 3;
let currentStage = 1;

async function processing() {
  try {
    await promisifyUtils.dockerBuildPipeline({
      imageName: 'vsph-mail-parser',
      mode,
      currentStage,
      allStages,
      rootModule: submodules.mailParser.path,
    });
  } catch (error) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('Deployed mail-parser into DockerHub repository.');
});
