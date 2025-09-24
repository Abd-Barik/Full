        // In-memory user data storage (since we can't use localStorage in Claude artifacts)
        let userData = null;

        // Tab switching functionality
        function switchTab(tabName) {
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to selected tab and button
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');

            // Update main page display when switching to main tab
            if (tabName === 'main') {
                updateMainPageDisplay();
            }
        }

        // Generate unique user key
        function generateUserKey() {
            return 'USR_' + Math.random().toString(36).substr(2, 9).toUpperCase() + '_' + Date.now().toString(36).toUpperCase();
        }

        // Hash password (simple implementation - in production, use proper hashing)
        function hashPassword(password) {
            let hash = 0;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16);
        }

        // Registration form submission
        document.getElementById('registration-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Validation
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long!');
                return;
            }

            // Create user data
            const userKey = generateUserKey();
            const hashedPassword = hashPassword(password);
            
            userData = {
                username: username,
                email: email,
                userKey: userKey,
                hashedPassword: hashedPassword,
                registrationDate: new Date().toISOString(),
                isLoggedIn: true
            };

            // In a real Django application, you would send this data to the backend:
            /*
            fetch('/api/register/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')  // Django CSRF token
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    user_key: userKey
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Handle successful registration
                    showSuccessMessage();
                } else {
                    // Handle registration errors
                    alert('Registration failed: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Registration failed. Please try again.');
            });
            */

            // Show success message
            showSuccessMessage();
            
            // Reset form
            document.getElementById('registration-form').reset();
            
            // Auto switch to main page after 2 seconds
            setTimeout(() => {
                switchTab('main');
                document.querySelector('.tab-button').click();
            }, 2000);
        });

        function showSuccessMessage() {
            const successMsg = document.getElementById('success-message');
            successMsg.style.display = 'block';
            
            // Hide success message after 3 seconds
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);
        }

        function updateMainPageDisplay() {
            const userDisplay = document.getElementById('user-display');
            const guestMessage = document.getElementById('guest-message');
            const dashboardFeatures = document.getElementById('dashboard-features');

            if (userData && userData.isLoggedIn) {
                // Show user information
                document.getElementById('display-username').textContent = userData.username;
                document.getElementById('display-email').textContent = userData.email;
                document.getElementById('display-key').textContent = userData.userKey;
                
                userDisplay.style.display = 'block';
                guestMessage.style.display = 'none';
                dashboardFeatures.style.display = 'grid';
            } else {
                // Show guest message
                userDisplay.style.display = 'none';
                guestMessage.style.display = 'block';
                dashboardFeatures.style.display = 'none';
            }
        }

        function logout() {
            if (userData) {
                userData.isLoggedIn = false;
            }
            updateMainPageDisplay();
            
            // In a Django application, you would also call the logout endpoint:
            /*
            fetch('/api/logout/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Handle successful logout
                    updateMainPageDisplay();
                }
            });
            */
        }

        // Django CSRF token helper function (for future Django integration)
        function getCookie(name) {
            let cookieValue = null;
            if (document.cookie && document.cookie !== '') {
                const cookies = document.cookie.split(';');
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i].trim();
                    if (cookie.substring(0, name.length + 1) === (name + '=')) {
                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                        break;
                    }
                }
            }
            return cookieValue;
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            updateMainPageDisplay();
        });

        // Add click handlers for tab buttons
        document.addEventListener('DOMContentLoaded', function() {
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach((button, index) => {
                button.addEventListener('click', function() {
                    const tabName = index === 0 ? 'main' : 'register';
                    switchTab(tabName);
                });
            });
        });