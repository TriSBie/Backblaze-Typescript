import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { backblazeMiddleware } from './middleware';
import uploadRouter from './routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
app.get('/', backblazeMiddleware, (req, res) => {
  res.send('Hello World');
});
app.use('/api', backblazeMiddleware, uploadRouter);

app.use('*', (req, res) => {
  res.status(404).send('Not Found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
