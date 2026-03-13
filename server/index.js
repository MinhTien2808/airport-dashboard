const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// HARDCODED CONFIG
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

// GLOBAL CONNECTION
const poolPromise = sql.connect(config);

poolPromise.then(pool => {
    if (pool.connected) {
        console.log('✅ SQL Server Connected (Connection Pool Established)');
    }
}).catch(err => {
    console.error('❌ Database Connection Failed:', err);
});

// Auto-migration for MaintenanceLogs and Devices table
(async () => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        await request.query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaintenanceLogs' AND COLUMN_NAME = 'DeviceSN')
            BEGIN
                ALTER TABLE MaintenanceLogs ADD DeviceSN NVARCHAR(50);
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Devices' AND COLUMN_NAME = 'Model')
            BEGIN
                ALTER TABLE Devices ADD Model NVARCHAR(100);
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'InventoryObjects' AND COLUMN_NAME = 'MaterialCode')
            BEGIN
                ALTER TABLE InventoryObjects ADD MaterialCode NVARCHAR(50);
            END

            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'InventoryObjects' AND COLUMN_NAME = 'UnitPrice')
            BEGIN
                ALTER TABLE InventoryObjects ADD UnitPrice DECIMAL(18,2) DEFAULT 0;
            END
        `);
    } catch (err) {
        console.error("Migration Error:", err);
    }
})();

// --- Routes ---

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const result = await request.query(`SELECT * FROM Users WHERE Username = '${username}' AND Password = '${password}'`);

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            res.json({ success: true, user: { id: user.ID, username: user.Username, role: user.Role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Stations
app.get('/api/stations', async (req, res) => {
    console.log("Received request for /api/stations");
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const stationsResult = await request.query("SELECT * FROM Stations");
        const devicesResult = await request.query("SELECT * FROM Devices");

        const stations = stationsResult.recordset;
        const devices = devicesResult.recordset;

        console.log(`Fetched ${stations.length} stations and ${devices.length} devices.`);

        const stationsWithDevices = stations.map(station => ({
            id: station.StationID,
            name: station.Name,
            type: station.Type,
            devices: devices
                .filter(d => d.StationID === station.StationID)
                .map(d => ({
                    sn: d.SN,
                    type: d.Type,
                    status: d.Status,
                    model: d.Model
                }))
        }));

        res.json(stationsWithDevices);
    } catch (err) {
        console.error("Stations API Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update Device SN
app.post('/api/devices/update', async (req, res) => {
    const { currentSN, newSN, model } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('currentSN', sql.NVarChar, currentSN);
        request.input('newSN', sql.NVarChar, newSN);
        request.input('model', sql.NVarChar, model || null);
        await request.query('UPDATE Devices SET SN = @newSN, Model = @model, LastMaintenance = GETUTCDATE() WHERE SN = @currentSN');
        res.json({ success: true });
    } catch (err) {
        console.error("Update Device Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Add New Device
app.post('/api/devices/add', async (req, res) => {
    const { sn, type, stationId, model } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('sn', sql.NVarChar, sn);
        request.input('type', sql.NVarChar, type);
        request.input('stationId', sql.NVarChar, stationId);
        request.input('model', sql.NVarChar, model || null);
        await request.query('INSERT INTO Devices (SN, Type, StationID, Status, Model) VALUES (@sn, @type, @stationId, 1, @model)');
        res.json({ success: true });
    } catch (err) {
        console.error("Add Device Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Remove Device
app.post('/api/devices/remove', async (req, res) => {
    const { sn } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('sn', sql.NVarChar, sn);
        await request.query('DELETE FROM Devices WHERE SN = @sn');
        res.json({ success: true });
    } catch (err) {
        console.error("Remove Device Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get Maintenance Logs
app.get('/api/logs', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const result = await request.query("SELECT LogID as id, StationID as stationId, DeviceType as deviceType, DeviceSN as deviceSN, Action as action, Technician as technician, CONVERT(NVARCHAR, Date, 127) + 'Z' as date FROM MaintenanceLogs ORDER BY Date DESC");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Maintenance Log
app.post('/api/logs/add', async (req, res) => {
    const { stationId, deviceType, deviceSN, action, technician } = req.body;
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('stationId', sql.NVarChar, stationId);
        request.input('deviceType', sql.NVarChar, deviceType);
        request.input('deviceSN', sql.NVarChar, deviceSN);
        request.input('action', sql.NVarChar, action);
        request.input('technician', sql.NVarChar, technician);

        await request.query(`
            INSERT INTO MaintenanceLogs (StationID, DeviceType, DeviceSN, Action, Technician, Date)
            VALUES (@stationId, @deviceType, @deviceSN, @action, @technician, GETUTCDATE())
        `);
        res.json({ success: true });
    } catch (err) {
        console.error("Add Log Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Inventory & Warehouse Management Routes ---

// Generic Helper for Metadata CRUD
const metadataTables = ['Units', 'InventorySystems', 'Rooms', 'Racks', 'Bins'];
metadataTables.forEach(table => {
    app.get(`/api/inventory/${table.toLowerCase()}`, async (req, res) => {
        try {
            const pool = await poolPromise;
            const request = pool.request();
            const result = await request.query(`SELECT * FROM ${table}`);
            res.json(result.recordset);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post(`/api/inventory/${table.toLowerCase()}`, async (req, res) => {
        const { displayName } = req.body;
        try {
            const pool = await poolPromise;
            const request = pool.request();
            request.input('name', sql.NVarChar, displayName);
            await request.query(`INSERT INTO ${table} (DisplayName) VALUES (@name)`);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.delete(`/api/inventory/${table.toLowerCase()}/:id`, async (req, res) => {
        const { id } = req.params;
        try {
            const pool = await poolPromise;
            const request = pool.request();
            request.input('id', sql.Int, id);
            await request.query(`DELETE FROM ${table} WHERE ID = @id`);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
});

// Inventory Objects
app.get('/api/inventory/objects', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const result = await request.query(`
            SELECT Item.*, 
                   U.DisplayName as Unit, 
                   S.DisplayName as System, 
                   R.DisplayName as Rack, 
                   B.DisplayName as Bin,
                   Rm.DisplayName as Room
            FROM InventoryObjects Item
            LEFT JOIN Units U ON Item.UnitID = U.ID
            LEFT JOIN InventorySystems S ON Item.SystemID = S.ID
            LEFT JOIN Racks R ON Item.RackID = R.ID
            LEFT JOIN Bins B ON Item.BinID = B.ID
            LEFT JOIN Rooms Rm ON Item.RoomID = Rm.ID
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/objects', async (req, res) => {
    const { displayName, unitId, systemId, roomId, rackId, binId, qrCode, stockCount, materialCode, unitPrice } = req.body;
    try {
        const request = new sql.Request();
        request.input('name', sql.NVarChar, displayName);
        request.input('unitId', sql.Int, unitId || null);
        request.input('systemId', sql.Int, systemId || null);
        request.input('roomId', sql.Int, roomId || null);
        request.input('rackId', sql.Int, rackId || null);
        request.input('binId', sql.Int, binId || null);
        request.input('qrCode', sql.NVarChar, qrCode || null);
        request.input('stockCount', sql.Int, stockCount || 0);
        request.input('materialCode', sql.NVarChar, materialCode || null);
        request.input('unitPrice', sql.Decimal(18, 2), unitPrice || 0);

        await request.query(`
            INSERT INTO InventoryObjects (DisplayName, UnitID, SystemID, RoomID, RackID, BinID, QRCode, StockCount, MaterialCode, UnitPrice)
            VALUES (@name, @unitId, @systemId, @roomId, @rackId, @binId, @qrCode, @stockCount, @materialCode, @unitPrice)
        `);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventory/objects/:id', async (req, res) => {
    const { id } = req.params;
    const { displayName, unitId, systemId, roomId, rackId, binId, qrCode, stockCount, materialCode, unitPrice } = req.body;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        request.input('name', sql.NVarChar, displayName);
        request.input('unitId', sql.Int, unitId || null);
        request.input('systemId', sql.Int, systemId || null);
        request.input('roomId', sql.Int, roomId || null);
        request.input('rackId', sql.Int, rackId || null);
        request.input('binId', sql.Int, binId || null);
        request.input('qrCode', sql.NVarChar, qrCode || null);
        request.input('stockCount', sql.Int, stockCount || 0);
        request.input('materialCode', sql.NVarChar, materialCode || null);
        request.input('unitPrice', sql.Decimal(18, 2), unitPrice || 0);

        await request.query(`
            UPDATE InventoryObjects 
            SET DisplayName = @name, 
                UnitID = @unitId, 
                SystemID = @systemId, 
                RoomID = @roomId, 
                RackID = @rackId, 
                BinID = @binId, 
                QRCode = @qrCode,
                StockCount = @stockCount,
                MaterialCode = @materialCode,
                UnitPrice = @unitPrice
            WHERE ID = @id
        `);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/objects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const request = new sql.Request();
        request.input('id', sql.Int, id);
        await request.query('DELETE FROM InventoryObjects WHERE ID = @id');
        res.json({ success: true });
    } catch (err) {
        if (err.number === 547) { // Foreign Key violation
            return res.status(400).json({ error: "Không thể xóa vật tư này vì đã có lịch sử nhập/xuất kho!" });
        }
        res.status(500).json({ error: err.message });
    }
});

