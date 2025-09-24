let tableFormatter = null;
let ClientdataTable = null; // DataTable 實例

async function loadClientdata(filters = {}) {
    const tableElement = document.getElementById('horizontal-scroll');
    const tbody = document.getElementById('ClientdataTableBody');
    tbody.innerHTML = `<tr><td class="text-center">Loading...</td></tr>`;

    try {
        // 1. 初始化表格格式化器
        if (!tableFormatter) {
            initializeTableFormatter();
        }

        // 2. 套用儲存的表頭順序
        await tableFormatter.applySavedOrder();

        // 3. 構建 API URL
        const url = new URL('/api/corporate/get_panel_company/', window.location.origin);
        if (filters.com_name?.trim()) {
            url.searchParams.append('com_name', filters.com_name.trim());
        }

        console.log('發送請求到:', url.toString());

        // 4. 呼叫後端
        const response = await fetch(url.toString(), {
            headers: {
                "Accept": "application/json",
            }
        });

        // 5. 檢查 HTTP 狀態
        if (!response.ok) {
            const rawText = await response.text();
            console.error(`HTTP 錯誤 (${response.status}):`, rawText);
            tableFormatter.showNoDataRow(`HTTP ${response.status}: ${rawText}`, "error-row");
            return;
        }

        // 6. 解析 JSON
        let result;
        try {
            result = await response.json();
        } catch (jsonError) {
            const rawText = await response.clone().text();
            console.error("JSON 解析錯誤，原始回應:", rawText);
            tableFormatter.showNoDataRow("API 回傳非 JSON 格式", "error-row");
            return;
        }

        console.log("API 回傳結果:", result);

        // 7. 檢查 API 格式
        if (!result || result.success === false) {
            console.error("API返回錯誤:", result?.error || result?.message || "未知錯誤");
            tableFormatter.showNoDataRow(
                `API Error: ${result?.error || result?.message || "Unknown error"}`,
                "error-row"
            );
            return;
        }

        const data = result.data;
        if (!Array.isArray(data) || data.length === 0) {
            tableFormatter.showNoDataRow("No results found", "no-data-row");
            return;
        }

        console.log(`接收到 ${data.length} 筆資料`); // 調試日誌

        // 先銷毀舊的 DataTable
        if (ClientdataTable) {
            ClientdataTable.clear().destroy();
            ClientdataTable = null;
        }
        
        // 清空 tbody
        tbody.innerHTML = '';

        // 讀取目前表頭順序
        const headerCells = document.querySelectorAll("#horizontal-scroll thead th");
        const currentOrder = Array.from(headerCells).map(th => ({
            field: th.dataset.field,
            title: th.textContent.trim()
        }));

        console.log('表頭順序:', currentOrder); // 調試日誌

        // 構建 DataTables 資料
        const tableData = data.map((row, index) => {
            return currentOrder.map(col => {
                const td = document.createElement('td');
                fillCellData(td, col.field, row, index);
                return td.innerHTML || td.textContent;
            });
        });

        console.log(`構建了 ${tableData.length} 行資料`); // 調試日誌

        // 獲取當前 lengthMenu 設置
        const lengthMenuSelect = document.getElementById('customLengthMenu');
        const currentPageLength = lengthMenuSelect ? parseInt(lengthMenuSelect.value) : 10;

        console.log(`當前每頁顯示: ${currentPageLength} 筆`); // 調試日誌

        // 初始化 DataTable
        ClientdataTable = $(tableElement).DataTable({
            data: tableData,
            columns: currentOrder.map(col => ({
                orderable: false,
                title: col.title  // ✅ 用 <th> 的文字當表頭名稱
            })),
            pageLength: currentPageLength,
            lengthMenu: [10, 25, 50, 100],
            destroy: true,
            
            // 🔑 關鍵配置 - 禁用所有內建 UI 控制項
            ordering: false,     // 禁用排序
            searching: false,    // 禁用搜索
            info: false,         // 禁用資訊顯示
            lengthChange: false, // 禁用每頁顯示數量選擇器
            paginate: false,     // 🔑 禁用內建分頁控制項
            paging: true,        // 保持分頁功能，但隱藏 UI
            dom: 't',
            processing: false,
            serverSide: false,
            language: {
                emptyTable: "No results found",
                lengthMenu: "Show _MENU_ entries",
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "No matching records found",
                paginate: {
                    first: "First",
                    last: "Last",
                    next: "Next",
                    previous: "Previous"
                }
            },
            drawCallback: function(settings) {
                console.log('DataTable drawCallback 被調用');
                updateCustomPaginationControls();
                
                // 直接檢查並重新應用隱藏欄位
                
                    const hiddenHeaders = document.querySelectorAll('#horizontal-scroll thead th[style*="display: none"]');
                    
                    hiddenHeaders.forEach(header => {
                        const field = header.dataset.field;
                        if (field) {
                            // 隱藏對應的 tbody 欄位
                            const bodyRows = document.querySelectorAll('#horizontal-scroll tbody tr');
                            const headerIndex = Array.from(header.parentNode.children).indexOf(header);
                            
                            bodyRows.forEach(row => {
                                if (row.children[headerIndex]) {
                                    row.children[headerIndex].style.display = 'none';
                                }
                            });
                        }
                    });
                    
                    // 重新調整表格格式
                    if (tableFormatter) {
                        tableFormatter.adjustColumnWidths();
                        tableFormatter.updateTableDisplay();
                    } // 稍微延遲確保 DOM 更新完成
            }
        });

        // 檢查 DataTable 資訊
        const info = ClientdataTable.page.info();
        console.log('DataTable 分頁資訊:', {
            page: info.page,
            pages: info.pages,
            start: info.start,
            end: info.end,
            length: info.length,
            recordsTotal: info.recordsTotal,
            recordsDisplay: info.recordsDisplay
        });

        // 手動觸發第一次更新
        setTimeout(() => {
            updateCustomPaginationControls();
        }, 100);

        // 更新統計資訊
        updateResultsInfo(result);

        // 調整表格格式
        if (tableFormatter) {
            tableFormatter.adjustColumnWidths();
            tableFormatter.updateTableDisplay();
        }

        console.log(`成功載入 ${data.length} 筆公司資料，並初始化 DataTable`);

    } catch (error) {
        console.error("Error loading Clientdata:", error);
        if (tableFormatter) {
            tableFormatter.showNoDataRow(`Error loading data: ${error.message}`, "error-row");
        }
    }
}

