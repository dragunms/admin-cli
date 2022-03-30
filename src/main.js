import _ from 'lodash';
import fs from 'fs';
import pluralize from 'pluralize';
import Listr from 'listr';
import mkdirp from 'mkdirp';
import {js as jsBeautify} from 'js-beautify';
import ejs from 'ejs';
import {exec} from 'child_process';

const templateControllerDir = `${__dirname}/templates/controller`;
const templateReduxDir = `${__dirname}/templates/redux`;
const templateApiDir = `${__dirname}/templates/API`;
const templatePageDir = `${__dirname}/templates/pages`;

function generateName(pascalName) {
    const name = {
        pascal: pascalName,
        snake: _.snakeCase(pascalName),
        camel: _.camelCase(pascalName),
        constant: _.upperCase(pascalName).replace(/ /g, '_'),
        kebab: _.kebabCase(pascalName),
    };
    name.camelPlural = pluralize(name.camel);
    name.snakePlural = pluralize(name.snake);
    name.pascalPlural = pluralize(name.pascal);
    return name;
}

async function createControllerFile(params, copyDir) {
    const text = await ejs.renderFile(`${templateControllerDir}/controller.ejs`, params);

    // fs.writeFileSync(`${copyDir}/controller.js`, jsBeautify(text));
}
async function createReduxFile(params, copyDir) {
    const saga = await ejs.renderFile(`${templateReduxDir}/saga.ejs`, params);
    const action = await ejs.renderFile(`${templateReduxDir}/action.ejs`, params);
    const reducer = await ejs.renderFile(`${templateReduxDir}/reducer.ejs`, params);
    const api = await ejs.renderFile(`${templateApiDir}/api.ejs`, params);

    fs.writeFileSync(`${copyDir}redux/${params.camelPlural}/saga.js`, jsBeautify(saga));
    fs.writeFileSync(`${copyDir}redux/${params.camelPlural}/action.js`, jsBeautify(action));
    fs.writeFileSync(`${copyDir}redux/${params.camelPlural}/reducer.js`, jsBeautify(reducer));
    fs.writeFileSync(`${copyDir}apis/${params.pascal}ServiceAPI.js`, jsBeautify(api));

    fs.readFile(`${copyDir}redux/reducer.js`, 'utf8', function (err, data) {
        const insertReducer = data
            .replace('// insert reducer', `${params.camelPlural}, \n // insert reducer `)
            .replace(
                '// insert import',
                `import ${params.camelPlural} from './${params.camelPlural}/reducer'; \n// insert import `
            );
        fs.writeFile(`${copyDir}redux/reducer.js`, insertReducer, function (error) {
            if (error) console.log(error);
        });
    });
    fs.readFile(`${copyDir}redux/saga.js`, 'utf8', function (err, data) {
        const insertReducer = data
            .replace('// insert saga', `${params.camelPlural}(), \n// insert saga `)
            .replace(
                '// insert import',
                `import ${params.camelPlural} from './${params.camelPlural}/saga'; \n// insert import `
            );
        fs.writeFile(`${copyDir}redux/saga.js`, insertReducer, function (error) {
            if (error) console.log(error);
        });
    });
    fs.readFile(`${copyDir}constants/apiEndpoints.js`, 'utf8', function (err, data) {
        // eslint-disable-next-line no-template-curly-in-string
        const text = '${process.env.REACT_APP_API_URL}';
        const insertEndpoint = data.replace(
            '// insert end points end',
            `export const ${params.constant}_ENDPOINT = \`${text}/${params.snakePlural}\`; \n// insert end points end`
        );
        fs.writeFile(`${copyDir}constants/apiEndpoints.js`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });
}

async function createPageFile(params, copyDir) {
    const list = await ejs.renderFile(`${templatePageDir}/list.ejs`, params);
    const edit = await ejs.renderFile(`${templatePageDir}/edit.ejs`, params);
    const styles = await ejs.renderFile(`${templatePageDir}/styles.ejs`, params);
    const restore = await ejs.renderFile(`${templatePageDir}/restore.ejs`, params);
    fs.writeFileSync(`${copyDir}pages/${params.pascal}Page/ListPage/index.js`, jsBeautify(list));
    fs.writeFileSync(`${copyDir}pages/${params.pascal}Page/EditPage/index.js`, jsBeautify(edit));
    fs.writeFileSync(`${copyDir}pages/${params.pascal}Page/EditPage/styles.less`, styles);
    fs.writeFileSync(`${copyDir}pages/${params.pascal}Page/RestorePage/index.js`, jsBeautify(restore));
    fs.readFile(`${copyDir}constants/subPaths.js`, 'utf8', function (err, data) {
        const insertEndpoint = data.replace(
            '// insert end points end',
            `export const ${params.constant}_PATH = {
        LIST: {
            PATH: '/${params.kebab}/list',
            MATCH: '/${params.kebab}/list',
        },
        EDIT: {
            PATH: '/${params.kebab}/edit',
            MATCH: '/${params.kebab}/edit/:id([a-zA-Z0-9]+)',
        },
        ADD: {
            PATH: '/${params.kebab}/add',
            MATCH: '/${params.kebab}/add',
        },
        RESTORE: {
            PATH: '/${params.kebab}/restore',
            MATCH: '/${params.kebab}/restore',
        },
    };\n// insert end points end`
        );
        fs.writeFile(`${copyDir}constants/subPaths.js`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });

    fs.readFile(`${copyDir}configs/sideBar.js`, 'utf8', function (err, data) {
        const insertEndpoint = data
            .replace(
                '// insert end points end',
                `{
                    title: 'sidebar.${params.snake}',
                    icon: <GoDashboard />,
                    key: '${params.kebab}',
                    roles: [${params.constant}_ROLE.READ],
                    list: [
                        {
                            title: 'sidebar.list',
                            path: ${params.constant}_PATH.LIST.PATH,
                            icon: <RiPlayListAddFill />,
                            roles: [${params.constant}_ROLE.READ],
                        },
                        {
                            title: 'sidebar.add',
                            path: ${params.constant}_PATH.ADD.PATH,
                            icon: <IoAddCircleOutline />,
                            roles: [${params.constant}_ROLE.CREATE],
                        },
                        {
                            title: 'sidebar.restore',
                            path: ${params.constant}_PATH.RESTORE.PATH,
                            icon: <MdRestore />,
                            roles: [${params.constant}_ROLE.RESTORE],
                        },
                    ],
                },\n// insert end points end`
            )
            .replace('// insert import', `${params.constant}_PATH,\n// insert import`)
            .replace('// insert role', `${params.constant}_ROLE,\n// insert role`);
        fs.writeFile(`${copyDir}configs/sideBar.js`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });

    fs.readFile(`${copyDir}routes/config.js`, 'utf8', function (err, data) {
        const insertEndpoint = data
            .replace(
                '// insert end points end',
                `{
                auth: true,
                path: ${params.constant}_PATH.LIST.MATCH,
                page: asyncComponent(() => import('src/pages/${params.pascal}Page/ListPage')),
            },
            {
                auth: true,
                path: ${params.constant}_PATH.EDIT.MATCH,
                page: asyncComponent(() => import('src/pages/${params.pascal}Page/EditPage')),
            },
            {
                auth: true,
                path: ${params.constant}_PATH.ADD.MATCH,
                page: asyncComponent(() => import('src/pages/${params.pascal}Page/EditPage')),
            },
            {
                auth: true,
                path: ${params.constant}_PATH.RESTORE.MATCH,
                page: asyncComponent(() => import('src/pages/${params.pascal}Page/RestorePage')),
            },\n// insert end points end`
            )
            .replace('// insert import', `${params.constant}_PATH,\n// insert import`);
        fs.writeFile(`${copyDir}routes/config.js`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });

    fs.readFile(`${copyDir}LngProvider/locales/vi_VN.json`, 'utf8', function (err, data) {
        const insertEndpoint = data.replace(
            '"test": "test"',
            `"${params.snake}": "${params.translatedName}",
                "${params.snake}_list": "Danh sách ${params.translatedName}",\n"test": "test"`
        );

        fs.writeFile(`${copyDir}LngProvider/locales/vi_VN.json`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });
}

async function createRestorePageFile(params, copyDir) {
    const list = await ejs.renderFile(`${templatePageDir}/restore.ejs`, params);
    fs.writeFileSync(`${copyDir}pages/${params.pascal}Page/RestorePage/index.js`, jsBeautify(list));

    fs.readFile(`${copyDir}routes/config.js`, 'utf8', function (err, data) {
        const insertEndpoint = data
            .replace(
                '// insert end points end',
                `
            {
                auth: true,
                path: ${params.constant}_PATH.RESTORE.MATCH,
                page: asyncComponent(() => import('src/pages/${params.pascal}Page/RestorePage')),
            },\n// insert end points end`
            )
        fs.writeFile(`${copyDir}routes/config.js`, insertEndpoint, function (error) {
            if (error) console.log(error);
        });
    });
}

async function formatFile(params, copyDir) {
    await exec(`prettier --write "${copyDir}constants/subPaths.js"`);
    await exec(`prettier --write "${copyDir}configs/sideBar.js"`);
    await exec(`prettier --write "${copyDir}LngProvider/locales/vi_VN.json"`);
    await exec(`prettier --write "src/${params.pascal}Page/**/*.js"`);
}

export async function createController(options) {
    const name = generateName(options.name);
    const params = {
        app: options.app,
        ...name,
    };
    const copyDir = `${options.path}/src/`;
    const tasks = new Listr([
        {
            title: `Create folder ${name.camel}`,
            task: async () => {
                if (!fs.existsSync(copyDir)) {
                    await mkdirp(copyDir);
                }
            },
        },
        {
            title: 'Copy controller',
            task: () => createControllerFile(params, copyDir),
        },
    ]);

    tasks.run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

export async function createRedux(options) {
    const name = generateName(options.name);

    const type = options.type === 'Create Base Redux' ? 'deleteData' : 'postData';

    const params = {
        app: options.app,
        type,
        ...name,
    };

    const copyDir = `${options.path}/src/`;
    const tasks = new Listr([
        {
            title: `Create folder ${name.camelPlural}`,
            task: async () => {
                if (!fs.existsSync(`${copyDir}redux/${name.camelPlural}`)) {
                    await mkdirp(`${copyDir}redux/${name.camelPlural}`);
                }
            },
        },
        {
            title: 'Copy Redux',
            task: () => createReduxFile(params, copyDir),
        },
    ]);

    tasks.run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

export async function createPage(options) {
    const name = generateName(options.name);
    const params = {
        app: options.app,
        field: options.field,
        translatedName: options.translatedName,
        ...name,
    };
    const copyDir = `${options.path}/src/`;
    const tasks = new Listr([
        {
            title: `Create folder ${name.camelPlural}`,
            task: async () => {
                if (!fs.existsSync(`${copyDir}pages/${name.pascal}Page`)) {
                    await mkdirp(`${copyDir}pages/${name.pascal}Page`);
                    await mkdirp(`${copyDir}pages/${name.pascal}Page/EditPage`);
                    await mkdirp(`${copyDir}pages/${name.pascal}Page/ListPage`);
                    await mkdirp(`${copyDir}pages/${name.pascal}Page/RestorePage`);
                }
            },
        },
        {
            title: 'Copy Pages',
            task: () => createPageFile(params, copyDir),
        },
        {
            title: 'Prettier Formatted',
            task: () => formatFile(params, copyDir),
        },
    ]);

    tasks.run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

export async function createRestorePage(options) {
    const name = generateName(options.name);
    const params = {
        app: options.app,
        field: options.field,
        translatedName: options.translatedName,
        ...name,
    };
    const copyDir = `${options.path}/src/`;
    const tasks = new Listr([
        {
            title: `Create folder ${name.camelPlural}`,
            task: async () => {
                if (fs.existsSync(`${copyDir}pages/${name.pascal}Page`)) {
                    if (!fs.existsSync(`${copyDir}pages/${name.pascal}Page/RestorePage`)) {
                        await mkdirp(`${copyDir}pages/${name.pascal}Page/RestorePage`);
                    }
                }
            },
        },
        {
            title: 'Copy Pages',
            task: () => createRestorePageFile(params, copyDir),
        },
        {
            title: 'Prettier Formatted',
            task: () => formatFile(params, copyDir),
        },
    ]);
    tasks.run().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
