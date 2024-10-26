# TVB Booking System

This is a POC of the Booking System for TVB Volleyball Socials

## Backlog
https://trello.com/b/TGWE4CBB/tvb-booking-system

## Architecture
https://app.diagrams.net/#G1NKIMv0nWe2Xa_wqaRgJka8gzRfYWEjoC


## Development

### Getting Started

This project uses 
- Vite and React for frontend web application
- Node.js/Bun.js and Elysia for backend server

change directory to corresponding frontend or backend folder

Install dependencies with [npm](https://docs.npmjs.com/cli) (more stable) or [bun](https://bun.sh/docs)

```sh
npm install 
or 
bun install
```

to run in dev mode you can use 
```sh
npm run dev
or
bun run dev
```


## Known issues
- "Chrome is moving towards a new experience that allows users to choose to browse without third-party cookies." keeps generating due to using google pay and google is infinitely generating this now in one of the log.js files


### Testing

You can run all linters, tests, and builds like CI with `npm test`.

#### Unit

[Jest](https://jestjs.io/en/) is used as the testing framework providing the runner, structure, assertions, mocks, and coverage among other features.

```sh
npm run test:unit
```

### Linting

You can run all linters with `npm run lint`.

#### ESLint

[ESLint](https://eslint.org/) analyzes the code to find and fix problems. We use [eslint-plugin-square](https://github.com/square/eslint-plugin-square) for out-of-the-box configuration.

```sh
npm run lint:eslint
```

##### Fixing warnings and errors automatically

ESLint can sometimes fix warnings and errors automatically for you with its [--fix option](https://eslint.org/docs/user-guide/command-line-interface#fixing-problems).

```sh
npm run lint:eslint --fix
```

#### Prettier

[Prettier](https://prettier.io/) is an opinionated code formatter. We use [@square/prettier-config](https://github.com/square/prettier-config) for those opinions.

```sh
npm run lint:prettier
```

##### Fixing code style issues

If after running `npm run lint:prettier` you get a warning like, "Code style issues found in the above file(s). Forgot to run Prettier?", you can have Prettier fix them.

```sh
npm run lint:prettier:fix
```

### Building

[TypeScript](https://www.typescriptlang.org/) is used to build the module that is published to npm.

```sh
npm run build
```

### Conventional Commits

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) are used for commit messages which allows us to automate changelogs and releases that dovetail with [SemVer](http://semver.org/).

## Continuous Integration

[GitHub Actions](https://docs.github.com/en/actions) is used for our CI/CD workflows. See `.github/workflows` for details.

