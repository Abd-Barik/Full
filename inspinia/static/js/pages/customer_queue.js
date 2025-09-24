/**
 * 簡化版預約管理系統範例
 * 展示如何使用 ReusableTableFormatter
 */

// ========== 全域變數 ==========
let tableFormatter = null; // 表格格式化器實例

// ========== 過濾器相關函數 ==========

// 获取过滤器参数
function getFilterParams() {
    const form = document.getElementById('filterform');
    if (!form) return {};

    const formData = new FormData(form);
    const params = {};

    for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
            params[key] = value;
        }
    }

    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const statusValues = Array.from(statusCheckboxes).map(cb => cb.value);
    if (statusValues.length > 0) {
        params['status'] = statusValues;
    }

    return params;
}

// 设置过滤器默认值
function setDefaultFilters() {
    const form = document.getElementById('filterform');
    if (!form) return;

    const today = new Date().toISOString().split('T')[0];
    const startDateInput = form.querySelector('input[name="start_date"]');
    const endDateInput = form.querySelector('input[name="end_date"]');
    
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = today;
    }
    if (endDateInput && !endDateInput.value) {
        endDateInput.value = today;
    }

    const visitTypeSelect = form.querySelector('select[name="visittype"]');
    if (visitTypeSelect && !visitTypeSelect.value) {
        visitTypeSelect.value = 'O';
    }

    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]');
    statusCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
        }
    });

    updateStatusDisplay();
}

// 更新状态选择器显示
function updateStatusDisplay() {
    const form = document.getElementById('filterform');
    if (!form) return;

    const checkedBoxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedCount) {
        const count = checkedBoxes.length;
        selectedCount.textContent = `${count} Selected`;
    }
}

// ========== 數據載入函數 ==========

