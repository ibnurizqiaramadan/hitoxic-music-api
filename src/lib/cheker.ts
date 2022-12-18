// eslint-disable-next-line no-unused-vars
import logger from './logger';
import { Builder, redis } from '.';

export class Checker {
  private errorCount:number = 0;
  async databases(req: any): Promise<string> {
    const builder = new Builder();
    const data:any = await builder.run({
      query: builder.query({
        table: 'testing',
        fields: [ 'id' ],
        params: { limit: 1 },
      }, req),
      req,
      noAuth: true,
      noPagination: true,
    });
    let cekDatabase = 'connected';
    if (data['error']) {
      cekDatabase = '<b>failed</b>';
      this.errorCount++;
    }
    return cekDatabase;
  }
  async redis(): Promise<string> {
    const time: string = (+new Date()).toString();
    let cekRedis = '';
    try {
      await redis.set(`running-test-${time}`, time);
      cekRedis = await redis.get(`running-test-${time}`) == time ? 'connected' : '<b>failed</b>';
      await redis.del(`running-test-${time}`);
    } catch (error) {
      this.errorCount++;
      cekRedis = '<b>failed</b>';
    }
    return cekRedis;
  }
  getErrorCount():number {
    return this.errorCount;
  }
}
