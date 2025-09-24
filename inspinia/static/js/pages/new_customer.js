// Simple select with search - using default colors






document.addEventListener('DOMContentLoaded', async function () {
    const saveButton = document.getElementById('saveCustomer');
    const form = document.getElementById('customerForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const dateInput = document.getElementById('patient_dateofbirth');
    lucide.createIcons();
    const params = new URLSearchParams(window.location.search);
    const customerRno = params.get('customer_rno');
    
    const mode = params.get('mode') || '';
    const branchRno = params.get('branch_rno');
    if (mode === 'view') {
        // 隐藏保存按钮和加载动画
        if (saveButton) saveButton.style.display = 'none';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    
    }else if(mode === 'edit'){
        initializeCustomerNoLock();
    }
    
    
    


    document.querySelectorAll('.card').forEach((card, index) => {
    // 跳过第一个
    if (index === 0) return;

    const header = card.querySelector('.card-header');
    const body = card.querySelector('.card-body');
    const icon = card.querySelector('.toggleIcon');

    header.addEventListener('click', () => {
        const isExpanded = body.style.maxHeight && body.style.maxHeight !== '0px';

        if (isExpanded) {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
        } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        body.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
        }
    });
    });

    // 初始化生日日期選擇器
    const datePickerLocale = {
        firstDayOfWeek: 1,
        weekdays: {
            shorthand: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            longhand: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        },
        months: {
            shorthand: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            longhand: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        }
    };
    
    // 初始化生日日期選擇器
    const birthDatePicker = flatpickr(dateInput, {
        dateFormat: "Y-m-d",
        maxDate: "today",
        allowInput: false,
        clickOpens: true,
        locale: datePickerLocale,
        onChange: function(selectedDates, dateStr, instance) {
            calculateAge(selectedDates[0]);
        },
        onReady: function(selectedDates, dateStr, instance) {
            instance.calendarContainer.classList.add('flatpickr-custom');
        }
    });
    
   


    

    function calculateAge(birthDate) {
        const ageDisplay = document.getElementById('ageDisplay');
        const ageText = document.getElementById('ageText');
        if (!birthDate) {
            ageText.textContent = '';
            ageDisplay.classList.remove('has-age');
            return;
        }

        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();

        if (days < 0) {
            months--;
            const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            days += lastMonth.getDate();
        }

        if (months < 0) {
            years--;
            months += 12;
        }

        let ageString = `${years} year(s)`;
        if (months > 0) ageString += ` ${months} month(s)`;
        if (days > 0 && months === 0) ageString += ` ${days} day(s)`;

        ageText.textContent = ageString;
        ageDisplay.classList.add('has-age');
    }

    

    form.addEventListener('submit', function (e) {
        const discountLevel = document.getElementById('discountLevel').value;
        if (!discountLevel) {
            alert('Please select a valid discount level.');
            e.preventDefault();
        }
    });

    

    if (branchRno && customerRno) {
        loadCustomer(branchRno, customerRno, mode);
    }

   // 优化后的保存按钮事件处理
    saveButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 验证表单
        const validation = validateForm();
        if (!validation.isValid) {
            const errorMessage = `Please fill in the following required fields: ${validation.missingFields.join(', ')}`;
            document.getElementById('errorMessage').textContent = errorMessage;
            showToast('errorToast');
            
            if (validation.firstEmptyField) {
                validation.firstEmptyField.focus();
                validation.firstEmptyField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
        
        if (mode === 'edit') {
            showLoading(true);
            UpdateFormData();
        }else{
            // 显示加载动画
            showLoading(true);
            
            // 根据是否有照片选择发送方式
            sendFormData();
        }
        


    });

    function sendFormData() {
    const formData = new FormData();
    
    // 添加所有表单字段
    const form = document.getElementById('customerForm');
    const formInputs = new FormData(form);
    
    for (let [key, value] of formInputs.entries()) {
        // 跳过空值，减少数据传输量
        if (value && value.toString().trim() !== '') {
            formData.append(key, value);
        }
    }
    
    // 只有在确实选择了照片时才添加
    if (selectedPhotoFile) {
        console.log('Adding photo file:', selectedPhotoFile.name, selectedPhotoFile.size);
        formData.append('photo', selectedPhotoFile);
    } else {
        console.log('No photo selected');
    }
    
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    

    for (let [key, value] of formData.entries()) {
    console.log(key, value);
}
    fetch('/api/customer/save/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
        },
        body: formData,
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        return handleResponse(response);
    })
    .then(data => handleSuccess(data))
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            handleError({ error: 'Request timeout. Please try again.' });
        } else {
            handleError(error);
        }
    });
    }
    // 统一的数据发送函数


