const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER || 'airport_user',
    password: process.env.DB_PASSWORD || 'AirportUser123!',
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_DATABASE || 'AirportDashboardDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Global Connection Pattern (Matches test_db_simple.js)
const connectToDatabase = async () => {
    try {
        await sql.connect(config);
        console.log('Connected to SQL Server (Global/Singleton)');
    } catch (err) {
        console.error('Database connection failed: ', err);
        process.exit(1);
    }
};

module.exports = {
    sql,
    connectToDatabase
};
