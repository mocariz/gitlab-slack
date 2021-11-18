'use strict';

const _ = require('lodash'),
	chalk = require('chalk'),
	debugCreate = require('debug');

const REGEX_MARKDOWN_LINK = /(!)?\[([^\]]*)]\(([^)]+)\)/g,
	REGEX_MARKDOWN_BOLD = /(\*\*|__)(.+?)\1/g,
	REGEX_MARKDOWN_BOLD_INTERMEDIARY = /\vb/g,
	REGEX_MARKDOWN_ITALIC = /([*_])(.+?)\1/g,
	REGEX_MARKDOWN_ITALIC_INTERMEDIARY = /\vi/g,
	REGEX_MARKDOWN_BULLET = /^([ \t]+)?\*(?!\*)/mg,
	REGEX_MARKDOWN_HEADER = /^#+\s*(.+)$/mg;

const debug = debugCreate('gitlab-slack:app'); // Log as 'app' from here.

/**
 * Attempts to get the project ID from message data.
 * @param {Object} data The message data.
 * @param {GitLabApi} api The GitLab API.
 * @returns {Promise<Number|undefined>} A Promise that will be resolved with the project ID.
 */
exports.getProjectId = async function (data, api) {
	let projectId = data.project_id;

	if (!_.isNil(projectId)) {
		return projectId;
	}

	// If the project ID isn't on the data root, we'll try to look up the project information
	//  by its path-with-namespace value.
	if (data.project && data.project.path_with_namespace) {
		const project = await api.getProject(encodeURIComponent(data.project.path_with_namespace));

		projectId = project.id;
	}

	if (!projectId) {
		debug(chalk`Could not find project ID in a {blue ${data.object_kind}} message.`);
	}

	// At this point, we might have found nothing, but just return whatever we've got.
	return projectId;
};

/**
 * Converts several Markdown constructs to Slack-style formatting.
 * @param {String} description The description.
 * @param {String} projectUrl The project web URL.
 * @returns {String} The formatted description.
 */
exports.convertMarkdownToSlack = function (description, projectUrl) {
	// Reset the last indices...
	REGEX_MARKDOWN_BULLET.lastIndex =
	REGEX_MARKDOWN_LINK.lastIndex =
	REGEX_MARKDOWN_BOLD.lastIndex =
	REGEX_MARKDOWN_BOLD_INTERMEDIARY.lastIndex =
	REGEX_MARKDOWN_ITALIC.lastIndex =
	REGEX_MARKDOWN_ITALIC_INTERMEDIARY.lastIndex =
	REGEX_MARKDOWN_HEADER.lastIndex = 0;

	return description
		.replace(REGEX_MARKDOWN_BULLET, function (match, indent) {
			// If the indent is present, replace it with a tab.
			return (indent ? '\t' : '') + '•';
		})
		.replace(REGEX_MARKDOWN_LINK, function (match, image, name, url) {
			if (image) {
				// Image links are sent without the project web URL prefix.
				return `<${projectUrl + url}|${name}>`;
			}

			return `<${url}|${name}>`;
		})
		// Bold and italic use each other's characters, so to be safe, use an intermediary.
		.replace(REGEX_MARKDOWN_BOLD, '\vb$2\vb')
		.replace(REGEX_MARKDOWN_ITALIC, '\vi$2\vi')
		// Finalize bold and italic from the intermediary.
		.replace(REGEX_MARKDOWN_BOLD_INTERMEDIARY, '*')
		.replace(REGEX_MARKDOWN_ITALIC_INTERMEDIARY, '_')
		.replace(REGEX_MARKDOWN_HEADER, function (match, heading) {
			if (heading.includes('*')) {
				// If it looks like there's already bolding in the header, don't try to add more.
				return heading;
			}

			// TODO improve

			return `*${heading}*`;
		});
};
