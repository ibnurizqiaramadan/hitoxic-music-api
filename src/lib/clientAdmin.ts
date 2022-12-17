import { GraphQLClient } from 'graphql-request';
import { config } from '../config/config';

export const clientAdmin = new GraphQLClient(config.HASURA_ENDPOINT as string, {
  headers: { 'x-hasura-admin-secret': config.HASURA_SEC as string },
});

