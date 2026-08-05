const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { appendDataToSheet, getTicketData, updateTicketStatus } = require('../utils/googleSheets');
const { uploadImage } = require('../utils/cloudinary');

// Multer setup for memory storage (for uploading directly to Cloudinary)
const upload = multer({ storage: multer.memoryStorage() });

// Admin Auth Middleware
const adminAuth = (req, res, next) => {
    const user = req.headers['x-admin-user'];
    const pass = req.headers['x-admin-pass'];
    
    // We hardcode 'boda' and '12006' as requested by the user
    if (user === 'boda' && pass === '12006') {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized. Invalid username or password.' });
    }
};

// POST /api/register
router.post('/register', upload.single('receipt'), async (req, res) => {
    try {
        const { fullName, phone, fanId, location, locationDetails, paymentOption, notes } = req.body;
        
        if (!fullName || !phone || !fanId || !location || !paymentOption) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        let receiptUrl = '';
        if (req.file) {
            const uploadResult = await uploadImage(req.file.buffer);
            receiptUrl = uploadResult.secure_url;
        }

        const ticketId = uuidv4();
        const timestamp = new Date().toISOString();
        const status = 'Valid';

        // Data array for Google Sheets
        // Columns: ID, Timestamp, Full Name, Phone, Fan ID, Location, Payment Option, Notes, Status, Receipt URL
        const rowData = [
            ticketId,
            timestamp,
            fullName,
            phone,
            fanId,
            locationDetails ? `${location} - ${locationDetails}` : location,
            paymentOption,
            notes || '',
            status,
            receiptUrl
        ];

        await appendDataToSheet(rowData);

        // Generate QR Code that points to the admin ticket page
        const adminUrl = `${req.protocol}://${req.get('host')}/admin.html?id=${ticketId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(adminUrl);

        res.json({
            success: true,
            ticketId,
            qrCodeDataUrl,
            message: 'Registration successful!'
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /api/ticket/:id
router.get('/ticket/:id', adminAuth, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const ticketData = await getTicketData(ticketId);
        
        if (!ticketData) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        // Mapping row array back to object based on columns defined in register
        const data = ticketData.data;
        res.json({
            success: true,
            ticket: {
                id: data[0],
                timestamp: data[1],
                fullName: data[2],
                phone: data[3],
                fanId: data[4],
                location: data[5],
                paymentOption: data[6],
                notes: data[7],
                status: data[8],
                receiptUrl: data[9]
            }
        });
    } catch (error) {
        console.error('Fetch Ticket Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/ticket/:id/scan
router.post('/ticket/:id/scan', adminAuth, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const ticketData = await getTicketData(ticketId);
        
        if (!ticketData) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (ticketData.data[8] === 'Scanned') {
            return res.status(400).json({ success: false, message: 'Ticket has already been used!' });
        }

        await updateTicketStatus(ticketData.rowIndex, 'Scanned');
        
        res.json({ success: true, message: 'Ticket marked as scanned successfully!' });
    } catch (error) {
        console.error('Scan Ticket Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