// 主要的載入預約數據函數
async function loadAppointments() {
    const tbody = document.getElementById('appointmentsTableBody');
    tbody.innerHTML = `<tr><td colspan="37" class="text-center">Loading...</td></tr>`;

    try {
        // 1. 確保表格格式化器已初始化
        if (!tableFormatter) {
            initializeTableFormatter();
        }

        // 2. 先載入表格順序設定
        await tableFormatter.applySavedOrder();

        // 3. 獲取過濾器參數
        const filterParams = getFilterParams();
        
        // 4. 構建查詢參數
        const queryParams = new URLSearchParams();
        Object.entries(filterParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
            } else {
                queryParams.append(key, value);
            }
        });

        // 5. 發送請求
        const response = await fetch(`/api/customers/queue_list?${queryParams.toString()}`);
        const result = await response.json();

        if (!result.success) {
            console.error("API返回错误:", result.error || result.message);
            tableFormatter.showNoDataRow(`API Error: ${result.error || result.message}`, "error-row");
            return;
        }

        const data = result.data;
        tbody.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            tableFormatter.showNoDataRow("No results found", "no-data-row");
            return;
        }

        // 6. 讀取目前表頭順序
        const headerCells = document.querySelectorAll("#horizontal-scroll thead th");
        const currentOrder = Array.from(headerCells).map(th => th.dataset.field);

        // 7. 按照當前順序產生數據行
        data.forEach((row, index) => {
            const tr = document.createElement('tr');

            currentOrder.forEach(field => {
                const td = document.createElement('td');
                td.classList.add("text-nowrap");

                // 根據字段類型填充數據
                fillCellData(td, field, row, index);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        // 8. 數據載入完成後，調整表格格式
        tableFormatter.adjustColumnWidths();
        tableFormatter.updateTableDisplay();

        // 9. 顯示結果統計
        updateResultsInfo(result);

        console.log(`成功載入 ${data.length} 筆預約數據`);

    } catch (error) {
        console.error("Error loading appointments:", error);
        if (tableFormatter) {
            tableFormatter.showNoDataRow(`Error loading data: ${error.message}`, "error-row");
        }
    }
}

// 填充單元格數據的輔助函數
function fillCellData(td, field, row, index) {
    switch (field) {
        case "index":
            td.textContent = index + 1;
            break;
        case "action":
            td.innerHTML = createActionButtons(row.visit_rno || row.id);
            break;
        case "name":
            td.title = row.name || "-";
            td.textContent = row.name || "-";
            break;
        case "eInvoiceStatus":
            td.innerHTML = `<span class="badge ${getEInvoiceStatusClass(row.eInvoiceStatus)}">${row.eInvoiceStatus || '-'}</span>`;
            break;
        case "visitdate":
            td.textContent = formatDate(row.visitdate) || "-";
            break;
        case "gender":
            td.innerHTML = `<span class="badge ${row.gender === 'M' ? 'bg-primary' : 'bg-pink'}">${row.gender || '-'}</span>`;
            break;
        case "buydrug":
            td.innerHTML = `<span class="badge ${row.buydrug === 'Y' ? 'bg-success' : 'bg-secondary'}">${row.buydrug === 'Y' ? 'Y' : 'N'}</span>`;
            break;
        case "nettotalamount":
        case "netcashamount":
        case "netinvoiceamount":
        case "paidamount":
        case "cashamt":
        case "cardamt":
        case "chequeamt":
        case "mobileamt":
        case "onlineamt":
            td.classList.add("text-end");
            td.textContent = formatCurrency(row[field]) || "-";
            break;
        case "nextaptdate":
            td.textContent = formatDate(row.nextaptdate) || "-";
            break;
        case "cnwaiting_mins":
            td.textContent = row.cnwaiting_mins ? row.cnwaiting_mins + "m" : "-";
            break;
        case "eInvoiceSubmitted":
            td.innerHTML = `<span class="badge ${row.eInvoiceSubmitted === 'Y' ? 'bg-success' : 'bg-warning'}">${row.eInvoiceSubmitted === 'Y' ? 'Y' : 'N'}</span>`;
            break;
        case "isforeigner":
            td.innerHTML = `<span class="badge ${row.isforeigner || row.foreignerPT ? 'bg-info' : 'bg-secondary'}">${(row.isforeigner || row.foreignerPT) ? 'Y' : 'N'}</span>`;
            break;
        case "status":
            td.innerHTML = `<span class="badge ${getStatusBadgeClass(row.status)}">${row.status || 'N/A'}</span>`;
            break;
        default:
            td.title = row[field] || "-";
            td.textContent = row[field] || "-";
    }
}

// 創建操作按鈕
function createActionButtons(visitId) {
    return `
        <div class="action-buttons d-flex gap-1 flex-nowrap">
            <button class="btn btn-sm btn-primary" onclick="editAppointment(${visitId})" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-info" onclick="viewAppointment(${visitId})" title="View">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-success" onclick="printBill(${visitId})" title="Print">
                <i class="fas fa-print"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${visitId})" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
            <button class="btn btn-sm btn-light" onclick="morefunction(${visitId})" title="More">
                &#x22EE;
            </button>
        </div>`;
}

// ========== 表格格式化器初始化 ==========

function initializeTableFormatter() {
    // 創建表格格式化器實例
    tableFormatter = createTableFormatter('horizontal-scroll', {
        tbodyId: 'appointmentsTableBody',
        hideShowBtnId: 'HideAndShowBtn',
        saveOrderBtnId: 'saveOrderBtn',
        resetOrderBtnId: 'resetOrderBtn',
        gridName: 'mainpage',
        fixedColumnsCount: 3,
        stickyColumns: true,
        scrollShadows: true,
        apiEndpoints: {
            saveOrder: '/api/table/save-table-order/',
            getOrder: '/api/table/get-table-order/',
            deleteOrder: '/api/table/delete-table-order/'
        }
    });

    // 初始化表格格式化器
    tableFormatter.init();

    // 監聽保存成功事件
    document.addEventListener('tableFormatter:orderSaved', function(e) {
        console.log('表格順序已保存:', e.detail);
        // 這裡可以顯示成功訊息或執行其他操作
    });

    console.log('表格格式化器已初始化');
}

// ========== 過濾器初始化 ==========

function initFilterForm() {
    const form = document.getElementById('filterform');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        loadAppointments(); // 重新載入數據
    });

    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]');
    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateStatusDisplay);
    });

    updateStatusDisplay();
}

// ========== 輔助函數 ==========

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 格式化貨幣
function formatCurrency(amount) {
    if (!amount || amount === 0) return null;
    return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: 'MYR',
        minimumFractionDigits: 2
    }).format(amount);
}

// 獲取狀態徽章樣式
function getStatusBadgeClass(status) {
    switch (status?.toUpperCase()) {
        case 'COMPLETED':
            return 'bg-success';
        case 'PENDING':
            return 'bg-warning';
        case 'CANCELLED':
            return 'bg-danger';
        case 'IN_PROGRESS':
            return 'bg-primary';
        default:
            return 'bg-secondary';
    }
}

