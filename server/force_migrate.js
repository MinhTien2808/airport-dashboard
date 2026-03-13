const sql = require('mssql');

const config = {
    user: 'airport_user',
    password: 'AirportUser123!',
    server: '127.0.0.1',
    database: 'AirportDashboardDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function migrate() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        const request = pool.request();

        console.log('Checking for column "Model" in table "Devices"...');
        const checkQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Devices' AND COLUMN_NAME = 'Model')
            BEGIN
                ALTER TABLE Devices ADD Model NVARCHAR(100);
                PRINT 'SUCCESS: Added Model column to Devices table.';
            END
            ELSE
            BEGIN
                PRINT 'INFO: Column Model already exists.';
            END
        `;

        const result = await request.query(checkQuery);
        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration FAILED:', err);
        process.exit(1);
    }
}

migrate();
