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

async function test() {
    console.log("Connecting to", config.server, "as", config.user, "...");
    try {
        await sql.connect(config);
        console.log("✅ SUCCESS: Connected to SQL Server!");
        const res = await sql.query`SELECT count(*) as count FROM Stations`;
        console.log(`✅ TEST QUERY: Found ${res.recordset[0].count} stations.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ FAILED:", err.message);
        if (err.originalError) console.error("   Reason:", err.originalError.message);
        process.exit(1);
    }
}

test();
