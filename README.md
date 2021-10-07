![Logo](media/images/banner.png)

<div align="center">

![JavaScript](https://img.shields.io/badge/ES6-Supported-yellow.svg?style=for-the-badge&logo=JavaScript) ![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue.svg?style=for-the-badge&logo=Typescript)

[![CI](https://github.com/GiovanniCardamone/fastauto/actions/workflows/npm-ci.yml/badge.svg)](https://github.com/GiovanniCardamone/fastauto/actions/workflows/npm-ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/GiovanniCardamone/fastauto/badge.svg?branch=main)](https://coveralls.io/github/GiovanniCardamone/fastauto?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/github/GiovanniCardamone/fastauto/badge.svg)](https://snyk.io/test/github/GiovanniCardamone/fastauto)
[![NPM version](https://img.shields.io/npm/v/fastauto.svg?style=plastic)](https://www.npmjs.com/package/fastauto)
[![NPM downloads](https://img.shields.io/npm/dm/fastauto.svg?style=plastic)](https://www.npmjs.com/package/fastauto)

</div>

FastAuto is a cli tool for generate routes / security files

## :package: Installation

```bash
npm install -g fastauto
```

## :rocket: Simple Usage

### route

generate a route file

```bash
fastauto route users/{userId}/photos.ts
```

### security

```bash
fastauto security bearer bearerToken.ts
```

## :books: Documentation

[Full Documentation](https://giovannicardam.one/fastauto)

## :label: License

[MIT](https://github.com/GiovanniCardamone/fastauto/blob/main/LICENSE)
