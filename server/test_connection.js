const sql = require('mssql/msnodesqlv8');

async function testConnection() {
    // Try connection string with ODBC Driver 17
    const connString = "server=localhost;Database=AirportDashboardDB;Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server}";
    console.log("Connecting with string:", connString);
    try {
        await sql.connect(connString);
        console.log("✅ Connection Successful!");

        const result = await sql.query`SELECT * FROM Users`;
        console.log("✅ Query Successful! Users found:", result.recordset.length);
        console.log(result.recordset);

        process.exit(0);
    } catch (err) {
        console.error("❌ Connection Failed:", err);
        process.exit(1);
    }
}

testConnection();
