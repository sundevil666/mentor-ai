import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`Mentor AI API listening on ${config.host}:${config.port}`);
});