// Warehouse Transactions (Input/Output)
app.post('/api/inventory/transaction', async (req, res) => {
    const { type, objectId, count, serial, place, userId, purpose } = req.body;
    const transaction = new sql.Transaction();
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        if (type === 'INPUT') {
            // 1. Create Input header
            const inputResult = await request.query(`INSERT INTO WarehouseInputs (DateInput, UserID) OUTPUT INSERTED.ID VALUES (GETUTCDATE(), ${userId || 'NULL'})`);
            const inputId = inputResult.recordset[0].ID;

            // 2. Add Info
            request.input('inputId', sql.Int, inputId);
            request.input('objId', sql.Int, objectId);
            request.input('serial', sql.NVarChar, serial);
            request.input('count', sql.Int, count);
            request.input('place', sql.NVarChar, place);
            await request.query(`INSERT INTO WarehouseInputInfo (InputID, ObjectID, Serial, Count, Place) VALUES (@inputId, @objId, @serial, @count, @place)`);

            // 3. Update Inventory Stock
            await request.query(`UPDATE InventoryObjects SET StockCount = StockCount + ${count} WHERE ID = ${objectId}`);

        } else if (type === 'OUTPUT') {
            // Check stock first
            const stockCheck = await request.query(`SELECT StockCount FROM InventoryObjects WHERE ID = ${objectId}`);
            if (stockCheck.recordset[0].StockCount < count) {
                throw new Error("Không đủ số lượng tồn kho!");
            }

            // 1. Create Output header
            const outputResult = await request.query(`INSERT INTO WarehouseOutputs (DateOutput) OUTPUT INSERTED.ID VALUES (GETUTCDATE())`);
            const outputId = outputResult.recordset[0].ID;

            // 2. Add Info
            request.input('outputId', sql.Int, outputId);
            request.input('objId', sql.Int, objectId);
            request.input('serial', sql.NVarChar, serial);
            request.input('count', sql.Int, count);
            request.input('place', sql.NVarChar, place);
            request.input('userId', sql.Int, userId);
            request.input('purpose', sql.NVarChar, purpose);
            await request.query(`INSERT INTO WarehouseOutputInfo (OutputID, ObjectID, Serial, Count, Place, UserID, Purpose) VALUES (@outputId, @objId, @serial, @count, @place, @userId, @purpose)`);

            // 3. Update Inventory Stock
            await request.query(`UPDATE InventoryObjects SET StockCount = StockCount - ${count} WHERE ID = ${objectId}`);
        }

        await transaction.commit();
        res.json({ success: true });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error("Transaction Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch Input Receipt History
app.get('/api/inventory/receipts/input', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const result = await request.query(`
            SELECT I.ID, I.DateInput as Date, Info.Serial, Info.Count, Info.Place, Obj.DisplayName as ObjectName, U.Username as Technician
            FROM WarehouseInputs I
            JOIN WarehouseInputInfo Info ON I.ID = Info.InputID
            JOIN InventoryObjects Obj ON Info.ObjectID = Obj.ID
            LEFT JOIN Users U ON I.UserID = U.ID
            ORDER BY I.DateInput DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Fetch Output Receipt History
app.get('/api/inventory/receipts/output', async (req, res) => {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        const result = await request.query(`
            SELECT O.ID, O.DateOutput as Date, Info.Serial, Info.Count, Info.Place, Info.Purpose, Obj.DisplayName as ObjectName, U.Username as Technician
            FROM WarehouseOutputs O
            JOIN WarehouseOutputInfo Info ON O.ID = Info.OutputID
            JOIN InventoryObjects Obj ON Info.ObjectID = Obj.ID
            LEFT JOIN Users U ON Info.UserID = U.ID
            ORDER BY O.DateOutput DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Start Server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Mode: Simplified Global (Hardcoded Config)`);
});
