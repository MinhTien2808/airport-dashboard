import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PenTool, Calendar, User, Printer, Cpu, History, ChevronRight, CheckCircle2, AlertCircle, Keyboard } from 'lucide-react';

const Maintenance = () => {
    const { stations, maintenanceLogs, replaceDevice, addMaintenanceLog } = useData();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('logs'); // 'logs', 'printer', 'head'

    // Form States
    const [selectedStation, setSelectedStation] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [newSN, setNewSN] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter & Pagination for Logs
    const [logSearch, setLogSearch] = useState('');
    const [logCurrentPage, setLogCurrentPage] = useState(1);
    const logsPerPage = 10;

    // Filtered hardware for selected station
    const stationPrinters = useMemo(() => {
        const station = stations.find(s => s.id === selectedStation);
        return station ? station.devices.filter(d => d.type.includes('PRINTER') || d.type === 'KEYBOARD') : [];
    }, [selectedStation, stations]);

    const handleReplacePrinter = async (e) => {
        e.preventDefault();
        if (!selectedStation || !selectedDevice || !newSN) return;

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        const result = await replaceDevice(
            selectedStation,
            selectedDevice.type,
            selectedDevice.sn,
            newSN,
            user.username,
            `REPLACED ${selectedDevice.type.replace(/_/g, ' ')}: ${selectedDevice.sn} -> ${newSN}`
        );

        if (result.success) {
            setStatus({ type: 'success', message: 'Hardware replaced and logged successfully.' });
            setNewSN('');
            setSelectedDevice(null);
        } else {
            setStatus({ type: 'error', message: result.message });
        }
        setIsSubmitting(false);
    };

    // Search/Global Device State for Head Service
    const [searchTerm, setSearchTerm] = useState('');

    // Flatten all printers from all stations for global selection
    const allPrinters = useMemo(() => {
        const printers = [];
        (stations || []).forEach(station => {
            (station.devices || []).forEach(device => {
                if (device.type.includes('PRINTER') || device.type === 'KEYBOARD') {
                    printers.push({
                        ...device,
                        stationId: station.id,
                        stationName: station.name
                    });
                }
            });
        });
        return printers;
    }, [stations]);

    // Filtered printers based on search
    const filteredGlobalPrinters = useMemo(() => {
        if (!searchTerm) return allPrinters.slice(0, 10);
        return allPrinters.filter(p =>
            p.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.stationId.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 10);
    }, [allPrinters, searchTerm]);

    const handleReplaceHead = async (e) => {
        e.preventDefault();

        // Either use selected device OR use searchTerm as manual S/N
        const deviceSN = selectedDevice ? selectedDevice.sn : searchTerm;
        const stationId = selectedDevice ? selectedDevice.stationId : 'SPARE';
        const deviceType = selectedDevice ? selectedDevice.type : 'PRINTER';

        if (!deviceSN) return;

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        // Print head replacement doesn't change SN, just adds a log
        await addMaintenanceLog({
            stationId, // Log the station where it's currently located or SPARE
            deviceType,
            deviceSN,
            action: `REPLACED THERMAL PRINT HEAD`,
            technician: user.username
        });

        setStatus({ type: 'success', message: `Head service logged for S/N: ${deviceSN}` });
        setSearchTerm('');
        setSelectedDevice(null);
        setIsSubmitting(false);
    };

    // Pagination & Search for Logs
    const filteredLogs = useMemo(() => {
        return (maintenanceLogs || []).filter(log =>
            (log?.stationId || '').toLowerCase().includes(logSearch.toLowerCase()) ||
            (log?.deviceSN || '').toLowerCase().includes(logSearch.toLowerCase()) ||
            (log?.action || '').toLowerCase().includes(logSearch.toLowerCase()) ||
            (log?.technician || '').toLowerCase().includes(logSearch.toLowerCase())
        );
    }, [maintenanceLogs, logSearch]);

    const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);
    const paginatedLogs = useMemo(() => {
        const start = (logCurrentPage - 1) * logsPerPage;
        return filteredLogs.slice(start, start + logsPerPage);
    }, [filteredLogs, logCurrentPage]);

    // Reset log pagination when search changes
    React.useEffect(() => {
        setLogCurrentPage(1);
    }, [logSearch]);

    // Group stats for Sidebar
    const replacementStats = useMemo(() => {
        const counts = {};
        (maintenanceLogs || []).forEach(log => {
            if (log?.action?.includes('REPLACED ')) {
                counts[log.stationId] = (counts[log.stationId] || 0) + 1;
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [maintenanceLogs]);

    const printerServiceStats = useMemo(() => {
        const counts = {};
        (maintenanceLogs || []).forEach(log => {
            if (log?.action?.includes('THERMAL') && log?.deviceSN) {
                counts[log.deviceSN] = (counts[log.deviceSN] || 0) + 1;
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [maintenanceLogs]);

    return (
        <div className="content-view animate-premium">
            <div className="content-header" style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Maintenance & Service</h2>
                <p style={{ color: '#64748b', marginTop: '0.5rem', fontSize: '1rem' }}>Terminal hardware lifecycle management</p>

                <div className="tab-group" style={{ marginTop: '2rem' }}>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                    >
                        <History size={16} /> History Log
                    </button>
                    <button
                        onClick={() => setActiveTab('printer')}
                        className={`tab-btn ${activeTab === 'printer' ? 'active' : ''}`}
                    >
                        <Printer size={16} /> Device Swap
                    </button>
                    <button
                        onClick={() => setActiveTab('head')}
                        className={`tab-btn ${activeTab === 'head' ? 'active' : ''}`}
                    >
                        <Cpu size={16} /> Head Service
                    </button>
                </div>
            </div>

            {activeTab === 'logs' && (
                <div className="premium-card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 className="card-title">Technician Logbook</h3>
                        <div style={{ position: 'relative', width: '300px' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }}>
                                <PenTool size={16} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={logSearch}
                                onChange={(e) => setLogSearch(e.target.value)}
                                className="premium-input"
                                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <tr>
                                    <th style={{ padding: '1rem 1.5rem' }}>Station</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Component</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>S/N REF</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Action Taken</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Date & Time</th>
                                    <th style={{ padding: '1rem 1.5rem' }}>Technician</th>
                                </tr>
                            </thead>
                            <tbody style={{ divide: 'y', divideColor: '#f1f5f9' }}>
                                {paginatedLogs.map(log => (
                                    <tr key={log?.id || Math.random()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: '700', color: '#0f172a' }}>{log?.stationId || 'N/A'}</td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                                                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '4px' }}>
                                                    <PenTool size={14} />
                                                </div>
                                                <span style={{ textTransform: 'capitalize' }}>{(log?.deviceType || 'UNKNOWN').toLowerCase().replace(/_/g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                                            {log?.deviceSN || 'N/A'}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '6px',
                                                background: log?.action?.includes('THERMAL') ? '#ecfdf5' : '#fffbeb',
                                                color: log?.action?.includes('THERMAL') ? '#059669' : '#d97706',
                                                fontSize: '0.75rem', fontWeight: '700', border: '1px solid',
                                                borderColor: log?.action?.includes('THERMAL') ? '#d1fae5' : '#fef3c7'
                                            }}>
                                                {log?.action || 'No Description'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                                            {log?.date ? new Date(log.date).toLocaleString('vi-VN', { hour12: false }) : 'N/A'}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                                                    {(log?.technician || '??').substring(0, 2).toUpperCase()}
                                                </div>
                                                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500' }}>{log?.technician || 'SYSTEM'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredLogs.length === 0 && (
                            <div className="p-12 text-center" style={{ padding: '4rem 0' }}>
                                <History size={48} style={{ margin: '0 auto 1rem', color: '#e2e8f0' }} />
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>No service records detected accordingly</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination for Logs */}
                    {totalLogPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                            <button
                                className="btn-premium"
                                style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                                onClick={() => setLogCurrentPage(p => Math.max(1, p - 1))}
                                disabled={logCurrentPage === 1}
                            >
                                Previous
                            </button>
                            <span style={{ fontWeight: '700', color: '#64748b', fontSize: '0.85rem' }}>
                                Page {logCurrentPage} / {totalLogPages}
                            </span>
                            <button
                                className="btn-premium"
                                style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                                onClick={() => setLogCurrentPage(p => Math.min(totalLogPages, p + 1))}
                                disabled={logCurrentPage === totalLogPages}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}

            {(activeTab === 'printer' || activeTab === 'head') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
                    <div className="premium-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                {activeTab === 'printer' ? 'Equipment Replacement Registry' : 'Thermal Head Service Entry'}
                            </h3>
                        </div>
                        <div className="card-body">
                            {status.message && (
                                <div style={{
                                    padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
                                    color: status.type === 'success' ? '#065f46' : '#991b1b',
                                    border: `1px solid ${status.type === 'success' ? '#d1fae5' : '#fee2e2'}`
                                }}>
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{status.message}</span>
                                </div>
                            )}

                            <form onSubmit={activeTab === 'printer' ? handleReplacePrinter : handleReplaceHead} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {activeTab === 'printer' ? (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', marginLeft: '4px' }}>Assign Terminal Station</label>
                                        <select
                                            value={selectedStation}
                                            onChange={(e) => {
                                                setSelectedStation(e.target.value);
                                                setSelectedDevice(null);
                                            }}
                                            className="premium-select"
                                            required
                                        >
                                            <option value="">Select Station ID...</option>
                                            {(stations || []).map(s => (
                                                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', marginLeft: '4px' }}>Machine Serial Search (S/N)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Enter S/N or Station ID..."
                                                className="premium-input"
                                                style={{ fontFamily: 'monospace', fontWeight: '700' }}
                                            />
                                            <AlertCircle size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        </div>
                                    </div>
                                )}

                                {(activeTab === 'printer' ? selectedStation : true) && (
                                    <div className="animate-premium">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.75rem', marginLeft: '4px' }}>
                                            {activeTab === 'head' ? `Matching Units (${searchTerm ? filteredGlobalPrinters.length : 'Top 10'})` : 'Select Targeted Unit'}
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {/* Manual Entry Option for Head Service */}
                                            {activeTab === 'head' && searchTerm.trim() && !selectedDevice && (
                                                <div
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '0.75rem',
                                                        border: '1px dashed #3b82f6', background: '#f0f9ff', color: '#1e40af'
                                                    }}
                                                >
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <PenTool size={20} />
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800' }}>Using Manual Entry</p>
                                                        <p style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>S/N: {searchTerm}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {(activeTab === 'printer' ? stationPrinters : filteredGlobalPrinters).map(dev => (
                                                <div
                                                    key={dev.sn}
                                                    onClick={() => setSelectedDevice(dev)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', cursor: 'pointer', border: '1px solid',
                                                        borderColor: selectedDevice?.sn === dev.sn ? '#3b82f6' : '#e2e8f0',
                                                        background: selectedDevice?.sn === dev.sn ? '#eff6ff' : 'white',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: selectedDevice?.sn === dev.sn ? '#3b82f6' : '#f1f5f9', color: selectedDevice?.sn === dev.sn ? 'white' : '#64748b'
                                                        }}>
                                                            {dev.type === 'KEYBOARD' ? <Keyboard size={20} /> : <Printer size={20} />}
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: selectedDevice?.sn === dev.sn ? '#1e40af' : '#1e293b' }}>
                                                                {(dev.type || '').toLowerCase().replace(/_/g, ' ')}
                                                            </p>
                                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                                                S/N: <span style={{ color: '#64748b', fontWeight: '800' }}>{dev.sn}</span>
                                                                {activeTab === 'head' && <span style={{ marginLeft: '8px', padding: '1px 4px', background: '#f1f5f9', borderRadius: '3px' }}>@{dev.stationId}</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {selectedDevice?.sn === dev.sn && <CheckCircle2 size={20} color="#3b82f6" />}
                                                </div>
                                            ))}
                                            {(activeTab === 'printer' ? stationPrinters : filteredGlobalPrinters).length === 0 && (
                                                <p className="text-xs text-rose-500 font-bold ml-1 italic p-4 text-center bg-rose-50 rounded-lg">No printer units found matching your criteria.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'printer' && selectedDevice && (
                                    <div className="animate-premium">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', marginLeft: '4px' }}>New Serial Number</label>
                                        <input
                                            type="text"
                                            value={newSN}
                                            onChange={(e) => setNewSN(e.target.value)}
                                            placeholder="Scan or type new S/N..."
                                            className="premium-input"
                                            style={{ fontFamily: 'monospace', fontWeight: '700' }}
                                            required
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={
                                        isSubmitting ||
                                        (activeTab === 'printer' && (!selectedDevice || !newSN)) ||
                                        (activeTab === 'head' && !selectedDevice && !searchTerm.trim())
                                    }
                                    className="btn-premium"
                                    style={{ height: '56px', fontSize: '1rem' }}
                                >
                                    {isSubmitting ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Transmitting...
                                        </div>
                                    ) : (
                                        <>
                                            {activeTab === 'printer' ? 'Confirm Hardware Swap' : 'Log Thermal Service'}
                                            <ChevronRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="premium-card">
                            <div className="card-header">
                                <h3 className="card-title">Maintenance Insight</h3>
                            </div>
                            <div className="card-body" style={{ padding: '0' }}>
                                {/* Top Counters */}
                                <div style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Counters</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>High frequency swap stations</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1.5rem solid #fff' }}>
                                    {(replacementStats || []).map(([station, count], idx) => (
                                        <div key={station} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem',
                                            borderBottom: idx === replacementStats.length - 1 ? 'none' : '1px solid #f8fafc'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                                                    {idx + 1}
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{station || 'N/A'}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#3b82f6' }}>{count} Swaps</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Top Printers */}
                                <div style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Serviced Units</p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Tracking by machine serial (S/N)</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {(printerServiceStats || []).map(([sn, count], idx) => (
                                        <div key={sn} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem',
                                            borderBottom: idx === printerServiceStats.length - 1 ? 'none' : '1px solid #f8fafc'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                                                    <Cpu size={12} />
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{sn || 'N/A'}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#10b981' }}>{count} Heads</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(replacementStats?.length === 0 && printerServiceStats?.length === 0) && (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                            No maintenance records found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="premium-card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', border: 'none' }}>
                            <div className="card-body" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                    <CheckCircle2 size={18} color="#10b981" />
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700' }}>Total System Uptime</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800' }}>99.98%</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Across 90 operational terminals</p>
                                <div style={{ marginTop: '1.5rem', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: '99%', height: '100%', background: '#10b981' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Maintenance;
