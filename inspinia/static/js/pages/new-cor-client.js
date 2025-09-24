$(document).ready(function() {
    // 1. 設定今天的日期
    const today = new Date().toISOString().split('T')[0];
    $('#opendate').val(today);

    // 2. 載入下拉選單資料
    loadSelectData();

    // 3. 檢查是否是編輯模式
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const branch = urlParams.get("branch");
    const reference = urlParams.get("reference");

    if (mode === "edit" && branch && reference) {
        loadClientData(branch, reference);
    }
    else if (mode === "view" && branch && reference) {
        loadClientData(branch, reference);

        // 隱藏 save 按鈕
        $("#saveCustomer").hide();

        // 設定表單為唯讀
        $("#corporateForm")
            .find("input, select, textarea, button")
            .prop("disabled", true);
    }

    // 4. 表單提交處理 (防止 Enter 直接送出)
    $('#corporateForm').on('submit', function(e) {
        e.preventDefault();
    });
});

$('#saveCustomer').on('click', function() {
    // 驗證必填欄位
    if (!validateRequiredFields()) {
        return;
    }

    // 顯示 loading spinner
    $('#loadingSpinner').removeClass('d-none');
    $('#saveCustomer').prop('disabled', true);

    // 收集表單資料
    const formData = collectFormData();

    // 判斷模式
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");
    const branch = urlParams.get("branch");
    const reference = urlParams.get("reference");

    if (mode === "edit" && branch && reference) {
        formData.branch = branch; // 加上主鍵
        formData.reference = reference;
        submitFormData(formData, "/api/corporate/update_panel_company/");
    } else {
        submitFormData(formData, "/api/corporate/save_panel_company/");
    }
});

const requiredFields = [
    { id: 'pcompany_no', name: 'pcompany_no' },
    { id: 'pcompanyname', name: 'pcompanyname' },
    { id: 'address1', name: 'address1'},
    { id: 'address2', name: 'address2'},
    { id: 'address3', name: 'address3' },
    { id: 'postcode', name: 'postcode' },
    { id: 'town', name: 'town' },
    { id: 'statecode', name: 'statecode' },
    { id: 'country', name: 'country' },
    { id: 'contact_no', name: 'contact_no' },
    { id: 'email', name: 'email' },
    { id: 'msic_code', name: 'msic_code' },
    { id: 'brn', name: 'brn' },
    { id: 'tin', name: 'tin' }
];

function collectFormData() {
    const formData = {
        // 基本資訊
        opendate: $('#opendate').val(),
        pcompany_no: $('#pcompany_no').val(),
        isactive: $('#isactive').is(':checked'),
        pcompanyname: $('#pcompanyname').val(),
        address1: $('#address1').val(),
        address2: $('#address2').val(),
        address3: $('#address3').val(),
        postcode: $('#postcode').val(),
        town: $('#town').val(),
        statecode: $('#statecode').val(),
        country: $('#country').val(),
        contact_person: $('[name="contact_person"]').val(),
        contact_no: $('#contact_no').val(),
        email: $('#email').val(),
        msic_code: $('#msic_code').val(),
        
        // 企業類型和價格相關
        corp_type: $('#corp_type').val(),
        ceiling_charge: $('#ceiling_charge').val(),
        monthly_ceiling: $('#monthly_ceiling').val(),
        default_consultation: $('#default_consultation').val(),
        price_book: $('#price_book').val(),
        stock_price_scheme: $('#stock_price_scheme').val(),
        service_price_scheme: $('#service_price_scheme').val(),
        markup_rate: $('#markup_rate').val(),
        rounding_formula: $('#rounding_formula').val(),
        rounding_by_item: $('#rounding_by_item').is(':checked'),
        rounding_by_billing: $('#rounding_by_billing').is(':checked'),
        
        // 稅務資訊
        brn: $('#brn').val(),
        tin: $('#tin').val(),
        no_einvoice: $('#no_einvoice').is(':checked'),
        sst_no: $('#sst_no').val(),
        sst_exempted: $('#sst_exempted').is(':checked'),
        group_company: $('#group_company').val(),
        portal_mapping: $('#portal_mapping').val(),
        
        // 發票選項
        invoiceoption1: $('#invoiceoption1').val(),
        invoiceoption2: $('#invoiceoption2').val(),
        option3: $('#option3').val(),
        option4: $('#option4').val(),
        remark: $('#remark').val()
    };
    
    return formData;
}

