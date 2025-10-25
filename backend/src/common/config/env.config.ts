import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';

export const envConfig = ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(3000),
    POSTGRES_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    OKX_API_KEY: Joi.string().required(),
    WALLET_CONTRACT_ADDRESS: Joi.string().required(),
    CORS_ORIGIN: Joi.string().default('*'),
  }),
});
