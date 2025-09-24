/**
 * 可重複使用的表格格式化工具
 * Reusable Table Formatter Utility
 * 
 * 功能包括:
 * - 表頭拖拽重新排序
 * - 欄位顯示/隱藏控制
 * - 動態列寬調整
 * - 固定欄位功能
 * - 排序狀態保存到後端
 * - 滾動陰影效果
 */

class ReusableTableFormatter {
    constructor(options = {}) {
        // 預設配置
        this.config = {
            tableId: 'horizontal-scroll',
            tbodyId: 'appointmentsTableBody',
            hideShowBtnId: 'HideAndShowBtn',
            saveOrderBtnId: 'saveOrderBtn',
            resetOrderBtnId: 'resetOrderBtn',
            gridName: '',
            apiEndpoints: {
                saveOrder: '/api/table/save-table-order/',
                getOrder: '/api/table/get-table-order/',
                deleteOrder: '/api/table/delete-table-order/'
            },
            fixedColumnsCount: 3, // 前幾個欄位固定
            stickyColumns: true,
            scrollShadows: true,
            
        };

        this.config = { ...this.config, ...options };

        // 內部狀態
        this.defaultOrder = [];
        this.columnVisibility = {};
        this.isInitialized = false;

        // 綁定方法到實例
        this.debounce = this.debounce.bind(this);
        this.adjustColumnWidths = this.adjustColumnWidths.bind(this);
        this.calculateStickyColumnsWidth = this.calculateStickyColumnsWidth.bind(this);
    }

    /**
     * 初始化表格格式化工具
     */
    init() {
        if (this.isInitialized) {
            console.warn('TableFormatter already initialized');
            return;
        }

        this.initHeaderDrag();
        this.initializeColumnVisibility();
        
        if (this.config.stickyColumns) {
            this.initializeStickyColumns();
        }
        
        if (this.config.scrollShadows) {
            this.addScrollShadows();
        }
        
        this.applySavedOrder();
        this.isInitialized = true;
        
        console.log('ReusableTableFormatter initialized');
    }

    /**
     * 檢查是否為固定欄位
     */
    isFixedColumn(field) {
        const headerCells = document.querySelectorAll(`#${this.config.tableId} thead th`);
        const indexColumn = Array.from(headerCells).findIndex(th => th.dataset.field === 'index');
        
        if (indexColumn === -1) return false;
        
        const fixedColumns = [];
        for (let i = 1; i <= this.config.fixedColumnsCount - 1 && indexColumn + i < headerCells.length; i++) {
            const nextField = headerCells[indexColumn + i]?.dataset?.field;
            if (nextField) {
                fixedColumns.push(nextField);
            }
        }
        
        return fixedColumns.includes(field);
    }

    /**
     * 檢查是否不可拖拽
     */
    isNotDraggable(field) {
        return field === 'index';
    }

    /**
     * 初始化欄位顯示狀態
     */
    initializeColumnVisibility() {
        const headerCells = document.querySelectorAll(`#${this.config.tableId} thead th`);
        headerCells.forEach(th => {
            const field = th.dataset.field;
            if (field) {
                if (this.isFixedColumn(field)) {
                    this.columnVisibility[field] = true;
                } else {
                    this.columnVisibility[field] = this.columnVisibility[field] !== undefined ? this.columnVisibility[field] : true;
                }
            }
        });
    }

