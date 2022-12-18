import express, { Request, Response } from 'express';
import fs from 'fs';
import { Checker } from '../lib';

const route = express.Router();
const buildVersion = fs.readFileSync('.version', ).toString();

route.get('/', async (req:Request, res: Response) =>{
  const check = new Checker();
  const status = {
    'redis': await check.redis(),
    'database': await check.databases(req),
  };
  const errorCount = check.getErrorCount();
  const arrEmoji = [ '😢', '😱' ];
  res.status(errorCount > 0 ? 500 : 200).send(`
  <title>Pok Pok Coy API</title>
  Pok Pok Coy API ${buildVersion != '' ? `- build (${buildVersion})` : ''}
  <pre>
  <b>System Status: ${errorCount > 0 ? `${errorCount} systems failure ${arrEmoji[errorCount - 1]}` : 'Running Well ✔'}</b>
  - Database: ${status.database}
  - Redis: ${status.redis}
  </pre>`);
});

export = route
