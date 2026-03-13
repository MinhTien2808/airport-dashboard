USE master;
GO

-- Create Login if not exists
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'airport_user')
BEGIN
    CREATE LOGIN airport_user WITH PASSWORD = 'AirportUser123!';
END
GO

USE AirportDashboardDB;
GO

-- Create User for that Login
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'airport_user')
BEGIN
    CREATE USER airport_user FOR LOGIN airport_user;
END
GO

-- Grant permissions
ALTER ROLE db_owner ADD MEMBER airport_user;
GO
