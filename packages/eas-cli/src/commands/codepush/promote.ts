/**
 * $ appcenter codepush promote --help

Create a new release for the destination deployment, which includes the exact code and metadata from the latest release of the source deployment

Usage: appcenter codepush promote -s|--source-deployment-name <arg> -d|--destination-deployment-name <arg>
         [-t|--target-binary-version <arg>] [-r|--rollout <arg>] [--disable-duplicate-release-error]
         [-x|--disabled] [-m|--mandatory] [-l|--label <arg>] [--description <arg>] [-a|--app <arg>]

Options:
    -s|--source-deployment-name <arg>                  Specifies source deployment name
    -d|--destination-deployment-name <arg>             Specifies destination deployment name
    -t|--target-binary-version <arg>                   Specifies binary app version(s) that specifies this
                                                       release is targeting for. (The value must be a
                                                       semver expression such as 1.1.0, ~1.2.3)
    -r|--rollout <arg>                                 Specifies percentage of users this release should be
                                                       immediately available to. (The specified number must
                                                       be an integer between 1 and 100)
       --disable-duplicate-release-error               Specifies that if the update is identical to the
                                                       latest release on the deployment, the CLI should
                                                       generate a warning instead of an error
    -x|--disabled                                      Specifies whether this release should be immediately
                                                       downloadable. (Putting -x flag means disabled)
    -m|--mandatory                                     Specifies whether this release should be considered
                                                       mandatory. (Putting -m flag means mandatory)
    -l|--label <arg>                                   Allows you to pick the specified label from the
                                                       source deployment and promote it to the destination
                                                       deployment
       --description <arg>                             Specifies description of the changes made to the app
                                                       with this release
    -a|--app <arg>                                     Specify app in the <ownerName>/<appName> format

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
