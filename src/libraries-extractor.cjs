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
const normalizeData = require('normalize-package-data');
const utils = require('./helpers/helpers.cjs');
const { submodules } = require('./config.cjs');
const promisifyUtils = require('./helpers/promisify-utils.cjs');
const staticReplacements = require('./utils/migrator-static-replacements');

const scanningModules = [
  { name: 'moonsphere-base', dir: submodules.base.path },
  { name: 'moonsphere-scripts', dir: submodules.scripts.path },
  { name: 'moonsphere-web-client', dir: submodules.webClient.path },
  { name: 'moonsphere-desktop-client', dir: submodules.desktopClient.path },
  { name: 'moonsphere-landing-page', dir: submodules.landingPage.path },
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
  `Scanning packages: ${scanningModules.map(p => p.cyan).join(', ')}`
);
console.log(
  `Output files: [ ${outputMarkdownfile.cyan}, ${outputJsonfile.cyan} ]`
);

utils.printNewLine();

const allStages = 4 + scanningModules.length;
let currentStage = 1;

async function findPackageJsonFiles(directory) {
  const packageJsonFiles = [];
  const topLevelFiles = await fs.promises.readdir(directory, {
    withFileTypes: true,
  });
  await Promise.all(
    topLevelFiles.map(async topLevelFile => {
      const topLevelFilePath = path.join(directory, topLevelFile.name);
      if (!topLevelFile.isDirectory() || topLevelFile.name === 'node_modules') {
        return;
      }
      const topLevelNestedFiles = await fs.promises.readdir(topLevelFilePath, {
        withFileTypes: true,
      });
      if (
        !topLevelNestedFiles.some(
          nestedFile => nestedFile.name === 'package.json'
        )
      ) {
        await Promise.all(
          topLevelNestedFiles.map(async topLevelNestedFile => {
            const topLevelNestedFilePath = path.join(
              topLevelFilePath,
              topLevelNestedFile.name
            );
            if (
              !topLevelNestedFile.isDirectory() ||
              topLevelNestedFile.name === 'node_modules'
            ) {
              return;
            }
            const nestedNestedFiles = await fs.promises.readdir(
              topLevelNestedFilePath,
              { withFileTypes: true }
            );
            if (
              nestedNestedFiles.some(
                nestedFile => nestedFile.name === 'package.json'
              )
            ) {
              packageJsonFiles.push(
                path.join(topLevelNestedFilePath, 'package.json')
              );
            }
          })
        );
      } else {
        packageJsonFiles.push(path.join(topLevelFilePath, 'package.json'));
      }
    })
  );
  return packageJsonFiles;
}

function sortPackages(allDeps) {
  return allDeps.sort((x, y) => x.name.localeCompare(y.name));
}

async function scanNodePackages({ name, dir }) {
  const allPackages = [];
  let scannedLibsCount = 0;
  let allPackagesCount = 0;
  const spinner = promisifyUtils.createAndStartSpinner({
    stage: currentStage,
    allStages,
    messages: `Scanning "package.json" files from ${name}`,
  });
  try {
    const dirPath = `${dir}/node_modules`;
    const packageJsonFiles = await findPackageJsonFiles(dirPath);
    for (const packageJsonFile of packageJsonFiles) {
      const rawPackageData = await fs.promises.readFile(packageJsonFile);
      const packageData = JSON.parse(rawPackageData);
      allPackagesCount++;
      try {
        normalizeData(packageData, true);
      } catch (err) {
        continue;
      }
      if (packageData?.name) {
        utils.revalidateSpinnerContent(
          spinner,
          currentStage,
          allStages,
          `${scannedLibsCount++}/${packageJsonFiles.length} Scanning: ${
            packageData?.name
          }.`
        );
        const repoUrl = packageData?.repository?.url.replace(
          /^(git(?:\+(?:https|ssh)|):\/\/(?:[^@]+@|)github\.com\/)(.*?)(\.git)(?:#.*)?$/,
          'https://github.com/$2'
        );
        const { name, license } = packageData;
        if (
          !allPackages.some(({ name: packageName }) => packageName === name)
        ) {
          const replacement = staticReplacements.find(
            ({ name: replName }) => replName === name
          );
          if (replacement) {
            const { name, repoUrl, license } = replacement;
            allPackages.push({ name, repoUrl, license });
          } else {
            allPackages.push({
              name,
              repoUrl: repoUrl || 'https://github.com',
              license:
                (license?.type ? license.type : license) || 'Not specified',
            });
          }
        }
      }
    }
  } catch (err) {
    utils.stopErrorSpinner(
      spinner,
      `Unable to scan some of the packages from ${name}`,
      currentStage,
      allStages
    );
    throw new Error(err);
  }
  const endMess = `Ended scanning "package.json" files from ${name}.`;
  const resolve = `Resolve ${scannedLibsCount} of ${allPackagesCount} packages`;
  utils.stopSucessSpinner(
    spinner,
    `${endMess} ${resolve}`,
    currentStage++,
    allStages
  );
  return sortPackages(allPackages);
}

async function scanAllModules() {
  const allDeps = [];
  for (const scanningModule of scanningModules) {
    const allPackages = await scanNodePackages(scanningModule);
    allDeps.push(
      ...allPackages.filter(
        ({ name }) => !allDeps.some(({ name: deptName }) => deptName === name)
      )
    );
  }
  return sortPackages(allDeps);
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
    const librariesCountTrivia = `All used 3rd party libraries count: **${outputLibsArray.length}**<br>\n`;
    await fs.promises.writeFile(outputMarkdownPath, librariesCountTrivia);
    const table = markdownTable([
      ['Library', 'License'],
      ...outputLibsArray.map(({ name, repoUrl, license }) => [
        `[${name}](${repoUrl})`,
        license,
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
        outputLibsArray.map(({ name, repoUrl }) => ({
          name,
          repoUrl,
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
    const outputLibsArray = await scanAllModules();
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
