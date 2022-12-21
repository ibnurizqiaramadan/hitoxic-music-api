import express from 'express';
// Import Handlers
import handlers from '../handlers/player';

const route = express.Router();

route.get('/play', handlers.play);
route.get('/init', handlers.init);
route.get('/stream/:key', handlers.stream);

export = route
