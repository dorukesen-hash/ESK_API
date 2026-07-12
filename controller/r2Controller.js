const s3 = require('../utils/r2');
const path = require('path');

const getAllImages = async () => {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: process.env.R2_BUCKET,
        };

        s3.listObjectsV2(params, (err, data) => {
            if (err) {
                console.error('R2 Error:', err);
                return reject(err);
            }

            if (!data.Contents || data.Contents.length === 0) {
                console.warn('No content in server!');
                return resolve([]);
            }

            const imageUrls = data.Contents.map((item) => {
                return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET}/${item.Key}`;
            });

            resolve(imageUrls);
        });
    });
};

const uploadImage = async (file) => {
    return new Promise((resolve, reject) => {
        const fileName = `images/${Date.now()}_${path.basename(file.originalname)}`;
        const params = {
            Bucket: process.env.R2_BUCKET,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };

        s3.upload(params, (err, data) => {
            if (err) {
                console.error('❌ Yükleme sırasında hata:', err);
                return reject(err);
            }
            console.log('✅ Resim başarıyla yüklendi:', data.Location);
            const imageName = data.Location.split('images')[1]; //extracts image name from URL
            resolve(`images${imageName}`);
        });
    });
};

// Delete image from server
// Key must be last part of the url, like:"images/1740069288942_il_794xN.6353378249_hn6p.jpeg"
const removeImage = async (url) => {

    return new Promise(async (resolve, reject) => {
        const params = {
            Bucket: process.env.R2_BUCKET,
            Key: url,
        };

        // not working properly, but need this to validate image with key exists in R2
        await s3.headObject(params, (err, data) => {
            if (err) {
                //console.error('R2 Error:', err);
            }
            //resolve("error deleting Image from server!");
        })

        await s3.deleteObject(params, (err) => {
            if (err) {
                console.error('Error deleting Image:', err);
                return reject(err);
            }
            console.log('Image removed from server:', url);
            resolve(`Image removed from server: ${url}`);
        });
    });
};

const removeImages = async (urls) => {

    return Promise.all(
      urls.map(url => {
        const key = url; // Eğer sadece filename'si gerekiyorsa `url.split('/').pop()` yapabilirsin
        const params = {
          Bucket: process.env.R2_BUCKET,
          Key: key,
        };
  
        return new Promise((resolve, reject) => {
          s3.deleteObject(params, (err) => {
            if (err) {
              console.error(`Error deleting ${key} from R2:`, err);
              return reject(err);
            }
            console.log(`Deleted from R2: ${key}`);
            resolve();
          });
        });
      })
    );
  };
  

module.exports = {
    getAllImages,
    uploadImage,
    removeImage,
    removeImages
};