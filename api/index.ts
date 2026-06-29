import serverless from 'serverless-http';
import { createApp } from '../apps/api/src/app.js';

export default serverless(createApp());