    /**
     * 初始化表頭拖拽功能
     */
    initHeaderDrag() {
        const theadRow = document.querySelector(`#${this.config.tableId} thead tr`);
        if (!theadRow) return;

        const ths = theadRow.querySelectorAll("th");
        if (this.defaultOrder.length === 0) {
            this.defaultOrder = Array.from(ths).map(th => th.textContent.trim());
        }

        ths.forEach((th) => {
            const field = th.dataset.field;
            
            if (this.isNotDraggable(field)) {
                th.style.cursor = 'default';
                th.removeAttribute("draggable");
                return;
            }

            th.setAttribute("draggable", true);
            th.style.cursor = 'move';

            th.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", th.dataset.field);
            });

            th.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!this.isNotDraggable(th.dataset.field)) {
                    th.style.borderLeft = "2px solid blue";
                }
            });

            th.addEventListener("dragleave", () => {
                th.style.borderLeft = "";
            });

            th.addEventListener("drop", (e) => {
                e.preventDefault();
                th.style.borderLeft = "";

                const fromField = e.dataTransfer.getData("text/plain");
                const toField = th.dataset.field;

                if (this.isNotDraggable(toField)) {
                    console.log("不允許拖拽到 No 欄位");
                    return;
                }

                this.reorderColumnsByField(fromField, toField);

                setTimeout(() => {
                    this.adjustColumnWidths();
                    if (this.config.stickyColumns) {
                        this.initializeStickyColumns();
                    }
                }, 100);
            });
        });

        this.bindButtons();
    }

    /**
     * 綁定控制按鈕
     */
    bindButtons() {
        const hideShowBtn = document.getElementById(this.config.hideShowBtnId);
        if (hideShowBtn) {
            hideShowBtn.addEventListener("click", () => this.createHideShowDropdown());
        }

        const saveBtn = document.getElementById(this.config.saveOrderBtnId);
        if (saveBtn) {
            saveBtn.addEventListener("click", () => this.saveCurrentOrder());
        }

        const resetBtn = document.getElementById(this.config.resetOrderBtnId);
        if (resetBtn) {
            resetBtn.addEventListener("click", () => this.resetToDefaultOrder());
        }
    }

    /**
     * 建立 Hide and Show 下拉選單
     */
    createHideShowDropdown() {
        const button = document.getElementById(this.config.hideShowBtnId);
        if (!button) return;

        const existingDropdown = document.querySelector('.hide-show-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }

        const headerCells = document.querySelectorAll(`#${this.config.tableId} thead th`);
        const dropdown = document.createElement('div');
        dropdown.className = 'hide-show-dropdown';
        
        const rect = button.getBoundingClientRect();
        dropdown.style.cssText = `
            position: absolute;
            top: ${rect.bottom + window.scrollY + 5}px;
            left: ${rect.left + window.scrollX}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 8px 0;
            min-width: 200px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
        `;

        let dropdownHTML = '<div style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #eee; color: #666;">選擇要顯示的欄位</div>';
        
        headerCells.forEach(th => {
            const field = th.dataset.field;
            const fieldName = th.textContent.trim();
            
            if (this.isNotDraggable(field)) {
                return;
            }
            
            if (this.isFixedColumn(field)) {
                dropdownHTML += `
                    <div class="dropdown-item" style="padding: 8px 12px; color: #999; cursor: not-allowed;">
                        <label style="cursor: not-allowed; display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" checked disabled style="cursor: not-allowed;">
                            <span>${fieldName} (不可隱藏)</span>
                        </label>
                    </div>`;
            } else if (field) {
                const isVisible = this.columnVisibility[field] !== false;
                dropdownHTML += `
                    <div class="dropdown-item" style="padding: 8px 12px; cursor: pointer;" data-field="${field}">
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%;">
                            <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="window.tableFormatter.toggleColumnVisibility('${field}', this.checked)">
                            <span>${fieldName}</span>
                        </label>
                    </div>`;
            }
        });

        dropdown.innerHTML = dropdownHTML;
        document.body.appendChild(dropdown);

        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
    }

    /**
     * 切換欄位顯示狀態
     */
    toggleColumnVisibility(field, isVisible) {
        if (this.isFixedColumn(field)) {
            console.warn(`欄位 ${field} 是固定欄位，無法隱藏`);
            return;
        }

        this.columnVisibility[field] = isVisible;
        this.updateTableDisplay();
        
        console.log(`欄位 ${field} 顯示狀態已更改為: ${isVisible ? '顯示' : '隱藏'}`);
    }

    /**
     * 更新表格顯示
     */
    updateTableDisplay() {
        const table = document.getElementById(this.config.tableId);
        if (!table) return;

        const headerCells = table.querySelectorAll('thead th');
        const bodyRows = table.querySelectorAll('tbody tr');

        headerCells.forEach((th, index) => {
            const field = th.dataset.field;
            const isVisible = this.isFixedColumn(field) ? true : (this.columnVisibility[field] !== false);
            
            th.style.display = isVisible ? '' : 'none';
            
            bodyRows.forEach(row => {
                const cell = row.children[index];
                if (cell) {
                    cell.style.display = isVisible ? '' : 'none';
                }
            });
        });

        this.adjustColumnWidths();
        if (this.config.stickyColumns) {
            this.calculateStickyColumnsWidth();
        }
    }

    /**
     * 重新排序欄位
     */
    reorderColumnsByField(fromField, toField) {
        if (fromField === toField) {
            console.log("拖拽到相同位置，不需要重新排序");
            return;
        }

        const table = document.getElementById(this.config.tableId);
        const headerRow = table.querySelector("thead tr");
        const ths = Array.from(headerRow.children);

        const fromIndex = ths.findIndex(th => th.dataset.field === fromField);
        const toIndex = ths.findIndex(th => th.dataset.field === toField);

        if (fromIndex === -1 || toIndex === -1) {
            console.error("找不到對應的欄位:", { fromField, toField, fromIndex, toIndex });
            return;
        }

        console.log(`開始重新排序: ${fromField}(${fromIndex}) → ${toField}(${toIndex})`);

        const rows = table.querySelectorAll("tr");
        rows.forEach((row) => {
            const cells = Array.from(row.children);
            if (cells.length <= Math.max(fromIndex, toIndex)) {
                console.warn("該行的 cell 數量不足，跳過");
                return;
            }
            
            if (fromIndex < toIndex) {
                row.insertBefore(cells[fromIndex], cells[toIndex].nextSibling);
            } else {
                row.insertBefore(cells[fromIndex], cells[toIndex]);
            }
        });

        console.log(`表頭順序已調整 (靠 field: ${fromField} → ${toField})`);

        requestAnimationFrame(() => {
            this.adjustColumnWidths();
            
            if (this.config.stickyColumns) {
                setTimeout(() => {
                    this.calculateStickyColumnsWidth();
                }, 50);
            }
        });
    }

    /**
     * 動態調整列寬
     */
    adjustColumnWidths() {
        const table = document.getElementById(this.config.tableId);
        if (!table) return;

        const measureElement = document.createElement('div');
        measureElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            white-space: nowrap;
            font-size: 14px;
            font-family: ${getComputedStyle(table).fontFamily};
            padding: 8px 12px;
        `;
        document.body.appendChild(measureElement);

        const headerCells = table.querySelectorAll('thead th');
        const bodyRows = table.querySelectorAll('tbody tr');

        headerCells.forEach((th, colIndex) => {
            let maxWidth = 0;
            const field = th.dataset.field;

            measureElement.textContent = th.textContent;
            maxWidth = Math.max(maxWidth, measureElement.offsetWidth);

            if (bodyRows.length > 0) {
                bodyRows.forEach(row => {
                    const cell = row.children[colIndex];
                    if (cell) {
                        let textContent = "";

                        if (field === "action") {
                            maxWidth = Math.max(maxWidth, 200);
                            return;
                        } else if (cell.querySelector(".badge")) {
                            textContent = cell.querySelector(".badge").textContent;
                        } else {
                            textContent = cell.textContent;
                        }

                        measureElement.textContent = textContent;
                        maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
                    }
                });
            }

            const minWidth = this.getMinWidthForField(field);
            const maxWidthLimit = this.getMaxWidthForField(field);

            maxWidth = Math.max(maxWidth, minWidth);
            maxWidth = Math.min(maxWidth, maxWidthLimit);

            let extraPadding = 20;
            if (['name', 'pcompanyname', 'remark', 'customer_remark', 'doctorname'].includes(field)) {
                extraPadding = 30;
            }
            maxWidth += extraPadding;

            th.style.width = `${maxWidth}px`;
            th.style.minWidth = `${maxWidth}px`;
            th.style.maxWidth = `${maxWidth}px`;

            bodyRows.forEach(row => {
                const cell = row.children[colIndex];
                if (cell) {
                    cell.style.width = `${maxWidth}px`;
                    cell.style.minWidth = `${maxWidth}px`;
                    cell.style.maxWidth = `${maxWidth}px`;
                }
            });

            console.log(`Column ${field}: width set to ${maxWidth}px`);
        });

        document.body.removeChild(measureElement);
    }

    /**
     * 獲取不同欄位的最小寬度
     */
    getMinWidthForField(field) {
        const minWidths = {
            'index': 60,
            'action': 200,
            'name': 150,
            'pcompanyname': 150,
            'eInvoiceStatus': 100,
            'visitdate': 100,
            'gender': 80,
            'buydrug': 80,
            'nettotalamount': 120,
            'netcashamount': 120,
            'netinvoiceamount': 120,
            'paidamount': 120,
            'cashamt': 100,
            'cardamt': 100,
            'chequeamt': 100,
            'mobileamt': 100,
            'onlineamt': 100,
            'nextaptdate': 100,
            'cnwaiting_mins': 80,
            'eInvoiceSubmitted': 80,
            'isforeigner': 80,
            'icno': 120,
            'customerno': 100,
            'doctorname': 120,
            'status': 100,
            'remark': 120,
            'customer_remark': 120
        };
        
        return minWidths[field] || 100;
    }

    /**
     * 獲取不同欄位的最大寬度
     */
    getMaxWidthForField(field) {
        const maxWidths = {
            'name': 400,
            'pcompanyname': 400,
            'remark': 350,
            'customer_remark': 350,
            'doctorname': 250,
            'status': 100,
            'dispensary_checkedby': 250,
            'createdby': 200,
            'icno': 200,
            'customerno': 150
        };
        
        return maxWidths[field] || 400;
    }

    /**
     * 保存當前排序到後端
     */
    async saveCurrentOrder() {
        const headerCells = document.querySelectorAll(`#${this.config.tableId} thead th`);
        const order = Array.from(headerCells).map((th) => th.textContent.trim());

        const visibilityData = {};
        headerCells.forEach(th => {
            const field = th.dataset.field;
            const fieldName = th.textContent.trim();
            if (field && fieldName) {
                visibilityData[fieldName] = {
                    field: field,
                    visible: this.columnVisibility[field] !== false
                };
            }
        });
        
        console.log("準備保存表頭順序:", order);
        console.log("準備保存欄位顯示狀態:", visibilityData);
        
        try {
            const response = await fetch(this.config.apiEndpoints.saveOrder, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gridname: this.config.gridName,
                    column_order: JSON.stringify(order),
                    column_visible: JSON.stringify(visibilityData)
                })
            });

            const result = await response.json();
            if (result.success) {
                console.log("表頭順序已保存到數據庫:", order);
                
                // 觸發自定義事件
                this.dispatchEvent('orderSaved', { order, visibilityData });
                
                // 顯示成功的modal（如果存在）
                const modalEl = document.getElementById("save-table");
                if (modalEl && typeof bootstrap !== 'undefined') {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            } else {
                console.error("保存失敗:", result.error);
                alert("保存失敗: " + result.error);
            }
        } catch (error) {
            console.error("網路錯誤:", error);
            alert("保存失敗: 網路錯誤");
        }
    }

    /**
     * 從後端載入保存的排序
     */
    async applySavedOrder() {
        try {
            const url = `${this.config.apiEndpoints.getOrder}?gridname=${encodeURIComponent(this.config.gridName)}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            const result = await response.json();
            
            if (result.order && result.visible) {
                const order = JSON.parse(result.order);
                const visibilityData = JSON.parse(result.visible);
                console.log("從後端載入表頭順序:", order);
                console.log("從後端載入欄位顯示狀態:", visibilityData);
                
                Object.keys(visibilityData).forEach(columnName => {
                    const columnData = visibilityData[columnName];
                    if (columnData.field) {
                        this.columnVisibility[columnData.field] = columnData.visible;
                    }
                });
                
                this.updateTableDisplay();
                this.applyOrder(order, visibilityData);
            }
            
            if (!result.order && this.defaultOrder.length > 0) {
                console.log("後端沒有找到排序資料，使用 defaultOrder");
                this.applyOrder(this.defaultOrder);
            }
            
        } catch (error) {
            console.error("載入 column order 失敗:", error);
            console.log("使用 defaultOrder 作為後備方案");
            if (this.defaultOrder.length > 0) {
                this.applyOrder(this.defaultOrder);
            }
        }
    }

    /**
     * 應用排序
     */
    applyOrder(order) {
        const table = document.getElementById(this.config.tableId);
        const headerRow = table.querySelector("thead tr");
        const bodyRows = table.querySelectorAll("tbody tr");

        if (!headerRow || order.length === 0) {
            console.log("表頭或順序資料不完整，跳過排序");
            return;
        }

        const ths = Array.from(headerRow.children);
        const thMap = {};
        
        ths.forEach((th) => {
            const headerText = th.textContent.trim();
            thMap[headerText] = th;
        });

        headerRow.innerHTML = "";
        order.forEach((colName) => {
            if (thMap[colName]) {
                headerRow.appendChild(thMap[colName]);
            } else {
                console.warn(`找不到對應的表頭: ${colName}`);
            }
        });

        if (bodyRows.length > 0) {
            bodyRows.forEach((row) => {
                const cells = Array.from(row.children);
                const cellMap = {};
                
                this.defaultOrder.forEach((colName, index) => {
                    if (cells[index]) {
                        cellMap[colName] = cells[index];
                    }
                });

                row.innerHTML = "";
                order.forEach((colName) => {
                    if (cellMap[colName]) {
                        row.appendChild(cellMap[colName]);
                    } else {
                        const td = document.createElement('td');
                        td.textContent = '-';
                        td.classList.add("text-nowrap");
                        row.appendChild(td);
                    }
                });
            });
        }
        
        console.log("表格順序已套用:", order);
    }

    /**
     * 重置到默認排序
     */
    async resetToDefaultOrder() {
        if (this.defaultOrder.length === 0) return;

        this.columnVisibility = {};
        this.initializeColumnVisibility();

        this.applyOrder(this.defaultOrder);

        try {
            const response = await fetch(this.config.apiEndpoints.deleteOrder, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    gridname: this.config.gridName
                }),
            });

            const result = await response.json();
            if (result.success) {
                console.log("已刪除後端排序記錄");
                location.reload();
            } else {
                console.error("刪除失敗:", result.message);
            }
        } catch (error) {
            console.error("API 請求錯誤:", error);
        }

        console.log("已恢復到預設表頭順序和欄位顯示狀態");
        
        setTimeout(() => {
            this.adjustColumnWidths();
            if (this.config.stickyColumns) {
                this.initializeStickyColumns();
            }
        }, 100);
    }

    /**
     * 初始化固定列功能
     */
    initializeStickyColumns() {
        setTimeout(() => {
            this.calculateStickyColumnsWidth();
            document.body.classList.add('sticky-columns-initialized');
            
            window.addEventListener('resize', this.debounce(() => {
                this.adjustColumnWidths();
                this.calculateStickyColumnsWidth();
            }, 250));
        }, 100);
    }

    /**
     * 計算並設置固定列寬度
     */
    calculateStickyColumnsWidth() {
        const table = document.getElementById(this.config.tableId);
        if (!table) return;

        const headerRow = table.querySelector('thead tr');
        if (!headerRow) return;

        const cells = headerRow.querySelectorAll('th');
        if (cells.length < this.config.fixedColumnsCount) return;

        const firstColumnWidth = cells[0]?.offsetWidth || 0;
        const secondColumnWidth = cells[1]?.offsetWidth || 0;

        const col1TotalWidth = firstColumnWidth;
        const col1And2TotalWidth = firstColumnWidth + secondColumnWidth;

        document.documentElement.style.setProperty('--col1-width', `${col1TotalWidth}px`);
        document.documentElement.style.setProperty('--col1-2-width', `${col1And2TotalWidth}px`);

        console.log(`Sticky columns updated: col1=${col1TotalWidth}px, col1-2=${col1And2TotalWidth}px`);
    }

    /**
     * 添加滾動陰影效果
     */
    addScrollShadows() {
        const tableContainer = document.querySelector('.appointments-table') || 
                               document.querySelector(`#${this.config.tableId}`).parentElement;
        if (!tableContainer) return;

        tableContainer.addEventListener('scroll', function() {
            const scrollLeft = this.scrollLeft;
            const maxScrollLeft = this.scrollWidth - this.clientWidth;
            
            if (scrollLeft > 0) {
                this.classList.add('has-left-shadow');
            } else {
                this.classList.remove('has-left-shadow');
            }
            
            if (scrollLeft < maxScrollLeft - 1) {
                this.classList.add('has-right-shadow');
            } else {
                this.classList.remove('has-right-shadow');
            }
        });

        tableContainer.dispatchEvent(new Event('scroll'));
    }

    /**
     * 防抖函數
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 獲取CSRF令牌
     */
    getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
               this.getCookie('csrftoken') || '';
    }

    /**
     * 獲取Cookie
     */
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + "=")) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * 觸發自定義事件
     */
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`tableFormatter:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    /**
     * 顯示無數據行
     */
    showNoDataRow(message, rowClass = "no-data-row") {
        const tbody = document.getElementById(this.config.tbodyId);
        if (!tbody) return;

        tbody.innerHTML = "";

        const headerCells = document.querySelectorAll(`#${this.config.tableId} thead th`);
        const tr = document.createElement("tr");

        headerCells.forEach((th, i) => {
            const td = document.createElement("td");

            if (i === 0) {
                td.classList.add("text-center", rowClass);
                td.textContent = message;
            } else {
                td.textContent = "";
            }

            td.style.width = th.style.width;
            td.style.minWidth = th.style.minWidth;
            td.style.maxWidth = th.style.maxWidth;

            tr.appendChild(td);
        });

        tbody.appendChild(tr);

        setTimeout(() => {
            this.adjustColumnWidths();
            if (this.config.stickyColumns) {
                this.calculateStickyColumnsWidth();
            }
        }, 50);
    }

    /**
     * 銷毀實例
     */
    destroy() {
        // 移除事件監聽器
        window.removeEventListener('resize', this.debounce);
        
        // 重置狀態
        this.defaultOrder = [];
        this.columnVisibility = {};
        this.isInitialized = false;
        
        console.log('ReusableTableFormatter destroyed');
    }
}