function updateCustomPaginationControls() {
    console.log('更新自定義分頁控制項...'); // 調試日誌
    
    if (!ClientdataTable) {
        console.log('ClientdataTable 不存在');
        return;
    }

    try {
        const info = ClientdataTable.page.info();
        console.log('分頁資訊:', info); // 調試日誌
        
        // 更新資訊顯示
        const customDataInfo = document.getElementById('customDataInfo');
        if (customDataInfo) {
            const infoText = `Showing ${info.start + 1} to ${info.end} of ${info.recordsTotal} entries`;
            customDataInfo.textContent = infoText;
            console.log('Updated info display:', infoText);
        }

        // 更新分頁資訊
        const currentPageInput = document.getElementById('currentPageInput');
        const totalPagesDisplay = document.getElementById('totalPagesDisplay');
        
        if (currentPageInput) {
            currentPageInput.value = info.page + 1;
            currentPageInput.max = info.pages || 1;
            console.log(`Current page: ${info.page + 1}, Total pages: ${info.pages}`);
        }
        
        if (totalPagesDisplay) {
            totalPagesDisplay.textContent = info.pages || 1;
        }

        // 更新按鈕狀態
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');

        const isFirstPage = info.page === 0;
        const isLastPage = info.page === (info.pages - 1) || info.pages <= 1;

        if (firstPageBtn) firstPageBtn.disabled = isFirstPage;
        if (prevPageBtn) prevPageBtn.disabled = isFirstPage;
        if (nextPageBtn) nextPageBtn.disabled = isLastPage;
        if (lastPageBtn) lastPageBtn.disabled = isLastPage;

        console.log(`按鈕狀態 - 首頁/上一頁禁用: ${isFirstPage}, 下一頁/最後頁禁用: ${isLastPage}`);

    } catch (error) {
        console.error('更新分頁控制項時出錯:', error);
    }
}

