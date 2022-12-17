import { config } from '../config/config';
import { GraphQLClient } from 'graphql-request';
import { Request } from 'express';
import { redis, clientAdmin, client, Jwt } from '.';
import * as gql from 'graphql-request';
// eslint-disable-next-line no-unused-vars
import logger from './logger';

// interface for query function
interface QueryParams {
    table: string,
    fields: Array<any>,
    searchAble?: Array<any>,
    params: {
      limit?: number,
      distinct_on?: string,
      offset?: number,
      order_by?: Object,
      where?: object
    }
}
// interface for run function
interface RunParams {
  query: string,
  headers?: Record<string, string>,
  req: Request,
  raw?:boolean,
  noAuth?: boolean
  noPagination?: boolean
}
// interface for create function
interface CreateParams {
  table: string,
  fields: any,
  returning: Array<any>
}
// interface for update function
interface UpdateParams {
  table: string,
  where: Object,
  set: any,
  returning: Array<any>
}
// interface for delete function
interface DeleteParams {
  table: string,
  where: Object,
  returning: Array<any>
}
// interface for getAllInput function
interface GetAllInputParams {
  input: Object,
  custom?: Record<string, string>,
  fillable?: Array<any>
}

export class Builder {
  // private function for get where params
  private _getWhere(where: any): string {
    let whereItem = '{';
    Object.keys(where).forEach((field) => {
      if (field.startsWith('_')) {
        let _p = `${field}:[`;
        if (Object.keys(where[field]).length == 0) return whereItem += `${field}:[] `;
        Object.keys(where[field]).forEach((_op) =>{
          const _item = JSON.stringify(where[field][_op]).split(':');
          _p += `{${_op}: ${_item[0].replace(/"/g, '')}: ${_item[1]}},`;
        });
        _p = _p.substring(0, _p.length - 1) + '],';
        whereItem += _p;
        return;
      }
      let opVa = '';
      Object.keys(where[field]).forEach((op) => {
        opVa += `{${op} : "${where[field][op]}"}`;
      });
      whereItem += `${field}: ${opVa},`;
    });
    whereItem = whereItem.substring(0, whereItem.length - 1);
    whereItem += '}';
    return whereItem.replace(/  +/g, '').replace(/\n/g, '');
  }
  // private function for get returning query
  private _returning(returning: Array<any>): string {
    let returning_: string = '';
    returning.forEach((field) => {
      returning_ += `${field} `;
    });
    returning_ = returning_.substring(0, returning_.length);
    return returning_;
  }
  // private fucntion for key value
  private _keyValue(arr: any): string {
    let _keyVal = '';
    Object.keys(arr).forEach((field) => {
      let val:string = arr[field];
      if (val.startsWith('jsonb ')) {
        val = val.replace(/&quot;/g, '\\"').replace(/jsonb /g, '');
      }
      _keyVal += `${field}: "${val}",`;
    });
    return _keyVal;
  }
  // private function for return query
  private _returnQuery(query: string) {
    return query
        .replace(/  +/g, '')
        .replace(/\n/g, '')
        .replace(/"{{/g, '')
        .replace(/}}"/g, '');
  }
  // private function for get table
  private _getTableQuery(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      Object.keys(data).forEach((table) => {
        resolve(table);
      });
    });
  }
  // private function query get total data
  private async _getTotalData(table: string, gclient: any) {
    try {
      const data = await gclient.rawRequest(gql.gql`query {
        ${table} {
          aggregate {
            count
          }
        }
      }
      `);
      return data['data'][table]['aggregate']['count'];
    } catch (error) {
      logger.error(error);
    }
  }
  // private function query get total filtered data
  private async _getFilteredTotalData(table: string, query: string, req: Request, gclient: any) {
    try {
      const fieldSeach = query.split(`####--data-search-field=`)[1].split(',') ?? [];
      const whereQuery:any = {};
      const whereQueryVal:any = {};
      const { search } = req.query;
      fieldSeach.forEach((field) => {
        whereQueryVal[field] = { _like: `%${search ?? ''}%` };
      });
      whereQuery['_or'] = whereQueryVal;
      // logger.warn(whereQuery);
      const where = this._getWhere(whereQuery);
      const data = await gclient.rawRequest(gql.gql`query {
        ${table}(where: ${where}) {
          aggregate {
            count
          }
        }
      }
      `);
      return data['data'][table]['aggregate']['count'];
    } catch (error) {
      logger.error(error);
    }
  }
  // run query function
  async run(params: RunParams): Promise<Object> {
    let result: Object = {
      error: true,
      message: 'Terjadi kesalahan.',
    };
    try {
      const gclient: GraphQLClient = (params.noAuth ?? false) == false ? client : clientAdmin;
      const queryParams = params.req ? params.req?.query : {};
      const query = params.query;
      const noPagination = params.noPagination ? params.noPagination : false;
      if (params.headers != null) gclient.setHeaders(params.headers);

      // check auth if noAuth is false
      if ((params.noAuth ?? false) == false) {
        const { authorization } = params.req.headers;
        // check if headers has authorization
        if (authorization === undefined || authorization.trim() == '') {
          // eslint-disable-next-line no-throw-literal
          throw result = {
            error: true,
            statusCode: 401,
            messages: 'Token tidak valid',
          };
        }
        // cek token logout
        const token = authorization.split(' ')[1];
        const userLogout = await redis.get(`user-logout-${token}`);

        if (userLogout) {
          // eslint-disable-next-line no-throw-literal
          throw result ={
            error: true,
            statusCode: 401,
            messages: 'Tidak ada akses',
          };
        }
        gclient.setHeader('Authorization', `${authorization}`);
      }

      const data = await gclient.rawRequest(gql.gql`${query}`);

      const table = await this._getTableQuery(data['data']);

      const prefix = table.split('_');
      switch (prefix[0]) {
        case 'insert':
        case 'update':
        case 'delete':
          result = {
            data: data['data'][table],
          };
          break;
        default:
          // eslint-disable-next-line no-case-declarations
          const totalData = noPagination ? 0 : await this._getTotalData(table, gclient);
          // eslint-disable-next-line no-case-declarations
          const totalFilteredData = noPagination ? 0 : await this._getFilteredTotalData(table, gql.gql`${query}`, params.req, gclient) ?? totalData;
          // eslint-disable-next-line no-case-declarations
          const { pagesize, page, search } = queryParams;
          // eslint-disable-next-line no-case-declarations
          const filtered = (search) ? totalFilteredData : totalData;
          // eslint-disable-next-line no-case-declarations
          const pagination = {
            page: Number(page) ?? 1,
            pageSize: Number(pagesize) ?? 10,
            pageCount: Math.ceil(Number(filtered / Number(pagesize))),
            total: Number(filtered),
            // total: Number(totalData),
          };
          // eslint-disable-next-line no-case-declarations
          const paginationVar = noPagination ? {} : pagination;
          // eslint-disable-next-line no-case-declarations
          const tempResult = {
            data: params.raw == true ? data['data'][table] : data['data'][table]['nodes'],
            count: params.raw == true ? 0 : data['data'][table]['aggregate']['count'],
            pagination: paginationVar,
          };
          result = params.raw == true ? tempResult.data : tempResult;
          // logger.warn(result);
          break;
      }
    } catch (error:any) {
      logger.error(error);
      const errorDB:any = error['response']['code'] ? {
        code: error['response']['code'],
        message: error['response']['error'],
      } : {
        code: error['response']['errors'][0]['extensions']['code'],
        message: error['response']['errors'][0]['message'],
      };
      errorDB['error'] = true;
      errorDB['query'] = error['request']['query'];
      result = errorDB;
    } finally {
      return result;
    }
  }
  // query builder function
  query(params: QueryParams, req: Request): string {
    const { search, orderby } = req['query'] ? req['query'] : { search: '', orderby: '' };
    // page and page size
    const pagesize = req.query['pagesize'] ? req.query['pagesize'] : params.params.limit ? params.params.limit : 10;
    const limit = pagesize;
    const offset = req.query['page'] ? (parseInt(pagesize.toString()) * parseInt(req.query['page'].toString()) - parseInt(pagesize.toString())).toString() : 0;

    // search
    const whereQuery:any = {};
    const whereQueryVal:any = {};
    const fieldSeach = params.searchAble ? params.searchAble : params.fields;
    fieldSeach.forEach((field) => {
      if (!search) return;
      whereQueryVal[field] = { _like: `%${search ?? ''}%` };
    });
    if (search) whereQuery['_or'] = whereQueryVal;

    // order by
    const orderbyVal:any = {};
    const orderArray = orderby?.toString().split(',') ?? [];
    orderArray.forEach((order) => {
      orderbyVal[order.split(':')[0]] = order.split(':')[1];
    });

    const whereParams = Object.assign(params.params?.where ?? {}, whereQuery);
    const orderByParams = Object.assign(params.params?.order_by ?? {}, orderbyVal);
    // set default params
    const defaultParam = {
      limit: limit,
      offset: offset < 0 ? 0 : offset,
      where: whereParams,
      order_by: orderByParams,
    };
    Object.assign(params?.params ?? {}, defaultParam);
    let field_: string = '';
    let queryParam: string = '';
    params.fields.forEach((field) => {
      field_ += `${field} `;
    });
    if (params.params != null) {
      queryParam += '(';
      let paramItem = '';
      Object.keys(params.params).forEach((param) => {
        if (param == 'order_by') {
          paramItem += `order_by: ${JSON.stringify(params.params[param]).replace(/"/g, '')},`;
          return;
        }
        if (param == 'where') {
          const where_:any = params.params['where'];
          if (Object.keys(where_).length == 0) return;
          const whereItem = this._getWhere(where_);
          paramItem += `where: ${whereItem},`;
          return;
        }
        const param_:any = params.params;
        paramItem += `${param}: ${param_[param]},`;
      });
      paramItem = paramItem.substring(0, paramItem.length - 1);
      queryParam += paramItem;
      queryParam += ')';
    }
    const query = gql.gql`
    query{
        ${config.DB_PREFIX}${params.table}_aggregate${queryParam} {
            aggregate {
                count
            }
            nodes {
                ${field_}
            }
        }
    }
    ` + `####--data-search-field=${fieldSeach}`;
    return this._returnQuery(query);
  }
  // query builder insert function
  create(params: CreateParams): string {
    let field_: string ='';
    let query: string = '';
    Object.keys(params.fields).forEach((field) => {
      field_ += `${field}: "${params.fields[field]}",`;
    });
    let returning = this._returning(params.returning);
    returning = returning.substring(0, returning.length - 1);
    field_ = field_.substring(0, field_.length - 1);
    query += gql.gql`
      mutation create_${params.table} {
        insert_${config.DB_PREFIX}${params.table}(objects: { ${field_} }) {
          affected_rows 
          returning { ${returning} }
        }
      }
      `;
    return this._returnQuery(query);
  }
  // query builder update function
  update(params: UpdateParams): string {
    let _set: string ='';
    let query: string = '';
    _set += this._keyValue(params.set);
    const whereItem = this._getWhere(params.where);
    const returning = this._returning(params.returning);
    _set = _set.substring(0, _set.length - 1);
    query += gql.gql`
      mutation update_${params.table} {
        update_${config.DB_PREFIX}${params.table}(where: ${whereItem},_set: { ${_set} }) {
          affected_rows 
          returning { ${returning} }
        }
      }
      `;
    return this._returnQuery(query);
  }
  // query builder delete function
  delete(params: DeleteParams): string {
    let query: string = '';
    const whereItem = this._getWhere(params.where);
    const returning = this._returning(params.returning);
    query += gql.gql`
      mutation delete_${params.table} {
        delete_${config.DB_PREFIX}${params.table}(where: ${whereItem}) {
          affected_rows 
          returning { ${returning} }
        }
      }
      `;
    return this._returnQuery(query);
  }
  // get all input post function
  getAllInput(params: GetAllInputParams): Object {
    let result: any = {};
    Object.keys(params.input).forEach((input) => {
      const input_:any = params.input;
      result[input] = input_[input];
    });
    if (Object.keys(params.custom ?? {}).length > 0) {
      const custom:any = params.custom;
      Object.keys(custom).forEach((input) => {
        result[input] = custom[input];
      });
    }
    if (Object.values(params.fillable ?? {}).length > 0) {
      const tempResult: any = {};
      Object.values(params.fillable as string[]).forEach((input) => {
        tempResult[input] = result[input];
      });
      result = tempResult;
    }
    return result;
  }
  // set table function
  setTable(table: string) {
    return `${config.DB_PREFIX}${table}`;
  }
  // get token user id function
  getTokenUserId(req: Request) {
    const jwt = new Jwt();
    const token = req.headers.authorization?.split(' ')[1]??null;
    if (!token) return null;
    const jsonToken:any = jwt.decode(token);
    if (jsonToken['error']) return null;
    return jsonToken['data']['https://hasura.io/jwt/claims']['X-Hasura-User-Id']??null;
  }
  // get token school id function
  getTokenSchoolId(req: Request) {
    const jwt = new Jwt();
    const token = req.headers.authorization?.split(' ')[1]??null;
    if (!token) return null;
    const jsonToken:any = jwt.decode(token);
    if (jsonToken['error']) return null;
    return jsonToken['data']['https://hasura.io/jwt/claims']['X-Hasura-School-Id']??null;
  }
  // get token default role function
  getTokenDefaultRole(req: Request) {
    const jwt = new Jwt();
    const token = req.headers.authorization?.split(' ')[1]??null;
    if (!token) return null;
    const jsonToken:any = jwt.decode(token);
    if (jsonToken['error']) return null;
    return jsonToken['data']['https://hasura.io/jwt/claims']['x-hasura-default-role']??null;
  }
}
