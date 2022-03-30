import fs from 'fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {promisify} from 'util';

import {createController, createRedux, createPage, createRestorePage} from './main';

const access = promisify(fs.access);

async function promptChoose() {
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Please choose type generate: ',
            choices: ['Create Redux', 'Create Page', 'Create Restore Page'],
        },
    ]);

    return answers.type;
}

async function promptCreateModule() {
    const questions = [
        {
            type: 'list',
            name: 'type',
            message: 'Please choose type generate: ',
            choices: ['Create Base Redux', 'Create Restore Redux'],
        },
        {
            type: 'input',
            name: 'name',
            message: 'Enter name (PascalCase): ',
            default: null,
        },
    ];

    const answers = await inquirer.prompt(questions);
    return {
        path: process.cwd(),
        type: answers.type,
        name: answers.name,
    };
}

async function promptCreatePages() {
    const questions = [
        {
            type: 'input',
            name: 'name',
            message: 'Enter name (PascalCase): ',
            default: null,
        },
        {
            type: 'input',
            name: 'field',
            message: 'Enter name field: ',
            default: null,
        },
        {
            type: 'input',
            name: 'translate',
            message: 'Enter Translated name: ',
            default: null,
        },
    ];

    const answers = await inquirer.prompt(questions);
    return {
        path: process.cwd(),
        name: answers.name,
        field: answers.field,
        translatedName: answers.translate,
    };
}

export async function cli(args) {
    const type = await promptChoose();

    if (type === 'Create Module') {
        const options = await promptCreateModule();

        try {
            await access(options.path, fs.constants.R_OK);
        } catch (err) {
            console.error('%s Invalid path %s', chalk.red.bold('ERROR'), chalk.black.bold(options.path));
            process.exit(1);
        }

        await createController(options);
    }
    if (type === 'Create Redux') {
        const options = await promptCreateModule();

        try {
            await access(options.path, fs.constants.R_OK);
        } catch (err) {
            console.error('%s Invalid path %s', chalk.red.bold('ERROR'), chalk.black.bold(options.path));
            process.exit(1);
        }

        await createRedux(options);
    }
    if (type === 'Create Page') {
        const options = await promptCreatePages();

        try {
            await access(options.path, fs.constants.R_OK);
        } catch (err) {
            console.error('%s Invalid path %s', chalk.red.bold('ERROR'), chalk.black.bold(options.path));
            process.exit(1);
        }
        await createPage(options);
    }

    if (type === 'Create Restore Page') {
        const options = await promptCreatePages();

        try {
            await access(options.path, fs.constants.R_OK);
        } catch (err) {
            console.error('%s Invalid path %s', chalk.red.bold('ERROR'), chalk.black.bold(options.path));
            process.exit(1);
        }
        await createRestorePage(options);
    }
}
