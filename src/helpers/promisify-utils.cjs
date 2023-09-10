'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
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
