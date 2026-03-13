import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Monitor, Printer, Activity, Box, Settings } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { LogOut, Bell, AlertTriangle } from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const userRole = (user?.role || user?.Role || '').toString().toUpperCase().trim();
    const isAdmin = userRole === 'ADMIN';

    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={18} /> },
        { name: 'Equipment', path: '/equipment', icon: <Monitor size={18} /> },
        { name: 'Maintenance', path: '/maintenance', icon: <Printer size={18} /> },
        { name: 'Inventory', path: '/inventory', icon: <Box size={18} /> },
        ...(isAdmin ? [{ name: 'Configuration', path: '/config', icon: <Settings size={18} /> }] : []),
    ];

    return (
        <aside className="dashboard-sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <Activity size={22} color="white" />
                </div>
                <h1 className="brand-text">SkyGate<span style={{ color: '#60a5fa' }}>Terminal</span></h1>
            </div>

            <nav className="sidebar-nav">
                <p className="nav-section-title">Operations</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {item.icon}
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-user">
                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.username?.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="user-info">
                        <p className="user-name">{user?.username || 'User'}</p>
                        <p className="user-role">{user?.role || 'Guest'}</p>
                    </div>
                </div>
                <button
                    className="sidebar-logout-btn"
                    onClick={logout}
                    title="System Sign Out"
                >
                    <span className="logout-text">System Sign Out</span>
                    <LogOut size={18} className="logout-icon" style={{ display: 'none' }} />
                </button>
            </div>
        </aside>
    );
};

const Header = () => {
    const { inventoryItems, outputReceipts } = useData();
    const [showNotifs, setShowNotifs] = React.useState(false);

    // Calculate low stock items (Stock < 5)
    // Exclude "specialized items" which initially < 5 and never had >= 5
    // Heuristic: Current Stock + Total Outputs mapped to this item >= 5 signifies a normal item
    const lowStockItems = React.useMemo(() => {
        if (!inventoryItems) return [];
        return inventoryItems.filter(item => {
            if (item.StockCount >= 5) return false;

            // Check outputs to determine if it ever had >= 5
            const itemOutputs = outputReceipts?.filter(r => r.ObjectID === item.ID || r.ObjectName === item.DisplayName) || [];
            const totalOutputs = itemOutputs.reduce((sum, r) => sum + (Number(r.Count) || 0), 0);

            if ((item.StockCount + totalOutputs) < 5) return false;

            return true;
        });
    }, [inventoryItems, outputReceipts]);

    // Track read notifications
    const [readItemIds, setReadItemIds] = React.useState(() => {
        try { return JSON.parse(localStorage.getItem('readLowStockItems')) || []; }
        catch { return []; }
    });

    // Cleanup and sync read states
    React.useEffect(() => {
        const currentLowIds = lowStockItems.map(i => i.ID);
        // Only keep read IDs that are STILL low stock
        const validReadIds = readItemIds.filter(id => currentLowIds.includes(id));

        if (validReadIds.length !== readItemIds.length) {
            setReadItemIds(validReadIds);
            localStorage.setItem('readLowStockItems', JSON.stringify(validReadIds));
        } else {
            localStorage.setItem('readLowStockItems', JSON.stringify(readItemIds));
        }
    }, [lowStockItems, readItemIds]);

    const unreadCount = lowStockItems.filter(item => !readItemIds.includes(item.ID)).length;

    const handleNotifClick = () => {
        if (!showNotifs) {
            // When opening, mark all current lowStockItems as read
            const currentIds = lowStockItems.map(item => item.ID);
            const newReadIds = Array.from(new Set([...readItemIds, ...currentIds]));
            setReadItemIds(newReadIds);
        }
        setShowNotifs(!showNotifs);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.notif-dropdown-container')) {
                setShowNotifs(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="dashboard-header" style={{ position: 'relative', zIndex: 50 }}>
            <div className="header-title">
                Overview & Status
            </div>
            <div className="header-actions">
                <div className="status-indicator">
                    <span className="status-dot"></span>
                    Terminal Connection: 100%
                </div>
                <button className="header-action-button hide-on-mobile">Help</button>

                <div className="notif-dropdown-container" style={{ position: 'relative' }}>
                    <button
                        className="header-action-button hide-on-mobile"
                        onClick={handleNotifClick}
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Bell size={16} /> Notifications
                        {unreadCount > 0 && (
                            <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e11d48', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifs && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', width: '320px', background: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, overflow: 'hidden' }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '800', color: '#1e293b' }}>
                                Thông báo ({unreadCount})
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {lowStockItems.length === 0 ? (
                                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Không có thông báo mới</div>
                                ) : (
                                    lowStockItems.map(item => {
                                        const isNew = !readItemIds.includes(item.ID);
                                        return (
                                            <div key={item.ID} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', background: isNew ? '#fffbeb' : 'white' }}>
                                                <div style={{ background: '#fff1f2', padding: '6px', borderRadius: '6px', color: '#e11d48' }}>
                                                    <AlertTriangle size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#1e293b' }}>Sắp hết: {item.DisplayName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>Tồn kho hiện tại: <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{item.StockCount} {item.Unit}</span></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

const MainLayout = () => {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
                <Header />
                <main className="content-wrapper">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
