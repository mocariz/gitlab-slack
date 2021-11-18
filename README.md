**gitlab-slack-mr-message** is a service that receives outgoing webhook notifications from GitLab and posts information to an incoming webhook on Slack. ** This project is a derivation of [gitlab-slack](https://github.com/nazrhyn/gitlab-slack)
# Information

### Features
* Processes GitLab webhook messages for **merge requests**. ([more info](#attractive-and-functional-notifications))
* Provides translation from Markdown to Slack's formatting syntax for the formatting features that Slack supports. ([more info](#markdown-to-slack-formatting-translation))
* Status and error messages are logged to `stderr`; if the terminal supports colors, they are output for improved readability. ([more info](#configuring-logging))

#### Limitations
* **GitLab API Token**   
  The GitLab API token must have administrative privileges to be able to search for users by email address. This is used to translate the commit author email address into a username.
* **GitLab and GitLab API Version**   
  The GitLab API interactions were written for **v4** of their API against GitLab version **11.x**. Older or newer versions _may_ work, but are unsupported.
* **Node.js and NPM Version**   
  The code is written targeting Node.js **8.x LTS** and NPM **6.x**. Older or newer versions _may_ work, but are unsupported.

### Configuration Syntax
**gitlab-slack** is configured by values in the `config.js` file in the application directory. This file is ingested as a Node.js module and has the following structure:

```js
module.exports = {
	port: 4646,
	slackWebhookUrl: '',
	gitLab: {
		baseUrl: '',
		apiToken: '',
		projects: [
			{
				id: 0,
				name: '',
				channel: '',
				labels: []
			}
		]
	}
};
```

* `port` - The port on which to listen. (Default = `4646`)
* `slackWebhookUrl` - The URL of the Slack incoming webhook. (Example = `'https://hooks.slack.com/services/...'`)
* `gitLab` - The GitLab configuration.
  * `baseUrl` - The protocol/host/port of the GitLab installation. (Example = `'https://gitlab.company.com'`)   
    _This is expected **NOT** to have a trailing slash._
  * `apiToken` - The API token with which to query GitLab. (Example = `'hxg1qaDqX8xVELvMefPr'`)
  * `projects` - The project configuration. This section defines which projects should be tracked.
    * `id` - The ID of the project.
    * `name` - The name of the project. This value is only used for logging; the group/name namespace is recommended. (Example = `'group/project-name'`)
    * `channel` - **Optional.** Overrides the default channel for the Slack webhook. (Example = `'#project-name'`)   
      _The `#` prefix is added if it is not present._
    * `labels` - **Optional.** An array of regular expressions or strings (that will be turned into case-insensitive regular expressions) used to select issue labels that should be tracked for changes. (Example = `[ '^Status:', /^Size:/ ]`) 

**NOTE:** If the service receives a message for a project that is not configured (or does not have a channel defined), its notifications will go to the default channel for the incoming webhook. 

# Feature Details

### Attractive and Functional Notifications
**gitlab-slack** improves upon GitLab's built-in Slack integration with attractive notification formatting that provides more detail and functionality
while cutting the fat and remaining as concise as possible.
 
#### Merge Requests
![Merge Request Notification](https://user-images.githubusercontent.com/1672405/55262028-f13aea00-5242-11e9-8277-d035688c5ea2.png)   
Merge request notifications include the repository path, the username of the user who performed the merge request action, the source branch and the target branch. Usernames and branches are formatted as links.
Merge request notifications include an attachment that includes the title of the merge request and, depending on the kind of action, also the first line of its description.

### Markdown to Slack Formatting Translation
The following Markdown structures will be translated to a Slack-formatting analogue:
* Bold
* Italic
* Links (files and images)
* Headings
* Bulleted Lists (up to two levels deep)

An issue titled **Markdown to Slack formatting is awesome** with the following following markdown in the description...   

```markdown
# Heading H1
* Something is _italic_ or *italic*.
* Something else is __bold__ or **bold**.
* Here's a link to [Google](https://google.com).

Here's an [uploaded_file.7z](https://example.com/uploaded_file.7z).

Do you like pictures?   
![rubbercheeseburger.jpg](/rubbercheeseburger.jpg)

## **Heading H2**
* A list with...
  * ...more than one level!
* Back to the base level.
```
...produces an issue notification similiar to the following...   
 
![Markdown to Slack Formatting](https://user-images.githubusercontent.com/1672405/55262249-981f8600-5243-11e9-98a3-0daabc0f3fec.png)

Headings are simply bolded; those that are already bolded are handled appropriately. Images are processed into simple links; they do
not include the base host/protocol/port of the GitLab instance, so that is added.

### Configuring Logging
The [debug](https://github.com/visionmedia/debug) module is used for logging under the prefix `gitlab-slack`. The logging is split into the following components:

| Component | Description |
|:----------|:------------|
| `app` | The main application responsible for the start-up and shut-down process. |
| `server` | The HTTP server that handles incoming webhook requests. |
| `api` | The wrapper that handles communication with the GitLab API. |
| `slack` | The wrapper that handles sending notifications to the Slack incoming webhook. |
| `handler` | A set of components that handle incoming messages of various types. Sub-components are logged as `gitlab-slack:handler:<sub>`.<br><br>**Sub-Components**: `commit`, `branch`, `tag`, `issue`, `mergerequest`, `wikipage` |

To turn on or off logging of components, assign the `DEBUG` environment variable. For example, to only show handler log messages, set
`DEBUG` to `gitlab-slack:handler:*`. Read the documentation for **debug** for more information.

# Installation
**nodejs** and **npm** are prerequisites to the installation of this application.

### Installing the Service

The **/scripts** directory contains some example service definitions scripts for various init flavors. Check the **README** files
in those directories for more information about each script.

### Adding the GitLab Webhook
> _The **Master** or **Owner** permission level is required to modify webhooks in GitLab._

1. From the project home, click **Settings**.
1. Click **Integrations**.
1. Enter `http://127.0.0.1:PORT` into the **URL** field if, for example, **gitlab-slack** is running on the same server as GitLab.    
   Use the value of the `port` key from the `config.js` file in place of `PORT`.
   * If **gitlab-slack** is running on another server, enter the appropriate DNS or URI.
1. Check the **Push events**, **Tag push events** **Issues events**, **Merge Request events** and **Wiki Page events** triggers. If
   desired, check the **Confidential Issues events** trigger as well.   
   _The other Trigger options are not supported and will result in an "unrecognized" message being sent to the default Slack
   channel for the webhook._
1. Depending on your configuration you may want to check or un-check **Enable SSL verification**.
1. The **Secret Token** feature is not supported.
1. Click **Add webhook**.

Once added, the webhook can be tested using the **Test** button to the right of the webhook under **Webhooks**.