function loadClientData(branch, reference) {
    $.ajax({
        url: `/api/corporate/get-client-data?branch=${branch}&reference=${reference}`,
        type: "GET",
        success: function(data) {
            if (data.createdon) {
                // 如果後端是日期時間格式，取前 10 碼 (YYYY-MM-DD)
                const dateValue = data.createdon.split("T")[0];
                $('#opendate').val(dateValue);
            }
            
            // 把資料塞進表單
            for (let key in data) {
                const el = $(`#${key}`);
                if (el.length) {
                    if (el.attr("type") === "checkbox") {
                        el.prop("checked", data[key] ? true : false);
                    } else {
                        el.val(data[key]);
                    }
                }
            }
            console.log("載入客戶資料成功", data);
        },
        error: function(xhr, status, error) {
            showErrorToast("無法載入客戶資料");
            console.error("Load client error:", xhr, status, error);
        }
    });
}

// Load data and add search to selects (修改為不使用 await)
function loadSelectData() {
    // 載入 State 選項
    loadStateOptions();
    
    // 載入 Country 選項
    loadCountryOptions();
}

function loadStateOptions() {
    $.ajax({
        url: '/api/state/',
        type: 'GET',
        success: function(response) {
            const select = $('#statecode');
            
            if (response.data && Array.isArray(response.data)) {
                response.data.forEach(function(item) {
                    // 避免重複加入現有選項
                    if (select.find(`option[value="${item.code}"]`).length === 0) {
                        const option = $('<option></option>')
                            .attr('value', item.code)
                            .text(item.state);
                        select.append(option);
                    }
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading state options:', error);
        }
    });
}

function loadCountryOptions() {
    $.ajax({
        url: '/api/country/',
        type: 'GET',
        success: function(response) {
            const select = $('#country');
            
            if (response.data && Array.isArray(response.data)) {
                response.data.forEach(function(item) {
                    // 避免重複加入現有選項（如 Malaysia）
                    if (select.find(`option[value="${item.code}"]`).length === 0) {
                        const option = $('<option></option>')
                            .attr('value', item.code)
                            .text(item.description);
                        select.append(option);
                    }
                });
            }
        },
        error: function(xhr, status, error) {
            console.error('Error loading country options:', error);
        }
    });
}

// 舊的 fetchModelData 函數改為使用 jQuery Ajax
function fetchModelData(modelName, callback) {
    $.ajax({
        url: `/api/${modelName}/`,
        type: 'GET',
        success: function(response) {
            if (callback) callback(response);
        },
        error: function(xhr, status, error) {
            console.error(`Error fetching ${modelName}:`, error);
            if (callback) callback({ data: [] });
        }
    });
}

function validateRequiredFields() {
    let isValid = true;
    const errors = [];
    
    $('.is-invalid').removeClass('is-invalid');
    $('.invalid-feedback').remove();
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (!element) {
            console.warn(`找不到欄位: ${field.id}`);
            return;
        }
        
        const value = element.value.trim();
        
        if (!value) {
            isValid = false;
            errors.push(field.name);
            
            $(element).addClass('is-invalid');
        }
    });
    
    if (!isValid) {
        const firstError = $('.is-invalid').first();
        if (firstError.length) {
            $(window).scrollTop(firstError.offset().top - 100);
        }
    }
    
    return isValid;
}

// 提交表單資料到後端
function submitFormData(formData, apiUrl) {
    $.ajax({
        url: apiUrl,
        type: 'POST',
        data: JSON.stringify(formData),
        contentType: 'application/json',
        dataType: 'json',
        headers: {
            'X-CSRFToken': $('[name=csrfmiddlewaretoken]').val()
        },
        success: function(response) {
            $('#loadingSpinner').addClass('d-none');
            $('#saveCustomer').prop('disabled', false);

            if (response.status === 'success') {
                resetForm();
                setTimeout(() => {
                    window.location.href = '/client-data/';
                }, 500);
            } else {
                showErrorToast('Failed to save corporate information');
            }
        },
        error: function(xhr, status, error) {
            $('#loadingSpinner').addClass('d-none');
            $('#saveCustomer').prop('disabled', false);

            let errorMessage = 'An error occurred while saving';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMessage = xhr.responseJSON.message;
            }
            showErrorToast(errorMessage);
            console.error('Save error:', xhr, status, error);
        }
    });
}

// 顯示錯誤訊息
function showErrorToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('errorToast'));
    $('#errorToast .toast-body').text(message);
}

// 顯示錯誤訊息 (用於驗證)
function showErrorMessage(message) {
    // 如果有錯誤提示區域，顯示在那裡
    const errorDiv = $('#errorMessage');
    if (errorDiv.length) {
        errorDiv.text(message).show();
    } else {
        // 如果沒有專門的錯誤區域，使用 alert
        alert(message);
    }
}

// 重置表單（可選用）
function resetForm() {
    $('#corporateForm')[0].reset();
    $('.is-invalid').removeClass('is-invalid');
    $('.invalid-feedback').remove();
    
    // 重新設定今天的日期
    const today = new Date().toISOString().split('T')[0];
    $('#opendate').val(today);
    
    // 重新勾選 Active checkbox
    $('#isactive').prop('checked', true);
}