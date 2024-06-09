import dotenv from 'dotenv';
dotenv.config();

const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

export {
  B2_APPLICATION_KEY_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_ID,
  B2_BUCKET_NAME,
};
