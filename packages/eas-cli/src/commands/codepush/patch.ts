/**
 * $ appcenter codepush patch --help

Update the metadata for an existing CodePush release

Usage: appcenter codepush patch [-r|--rollout <arg>] [-d|--description <arg>]
         [-t|--target-binary-version <arg>] [-x|--disabled] [-m|--mandatory]
         [-l|--existing-release-label <arg>] [-a|--app <arg>] <deployment-name>

Options:
    -r|--rollout <arg>                            Specifies percentage of users this release should be
                                                  immediately available to. (The specified number must be
                                                  an integer between 1 and 100)
    -d|--description <arg>                        Specifies description of the changes made to the app with
                                                  this release
    -t|--target-binary-version <arg>              Specifies binary app version(s) that specifies this
                                                  release is targeting for. (The value must be a semver
                                                  expression such as 1.1.0, ~1.2.3)
    -x|--disabled                                 Specifies whether this release should be immediately
                                                  downloadable. (Putting -x flag means disabled)
    -m|--mandatory                                Specifies whether this release should be considered
                                                  mandatory. (Putting -m flag means mandatory)
    -l|--existing-release-label <arg>             Specifies label of one existing release to update.
                                                  (Defaults to the latest release within the specified
                                                  deployment)
    -a|--app <arg>                                Specify app in the <ownerName>/<appName> format
    deployment-name                               Specifies one existing deployment name.

Common Options (works on all commands):
       --disable-telemetry             Disable telemetry for this command
    -v|--version                       Display appcenter version
       --quiet                         Auto-confirm any prompts without waiting for input
    -h|--help                          Display help for current command
       --env <arg>                     Environment when using API token
       --token <arg>                   API token
       --output <arg>                  Output format: json
       --debug                         Display extra output for debugging
 */

import ChannelCreate from '../channel/create';

export default class CodepushDeploymentAdd extends ChannelCreate {
  static override description = 'create a deployment';

  static override args = [
    {
      name: 'name',
      required: true,
      description: 'Name of the codepush deployment to create',
    },
  ];
}
