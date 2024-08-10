/**
 * $ appcenter codepush rollback --help

Rollback a deployment to a previous release

Usage: appcenter codepush rollback [--target-release <arg>] [-a|--app <arg>] <deployment-name>

Options:
       --target-release <arg>             Specifies the release label to be rolled back
    -a|--app <arg>                        Specify app in the <ownerName>/<appName> format
    deployment-name                       Specifies deployment name to be rolled back

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
