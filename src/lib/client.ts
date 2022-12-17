import { GraphQLClient } from 'graphql-request';
import { config } from '../config/config';

export const client = new GraphQLClient(config.HASURA_ENDPOINT as string);

