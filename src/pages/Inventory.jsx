import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import { Box, Search, Plus, Filter, ArrowDownCircle, ArrowUpCircle, Info, Hash, QrCode, MapPin, Trash2, Pencil, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Inventory = () => {
    const { inventoryItems, units, systems, rooms, racks, bins, inputReceipts, outputReceipts, addInventoryItem, updateInventoryItem, removeInventoryItem, recordTransaction } = useData();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('items'); // 'items', 'inputs', 'outputs'
    const [search, setSearch] = useState('');
    const [filterSystem, setFilterSystem] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Receipt Search & Pagination
    const [receiptSearch, setReceiptSearch] = useState('');
    const [receiptCurrentPage, setReceiptCurrentPage] = useState(1);
    const receiptsPerPage = 15;

    // Modals
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showTransModal, setShowTransModal] = useState(null); // { type: 'INPUT' | 'OUTPUT', item: object }

    // Form States
    const [newItem, setNewItem] = useState({ displayName: '', unitId: '', systemId: '', roomId: '', rackId: '', binId: '', qrCode: '', stockCount: 0, materialCode: '', unitPrice: 0 });
    const [transaction, setTransaction] = useState({ count: 1, serial: '', place: '', purpose: '', itemId: '' });
    const [itemSearch, setItemSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Export Excel States
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportDates, setExportDates] = useState({ start: '', end: '' });

    const filteredItems = useMemo(() => {
        return inventoryItems.filter(item => {
            const matchesSearch = item.DisplayName.toLowerCase().includes(search.toLowerCase()) ||
                (item.QRCode && item.QRCode.toLowerCase().includes(search.toLowerCase()));
            const matchesSystem = filterSystem === 'ALL' || item.SystemID === parseInt(filterSystem);
            return matchesSearch && matchesSystem;
        });
    }, [inventoryItems, search, filterSystem]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage]);

    // Reset pagination when searching or filtering
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, filterSystem]);

    // Reset receipt pagination when tab or search changes
    React.useEffect(() => {
        setReceiptCurrentPage(1);
    }, [activeTab, receiptSearch]);

    const filteredReceipts = useMemo(() => {
        const data = activeTab === 'inputs' ? inputReceipts : outputReceipts;
        return data.filter(rec =>
            rec.ObjectName.toLowerCase().includes(receiptSearch.toLowerCase()) ||
            rec.Place.toLowerCase().includes(receiptSearch.toLowerCase()) ||
            (rec.Technician || '').toLowerCase().includes(receiptSearch.toLowerCase()) ||
            (rec.ID.toString().includes(receiptSearch.replace('#', '')))
        );
    }, [activeTab, inputReceipts, outputReceipts, receiptSearch]);

    const totalReceiptPages = Math.ceil(filteredReceipts.length / receiptsPerPage);
    const paginatedReceipts = useMemo(() => {
        const start = (receiptCurrentPage - 1) * receiptsPerPage;
        return filteredReceipts.slice(start, start + receiptsPerPage);
    }, [filteredReceipts, receiptCurrentPage]);

    // Ultra-robust check covering different property names and cases
    const userRole = (user?.role || user?.Role || '').toString().toUpperCase().trim();
    const isAdmin = userRole === 'ADMIN';
    const canTransact = userRole === 'ADMIN' || userRole === 'OPERATOR';

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!isAdmin) {
            alert("Bạn không có quyền này!");
            return;
        }

        // Ensure IDs are numbers or null
        const itemToSave = {
            displayName: newItem.displayName,
            unitId: newItem.unitId ? parseInt(newItem.unitId) : null,
            systemId: newItem.systemId ? parseInt(newItem.systemId) : null,
            roomId: newItem.roomId ? parseInt(newItem.roomId) : null,
            rackId: newItem.rackId ? parseInt(newItem.rackId) : null,
            binId: newItem.binId ? parseInt(newItem.binId) : null,
            qrCode: newItem.qrCode,
            stockCount: parseInt(newItem.stockCount) || 0,
            materialCode: newItem.materialCode,
            unitPrice: parseFloat(newItem.unitPrice) || 0
        };

        if (editingItem) {
            await updateInventoryItem(editingItem.ID, itemToSave);
        } else {
            await addInventoryItem(itemToSave);
        }

        setShowItemModal(false);
        setEditingItem(null);
        setNewItem({ displayName: '', unitId: '', systemId: '', roomId: '', rackId: '', binId: '', qrCode: '', stockCount: 0, materialCode: '', unitPrice: 0 });
    };

    const handleEditClick = (item) => {
        if (!isAdmin) return;
        setEditingItem(item);
        setNewItem({
            displayName: item.DisplayName,
            unitId: item.UnitID || '',
            systemId: item.SystemID || '',
            roomId: item.RoomID || '',
            rackId: item.RackID || '',
            binId: item.BinID || '',
            qrCode: item.QRCode || '',
            stockCount: item.StockCount || 0,
            materialCode: item.MaterialCode || '',
            unitPrice: item.UnitPrice || 0
        });
        setShowItemModal(true);
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        if (!canTransact) {
            alert("Bạn không có quyền thực hiện nghiệp vụ này!");
            return;
        }

        const res = await recordTransaction({
            type: showTransModal.type,
            objectId: showTransModal.item ? showTransModal.item.ID : parseInt(transaction.itemId),
            count: parseInt(transaction.count),
            serial: transaction.serial,
            place: transaction.place,
            purpose: transaction.purpose,
            userId: user?.id || 1 // Fallback to 1 for admin
        });

        if (res.success) {
            setShowTransModal(null);
            setTransaction({ count: 1, serial: '', place: '', purpose: '' });
            setStatus({ type: '', message: '' });
        } else {
            setStatus({ type: 'error', message: res.message });
        }
    };

    const handleDeleteItem = async (id, name) => {
        if (!isAdmin) return;
        if (window.confirm(`Bạn có chắc chắn muốn xóa vật tư "${name}"? Thao tác này không thể hoàn tác.`)) {
            const res = await removeInventoryItem(id);
            if (!res.success) {
                alert(res.message);
            }
        }
    };

    const handleExportExcel = () => {
        if (!exportDates.start || !exportDates.end) {
            alert("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!");
            return;
        }

        const startD = new Date(exportDates.start);
        startD.setHours(0, 0, 0, 0);
        const endD = new Date(exportDates.end);
        endD.setHours(23, 59, 59, 999);

        if (startD > endD) {
            alert("Ngày bắt đầu không được lớn hơn ngày kết thúc!");
            return;
        }

        setShowExportModal(false);

        // Prepare Data for Export
        let totalDauKySL = 0, totalDauKyGT = 0;
        let totalNhapSL = 0, totalNhapGT = 0;
        let totalXuatSL = 0, totalXuatGT = 0;
        let totalCuoiKySL = 0, totalCuoiKyGT = 0;

        const dataRows = [];
        const dateStr = `Từ ngày ${startD.toLocaleDateString('vi-VN')} đến ngày ${endD.toLocaleDateString('vi-VN')}`;

        inventoryItems.forEach(item => {
            // Find inputs and outputs for this specific item
            const itemInputs = inputReceipts.filter(r => r.ObjectName === item.DisplayName);
            const itemOutputs = outputReceipts.filter(r => r.ObjectName === item.DisplayName);

            // Group by time periods to extrapolate opening/closing balances from current stock
            const inputsAfterEnd = itemInputs.filter(r => new Date(r.Date) > endD).reduce((sum, r) => sum + r.Count, 0);
            const outputsAfterEnd = itemOutputs.filter(r => new Date(r.Date) > endD).reduce((sum, r) => sum + r.Count, 0);

            const inputsInRangeList = itemInputs.filter(r => {
                const d = new Date(r.Date);
                return d >= startD && d <= endD;
            });
            const outputsInRangeList = itemOutputs.filter(r => {
                const d = new Date(r.Date);
                return d >= startD && d <= endD;
            });

            const totalImported = inputsInRangeList.reduce((sum, r) => sum + r.Count, 0);
            const totalExported = outputsInRangeList.reduce((sum, r) => sum + r.Count, 0);

            // Current stock in the DB
            const currentStock = item.StockCount || 0;

            // Closing balance at end date = Current Stock - (Inputs created after EndDate) + (Outputs created after EndDate)
            const closingBalanceCount = currentStock - inputsAfterEnd + outputsAfterEnd;

            // Opening balance at start date = Closing balance at end date - (Inputs during range) + (Outputs during range)
            const openingBalanceCount = closingBalanceCount - totalImported + totalExported;

            // Prices
            const price = parseFloat(item.UnitPrice) || 0;
            const openingBalanceValue = openingBalanceCount * price;
            const importValue = totalImported * price;
            const exportValue = totalExported * price;
            const closingBalanceValue = closingBalanceCount * price;

            // Accumulate totals
            totalDauKySL += openingBalanceCount;
            totalDauKyGT += openingBalanceValue;
            totalNhapSL += totalImported;
            totalNhapGT += importValue;
            totalXuatSL += totalExported;
            totalXuatGT += exportValue;
            totalCuoiKySL += closingBalanceCount;
            totalCuoiKyGT += closingBalanceValue;

            // Find last import date
            let lastImportDate = '';
            if (itemInputs.length > 0) {
                const latestInput = itemInputs.reduce((latest, current) => {
                    return new Date(current.Date) > new Date(latest.Date) ? current : latest;
                });
                lastImportDate = new Date(latestInput.Date).toLocaleDateString('vi-VN');
            }

            dataRows.push([
                item.MaterialCode || '',
                item.DisplayName,
                item.Unit || '',
                openingBalanceCount || '',
                openingBalanceValue || '',
                totalImported || '',
                importValue || '',
                totalExported || '',
                exportValue || '',
                closingBalanceCount || '',
                closingBalanceValue || '',
                lastImportDate
            ]);
        });

        // Construct AoA
        const aoa = [
            ["ĐƠN VỊ: CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG AHT"],
            ["Địa chỉ: Cảng hàng không quốc tế Đà Nẵng, Phường Hòa Cường, Thành phố Đà Nẵng, Việt Nam"],
            [],
            ["TỔNG HỢP NHẬP - XUẤT - TỒN"],
            [dateStr],
            ["Kho hàng: DOIIT - Đội Điện từ-DOIIT"],
            ["Mã số", "Mặt hàng", "Đvt", "Đầu kỳ", "", "Nhập", "", "Xuất", "", "Cuối kỳ", "", "Ngày nhập cuối"],
            ["", "", "", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị", "Số lượng", "Giá trị", ""],
            ["", "Kho hàng: DOIIT - Đội Điện từ-DOIIT", "", totalDauKySL, totalDauKyGT, totalNhapSL, totalNhapGT, totalXuatSL, totalXuatGT, totalCuoiKySL, totalCuoiKyGT, ""],
            ["", "1521 - Nguyên liệu, vật liệu - Đầu tư", "", totalDauKySL, totalDauKyGT, totalNhapSL, totalNhapGT, totalXuatSL, totalXuatGT, totalCuoiKySL, totalCuoiKyGT, ""]
        ];

        // Append Data
        dataRows.forEach(row => aoa.push(row));

        // 1. Create Worksheet
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Merge cells
        ws['!merges'] = [
            { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } }, // TỔNG HỢP NHẬP - XUẤT - TỒN
            { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } }, // Từ ngày...
            { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } }, // Kho hàng...
            { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } },  // Mã số 
            { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } },  // Mặt hàng
            { s: { r: 6, c: 2 }, e: { r: 7, c: 2 } },  // Đvt 
            { s: { r: 6, c: 3 }, e: { r: 6, c: 4 } },  // Đầu kỳ merge
            { s: { r: 6, c: 5 }, e: { r: 6, c: 6 } },  // Nhập merge
            { s: { r: 6, c: 7 }, e: { r: 6, c: 8 } },  // Xuất merge
            { s: { r: 6, c: 9 }, e: { r: 6, c: 10 } }, // Cuối kỳ merge
            { s: { r: 6, c: 11 }, e: { r: 7, c: 11 } } // Ngày nhập cuối
        ];

        // Format numbers in the sheet directly using SSF (internal format for , separators)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = 8; R <= range.e.r; ++R) { // Start from Row 9 (index 8)
            for (let C = 3; C <= 10; ++C) { // Cols D to K (index 3 to 10)
                let cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                let cell = ws[cellRef];
                if (cell && cell.v !== '' && cell.t === 'n') {
                    // D, F, H, J (indices 3, 5, 7, 9) are "Số lượng" -> 2 decimal places
                    if (C % 2 !== 0) {
                        cell.z = '#,##0.00';
                    } else {
                        // E, G, I, K (indices 4, 6, 8, 10) are "Giá trị" -> 0 decimal places
                        cell.z = '#,##0';
                    }
                }
            }
        }

        // Adjust column widths
        ws['!cols'] = [
            { wch: 20 }, // Mã số
            { wch: 45 }, // Mặt hàng
            { wch: 8 },  // Đvt
            { wch: 15 }, // Đầu kỳ SL
            { wch: 18 }, // Đầu kỳ GT
            { wch: 15 }, // Nhập SL
            { wch: 18 }, // Nhập GT
            { wch: 15 }, // Xuất SL
            { wch: 18 }, // Xuất GT
            { wch: 15 }, // Cuối kỳ SL
            { wch: 18 }, // Cuối kỳ GT
            { wch: 15 }  // Ngày nhập
        ];

        // 3. Create Workbook and add Worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Nhập Xuất Tồn");

        // 4. Create Blob and Download file
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Bao_Cao_Nhap_Xuat_Ton.xlsx";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    return (
        <div className="animate-premium">
            <div className="page-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Quản lý Kho IT</h2>

                <div className="tab-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '0.25rem' }}>
                    <button onClick={() => setActiveTab('items')} className={`tab-btn ${activeTab === 'items' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        <Box size={16} /> Danh sách Vật tư
                    </button>
                    <button onClick={() => setActiveTab('inputs')} className={`tab-btn ${activeTab === 'inputs' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        <ArrowDownCircle size={16} /> Phiếu Nhập kho
                    </button>
                    <button onClick={() => setActiveTab('outputs')} className={`tab-btn ${activeTab === 'outputs' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        <ArrowUpCircle size={16} /> Phiếu Xuất kho
                    </button>
                </div>
            </div>

            {activeTab === 'items' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="premium-search" style={{ flex: '1 1 200px', minWidth: '200px' }}>
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm vật tư hoặc mã QR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.85rem' }}
                        />
                    </div>

                    <select
                        className="premium-select"
                        style={{ flex: '0 1 180px', minWidth: '150px', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                        value={filterSystem}
                        onChange={(e) => setFilterSystem(e.target.value)}
                    >
                        <option value="ALL">Tất cả hệ thống</option>
                        {systems.map(s => <option key={s.ID} value={s.ID}>{s.DisplayName}</option>)}
                    </select>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button className="btn-premium" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowExportModal(true)}>
                            <Download size={16} /> Xuất Excel
                        </button>

                        <button className="btn-premium" style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => { setShowTransModal({ type: 'INPUT', item: null }); setTransaction({ count: 1, serial: '', place: '', purpose: '', itemId: '' }); }}>
                            <ArrowDownCircle size={16} /> Nhập vật tư
                        </button>

                        <button className="btn-premium" style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => { setShowTransModal({ type: 'OUTPUT', item: null }); setTransaction({ count: 1, serial: '', place: '', purpose: '', itemId: '' }); }}>
                            <ArrowUpCircle size={16} /> Xuất vật tư
                        </button>

                        {isAdmin && (
                            <button className="btn-premium" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowItemModal(true)}>
                                <Plus size={16} /> Thêm vật tư
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <>
                    <div className="premium-table-container">
                        <div className="premium-table-wrapper">
                            <table className="premium-table" style={{ minWidth: '940px' }}>
                                <thead>
                                    <tr>
                                        <th>Mã VT</th>
                                        <th>Tên vật tư</th>
                                        <th>Hệ thống</th>
                                        <th style={{ width: '120px' }}>Tồn kho</th>
                                        <th>Vị trí / Nơi để</th>
                                        <th>Mã QR</th>
                                        <th className="sticky-action" style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '1%' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.map(item => (
                                        <tr key={item.ID} className="table-row-hover">
                                            <td data-label="Mã VT" style={{ fontFamily: 'monospace', fontWeight: '700', color: '#3b82f6' }}>{item.MaterialCode || '-'}</td>
                                            <td data-label="Tên vật tư" style={{ fontWeight: '600', color: '#1e293b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.DisplayName}
                                                </div>
                                            </td>
                                            <td data-label="Hệ thống" style={{ color: '#475569', fontWeight: '600' }}>{item.System}</td>
                                            <td data-label="Tồn kho">
                                                <span style={{ background: '#f0f9ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                                                    {item.StockCount} {item.Unit}
                                                </span>
                                            </td>
                                            <td data-label="Vị trí / Nơi để" style={{ color: '#475569' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                    <MapPin size={14} color="#94a3b8" /> {item.Room || 'N/A'}/{item.Rack || 'N/A'}/{item.Bin || 'N/A'}
                                                </div>
                                            </td>
                                            <td data-label="Mã QR" style={{ fontFamily: 'monospace', color: '#64748b' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                    <QrCode size={14} color="#94a3b8" /> {item.QRCode || '-'}
                                                </div>
                                            </td>
                                            <td data-label="Thao tác" className="sticky-action" style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                                                    {canTransact && (
                                                        <>
                                                            <button
                                                                className="btn-action-compact input-btn"
                                                                title="Nhập kho"
                                                                onClick={() => setShowTransModal({ type: 'INPUT', item })}
                                                            >
                                                                <ArrowDownCircle size={14} /> Nhập
                                                            </button>
                                                            <button
                                                                className="btn-action-compact output-btn"
                                                                title="Xuất kho"
                                                                onClick={() => setShowTransModal({ type: 'OUTPUT', item })}
                                                            >
                                                                <ArrowUpCircle size={14} /> Xuất
                                                            </button>
                                                        </>
                                                    )}
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                className="btn-action-compact edit-btn"
                                                                title="Sửa"
                                                                onClick={() => handleEditClick(item)}
                                                            >
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button
                                                                className="btn-action-compact delete-btn"
                                                                title="Xóa"
                                                                onClick={() => handleDeleteItem(item.ID, item.DisplayName)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedItems.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Không có vật tư nào</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', padding: '1rem' }}>
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
                </>
            )
            }

            {
                (activeTab === 'inputs' || activeTab === 'outputs') && (
                    <div className="premium-table-container">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: 'none' }}>
                            <h3 className="card-title">Lịch sử {activeTab === 'inputs' ? 'Phiếu Nhập' : 'Phiếu Xuất'}</h3>

                            <div className="premium-search" style={{ width: '300px' }}>
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo vật tư, vị trí, mã phiếu..."
                                    value={receiptSearch}
                                    onChange={(e) => setReceiptSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="premium-table-wrapper">
                            <table className="premium-table" style={{ minWidth: '900px' }}>
                                <thead>
                                    <tr>
                                        <th>Mã phiếu</th>
                                        <th>Thời gian</th>
                                        <th>Vật tư</th>
                                        <th>Số lượng</th>
                                        <th>Vị trí / Nơi xuất</th>
                                        <th>Người thực hiện</th>
                                        {activeTab === 'outputs' && <th>Mục đích</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedReceipts.map(rec => (
                                        <tr key={rec.ID} className="table-row-hover">
                                            <td data-label="Mã phiếu" style={{ fontWeight: '700' }}>#{rec.ID}</td>
                                            <td data-label="Thời gian">{new Date(rec.Date).toLocaleString('vi-VN')}</td>
                                            <td data-label="Vật tư" style={{ fontWeight: '600', color: '#1e293b' }}>{rec.ObjectName}</td>
                                            <td data-label="Số lượng">
                                                <span style={{ padding: '4px 8px', borderRadius: '6px', background: activeTab === 'inputs' ? '#ecfdf5' : '#fff1f2', color: activeTab === 'inputs' ? '#059669' : '#e11d48', fontWeight: '800' }}>
                                                    {activeTab === 'inputs' ? '+' : '-'}{rec.Count}
                                                </span>
                                            </td>
                                            <td data-label="Vị trí / Nơi xuất" style={{ color: '#475569' }}>{rec.Place}</td>
                                            <td data-label="Người thực hiện" style={{ color: '#475569' }}>{rec.Technician || 'N/A'}</td>
                                            {activeTab === 'outputs' && <td data-label="Mục đích" style={{ color: '#64748b' }}>{rec.Purpose}</td>}
                                        </tr>
                                    ))}
                                    {filteredReceipts.length === 0 && (
                                        <tr>
                                            <td colSpan={activeTab === 'outputs' ? 7 : 6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Không có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls for Receipts */}
                        {totalReceiptPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                                <button
                                    className="btn-premium"
                                    style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                                    onClick={() => setReceiptCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={receiptCurrentPage === 1}
                                >
                                    Trước
                                </button>
                                <span style={{ fontWeight: '700', color: '#64748b' }}>Trang {receiptCurrentPage} / {totalReceiptPages}</span>
                                <button
                                    className="btn-premium"
                                    style={{ background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}
                                    onClick={() => setReceiptCurrentPage(p => Math.min(totalReceiptPages, p + 1))}
                                    disabled={receiptCurrentPage === totalReceiptPages}
                                >
                                    Sau
                                </button>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Modals remain same but handleAddItem updated */}
            <Modal isOpen={showItemModal} onClose={() => { setShowItemModal(false); setEditingItem(null); setNewItem({ displayName: '', unitId: '', systemId: '', roomId: '', rackId: '', binId: '', qrCode: '', stockCount: 0, materialCode: '', unitPrice: 0 }); }} title={editingItem ? "Sửa thông tin vật tư" : "Thêm vật tư mới"}>
                <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tên vật tư</label>
                        <input type="text" className="premium-input" required value={newItem.displayName} onChange={(e) => setNewItem({ ...newItem, displayName: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Đơn vị</label>
                            <select className="premium-select" required value={newItem.unitId} onChange={(e) => setNewItem({ ...newItem, unitId: e.target.value })}>
                                <option value="">Chọn...</option>
                                {units.map(u => <option key={u.ID} value={u.ID}>{u.DisplayName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Hệ thống</label>
                            <select className="premium-select" required value={newItem.systemId} onChange={(e) => setNewItem({ ...newItem, systemId: e.target.value })}>
                                <option value="">Chọn...</option>
                                {systems.map(s => <option key={s.ID} value={s.ID}>{s.DisplayName}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Vị trí (Phòng)</label>
                            <select className="premium-select" value={newItem.roomId} onChange={(e) => setNewItem({ ...newItem, roomId: e.target.value })}>
                                <option value="">Chọn...</option>
                                {rooms.map(rm => <option key={rm.ID} value={rm.ID}>{rm.DisplayName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Vị trí (Kệ)</label>
                            <select className="premium-select" value={newItem.rackId} onChange={(e) => setNewItem({ ...newItem, rackId: e.target.value })}>
                                <option value="">Chọn...</option>
                                {racks.map(r => <option key={r.ID} value={r.ID}>{r.DisplayName}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Vị trí (Thùng)</label>
                        <select className="premium-select" value={newItem.binId} onChange={(e) => setNewItem({ ...newItem, binId: e.target.value })}>
                            <option value="">Chọn...</option>
                            {bins.map(b => <option key={b.ID} value={b.ID}>{b.DisplayName}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Mã số mặt hàng</label>
                            <input type="text" className="premium-input" placeholder="VD: DT_VT_001..." value={newItem.materialCode} onChange={(e) => setNewItem({ ...newItem, materialCode: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Đơn giá (VNĐ)</label>
                            <input type="number" className="premium-input" value={newItem.unitPrice} onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Mã QR / Serial (Chung)</label>
                        <input type="text" className="premium-input" value={newItem.qrCode} onChange={(e) => setNewItem({ ...newItem, qrCode: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Số lượng tồn kho ban đầu</label>
                        <input type="number" className="premium-input" value={newItem.stockCount} onChange={(e) => setNewItem({ ...newItem, stockCount: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-premium w-full mt-4 py-3">
                        {editingItem ? "Lưu thay đổi" : "Lưu vật tư"}
                    </button>
                </form>
            </Modal>

            {/* Transaction Modal Same as before */}
            <Modal
                isOpen={!!showTransModal}
                onClose={() => { setShowTransModal(null); setItemSearch(''); setIsDropdownOpen(false); }}
                title={showTransModal?.item ? (showTransModal?.type === 'INPUT' ? `Nhập kho: ${showTransModal?.item.DisplayName}` : `Xuất kho: ${showTransModal?.item.DisplayName}`) : (showTransModal?.type === 'INPUT' ? 'Nhập kho nhanh' : 'Xuất kho nhanh')}
            >
                <form onSubmit={handleTransaction} className="space-y-4">
                    {!showTransModal?.item && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Tìm & Chọn vật tư</label>
                            <div className="search-dropdown-container">
                                <input
                                    type="text"
                                    className="premium-input"
                                    placeholder="Gõ tên hoặc mã vật tư..."
                                    value={itemSearch}
                                    onChange={(e) => {
                                        setItemSearch(e.target.value);
                                        setIsDropdownOpen(true);
                                        if (!e.target.value) setTransaction({ ...transaction, itemId: '' });
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                    required={!transaction.itemId}
                                />

                                {isDropdownOpen && (
                                    <div className="search-results-list">
                                        {inventoryItems
                                            .filter(item =>
                                                item.DisplayName.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                                (item.MaterialCode && item.MaterialCode.toLowerCase().includes(itemSearch.toLowerCase()))
                                            )
                                            .sort((a, b) => a.DisplayName.localeCompare(b.DisplayName))
                                            .map(item => (
                                                <div
                                                    key={item.ID}
                                                    className="search-result-item"
                                                    onMouseDown={() => {
                                                        setTransaction({ ...transaction, itemId: item.ID });
                                                        setItemSearch(item.DisplayName);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="search-result-name">{item.DisplayName}</div>
                                                        <div className="search-result-meta">{item.MaterialCode || 'N/A'} • {item.System}</div>
                                                    </div>
                                                    <div className="search-result-stock">{item.StockCount} {item.Unit}</div>
                                                </div>
                                            ))
                                        }
                                        {inventoryItems.filter(item =>
                                            item.DisplayName.toLowerCase().includes(itemSearch.toLowerCase()) ||
                                            (item.MaterialCode && item.MaterialCode.toLowerCase().includes(itemSearch.toLowerCase()))
                                        ).length === 0 && (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                                    Không tìm thấy kết quả nào
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {status.message && (
                        <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#fef2f2', color: '#991b1b', fontSize: '0.85rem' }}>
                            {status.message}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Số lượng</label>
                            <input type="number" className="premium-input" required min="1" value={transaction.count} onChange={(e) => setTransaction({ ...transaction, count: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Serial (nếu có)</label>
                            <input type="text" className="premium-input" value={transaction.serial} onChange={(e) => setTransaction({ ...transaction, serial: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Vị trí / Nơi xuất</label>
                        <input type="text" className="premium-input" required value={transaction.place} onChange={(e) => setTransaction({ ...transaction, place: e.target.value })} placeholder={showTransModal?.type === 'INPUT' ? "Nguồn nhập..." : "Nơi lắp đặt/sử dụng..."} />
                    </div>
                    {showTransModal?.type === 'OUTPUT' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Mục đích xuất</label>
                            <textarea className="premium-input" style={{ height: '80px', paddingTop: '8px' }} value={transaction.purpose} onChange={(e) => setTransaction({ ...transaction, purpose: e.target.value })} placeholder="Ghi chú mục đích sử dụng..." />
                        </div>
                    )}
                    <button type="submit" className="btn-premium w-full mt-4 py-3">Xác nhận {showTransModal?.type === 'INPUT' ? 'nhập kho' : 'xuất kho'}</button>
                </form>
            </Modal>

            <Modal isOpen={showExportModal} onClose={() => setShowExportModal(false)} title="Tùy chọn Báo Cáo Excel">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Từ ngày</label>
                        <input type="date" className="premium-input" value={exportDates.start} onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Đến ngày</label>
                        <input type="date" className="premium-input" value={exportDates.end} onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })} />
                    </div>
                    <button
                        className="btn-premium w-full mt-4 py-3"
                        onClick={() => {
                            handleExportExcel();
                        }}
                    >
                        <Download size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} /> Xác nhận & Tải xuống
                    </button>
                </div>
            </Modal>
        </div >
    );
};

export default Inventory;
