-- Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'AirportDashboardDB')
BEGIN
    CREATE DATABASE AirportDashboardDB;
END
GO

USE AirportDashboardDB;
GO

-- Create Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
BEGIN
    CREATE TABLE Users (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        Password NVARCHAR(255) NOT NULL, -- In production, hash this!
        Role NVARCHAR(20) NOT NULL CHECK (Role IN ('ADMIN', 'OPERATOR'))
    );
    
    -- Seed Users
    INSERT INTO Users (Username, Password, Role) VALUES ('admin', 'admin123', 'ADMIN');
    INSERT INTO Users (Username, Password, Role) VALUES ('operator', 'operator123', 'OPERATOR');
END
GO

-- Create Stations Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stations' and xtype='U')
BEGIN
    CREATE TABLE Stations (
        StationID NVARCHAR(50) PRIMARY KEY, -- e.g., 'CKIN-01'
        Name NVARCHAR(100) NOT NULL,
        Type NVARCHAR(20) NOT NULL -- CHECKIN, GATE, KIOSK, etc.
    );
END
GO

-- Create Devices Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Devices' and xtype='U')
BEGIN
    CREATE TABLE Devices (
        DeviceID INT IDENTITY(1,1) PRIMARY KEY,
        SN NVARCHAR(50) NOT NULL UNIQUE,
        Type NVARCHAR(50) NOT NULL, -- PC, BP_PRINTER, FIDS_SCREEN
        StationID NVARCHAR(50) FOREIGN KEY REFERENCES Stations(StationID) ON DELETE CASCADE,
        Status NVARCHAR(20) DEFAULT 'ACTIVE',
        LastMaintenance DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create Logs Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MaintenanceLogs' and xtype='U')
BEGIN
    CREATE TABLE MaintenanceLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        StationID NVARCHAR(50),
        DeviceType NVARCHAR(50),
        DeviceSN NVARCHAR(50),
        Action NVARCHAR(255),
        Technician NVARCHAR(50),
        Date DATETIME DEFAULT GETDATE()
    );
END
GO

-- Seed Data Procedure
DECLARE @i INT = 1;
DECLARE @stationID NVARCHAR(50);
DECLARE @stationName NVARCHAR(100);

