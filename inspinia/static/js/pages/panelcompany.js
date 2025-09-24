
// 管理search button状态的函数
function managePanelCompanySearchButton() {
    const billingTypeSelect = document.getElementById('billtype_rno');
    const searchButton = document.getElementById('panelcompany_search');
    const panelCompanyInput = document.getElementById('panelcompany_name');
    const panelCompanyRno = document.getElementById('panelcompany_rno');
    
    if (!billingTypeSelect || !searchButton || !panelCompanyInput || !panelCompanyRno) {
        return; // 如果元素不存在，直接返回
    }
    
    // 检查billing type
    const selectedValue = billingTypeSelect.value;
    const selectedText = billingTypeSelect.options[billingTypeSelect.selectedIndex].text;
    
    // 如果是CASH PATIENT，禁用搜索按钮和输入框
    if (selectedText === 'CASH PATIENT' || selectedValue === '1') {
        searchButton.disabled = true;
        panelCompanyInput.readonly = true;
        panelCompanyRno .readonly = true;
        panelCompanyInput.placeholder = 'Not applicable for cash patients';
    } else {
        searchButton.disabled = false;

        panelCompanyInput.placeholder = 'Click search button to Search Panel Company';
    }
}

function showPanelCompanySelector() {
    console.log('Triggering existing panel company modal');
    
    // 直接显示已存在的模态框
    const modal = new bootstrap.Modal(document.getElementById('panelCompanyModal'));
    modal.show();
}

const tbody = document.querySelector('#panelcomp-list-table tbody');
const paginationContainer = document.getElementById('panelcompany-paginationContainer');
let currentPage = 1;
const pageSize = 10; // 默认每页条数

// **修复：提交搜索事件处理**
document.addEventListener('DOMContentLoaded', function() {
    // 监听billing type变化
    const billingTypeSelect = document.getElementById('billtype_rno');
    if (billingTypeSelect) {
        billingTypeSelect.addEventListener('change', managePanelCompanySearchButton);
        // 初始化状态
        managePanelCompanySearchButton();
    }
    
    // 监听主页面的search button点击
    const searchButton = document.getElementById('panelcompany_search');
    if (searchButton) {
        searchButton.addEventListener('click', function(e) {
            e.preventDefault();
            if (!this.disabled) {
                showPanelCompanySelector();
            }
        });
    }
    
    // **关键修复：监听模态框内的表单提交**
    const panelSearchForm = document.getElementById('panelcompany_search_filter');
    if (panelSearchForm) {
        panelSearchForm.addEventListener('submit', function(e) {
            e.preventDefault(); // 防止页面刷新
            currentPage = 1; // 重置到第一页
            fetchPanelCompanies();
        });
    }
    
   
    
});

// 获取数据并渲染表格
function fetchPanelCompanies() {
    const form = document.getElementById('panelcompany_search_filter');
    const formData = new FormData(form);
    let params = new URLSearchParams(formData);
    params.append('page', currentPage);
    params.append('page_size', pageSize);

    fetch(`/api/customers/panel-company-list/?${params.toString()}`)
        .then(res => res.json())
        .then(data => {
            renderTable(data.data);
            renderPagination(data.page, data.page_size, data.total);
        })
        .catch(err => console.error('Error fetching panel companies:', err));
}

// 渲染表格
function renderTable(data) {
    tbody.innerHTML = ''; // 清空旧数据
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No data found</td></tr>';
        return;
    }

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${(currentPage - 1) * pageSize + index + 1}</td>
            <td>${row.branchname || ''}</td>
            <td>${row.pcompany_no || ''}</td>
            <td>${row.pcompanyname || ''}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="handleSelect('${row.panelcomp_rno}', '${row.pcompanyname}')">
                    Select
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 优化后的分页渲染函数
function renderPagination(page, pageSize, total) {
    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) return;

    let html = `<nav><ul class="pagination justify-content-center">`;

    // 上一页
    html += `
        <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="gotoPage(${page - 1});return false;">Previous</a>
        </li>
    `;

    // 智能分页显示逻辑
    let startPage, endPage;
    const maxVisiblePages = 5; // 最多显示5个页码
    
    if (totalPages <= maxVisiblePages) {
        // 总页数不超过最大显示数，显示所有页码
        startPage = 1;
        endPage = totalPages;
    } else {
        // 总页数超过最大显示数，需要智能显示
        if (page <= Math.ceil(maxVisiblePages / 2)) {
            // 当前页在前面，显示前面的页码
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (page >= totalPages - Math.floor(maxVisiblePages / 2)) {
            // 当前页在后面，显示后面的页码
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            // 当前页在中间，以当前页为中心显示
            startPage = page - Math.floor(maxVisiblePages / 2);
            endPage = page + Math.floor(maxVisiblePages / 2);
        }
    }

    // 如果不是从第一页开始，显示第一页和省略号
    if (startPage > 1) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="gotoPage(1);return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // 显示页码范围
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="gotoPage(${i});return false;">${i}</a>
            </li>
        `;
    }

    // 如果不是到最后一页结束，显示省略号和最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        html += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="gotoPage(${totalPages});return false;">${totalPages}</a>
            </li>
        `;
    }

    // 下一页
    html += `
        <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="gotoPage(${page + 1});return false;">Next</a>
        </li>
    `;

    html += `</ul></nav>`;

    paginationContainer.innerHTML = html;
}

// 切换页面
function gotoPage(page) {
    currentPage = page;
    fetchPanelCompanies();
}

// 点击 Select 按钮后的功能（修复后）
function handleSelect(panelcomp_rno, pcompanyname) {
    const panelcompanyrno = document.getElementById('panelcompany_rno');
    const panelcompanyname = document.getElementById('panelcompany_name');

    // 设置选中的值
    panelcompanyrno.value = panelcomp_rno;  
    panelcompanyname.value = pcompanyname;
    
    // 关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('panelCompanyModal'));
    if (modal) {
        modal.hide();
    }
}