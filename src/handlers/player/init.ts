import { Request, Response } from 'express';
import { Builder } from '../../lib';

const init = (req: Request, res: Response) => {
  const builder = new Builder();
  const mainFunction = async () => {
    const query = builder.create({
      table: 'queue_setting',
      returning: [ 'id' ],
      fields: {
        repeat: '0',
        readonly: false,
      },
    });
    console.log(query);

    const result:any = await builder.run({ query, req, noAuth: true });
    if (result['error']) {
      return res.status(result['statusCode'] ?? 500).send({
        statusCode: result['statusCode'] ?? 500,
        message: result['messages'] || result['message'],
      });
    }
    res.status(200).send({
      statusCode: 200,
      data: result['data']['returning'][0]['id'],
    });
  };
  mainFunction();
};

export default init;
