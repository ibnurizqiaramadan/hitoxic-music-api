/* eslint-disable no-undef */
export const config = {
  APP_PORT: process.env.APP_PORT,
  HASURA_ENDPOINT: process.env.HASURA_ENDPOINT,
  HASURA_SEC: process.env.HASURA_SEC,
  HASURA_JWT_SECRET_TYPE: process.env.HASURA_JWT_SECRET_TYPE,
  HASURA_JWT_SECRET_KEY: process.env.HASURA_JWT_SECRET_KEY,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASS: process.env.REDIS_PASS,
};
