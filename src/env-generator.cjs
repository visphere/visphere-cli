/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: env-generator.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-13, 14:53:46
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

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const utils = require('./helpers/helpers.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const { submodules } = require('./config.cjs');

const templateFileName = '.env.sample';
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
    messages: `Checking, file "${fileName}" status`,
  });
  let exist = await promisify(fs.access)(filePath);
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
    for (const line of lines) {
      if (
        (line.startsWith('#') || line.startsWith('# ')) &&
        !line.startsWith('#!')
      ) {
        continue;
      }
      outputData += line;
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
