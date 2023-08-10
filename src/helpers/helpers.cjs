/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: helpers.cjs
 *   Created at: 2023-08-06, 18:12:54
 *   Last updated at: 2023-08-10, 21:16:18
 *
 *   Project name: moonsphere
 *   Module name: moonsphere-scripts
 *
 * This project is a part of "MoonSphere" instant messenger system. This is a project
 * completing a engineers degree in computer science at Silesian University of Technology.
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

'use scrict';

const path = require('path');
const colors = require('colors');
const commandLineArgs = require('command-line-args');
const config = require('../config.cjs');

colors.enable();

module.exports = {
  printCopyHeader: function () {
    console.log(
      `(c) ${new Date().getFullYear()} by ${config.licensedBy.cyan}. On ${
        config.license
      } license.`
    );
    console.log(`Developed by ${config.mainDeveloper}.\n`);
    console.log(`  Personal page: ${config.personalPageUrl}`);
    console.log(`  Repository url: ${config.projectPageUrl}\n`);
  },
  contentHeader: [
    `#! (c) ${new Date().getFullYear()} by ${config.licensedBy}. On ${
      config.license
    } license.\n`,
    `#! Developed by ${config.mainDeveloper}.\n`,
    '#!\n',
    `#!   Personal page: ${config.personalPageUrl}\n`,
    `#!   Repository url: ${config.projectPageUrl}\n`,
    '#!\n',
    `#! Generated by NodeJS Environment, on ${new Date().toISOString()}\n`,
    `#! Node iterpreter version, ${process.version}, platform: ${process.platform}`,
  ].join(''),
  printExecutableScriptInfo: function () {
    console.log(
      `Executing script from: ${path.basename(process.argv[1]).cyan}`
    );
  },
  printSelectedModeInfo: function (mode) {
    console.log(`Preparing for ${`"${mode}"`.cyan} mode.`);
  },
  parseExecutableProperties: function (command) {
    return {
      command: process.platform === 'win32' ? 'cmd' : 'bash',
      args: [process.platform === 'win32' ? '/c' : '-c', command],
    };
  },
  printSuccessMessage: function (message) {
    console.log(`SUCCESS! ${message}`.green);
  },
  printErrorMessage: function (message) {
    console.log(`ERROR! ${message}`.red);
  },
  printNewLine: function () {
    console.log();
  },
  checkIfPassedModeIsValid: function (mode) {
    if (mode !== 'dev' && mode !== 'prod') {
      this.printErrorMessage(
        'Unrecognized mode. Available only "dev" and "prod".'
      );
      process.exit(1);
    }
  },
  stopSucessSpinner: function (spinner, message, stage, allStages) {
    spinner.stop(true);
    console.log(`\u2713 [${stage}/${allStages}] ${message}.`.green);
  },
  stopErrorSpinner: function (spinner, message, stage, allStages) {
    spinner.stop(true);
    console.log(`X [${stage}/${allStages}] ${message}.`.red);
  },
  revalidateSpinnerContent: function (spinner, stage, allStages, content) {
    spinner.setSpinnerTitle(`[${stage}/${allStages}] ${content}`);
  },
  printBaseMigratorInfo: function (mode) {
    this.checkIfPassedModeIsValid(mode);
    this.printCopyHeader();
    this.printExecutableScriptInfo();
    this.printSelectedModeInfo(mode);
    this.printNewLine();
  },
  execCommonErrorContent: function (spinner, err, message, stage, allStages) {
    this.stopErrorSpinner(spinner, message, stage, allStages);
    this.printNewLine();
    this.printErrorMessage(err);
    throw new Error(err);
  },
  checkInputArguments: function (args) {
    const parsedOnErrorArgs = args.map(arg => `--${arg.name}`).join(', ');
    try {
      return commandLineArgs(args);
    } catch (err) {
      this.printErrorMessage(`Script takes arguments: ${parsedOnErrorArgs}.`);
      process.exit(1);
    }
  },
  printReplaceMode: function (isReplace) {
    if (isReplace) {
      console.log(`Executing script in ${'replace'.cyan} mode.`);
    }
  },
};
