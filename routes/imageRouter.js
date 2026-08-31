const express = require('express');
const multer = require('multer');
const { uploadImage, removeImage, removeImages} = require('../controller/r2Controller');
const { addImage, getImageByID, deleteImage, getImages, deleteImageConnections} = require('../controller/imageController');
const {Variant, Subcategory, SubcategoryImages, ProductImages, VariantImages} = require("../db/models");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//Upload image to R2 and save URL to database
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Yüklenecek dosya bulunamadı.' });
        }
        const r2Response = await uploadImage(req.file); //add image to R2 and save response URL
        const savedImage = await addImage(r2Response); //save URL to database

        res.status(201).json({
            message: 'Resim başarıyla yüklendi ve URL veritabanına kaydedildi.',
            data: savedImage,
        });
    } catch (error) {
        console.error('❌ İşlem sırasında hata:', error);
        res.status(500).json({
            message: 'Resim yükleme ve URL kaydetme başarısız.',
            error: error.message,
        });
    }
});

//Get all image ids and urls
router.get('/all', async (req, res) => {
  try{
      let {search} = req.query
      const images = await getImages(search)
      res.status(200).json({success: true, data: images})
  }catch(err){
      console.log(err)
    res.status(500).json({message: 'Error getting images', error:err.message});
  }
})

router.post('/delete', async (req, res) => {
    try {
      const { images } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ message: 'No images provided.' });
      }
  
      const urls = images.map(img => img.url);
      const ids = images.map(img => img.id);
  
      // 1. R2'den sil
      await removeImages(urls);
  
      // 2. DB'den sil
      await Promise.all(ids.map(id => deleteImage(id)));
  
      res.status(200).json({ success: true, message: 'Images deleted successfully.' });
    } catch (error) {
      console.error('Error during bulk delete:', error);
      res.status(500).json({ message: 'Error deleting images.', error: error.message });
    }
  });

//ATTACH PHOTOS FOR THE PRODUCTS
  router.post('/attach', async (req, res) => {
    try {
      const { ids, target, targetId } = req.body;

      await deleteImageConnections(target,targetId)

      let bulkData;
      if(target === "subcategory") {
             bulkData = ids.map((item, index) => ({subcategoryId: targetId, imageId: item, position: index }))
            await SubcategoryImages.bulkCreate(bulkData);
        } else if ( target === "product") {
            bulkData = ids.map((item, index) => ({productId: targetId, imageId: item, position: index }))
            await ProductImages.bulkCreate(bulkData);
        } else if ( target === "variant") {
            bulkData = ids.map((item, index) => ({variantId: targetId, imageId: item, position: index }))
            await VariantImages.bulkCreate(bulkData);
        }

      res.status(200).json({ success: true, message: 'Images attached successfully.' });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ message: 'Error attaching images.', error: error.message });
    }
  });
  

//Get all images of a SubCategory
//GET api/images/subcategory/:name
router.get('/subcategory/:name', async (req, res) => {
    try {
        const categoryName = req.params.name;

        const images = await Image.findAll({
            include: [
                {
                    model: Variant,
                    include: [
                        {
                            model: Subcategory,
                            where: { name: categoryName },
                        }
                    ]
                }
            ]
        });

        if (!images.length) {
            return res.status(404).json({ message: 'No images found for this category' });
        }

        res.json(images.map(image => image.url));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;