// 修改后的 UpdateFormData 函数
// 全局变量存储原始数据
let originalFormData = {};
let originalPhotoData = null;
let hasNewPhotoUpload = false;

// 保存原始表单数据
function saveOriginalFormData() {
    const form = document.getElementById('customerForm');
    originalFormData = {};
    
    // 保存所有 input, select, textarea 的原始值
    form.querySelectorAll('input, select, textarea').forEach(element => {
        if (element.type === 'checkbox') {
            originalFormData[element.name || element.id] = element.checked;
        } else if (element.type === 'file') {
            // 文件类型跳过，因为无法设置原始值
            return;
        } else {
            originalFormData[element.name || element.id] = element.value;
        }
    });
    
    // 保存原始照片数据（如果有的话）
    const hiddenPhotoInput = form.querySelector('input[name="photo"][type="hidden"]');
    if (hiddenPhotoInput && hiddenPhotoInput.value) {
        originalPhotoData = hiddenPhotoInput.value;
    }
    
    // 重置新照片上传标记
    hasNewPhotoUpload = false;
    
    console.log('Original form data saved:', Object.keys(originalFormData).length, 'fields');
    console.log('Original photo data:', originalPhotoData ? 'exists' : 'none');
}

// 检测表单数据是否有变动
function hasFormDataChanged() {
    const form = document.getElementById('customerForm');
    const changedFields = [];
    
    // 检查所有表单字段
    form.querySelectorAll('input, select, textarea').forEach(element => {
        const fieldName = element.name || element.id;
        
        if (element.type === 'checkbox') {
            if (originalFormData[fieldName] !== element.checked) {
                changedFields.push(fieldName);
            }
        } else if (element.type === 'file') {
            // 文件字段单独处理
            return;
        } else {
            if (originalFormData[fieldName] !== element.value) {
                changedFields.push(fieldName);
            }
        }
    });
    
    return {
        hasChanges: changedFields.length > 0 || hasNewPhotoUpload,
        changedFields: changedFields,
        hasNewPhoto: hasNewPhotoUpload
    };
}

// 修改照片选择处理函数
window.handlePhotoSelect = function(event) {
    const file = event.target.files[0];
    
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('Please select an image smaller than 5MB.');
            return;
        }
        
        selectedPhotoFile = file;
        hasNewPhotoUpload = true; // ✅ 标记有新照片上传
        displayPhotoPreview(file);
        
        console.log('New photo uploaded, marked as changed');
    }
};

// 修改移除照片函数
window.removePhoto = function() {
    const photoBox = document.getElementById('photoBox');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    const photoInput = document.getElementById('photoInput');
    
    const existingPreview = photoBox.querySelector('.photo-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    // 删除 hidden input
    const form = document.getElementById('customerForm');
    const hiddenInput = form.querySelector('input[name="photo"][type="hidden"]');
    if (hiddenInput) {
        hiddenInput.remove();
    }
    
    photoPlaceholder.style.display = 'flex';
    photoBox.classList.remove('has-image');
    photoInput.value = '';
    selectedPhotoFile = null;
    
    // ✅ 标记照片已改变（删除也是改变）
    hasNewPhotoUpload = originalPhotoData ? true : false;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log('Photo removed, marked as changed');
};

// 修改后的 UpdateFormData 函数
function UpdateFormData() {
    // ✅ 首先检测是否有变动
    const changeDetection = hasFormDataChanged();
    
    if (!changeDetection.hasChanges) {
        console.log('No changes detected, skipping update');
        showLoading(false);
        
        // 显示信息提示
        document.querySelector('#successToast .toast-body').textContent = 'No changes to save.';
        showToast('successToast');
        return;
    }
    
    console.log('Changes detected in fields:', changeDetection.changedFields);
    console.log('New photo uploaded:', changeDetection.hasNewPhoto);
    
    const formData = new FormData();
    const form = document.getElementById('customerForm');
    
    // 只添加有变动的字段
    for (let [key, value] of new FormData(form).entries()) {
        if (key === 'photo') {
            if (selectedPhotoFile && hasNewPhotoUpload) {
                // ✅ 只有真正上传新照片时才发送
                console.log('Adding new photo file:', selectedPhotoFile.name, selectedPhotoFile.size);
                formData.append('photo', selectedPhotoFile);
            }
            // ✅ 如果没有新照片上传，就不发送 photo 字段，让后端保持原有数据
        } else {
            // 其他字段正常添加
            if (value && value.toString().trim() !== '') {
                formData.append(key, value);
            }
        }
    }
    
    // 添加必要的系统字段
    const params = new URLSearchParams(window.location.search);
    const customerRno = params.get('customer_rno');
    if (customerRno) {
        formData.append('customer_rno', customerRno);
    }

    const branchRno = params.get('branch_rno');
        if (branchRno){
            formData.append('branch_rno', branchRno);
        }
    
    // ✅ 添加变动检测标记
    formData.append('photo_changed', hasNewPhotoUpload ? 'true' : 'false');

    // 调试输出
    console.log('=== 提交的数据 ===');
    for (let [key, value] of formData.entries()) {
        if (key === 'photo') {
            console.log(key, '-> file:', value.name, value.size);
        } else {
            console.log(key, '->', value);
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    fetch('/api/customer/update/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
        },
        body: formData,
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        return handleResponse(response);
    })
    .then(data => {
        handleSuccess(data);
        // ✅ 更新成功后，重新保存当前状态为原始状态
        setTimeout(saveOriginalFormData, 100);
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            handleError({ error: 'Request timeout. Please try again.' });
        } else {
            handleError(error);
        }
    });
}

