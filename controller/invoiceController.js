const { Invoice, Shipment, User, Order } = require('../db/models');
const { default: puppeteer } = require('puppeteer');
const fs = require('fs');
const path = require('path');



const getInvoices = async () => {
    return await Invoice.findAll()
}

// Admin invoice list - GET /api/admin/invoices
const getInvoicesForAdmin = async ({ page = 0, limit = 50 } = {}) => {
    const limitNum = parseInt(limit) || 50;
    const offsetNum = (parseInt(page) || 0) * limitNum;

    return await Invoice.findAndCountAll({
        include: [
            { model: User, attributes: ['id', 'name', 'surname', 'email'] },
            { model: Order, attributes: ['id', 'orderNumber'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset: offsetNum,
    });
};


// ...existing code...

// Helper to render HTML for invoice (replace with template engine if needed)
function formatDateUS(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;
}

function renderInvoiceHTML(invoice) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Invoice ${invoice.invoice_no}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 40px; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
    .section { margin-bottom: 20px; }
    .section h3 { margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    .address-row { display: flex; gap: 40px; margin-bottom: 20px; }
    .address-col { flex: 1; background: #fafafa; padding: 16px; border-radius: 8px; border: 1px solid #eee; }
        .totals { text-align: right; font-weight: bold; margin-top: 10px; }
        .header { display: flex; justify-content: space-between; align-items: center; }
    .logo { width: 560px; height: 280px; object-fit: contain; }
        .summary-table { width: 300px; float: right; margin-top: 20px; }
        .summary-table td { border: none; padding: 6px 8px; }
        .summary-table tr:last-child td { font-weight: bold; font-size: 1.1em; }
    </style>
</head>
<body>

    <div class="header">
        <div>
            <h2>ESK PACKAGING LLC</h2>
            <p>1099 VINE STREET SUITE 204<br>
            SACRAMENTO, CA 95811-0335<br>
            <a href="mailto:yavuz.ekizoglu@eskpackaging.com">yavuz.ekizoglu@eskpackaging.com</a><br>
            +1 (469) 992-2447</p>
        </div>
        <div>
                <img src="${invoice.logo}" alt="Company Logo" class="logo" width="560" height="280" />
        </div>
    </div>

    <h1>INVOICE</h1>

    <div class="section">
        <h3>Invoice Details</h3>
       <p><strong>Invoice No:</strong> ${invoice.invoice_no}<br>
           <strong>Invoice Date:</strong> ${formatDateUS(invoice.invoice_date)}</p>
    </div>

    <div class="address-row">
        <div class="address-col">
            <h3>Bill To</h3>
            <p>${invoice.bill_to.name}<br>
                ${invoice.bill_to.address}<br>
                ${invoice.bill_to.city}, ${invoice.bill_to.state} ${invoice.bill_to.zip}<br>
                ${invoice.bill_to.country}</p>
        </div>
        <div class="address-col">
            <h3>Ship To</h3>
            <p>${invoice.ship_to.name}<br>
                ${invoice.ship_to.address}<br>
                ${invoice.ship_to.city}, ${invoice.ship_to.state} ${invoice.ship_to.zip}<br>
                ${invoice.ship_to.country}<br>
                ${invoice.ship_to.notes}</p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Description</th>
                <th>QTY</th>
                <th>RATE</th>
                <th>AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            ${(invoice.items || []).map(item => `
            <tr>
                <td>${item.stock || ''}</td>
                <td>${item.title || ''}</td>
                <td>${item.quantity || ''}</td>
                <td>${item.price || ''}</td>
                <td>${(item.quantity && item.price) ? (item.quantity * item.price).toFixed(2) : item.amount || ''}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <table class="summary-table">
        <tr>
            <td>Subtotal:</td>
            <td>$${invoice.subtotal || invoice.total || '0.00'}</td>
        </tr>
        <tr>
            <td>TAX:</td>
            <td>$0.00</td>
        </tr>
        <tr>
            <td>BALANCE DUE:</td>
            <td>$${invoice.subtotal || invoice.total || '0.00'}</td>
        </tr>
    </table>

</body>
</html>`;
    return html;
}

const { OrderItem } = require('../db/models');

const generateInvoicePDF = async (orderId) => {
    // Fetch order and order items from DB
    const order = await Order.findByPk(orderId);

    if (!order) throw new Error('Order not found');

    const orderItems = await OrderItem.findAll({ where: { orderId } });


    // Build invoice line items from orderItems
    let invoiceLineItems = orderItems.map((item, idx) => ({
        stock: item.stock || '',
        title: item.title || '',
        quantity: item.quantity || '',
        price: item.price || '',
        amount: (item.quantity && item.price) ? (item.quantity * item.price) : item.amount || '',
    }));

    // If shipmentId exists, fetch shipment and add as line item if totalPrice exists
    let shipmentLineItem = null;
    if (order.shipmentId) {
        const shipment = await Shipment.findByPk(order.shipmentId);
        if (shipment && shipment.totalPrice) {
            shipmentLineItem = {
                index: invoiceLineItems.length + 1,
                date: shipment.createdAt || order.invoice_date || order.createdAt,
                product: 'Shipment',
                description: shipment.name || 'Shipment Fee',
                qty: 1,
                rate: shipment.totalPrice,
                amount: shipment.totalPrice
            };
            invoiceLineItems.push(shipmentLineItem);
        }
    }

    // Fetch Billing and Shipment for address info
    const { Billing } = require('../db/models');
    let billing = null;
    if (order.billingId) {
        billing = await Billing.findByPk(order.billingId);
    }
    let shipment = null;
    if (order.shipmentId) {
        shipment = await Shipment.findByPk(order.shipmentId);
    }

    // Read logo as base64
    const logoPath = path.join(__dirname, '../public/images/ESK_icon.png');
    let logoBase64 = '';
    try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
        logoBase64 = '';
    }

    // Real Invoice row (auto-created by confirmOrderPayment once payment
    // is confirmed - see orderController.js). Older/unpaid orders may not
    // have one yet; fall back to the order's own id/date rather than
    // fabricating invoice_no/date, matching prior (if incorrect) behavior.
    const invoiceRecord = order.invoiceId ? await Invoice.findByPk(order.invoiceId) : null;

    // Build invoice data
    const invoice = {
        invoice_no: invoiceRecord?.documentNumber || order.id,
        invoice_date: invoiceRecord?.issueDate || order.createdAt,
        logo: logoBase64, // Embedded base64 logo
        bill_to: {
            name: billing?.name || order.bill_to?.name || 'Customer Name',
            address: billing?.secondline ? billing?.firstline + " " + billing?.secondline : billing?.firstline || 'Customer Address',
            city: billing?.city || order.bill_to?.city || 'City',
            state: billing?.state || order.bill_to?.state || 'State',
            zip: billing?.zip || order.bill_to?.zip || 'Zip',
            country: 'United States'
        },
        ship_to: {
            name: shipment?.name || order?.name || ' ',
            address: shipment?.secondline ? shipment?.firstline + " " + shipment?.secondline : shipment?.firstline || 'Recipient Address',
            city: shipment?.city || order.ship_to?.city || 'City',
            state: shipment?.state || order.ship_to?.state || 'State',
            zip: shipment?.zip || order.ship_to?.zip || 'Zip',
            country: 'United States',
            notes: shipment?.extra_informations || order.ship_to?.notes || ''
        },
        items: invoiceLineItems,
        subtotal: order.price || '',
        total: invoiceLineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    };


    // Puppeteer PDF generation
    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ]
     });
    const page = await browser.newPage();
    const html = renderInvoiceHTML(invoice);

    await page.setContent(html, { waitUntil: 'networkidle0'});
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: '10px' });
    await browser.close();
    return Buffer.from(pdfBuffer);
};

