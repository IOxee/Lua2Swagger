const fs = require('fs').promises;
const fsp = require('fs');
const path = require('path');
const inquirer = require('./inquirer');
const yaml = require('js-yaml');

let projectName = '';
let projectDescription = '';

async function listFiles(directory) {
    try {
        const files = await fs.readdir(directory);
        return files;
    } catch (error) {
        console.error("Error reading the directory:", error);
        return [];
    }
}

async function readFileContent(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        console.error("Error reading the file:", error);
        return null;
    }
}

function parseEndpointData(lines) {
    const endpointInfo = {
        name: '',
        summary: '',
        description: '',
        tags: '',
        params: [],
        responses: {},
        examples: {}
    };

    lines.forEach(line => {
        const match = line.match(/--- @(\w+)(?: (.*))?/);
        if (match) {
            const key = match[1];
            const value = match[2] ? match[2].trim() : '';

            if (key === 'param') {
                endpointInfo.params.push(value);
            } else if (key === 'response') {
                const responseDetail = value.match(/(\d{3}) (.+)/);
                if (responseDetail) {
                    const statusCode = responseDetail[1];
                    const description = responseDetail[2];

                    endpointInfo.responses[statusCode] = {
                        description: description,
                        schema: getDefaultSchema(statusCode)
                    };
                }
            } else if (key.startsWith('example')) {
                endpointInfo.examples[key.split(' ')[1]] = JSON.parse(value);
            } else {
                endpointInfo[key] = value;
            }
        }
    });

    return endpointInfo;
}

async function findNomenclatures(content) {
    const lines = content.split('\n');
    const endpoints = [];
    let currentLines = [];
    let capturing = false;

    lines.forEach(line => {
        if (line.startsWith('--- @endpoint')) {
            if (capturing) {
                endpoints.push(parseEndpointData(currentLines));
                currentLines = [];
            }
            capturing = true;
        }
        if (capturing) {
            if (line.startsWith('--- @')) {
                currentLines.push(line);
            } else {
                if (currentLines.length > 0) {
                    endpoints.push(parseEndpointData(currentLines));
                }
                capturing = false;
                currentLines = [];
            }
        }
    });

    if (currentLines.length > 0 && capturing) {
        endpoints.push(parseEndpointData(currentLines));
    }

    return endpoints;
}

function mapTypeToOpenAPI(type) {
    const typeMapping = {
        'table': 'object',
        'function': 'string',
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'integer': 'integer',
        'array': 'array'
    };
    return typeMapping[type.toLowerCase()] || 'string';
}

async function convertJsonToYaml(jsonData, deleteJson = false, filepath) {
    try {
        let spec = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const yamlSpec = yaml.dump(spec);

        await fs.writeFile(filepath.replace('.json', '.yaml'), yamlSpec);
        console.log('YAML file has been written successfully.');

        if (deleteJson) {
            if (fsp.existsSync(filepath)) {
                fsp.unlinkSync(filepath);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

async function saveOpenAPISpec(spec, filepath) {
    let setts =  JSON.parse(await fs.readFile('settings.json', 'utf8'));
    if (fsp.existsSync(filepath)) { 
        fsp.unlinkSync(filepath);
    }

    try {
        if (setts.format === 'yaml') {
            convertJsonToYaml(JSON.stringify(spec, null, 2), setts.format === 'yaml', filepath);
        } else {
            await fs.writeFile(filepath, JSON.stringify(spec, null, 2));
        }

        console.log("OpenAPI Spec file saved successfully at:", filepath);
    } catch (error) {
        console.error("Error al guardar el archivo OpenAPI Spec:", error);
    }
}

function createOpenAPISpec(endpoints) {
    const openAPISpec = {
        openapi: '3.0.0',
        info: {
            title: projectName ||'Lua API Documentation',
            version: '1.0.0',
            description: projectDescription || 'Auto-generated API documentation from Lua source files.'
        },
        paths: {},
        components: {}
    };

    endpoints.forEach(endpoint => {
        const pathItem = `/${endpoint.name}`;
        openAPISpec.paths[pathItem] = {
            post: {
                summary: endpoint.summary || endpoint.name,
                description: endpoint.description,
                tags: endpoint.tags ? endpoint.tags.split(', ') : [],
                operationId: endpoint.name,
                parameters: endpoint.params.map(param => {
                    const [type, name, ...desc] = param.split(' ');
                    return {
                        name,
                        in: 'query',
                        description: desc.join(' '),
                        required: true,
                        schema: {
                            type: mapTypeToOpenAPI(type)
                        }
                    };
                }),
                responses: mapResponses(endpoint.responses)
            }
        };
    });

    return openAPISpec;
}

function mapResponses(responses) {
    const mappedResponses = {};

    for (const [code, description] of Object.entries(responses)) {
        mappedResponses[code] = {
            description: description,
            content: {
                'application/json': {
                    schema: getDefaultSchema(code)
                }
            }
        };
    }

    if (Object.keys(mappedResponses).length === 0) {
        return getDefaultResponses();
    }

    return mappedResponses;
}

function getDefaultSchema(code) {
    switch (code) {
        case '200':
            return {
                type: 'object',
                properties: {
                    message: { type: 'string', example: 'Success' }
                }
            };
        case '400':
            return {
                type: 'object',
                properties: {
                    error: { type: 'string', example: 'Bad request' }
                }
            };
        default:
            return { type: 'object' };
    }
}

function getDefaultResponses() {
    return {
        '200': {
            description: 'Successful operation',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            message: { type: 'string', example: 'Operation successful' }
                        }
                    }
                }
            }
        },
        '400': {
            description: 'Bad Request',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            error: { type: 'string', example: 'Input validation failed' }
                        }
                    }
                }
            }
        }
    };
}