// 獲取電子發票狀態徽章樣式
function getEInvoiceStatusClass(status) {
    switch (status?.toUpperCase()) {
        case 'SUBMITTED':
        case 'APPROVED':
            return 'bg-success';
        case 'PENDING':
            return 'bg-warning';
        case 'REJECTED':
            return 'bg-danger';
        case 'PROCESSING':
            return 'bg-info';
        default:
            return 'bg-secondary';
    }
}

// 更新結果統計信息
function updateResultsInfo(result) {
    const pagination = result.pagination;
    if (pagination) {
        console.log(`顯示第 ${pagination.start_index}-${pagination.end_index} 條，共 ${pagination.total} 條記錄`);
        
        const statsElement = document.getElementById('results-stats');
        if (statsElement) {
            statsElement.textContent = `顯示第 ${pagination.start_index}-${pagination.end_index} 條，共 ${pagination.total} 條記錄`;
        }
    }
}

// ========== 操作按鈕事件處理函數 ==========

function editAppointment(visitId) {
    console.log("編輯預約 ID:", visitId);
    // 實現編輯邏輯
    // 例如: 打開編輯模態框
    if (typeof $ !== 'undefined') {
        $('#editAppointmentModal').modal('show');
    }
    loadAppointmentForEdit(visitId);
}

function viewAppointment(visitId) {
    console.log("查看預約 ID:", visitId);
    // 實現查看邏輯
    if (typeof $ !== 'undefined') {
        $('#viewAppointmentModal').modal('show');
    }
    loadAppointmentDetails(visitId);
}

function printBill(visitId) {
    console.log("列印帳單 ID:", visitId);
    window.open(`/api/appointments/${visitId}/print-bill/`, '_blank');
}

function deleteAppointment(visitId) {
    console.log("刪除預約 ID:", visitId);
    if (confirm('確定要刪除此預約嗎？')) {
        deleteAppointmentConfirmed(visitId);
    }
}

function morefunction(visitId) {
    // 實現更多功能的下拉選單
    console.log("更多功能 ID:", visitId);
    // 這裡可以實現下拉選單邏輯
}

// 載入預約詳情用於編輯（示例）
async function loadAppointmentForEdit(visitId) {
    try {
        const response = await fetch(`/api/appointments/${visitId}/`);
        const data = await response.json();
        // 填充編輯表單
        console.log('載入編輯數據:', data);
    } catch (error) {
        console.error('載入編輯數據失敗:', error);
    }
}

// 載入預約詳情用於查看（示例）
async function loadAppointmentDetails(visitId) {
    try {
        const response = await fetch(`/api/appointments/${visitId}/`);
        const data = await response.json();
        // 顯示詳情
        console.log('載入詳情數據:', data);
    } catch (error) {
        console.error('載入詳情數據失敗:', error);
    }
}

// 確認刪除預約
async function deleteAppointmentConfirmed(visitId) {
    try {
        const response = await fetch(`/api/appointments/${visitId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            }
        });

        if (response.ok) {
            alert('預約已成功刪除');
            loadAppointments(); // 重新載入數據
        } else {
            alert('刪除預約時發生錯誤');
        }
    } catch (error) {
        console.error('刪除預約錯誤:', error);
        alert('刪除預約時發生錯誤');
    }
}

// 獲取CSRF令牌
function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           getCookie('csrftoken') || '';
}

// 獲取Cookie
function getCookie(name) {
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

// ========== 頁面初始化 ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('頁面載入完成，開始初始化...');
    
    // 1. 設置默認過濾器值
    setDefaultFilters();
    
    // 2. 初始化過濾器表單事件
    initFilterForm();
    
    // 3. 初始化表格格式化器
    initializeTableFormatter();
    
    // 4. 載入數據
    loadAppointments();
    
    console.log('初始化完成');
});

// ========== 導出函數供外部使用 ==========
window.appointmentUtils = {
    loadAppointments,
    editAppointment,
    viewAppointment,
    printBill,
    deleteAppointment,
    morefunction,
    formatDate,
    formatCurrency,
    getStatusBadgeClass,
    getEInvoiceStatusClass,
    setDefaultFilters,
    getFilterParams,
    updateStatusDisplay,
    updateResultsInfo,
    getCsrfToken,
    getCookie,
    initializeTableFormatter,
    tableFormatter // 導出表格格式化器實例
};