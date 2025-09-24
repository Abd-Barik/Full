
/**
 * Convenience function to fetch and populate form with item data
 * @param {string|number} itemRno - The item_rno to fetch
 */
async function loadItemData(itemRno) {
    if (!itemRno) {
        console.error('Item RNO is required');
        return;
    }
    
    try {
        // Show loading indicator
        showLoadingState(true);

        // Fetch data directly using the specific API endpoint format
        const response = await fetch(`/api/itemmaster/stock_item_master_view/${itemRno}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
            const form = document.getElementById('medicationForm');
            if (form) {
                populateFormFields(form, data.data);
                console.log('Form populated successfully with item_rno:', itemRno);
            }
        } else {
            throw new Error(data.message || 'Failed to fetch item data');
        }

    } catch (error) {
        console.error('Error loading item data:', error);
        showErrorMessage('Failed to load item data: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

/**
 * Populates form fields with the provided data
 */
function populateFormFields(form, data) {
    Object.keys(data).forEach(fieldName => {
        const fieldValue = data[fieldName];
        const elements = form.querySelectorAll(`[name="${fieldName}"]`);
        
        elements.forEach(element => {
            populateField(element, fieldValue);
        });
    });
}

/**
 * Populates a single form field based on its type
 */
function populateField(element, value) {
    if (!element || value === null || value === undefined) return;

    const tagName = element.tagName.toLowerCase();
    const type = element.type ? element.type.toLowerCase() : '';

    switch (tagName) {
        case 'input':
            populateInput(element, value, type);
            break;
        case 'select':
            populateSelect(element, value);
            break;
        case 'textarea':
            element.value = value;
            break;
    }
}

/**
 * Populates input fields based on their type
 */
function populateInput(input, value, type) {
    switch (type) {
        case 'checkbox':
            input.checked = Boolean(value);
            input.dispatchEvent(new Event('change', { bubbles: true }));
            break;
        case 'radio':
            if (input.value === String(value)) {
                input.checked = true;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            break;
        case 'date':
            if (value) {
                input.value = formatDateForInput(value);
            }
            break;
        default:
            // 👇 新增：如果是数字，去掉不必要的小数
            if (!isNaN(value) && value !== '' && value !== null) {
                const num = parseFloat(value);
                // 如果是整数，显示整数，否则保留原值
                input.value = Number.isInteger(num) ? num : value;
            } else {
                input.value = value;
            }
            break;
    }

    // Handle flatpickr date inputs
    // Handle flatpickr date inputs
    if (input.hasAttribute('data-provider') && input.getAttribute('data-provider') === 'flatpickr') {
        if (value && input._flatpickr) {
            input._flatpickr.setDate(value, true); 
        }
    }

}


/**
 * Populates select fields
 */
function populateSelect(select, value) {
    const stringValue = String(value);
    const option = select.querySelector(`option[value="${stringValue}"]`);
    if (option) {
        select.value = stringValue;
        
        // Handle Choices.js if present
        if (select.hasAttribute('data-choices')) {
            setTimeout(() => {
                if (window.choicesInstances) {
                    const choicesInstance = window.choicesInstances.find(instance => 
                        instance.passedElement.element === select
                    );
                    if (choicesInstance) {
                        choicesInstance.setChoiceByValue(stringValue);
                    }
                }
            }, 100);
        }
        
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

/**
 * Date formatting functions
 */
function formatDateForInput(dateValue) {
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    } catch (error) {
        return '';
    }
}

function formatDateForFlatpickr(dateValue) {
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (error) {
        return '';
    }
}

/**
 * Sets form to view or edit mode
 */
function setFormViewMode(viewMode = true) {
    const form = document.getElementById('medicationForm');
    if (!form) return;

    const formControls = form.querySelectorAll('input, select, textarea');
    
    formControls.forEach(control => {
        control.disabled = viewMode;
        if (viewMode) {
            
            control.style.cursor = 'not-allowed';
        } else {
            control.style.backgroundColor = '';
            control.style.cursor = '';
        }
    });

    // Handle Choices.js
    const choicesSelects = form.querySelectorAll('select[data-choices]');
    choicesSelects.forEach(select => {
        if (window.choicesInstances) {
            const choicesInstance = window.choicesInstances.find(instance => 
                instance.passedElement.element === select
            );
            if (choicesInstance) {
           
                viewMode ? choicesInstance.disable() : choicesInstance.enable();
            }
        }
    });

    // Handle buttons
    const saveButton = document.querySelector('button[type="submit"], .btn-success');
    if (saveButton) {
        saveButton.style.display = viewMode ? 'none' : '';
    }
}

/**
 * Utility functions
 */
function getCsrfToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfInput ? csrfInput.value : '';
}

function showLoadingState(show) {
    // You can customize this based on your loading implementation
    const form = document.getElementById('medicationForm');
    if (form) {
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => input.disabled = show);
    }
}

function showErrorMessage(message) {
    alert(message); // Replace with your notification system
}

document.addEventListener('DOMContentLoaded', function() {
    const medicationForm = document.getElementById('medicationForm');
    const saveButton = document.querySelector('button[type="submit"]');
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || '';
    const itemRno = params.get('item_rno') || params.get('rno');
    
    console.log('Mode:', mode, 'Item RNO:', itemRno);
    
    // Load data if item_rno exists and mode is edit or view
    if (itemRno && (mode === 'edit' || mode === 'view')) {
        loadItemData(itemRno);
        
        // Set form to view mode if needed
        if (mode === 'view') {
            setTimeout(() => {
                setFormViewMode(true);
            }, 500); // Wait for data to load first
        }
    }
    
    // Handle different modes
    if (mode === 'view') {
        // VIEW MODE - Hide save button
        if (saveButton) saveButton.style.display = 'none';
        
    } // EDIT MODE - Fixed to work with your Python function
    if (mode === 'edit') {
        console.log("Edit mode activated");
        if (saveButton) {
            saveButton.addEventListener('click', function(e) {
                e.preventDefault();
                if (!medicationForm.checkValidity()) {
                medicationForm.reportValidity(); // 原生提示
                return false;
                }

                if (!validateForm()) {
                    return false;
                }
                
                // Get item_rno for the URL
                const urlParams = new URLSearchParams(window.location.search);
                const itemRnoField = urlParams.get("item_rno");
                
               
                
                const itemRno = itemRnoField;
                
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
                this.disabled = true;
                
                // Get form data and convert to JSON object
                const formData = new FormData(medicationForm);
                const jsonData = {};
                
                // Convert FormData to regular object
                for (let [key, value] of formData.entries()) {
                    jsonData[key] = value;
                }
                
                // Handle checkboxes - ensure they're boolean
                const checkboxes = ['isactive', 'noexpirydateitem', 'istaxable', 'labelprint', 'isvaccine', 'iscontroldrug', 'itemwithserial', 'istaxinclusive'];
                checkboxes.forEach(name => {
                    const checkbox = medicationForm.querySelector(`[name="${name}"]`);
                    if (checkbox && checkbox.type === 'checkbox') {
                        jsonData[name] = checkbox.checked;
                    }
                });
                
                // Send AJAX request for UPDATE with correct URL pattern
                fetch(`/api/itemmaster/stock_item_master_update/${itemRno}/`, {
                    method: 'POST',
                    body: JSON.stringify(jsonData),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Item updated successfully!');
                    } else {
                        alert('Error updating item: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error updating item: ' + error.message);
                })
                .finally(() => {
                    // Restore button state and redirect
                    this.innerHTML = originalText;
                    this.disabled = false;
                    window.location.href = "/itemmaster/stock_item_master/";
                });
            });
        }
    }else {
        // CREATE MODE (no mode parameter or mode is empty) - Create new item
        console.log("Create mode activated (no mode specified)");
        if (saveButton) {
            saveButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (!validateForm()) {
                    return false;
                }
                
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
                this.disabled = true;
                
                // Get form data
                const formData = new FormData(medicationForm);
                
                // Convert checkboxes to boolean values
                const checkboxes = ['isactive', 'noexpirydateitem', 'istaxable', 'labelprint', 'isvaccine', 'iscontroldrug', 'itemwithserial', 'istaxinclusive'];
                checkboxes.forEach(name => {
                    const checkbox = medicationForm.querySelector(`[name="${name}"]`);
                    if (checkbox && checkbox.type === 'checkbox') {
                        formData.set(name, checkbox.checked);
                    }
                });
                
                // Send AJAX request for CREATE
                fetch('/api/itemmaster/stock_item_master_form_submit/', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Item created successfully!');
                        
                        // Update item number if provided
                        if (data.item_rno) {
                            const itemNoField = medicationForm.querySelector('[name="itemno"]');
                            if (itemNoField) {
                                itemNoField.value = data.item_rno;
                            }
                        }
                    } else {
                        alert('Error creating item: ' + (data.message || 'Unknown error'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error creating item: ' + error.message);
                })
                .finally(() => {
                    // Restore button state and redirect
                    this.innerHTML = originalText;
                    this.disabled = false;
                    window.location.href = "/itemmaster/stock_item_master/";
                });
            });
        }
    }
    
    // Form submit event handler
    if (medicationForm) {
        medicationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (saveButton) {
                saveButton.click();
            }
        });
    }

    // Validation function
    function validateForm() {
        console.log("Validating form...");
        
        // Check if form exists
        if (!medicationForm) {
            console.error("Form not found!");
            return false;
        }
        
        // Validate item name
        
        
        // Add more validation as needed
        console.log("Form validation passed");
        return true;
    }
    
    // Debug: Log when script finishes loading
    console.log("Script loaded successfully. Mode:", mode, "Save button found:", !!saveButton);
});

// Additional debugging function to test
function debugFormState() {
    const form = document.getElementById('medicationForm');
    const saveButton = document.querySelector('button[type="submit"]');
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || '';
    
    console.log("=== FORM DEBUG INFO ===");
    console.log("Form found:", !!form);
    console.log("Save button found:", !!saveButton);
    console.log("Current mode:", mode);
    console.log("URL parameters:", Object.fromEntries(params));
    
    if (saveButton) {
        console.log("Save button text:", saveButton.textContent);
        console.log("Save button disabled:", saveButton.disabled);
    }
}
