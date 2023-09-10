'use strict';
/*
 * Copyright (c) 2023 by MoonSphere Systems
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const path = require('path');

module.exports = {
  personalPageUrl: 'https://miloszgilga.pl',
  projectPageUrl: 'https://github.com/moonsphere-systems',
  licensedBy: 'MoonSphere Systems',
  license: 'Apache 2.0',
  mainDeveloper: 'MILOSZ GILGA',
  submodules: {
    contentDistributor: {
      path: path.resolve(
        __dirname,
        '..',
        '..',
        'moonsphere-content-distributor'
      ),
      containerName: 'msph-content-distributor',
    },
    webClient: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-web-client'),
      containerName: 'msph-web-client',
    },
    landingPage: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-landing-page'),
      containerName: 'msph-landing-page',
    },
    desktopClient: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-desktop-client'),
      containerName: null,
    },
    base: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-base'),
      containerName: null,
    },
    scripts: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-cli'),
      containerName: null,
    },
    infraMonorepo: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-infra-monorepo'),
      containerName: null,
    },
  },
};
