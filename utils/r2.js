const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(process.env.R2_ENDPOINT),
    accessKeyId: process.env.R2_ACCESS_ID_KEY,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    signatureVersion: 'v4',
});

module.exports = s3;