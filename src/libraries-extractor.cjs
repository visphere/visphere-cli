'use strict';
/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: libraries-extractor.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-14, 01:57:13
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
const lodash = require('lodash');
const axios = require('axios');
const utils = require('./helpers/helpers.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const { submodules } = require('./config.cjs');

const scanningPackages = [
  submodules.base.path,
  submodules.scripts.path,
  submodules.webClient.path,
  submodules.desktopClient.path,
  submodules.landingPage.path,
];

const staticReplacements = [
  {
    name: '@ngx-translate/core',
    repoUrl: 'https://github.com/ngx-translate/core',
    license: 'MIT',
    env: 'runtime',
  },
  {
    name: '@ngx-translate/http-loader',
    repoUrl: 'https://github.com/ngx-translate/core',
    license: 'MIT',
    env: 'runtime',
  },
];

const containerName = submodules.contentDistributor.containerName;

const outputMarkdownfile = 'LIBRARIES.md';
const outputJsonfile = 'libraries.json';
const outputMarkdownPath = path.join(submodules.base.path, outputMarkdownfile);
const outputJsonPath = path.join(
  submodules.contentDistributor.path,
  'content',
  'static',
  'misc',
  outputJsonfile
);

utils.printCopyHeader();
utils.printExecutableScriptInfo();

console.log(
  `Scanning packages: ${scanningPackages.map(p => p.cyan).join(', ')}`
);
console.log(
  `Output files: [ ${outputMarkdownfile.cyan}, ${outputJsonfile.cyan} ]`
);

utils.printNewLine();

const allStages = 6;
let currentStage = 1;

async function readAllScannedPackagesDependencies() {
  const resultsArray = [];
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: 'Scanning "package.json" files',
  });
  try {
    for (const packagePath of scanningPackages) {
      const data = await fs.promises.readFile(
        path.join(packagePath, 'package.json')
      );
      const parsedData = JSON.parse(data.toString());

      const depSection = parsedData.dependencies;
      const devDepSection = parsedData.devDependencies;
      if (depSection) {
        resultsArray.push(
          ...Object.keys(depSection).map(name => ({ name, env: 'runtime' }))
        );
      }
      if (devDepSection) {
        resultsArray.push(
          ...Object.keys(devDepSection).map(name => ({
            name,
            env: 'development',
          }))
        );
      }
    }
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      'Unable to scan some of the packages',
      currentStage,
      allStages
    );
    throw new Error(err);
  }
  const resultArr = lodash
    .uniqBy(resultsArray, 'name')
    .sort((x, y) => x.name.localeCompare(y.name));
  utils.stopSucessSpinner(
    spinner,
    `Ended scanning "package.json" files. Resolve ${resultArr.length} dependencies`,
    currentStage++,
    allStages
  );
  return resultArr;
}

async function connectWithApiAndGenerateOutputObject(allLibrariesNames) {
  const outputArray = [];
  let fetchedSucceed = 0;
  let index = 1;
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: 'Fetching additional informations for scanned libraries',
  });
  try {
    for (const { name, env } of allLibrariesNames) {
      const replacer = staticReplacements.find(
        ({ name: pName }) => pName === name
      );
      const libraryColorName = name.cyan;
      if (!replacer) {
        const { data } = await axios.get(
          `https://registry.npmjs.org/${name}/latest`
        );
        if (data) fetchedSucceed++;
        let repoUrl = '';
        if (data.repository) {
          repoUrl = data.repository.url;
          const matchRegexp = repoUrl.match(/\.com\/(.+?)\.git$/);
          if (matchRegexp) {
            repoUrl = `https://github.com/${matchRegexp[1]}`;
          }
        } else if (data.homepage) {
          repoUrl = data.homepage;
        }
        outputArray.push({ name, repoUrl, license: data.license, env });
        utils.revalidateSpinnerContent(
          spinner,
          currentStage,
          allStages,
          `${index++}/${
            allLibrariesNames.length
          } Fetched data for: ${libraryColorName}.`
        );
      } else {
        outputArray.push(replacer);
        utils.revalidateSpinnerContent(
          spinner,
          currentStage,
          allStages,
          `${index++}/${
            allLibrariesNames.length
          } Skipping fetching data for: ${libraryColorName}.`
        );
      }
    }
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      'Unable to fetch additional informations for scanned libraries',
      currentStage,
      allStages
    );
    throw new Error(err);
  }
  const percentage = Math.ceil(
    (fetchedSucceed / allLibrariesNames.length) * 100
  );
  const coverageInfo = `${fetchedSucceed} of ${allLibrariesNames.length} (coverage: ${percentage}%)`;
  utils.stopSucessSpinner(
    spinner,
    `Fetched additional informations for ${coverageInfo} scanned libraries`,
    currentStage++,
    allStages
  );
  return outputArray;
}

async function saveContentToLibrariesFiles(outputLibsArray) {
  const { markdownTable } = await import('markdown-table');
  let currentOutput = 0;
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: 'Saving generated libraries data in output files...',
  });
  try {
    const librariesCountTrivia = [
      `All used 3rd party libraries count: **${outputLibsArray.length}**<br>\n`,
      `Runtime 3rd party libraries count: **${
        outputLibsArray.filter(d => d.env === 'runtime').length
      }**<br>\n`,
      `Development 3rd party libraries count: **${
        outputLibsArray.filter(d => d.env === 'development').length
      }**\n\n`,
    ].join('');
    await fs.promises.writeFile(outputMarkdownPath, librariesCountTrivia);
    const table = markdownTable([
      ['Library', 'License', 'Environment'],
      ...outputLibsArray.map(({ name, repoUrl, license, env }) => [
        `[${name}](${repoUrl})`,
        license,
        env,
      ]),
    ]);
    await fs.promises.appendFile(outputMarkdownPath, table + '\n');
    utils.revalidateSpinnerContent(
      spinner,
      currentStage,
      allStages,
      `${++currentOutput}/2 Saved data to file: ${outputMarkdownfile.cyan}.`
    );
    await fs.promises.writeFile(
      outputJsonPath,
      JSON.stringify(
        outputLibsArray.map(({ name, repoUrl, license, env }) => ({
          name,
          repoUrl,
          license,
          env,
        }))
      )
    );
    utils.revalidateSpinnerContent(
      spinner,
      currentStage,
      allStages,
      `${currentOutput++}/2 Saved data to file: ${outputJsonfile.cyan}.`
    );
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      'Unable to save data in some output file/s',
      currentStage,
      allStages
    );
    throw new Error(err);
  }
  utils.stopSucessSpinner(
    spinner,
    `Successfully saved data in output files (${currentOutput}/2)`,
    currentStage++,
    allStages
  );
}

async function processing() {
  try {
    await promisifyUtils.checkIfDockerContainerIsRunning({
      containerName,
      stage: currentStage++,
      allStages,
    });
    const allLibrariesNames = await readAllScannedPackagesDependencies();
    const outputLibsArray = await connectWithApiAndGenerateOutputObject(
      allLibrariesNames
    );
    await saveContentToLibrariesFiles(outputLibsArray);
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} rm -rf /var/www/html/static/misc/${outputJsonfile}`,
      messOnStart: `Removing ${outputJsonfile} file from docker container`,
      messOnEnd: `removed ${outputJsonfile} file from docker container`,
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker cp ${outputJsonPath} ${containerName}:/var/www/html/static/misc/`,
      messOnStart: `Migrate ${outputJsonfile} file into docker container`,
      messOnEnd: `migrated ${outputJsonfile} file into docker container`,
      stage: currentStage++,
      allStages,
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
