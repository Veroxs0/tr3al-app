const { google } = require('googleapis');

// Note: Ensure your private key replaces \n with actual newlines if stored as a single string
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getAuthToken = () => {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    // Handle literal '\n' and remove any accidental surrounding quotes
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey
        },
        scopes: SCOPES
    });
};

const appendDataToSheet = async (data) => {
    try {
        if (!process.env.SPREADSHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            console.warn("Google Sheets credentials missing. Data not saved to Sheets.");
            return;
        }

        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        
        // Ensure data is an array of strings/numbers
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Tickets!A:K',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [data],
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error appending data to Google Sheets:', error);
        throw error;
    }
};

const getTicketData = async (ticketId) => {
    try {
        if (!process.env.SPREADSHEET_ID) return null;
        
        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Tickets!A:K', 
        });
        
        const rows = response.data.values;
        if (!rows || rows.length === 0) return null;
        
        // Find row by ticket ID (assuming it's in column A)
        const rowIndex = rows.findIndex(row => row[0] === ticketId);
        if (rowIndex === -1) return null;
        
        return {
            rowIndex: rowIndex + 1, // 1-based index for Sheets
            data: rows[rowIndex]
        };
    } catch (error) {
        console.error('Error fetching data from Google Sheets:', error);
        throw error;
    }
}

const updateTicketStatus = async (rowIndex, status) => {
    try {
         if (!process.env.SPREADSHEET_ID) return null;
         
        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        
        // Assuming status is in column I (9th column) for Tickets
        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: `Tickets!I${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[status]],
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating status in Google Sheets:', error);
        throw error;
    }
}

const appendMatch = async (data) => {
    try {
        if (!process.env.SPREADSHEET_ID) return;
        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Matches!A:G',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [data] },
        });
    } catch (error) {
        console.error('Error appending match:', error);
        throw error;
    }
};

const getMatches = async () => {
    try {
        if (!process.env.SPREADSHEET_ID) return [];
        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Matches!A:G', 
        });
        
        const rows = response.data.values || [];
        // skip header row if exists? Let's assume no header or handle in frontend. We'll return all and map.
        return rows.map(row => ({
            id: row[0],
            teamA: row[1],
            teamB: row[2],
            date: row[3],
            time: row[4],
            location: row[5],
            status: row[6]
        }));
    } catch (error) {
        // If sheet doesn't exist, return empty array instead of crashing
        console.error('Error fetching matches:', error);
        return [];
    }
};

const updateMatchStatus = async (matchId, status) => {
    try {
        if (!process.env.SPREADSHEET_ID) return null;
        const auth = getAuthToken();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: 'Matches!A:G', 
        });
        
        const rows = response.data.values;
        if (!rows) return null;
        
        const rowIndex = rows.findIndex(row => row[0] === matchId);
        if (rowIndex === -1) return null;
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SPREADSHEET_ID,
            range: `Matches!G${rowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[status]] },
        });
        return true;
    } catch (error) {
        console.error('Error updating match status:', error);
        throw error;
    }
};

module.exports = {
    appendDataToSheet,
    getTicketData,
    updateTicketStatus,
    appendMatch,
    getMatches,
    updateMatchStatus
};
