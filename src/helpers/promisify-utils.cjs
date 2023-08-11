/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: promisify-utils.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-11, 20:44:14
 *
 *   Project name: moonsphere
 *   Module name: moonsphere-scripts
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

const { Spinner } = require('cli-spinner');
const { spawn, exec } = require('promisify-child-process');
const utils = require('./helpers.cjs');

module.exports = {
  createPromisifyProcess: async function ({
    execCommand,
    messOnStart,
    messOnEnd,
    stage,
    allStages,
    options,
  }) {
    const { command, args } = utils.parseExecutableProperties(execCommand);
    const spinner = this.createAndStartSpinner({
      stage,
      allStages,
      messages: messOnStart,
    });
    try {
      await spawn(command, args, options || {});
      utils.stopSucessSpinner(
        spinner,
        `Successfully ${messOnEnd}`,
        stage,
        allStages
      );
    } catch (err) {
      utils.execCommonErrorContent(
        spinner,
        err,
        `Failure ${messOnEnd}`,
        stage,
        allStages
      );
      throw new Error(err);
    }
  },
  checkIfDockerContainerIsRunning: async function ({
    containerName,
    stage,
    allStages,
  }) {
    const endFailureMessage = `Container "${containerName}" is not running`;
    const spinner = this.createAndStartSpinner({
      stage,
      allStages,
      messages: `Checking, if container ${containerName.cyan} is running`,
    });
    try {
      const { stdout, stderr } = await exec(
        `docker inspect --format="{{ .State.Running }}" "${containerName}"`
      );
      const parsed = JSON.parse(stdout.replaceAll(/\n/g, ''));
      if (!parsed) {
        throw new Error(stderr || endFailureMessage);
      }
      utils.stopSucessSpinner(
        spinner,
        `Container "${containerName}" is running`,
        stage,
        allStages
      );
    } catch (err) {
      utils.execCommonErrorContent(
        spinner,
        err,
        endFailureMessage,
        stage,
        allStages
      );
      throw new Error(err);
    }
  },
  createAndStartSpinner: function ({ stage, allStages, messages }) {
    const spinner = new Spinner(`%s [${stage}/${allStages}] ${messages}...`);
    spinner.start();
    return spinner;
  },
};
