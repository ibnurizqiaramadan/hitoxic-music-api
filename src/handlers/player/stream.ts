import { Request, Response } from 'express';
import request from 'request';

const stream = (req: Request, res: Response) => {
  const { key } = req.params;
  const mainFunction = async () => {
    // eslint-disable-next-line no-undef
    const url:string = Buffer.from(key, 'base64').toString('ascii');
    req.pipe(request(url)).pipe(res);
    // const url:string = Buffer
  };
  mainFunction();
};

export default stream;
