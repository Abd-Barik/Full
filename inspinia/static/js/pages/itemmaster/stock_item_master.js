// Pagination state
let currentPage = 1;
let pageSize = 20;
let totalPages = 0;
let totalCount = 0;

function getFilterParams() {
    const form = document.getElementById('filterform');
    if (!form) return {};

    const formData = new FormData(form);
    const params = {};

    // 获取所有表单字段的值
    for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
            params[key] = value;
        }
    }

    // 获取状态复选框的值
    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const statusValues = Array.from(statusCheckboxes).map(cb => cb.value);
    if (statusValues.length > 0) {
        params['status'] = statusValues;
    }

    return params;
}
document.getElementById("addNewBtn").addEventListener("click", function (e) {
        e.preventDefault();
        const currentUrl = encodeURIComponent(window.location.href);
        
        window.location.href = `/itemmaster/stock_item_master_form`;
    });
async function loadstockitem(page = 1) {
    const tbody = document.getElementById('stock_item_master_table_body');
    tbody.innerHTML = `<tr><td colspan="100%" class="text-center"><div class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div></td></tr>`;

    try {
        const filterParams = getFilterParams();
        const queryParams = new URLSearchParams();
        
        // Add pagination parameters
        queryParams.append('page', page);
        queryParams.append('page_size', pageSize);
        console.log(filterParams);
        Object.entries(filterParams).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, v));
            } else {
                queryParams.append(key, value);
            }
        });

        // 发送请求到库存项目接口
        const response = await fetch(`/api/itemmaster/stock_item_master_list/?${queryParams.toString()}`);
        const result = await response.json();

        if (!response.ok) {
            console.error("API返回错误:", result.error || result.message);
            showNoDataRow(`API Error: ${result.error || result.message}`, "error-row");
            return;
        }

        // Update pagination state
        currentPage = result.page;
        totalPages = result.total_pages;
        totalCount = result.total;
        
        const data = result.results;
        tbody.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            showNoDataRow("No results found", "no-data-row");
            updatePaginationControls();
            updateResultsInfo({ total: 0, page: currentPage, page_size: pageSize });
            return;
        }

        // 读取目前表头顺序 (用 data-field)
        const headerCells = document.querySelectorAll("#stock_item_master_table thead th");
        const currentOrder = Array.from(headerCells).map(th => th.dataset.field);

        // 按照当前顺序产生数据行
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            const globalIndex = (currentPage - 1) * pageSize + index + 1;

            currentOrder.forEach(field => {
                const td = document.createElement('td');
                td.classList.add("text-nowrap");

                switch (field) {
                    case "index":
                        td.textContent = globalIndex;
                        break;
                    case "action":
                        td.innerHTML = `
                            <div class="action-buttons d-flex gap-1 ">
                            <button class="btn btn-sm btn-outline-info" onclick="viewStockItem(${row.item_rno})" title="View"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-outline-primary" onclick="editStockItem(${row.item_rno})" title="Edit"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStockItem('${row.item_rno}', '${row.itemno}', '${row.itemname}')" title="Delete"><i class="fas fa-trash"></i></button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="onhandquantity(${row.item_rno})" title="On Hand Quantity"><i class="fas fa-box"></i></button>
                            </div>`;
                        break;
                    case "itemno":
                        td.title = row.itemno || "-";
                        td.textContent = row.itemno || "-";
                        break;
                    case "itemname":
                        td.title = row.itemname || "-";
                        td.textContent = row.itemname || "-";
                        break;
                    case "referenceno":
                        td.title = row.item_rno || "-";
                        td.textContent = row.item_rno || "-";
                        break;
                    case "branch":
                        td.textContent = row.branch || "-";
                        break;
                    case "Alternateitemno":
                        td.title = row.alternateitemno || "-";
                        td.textContent = row.alternateitemno || "-";
                        break;
                    case "active":
                        td.innerHTML = `<span class="badge ${row.isactive ? 'bg-success' : 'bg-secondary'}">
                                                            ${row.isactive ? 'Active' : 'Inactive'}
                                                        </span>`;
                        break;
                    case "billgroup":
                        td.textContent = row.billgroup || "-";
                        break;
                    case "uom":
                        td.textContent = row.uom || "-";
                        break;
                    case "price":
                        
                        td.textContent = formatCurrency(row.price) || "-";
                        break;
                    case "labelprint":
                        td.innerHTML = `<span class="badge ${row.labelprint  ? 'bg-success' : 'bg-secondary'}">${row.labelprint  ? 'Yes' : 'No'}</span>`;
                        break;
                    case "controldrug":
                        td.innerHTML = `<span class="badge ${row.controldrug  ? 'bg-success' : 'bg-secondary'}">${row.controldrug ? 'Yes' : 'No'}</span>`;
                        break;
                    case "taxableiterm":
                        td.innerHTML = `<span class="badge ${row.taxableiterm  ? 'bg-success' : 'bg-secondary'}">${row.taxableiterm ? 'Yes' : 'No'}</span>`;
                        break;
                    case "taxrate":
                        
                        td.textContent = row.taxrate ? row.taxrate + "%" : "-";
                        break;
                    case "s/n":
                        td.innerHTML = `<span class="badge ${row.serial_item  ? 'bg-success' : 'bg-secondary'}">${row.serial_item  ? 'Yes' : 'No'}</span>`;
                        break;
                    case "createdby":
                        td.textContent = row.createdby || "-";
                        break;
                    case "createdon":
                        td.textContent = formatDate(row.createdon) || "-";
                        break;
                    case "modifiedby":
                        td.textContent = row.modifiedby || "-";
                        break;
                    case "modifiedon":
                        td.textContent = formatDate(row.modifiedon) || "-";
                        break;
                    default:
                        td.title = row[field] || "-";
                        td.textContent = row[field] || "-";
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

       

        

        // Update pagination controls
        updatePaginationControls();

        // 显示结果统计
        updateResultsInfo({
            total: totalCount,
            page: currentPage,
            page_size: pageSize,
            total_pages: totalPages,
            current_count: data.length
        });

        console.log(`成功载入第 ${currentPage} 页，共 ${data.length} 笔库存项目数据`);

    } catch (error) {
        console.error("Error loading stock items:", error);
        showNoDataRow(`Error loading data: ${error.message}`, "error-row");
        updatePaginationControls();
    }
}

// Pagination control functions
function updatePaginationControls() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <nav aria-label="Stock items pagination">
            <ul class="pagination justify-content-center mb-0">
                <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
                    <button class="page-link" onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                </li>
    `;

    // Calculate page range to show
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <button class="page-link" onclick="goToPage(1)">1</button>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <button class="page-link" onclick="goToPage(${i})">${i}</button>
            </li>
        `;
    }

    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `
            <li class="page-item">
                <button class="page-link" onclick="goToPage(${totalPages})">${totalPages}</button>
            </li>
        `;
    }

    paginationHTML += `
                <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                    <button class="page-link" onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </li>
            </ul>
        </nav>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    loadstockitem(page);
}

function changePageSize(newPageSize) {
    pageSize = parseInt(newPageSize);
    currentPage = 1; // Reset to first page when changing page size
    loadstockitem(1);
}

// Enhanced results info function
function updateResultsInfo(result) {
    const resultsInfo = document.getElementById('results-info');
    if (!resultsInfo) return;

    if (!result || result.total === 0) {
        resultsInfo.textContent = 'No results found';
        return;
    }

    const startRecord = ((result.page - 1) * result.page_size) + 1;
    const endRecord = Math.min(startRecord + (result.current_count || result.page_size) - 1, result.total);
    
    resultsInfo.innerHTML = `
        Showing ${startRecord} to ${endRecord} of ${result.total} entries
        ${result.total_pages ? `(Page ${result.page} of ${result.total_pages})` : ''}
    `;
}

// Modified DOM ready event
document.addEventListener('DOMContentLoaded', function() {
    // 1. 首先设置默认过滤器值
    setDefaultFilters();
    
    // 2. 初始化过滤器表单事件
    initFilterForm();
    
    // 3. 初始化表格相关功能
    initializePaginationControls();
    
    // 4. 最后加载数据（会使用默认过滤器值）
    loadstockitem(1);
});

// Initialize pagination controls in the DOM
function initializePaginationControls() {
    // Add page size selector if it doesn't exist
    const pageSizeContainer = document.getElementById('page-size-container');
    if (pageSizeContainer && !pageSizeContainer.innerHTML.trim()) {
        pageSizeContainer.innerHTML = `
            <div class="d-flex align-items-center">
                <label for="pageSize" class="form-label me-2 mb-0">Show:</label>
                <select id="pageSize" class="form-select form-select-sm" style="width: auto;" onchange="changePageSize(this.value)">
                    <option value="10">10</option>
                    <option value="20" selected>20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                </select>
                <span class="ms-2">entries</span>
            </div>
        `;
    }
}

// Enhanced filter form initialization
function initFilterForm() {
    const form = document.getElementById('filterform');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        currentPage = 1; // Reset to first page when filtering
        loadstockitem(1);
    });

    // Add search input event listener for real-time search
    const searchInput = form.querySelector('input[name="search"]');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                loadstockitem(1);
            }, 500); // Debounce search
        });
    }

    // 绑定状态复选框变化事件
    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]');
    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateStatusDisplay();
            currentPage = 1; // Reset to first page when status changes
            loadstockitem(1);
        });
    });

    // Bind other form elements for automatic filtering
    const formElements = form.querySelectorAll('select, input[type="text"], input[type="date"]');
    formElements.forEach(element => {
        if (element.name !== 'search') { // Search has its own handler
            element.addEventListener('change', function() {
                currentPage = 1;
                loadstockitem(1);
            });
        }
    });

    // 初始化状态显示
    updateStatusDisplay();
}

// Keep existing functions unchanged
function updateStatusDisplay() {
    const form = document.getElementById('filterform');
    if (!form) return;

    const checkedBoxes = form.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedCount) {
        const count = checkedBoxes.length;
        selectedCount.textContent = `${count} Selected`;
    }

    const dropdownItems = form.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            if (checkbox.checked) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        }
    });
}

function showNoDataRow(message, rowClass = "no-data-row") {
    const tbody = document.getElementById("stock_item_master_table_body");
    tbody.innerHTML = "";

    const headerCells = document.querySelectorAll("#stock_item_master_table thead th");
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    
    td.classList.add("text-center", rowClass);
    td.setAttribute("colspan", headerCells.length);
    td.textContent = message;
    
    tr.appendChild(td);
    tbody.appendChild(tr);

    setTimeout(() => {
        adjustColumnWidths();
        calculateStickyColumnsWidth();
    }, 50);
}

function setDefaultFilters() {
    const form = document.getElementById('filterform');
    if (!form) return;

    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    const startDateInput = form.querySelector('input[name="start_date"]');
    const endDateInput = form.querySelector('input[name="end_date"]');
    
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = today;
    }
    if (endDateInput && !endDateInput.value) {
        endDateInput.value = today;
    }

    // Set default visit type
    const visitTypeSelect = form.querySelector('select[name="visittype"]');
    if (visitTypeSelect && !visitTypeSelect.value) {
        visitTypeSelect.value = 'O';
    }

    // Ensure all status checkboxes are checked by default
    const statusCheckboxes = form.querySelectorAll('input[type="checkbox"]');
    statusCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true;
        }
    });

    updateStatusDisplay();
}

// Keep all existing helper functions unchanged
function editStockItem(itemRno) {
    const url = `/itemmaster/stock_item_master_form/?item_rno=${encodeURIComponent(itemRno)}&mode=edit`;
    window.location.href = url;
}

function viewStockItem(itemRno) {
    const url = `/itemmaster/stock_item_master_form/?item_rno=${encodeURIComponent(itemRno)}&mode=view`;
    window.location.href = url;
}

function onhandquantity(itemRno) {
    const url = `/itemmaster/onhandquantity/${encodeURIComponent(itemRno)}/`;
    window.location.href = url;
}

function printStockItem(itemRno) {
    console.log('Print stock item:', itemRno);
}

function deleteStockItem(itemRno,itemno,itemname) {
 
    showSecureDeleteModal({
            item_rno: itemRno,
            itemno: itemno,
            itemname: itemname
        })

    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        confirmBtn.disabled = true;

        fetch('/api/itemmaster/stock_item_master_delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ item_rno: itemRno })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                // 这里刷新表格/移除行
                loadstockitem(currentPage);
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            } else {
                alert('删除失败: ' + data.message);
            }
        })
        .catch(error => {
            console.error('删除请求失败:', error);
        
        });
        
    });
}




function formatCurrency(amount) {
    if (!amount) return "0.00";
    return parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}