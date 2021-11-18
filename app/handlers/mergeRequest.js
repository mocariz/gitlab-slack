'use strict';

const chalk = require('chalk'),
	/**
	 * @type {Configuration}
	 */
	config = require('../../config'),
	debugCreate = require('debug'),
	helpers = require('../lib/helpers'),
	util = require('util');

const debug = debugCreate('gitlab-slack:handler:mergerequest');

/**
 * Handles an merge request message.
 * @param {Object} data The message data.
 * @returns {Promise<Object|undefined>} A promise that will be resolved with the output data structure.
 */
module.exports = async function (data) {
	debug('Handling message...');

	const mr = data.object_attributes;

	if (mr.action === 'update') {
		// We always ignore updates as they're too spammy.
		debug(chalk`Ignored. ({blue update})`);
		return;
	}

	const description = mr.description.split(/(?:\r\n|[\r\n])/)[0]; // Take only the first line of the description.
	const attachment = {
		mrkdwn_in: ['text'],
		color: (data.labels[0] || {}).color || module.exports.COLOR,
		title: mr.title,
		title_link: mr.url
	};

	if (mr.action === 'open' || mr.action === 'reopen') {
		const output = {
			parse: 'none',
			text: util.format(
				'@aqui <%s/%s|%s> Abriu um Merge Request *!%s* — *source:* <%s/tree/%s|%s> — *target:* <%s/tree/%s|%s>',
				config.gitLab.baseUrl,
				data.user.username,
				data.user.username,
				mr.iid,
				mr.source.web_url,
				mr.source_branch,
				mr.source_branch,
				mr.target.web_url,
				mr.target_branch,
				mr.target_branch
			),
			attachments: [attachment]
		};

		// Start the fallback with the title.
		attachment.fallback = attachment.title;
		attachment.fallback += '\n' + mr.description;
		attachment.text = helpers.convertMarkdownToSlack(description, mr.source.web_url);

		debug('Message handled.');

		output.__kind = module.exports.KIND;

		return output;
	}
};

/**
 * Provides metadata for this kind of handler.
 * @type {HandlerKind}
 */
module.exports.KIND = Object.freeze({
	name: 'merge_request',
	title: 'Merge Request'
});

/**
 * The color for this kind of handler.
 * @type {string}
 */
module.exports.COLOR = '#31B93D';
