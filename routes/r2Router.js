const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getAllImages, uploadImage, removeImage} = require('../controller/r2Controller');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// Get all images from R2
router.get('/get-images', async (req, res) => {
    try {
        const images = await getAllImages();
        res.status(200).json({
            message: 'Successfully retrieved images',
            data: images,
        });
    } catch (error) {
        console.error('Error retrieving images:', error);
        res.status(500).json({
            message: 'Error retrieving images',
            error: error.message,
        });
    }
});

// Add new image to R2
router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file to upload' });
        }
        const imageUrl = await uploadImage(req.file); //saves image in R2 and returns full URL
        res.status(201).json({
            message: 'Image uploaded successfully.',
            data: imageUrl,
        });
    } catch (error) {
        console.error('Error while uploading image:', error);
        res.status(500).json({
            message: 'Upload failed',
            error: error.message,
        });
    }
});

// Delete target image from R2
router.delete('/delete-image', async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ message: 'Image (key) must be provided!' });
        }

        const result = await removeImage(key);

        res.status(200).json({
            message: 'Image removed successfully.',
            data: result,
        });
    } catch (error) {
        console.error('Error deleting Image:', error);
        res.status(500).json({
            message: 'Error while removing image.',
            error: error.message,
        });
    }
});

module.exports = router;