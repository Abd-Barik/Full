$(document).ready(function() {
    let SESSION = {}; // Global session variable
    const defaultPhotoUrl = "/static/images/avatar/default-avatar.png";
    let currentDeleteData = null;
    let table = null;
    let isTableInitialized = false;
    
    // Initialize session
    async function initSession() {
        try {
            const res = await fetch('/dashboard/');
            const data = await res.json();
            SESSION = data;
            console.log("Session loaded:", SESSION);
        } catch (err) {
            console.error("Failed to load session", err);
        }
    }

    // Initialize session on page load
    initSession();

    // Initialize DataTable
    function initializeDataTable() {
        if (isTableInitialized) {
            return table;
        }

        table = $('#customerTable').DataTable({
            processing: true,
            serverSide: true,
            ajax: {
                url: '/api/clinic/',
                type: 'GET',
                data: function(d) {
                    // Get filter values from form
                    const filterField = $('#filterField').val();
                    const searchValue = $('#globalSearch').val(); // Changed from searchValue to globalSearch
                    
                    return {
                        page: Math.floor(d.start / d.length) + 1,
                        page_size: d.length,
                        search: searchValue,
                        filter_field: filterField
                    };
                },
                dataSrc: function(json) {
                    json.recordsTotal = json.pagination ? json.pagination.total : 0;
                    json.recordsFiltered = json.pagination ? json.pagination.total : 0;
                    return json.data || [];
                },
                error: function(xhr, error, code) {
                    console.error('DataTables AJAX error:', error);
                    alert('Failed to load customer data. Please try again.');
                }
            },
            columns: [
                {
                    data: 'photo',
                    name: 'photo',
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row) {
                        if (type === 'display') {
                            const photoUrl = data 
                                ? `data:image/jpeg;base64,${data}` 
                                : defaultPhotoUrl;
                            return `<img src="${photoUrl}" alt="Photo" class="customer-photo" onerror="this.src='${defaultPhotoUrl}'" style="width: 80px; height: 80px; object-fit: cover; border-radius: 50%;">`;
                        }
                        return data;
                    }
                },
                {
                    data: null,
                    name: 'customer_info',
                    orderable: false,
                    render: function(data, type, row) {
                        if (type === 'display') {
                            return renderCustomerInfo(row);
                        }
                        return `${row.name} ${row.icno} ${row.customerno}`;
                    }
                },
                {
                    data: null,
                    name: 'actions',
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row) {
                        if (type === 'display') {
                            return renderActionButtons(row);
                        }
                        return '';
                    }
                }
            ],
            pageLength: 10,
            lengthMenu: [[5, 10, 25, 50, 100], [5, 10, 25, 50, 100]],
            order: [[1, 'asc']],
            language: {
                processing: '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>',
                search: 'Search customers:',
                lengthMenu: 'Show _MENU_ customers per page',
                info: 'Showing _START_ to _END_ of _TOTAL_ customers',
                infoEmpty: 'No customers found',
                infoFiltered: '(filtered from _MAX_ total customers)',
                paginate: {
                    first: '<i class="ti ti-chevrons-left"></i>',
                    previous: '<i class="ti ti-chevron-left"></i>',
                    next: '<i class="ti ti-chevron-right"></i>',
                    last: '<i class="ti ti-chevrons-right"></i>'
                },
                emptyTable: "No customers found",
                zeroRecords: "No matching customers found"
            },
            // Remove default controls, we'll create custom ones
            dom: 'rt',
            drawCallback: function(settings) {
                bindActionEvents();
            },
            initComplete: function(settings, json) {
                // Create custom controls after initialization
                createCustomControls(this.api());
            }
        });

        isTableInitialized = true;
        return table;
    }

    // Search button click event
    $('#searchButton').on('click', function(e) {
        e.preventDefault();
        
        // Show table container and hide initial message
        $('#initialMessage').hide();
        $('#tableContainer').show();
        
        // Initialize DataTable if not already done
        if (!isTableInitialized) {
            initializeDataTable();
        } else {
            // Reload data with new filters
            table.ajax.reload();
        }
    });

    // Filter form submission (for form submit events)
    $('#filterForm').on('submit', function(e) {
        e.preventDefault();
        $('#searchButton').click(); // Trigger the search button click
    });

    // Enter key submission in search input - 移除自动触发
    $('#globalSearch').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            e.preventDefault();
            // 不自动触发搜索，让用户主动点击搜索按钮
            // $('#searchButton').click(); 
        }
    });

    // Create custom controls function
    function createCustomControls(api) {
        var $datatableControls = $('#datatable_controls');
        
        // Clear existing content
        $datatableControls.empty();
        
        // Create controls HTML
        var controlsHtml = `
            <div class="row align-items-center">
                <!-- Left: Info display -->
                <div class="col-md-4">
                    <div class="d-flex">
                        <span id="dt-info" class="text-muted"></span>
                    </div>
                </div>
                
                <!-- Center: Length selector -->
                <div class="col-md-4">
                    <div class="d-flex align-items-center justify-content-center">
                        <label class="form-label me-2 mb-0">Show:</label>
                        <select class="form-select form-select-sm" id="dt-length-select" style="width: auto;">
                            <option value="5">5</option>
                            <option value="10" selected>10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span class="ms-2 text-muted">customers per page</span>
                    </div>
                </div>
                
                <!-- Right: Pagination -->
                <div class="col-md-4">
                    <div class="d-flex justify-content-end">
                        <nav aria-label="DataTable pagination">
                            <ul class="pagination mb-0" id="dt-pagination">
                                <!-- Pagination buttons will be generated dynamically -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        `;
        
        $datatableControls.html(controlsHtml);
        
        // Bind length selector event
        $('#dt-length-select').on('change', function() {
            var length = parseInt($(this).val());
            api.page.len(length).draw();
        });
        
        // Initialize info and pagination
        updateInfo(api);
        updatePagination(api);
    }

    // Update info display
    function updateInfo(api) {
        var info = api.page.info();
        var infoText = '';
        
        if (info.recordsTotal === 0) {
            infoText = 'Showing 0 to 0 of 0 customers';
        } else {
            infoText = `Showing ${info.start + 1} to ${info.end} of ${info.recordsTotal} customers`;
            if (info.recordsFiltered !== info.recordsTotal) {
                infoText += ` (filtered from ${info.recordsTotal} total customers)`;
            }
        }
        
        $('#dt-info').text(infoText);
    }

    // Update pagination controls
    function updatePagination(api) {
        var info = api.page.info();
        var $pagination = $('#dt-pagination');
        
        $pagination.empty();
        
        if (info.pages <= 1) {
            return; // Don't show pagination if only one page or no data
        }
        
        var currentPage = info.page;
        var totalPages = info.pages;
        
        // First page button
        var firstDisabled = currentPage === 0 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${firstDisabled}">
                <a class="page-link" href="#" data-page="first">
                    <i class="ti ti-chevrons-left"></i>
                </a>
            </li>
        `);
        
        // Previous page button
        var prevDisabled = currentPage === 0 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" data-page="previous">
                    <i class="ti ti-chevron-left"></i>
                </a>
            </li>
        `);
        
        // Page number buttons (show current page +/- 2 pages)
        var startPage = Math.max(0, currentPage - 2);
        var endPage = Math.min(totalPages - 1, currentPage + 2);
        
        // Show first page if not in range
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
        
        // Page number buttons
        for (var i = startPage; i <= endPage; i++) {
            var activeClass = i === currentPage ? 'active' : '';
            $pagination.append(`
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" data-page="${i}">${i + 1}</a>
                </li>
            `);
        }
        
        // Show last page if not in range
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
        
        // Next page button
        var nextDisabled = currentPage === totalPages - 1 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" data-page="next">
                    <i class="ti ti-chevron-right"></i>
                </a>
            </li>
        `);
        
        // Last page button
        var lastDisabled = currentPage === totalPages - 1 ? 'disabled' : '';
        $pagination.append(`
            <li class="page-item ${lastDisabled}">
                <a class="page-link" href="#" data-page="last">
                    <i class="ti ti-chevrons-right"></i>
                </a>
            </li>
        `);
        
        // Bind pagination click events
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
        });
    }

    // Listen for table redraw events, update controls
    $(document).on('draw.dt', '#customerTable', function() {
        if (table) {
            updateInfo(table);
            updatePagination(table);
        }
    });

    // Render customer information
    function renderCustomerInfo(row) {
        const branchName = (row.branch_name || '').trim();
        const customerNo = (row.customerno || '').trim();
        const name = row.name && row.name.trim() ? row.name.trim() : '<span class="badge bg-secondary badge-sm">N/A</span>';
        const icno = row.icno && row.icno.trim() ? row.icno.trim() : '<span class="badge bg-secondary badge-sm">N/A</span>';
        const gender = row.gender && row.gender.trim() ? row.gender.trim() : '<span class="badge bg-secondary badge-sm">N/A</span>';
        
        const addressStr = `${row.inv_address1 || ''} ${row.inv_address2 || ''} ${row.inv_address3 || ''}`.trim();
        const address = addressStr ? addressStr : '<span class="badge bg-secondary badge-sm">N/A</span>';
        
        const phone = (row.phone1 && row.phone1.trim()) ? row.phone1.trim() : '<span class="badge bg-secondary badge-sm">N/A</span>';
        const title = row.title && row.title.trim() ? row.title.trim() + '. ' : '';
        
        const dob = row.patient_dateofbirth && row.patient_dateofbirth.trim() ? row.patient_dateofbirth.trim() : null;
        const age = dob ? calculateAge(dob) : '<span class="badge bg-secondary badge-sm">N/A</span>';

        return `
            <div class="customer-details">
                <div class="customer-info-grid">
                    <div class="info-row">
                        <span class="info-label">Branch:</span>
                        <span class="info-value">${branchName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Reference#:</span>
                        <span class="info-value">${customerNo}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${title}${name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">IC:</span>
                        <span class="info-value">${icno}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${age}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Gender:</span>
                        <span class="info-value">${gender}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Phone:</span>
                        <span class="info-value">${phone}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Address:</span>
                        <span class="info-value">${address}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Render action buttons
    function renderActionButtons(row) {
        const customerId = row.customer_rno;
        return `
            <div class="btn-group-vertical" role="group">
                <button class="btn btn-sm btn-outline-info view-btn mb-1" 
                        data-customer='${JSON.stringify(row)}'
                        title="View">
                    <i class="fas fa-eye me-1"></i>View
                </button>
                <button class="btn btn-sm btn-outline-primary edit-btn mb-1" 
                        data-customer='${JSON.stringify(row)}'
                        title="Edit">
                    <i class="fas fa-edit me-1"></i>Edit
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn mb-1" 
                        data-customer='${JSON.stringify(row)}'
                        title="Delete">
                    <i class="fas fa-trash me-1"></i>Delete
                </button>
                <button class="btn btn-sm btn-outline-secondary queue-btn mb-1" 
                        data-customer='${JSON.stringify(row)}'
                        title="Add to Queue">
                    <i class="fas fa-sign-in-alt me-1"></i>Queue
                </button>
            </div>
        `;
    }

    // Calculate age
    function calculateAge(dateOfBirthStr) {
        if (!dateOfBirthStr) return 'N/A';
        
        const dob = new Date(dateOfBirthStr);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        
        const monthDiff = today.getMonth() - dob.getMonth();
        const dayDiff = today.getDate() - dob.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }
        
        return age;
    }

    // Bind action button events
    function bindActionEvents() {
        $('.view-btn').off('click').on('click', function(e) {
            e.preventDefault();
            const customer = JSON.parse($(this).attr('data-customer'));
            handleView(customer);
        });

        $('.edit-btn').off('click').on('click', function(e) {
            e.preventDefault();
            const customer = JSON.parse($(this).attr('data-customer'));
            handleEdit(customer);
        });

        $('.delete-btn').off('click').on('click', function(e) {
            e.preventDefault();
            const customer = JSON.parse($(this).attr('data-customer'));
            handleDelete(customer);
        });

        $('.queue-btn').off('click').on('click', function(e) {
            e.preventDefault();
            const customer = JSON.parse($(this).attr('data-customer'));
            handleQueue(customer);
        });
    }

    // Action handlers (keeping original functionality)
    function handleView(customer) {
        if (!customer.branch_rno || !customer.customer_rno) {
            alert('Missing customer information. Cannot view.');
            return;
        }
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        const url = `/tables-datatables-columns/?branch_rno=${encodeURIComponent(customer.branch_rno)}&customer_rno=${encodeURIComponent(customer.customer_rno)}&mode=view&return_url=${returnUrl}`;
        window.location.href = url;
    }

    function handleEdit(customer) {
        if (Number(customer.branch_rno) !== Number(SESSION.branch_rno)) {
            $('#edit-error').modal('show');
            return;
        }
        
        if (!customer.branch_rno || !customer.customer_rno) {
            alert('Missing customer information. Cannot edit.');
            return;
        }
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        const url = `/tables-datatables-columns/?branch_rno=${encodeURIComponent(customer.branch_rno)}&customer_rno=${encodeURIComponent(customer.customer_rno)}&mode=edit&return_url=${returnUrl}`;
        window.location.href = url;
    }

    function handleDelete(customer) {
        if (Number(customer.branch_rno) !== Number(SESSION.branch_rno)) {
            $('#delete-error').modal('show');
            return;
        }
        
        currentDeleteData = customer;
        $('#deleteCustomerNo').text(customer.customerno || 'N/A');
        $('#deleteCustomerName').text(customer.name || 'N/A');
        $('#deleteModal').modal('show');
    }

    function handleQueue(customer) {
        if (Number(customer.branch_rno) !== Number(SESSION.branch_rno)) {
            $('#queue-error').modal('show');
            return;
        }
        
        const url = `/sendtoqueue/${encodeURIComponent(customer.customer_rno)}`;
        window.location.href = url;
    }

    // Delete customer
    $('#confirmDeleteBtn').on('click', function() {
        if (!currentDeleteData) return;
        
        const btn = $(this);
        const originalText = btn.html();
        btn.html('<i class="fas fa-spinner fa-spin"></i> Deleting...').prop('disabled', true);

        $.ajax({
            url: '/api/delete-customer/',
            type: 'POST',
            data: {
                'branch_rno': currentDeleteData.branch_rno,
                'customer_rno': currentDeleteData.customer_rno
            },
            success: function(response) {
                if (response.success) {
                    $('#deleteModal').modal('hide');
                    alert('Customer deleted successfully!');
                    if (table) {
                        table.ajax.reload();
                    }
                } else {
                    alert('Error: ' + (response.error || 'Failed to delete customer'));
                }
            },
            error: function(xhr, status, error) {
                console.error('Delete error:', error);
                alert('Failed to delete customer. Please try again.');
            },
            complete: function() {
                btn.html(originalText).prop('disabled', false);
            }
        });
    });

    // Add new customer button
    $('#addNewBtn').on('click', function(e) {
        e.preventDefault();
        const currentUrl = encodeURIComponent(window.location.href);
        const targetUrl = `/tables-datatables-columns/?return_url=${currentUrl}`;
        window.location.href = targetUrl;
    });

    // Today's customers functionality (keeping original functionality)
    function updateTodayCustomerCount() {
        $.ajax({
            url: '/api/customers/today-count/',
            method: 'GET',
            success: function(response) {
                const count = response.count || 0;
                $('#todayCounterBadge').text(count);
                $('#todayTotalCount').text(count);
                
                if (count === 0) {
                    $('#todayCounterBadge').hide();
                } else {
                    $('#todayCounterBadge').show();
                }
            },
            error: function() {
                console.error('Failed to fetch today\'s customer count');
            }
        });
    }

    function loadTodayCustomers() {
        $.ajax({
            url: '/api/customers/today-list/',
            method: 'GET',
            success: function(response) {
                displayTodayCustomers(response.customers || []);
            },
            error: function() {
                alert('Failed to load today\'s customers');
            }
        });
    }

    function displayTodayCustomers(customers) {
        const container = $('#todayCustomersList');
        const noDataDiv = $('#noTodayCustomers');
        
        if (customers.length === 0) {
            container.hide();
            noDataDiv.show();
            return;
        }
        
        noDataDiv.hide();
        container.show();
        
        let html = '';
        customers.forEach(function(customer) {
            html += `
                <div class="today-customer-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${customer.name}</strong>
                            <span class="text-muted ms-2">#${customer.customer_no}</span>
                            <div class="customer-time">
                                <i class="fas fa-clock me-1"></i>Added at ${customer.created_time}
                            </div>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">${customer.phone || 'No phone'}</small>
                            <br>
                            <small class="text-success">
                                <i class="fas fa-check-circle me-1"></i>New
                            </small>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.html(html);
    }

    function updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        $('#todayCurrentTime').text(timeString);
    }

    // Initialize today's customers functionality
    updateTodayCustomerCount();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    setInterval(updateTodayCustomerCount, 60000);

    $('#todayCustomersBtn').on('click', function() {
        loadTodayCustomers();
        $('#todayCustomersModal').modal('show');
    });

    $('#refreshTodayList').on('click', function() {
        loadTodayCustomers();
    });
});