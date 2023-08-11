/*
 * Copyright (c) 2023 by MILOSZ GILGA <https://miloszgilga.pl>
 * Silesian University of Technology
 *
 *   File name: config.cjs
 *   Created at: 2023-08-10, 22:29:41
 *   Last updated at: 2023-08-11, 20:44:34
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
      dockerContainerName: 'msph-content-distributor',
    },
    webClient: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-web-client'),
      dockerContainerName: 'msph-web-client',
    },
    landingPage: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-landing-page'),
      dockerContainerName: 'msph-landing-page',
    },
    desktopClient: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-desktop-client'),
      dockerContainerName: null,
    },
    base: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-base'),
      dockerContainerName: null,
    },
    scripts: {
      path: path.resolve(__dirname, '..', '..', 'moonsphere-scripts'),
      dockerContainerName: null,
    },
  },
};
