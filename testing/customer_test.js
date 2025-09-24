document.addEventListener("DOMContentLoaded", function () {
    var table = null;
    var allData = []; // 存儲所有數據
    var isDataLoaded = false;
    var columnDefinitions = []; // 存儲列定義
    var availableFields = []; // 存儲所有可用字段
    var selectedFields = []; // 存儲用戶選擇要顯示的字段

    // 預定義字段配置
    var fieldConfig = {
        'clinic_id': { title: 'Clinic ID', default: true },
        'clinic_name': { title: 'Clinic Name', default: true },
        'branch_name': { title: 'Branch Name', default: true },
        'branch_company': { title: 'Branch Company', default: false },
        'branch_rno': { title: 'Branch Registration No', default: false },
        'address': { title: 'Address', default: true },
        'phone': { title: 'Phone', default: true },
        'email': { title: 'Email', default: false },
        'created_at': { title: 'Created At', default: false }
    };

    // 格式化列名 - 將API字段名轉換為顯示標題
    function formatColumnTitle(fieldName) {
        // 如果有預定義的標題，使用預定義的
        if (fieldConfig[fieldName]) {
            return fieldConfig[fieldName].title;
        }
        
        // 否則使用默認格式化
        return fieldName
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .trim();
    }

    // 根據API數據動態生成列定義
    function generateColumnDefinitions(data) {
        if (!data || data.length === 0) {
            return [];
        }

        const firstRow = data[0];
        const columns = [];

        Object.keys(firstRow).forEach((key, index) => {
            columns.push({
                data: key,
                title: formatColumnTitle(key),
                visible: true
            });
        });

        return columns;
    }

    // 生成字段選擇器
    function generateFieldSelector() {
        const fieldSelector = document.getElementById('fieldSelector');
        if (!fieldSelector) return;

        fieldSelector.innerHTML = '<h6>選擇要顯示的字段:</h6>';
        
        Object.keys(fieldConfig).forEach(fieldName => {
            const div = document.createElement('div');
            div.className = 'form-check form-check-inline';
            div.innerHTML = `
                <input class="form-check-input field-selector" type="checkbox" 
                       value="${fieldName}" id="field_${fieldName}" 
                       ${fieldConfig[fieldName].default ? 'checked' : ''}>
                <label class="form-check-label" for="field_${fieldName}">
                    ${fieldConfig[fieldName].title}
                </label>
            `;
            fieldSelector.appendChild(div);
        });

        // 綁定字段選擇事件
        document.querySelectorAll('.field-selector').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedFields);
        });

        // 初始化選中的字段
        updateSelectedFields();
    }

    // 更新選中的字段
    function updateSelectedFields() {
        selectedFields = [];
        document.querySelectorAll('.field-selector:checked').forEach(checkbox => {
            selectedFields.push(checkbox.value);
        });
        console.log('Selected fields:', selectedFields);
    }

    // 動態生成表頭HTML
    function generateTableHeader(columns) {
        const headerRow = document.getElementById('tableHeader');
        headerRow.innerHTML = '';

        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title;
            headerRow.appendChild(th);
        });
    }

    // 動態生成列控制選項
    function generateColumnToggleOptions(columns) {
        const toggleList = document.getElementById('columnToggleList');
        if (!toggleList) return;
        
        toggleList.innerHTML = '';

        columns.forEach((column, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="form-check">
                    <input class="form-check-input column-toggle" type="checkbox" 
                           value="${index}" id="col${index}" checked>
                    <label class="form-check-label" for="col${index}">${column.title}</label>
                </div>
            `;
            toggleList.appendChild(li);
        });

        // 重新綁定事件監聽器
        bindColumnToggleEvents();
    }

    // 綁定列控制事件
    function bindColumnToggleEvents() {
        document.querySelectorAll('.column-toggle').forEach(function (checkbox) {
            checkbox.addEventListener('change', function () {
                const colIndex = parseInt(this.value);
                if (table) {
                    table.column(colIndex).visible(this.checked);
                    
                    const searchInputCell = document.querySelector(`.search-input-cell[data-column="${colIndex}"]`);
                    if (searchInputCell) {
                        searchInputCell.style.display = this.checked ? '' : 'none';
                    }
                }
            });
        });
    }

    // 初始化空表格（僅顯示表頭和搜索行）
    function initializeEmptyTableWithHeaders() {
        if ($.fn.DataTable.isDataTable('#column-search-data')) {
            $('#column-search-data').DataTable().destroy();
        }

        $('.column-search-input-bar').remove();

        table = $('#column-search-data').DataTable({
            processing: true,
            serverSide: false,
            data: [],
            columns: columnDefinitions,
            paging: false,
            info: false,
            initComplete: function () {
                $('.column-search-input-bar').remove();
                
                var searchRow = $('<tr class="column-search-input-bar"></tr>');
                
                this.api().columns().every(function (index) {
                    var that = this;
                    var columnTitle = columnDefinitions[index] ? columnDefinitions[index].title : 'Column ' + (index + 1);
                    
                    var searchInput = $('<th class="search-input-cell" data-column="' + index + '"><input type="text" placeholder="Search ' + columnTitle + '" class="form-control form-control-sm bg-light-subtle border-light"></th>');
                    searchRow.append(searchInput);
                    
                    $('input', searchInput).on('keyup change clear', function () {
                        if (that.search() !== this.value) {
                            that.search(this.value).draw();
                        }
                    });
                });
                
                $(this.api().table().header()).append(searchRow);
            }
        });
    }

    // 加載數據並準備表頭
    function loadDataAndPrepareHeaders() {
        if (isDataLoaded) {
            showEmptyTableWithHeaders();
            return;
        }

        // 構建API URL，包含選中的字段
        var apiUrl = "/api/clinic/";
        if (selectedFields.length > 0) {
            apiUrl += "?fields=" + selectedFields.join(',');
        }

        $.ajax({
            url: apiUrl,
            type: "GET",
            success: function(response) {
                allData = response.data || response;
                availableFields = response.available_fields || Object.keys(fieldConfig);
                isDataLoaded = true;
                
                // 根據數據生成列定義
                columnDefinitions = generateColumnDefinitions(allData);
                
                // 動態生成表頭
                generateTableHeader(columnDefinitions);
                
                // 動態生成列控制選項
                generateColumnToggleOptions(columnDefinitions);
                
                // 顯示表格但不填充數據
                showEmptyTableWithHeaders();
                
                console.log('Data loaded and headers prepared:', allData.length + ' records available');
                console.log('Generated columns:', columnDefinitions.map(col => col.title));
                console.log('Displayed fields:', response.displayed_fields);
            },
            error: function(xhr, status, error) {
                console.error('Failed to load data:', error);
                alert('Failed to load data. Please try again.');
            }
        });
    }

    // 顯示空表格（只有表頭和搜索行）
    function showEmptyTableWithHeaders() {
        document.getElementById('initialMessage').style.display = 'none';
        document.getElementById('column-search-data').style.display = 'table';
        initializeEmptyTableWithHeaders();
    }

    // 填充表格數據
    function populateTableWithData(searchValue = '') {
        if (!table || !isDataLoaded) {
            console.log('Table or data not ready');
            return;
        }

        table.page.len(10).draw();
        $(table.table().container()).find('.dataTables_info, .dataTables_paginate').show();
        
        var filteredData = allData;
        if (searchValue && searchValue.trim() !== '') {
            filteredData = allData.filter(function(item) {
                return Object.values(item).some(function(value) {
                    return String(value).toLowerCase().includes(searchValue.toLowerCase());
                });
            });
        }
        
        table.clear();
        table.rows.add(filteredData).draw();
        console.log('Table populated with ' + filteredData.length + ' records');
    }

    // 重新加載數據（當字段選擇改變時）
    function reloadWithSelectedFields() {
        isDataLoaded = false; // 重置加載狀態
        allData = [];
        if (table) {
            table.destroy();
            table = null;
        }
        loadDataAndPrepareHeaders();
    }

    // 全局搜索功能
    document.getElementById('searchButton').addEventListener('click', function() {
        var searchValue = document.getElementById('globalSearch').value.trim();
        
        if (!isDataLoaded) {
            loadDataAndPrepareHeaders();
            
            var checkDataLoaded = setInterval(function() {
                if (isDataLoaded && columnDefinitions.length > 0 && table) {
                    clearInterval(checkDataLoaded);
                    populateTableWithData(searchValue);
                }
            }, 100);
        } else if (!table) {
            showEmptyTableWithHeaders();
            setTimeout(function() {
                populateTableWithData(searchValue);
            }, 100);
        } else {
            populateTableWithData(searchValue);
        }
        
        console.log(searchValue === '' ? 'Showing all data' : 'Searching for: ' + searchValue);
    });

    // 支持 Enter 鍵搜索
    document.getElementById('globalSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('searchButton').click();
        }
    });

    // 添加刷新按鈕事件（當字段選擇改變時重新加載）
    document.getElementById('refreshFieldsButton')?.addEventListener('click', function() {
        updateSelectedFields();
        reloadWithSelectedFields();
    });

    // 頁面加載時初始化
    generateFieldSelector();
    loadDataAndPrepareHeaders();
});