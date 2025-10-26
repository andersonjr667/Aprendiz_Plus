// Toggle sidebar collapse state
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.admin-sidebar');
    const toggleBtn = document.querySelector('.toggle-sidebar');
    const savedState = localStorage.getItem('adminSidebarCollapsed');

    // Initialize from saved state
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        toggleBtn.classList.add('collapsed');
    }

    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        toggleBtn.classList.toggle('collapsed');
        
        // Save state
        localStorage.setItem('adminSidebarCollapsed', sidebar.classList.contains('collapsed'));
    });
});