-- 1. Check-in Counters (54)
SET @i = 1;
WHILE @i <= 54
BEGIN
    SET @stationID = 'CKIN-' + RIGHT('00' + CAST(@i AS VARCHAR), 2);
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @stationID)
    BEGIN
        INSERT INTO Stations (StationID, Name, Type) VALUES (@stationID, 'Check-in ' + RIGHT('00' + CAST(@i AS VARCHAR), 2), 'CHECKIN');
        
        -- Default Devices
        INSERT INTO Devices (SN, Type, StationID) VALUES ('PC-' + @stationID + '-01', 'PC', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BP-' + @stationID + '-01', 'BP_PRINTER', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BAG-' + @stationID + '-01', 'BAG_PRINTER', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('FIDS-' + @stationID + '-01', 'FIDS_SCREEN', @stationID);
    END
    SET @i = @i + 1;
END

-- 2. Gates (10)
SET @i = 1;
WHILE @i <= 10
BEGIN
    SET @stationID = 'GATE-' + RIGHT('00' + CAST(@i AS VARCHAR), 2);
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @stationID)
    BEGIN
        INSERT INTO Stations (StationID, Name, Type) VALUES (@stationID, 'Gate ' + RIGHT('00' + CAST(@i AS VARCHAR), 2), 'GATE');
        
        INSERT INTO Devices (SN, Type, StationID) VALUES ('PC-' + @stationID + '-01', 'PC', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BP-' + @stationID + '-01', 'BP_PRINTER', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('DCP-' + @stationID + '-01', 'DCP_PRINTER', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('FIDS-' + @stationID + '-01', 'FIDS_SCREEN', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('FIDS-' + @stationID + '-02', 'FIDS_SCREEN', @stationID);
    END
    SET @i = @i + 1;
END

-- 3. Kiosks (10)
SET @i = 1;
WHILE @i <= 10
BEGIN
    SET @stationID = 'KIOSK-' + RIGHT('00' + CAST(@i AS VARCHAR), 2);
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @stationID)
    BEGIN
        INSERT INTO Stations (StationID, Name, Type) VALUES (@stationID, 'Kiosk ' + RIGHT('00' + CAST(@i AS VARCHAR), 2), 'KIOSK');
        INSERT INTO Devices (SN, Type, StationID) VALUES ('PC-' + @stationID + '-01', 'PC', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BP-' + @stationID + '-01', 'BP_PRINTER', @stationID);
    END
    SET @i = @i + 1;
END

-- Mobility (10) & BagDrop (6) skipped for brevity, add similar loops if needed.
-- But adding them for completeness is better since user asked for 54/10/10/6/10.

-- 4. Mobility (10)
SET @i = 1;
WHILE @i <= 10
BEGIN
    SET @stationID = 'MOB-' + RIGHT('00' + CAST(@i AS VARCHAR), 2);
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @stationID)
    BEGIN
        INSERT INTO Stations (StationID, Name, Type) VALUES (@stationID, 'Mobility ' + RIGHT('00' + CAST(@i AS VARCHAR), 2), 'MOBILITY');
        INSERT INTO Devices (SN, Type, StationID) VALUES ('PC-' + @stationID + '-01', 'PC', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BP-' + @stationID + '-01', 'BP_PRINTER', @stationID);
    END
    SET @i = @i + 1;
END

-- 5. Bag Drop (6)
SET @i = 1;
WHILE @i <= 6
BEGIN
    SET @stationID = 'SBD-' + RIGHT('00' + CAST(@i AS VARCHAR), 2);
    IF NOT EXISTS (SELECT 1 FROM Stations WHERE StationID = @stationID)
    BEGIN
        INSERT INTO Stations (StationID, Name, Type) VALUES (@stationID, 'Self Bag Drop ' + RIGHT('00' + CAST(@i AS VARCHAR), 2), 'BAGDROP');
        INSERT INTO Devices (SN, Type, StationID) VALUES ('PC-' + @stationID + '-01', 'PC', @stationID);
        INSERT INTO Devices (SN, Type, StationID) VALUES ('BAG-' + @stationID + '-01', 'BAG_PRINTER', @stationID);
    END
    SET @i = @i + 1;
END
-- 6. Inventory & Warehouse Management System

-- Create Metadata Tables
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Units' and xtype='U')
BEGIN
    CREATE TABLE Units (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Units (DisplayName) VALUES (N'Cái'), (N'Bộ'), (N'Mét'), (N'Cuộn');
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventorySystems' and xtype='U')
BEGIN
    CREATE TABLE InventorySystems (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(100) NOT NULL
    );
    INSERT INTO InventorySystems (DisplayName) VALUES (N'Hệ thống mạng'), (N'Hệ thống điện'), (N'Hệ thống Camera'), (N'Hệ thống Server');
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Rooms' and xtype='U')
BEGIN
    CREATE TABLE Rooms (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Rooms (DisplayName) VALUES (N'Phòng Server'), (N'Kho IT'), (N'Phòng Kỹ thuật');
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Racks' and xtype='U')
BEGIN
    CREATE TABLE Racks (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Racks (DisplayName) VALUES (N'Kệ A1'), (N'Kệ A2'), (N'Tủ B1');
END
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Bins' and xtype='U')
BEGIN
    CREATE TABLE Bins (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(100) NOT NULL
    );
    INSERT INTO Bins (DisplayName) VALUES (N'Thùng 01'), (N'Thùng 02'), (N'Thùng 03');
END
GO

-- Create Inventory Objects Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='InventoryObjects' and xtype='U')
BEGIN
    CREATE TABLE InventoryObjects (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DisplayName NVARCHAR(255) NOT NULL,
        UnitID INT FOREIGN KEY REFERENCES Units(ID),
        SystemID INT FOREIGN KEY REFERENCES InventorySystems(ID),
        RackID INT FOREIGN KEY REFERENCES Racks(ID),
        BinID INT FOREIGN KEY REFERENCES Bins(ID),
        QRCode NVARCHAR(255),
        StockCount INT DEFAULT 0
    );
END
GO

-- Create Warehouse Input (Phíêu nhập)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WarehouseInputs' and xtype='U')
BEGIN
    CREATE TABLE WarehouseInputs (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DateInput DATETIME DEFAULT GETDATE(),
        UserID INT FOREIGN KEY REFERENCES Users(ID)
    );
END
GO

-- Create Warehouse Input Info (Thông tin phiếu nhập)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WarehouseInputInfo' and xtype='U')
BEGIN
    CREATE TABLE WarehouseInputInfo (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        InputID INT FOREIGN KEY REFERENCES WarehouseInputs(ID),
        ObjectID INT FOREIGN KEY REFERENCES InventoryObjects(ID),
        Serial NVARCHAR(50),
        Count INT NOT NULL,
        Place NVARCHAR(255)
    );
END
GO

-- Create Warehouse Output (Phiếu xuất)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WarehouseOutputs' and xtype='U')
BEGIN
    CREATE TABLE WarehouseOutputs (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        DateOutput DATETIME DEFAULT GETDATE()
    );
END
GO

-- Create Warehouse Output Info (Thông tin phiếu xuất)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WarehouseOutputInfo' and xtype='U')
BEGIN
    CREATE TABLE WarehouseOutputInfo (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        OutputID INT FOREIGN KEY REFERENCES WarehouseOutputs(ID),
        ObjectID INT FOREIGN KEY REFERENCES InventoryObjects(ID),
        Serial NVARCHAR(50),
        Count INT NOT NULL,
        Place NVARCHAR(255),
        UserID INT FOREIGN KEY REFERENCES Users(ID), -- Người xuất
        Purpose NVARCHAR(MAX)
    );
END
GO
