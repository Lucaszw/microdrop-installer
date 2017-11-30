const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');
const gulp = require('gulp');
const _ = require('lodash');
const log = console.log;

require('@microdrop/buildutils/packages')(gulp);

const getOutput = (command, inherit=false) => {
  log(chalk.blue(command));
  var options = {shell: true};
  if (inherit) options.stdio = 'inherit';

  return new Promise((resolve, reject) => {
    const child = spawn(command, options);
    const output = [];
    output.command = command;
    if (!inherit) {
      child.stdout.on('data', function (data) {
        output.push(data.toString());
      });
    }
    child.on('exit', function (code, other) {
      output.code = code;
      if (output.code != 0) {reject(output)}
      else if (output.code == 0) {resolve(output)}
    });
  });
}

gulp.task('installer:create', async (d) => {
  const commands = {
    conda_info: 'conda info --json',
    create_env: 'conda create --name microdrop-installer',
    install: 'conda install --name constructor'
  }
  const env_name = 'microdrop-installer';

  try {
    // Get conda info
    var output = await getOutput(commands.conda_info);
    var {platform, python_version, envs, envs_dirs} = JSON.parse(output[0]);
    envs_dirs = _.map(envs_dirs, (d)=>path.join(d, env_name));
    log({platform, python_version, envs});

    // Install conda instructor
    var output = await getOutput('conda install constructor', true);
    log(output);

    // Create conda environment
    var exists = _.intersection(envs_dirs, envs).length > 0;
    if (!exists) {
      var output = await getOutput(commands.create_env, true);
      log(output);
    } else {
      log(chalk.bold('environment already exists'));
    }

    // Install conda constructor
    var output = await getOutput(commands.install, true);
    log(output);

  } catch (e) {
    log(chalk.red(`"${e.command}"`, 'failed with code', e.code));
    let msg;
    switch (e.command) {
      case commands.conda_info:
        msg = 'conda is not installed';
        break;
      default:
        msg = e.toString();
    }
    log(chalk.bold(msg));
    return;
  }
});
