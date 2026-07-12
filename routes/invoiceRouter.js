const router = (module.exports = require('express').Router())
const AppError = require('../utils/appError')
const { generateInvoicePDF } = require('../controller/invoiceController');

// Generate invoice PDF and send to frontend
router.get('/pdf/:orderId', async (req, res, next) => {
	try {
		const orderId = req.params.orderId;
		res.contentType('application/pdf')
		const pdfBuffer = await generateInvoicePDF(orderId);
		if (!pdfBuffer || pdfBuffer.length < 100) {
			console.error('PDF generation failed or buffer too small:', pdfBuffer);
			return res.status(500).send('PDF generation failed');
		}
		return res.status(200).send(pdfBuffer);
	} catch (err) {
		console.error('Error in PDF endpoint:', err);
		next(err);
	}
});