USE AirportDashboardDB;
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MaintenanceLogs') AND name = 'DeviceSN')
BEGIN
    ALTER TABLE MaintenanceLogs ADD DeviceSN NVARCHAR(50);
END
GO