// 新增：初始化自定義分頁控制項事件
function initializeCustomPaginationControls() {
    console.log('初始化自定義分頁控制項...');

    // Length Menu 變更事件
    const customLengthMenu = document.getElementById('customLengthMenu');
    if (customLengthMenu) {
        customLengthMenu.addEventListener('change', function() {
            console.log(`Length Menu 變更為: ${this.value}`);
            if (!ClientdataTable) {
                console.log('ClientdataTable 不存在，無法變更每頁顯示數量');
                return;
            }
            
            const newLength = parseInt(this.value);
            ClientdataTable.page.len(newLength).draw();
            
            // 稍微延遲更新控制項，確保 DataTable 已完成重繪
            setTimeout(() => {
                updateCustomPaginationControls();
            }, 50);
        });
    }

    // 分頁按鈕事件
    const firstPageBtn = document.getElementById('firstPageBtn');
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', function() {
            console.log('點擊首頁按鈕');
            if (!ClientdataTable) return;
            ClientdataTable.page('first').draw('page');
            updateCustomPaginationControls();
        });
    }

    const prevPageBtn = document.getElementById('prevPageBtn');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            console.log('點擊上一頁按鈕');
            if (!ClientdataTable) return;
            ClientdataTable.page('previous').draw('page');
            updateCustomPaginationControls();
        });
    }

    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            console.log('點擊下一頁按鈕');
            if (!ClientdataTable) return;
            ClientdataTable.page('next').draw('page');
            updateCustomPaginationControls();
        });
    }

    const lastPageBtn = document.getElementById('lastPageBtn');
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', function() {
            console.log('點擊最後頁按鈕');
            if (!ClientdataTable) return;
            ClientdataTable.page('last').draw('page');
            updateCustomPaginationControls();
        });
    }

    // 頁碼輸入框事件
    const currentPageInput = document.getElementById('currentPageInput');
    if (currentPageInput) {
        const handlePageInput = function() {
            if (!ClientdataTable) return;
            
            const targetPage = parseInt(this.value) - 1;
            const info = ClientdataTable.page.info();
            
            console.log(`嘗試跳轉到第 ${targetPage + 1} 頁`);
            
            if (targetPage >= 0 && targetPage < info.pages) {
                ClientdataTable.page(targetPage).draw('page');
                updateCustomPaginationControls();
            } else {
                console.log('頁碼超出範圍，恢復原值');
                this.value = info.page + 1;
            }
        };

        currentPageInput.addEventListener('change', handlePageInput);
        currentPageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handlePageInput.call(this);
            }
        });
    }

    console.log('自定義分頁控制項初始化完成');
}


function renderCheckboxBox(value) {
  const isChecked = value === 1 || value === "1" || value === true;
  return `
    <div style="display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border:1px solid #000; border-radius:3px;">
      ${isChecked ? "✔" : ""}
    </div>`;
}

function fillCellData(td, field, row, index) {
    switch (field) {
        case "index":
            td.textContent = index + 1;
            break;
        case "function":
            td.innerHTML = createActionButtons(row);
            break;
        case "branch":
            td.textContent = row.branch || "-";
            break;
        case "reference":
            td.textContent = row.reference || "-";
            break;
        case "group_com_name":
            td.textContent = row.group_com_name || "-";
            break;
        case "opendate":
            td.textContent = formatDate(row.opendate) || "-";
            break;
        case "corporate_AC":
            td.textContent = row.corporate_AC || "-";
            break;
        case "corporate_name":
            td.textContent = row.corporate_name || "-";
            break;
        case "Einvoice":
            td.innerHTML = renderCheckboxBox(row.Einvoice);
            break;
        case "active":
            td.innerHTML = renderCheckboxBox(row.active);
            break;
        case "center_process":
            td.innerHTML = renderCheckboxBox(row.center_process);
            break;
        case "tin":
            td.textContent = row.tin || "-";
            break;
        case "com_reg_no":
            td.textContent = row.com_reg_no || "-";
            break;
        case "portal_corp":
            td.textContent = row.portal_corp || "-";
            break;
        case "contact_person":
            td.textContent = row.contact_person || "-";
            break;
        case "default_ceiling":
            td.textContent = row.default_ceiling || "-";
            break;
        case "default_con":
            td.textContent = row.default_con || "-";
            break;
        case "stock_item":
            td.textContent = row.stock_item || "-";
            break;
        case "svr_item":
            td.textContent = row.svr_item || "-";
            break;
        case "option1":
            td.textContent = row.option1 || "-";
            break;
        case "option2":
            td.textContent = row.option2 || "-";
            break;
        case "address":
            td.textContent = row.address || "-";
            break;

        default:
            td.title = row[field] || "-";
            td.textContent = row[field] || "-";
    }
}

