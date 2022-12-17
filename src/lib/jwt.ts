import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';

const HASURA_GRAPHQL_JWT_SECRET = {
  type: config.HASURA_JWT_SECRET_TYPE,
  key: config.HASURA_JWT_SECRET_KEY,
};

const JWT_CONFIG: jwt.SignOptions = {
  algorithm: HASURA_GRAPHQL_JWT_SECRET.type as 'HS256' | 'RS512',
  expiresIn: '12h',
};

interface GenerateJWTParams {
    defaultRole: string;
    allowedRoles: string[];
    otherClaims?: Record<string, string | string[] | Object>;
}

export class Jwt {
  generate(params: GenerateJWTParams): string {
    const payload = {
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': params.allowedRoles,
        'x-hasura-default-role': params.defaultRole,
        ...params.otherClaims,
      },
    };
    return jwt.sign(payload, HASURA_GRAPHQL_JWT_SECRET.key as jwt.Secret, JWT_CONFIG);
  }
  decode(token:string):Object {
    let data:any = {};
    let result: Object= {
      error: true,
      message: 'terjadi kesalahan',
    };
    try {
      data = jwt.verify(token, HASURA_GRAPHQL_JWT_SECRET.key as jwt.Secret);
      result = {
        error: false,
        data,
      };
    } catch (error:any) {
      result = {
        error: true,
        message: error.toString(),
      };
    } finally {
      return result;
    }
  }
}


