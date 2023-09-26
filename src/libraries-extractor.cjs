'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
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

const containerName = submodules.s3Static.containerName;
const outputMarkdownfile = 'LIBRARIES.md';
const outputJsonfile = 'libraries.json';
const outputMarkdownPath = path.join(submodules.base.path, outputMarkdownfile);
const outputJsonDir = path.join(submodules.s3Static.path, 's3-static', 'misc');
const outputJsonPath = path.join(outputJsonDir, outputJsonfile);
const containerOutputPath = `/s3-transfer/misc/${outputJsonfile}`;
const s3ContainerPort = 9000;

utils.loadEnvVariables();

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

function dockerExec(command) {
  return `docker exec ${containerName} ${command}`;
}

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
    if (!fs.existsSync(outputJsonDir)) {
      fs.promises.mkdir(outputJsonDir);
    }
    await fs.promises.writeFile(
      outputJsonPath,
      JSON.stringify(
        outputLibsArray.map(({ name, repoUrl }) => ({
          name,
          repoUrl,
        }))
      ),
      { recursive: true }
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
      execCommand: dockerExec(utils.s3estabilishedConnCmd(s3ContainerPort)),
      messOnStart: 'Etabilishing connection with s3 bucket',
      messOnEnd: 'etabilished connection with s3 bucket',
      stage: currentStage++,
      allStages,
    });
    await promisifyUtils.createPromisifyProcess({
      execCommand: `docker exec ${containerName} mc cp ${containerOutputPath} miniotr/static/misc/${outputJsonfile}`,
      messOnStart: `Migrate ${outputJsonfile} file into s3 bucket`,
      messOnEnd: `migrated ${outputJsonfile} file into s3 bucket`,
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
