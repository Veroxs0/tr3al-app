const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { appendDataToSheet, getTicketData, updateTicketStatus, appendMatch, getMatches, updateMatchStatus } = require('../utils/googleSheets');
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
        const { fullName, phone, fanId, location, locationDetails, paymentOption, notes, matchId } = req.body;
        
        if (!fullName || !phone || !fanId || !location || !paymentOption || !matchId) {
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

        // Fetch match details to save the match name
        const matches = await getMatches();
        const selectedMatch = matches.find(m => m.id === matchId);
        const matchName = selectedMatch ? `${selectedMatch.teamA} vs ${selectedMatch.teamB}` : 'Unknown Match';

        // Data array for Google Sheets
        // Columns: ID, Timestamp, Full Name, Phone, Fan ID, Location, Payment Option, Notes, Status, Receipt URL, Match Name
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
            receiptUrl,
            matchName
        ];

        await appendDataToSheet(rowData);

        // Generate QR Code that points to the admin ticket page
        const protocol = req.get('host').includes('localhost') ? 'http' : 'https';
        const adminUrl = `${protocol}://${req.get('host')}/admin.html?id=${ticketId}`;
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
                receiptUrl: data[9],
                matchName: data[10] || 'Unknown Match'
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

// GET /api/matches (Public)
router.get('/matches', async (req, res) => {
    try {
        const matches = await getMatches();
        res.json({ success: true, matches });
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/matches (Admin)
router.post('/matches', adminAuth, async (req, res) => {
    try {
        const { teamA, teamB, date, time, location } = req.body;
        if (!teamA || !teamB || !date || !time || !location) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const matchId = uuidv4();
        const rowData = [matchId, teamA, teamB, date, time, location, 'Active'];
        await appendMatch(rowData);
        
        res.json({ success: true, message: 'Match added successfully' });
    } catch (error) {
        console.error('Error adding match:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// POST /api/matches/:id/status (Admin)
router.post('/matches/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        const matchId = req.params.id;
        if (!status) return res.status(400).json({ success: false, message: 'Status required' });
        
        const success = await updateMatchStatus(matchId, status);
        if (success) {
            res.json({ success: true, message: 'Match status updated' });
        } else {
            res.status(404).json({ success: false, message: 'Match not found' });
        }
    } catch (error) {
        console.error('Error updating match status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
