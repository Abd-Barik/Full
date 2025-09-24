document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll('[data-choices]');
    if (elements && elements.length > 0) {
        window.choicesInstances = window.choicesInstances || []; // 初始化全局存储

        elements.forEach(item => {
            const config = {
                placeholderValue: item.hasAttribute("data-choices-groups") ? "This is a placeholder set in the config" : undefined,
                searchEnabled: item.hasAttribute("data-choices-search-true"),
                removeItemButton: item.hasAttribute("data-choices-removeItem") || item.hasAttribute("data-choices-multiple-remove"),
                shouldSort: !item.hasAttribute("data-choices-sorting-false"),
                maxItemCount: item.getAttribute("data-choices-limit") || undefined,
                duplicateItemsAllowed: !item.hasAttribute("data-choices-text-unique-true"),
                addItems: !item.hasAttribute("data-choices-text-disabled-true")
            };

            const instance = new Choices(item, config);

            // ✅ 保存到全局
            window.choicesInstances.push(instance);

            // 修复 z-index
            const dropdown = instance.dropdown.element;
            if (dropdown) {
                dropdown.style.zIndex = "999999";
                dropdown.style.position = "absolute";
            }
        });
    }
});
