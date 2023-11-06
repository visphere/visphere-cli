'use strict';
/*
 * Copyright (c) 2023 by Visphere & Vsph Technologies
 * Originally developed by Miłosz Gilga <https://miloszgilga.pl>
 */
const path = require('path');

module.exports = {
  personalPageUrl: 'https://miloszgilga.pl',
  projectPageUrl: 'https://github.com/visphere',
  licensedBy: 'Visphere',
  mainDeveloper: 'MILOSZ GILGA',
  submodules: {
    s3Static: {
      path: path.resolve(__dirname, '..', '..', 'visphere-base'),
      containerName: 'vsph-s3-static',
    },
    webClient: {
      path: path.resolve(__dirname, '..', '..', 'visphere-web-client'),
      containerName: 'vsph-web-client',
    },
    landingPage: {
      path: path.resolve(__dirname, '..', '..', 'visphere-landing-page'),
      containerName: 'vsph-landing-page',
    },
    desktopClient: {
      path: path.resolve(__dirname, '..', '..', 'visphere-desktop-client'),
      containerName: null,
    },
    base: {
      path: path.resolve(__dirname, '..', '..', 'visphere-base'),
      containerName: null,
    },
    scripts: {
      path: path.resolve(__dirname, '..', '..', 'visphere-cli'),
      containerName: null,
    },
    mailParser: {
      path: path.resolve(__dirname, '..', '..', 'visphere-mail-parser'),
      containerName: null,
    },
    infraMonorepo: {
      path: path.resolve(__dirname, '..', '..', 'visphere-infra-monorepo'),
      containerName: null,
    },
  },
};