// 修改 loadCustomer 函数，加载完成后保存原始数据
const originalLoadCustomer = window.loadCustomer;
window.loadCustomer = function(customerRno, mode = 'view') {
    return originalLoadCustomer(customerRno, mode).then(() => {
        // ✅ 数据加载完成后保存原始状态
        setTimeout(saveOriginalFormData, 500); // 稍微延迟确保所有数据都已加载
    });
};


    // 优化的响应处理函数
    function handleResponse(response) {
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return response.text().then(text => {
                console.error('Received non-JSON response:', text.substring(0, 500)); // 只显示前500字符
                throw new Error('Server returned invalid response format');
            });
        }
        
        if (!response.ok) {
            return response.json().then(err => {
                console.error('Server error:', err);
                return Promise.reject(err);
            });
        }
        
        return response.json();
    }

    // 显示/隐藏加载状态
    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.classList.remove('d-none');
            saveButton.disabled = true;
            saveButton.innerHTML = '<i data-lucide="loader" class="fs-sm me-2"></i> Saving...';
            // 创建图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            loadingSpinner.classList.add('d-none');
            saveButton.disabled = false;
            saveButton.innerHTML = '<i data-lucide="save" class="fs-sm me-2"></i> Save';
            // 重新创建图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    // 优化的成功处理函数
    function handleSuccess(data) {
        console.log('Success response:', data);
        
        showLoading(false);
        
        if (data.success) {
            const successMessage = data.has_photo 
                ? `Customer  saved successfully with photo!`
                : `Customer  saved successfully!`;
                
            document.querySelector('#successToast .toast-body').textContent = successMessage;
            showToast('successToast');
            
            resetForm();
            
            // 如果有返回URL，跳转回去
            const params = getUrlParams();
            if (params.return_url) {
                setTimeout(() => {
                    window.location.href = decodeURIComponent(params.return_url);
                }, 1500);
            }
        } else {
            const errorMsg = data.error || 'Failed to save customer';
            console.error('Save failed:', errorMsg);
            document.getElementById('errorMessage').textContent = errorMsg;
            showToast('errorToast');
        }
    }

    // 优化的错误处理函数
    function handleError(error) {
        console.error('Request error:', error);
        
        showLoading(false);
        
        let errorMessage = 'Network error occurred';
        
        if (error.error) {
            errorMessage = error.error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        document.getElementById('errorMessage').textContent = errorMessage;
        showToast('errorToast');
    }

    // 优化照片处理函数
    function displayPhotoPreview(file) {
        // 提前检查文件大小和类型
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('File size too large. Maximum size is 5MB.');
            selectedPhotoFile = null;
            return;
        }
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            alert('Invalid file type. Only JPG, PNG, and GIF files are allowed.');
            selectedPhotoFile = null;
            return;
        }
        
        const photoBox = document.getElementById('photoBox');
        const photoPlaceholder = document.getElementById('photoPlaceholder');
        const photoOverlay = document.getElementById('photoOverlay');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                photoPlaceholder.style.display = 'none';
                
                const existingPreview = photoBox.querySelector('.photo-preview');
                if (existingPreview) {
                    existingPreview.remove();
                }
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'photo-preview';
                img.alt = 'Customer Photo Preview';
                
                photoBox.insertBefore(img, photoOverlay);
                photoBox.classList.add('has-image');
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                console.log('Photo preview loaded successfully');
            } catch (previewError) {
                console.error('Error displaying photo preview:', previewError);
                alert('Error displaying photo preview');
                selectedPhotoFile = null;
            }
        };
        
        reader.onerror = function() {
            console.error('FileReader error');
            alert('Error reading file. Please try again.');
            selectedPhotoFile = null;
        };
        
        reader.readAsDataURL(file);
    }
    

    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            return_url: urlParams.get('return_url')
        };
    }

    function getReturnUrl() {
        const params = getUrlParams();
        return params.return_url ? decodeURIComponent(params.return_url) : '/default-return-url/';
    }

    function showToast(toastId) {
        const toastElement = document.getElementById(toastId);
        if (toastElement && typeof bootstrap !== 'undefined') {
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        }
    }

    let selectedPhotoFile = null;

