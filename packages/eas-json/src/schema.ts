import Joi from 'joi';

import { BuildProfileSchema } from './build/schema';
import { SubmitProfileSchema } from './submit/schema';
import { AppVersionSource } from './types';

export const EasJsonSchema = Joi.object({
  cli: Joi.object({
    version: Joi.string(),
    requireCommit: Joi.boolean(),
    appVersionSource: Joi.string().valid(...Object.values(AppVersionSource)),
    promptToConfigurePushNotifications: Joi.boolean(),
  }),
  build: Joi.object().pattern(Joi.string(), BuildProfileSchema),
  submit: Joi.object().pattern(Joi.string(), SubmitProfileSchema),
  update: Joi.object({
    assetExcludePatterns: Joi.array().items(Joi.string()),
  }),
});
