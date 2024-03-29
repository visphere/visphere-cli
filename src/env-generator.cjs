'use strict';
/*
 * Copyright (c) 2023 by Visphere & Vsph Technologies
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const fs = require('fs');
const path = require('path');
const utils = require('./helpers/helpers.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const { submodules } = require('./config.cjs');
const { EOL } = require('os');

const templateFileName = 'example.env';
const outputFileName = '.env';

const templateFile = path.join(submodules.base.path, templateFileName);
const outputFile = path.join(submodules.base.path, outputFileName);

const { replace } = utils.checkInputArguments([
  { name: 'replace', alias: 'r', type: Boolean },
]);

utils.printCopyHeader();
utils.printExecutableScriptInfo();
utils.printReplaceMode(replace);
utils.printNewLine();

const allStages = replace ? 2 : 3;
let currentStage = 1;

async function checkFile(fileName, filePath, isReverse, stage) {
  const errorMessage = `File "${fileName}" ${
    isReverse ? 'already' : 'not'
  } exist`;
  const spinner = promisifyUtils.createAndStartSpinner({
    stage,
    allStages,
    messages: `Checking file "${fileName}" status`,
  });
  let exist = fs.existsSync(filePath);
  if (isReverse) {
    exist = !exist;
  }
  if (exist) {
    utils.stopSucessSpinner(
      spinner,
      `File "${fileName}" ${isReverse ? 'not ' : ''}exist`,
      stage,
      allStages
    );
  } else {
    utils.stopErrorSpinner(spinner, errorMessage, stage, allStages);
    throw new Error(errorMessage);
  }
}

async function generateFile() {
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: `Copying content from "${templateFileName}" to "${outputFileName}"`,
  });
  try {
    let outputData = utils.contentHeader;
    const data = await fs.promises.readFile(templateFile, 'utf8');
    const lines = data.split('\n');
    outputData += EOL;
    for (const line of lines) {
      if (
        (line.startsWith('#') || line.startsWith('# ')) &&
        !line.startsWith('#!')
      ) {
        continue;
      }
      outputData += line + EOL;
    }
    await fs.promises.writeFile(outputFile, outputData);
    utils.stopSucessSpinner(
      spinner,
      `Content in "${outputFileName}" file was generated`,
      currentStage,
      allStages
    );
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      `Unable to generate content in "${outputFileName}" file`,
      currentStage,
      allStages
    );
    throw new Error(err);
  }
}

async function processing() {
  try {
    if (!replace) {
      await checkFile(
        outputFileName,
        outputFile,
        true,
        currentStage++,
        allStages
      );
    }
    await checkFile(
      templateFileName,
      templateFile,
      false,
      currentStage++,
      allStages
    );
    await generateFile();
  } catch (err) {
    utils.printNewLine();
    utils.printErrorMessage(err);
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage(
    `Env file from template was generated in "${outputFile}".`
  );
});