function createActionButtons(row) {
    return `
        <div class="action-buttons d-flex gap-1 flex-nowrap">
            <button class="btn btn-sm btn-info" onclick="handleView('${row.branch_rno}', '${row.reference}')" title="View">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="handleEdit('${row.branch_rno}', '${row.reference}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleDelete('${row.branch_rno}', '${row.reference}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
}

function initializeTableFormatter() {
    // 創建表格格式化器實例
    tableFormatter = createTableFormatter('horizontal-scroll', {
        tbodyId: 'ClientdataTableBody',
        hideShowBtnId: 'HideAndShowBtn',
        saveOrderBtnId: 'saveOrderBtn',
        resetOrderBtnId: 'resetOrderBtn',
        gridName: 'clientdatapage',
        fixedColumnsCount: 0,
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

function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-MY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

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

// ========== 過濾功能 ==========

function initializeFilterForm() {
    const filterForm = document.getElementById('filterform');
    
    if (filterForm) {
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault(); // 防止表單默認提交
            
            // 獲取表單數據
            const formData = new FormData(filterForm);
            const filters = {
                com_name: formData.get('com_name')
            };
            
            console.log('應用過濾條件:', filters);
            
            // 重新載入數據並應用過濾條件
            loadClientdata(filters);
        });
        
        console.log('過濾表單事件監聽器已設置');
    } else {
        console.warn('找不到過濾表單元素');
    }
    
    // 也可以添加 Enter 鍵支持
    const comNameInput = document.getElementById('com_name');
    if (comNameInput) {
        comNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                filterForm.dispatchEvent(new Event('submit'));
            }
        });
    }
}

function clearFilters() {
    // 清空表單
    const filterForm = document.getElementById('filterform');
    if (filterForm) {
        filterForm.reset();
    }
    
    // 重新載入所有數據
    loadClientdata();
}

// ========== 操作按鈕事件處理函數 ==========

let SESSION = {}; // 全局變數，存放 session

async function initSession() {
    try {
        const res = await fetch('/corporate/client-data/');
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        SESSION = data;
        console.log("Session 檢查成功，狀態碼:", res.status);
    } catch (err) {
        console.error("載入 Session 失敗", err);
    }
}


// 頁面載入時執行
window.addEventListener('DOMContentLoaded', initSession);

function handleView(branch_rno, reference) {
    ViewClientdata(branch_rno, reference);
}

window.ViewClientdata = function(branch_rno, reference) {
    if (!branch_rno || !reference) {
        alert('Missing customer information. Cannot edit.');
        return;
    }
    const url = `/corporate/add-client/?mode=view&branch=${encodeURIComponent(branch_rno)}&reference=${encodeURIComponent(reference)}`;
    window.location.href = url;
};

function handleEdit(branch_rno, reference) {
    if (Number(branch_rno) !== Number(SESSION.branch_rno)) {
        alert("沒有權限編制此資料!");
        return;
    }
    editClientdata(branch_rno, reference);
}

window.editClientdata = function(branch_rno, reference) {
    if (!branch_rno || !reference) {
        alert('Missing customer information. Cannot edit.');
        return;
    }
    const url = `/corporate/add-client/?mode=edit&branch=${encodeURIComponent(branch_rno)}&reference=${encodeURIComponent(reference)}`;
    window.location.href = url;
};

function handleDelete(branch_rno, reference) {
    if (Number(branch_rno) !== Number(SESSION.branch_rno)) {
        alert("沒有權限刪除此資料！");
        return;
    }
    if (confirm('確定要刪除此預約嗎？')) {
        deleteAppointment(branch_rno, reference);
    }
    
}


function deleteAppointment(branch_rno, reference) {
    $.ajax({
        url: "/api/corporate/delete_panel_company/",
        type: "POST",   
        contentType: "application/json",
        data: JSON.stringify({
            privatebranch_rno: branch_rno,
            panelcomp_rno: reference
        }),
        success: function(response) {
            if (response.success === true) {
                alert("刪除成功！");
                // 刷新頁面或 table
                location.reload();
            } else {
                alert("刪除失敗: " + response.message);
            }
        },
        error: function(xhr, status, error) {
            alert("刪除失敗，請稍後再試！");
            console.error("Error:", error, xhr.responseText);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('頁面載入完成，開始初始化...');
    const addBtn = document.getElementById("addCompanyBtn");

    if (addBtn) {
        addBtn.addEventListener("click", function () {
            window.location.href = "/corporate/add-client";
        });
    }
    
    // 1. 初始化過濾表單
    initializeFilterForm();
    
    // 2. 初始化表格格式化器
    initializeTableFormatter();
    
    // 3. 初始化自定義分頁控制項 - 新增這一行
    initializeCustomPaginationControls();
    
    // 4. 載入初始數據（無過濾條件）
    loadClientdata();
    
    console.log('初始化完成');
});

// 更新 window.appointmentUtils 導出
window.appointmentUtils = {
    loadClientdata,
    handleView,
    handleEdit,
    handleDelete,
    formatDate,
    updateResultsInfo,
    initializeTableFormatter,
    clearFilters,
    updateCustomPaginationControls, // 新增
    initializeCustomPaginationControls, // 新增
    tableFormatter
};