// 添加相關的CSS樣式
const tableFormatterStyles = `
.hide-show-dropdown {
    font-family: inherit;
    font-size: 14px;
}

.hide-show-dropdown .dropdown-item {
    transition: background-color 0.2s ease;
    user-select: none;
}

.hide-show-dropdown .dropdown-item:hover:not([style*="not-allowed"]) {
    background-color: #f8f9fa;
}

.hide-show-dropdown label {
    margin: 0;
    font-weight: normal;
}

.hide-show-dropdown input[type="checkbox"] {
    margin: 0;
    transform: scale(1.1);
}

.hide-show-dropdown::-webkit-scrollbar {
    width: 6px;
}

.hide-show-dropdown::-webkit-scrollbar-track {
    background: #f1f1f1;
}

.hide-show-dropdown::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}

.hide-show-dropdown::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* 固定列樣式 */
.sticky-columns-initialized .appointments-table {
    overflow-x: auto;
    position: relative;
}

.sticky-columns-initialized .appointments-table th:first-child,
.sticky-columns-initialized .appointments-table td:first-child {
    position: sticky;
    left: 0;
    background: white;
    z-index: 10;
    border-right: 1px solid #dee2e6;
}

.sticky-columns-initialized .appointments-table th:nth-child(2),
.sticky-columns-initialized .appointments-table td:nth-child(2) {
    position: sticky;
    left: var(--col1-width, 80px);
    background: white;
    z-index: 9;
    border-right: 1px solid #dee2e6;
}

.sticky-columns-initialized .appointments-table th:nth-child(3),
.sticky-columns-initialized .appointments-table td:nth-child(3) {
    position: sticky;
    left: var(--col1-2-width, 160px);
    background: white;
    z-index: 8;
    border-right: 1px solid #dee2e6;
}

/* 滾動陰影效果 */
.appointments-table.has-left-shadow::before {
    content: '';
    position: absolute;
    top: 0;
    left: var(--col1-2-width, 160px);
    bottom: 0;
    width: 10px;
    background: linear-gradient(to right, rgba(0,0,0,0.1), transparent);
    z-index: 15;
    pointer-events: none;
}

.appointments-table.has-right-shadow::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 10px;
    background: linear-gradient(to left, rgba(0,0,0,0.1), transparent);
    z-index: 15;
    pointer-events: none;
}

/* 表格基本樣式 */
.table-formatter-container {
    position: relative;
}

.table-formatter-container table {
    border-collapse: separate;
    border-spacing: 0;
}

.table-formatter-container th,
.table-formatter-container td {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid #dee2e6;
    padding: 8px 12px;
}

.table-formatter-container thead th {
    background-color: #f8f9fa;
    font-weight: 600;
    position: relative;
}

.table-formatter-container thead th[draggable="true"] {
    cursor: move;
}

.table-formatter-container thead th[draggable="true"]:hover {
    background-color: #e9ecef;
}

/* 無數據行樣式 */
.no-data-row {
    color: #6c757d;
    font-style: italic;
}

.error-row {
    color: #dc3545;
    font-weight: 500;
}
`;

