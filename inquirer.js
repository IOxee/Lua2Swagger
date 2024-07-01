const inquirer = async () => (await import('inquirer')).default;

async function showCheckboxPrompt(question, choices) {
    const inq = await inquirer();
    const answer = await inq.prompt([
        {
            type: 'checkbox',
            name: 'selected',
            message: question,
            choices: choices
        }
    ]);
    return answer.selected;
}

async function showListPrompt(question, choices) {
    const inq = await inquirer();
    const answer = await inq.prompt([
        {
            type: 'list',
            name: 'selected',
            message: question,
            choices: choices
        }
    ]);
    return answer.selected;
}

async function addOption(question, choices) {
    const inq = await inquirer();
    const newOption = await inq.prompt([
        {
            type: 'input',
            name: 'option',
            message: question
        }
    ]);
    choices.push(newOption.option);
    return choices;
}

async function inputOption(question) {
    const inq = await inquirer();
    const answer = await inq.prompt([
        {
            type: 'input',
            name: 'response',
            message: question
        }
    ]);
    return answer.response;
}

module.exports = {
    showCheckboxPrompt,
    showListPrompt,
    addOption,
    inputOption
};
