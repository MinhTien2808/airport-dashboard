import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import FidsPreview from '../components/ui/FidsPreview';
import { Edit2, Monitor, Printer, Box, LogOut, CheckSquare, Tv, Plus, Trash2, Eye, Search, Keyboard } from 'lucide-react';

const STATION_TYPES = [
    { id: 'ALL', label: 'All Stations' },
    { id: 'CHECKIN', label: 'Check-in', icon: <CheckSquare size={16} /> },
    { id: 'MOBILITY', label: 'Mobility', icon: <Box size={16} /> },
    { id: 'KIOSK', label: 'Kiosk', icon: <Monitor size={16} /> },
    { id: 'BAGDROP', label: 'Bag Drop', icon: <LogOut size={16} /> },
    { id: 'GATE', label: 'Gate', icon: <LogOut size={16} className="rotate-90" /> },
];

const KEYBOARD_MODELS = [
    'HID OCR316-E',
    'Desko BMOL 5200U',
    'DESKO NEPTUN Chrom',
    'Desko Identy Chrom'
];

const Equipment = () => {
    const { stations, updateDeviceSN, addDevice, removeDevice } = useData();
    const { user } = useAuth();
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [editingDevice, setEditingDevice] = useState(null); // { stationId, deviceType, currentSN }
    const [newSN, setNewSN] = useState('');
    const [selectedModel, setSelectedModel] = useState('');
    const [previewFids, setPreviewFids] = useState(null); // { stationId, sn }

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    const isAdmin = user?.role === 'ADMIN';

    const filteredStations = stations.filter(s => {
        const matchType = filter === 'ALL' || s.type === filter;
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.id.toLowerCase().includes(search.toLowerCase()) ||
            s.devices.some(d => d.sn.toLowerCase().includes(search.toLowerCase()));
        return matchType && matchSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredStations.length / itemsPerPage);
    const paginatedStations = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStations.slice(start, start + itemsPerPage);
    }, [filteredStations, currentPage, itemsPerPage]);

    // Reset pagination
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filter, search]);

    const handleEditClick = (stationId, device) => {
        setEditingDevice({ stationId, deviceType: device.type, currentSN: device.sn });
        setNewSN(device.sn === 'N/A' ? '' : device.sn);
        setSelectedModel(device.model || '');
    };

    const handleSave = async () => {
        if (editingDevice) {
            if (editingDevice.currentSN === 'N/A') {
                // If it's a placeholder, add it as a new device
                await addDevice(editingDevice.stationId, editingDevice.deviceType, newSN, selectedModel);
            } else {
                await updateDeviceSN(editingDevice.stationId, editingDevice.deviceType, newSN, editingDevice.currentSN, selectedModel);
            }
            setEditingDevice(null);
        }
    };

    const handleAddFids = (stationId) => {
        addDevice(stationId, 'FIDS_SCREEN');
    };

    const handleRemoveDevice = (stationId, sn, type) => {
        if (window.confirm(`Are you sure you want to remove this ${type.toLowerCase().replace(/_/g, ' ')}?`)) {
            removeDevice(stationId, sn);
        }
    };

    return (
        <div className="equipment-view">
            <div className="page-header">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-6">Equipment & Devices</h2>

                <div className="search-filter-container">
                    <div className="premium-search">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Find stations, printers, or serial numbers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        {STATION_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setFilter(type.id)}
                                className={`filter-btn ${filter === type.id ? 'active' : ''}`}
                            >
                                {type.icon}
                                <span>{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {paginatedStations.map(station => {
                    const typeInfo = STATION_TYPES.find(t => t.id === station.type) || { icon: <Box size={18} /> };
                    return (
                        <div key={station.id} className="premium-card">
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                        {typeInfo.icon}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 className="card-title" style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{station.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{station.id}</span>
                                        </div>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => addDevice(station.id, 'DCP_PRINTER')}
                                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1 border border-emerald-100"
                                            title="Add DCP Printer"
                                        >
                                            <Plus size={12} /> DCP
                                        </button>
                                        {(station.type === 'CHECKIN' || station.type === 'GATE') && (
                                            <button
                                                onClick={() => handleAddFids(station.id)}
                                                className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-bold transition-all flex items-center gap-1 border border-blue-100"
                                                title="Add FIDS Screen"
                                            >
                                                <Plus size={12} /> FIDS
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="card-body">
                                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                                    {(() => {
                                        const devices = [...station.devices];
                                        // Automatically show keyboard if missing
                                        if (!devices.some(d => d.type === 'KEYBOARD')) {
                                            devices.push({ type: 'KEYBOARD', sn: 'N/A', status: 1 });
                                        }
                                        return devices.map((device, idx) => (
                                            <div key={`${device.sn}-${idx}`} className="device-item group">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`device-icon ${device.type === 'FIDS_SCREEN' ? 'bg-amber-100 text-amber-600' :
                                                        device.type.includes('PRINTER') ? 'bg-indigo-100 text-indigo-600' :
                                                            device.type === 'KEYBOARD' ? 'bg-slate-100 text-slate-600' :
                                                                'bg-blue-100 text-blue-600'
                                                        }`}>
                                                        {device.type === 'FIDS_SCREEN' ? <Tv size={18} /> :
                                                            device.type.includes('PRINTER') ? <Printer size={18} /> :
                                                                device.type === 'KEYBOARD' ? <Keyboard size={18} /> : <Monitor size={18} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p style={{ fontSize: '15px', fontWeight: '800', color: '#334155', textTransform: 'capitalize', margin: 0 }}>
                                                            {device.type.toLowerCase().replace(/_/g, ' ')}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span style={{ fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', letterSpacing: '0.05em' }}>S/N</span>
                                                                <span style={{ fontSize: '13px', color: '#475569', fontFamily: 'monospace', fontWeight: '700', textTransform: 'uppercase' }}>{device.sn}</span>
                                                            </div>
                                                            {device.model && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span style={{ fontSize: '10px', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', letterSpacing: '0.05em' }}>MODEL</span>
                                                                    <span style={{ fontSize: '12px', color: '#0c4a6e', fontWeight: '700' }}>{device.model}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleRemoveDevice(station.id, device.sn, device.type)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Decommission Device"
                                                            disabled={device.sn === 'N/A'}
                                                            style={{ opacity: device.sn === 'N/A' ? 0.3 : 1 }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleEditClick(station.id, device)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title={device.sn === 'N/A' ? "Register Device" : "Modify Registry"}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                    {station.devices.length === 0 && (
                                        <p className="text-center py-8 text-xs text-slate-400 italic">No operational devices assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem', padding: '1rem' }}>
                    <button
                        className="btn-premium"
                        style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Trước
                    </button>
                    <span style={{ fontWeight: '700', color: '#64748b' }}>Trang {currentPage} / {totalPages}</span>
                    <button
                        className="btn-premium"
                        style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Sau
                    </button>
                </div>
            )}

            <Modal
                isOpen={!!editingDevice}
                onClose={() => setEditingDevice(null)}
                title="Edit Device Serial Number"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Station ID</label>
                        <input
                            type="text"
                            value={editingDevice?.stationId || ''}
                            disabled
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
                        <input
                            type="text"
                            value={editingDevice?.deviceType || ''}
                            disabled
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-gray-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                        <input
                            type="text"
                            value={newSN}
                            onChange={(e) => setNewSN(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="Enter new S/N"
                        />
                    </div>
                    {editingDevice?.deviceType === 'KEYBOARD' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model bàn phím</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">-- Chọn Model --</option>
                                {KEYBOARD_MODELS.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            onClick={() => setEditingDevice(null)}
                            className="btn btn-outline"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn btn-primary"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            {/* FIDS Preview Modal */}
            <Modal
                isOpen={!!previewFids}
                onClose={() => setPreviewFids(null)}
                title={`Live Preview: ${previewFids?.sn}`}
            >
                <div className="p-1 bg-gray-900 rounded-lg shadow-inner">
                    <FidsPreview stationId={previewFids?.stationId || ''} sn={previewFids?.sn || ''} />
                </div>
            </Modal>
        </div>
    );
};

export default Equipment;