// 自動注入樣式
function injectTableFormatterStyles() {
    const existingStyle = document.getElementById('table-formatter-styles');
    if (existingStyle) return;

    const style = document.createElement('style');
    style.id = 'table-formatter-styles';
    style.textContent = tableFormatterStyles;
    document.head.appendChild(style);
}

// 全域實例管理
window.TableFormatterInstances = window.TableFormatterInstances || new Map();

// 工廠函數 - 創建或獲取表格格式化器實例
function createTableFormatter(tableId, options = {}) {
    // 注入樣式
    injectTableFormatterStyles();
    
    // 如果已存在該表格的實例，先銷毀它
    if (window.TableFormatterInstances.has(tableId)) {
        window.TableFormatterInstances.get(tableId).destroy();
    }
    
    // 創建新實例
    const formatter = new ReusableTableFormatter({
        tableId: tableId,
        ...options
    });
    
    // 存儲實例
    window.TableFormatterInstances.set(tableId, formatter);
    
    // 設置全域引用（向後兼容）
    if (tableId === 'horizontal-scroll') {
        window.tableFormatter = formatter;
    }
    
    return formatter;
}

// 獲取表格格式化器實例
function getTableFormatter(tableId) {
    return window.TableFormatterInstances.get(tableId);
}

// 銷毀所有實例
function destroyAllTableFormatters() {
    window.TableFormatterInstances.forEach(formatter => formatter.destroy());
    window.TableFormatterInstances.clear();
    delete window.tableFormatter;
}

