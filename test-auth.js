const { google } = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Simulate Railway exporting the key with literal \n and wrapped in double quotes
const mockEnvKey = '"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBAD...\\n-----END PRIVATE KEY-----\\n"';

const privateKey = mockEnvKey ? mockEnvKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '') : '';

console.log("Parsed Key:", privateKey);

const jwt = new google.auth.JWT(
    'test@tr3al-app2.iam.gserviceaccount.com',
    null,
    privateKey,
    SCOPES
);

jwt.authorize()
    .then(() => console.log('Auth OK'))
    .catch(e => console.error('Auth Error Name:', e.name, '| Auth Error Message:', e.message));
