$(document).ready(function () {
    // 从 URL 获取 item_rno
    function getItemRnoFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("item_rno") || null;
    }

    const itemRno = getItemRnoFromUrl();
    console.log("item_rno =", itemRno);

    // 如果没有 itemRno，就隐藏按钮并直接 return
    if (!itemRno) {
        console.warn("No item_rno found in URL. Skipping UOM initialization.");
        $('[data-bs-target="#uomModal"]').hide(); // 隐藏 UOM 按钮
        return;
    }

    // =========================================
    // ⬇️ 这里开始 DataTable + UOM 相关逻辑
    // =========================================

    let currentSelectedRow = null;
    let currentItemUomRno = null;
    let isNewMode = false;
    let originalFormData = {}; // 存储原始表单数据

    // 按钮状态函数
    function initializeButtonStates() {
        $('#uomnew').prop('disabled', false);
        $('#uomdelete').prop('disabled', false);
        $('#uomsave').prop('disabled', true);
        $('#uomcancel').prop('disabled', true);
        isNewMode = false;
    }
    function setNewModeButtonStates() {
        $('#uomnew').prop('disabled', true);
        $('#uomdelete').prop('disabled', true);
        $('#uomsave').prop('disabled', false);
        $('#uomcancel').prop('disabled', false);
        isNewMode = true;
    }
    function setSelectModeButtonStates() {
        $('#uomnew').prop('disabled', false);
        $('#uomdelete').prop('disabled', false);
        $('#uomsave').prop('disabled', true);
        $('#uomcancel').prop('disabled', true);
        isNewMode = false;
    }
    function setEditModeButtonStates() {
        $('#uomnew').prop('disabled', false);
        $('#uomdelete').prop('disabled', false);
        $('#uomsave').prop('disabled', false);
        $('#uomcancel').prop('disabled', false);
    }

    // 获取/存储表单数据
    function getCurrentFormData() {
        return {
            unit: $('#modalunit').val().trim(),
            factor: $('#factor').val().trim(),
            normalPrice: $('#normalPrice').val().trim(),
            price1: $('#price1').val().trim(),
            price2: $('#price2').val().trim(),
            price3: $('#price3').val().trim(),
            price4: $('#price4').val().trim(),
            buyMed: $('#buyMed').val().trim(),
            nonCitizenPrice1: $('#nonCitizenPrice1').val().trim(),
            nonCitizenPrice2: $('#nonCitizenPrice2').val().trim(),
            nonCitizenPrice3: $('#nonCitizenPrice3').val().trim(),
            nonCitizenPrice4: $('#nonCitizenPrice4').val().trim(),
            nonCitizenBuyMed: $('#nonCitizenBuyMed').val().trim()
        };
    }
    function storeOriginalFormData() {
        originalFormData = getCurrentFormData();
    }
    function hasFormDataChanged() {
        return JSON.stringify(getCurrentFormData()) !== JSON.stringify(originalFormData);
    }

    // 初始化 DataTable
    const table = $('#uomTable').DataTable({
        processing: true,
        serverSide: false,
        searching: false,
        paging: false,
        info: false,
        ordering: false,
        language: { emptyTable: "", zeroRecords: "" },
        ajax: {
            url: `/api/itemmaster/stock_item_master_multiuom/${itemRno}/`,
            type: "GET",
            dataSrc: function (json) {
                console.log("API Response:", json);
                return json.success ? (json.data || []) : [];
            },
            error: function (xhr) {
                console.error("AJAX Error:", xhr.responseText);
                try {
                    const response = JSON.parse(xhr.responseText);
                    alert("Error: " + (response.message || "Failed to load data"));
                } catch (e) {
                    alert("Error: Failed to load UOM data");
                }
            }
        },
        columns: [
            { data: "unit", defaultContent: "", title: "Unit" },
            { 
                data: "factor", 
                defaultContent: "", 
                title: "Factor",
                render: (d, t) => (t === "display" && d ? parseInt(d) : d)
            },
            { 
                data: "refprice", 
                defaultContent: "", 
                title: "Normal  Price",
                render: (d, t) => (t === "display" && d ? parseInt(d) : d)
            }
        ],
        
        
        
        rowCallback: function (row, data) {
            $(row).off("click").on("click", function () {
                if (!isNewMode) selectRow(row, data);
            });
        },
        initComplete: function () {
            const firstRow = $('#uomTable tbody tr:first');
            if (firstRow.length > 0 && table.data().length > 0) {
                firstRow.click();
            } else {
                initializeButtonStates();
            }
        }
    });

    // 选中行
    function selectRow(row, data) {
        $('#uomTable tbody tr').removeClass('highlight-row');
        $(row).addClass('highlight-row');
        currentSelectedRow = row;
        currentItemUomRno = data.itemuom_rno;

        function formatNumber(v) {
            if (!v || v === 0) return "";
            return Math.round(parseFloat(v)).toString();
        }

        $('#modalunit').val(data.unit || '');
        $('#factor').val(formatNumber(data.factor));
        $('#normalPrice').val(formatNumber(data.refprice));
        $('#price1').val(formatNumber(data.refprice2));
        $('#price2').val(formatNumber(data.refprice3));
        $('#price3').val(formatNumber(data.refprice4));
        $('#price4').val(formatNumber(data.refprice5));
        $('#buyMed').val(formatNumber(data.refprice6));
        $('#nonCitizenPrice1').val(formatNumber(data.x_refprice));
        $('#nonCitizenPrice2').val(formatNumber(data.x_refprice2));
        $('#nonCitizenPrice3').val(formatNumber(data.x_refprice3));
        $('#nonCitizenPrice4').val(formatNumber(data.x_refprice4));
        $('#nonCitizenBuyMed').val(formatNumber(data.x_refprice6));

        storeOriginalFormData();
        if (!isNewMode) setSelectModeButtonStates();
    }

    // 清空表单
    function clearForm() {
        $('#modalunit, #factor, #normalPrice, #price1, #price2, #price3, #price4, #buyMed, ' +
          '#nonCitizenPrice1, #nonCitizenPrice2, #nonCitizenPrice3, #nonCitizenPrice4, #nonCitizenBuyMed')
        .val('');
        $('#uomTable tbody tr').removeClass('highlight-row');
        currentSelectedRow = null;
        currentItemUomRno = null;
        originalFormData = {};
    }

    // 表单输入监听
    function setupFormChangeListeners() {
        const fields = '#modalunit, #factor, #normalPrice, #price1, #price2, #price3, #price4, #buyMed, ' +
                       '#nonCitizenPrice1, #nonCitizenPrice2, #nonCitizenPrice3, #nonCitizenPrice4, #nonCitizenBuyMed';
        $(fields).on('input change', function () {
            if (isNewMode) return;
            if (hasFormDataChanged()) setEditModeButtonStates();
            else setSelectModeButtonStates();
        });
    }
    setupFormChangeListeners();

    // 新增按钮
    $('#uomnew').click(function () {
        setNewModeButtonStates();
        const newRowData = { itemuom_rno: null, unit: '', factor: '', refprice: '' };
        const newRow = table.row.add(newRowData).draw();
        const newRowNode = newRow.node();
        $('#uomTable tbody tr').removeClass('highlight-row');
        $(newRowNode).addClass('highlight-row');
        currentSelectedRow = newRowNode;
        currentItemUomRno = null;
        clearForm();
        $('#modalunit').focus();
        storeOriginalFormData();
    });

    // 删除按钮
    $('#uomdelete').click(function () {
        if (!currentItemUomRno) {
            alert('Please select a record to delete');
            return;
        }
        if (confirm('Are you sure you want to delete this UOM record?')) {
            $(this).prop('disabled', true).text('Deleting...');
            $.ajax({
                url: `/api/itemmaster/stock_item_master_multiuom_delete/${currentItemUomRno}/`,
                type: 'DELETE',
                headers: { 'X-CSRFToken': $('[name=csrfmiddlewaretoken]').val() },
                success: function (res) {
                    if (res.success) {
                        alert('Record deleted successfully');
                        table.ajax.reload(function () {
                            clearForm();
                            initializeButtonStates();
                        });
                    } else {
                        alert('Error: ' + (res.message || 'Failed to delete record'));
                    }
                },
                error: function (xhr) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        alert('Error: ' + (response.message || 'Failed to delete record'));
                    } catch {
                        alert('Error: Failed to delete record');
                    }
                },
                complete: function () {
                    $('#uomdelete').prop('disabled', false).text('Delete');
                }
            });
        }
    });

    // 保存按钮
    $('#uomsave').click(function () {
        const formData = {
            item_rno: itemRno,
            itemuom_rno: currentItemUomRno,
            uom: $('#modalunit').val().trim(),
            factor: $('#factor').val().trim() ? parseFloat($('#factor').val()) : null,
            normalPrice: $('#normalPrice').val().trim() ? parseFloat($('#normalPrice').val()) : null,
            price1: $('#price1').val().trim() ? parseFloat($('#price1').val()) : null,
            price2: $('#price2').val().trim() ? parseFloat($('#price2').val()) : null,
            price3: $('#price3').val().trim() ? parseFloat($('#price3').val()) : null,
            price4: $('#price4').val().trim() ? parseFloat($('#price4').val()) : null,
            buyMed: $('#buyMed').val().trim() ? parseFloat($('#buyMed').val()) : null,
            nonCitizenPrice1: $('#nonCitizenPrice1').val().trim() ? parseFloat($('#nonCitizenPrice1').val()) : null,
            nonCitizenPrice2: $('#nonCitizenPrice2').val().trim() ? parseFloat($('#nonCitizenPrice2').val()) : null,
            nonCitizenPrice3: $('#nonCitizenPrice3').val().trim() ? parseFloat($('#nonCitizenPrice3').val()) : null,
            nonCitizenPrice4: $('#nonCitizenPrice4').val().trim() ? parseFloat($('#nonCitizenPrice4').val()) : null,
            nonCitizenBuyMed: $('#nonCitizenBuyMed').val().trim() ? parseFloat($('#nonCitizenBuyMed').val()) : null
        };

        $(this).prop('disabled', true).text('Saving...');
        $.ajax({
            url: `/api/itemmaster/stock_item_master_multiuom_save/${itemRno}/`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            headers: { 'X-CSRFToken': $('[name=csrfmiddlewaretoken]').val() },
            success: function (res) {
                if (res.success) {
                    alert(res.message || 'Record saved successfully');
                    table.ajax.reload(function () {
                        initializeButtonStates();
                        if (res.itemuom_rno) {
                            currentItemUomRno = res.itemuom_rno;
                            setTimeout(function () {
                                $('#uomTable tbody tr').each(function () {
                                    const rowData = table.row(this).data();
                                    if (rowData && rowData.itemuom_rno == res.itemuom_rno) {
                                        $(this).click();
                                        return false;
                                    }
                                });
                            }, 100);
                        }
                    });
                } else {
                    alert('Error: ' + (res.message || 'Failed to save record'));
                }
            },
            error: function (xhr) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.errors) {
                        let errorMsg = 'Validation errors:\n';
                        for (const [field, errors] of Object.entries(response.errors)) {
                            errorMsg += `${field}: ${errors.join(', ')}\n`;
                        }
                        alert(errorMsg);
                    } else {
                        alert('Error: ' + (response.message || 'Failed to save record'));
                    }
                } catch {
                    alert('Error: Failed to save record. Please check console.');
                }
            },
            complete: function () {
                $('#uomsave').prop('disabled', false).text('Save');
            }
        });
    });

    // 样式
    $('<style>').prop('type', 'text/css').html(`
        .dataTables_empty { display: none !important; }
        #uomTable_wrapper .dataTables_scrollBody { min-height: 300px; }
        .highlight-row { background-color: #007bff !important; color: white !important; }
    `).appendTo('head');

    initializeButtonStates();
    console.log("UOM Management initialized for item:", itemRno);
});