// 導出到全域
window.ReusableTableFormatter = ReusableTableFormatter;
window.createTableFormatter = createTableFormatter;
window.getTableFormatter = getTableFormatter;
window.destroyAllTableFormatters = destroyAllTableFormatters;

// 使用示例和說明
/*
使用方式:

1. 基本使用:
   const formatter = createTableFormatter('your-table-id', {
       tbodyId: 'your-tbody-id',
       hideShowBtnId: 'your-hide-show-btn-id',
       saveOrderBtnId: 'your-save-btn-id',
       resetOrderBtnId: 'your-reset-btn-id',
       gridName: 'your-grid-name',
       fixedColumnsCount: 3
   });
   formatter.init();

2. 載入數據後調用:
   formatter.adjustColumnWidths();
   formatter.updateTableDisplay();

3. 監聽事件:
   document.addEventListener('tableFormatter:orderSaved', function(e) {
       console.log('Order saved:', e.detail);
   });

4. 手動控制:
   formatter.toggleColumnVisibility('field-name', true);
   formatter.showNoDataRow('No data available');

5. 銷毀實例:
   formatter.destroy();
   // 或銷毀所有實例
   destroyAllTableFormatters();

配置選項:
- tableId: 表格ID
- tbodyId: tbody ID
- hideShowBtnId: 隱藏/顯示按鈕ID
- saveOrderBtnId: 保存按鈕ID
- resetOrderBtnId: 重置按鈕ID
- gridName: 網格名稱（用於後端保存）
- apiEndpoints: API端點配置
- fixedColumnsCount: 固定列數量
- stickyColumns: 是否啟用固定列
- scrollShadows: 是否啟用滾動陰影
*/