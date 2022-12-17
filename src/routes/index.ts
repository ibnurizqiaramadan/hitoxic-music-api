import express, { Request, Response } from 'express';
import fs from 'fs';
// import { Checker } from '../lib';

const route = express.Router();
const buildVersion = fs.readFileSync('.version', ).toString();

route.get('/', async (req:Request, res: Response) =>{
  res.send(`Pok Pok Coy ${buildVersion != '' ? `- build (${buildVersion})` : ''}`);
});

export = route
