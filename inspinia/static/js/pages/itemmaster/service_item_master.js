$(document).ready(function() {
    // 初始化 DataTable
    var table = $('#service_item_master_table').DataTable({
        "processing": true,
        "serverSide": true,
        "stateSave":true,
        "stateDuration":-1,
        
        "ajax": {
            "url": "/api/itemmaster/service_item_master_list/",
            "type": "GET",
            "data": function(d) {
                var params = {
                    page: Math.floor(d.start / d.length) + 1,
                    page_size: d.length,
                    search: d.search.value
                };
                
                var itemno = $('input[name="itemno"]').val();
                var itemname = $('input[name="itemname"]').val();
                
                if (itemno) params.itemno = itemno;
                if (itemname) params.itemname = itemname;
                
                return params;
            },
            "dataSrc": function(json) {
                json.recordsTotal = json.total;
                json.recordsFiltered = json.total;
                return json.results;
            },
            "error": function(xhr, error, thrown) {
                console.error('DataTable Ajax Error:', error);
                alert('加载数据时出现错误，请稍后重试');
            }
        },
        "columns": [
            {
                "data": null,
                "orderable": true,
                "render": function(data, type, row, meta) {
                    return meta.row + meta.settings._iDisplayStart + 1;
                }
            },
            {
                "data": null,
                "orderable": false,
                "render": function(data, type, row) {
                    return `
                        <div class="action-buttons d-flex gap-1 flex-nowrap">
                            <button type="button" class="btn btn-sm btn-outline-info view-btn" title="View" data-id="${row.item_rno}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-primary edit-btn" title="Edit" data-id="${row.item_rno}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-btn" title="Delete" data-id="${row.item_rno}" data-itemno="${ row.itemno }" data-name="${ row.itemname }">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            },
            {"data": "item_rno"},
            {"data": "branch"},
            {"data": "itemno"},
            {"data": "itemname"},
            {
                "data": "isactive",
                "render": function(data, type, row) {
                    return data ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>';
                }
            },
            {"data": "billgroup"},
            {
                "data": "price",
                "render": function(data, type, row) {
                    return data ? parseFloat(data).toFixed(2) : '0.00';
                }
            },
            {
                "data": "unitcost", 
                "render": function(data, type, row) {
                    return data ? parseFloat(data).toFixed(2) : '0.00';
                }
            },
            {
                "data": "taxableiterm",
                "render": function(data, type, row) {
                    return data ? 'Yes' : 'No';
                }
            },
            {
                "data": "taxrate",
                "render": function(data, type, row) {
                    return data ? parseFloat(data).toFixed(2) + '%' : '0.00%';
                }
            },
            {
                "data": "labelprint",
                "render": function(data, type, row) {
                    return data ? 'Yes' : 'No';
                }
            },
            { 
                "data": "createdby",
                render: function (data, type, row) {
                    return data === null || data === "" ? "-" : data;
                }
            },

            {
                "data": "createdon",
                "orderable": true,
                "render": function(data, type, row) {
                    if (data) {
                        return new Date(data).toLocaleDateString('en-US');
                    }
                    return '';
                }
            },
            {"data": "modifiedby"},
            {
                "data": "modifiedon",
                "render": function(data, type, row) {
                    if (data) {
                        return new Date(data).toLocaleDateString('en-US');
                    }
                    return '';
                }
            }
        ],
        "pageLength": 20,
        "lengthMenu": [[10, 20, 50, 100], [10, 20, 50, 100]],
        
        // Fixed Header Configuration
        
        
        // Scrolling options (optional - for better fixed header experience)
        "scrollY": "400px", // Set table height if needed
        "scrollX": true, 
        "scrollCollapse": true,
        
        
        "columnDefs": [
                { width: '100px', targets: 0 },
                { width: '200px', targets: 1 },
                { width: '900px', targets: 2 },
                { width: '200px', targets: 3 },
                { width: '200px', targets: 4 },
                { width: '200px', targets: 5 },
                { width: '200px', targets: 6 },
                { width: '200px', targets: 7 },
                { width: '200px', targets: 8 }
            ],
        

        
        
        
        "language": {
            "processing": "Loading...",
            "lengthMenu": "Show _MENU_ Items",
            "zeroRecords": "No matching records found",
            "info": "Showing _START_ to _END_ of _TOTAL_ Items",
            "infoEmpty": "Showing 0 to 0 of 0 Items",
            "infoFiltered": "(filtered from _MAX_ total Items)",
            "search": "Search:",
            "paginate": {
                "first": '<i class="ti ti-chevrons-left"></i>',
                "previous": '<i class="ti ti-chevron-left"></i>',
                "next": '<i class="ti ti-chevron-right"></i>',
                "last": '<i class="ti ti-chevrons-right"></i>'
            }
        },
        
        // 自定义DOM结构，移除默认的控件
        "dom":  "rt"+
        // bottom elements
        "<'d-md-flex justify-content-between align-items-center mt-2'ilp>",
        "buttons": [
            {extend: 'Add New', className: 'btn btn-sm btn-secondary'},
        ]
        
        
    });

    table.columns.adjust().draw();
    // Handle window resize to adjust fixed header
    $(window).on('resize', function () {
        table.columns.adjust();
    });


    // Adjust fixed header when custom controls are updated
    function adjustFixedHeader() {
        setTimeout(function() {
            if (table.fixedHeader) {
                table.fixedHeader.adjust();
            }
        }, 100);
    }

    // 创建自定义控件函数
    function createCustomControls(api) {
        var $datatableControls = $('#datatable_controls');
        
        // 清空现有内容
        $datatableControls.empty();
        
        // 创建控件容器
        var controlsHtml = `
            <div class="row w-100 align-items-center">
                <!-- 左侧：显示条数选择器 -->
                <div class="col-md-4">
                    <div class="d-flex ">
                        <span id="dt-info" class="text-muted"></span>
                    </div>
                </div>
                
                <!-- 中间：信息显示 -->
                <div class="col-md-5">
                    <div class="d-flex align-items-center">
                        <label class="form-label me-2 mb-0">Show:</label>
                        <select class="form-select form-select-sm" id="dt-length-select" style="width: auto;">
                            <option value="10">10</option>
                            <option value="20" selected>20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
                
                <!-- 右侧：分页控件 -->
                <div class="col-md-3">
                    <div class="d-flex justify-content-end">
                        <nav aria-label="DataTable pagination">
                            <ul class="pagination mb-0" id="dt-pagination">
                                <!-- 分页按钮将通过JavaScript动态生成 -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
        
        $datatableControls.html(controlsHtml);
        
        // 绑定显示条数选择器事件
        $('#dt-length-select').on('change', function() {
            var length = parseInt($(this).val());
            api.page.len(length).draw();
            adjustFixedHeader(); // Adjust header after page length change
        });
        
        // 初始化信息和分页
        updateInfo(api);
        updatePagination(api);
        adjustFixedHeader(); // Adjust header after controls creation
    }

    // 更新信息显示
    function updateInfo(api) {
        var info = api.page.info();
        var infoText = '';
        
        if (info.recordsTotal === 0) {
            infoText = 'Showing 0 to 0 of 0 Items';
        } else {
            infoText = `Showing ${info.start + 1} to ${info.end} of ${info.recordsTotal} Items`;
            if (info.recordsFiltered !== info.recordsTotal) {
                infoText += ` (filtered from ${info.recordsTotal} total entries)`;
            }
        }
        
        $('#dt-info').text(infoText);
    }

    // 更新分页控件
    function updatePagination(api) {
        var info = api.page.info();
        var $pagination = $('#dt-pagination');
        
        $pagination.empty();
        
        if (info.pages <= 1) {
            return; // 如果只有一页或没有数据，不显示分页
        }
        
        var currentPage = info.page;
        var totalPages = info.pages;
        
        // 首页按钮
        var firstDisabled = currentPage === 0 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${firstDisabled}">
                <a class="page-link" href="#" data-page="first">First</a>
            </li>
        `);
        
        // 上一页按钮
        var prevDisabled = currentPage === 0 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="previous">&laquo;</a>
            </li>
        `);
        
        // 页码按钮（显示当前页前后各2页）
        var startPage = Math.max(0, currentPage - 2);
        var endPage = Math.min(totalPages - 1, currentPage + 2);
        
        // 如果开始页不是0，显示省略号
        if (startPage > 0) {
            $pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" data-page="0">1</a>
                </li>
            `);
            if (startPage > 1) {
                $pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            }
        }
        
        // 页码按钮
        for (var i = startPage; i <= endPage; i++) {
            var activeClass = i === currentPage ? 'active' : '';
            $pagination.append(`
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" data-page="${i}">${i + 1}</a>
                </li>
            `);
        }
        
        // 如果结束页不是最后一页，显示省略号
        if (endPage < totalPages - 1) {
            if (endPage < totalPages - 2) {
                $pagination.append(`<li class="page-item disabled"><span class="page-link">...</span></li>`);
            }
            $pagination.append(`
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages - 1}">${totalPages}</a>
                </li>
            `);
        }
        
        // 下一页按钮
        var nextDisabled = currentPage === totalPages - 1 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="next">&raquo;</a>
            </li>
        `);
        
        // 末页按钮
        var lastDisabled = currentPage === totalPages - 1 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${lastDisabled}">
                <a class="page-link" href="#" data-page="last">Last</a>
            </li>
        `);
        
        // 绑定分页点击事件
        $pagination.find('a.page-link').on('click', function(e) {
            e.preventDefault();
            var $this = $(this);
            
            if ($this.parent().hasClass('disabled') || $this.parent().hasClass('active')) {
                return;
            }
            
            var page = $this.data('page');
            
            switch (page) {
                case 'first':
                    api.page('first').draw('page');
                    break;
                case 'previous':
                    api.page('previous').draw('page');
                    break;
                case 'next':
                    api.page('next').draw('page');
                    break;
                case 'last':
                    api.page('last').draw('page');
                    break;
                default:
                    if (typeof page === 'number') {
                        api.page(page).draw('page');
                    }
                    break;
            }
            adjustFixedHeader(); // Adjust header after page change
        });
    }

    // 监听表格重绘事件，更新控件
    table.on('draw', function() {
        updateInfo(table);
        updatePagination(table);
        adjustFixedHeader(); // Adjust header after draw
    });

    // 表单搜索
    $('#filterform').on('submit', function(e) {
        e.preventDefault();
        table.draw();
    });

    // 添加新记录按钮
    $('#addNewBtn').on('click', function() {
        window.location.href = '/itemmaster/service_item_master_form';
    });

    $(document).on('click', '.view-btn', function() {
        var itemId = $(this).data('id');
        window.location.href = '/itemmaster/service_item_master_form/?item_rno=' + itemId + '&mode=view';
    });

    // 编辑按钮事件
    $(document).on('click', '.edit-btn', function() {
        var itemId = $(this).data('id');
        window.location.href = '/itemmaster/service_item_master_form/?item_rno=' + itemId + '&mode=edit';
    });

    // 删除按钮事件
    $(document).on('click', '.delete-btn', function() {
        var itemRno = $(this).data('id');
        var itemno = $(this).data('itemno');
        var itemname = $(this).data('name');
        
        showSecureDeleteModal({
            item_rno: itemRno,
            itemno: itemno,
            itemname: itemname
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            confirmBtn.disabled = true;

            fetch('/api/itemmaster/service_item_master_delete/', {
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
                    table.ajax.reload(null, false); 
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
    });

    // 清空搜索表单
    function clearFilters() {
        $('#filterform')[0].reset();
        table.draw();
    }

    // 导出功能
    function exportData() {
        var params = new URLSearchParams({
            export: 'excel',
            itemno: $('input[name="itemno"]').val() || '',
            itemname: $('input[name="itemname"]').val() || ''
        });
        
        window.location.href = '/api/itemmaster/service_item_master_list/?' + params.toString();
    }

    // 全局函数
    window.clearServiceItemFilters = clearFilters;
    window.exportServiceItems = exportData;
});