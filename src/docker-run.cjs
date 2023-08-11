/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: docker-run.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-11, 20:44:40
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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sshpk = require('sshpk');
const { exec } = require('promisify-child-process');
const utils = require('./helpers/helpers.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const { submodules } = require('./config.cjs');

const composeFilePath = path.join(submodules.base.path, 'docker-compose.yml');
const rsaKeysDirPath = path.join(submodules.base.path, 'rsa-keys');
const envPath = path.join(submodules.base.path, '.env');

const servicePrefix = 'msph';
const availableService = [
  'content-distributor',
  'web-client',
  'landing-page',
  'all',
];
const rsaClientKeyName = 'id_rsa';
const rsaServerKeyName = 'id_srv_rsa';
const rsaKeys = [rsaClientKeyName, rsaServerKeyName];

const { mode, service } = utils.checkInputArguments([
  { name: 'mode', alias: 'm', type: String },
  { name: 'service', alias: 's', type: String },
]);

if (!availableService.some(s => s === service)) {
  utils.printErrorMessage(
    `Unrecognized service. Available only ${availableService.join(', ')}.`
  );
  process.exit(1);
}

utils.printBaseMigratorInfo(mode);
console.log(
  `Available services: ${availableService.map(s => s.cyan).join(', ')}.`
);
console.log(`Selected service: ${`${servicePrefix}-${service}`.cyan}.`);
utils.printNewLine();

const allStages = service === 'all' ? availableService.length : 2;
let currentStage = 1;

function checkIfKeyExist(keyName, suffix) {
  if (suffix === undefined || suffix === null) suffix = '';
  return fs.existsSync(path.join(rsaKeysDirPath, `${keyName}${suffix}`));
}

function rsaKeysPromiseGenerator() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
        }
        const pemKey = sshpk.parseKey(publicKey, 'pem');
        resolve({ publicKey: pemKey.toBuffer('ssh').toString(), privateKey });
      }
    );
  });
}

async function generateRsaKeys() {
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: 'Generating RSA keys for msph-content-distributor container',
  });
  const notExist = [];
  try {
    for (const rsaKey of rsaKeys) {
      if (checkIfKeyExist(rsaKey) && checkIfKeyExist(rsaKey, '.pub')) {
        utils.revalidateSpinnerContent(
          spinner,
          currentStage,
          allStages,
          `Key ${rsaKey.cyan} alredy exist in selected directory. Skipping.`
        );
        continue;
      }
      const { publicKey, privateKey } = await rsaKeysPromiseGenerator();
      await fs.promises.writeFile(
        path.join(rsaKeysDirPath, `${rsaKey}.pub`),
        publicKey
      );
      await fs.promises.writeFile(
        path.join(rsaKeysDirPath, rsaKey),
        privateKey
      );
      notExist.push(rsaKey);
      utils.revalidateSpinnerContent(
        spinner,
        currentStage,
        allStages,
        `Successfully generated and saved ${rsaKey.cyan}.`
      );
    }
    let message;
    if (notExist.length > 0) {
      message = `Successfully generated RSA key/s: ${notExist.join(', ')}`;
    } else {
      message = 'RSA keys already exist. Skipping';
    }
    utils.stopSucessSpinner(spinner, message, currentStage++, allStages);
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      'Unable to generate RSA key/s',
      currentStage,
      allStages
    );
    throw new Error(err);
  }
}

async function startDockerContainer(runService) {
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages:
      runService === 'all'
        ? 'Starting all docker containers'
        : `Starting docker container: ${runService.cyan}`,
  });
  try {
    let command = `cross-env ENV_BUILD_MODE=${mode} docker-compose --env-file ${envPath} -f ${composeFilePath} up -d`;
    if (runService !== 'all') {
      command += ` ${servicePrefix}-${runService}`;
    }
    await exec(command);
    utils.stopSucessSpinner(
      spinner,
      `Successfully started ${
        runService === 'all'
          ? 'all docker containers'
          : `docker container: ${runService}`
      }`,
      currentStage++,
      allStages
    );
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      `Unable to start docker container: ${runService}`,
      currentStage,
      allStages
    );
    throw new Error(err);
  }
}

async function processing() {
  try {
    await generateRsaKeys();
    if (service === 'all') {
      for (const containerService of availableService.filter(
        s => s !== 'all'
      )) {
        await startDockerContainer(containerService);
      }
    } else {
      await startDockerContainer(service);
    }
  } catch (err) {
    utils.printNewLine();
    utils.printErrorMessage(err);
    process.exit(1);
  }
}

processing().then(() => {
  utils.printNewLine();
  utils.printSuccessMessage('All processing was done.');
});
