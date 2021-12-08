import { Android, Ios } from '@expo/eas-build-job';
import Joi from 'joi';

const CacheSchema = Joi.object({
  disabled: Joi.boolean(),
  key: Joi.string().max(128),
  cacheDefaultPaths: Joi.boolean(),
  customPaths: Joi.array().items(Joi.string()),
});

const CommonBuildProfileSchema = Joi.object({
  credentialsSource: Joi.string().valid('local', 'remote').default('remote'),
  distribution: Joi.string().valid('store', 'internal').default('store'),
  cache: CacheSchema,
  releaseChannel: Joi.string().regex(/^[a-z\d][a-z\d._-]*$/),
  channel: Joi.string().regex(/^[a-z\d][a-z\d._-]*$/),
  developmentClient: Joi.boolean(),

  node: Joi.string().empty(null).custom(semverSchemaCheck),
  yarn: Joi.string().empty(null).custom(semverSchemaCheck),
  expoCli: Joi.string().empty(null).custom(semverSchemaCheck),
  env: Joi.object().pattern(Joi.string(), Joi.string().empty(null)),
});

const AndroidBuildProfileSchema = CommonBuildProfileSchema.concat(
  Joi.object({
    credentialsSource: Joi.string().valid('local', 'remote'),
    distribution: Joi.string().valid('store', 'internal'),
    withoutCredentials: Joi.boolean(),

    image: Joi.string().valid(...Android.builderBaseImages),
    ndk: Joi.string().empty(null).custom(semverSchemaCheck),
    autoIncrement: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('version', 'versionCode')
    ),

    artifactPath: Joi.string(),
    gradleCommand: Joi.string(),

    buildType: Joi.string().valid('apk', 'app-bundle'),
  })
);

const IosBuildProfileSchema = CommonBuildProfileSchema.concat(
  Joi.object({
    credentialsSource: Joi.string().valid('local', 'remote'),
    distribution: Joi.string().valid('store', 'internal'),
    enterpriseProvisioning: Joi.string().valid('adhoc', 'universal'),
    autoIncrement: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('version', 'buildNumber')
    ),
    simulator: Joi.boolean(),

    image: Joi.string().valid(...Ios.builderBaseImages),
    bundler: Joi.string().empty(null).custom(semverSchemaCheck),
    fastlane: Joi.string().empty(null).custom(semverSchemaCheck),
    cocoapods: Joi.string().empty(null).custom(semverSchemaCheck),

    artifactPath: Joi.string(),
    scheme: Joi.string(),
    buildConfiguration: Joi.string(),
  })
);

export const BuildProfileSchema = CommonBuildProfileSchema.concat(
  Joi.object({
    extends: Joi.string(),
    android: AndroidBuildProfileSchema,
    ios: IosBuildProfileSchema,
  })
);

function semverSchemaCheck(value: any): any {
  if (/^[0-9]+\.[0-9]+\.[0-9]+$/.test(value)) {
    return value;
  } else {
    throw new Error(`${value} is not a valid version`);
  }
}