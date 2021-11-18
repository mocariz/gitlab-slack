'use strict';

const _ = require('lodash'),
	bluebird = require('bluebird'),
	chalk = require('chalk'),
	debugCreate = require('debug'),
	helpers = require('../lib/helpers'),
	slack = require('../lib/slack'),
	supportsColor = require('supports-color'),
	util = require('util');

const handleMergeRequest = require('./mergeRequest');
const debug = debugCreate('gitlab-slack:handler');

/**
 * The kind metadata.
 * @typedef {Object} HandlerKind
 * @property {String} name The internal name.
 * @property {String} title The display title.
 */

/**
 * Handles an incoming message.
 * @param {Map} projectConfigs A map of project ID to project configuration.
 * @param {GitLabApi} api The GitLab API.
 * @param {Object} data The message data.
 * @returns {Promise} A promise that will be resolved when the message was handled.
 */
exports.handleMessage = async function (projectConfigs, api, data) {
	let outputs;

	if (data.object_kind) {
		switch (data.object_kind) {
			case handleMergeRequest.KIND.name:
				outputs = await handleMergeRequest(data);
				break;
			default:
				/* eslint-enable camelcase */
				break;
		}
	}

	if (!_.isArray(outputs)) {
		outputs = [outputs];
	}

	outputs = _.compact(outputs);

	if (!outputs.length) {
		// If we get here and there's nothing to output, that means none of the handlers processed the message.
		debug(chalk`{cyanBright IGNORED} No handler processed the message.`);
		console.log(chalk`{cyanBright IGNORED} {yellow Message Body ---------------------}`, '\n', util.inspect(data, { colors: supportsColor.stdout.level > 0, depth: 5 }));
		return;
	}

	const projectId = await helpers.getProjectId(data, api),
		projectConfig = projectConfigs.get(projectId);

	if (projectConfig && projectConfig.channel) {
		// If we can assign the message to a configured project and that project has a channel,
		//  make sure all outgoing messages go to the configured channel.
		for (const output of outputs) {
			output.channel = projectConfig.channel;
		}
	}

	// Send all the outputs to Slack and we're done.
	await bluebird.map(outputs, output => slack.send(output));
};
