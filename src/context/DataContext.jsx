import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// generateStations removed in favor of API fetch

export const DataProvider = ({ children }) => {
  const [stations, setStations] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [systems, setSystems] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [racks, setRacks] = useState([]);
  const [bins, setBins] = useState([]);
  const [inputReceipts, setInputReceipts] = useState([]);
  const [outputReceipts, setOutputReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchInventoryData();
  }, []);

  const fetchData = async () => {
    try {
      const [stationsRes, logsRes] = await Promise.all([
        fetch('http://localhost:3000/api/stations'),
        fetch('http://localhost:3000/api/logs')
      ]);

      if (stationsRes.ok && logsRes.ok) {
        const stationsData = await stationsRes.json();
        const logsData = await logsRes.json();
        setStations(stationsData);
        setMaintenanceLogs(logsData);
      }
    } catch (err) {
      console.error("API Error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const [itemsRes, unitsRes, systemsRes, roomsRes, racksRes, binsRes, inRes, outRes] = await Promise.all([
        fetch('http://localhost:3000/api/inventory/objects'),
        fetch('http://localhost:3000/api/inventory/units'),
        fetch('http://localhost:3000/api/inventory/inventorysystems'),
        fetch('http://localhost:3000/api/inventory/rooms'),
        fetch('http://localhost:3000/api/inventory/racks'),
        fetch('http://localhost:3000/api/inventory/bins'),
        fetch('http://localhost:3000/api/inventory/receipts/input'),
        fetch('http://localhost:3000/api/inventory/receipts/output')
      ]);

      if (itemsRes.ok) setInventoryItems(await itemsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (systemsRes.ok) setSystems(await systemsRes.json());
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (racksRes.ok) setRacks(await racksRes.json());
      if (binsRes.ok) setBins(await binsRes.json());
      if (inRes.ok) setInputReceipts(await inRes.json());
      if (outRes.ok) setOutputReceipts(await outRes.json());
    } catch (err) {
      console.error("Inventory API Error", err);
    }
  };

  const addInventoryItem = async (item) => {
    try {
      const res = await fetch('http://localhost:3000/api/inventory/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) fetchInventoryData();
    } catch (err) { console.error(err); }
  };

  const updateInventoryItem = async (id, item) => {
    try {
      const res = await fetch(`http://localhost:3000/api/inventory/objects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        fetchInventoryData();
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const removeInventoryItem = async (id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/inventory/objects/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInventoryData();
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const recordTransaction = async (transaction) => {
    try {
      const res = await fetch('http://localhost:3000/api/inventory/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
      });
      if (res.ok) {
        fetchInventoryData();
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.error };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const addMetadata = async (type, displayName) => {
    try {
      const res = await fetch(`http://localhost:3000/api/inventory/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      if (res.ok) fetchInventoryData();
    } catch (err) { console.error(err); }
  };

  const removeMetadata = async (type, id) => {
    try {
      const res = await fetch(`http://localhost:3000/api/inventory/${type}/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) fetchInventoryData();
    } catch (err) { console.error(err); }
  };

  // Existing functions...
  const updateDeviceSN = async (stationId, deviceType, newSN, currentSN, model) => {
    try {
      const res = await fetch('http://localhost:3000/api/devices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSN, newSN, model })
      });
      if (res.ok) await fetchData();
    } catch (err) { console.error(err); }
  };

  const addMaintenanceLog = async (log) => {
    try {
      const res = await fetch('http://localhost:3000/api/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      });
      if (res.ok) await fetchData();
    } catch (err) { console.error(err); }
  };

  const replaceDevice = async (stationId, deviceType, currentSN, newSN, technician, action) => {
    try {
      const updateRes = await fetch('http://localhost:3000/api/devices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentSN, newSN })
      });

      if (updateRes.ok) {
        await addMaintenanceLog({
          stationId,
          deviceType,
          deviceSN: newSN,
          action: action || `REPLACED DEVICE: ${currentSN} -> ${newSN}`,
          technician
        });
        return { success: true };
      }
      return { success: false, message: 'Failed to update device serial' };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  };

  const addDevice = async (stationId, type, customSN, model) => {
    const sn = customSN || `${type}-${stationId.replace('-', '')}-${Math.floor(Math.random() * 90000) + 10000}`;
    try {
      await fetch('http://localhost:3000/api/devices/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sn, type, stationId, model })
      });
      await fetchData();
    } catch (err) { console.error(err); }
  };

  const removeDevice = async (stationId, deviceSN) => {
    try {
      await fetch('http://localhost:3000/api/devices/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sn: deviceSN })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  return (
    <DataContext.Provider value={{
      stations,
      maintenanceLogs,
      inventoryItems,
      units,
      systems,
      rooms,
      racks,
      bins,
      inputReceipts,
      outputReceipts,
      updateDeviceSN,
      addMaintenanceLog,
      replaceDevice,
      addDevice,
      removeDevice,
      addInventoryItem,
      updateInventoryItem,
      removeInventoryItem,
      recordTransaction,
      addMetadata,
      removeMetadata,
      loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
