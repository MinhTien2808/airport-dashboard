import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Settings, Plus, Trash2, Database, Layers, Home, Grid, Archive } from 'lucide-react';

const ConfigSection = ({ title, icon, data, onAdd, onDelete, type, isAdmin }) => {
    const [newValue, setNewValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newValue.trim()) {
            onAdd(type, newValue);
            setNewValue('');
        }
    };

    return (
        <div className="premium-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon}
                    <h3 className="card-title">{title}</h3>
                </div>
            </div>
            <div className="card-body">
                {isAdmin && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                        <input
                            type="text"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            placeholder={`Thêm ${title.toLowerCase()}...`}
                            className="premium-input"
                            style={{ flex: 1, padding: '0.5rem' }}
                        />
                        <button type="submit" className="btn-premium" style={{ height: 'auto', padding: '0.5rem 1rem' }}>
                            <Plus size={18} />
                        </button>
                    </form>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                    {data.map((item) => (
                        <div key={item.ID} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{item.DisplayName}</span>
                            {isAdmin && (
                                <button
                                    onClick={() => onDelete(type, item.ID)}
                                    style={{ color: '#94a3b8', hover: { color: '#ef4444' }, cursor: 'pointer', border: 'none', background: 'none' }}
                                    title="Xóa"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                    {data.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Trống</p>}
                </div>
            </div>
        </div>
    );
};

const Configuration = () => {
    const { units, systems, rooms, racks, bins, addMetadata, removeMetadata } = useData();
    const { user } = useAuth();

    // Ultra-robust check covering different property names and cases
    const userRole = (user?.role || user?.Role || '').toString().toUpperCase().trim();
    const isAdmin = userRole === 'ADMIN';

    return (
        <div className="animate-premium">
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a' }}>Cấu hình hệ thống</h2>
                <p style={{ color: '#64748b' }}>{isAdmin ? 'Quản lý các danh mục cơ bản của kho vật tư' : 'Xem các danh mục cơ bản của kho vật tư'}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <ConfigSection
                    title="Đơn vị tính"
                    icon={<Database size={20} color="#3b82f6" />}
                    data={units}
                    onAdd={addMetadata}
                    onDelete={removeMetadata}
                    type="units"
                    isAdmin={isAdmin}
                />
                <ConfigSection
                    title="Hệ thống"
                    icon={<Layers size={20} color="#8b5cf6" />}
                    data={systems}
                    onAdd={addMetadata}
                    onDelete={removeMetadata}
                    type="inventorysystems"
                    isAdmin={isAdmin}
                />
                <ConfigSection
                    title="Phòng"
                    icon={<Home size={20} color="#f59e0b" />}
                    data={rooms}
                    onAdd={addMetadata}
                    onDelete={removeMetadata}
                    type="rooms"
                    isAdmin={isAdmin}
                />
                <ConfigSection
                    title="Kệ"
                    icon={<Grid size={20} color="#10b981" />}
                    data={racks}
                    onAdd={addMetadata}
                    onDelete={removeMetadata}
                    type="racks"
                    isAdmin={isAdmin}
                />
                <ConfigSection
                    title="Thùng"
                    icon={<Archive size={20} color="#ec4899" />}
                    data={bins}
                    onAdd={addMetadata}
                    onDelete={removeMetadata}
                    type="bins"
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    );
};

export default Configuration;
