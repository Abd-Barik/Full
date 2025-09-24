function showPhotoPreview(base64Data) {
    try {
        const photoBox = document.getElementById('photoBox');
        const photoPlaceholder = document.getElementById('photoPlaceholder');
        const photoOverlay = document.getElementById('photoOverlay');

        // 隐藏 placeholder
        photoPlaceholder.style.display = 'none';

        // 删除已有的预览图，但保留隐藏字段
        const existingPreview = photoBox.querySelector('.photo-preview');
        if (existingPreview) existingPreview.remove();

        // 检查是否已存在隐藏输入字段
        let hiddenInput = photoBox.querySelector('input[name="photo"]');
        if (!hiddenInput) {
            // 创建隐藏输入字段
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'photo';
            photoBox.insertBefore(hiddenInput, photoOverlay);
        }
        
        // 设置照片数据（无论是从DB还是新上传的）
        hiddenInput.value = base64Data;

        // 创建新的预览图
        const img = document.createElement('img');
        img.src = `data:image/jpeg;base64,${base64Data}`;
        img.className = 'photo-preview';
        img.alt = 'Customer Photo Preview';

        // 插入预览图
        photoBox.insertBefore(img, photoOverlay);
        photoBox.classList.add('has-image');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (previewError) {
        console.error('Error displaying photo preview:', previewError);
    }
}

async function loadCustomer(branchRno,customerRno, mode = 'view') {
    try {
        const response = await fetch(`/api/customer_detail/${encodeURIComponent(customerRno)}`);
        if (!response.ok) throw new Error('Customer not found');

        const json = await response.json();
        if (!json.data || json.data.length === 0) throw new Error('Customer not found');

        const customer = json.data[0]; // 取第一个客户对象

        Object.keys(customer).forEach(key => {
            const el = document.getElementById(key);
            if (!el) return;

            let value = customer[key];

            // 自动识别日期字段
            if (key.toLowerCase().includes('date') && value) {
                const date = new Date(value);
                if (!isNaN(date) && date.getFullYear() > 1900) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    value = `${year}-${month}-${day}`;
                } else {
                    value = '';
                }
            }

            // ✅ 特殊处理照片字段（只在 DB 读取时触发）
            if (key.toLowerCase() === 'photo' && value) {
                showPhotoPreview(value);
                console.log(document.querySelector('input[name="photo"]').value);
                // 在 edit 页面加载后，在浏览器控制台运行：
                console.log('Hidden input exists:', !!document.querySelector('input[name="photo"][type="hidden"]'));
                console.log('Hidden input value:', document.querySelector('input[name="photo"][type="hidden"]')?.value?.length);
                console.log('All photo inputs:', document.querySelectorAll('input[name="photo"]'));
            } else if (el.type === 'checkbox') {
                
                el.checked = (value === true || value === 'true' || value === 1 || value === '1');
            } else if (el.tagName === 'IMG') {
                // 其他 img
                el.src = value ? `data:image/jpeg;base64,${value}` : '';
            } else if (el.tagName === 'SELECT') {
                el.value = value || '';
            } else {
                el.value = value || '';
            }
        });

        // 如果是 view 模式，设置只读 / 禁用
        if (mode === 'view') {
            document.querySelectorAll('input, select, textarea').forEach(el => el.setAttribute('disabled', true));

            // 禁用照片区域的按钮
            document.querySelectorAll('.photo-actions button').forEach(btn => btn.setAttribute('disabled', true));
        }


    } catch (error) {
        console.error('Error loading customer:', error);
        alert('Error loading customer data.');
    }
}

// 确保函数在全局可用
window.loadCustomer = loadCustomer;
