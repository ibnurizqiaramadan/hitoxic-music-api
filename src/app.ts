import express from 'express';
import bodyParser from 'body-parser';
import morganMiddleware from './middleware/morganMiddleware';
import logger from './lib/logger';
import formData from 'express-form-data';
import dotenv from 'dotenv';
import os from 'os';
import fs from 'fs';
dotenv.config();
import { config } from './config/config';


const app = express();

const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};
app.use(formData.parse(options));
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());
app.use(morganMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// load routes
fs.readdirSync('./src/routes')
    .filter((file) => file.endsWith('.ts'))
    .forEach((file) => {
      logger.warn(`Route ${file.split('.')[0]} loaded`);
      const routeName = file.split('.')[0];
      app.use(`/${routeName === 'index' ? '' : routeName}`, require(`./routes/${routeName}`));
    });

app.listen(config.APP_PORT, () => {
  logger.warn(`🚀 Server ready running on port ${config.APP_PORT}.`);
});
