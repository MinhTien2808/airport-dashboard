import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { Monitor, Printer, AlertCircle, CheckCircle, Activity, LayoutGrid, Clock, User, Calendar, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const StatCard = ({ title, value, subtext, icon, colorClass, delay }) => (
    <div className="sky-stat-card animate-premium" style={{ animationDelay: delay }}>
        <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
            <h3 style={{ fontSize: '2.25rem', fontWeight: '800', color: '#0f172a', margin: '0.25rem 0' }}>{value}</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>{subtext}</p>
        </div>
        <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '44px' }} className={colorClass}>
            {icon}
        </div>
    </div>
);

const Dashboard = () => {
    const { stations, maintenanceLogs } = useData();
    const [showExportModal, setShowExportModal] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0], // Default last 7 days
        end: new Date().toISOString().split('T')[0]
    });

    // Live Stats Calculation
    const stats = useMemo(() => {
        const total = stations.length;
        const printers = stations.reduce((acc, s) => acc + (s.devices?.filter(d => d.type.includes('PRINTER')).length || 0), 0);
        const pcs = stations.reduce((acc, s) => acc + (s.devices?.filter(d => d.type === 'PC').length || 0), 0);

        const recentAlerts = maintenanceLogs.filter(log => {
            const logDate = new Date(log.date);
            const now = new Date();
            return (now - logDate) < (24 * 60 * 60 * 1000);
        }).length;

        return { total, printers, pcs, alerts: recentAlerts };
    }, [stations, maintenanceLogs]);

    const zones = useMemo(() => {
        const zoneMap = {
            'CHECKIN': { icon: <User size={18} />, count: 0, healthy: 0 },
            'GATE': { icon: <Activity size={18} />, count: 0, healthy: 0 },
            'KIOSK': { icon: <LayoutGrid size={18} />, count: 0, healthy: 0 },
            'MOBILITY': { icon: <Monitor size={18} />, count: 0, healthy: 0 },
            'BAGDROP': { icon: <Printer size={18} />, count: 0, healthy: 0 }
        };

        stations.forEach(s => {
            if (zoneMap[s.type]) {
                zoneMap[s.type].count++;
                const hasRecentIssue = maintenanceLogs.some(l => l.stationId === s.id && (new Date() - new Date(l.date)) < (48 * 60 * 60 * 1000));
                if (!hasRecentIssue) zoneMap[s.type].healthy++;
            }
        });

        return Object.entries(zoneMap);
    }, [stations, maintenanceLogs]);

    const handleDownloadReport = () => {
        try {
            // 1. Filter logs by date range
            const startDate = new Date(dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);

            const filteredLogs = maintenanceLogs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= startDate && logDate <= endDate;
            });

            if (filteredLogs.length === 0) {
                alert("Không có dữ liệu trong khoảng thời gian này!");
                return;
            }

            // 2. Prepare Data for Excel
            const excelData = filteredLogs.map(log => ({
                'Thời gian': new Date(log.date).toLocaleString('vi-VN'),
                'Vị trí quầy': log.stationId,
                'Hành động bảo trì': log.action,
                'Kỹ thuật viên': log.technician,
                'Mã S/N Thiết bị': log.deviceSN || 'N/A'
            }));

            // 3. Create Workbook and Worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance Logs");

            // 4. Set Column Widths
            const wscols = [
                { wch: 20 }, // Thời gian
                { wch: 15 }, // Vị trí quầy
                { wch: 40 }, // Hành động
                { wch: 20 }, // Kỹ thuật viên
                { wch: 20 }  // S/N
            ];
            worksheet['!cols'] = wscols;

            // 5. Trigger Download (.xlsx)
            const fileName = `SkyGate_OpsReport_${dateRange.start}_to_${dateRange.end}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            // 6. Cleanup & Feedback
            setShowExportModal(false);

        } catch (error) {
            console.error("Export Error:", error);
            alert("Lỗi khi xuất báo cáo: " + error.message);
        }
    };

    return (
        <div className="animate-premium" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Stats Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <StatCard
                    title="Total Stations"
                    value={stats.total}
                    subtext="Across all terminal zones"
                    icon={<Monitor size={24} />}
                    delay="0s"
                />
                <StatCard
                    title="Active Printers"
                    value={stats.printers}
                    subtext="Thermal & BagTag units"
                    icon={<Printer size={24} />}
                    delay="0.1s"
                />
                <StatCard
                    title="System Uptime"
                    value="99.9%"
                    subtext="Last 30 operational days"
                    icon={<CheckCircle size={24} />}
                    delay="0.2s"
                />
                <StatCard
                    title="Daily Service"
                    value={stats.alerts}
                    subtext="Actions in last 24h"
                    icon={<AlertCircle size={24} />}
                    delay="0.3s"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
                {/* Visual Status Grid */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3 className="card-title">Live Operational Status</h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px' }}>REAL-TIME SYNC</span>
                    </div>
                    <div className="card-body">
                        <div className="sky-zone-grid">
                            {zones.map(([name, data], idx) => {
                                const healthPercent = data.count > 0 ? (data.healthy / data.count) * 100 : 100;
                                const statusClass = healthPercent > 95 ? 'glow-emerald' : healthPercent > 80 ? 'glow-amber' : 'glow-rose';
                                return (
                                    <div key={name} className="sky-zone-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className={`sky-status-dot ${statusClass}`}></div>
                                        <div style={{ color: '#64748b' }}>{data.icon}</div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{name}</p>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{data.count} Units</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '1rem', border: '1px dashed #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Activity size={20} color="#3b82f6" />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>Network Load: Stable</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Telemetry data being received from all zones.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical Feed for Recent Activity */}
                <div className="premium-card">
                    <div className="card-header">
                        <h3 className="card-title">Event Feed</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto' }}>
                        {maintenanceLogs.slice(0, 10).map((log, idx) => (
                            <div key={log.id || idx} className="sky-feed-item">
                                <div className="sky-avatar">
                                    {(log.technician || 'SY').substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{log.stationId}</p>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={10} /> {new Date(log.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>
                                        {log.action.length > 40 ? log.action.substring(0, 40) + '...' : log.action}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="card-body" style={{ borderTop: '1px solid #f1f5f9', padding: '1rem' }}>
                        <button
                            className="btn-premium"
                            style={{ width: '100%', height: '40px', fontSize: '0.85rem' }}
                            onClick={() => setShowExportModal(true)}
                        >
                            Download Ops Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close" onClick={() => setShowExportModal(false)}>
                            <X size={18} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ background: '#eff6ff', color: '#3b82f6', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Calendar size={28} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Xuất báo cáo .xlsx</h3>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>Chọn khoảng thời gian để tạo báo cáo vận hành</p>
                        </div>

                        <div className="date-range-grid">
                            <div className="date-input-group">
                                <label>Từ ngày</label>
                                <input
                                    type="date"
                                    className="date-picker"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                />
                            </div>
                            <div className="date-input-group">
                                <label>Đến ngày</label>
                                <input
                                    type="date"
                                    className="date-picker"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            className="btn-premium"
                            style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1rem' }}
                            onClick={handleDownloadReport}
                        >
                            <Download size={20} /> Tải báo cáo ngay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