function renderPackingSlipHTML(slip) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Packing Slip ${slip.order_no}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #333; margin: 40px; }
        h1 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .logo { width: 280px; height: 140px; object-fit: contain; }
        .section { margin-bottom: 20px; }
        .address-col { background: #fafafa; padding: 16px; border-radius: 8px; border: 1px solid #eee; max-width: 360px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>ESK PACKAGING LLC</h2>
        <img src="${slip.logo}" alt="Company Logo" class="logo" />
    </div>

    <h1>PACKING SLIP</h1>

    <div class="section">
        <p><strong>Order #:</strong> ${slip.order_no}</p>
    </div>

    <div class="address-col">
        <h3>Ship To</h3>
        <p>${slip.ship_to.name}<br>
            ${slip.ship_to.address}<br>
            ${slip.ship_to.city}, ${slip.ship_to.state} ${slip.ship_to.zip}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>SKU</th>
                <th>Description</th>
                <th>QTY</th>
            </tr>
        </thead>
        <tbody>
            ${(slip.items || []).map(item => `
            <tr>
                <td>${item.stock || ''}</td>
                <td>${item.title || ''}</td>
                <td>${item.quantity || ''}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
}

// A pick/ship document, not a receipt - deliberately no prices/totals. Same
// Puppeteer pattern as generateInvoicePDF above, reusing the same address
// resolution (Shipment for "Ship To").
const generatePackingSlipPDF = async (orderId) => {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error('Order not found');

    const { OrderItem } = require('../db/models');
    const orderItems = await OrderItem.findAll({ where: { orderId } });
    const shipment = order.shipmentId ? await Shipment.findByPk(order.shipmentId) : null;

    const logoPath = path.join(__dirname, '../public/images/ESK_icon.png');
    let logoBase64 = '';
    try {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
        logoBase64 = '';
    }

    const slip = {
        order_no: order.orderNumber || order.id,
        logo: logoBase64,
        ship_to: {
            name: shipment?.name || order?.name || '',
            address: shipment?.secondline ? `${shipment?.firstline} ${shipment?.secondline}` : shipment?.firstline || '',
            city: shipment?.city || order.city || '',
            state: shipment?.state || order.state || '',
            zip: shipment?.zip || order.zip || '',
        },
        items: orderItems.map(item => ({ stock: item.code || '', title: item.title || '', quantity: item.quantity || '' })),
    };

    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
        ]
    });
    const page = await browser.newPage();
    await page.setContent(renderPackingSlipHTML(slip), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: '10px' });
    await browser.close();
    return Buffer.from(pdfBuffer);
};

module.exports = {
    getInvoices,
    getInvoicesForAdmin,
    generateInvoicePDF,
    generatePackingSlipPDF,
};
