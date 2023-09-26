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

utils.loadEnvVariables();
utils.printBaseMigratorInfo(mode);

const allStages = 3;
let currentStage = 1;

async function processing() {
  try {
    await promisifyUtils.dockerBuildPipeline({
      imageName: 'msph-web-client',
      mode,
      currentStage,
      allStages,
      rootModule: submodules.webClient.path,
    });
  } catch (error) {
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('Deployed web-client into DockerHub repository.');
});