// 觸發照片上傳
    window.triggerPhotoUpload = function() {
        document.getElementById('photoInput').click();
    };
    
    // 處理照片選擇
    
    
    // 顯示照片預覽
    function displayPhotoPreview(file) {
        const photoBox = document.getElementById('photoBox');
        const photoPlaceholder = document.getElementById('photoPlaceholder');
        const photoOverlay = document.getElementById('photoOverlay');
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            photoPlaceholder.style.display = 'none';
            
            const existingPreview = photoBox.querySelector('.photo-preview');
            if (existingPreview) {
                existingPreview.remove();
            }
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'photo-preview';
            img.alt = 'Customer Photo Preview';
            
            photoBox.insertBefore(img, photoOverlay);
            photoBox.classList.add('has-image');
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    // 移除照片
    window.removePhoto = function() {
        const photoBox = document.getElementById('photoBox');
        const photoPlaceholder = document.getElementById('photoPlaceholder');
        const photoInput = document.getElementById('photoInput');
        
        const existingPreview = photoBox.querySelector('.photo-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
        
        photoPlaceholder.style.display = 'flex';
        photoBox.classList.remove('has-image');
        photoInput.value = '';
        selectedPhotoFile = null;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    };
    
    // 獲取選擇的照片文件
    window.getSelectedPhotoFile = function() {
        return selectedPhotoFile;
    };


    const requiredFields = [
        
        
        { id: 'name', name: 'name' },
        { id: 'icno', name: 'icno' },
        { id: 'gender', name: 'gender'},
        { id: 'patient_dateofbirth', name: 'patient_dateofbirth'},
        { id: 'phone1', name: 'phone1' },
        { id: 'inv_address1', name: 'inv_address1' },
        { id: 'patient_postcode', name: 'patient_postcode' },
        { id: 'statecode', name: 'statecode' },
        { id: 'country', name: 'country' },
        { id: 'citizenship', name: 'citizenship' }
    ];

    function validateForm() {
        const missingFields = [];
        let firstEmptyField = null;
        
        // 檢查必填字段
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                missingFields.push(field.name);
                if (!firstEmptyField) {
                    firstEmptyField = element;
                }
                if (element) {
                    element.classList.add('is-invalid');
                }
            } else {
                if (element) {
                    element.classList.remove('is-invalid');
                }
            }
        });
        
        // 驗證 Email 格式
        const email = document.getElementById('email').value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) {
            missingFields.push('Valid Email Format');
            document.getElementById('email').classList.add('is-invalid');
        }
        
        // 驗證國籍是否已選擇
        
        
        return { isValid: missingFields.length === 0, missingFields, firstEmptyField };
    }

    function resetForm() {
        form.reset();
        
        
        // 重置年龄显示
        document.getElementById('ageText').textContent = '';
        document.getElementById('ageDisplay').classList.remove('has-age');
        
        // 重置国籍选择
        citizenship.value = '';
        
        // 重置照片
        window.removePhoto();
        
        // 移除所有错误样式
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }

    

    
});