async function updateFileFormat(file, format) {
    try {
        let data = await fs.readFile(file, 'utf8');
        let jsonData = JSON.parse(data);
        jsonData.format = format;

        let result = JSON.stringify(jsonData, null, 2);
        await fs.writeFile(file, result, 'utf8');
        console.log(`File format updated to ${format}`);
    } catch (err) {
        console.log(err);
    }
}

async function updateKeySettings(file, key, value) {
    try {
        let data = await fs.readFile(file, 'utf8');
        let jsonData = JSON.parse(data);
        jsonData[key] = value;

        let result = JSON.stringify(jsonData, null, 2);
        await fs.writeFile(file, result, 'utf8');
        console.log(`${key} updated to ${value}`);
    } catch (err) {
        console.log(err);
    }
}

async function handleOutputFormat(file) {
    try {
        let data = await fs.readFile(file, 'utf8');
        let jsonData = JSON.parse(data);
        let options = ['JSON', 'YAML', 'Back']

        const outputFormats = await inquirer.showListPrompt("Select output formats:", options);

        switch (outputFormats) {
            case "JSON":
                await updateFileFormat(file, 'json');
                main();
                break;
            case "YAML":
                await updateFileFormat(file, 'yaml');
                main();
                break;
            case "Back":
                await settings();
                break;
            default:
                console.log("Non -valid option.");
        }
    } catch (err) {
        console.log(err);
    }
}

async function settings() {
    const file = 'settings.json';
    const menu = await inquirer.showListPrompt("Select an option:", [
        "Output format",
        "Output directory",
        "Input directory"
    ]);

    switch (menu) {
        case "Output format":
            await handleOutputFormat(file);
            break;
        case "Output directory":
            let output = inquirer.inputOption("Enter the Output Directory:");
            updateKeySettings(file, 'output_directory', output);
            break;
        case "Input directory":
            let input = inquirer.inputOption("Enter the entrance directory:");
            updateKeySettings(file, 'input_directory', input);
            break;
        default:
            console.log("Non -valid option.");
    }
}

async function main() {
    let setts =  JSON.parse(await fs.readFile('settings.json', 'utf8'));
    const menu = await inquirer.showListPrompt("Select an option:", [
        "Generate API documentation",
        "Settings"
    ]);

    switch (menu) {
        case "Generate API documentation":
            if (projectName === '') {
                projectName = await inquirer.inputOption("Enter the name of the project (Leave empty to use default):");
            }

            if (projectDescription === '') {
                projectDescription = await inquirer.inputOption("Enter the project description (Leave empty to use default):");
            }

            const directory = setts.input_directory;
            const files = await listFiles(directory);
            if (files.length > 0) {
                const selectedFile = await inquirer.showListPrompt("Select a file:", files);
                const fullPath = path.join(directory, selectedFile);

                const content = await readFileContent(fullPath);
                if (content) {
                    const endpoints = await findNomenclatures(content);
                    const openAPISpec = createOpenAPISpec(endpoints);
                    await saveOpenAPISpec(openAPISpec, 'output/' + selectedFile.replace('.lua', '.json'));
                }
            } else {
                console.log("There are no files in the folder.");
                main();
            }
            break;
        case "Settings":
            settings();
            break;
        default:
            console.log("Non-valid option.");
            main();
    }

}



main();
