'use strict';

const _ = require('lodash'),
	chalk = require('chalk'),
	/**
	 * @type {Configuration}
	 */
	config = require('../config'),
	debugCreate = require('debug'),
	{ GitLabApi } = require('./lib/gitlabapi'),
	handlers = require('./handlers'),
	bluebird = require('bluebird'),
	server = require('./lib/server');

require('dotenv').config();

const api = new GitLabApi(process.env.GITLABBASEURL, process.env.GITLABAPITOKEN),
	debug = debugCreate('gitlab-slack:app');

let gitLabSlack;

process.on('uncaughtException', function (err) {
	debug(chalk`{red UNCAUGHT EXCEPTION} - ${err.message}${'\n'}${err.stack}`);
	process.exit(1);
});
process.on('SIGINT', function () {
	debug(chalk`{yellow SIGINT} received!`);
	return _terminate();
});
process.on('SIGTERM', function () {
	debug(chalk`{yellow SIGTERM} received!`);
	return _terminate();
});

bluebird.config({
	longStackTraces: true
});

(async function () {
	debug('Starting up...');

	if (!config.gitLab.projects || !config.gitLab.projects.length) {
		// Make sure this gets logged somehow.
		(debug.enabled ? debug : console.error)(chalk`{red ERROR} No projects defined in configuration. Terminating...`);
		process.exit(1);
	}

	// Be nice and add the # character to channels in project configuration if it's not there.
	for (const project of config.gitLab.projects) {
		if (project.channel && !project.channel.startsWith('#')) {
			project.channel = '#' + project.channel;
		}
	}

	const projectConfigs = new Map(_.map(config.gitLab.projects, p => [p.id, p]));

	gitLabSlack = server.createServer(
		data => handlers.handleMessage(
			projectConfigs,
			api,
			data
		)
	);

	gitLabSlack.on('close', function () {
		// If the service closes for some other reason, make sure
		//  the process also exits.
		_terminate();
	});

	gitLabSlack.listen(config.port);

	debug('Startup complete.');
})()
	.catch(function (err) {
		// Make sure this gets logged somehow.
		(debug.enabled ? debug : console.error)(chalk`{red ERROR} Processing failure in main branch. ! {red %s}\n{blue Stack} %s`, err.message, err.stack);
		_terminate(1);
	});

/**
 * Terminates the service.
 * @param {Number} exitCode The exit code. (default = 0)
 */
function _terminate(exitCode = 0) {
	debug('Terminating...');
	if (gitLabSlack && gitLabSlack.listening) {
		gitLabSlack.close(function () {
			process.exit(exitCode);
		});
	} else {
		process.exit(exitCode);
	}
}
