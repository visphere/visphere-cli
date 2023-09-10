'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sshpk = require('sshpk');
const { exec } = require('promisify-child-process');
const utils = require('./helpers/helpers.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const { submodules } = require('./config.cjs');

const composeFilePath = path.join(
  submodules.base.path,
  'docker',
  'docker-compose.yml'
);
const rsaKeysDirPath = path.join(submodules.base.path, 'rsa-keys');
const envPath = path.join(submodules.base.path, '.env');

const dockerignorePath = path.join(
  submodules.base.path,
  'docker',
  '.dockerignore'
);
const dockerignoreDest = path.resolve(__dirname, '..', '..', '.dockerignore');

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

const allStages = service === 'all' ? availableService.length + 2 : 4;
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

async function dockerignoreFileOperation({ messStart, messEnd, callback }) {
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: `${messStart} .dockerignore file`,
  });
  try {
    await callback();
    utils.stopSucessSpinner(
      spinner,
      `Successfully ${messEnd} .dockerignore file`,
      currentStage++,
      allStages
    );
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      `Failure ${messEnd} .dockerignore file`,
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
    let command = [
      `cross-env ENV_BUILD_MODE=${mode}`,
      'docker-compose',
      `--project-name moonsphere`,
      `--env-file ${envPath}`,
      `-f ${composeFilePath}`,
      'up -d',
    ].join(' ');
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
    await dockerignoreFileOperation({
      messStart: 'Copying',
      messEnd: 'copied',
      callback: async () => {
        fs.promises.copyFile(dockerignorePath, dockerignoreDest);
      },
    });
    if (service === 'all') {
      for (const containerService of availableService.filter(
        s => s !== 'all'
      )) {
        await startDockerContainer(containerService);
      }
    } else {
      await startDockerContainer(service);
    }
    await dockerignoreFileOperation({
      messStart: 'Removing',
      messEnd: 'removed',
      callback: async () => {
        fs.promises.rm(dockerignoreDest);
      },
    });
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
