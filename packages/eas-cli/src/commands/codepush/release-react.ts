/**
 * $ appcenter codepush release-react --help

Release a React Native update to an app deployment

Usage: appcenter codepush release-react [--use-hermes] [--extra-hermes-flag <arg>] [--extra-bundler-option <arg>]
         [-t|--target-binary-version <arg>] [-o|--output-dir <arg>] [--sourcemap-output-dir <arg>]
         [-s|--sourcemap-output <arg>] [-xt|--xcode-target-name <arg>] [-c|--build-configuration-name <arg>]
         [--plist-file-prefix <arg>] [-xp|--xcode-project-file <arg>] [-p|--plist-file <arg>] [--pod-file <arg>]
         [-g|--gradle-file <arg>] [-e|--entry-file <arg>] [--development] [-b|--bundle-name <arg>]
         [-r|--rollout <arg>] [--disable-duplicate-release-error] [-k|--private-key-path <arg>] [-m|--mandatory]
         [-x|--disabled] [--description <arg>] [-d|--deployment-name <arg>] [-a|--app <arg>]

Options:
       --use-hermes                                  Enable hermes and bypass automatic checks
       --extra-hermes-flag <arg>                     Flag that gets passed to Hermes, JavaScript to bytecode compiler. Can
                                                     be specified multiple times
       --extra-bundler-option <arg>                  Option that gets passed to react-native bundler. Can be specified
                                                     multiple times
    -t|--target-binary-version <arg>                 Semver expression that specifies the binary app version(s) this
                                                     release is targeting (e.g. 1.1.0, ~1.2.3)
    -o|--output-dir <arg>                            Path to where the bundle should be written. If omitted, the bundle
                                                     will not be saved on your machine
       --sourcemap-output-dir <arg>                  Path to folder where the sourcemap for the resulting bundle should be
                                                     written. Name of sourcemap file will be generated automatically. This
                                                     argument will be ignored if "sourcemap-output" argument is provided.
                                                     If omitted, a sourcemap will not be generated
    -s|--sourcemap-output <arg>                      Path to where the sourcemap for the resulting bundle should be
                                                     written. If omitted, a sourcemap will not be generated
    -xt|--xcode-target-name <arg>                    Name of target (PBXNativeTarget) which specifies the binary version
                                                     you want to target this release at (iOS only)
    -c|--build-configuration-name <arg>              Name of build configuration which specifies the binary version you
                                                     want to target this release at. For example, "Debug" or "Release" (iOS
                                                     only)
       --plist-file-prefix <arg>                     Prefix to append to the file name when attempting to find your app's
                                                     Info.plist file (iOS only)
    -xp|--xcode-project-file <arg>                   Path to the Xcode project or project.pbxproj file
    -p|--plist-file <arg>                            Path to the plist file which specifies the binary version you want to
                                                     target this release at (iOS only)
       --pod-file <arg>                              Path to the cocopods config file (iOS only)
    -g|--gradle-file <arg>                           Path to the gradle file which specifies the binary version you want to
                                                     target this release at (android only)
    -e|--entry-file <arg>                            Path to the app's entry JavaScript file. If omitted,
                                                     "index.<platform>.js" and then "index.js" will be used (if they exist)
       --development                                 Specifies whether to generate a dev or release build
    -b|--bundle-name <arg>                           Name of the generated JS bundle file. If unspecified, the standard
                                                     bundle name will be used, depending on the specified platform:
                                                     "main.jsbundle" (iOS), "index.android.bundle" (Android) or
                                                     "index.windows.bundle" (Windows)
    -r|--rollout <arg>                               Percentage of users this release should be available to
       --disable-duplicate-release-error             When this flag is set, releasing a package that is identical to the
                                                     latest release will produce a warning instead of an error
    -k|--private-key-path <arg>                      Specifies the location of a RSA private key to sign the release
                                                     with.NOTICE: use it for react native applications only, client SDK on
                                                     other platforms will be ignoring signature verification for now!
    -m|--mandatory                                   Specifies whether this release should be considered mandatory
    -x|--disabled                                    Specifies whether this release should be immediately downloadable
       --description <arg>                           Description of the changes made to the app in this release
    -d|--deployment-name <arg>                       Deployment to release the update to
    -a|--app <arg>                                   Specify app in the <ownerName>/<appName> format

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

import { Platform as PublishPlatform } from '@expo/config';
import { Workflow } from '@expo/eas-build-job';
import { Flags } from '@oclif/core';
import chalk from 'chalk';
import nullthrows from 'nullthrows';

import { createUpdateBranchOnAppAsync } from '../../branch/queries';
import { ensureRepoIsCleanAsync } from '../../build/utils/repository';
import { getUpdateGroupUrl } from '../../build/utils/url';
import {
  BranchMapping,
  getAlwaysTrueBranchMapping,
  getBranchMapping,
  isAlwaysTrueBranchMapping,
  isEmptyBranchMapping,
} from '../../channel/branch-mapping';
import { updateChannelBranchMappingAsync } from '../../channel/queries';
import EasCommand from '../../commandUtils/EasCommand';
import { EasNonInteractiveAndJsonFlags } from '../../commandUtils/flags';
import fetch from '../../fetch';
import {
  PublishUpdateGroupInput,
  StatuspageServiceName,
  UpdateInfoGroup,
  UpdatePublishMutation,
} from '../../graphql/generated';
import { PublishMutation } from '../../graphql/mutations/PublishMutation';
import { ChannelQuery } from '../../graphql/queries/ChannelQuery';
import Log, { learnMore, link } from '../../log';
import { ora } from '../../ora';
import { RequestedPlatform } from '../../platform';
import { getOwnerAccountForProjectIdAsync } from '../../project/projectUtils';
import {
  RawAsset,
  buildBundlesAsync,
  buildUnsortedUpdateInfoGroupAsync,
  collectAssetsAsync,
  filterExportedPlatformsByFlag,
  getRuntimeToPlatformMappingFromRuntimeVersions,
  getRuntimeVersionObjectAsync,
  isUploadedAssetCountAboveWarningThreshold,
  platformDisplayNames,
  resolveInputDirectoryAsync,
  uploadAssetsAsync,
} from '../../project/publish';
import { resolveWorkflowPerPlatformAsync } from '../../project/workflow';
import { createRolloutBranchMapping, isRolloutBranchMapping } from '../../rollout/branch-mapping';
import { ensureEASUpdateIsConfiguredAsync } from '../../update/configure';
import { getUpdateJsonInfosForUpdates } from '../../update/utils';
import {
  checkManifestBodyAgainstUpdateInfoGroup,
  getCodeSigningInfoAsync,
  getManifestBodyAsync,
  signBody,
} from '../../utils/code-signing';
import areSetsEqual from '../../utils/expodash/areSetsEqual';
import uniqBy from '../../utils/expodash/uniqBy';
import formatFields from '../../utils/formatFields';
import { enableJsonOutput, printJsonOnlyOutput } from '../../utils/json';
import { maybeWarnAboutEasOutagesAsync } from '../../utils/statuspageService';

export default class CodepushReleaseReact extends EasCommand {
  static override hidden = true;
  static override description = 'Release an update to a deployment';

  static override flags = {
    rollout: Flags.integer({
      char: 'r',
      description: 'Percentage of users this release should be available to',
      required: false,
    }),
    description: Flags.string({
      description: 'Description of the changes made to the app in this release',
      required: true,
    }),
    deploymentName: Flags.string({
      char: 'd',
      description: 'Deployment to release the update to',
      required: true,
    }),
    disabled: Flags.boolean({
      char: 'x',
      description: 'Specifies whether this release should be immediately downloadable',
      required: false,
    }),
    'clear-cache': Flags.boolean({
      description: `Clear the bundler cache before publishing`,
      default: false,
    }),
    'private-key-path': Flags.string({
      description: `File containing the PEM-encoded private key corresponding to the certificate in expo-updates' configuration. Defaults to a file named "private-key.pem" in the certificate's directory. Only relevant if you are using code signing: https://docs.expo.dev/eas-update/code-signing/`,
      required: false,
    }),
    ...EasNonInteractiveAndJsonFlags,
  };

  static override contextDefinition = {
    ...this.ContextOptions.DynamicProjectConfig,
    ...this.ContextOptions.LoggedIn,
    ...this.ContextOptions.Vcs,
  };

  async runAsync(): Promise<void> {
    const {
      flags: {
        rollout,
        description,
        deploymentName,
        disabled,
        'clear-cache': clearCache,
        'private-key-path': privateKeyPath,
        json: jsonFlag,
        'non-interactive': nonInteractive,
      },
    } = await this.parse(CodepushReleaseReact);
    const {
      getDynamicPublicProjectConfigAsync,
      getDynamicPrivateProjectConfigAsync,
      loggedIn: { graphqlClient },
      vcsClient,
    } = await this.getContextAsync(CodepushReleaseReact, {
      nonInteractive,
    });
    if (jsonFlag) {
      enableJsonOutput();
    }

    if (!deploymentName) {
      throw new Error('Deployment name may not be empty.');
    }

    await vcsClient.ensureRepoExistsAsync();
    await ensureRepoIsCleanAsync(vcsClient, nonInteractive);

    const {
      exp: expPossiblyWithoutEasUpdateConfigured,
      projectId,
      projectDir,
    } = await getDynamicPublicProjectConfigAsync();

    await maybeWarnAboutEasOutagesAsync(graphqlClient, [StatuspageServiceName.EasUpdate]);

    await ensureEASUpdateIsConfiguredAsync({
      exp: expPossiblyWithoutEasUpdateConfigured,
      platform: RequestedPlatform.All,
      projectDir,
      projectId,
      vcsClient,
      env: undefined,
    });

    const { exp } = await getDynamicPublicProjectConfigAsync();
    const { exp: expPrivate } = await getDynamicPrivateProjectConfigAsync();
    const codeSigningInfo = await getCodeSigningInfoAsync(expPrivate, privateKeyPath);

    const channel = await ChannelQuery.viewUpdateChannelAsync(graphqlClient, {
      appId: projectId,
      channelName: deploymentName,
    });

    const createdBranch = await createUpdateBranchOnAppAsync(graphqlClient, {
      appId: projectId,
      name: description, // TODO(wschurman): make this name something else maybe, maybe something with date or something
    });

    // build bundle and upload assets for a new publish
    const bundleSpinner = ora().start('Exporting...');
    try {
      await buildBundlesAsync({
        projectDir,
        inputDir: 'dist',
        exp,
        platformFlag: 'all',
        clearCache,
      });
      bundleSpinner.succeed('Exported bundle(s)');
    } catch (e) {
      bundleSpinner.fail('Export failed');
      throw e;
    }

    // After possibly bundling, assert that the input directory can be found.
    const distRoot = await resolveInputDirectoryAsync('dist', { skipBundler: false });

    const assetSpinner = ora().start('Uploading...');
    let unsortedUpdateInfoGroups: UpdateInfoGroup = {};
    let uploadedAssetCount = 0;
    let assetLimitPerUpdateGroup = 0;
    let realizedPlatforms: PublishPlatform[] = [];

    try {
      const collectedAssets = await collectAssetsAsync(distRoot);
      const assets = filterExportedPlatformsByFlag(collectedAssets, 'all');
      realizedPlatforms = Object.keys(assets) as PublishPlatform[];

      // Timeout mechanism:
      // - Start with NO_ACTIVITY_TIMEOUT. 180 seconds is chosen because the cloud function that processes
      //   uploaded assets has a timeout of 60 seconds and uploading can take some time on a slow connection.
      // - Each time one or more assets reports as ready, reset the timeout.
      // - Each time an asset upload begins, reset the timeout. This includes retries.
      // - Start upload. Internally, uploadAssetsAsync uploads them all first and then checks for successful
      //   processing every (5 + n) seconds with a linear backoff of n + 1 second.
      // - At the same time as upload is started, start timeout checker which checks every 1 second to see
      //   if timeout has been reached. When timeout expires, send a cancellation signal to currently running
      //   upload function call to instruct it to stop uploading or checking for successful processing.
      const NO_ACTIVITY_TIMEOUT = 180 * 1000; // 180 seconds
      let lastUploadedStorageKeys = new Set<string>();
      let lastAssetUploadResults: {
        asset: RawAsset & { storageKey: string };
        finished: boolean;
      }[] = [];
      let timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT;
      const cancelationToken = { isCanceledOrFinished: false };

      const uploadResults = await Promise.race([
        uploadAssetsAsync(
          graphqlClient,
          assets,
          projectId,
          cancelationToken,
          assetUploadResults => {
            const currentUploadedStorageKeys = new Set(
              assetUploadResults.filter(r => r.finished).map(r => r.asset.storageKey)
            );
            if (!areSetsEqual(currentUploadedStorageKeys, lastUploadedStorageKeys)) {
              timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT; // reset timeout to NO_ACTIVITY_TIMEOUT
              lastUploadedStorageKeys = currentUploadedStorageKeys;
              lastAssetUploadResults = assetUploadResults;
            }

            const totalAssets = assetUploadResults.length;
            const missingAssetCount = assetUploadResults.filter(a => !a.finished).length;
            assetSpinner.text = `Uploading (${totalAssets - missingAssetCount}/${totalAssets})`;
          },
          () => {
            // when an upload is retried, reset the timeout as we know this will now need more time
            timeAtWhichToTimeout = Date.now() + NO_ACTIVITY_TIMEOUT; // reset timeout to NO_ACTIVITY_TIMEOUT
          }
        ),
        (async () => {
          while (Date.now() < timeAtWhichToTimeout) {
            if (cancelationToken.isCanceledOrFinished) {
              break;
            }
            await new Promise(res => setTimeout(res, 1000)); // wait 1 second
          }
          cancelationToken.isCanceledOrFinished = true;
          const timedOutAssets = lastAssetUploadResults
            .filter(r => !r.finished)
            .map(r => `\n- ${r.asset.originalPath ?? r.asset.path}`);
          throw new Error(`Asset processing timed out for assets: ${timedOutAssets}`);
        })(),
      ]);

      uploadedAssetCount = uploadResults.uniqueUploadedAssetCount;
      assetLimitPerUpdateGroup = uploadResults.assetLimitPerUpdateGroup;
      unsortedUpdateInfoGroups = await buildUnsortedUpdateInfoGroupAsync(assets, exp);

      // NOTE(cedric): we assume that bundles are always uploaded, and always are part of
      // `uploadedAssetCount`, perferably we don't assume. For that, we need to refactor the
      // `uploadAssetsAsync` and be able to determine asset type from the uploaded assets.
      const uploadedBundleCount = uploadResults.launchAssetCount;
      const uploadedNormalAssetCount = Math.max(0, uploadedAssetCount - uploadedBundleCount);
      const reusedNormalAssetCount = uploadResults.uniqueAssetCount - uploadedNormalAssetCount;

      assetSpinner.stop();
      Log.withTick(
        `Uploaded ${uploadedBundleCount} app ${uploadedBundleCount === 1 ? 'bundle' : 'bundles'}`
      );
      if (uploadedNormalAssetCount === 0) {
        Log.withTick(`Uploading assets skipped - no new assets found`);
      } else {
        let message = `Uploaded ${uploadedNormalAssetCount} ${
          uploadedNormalAssetCount === 1 ? 'asset' : 'assets'
        }`;
        if (reusedNormalAssetCount > 0) {
          message += ` (reused ${reusedNormalAssetCount} ${
            reusedNormalAssetCount === 1 ? 'asset' : 'assets'
          })`;
        }
        Log.withTick(message);
      }
      for (const uploadedAssetPath of uploadResults.uniqueUploadedAssetPaths) {
        Log.debug(chalk.dim(`- ${uploadedAssetPath}`));
      }

      const platformString = (Object.keys(assets) as PublishPlatform[])
        .map(platform => {
          const collectedAssetForPlatform = nullthrows(assets[platform]);
          const totalAssetsForPlatform = collectedAssetForPlatform.assets.length + 1; // launch asset
          const assetString = totalAssetsForPlatform === 1 ? 'asset' : 'assets';
          return `${totalAssetsForPlatform} ${platformDisplayNames[platform]} ${assetString}`;
        })
        .join(', ');
      Log.withInfo(
        `${platformString} (maximum: ${assetLimitPerUpdateGroup} total per update). ${learnMore(
          'https://expo.fyi/eas-update-asset-limits',
          { learnMoreMessage: 'Learn more about asset limits' }
        )}`
      );
    } catch (e) {
      assetSpinner.fail('Failed to upload');
      throw e;
    }

    const workflows = await resolveWorkflowPerPlatformAsync(projectDir, vcsClient);
    const runtimeVersions = await getRuntimeVersionObjectAsync({
      exp,
      platforms: realizedPlatforms,
      projectDir,
      workflows: {
        ...workflows,
        web: Workflow.UNKNOWN,
      },
      env: undefined,
    });
    const runtimeToPlatformMapping =
      getRuntimeToPlatformMappingFromRuntimeVersions(runtimeVersions);

    const gitCommitHash = await vcsClient.getCommitHashAsync();
    const isGitWorkingTreeDirty = await vcsClient.hasUncommittedChangesAsync();

    // Sort the updates into different groups based on their platform specific runtime versions
    const updateGroups: PublishUpdateGroupInput[] = runtimeToPlatformMapping.map(
      ({ runtimeVersion, platforms }) => {
        const localUpdateInfoGroup = Object.fromEntries(
          platforms.map(platform => [
            platform,
            unsortedUpdateInfoGroups[platform as keyof UpdateInfoGroup],
          ])
        );

        return {
          branchId: createdBranch.id,
          updateInfoGroup: localUpdateInfoGroup,
          runtimeVersion,
          message: description,
          gitCommitHash,
          isGitWorkingTreeDirty,
          awaitingCodeSigningInfo: !!codeSigningInfo,
        };
      }
    );
    let newUpdates: UpdatePublishMutation['updateBranch']['publishUpdateGroups'];
    const publishSpinner = ora('Publishing...').start();
    try {
      newUpdates = await PublishMutation.publishUpdateGroupAsync(graphqlClient, updateGroups);

      if (codeSigningInfo) {
        Log.log('🔒 Signing updates');

        const updatesTemp = [...newUpdates];
        const updateGroupsAndTheirUpdates = updateGroups.map(updateGroup => {
          const newUpdates = updatesTemp.splice(
            0,
            Object.keys(nullthrows(updateGroup.updateInfoGroup)).length
          );
          return {
            updateGroup,
            newUpdates,
          };
        });

        await Promise.all(
          updateGroupsAndTheirUpdates.map(async ({ updateGroup, newUpdates }) => {
            await Promise.all(
              newUpdates.map(async newUpdate => {
                const response = await fetch(newUpdate.manifestPermalink, {
                  method: 'GET',
                  headers: { accept: 'multipart/mixed' },
                });
                const manifestBody = nullthrows(await getManifestBodyAsync(response));

                checkManifestBodyAgainstUpdateInfoGroup(
                  manifestBody,
                  nullthrows(
                    nullthrows(updateGroup.updateInfoGroup)[
                      newUpdate.platform as keyof UpdateInfoGroup
                    ]
                  )
                );

                const manifestSignature = signBody(manifestBody, codeSigningInfo);

                await PublishMutation.setCodeSigningInfoAsync(graphqlClient, newUpdate.id, {
                  alg: codeSigningInfo.codeSigningMetadata.alg,
                  keyid: codeSigningInfo.codeSigningMetadata.keyid,
                  sig: manifestSignature,
                });
              })
            );
          })
        );
      }

      publishSpinner.succeed('Published!');
    } catch (e) {
      publishSpinner.fail('Failed to publish updates');
      throw e;
    }

    // set channel rollout
    const rolloutPercent = disabled ? 0 : rollout ?? 100;
    const existingBranchMappingString = channel.branchMapping;
    let updatedBranchMapping: BranchMapping;
    if (!existingBranchMappingString) {
      updatedBranchMapping = getAlwaysTrueBranchMapping(createdBranch.id);
    } else {
      const existingBranchMapping = getBranchMapping(existingBranchMappingString);
      if (isEmptyBranchMapping(existingBranchMapping)) {
        updatedBranchMapping = getAlwaysTrueBranchMapping(createdBranch.id);
      } else if (isAlwaysTrueBranchMapping(existingBranchMapping)) {
        updatedBranchMapping =
          rolloutPercent === 100
            ? getAlwaysTrueBranchMapping(createdBranch.id)
            : createRolloutBranchMapping({
                defaultBranchId: existingBranchMapping.data[0].branchId,
                rolloutBranchId: createdBranch.id,
                runtimeVersion: '1',
                percent: rolloutPercent,
              });
      } else if (isRolloutBranchMapping(existingBranchMapping)) {
        if (rolloutPercent !== 100) {
          throw new Error('Cannot start a rollout on a deployment when one is already in progress');
        }
        updatedBranchMapping = getAlwaysTrueBranchMapping(createdBranch.id);
      } else {
        throw new Error('Unrecognized custom deployment structure');
      }
    }

    await updateChannelBranchMappingAsync(graphqlClient, {
      channelId: channel.id,
      branchMapping: JSON.stringify(updatedBranchMapping),
    });

    if (jsonFlag) {
      printJsonOnlyOutput(getUpdateJsonInfosForUpdates(newUpdates));
    } else {
      if (new Set(newUpdates.map(update => update.group)).size > 1) {
        Log.addNewLineIfNone();
        Log.log(
          '👉 Since multiple runtime versions are defined, multiple update groups have been published.'
        );
      }

      Log.addNewLineIfNone();

      for (const runtime of uniqBy(runtimeVersions, version => version.runtimeVersion)) {
        const newUpdatesForRuntimeVersion = newUpdates.filter(
          update => update.runtimeVersion === runtime.runtimeVersion
        );
        if (newUpdatesForRuntimeVersion.length === 0) {
          throw new Error(
            `Publish response is missing updates with runtime ${runtime.runtimeVersion}.`
          );
        }
        const platforms = newUpdatesForRuntimeVersion.map(update => update.platform);
        const newAndroidUpdate = newUpdatesForRuntimeVersion.find(
          update => update.platform === 'android'
        );
        const newIosUpdate = newUpdatesForRuntimeVersion.find(update => update.platform === 'ios');
        const updateGroupId = newUpdatesForRuntimeVersion[0].group;

        const projectName = exp.slug;
        const accountName = (await getOwnerAccountForProjectIdAsync(graphqlClient, projectId)).name;
        const updateGroupUrl = getUpdateGroupUrl(accountName, projectName, updateGroupId);
        const updateGroupLink = link(updateGroupUrl, { dim: false });

        Log.log(
          formatFields([
            { label: 'Branch', value: createdBranch.name },
            { label: 'Runtime version', value: runtime.runtimeVersion },
            { label: 'Platform', value: platforms.join(', ') },
            { label: 'Update group ID', value: updateGroupId },
            ...(newAndroidUpdate
              ? [{ label: 'Android update ID', value: newAndroidUpdate.id }]
              : []),
            ...(newIosUpdate ? [{ label: 'iOS update ID', value: newIosUpdate.id }] : []),
            { label: 'Message', value: description ?? '' },
            ...(gitCommitHash
              ? [
                  {
                    label: 'Commit',
                    value: `${gitCommitHash}${isGitWorkingTreeDirty ? '*' : ''}`,
                  },
                ]
              : []),
            { label: 'EAS Dashboard', value: updateGroupLink },
          ])
        );
        Log.addNewLineIfNone();
        if (
          isUploadedAssetCountAboveWarningThreshold(uploadedAssetCount, assetLimitPerUpdateGroup)
        ) {
          Log.warn(
            `This update group contains ${uploadedAssetCount} assets and is nearing the server cap of ${assetLimitPerUpdateGroup}.\n` +
              `${learnMore('https://docs.expo.dev/eas-update/optimize-assets/', {
                learnMoreMessage: 'Consider optimizing your usage of assets',
                dim: false,
              })}.`
          );
          Log.addNewLineIfNone();
        }
      }
    }
  }
}
