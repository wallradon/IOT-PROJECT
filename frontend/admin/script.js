"use strict"

// ===================== Global App State =====================
const gUsers = "users/getUsers"; // User data path
const gVehicles = "vehicles/getVehicles"; // Vehicle data path
const pVeLog = "logs/getLogs"; // Vehicle log path
let UsersData = [];       // Global variable for user data
let vehiclesData = [];    // Global variable for vehicle data
let VeLog = [];           // Global variable for vehicle logs
let isLoading = true;     // Loading State
// fetchStatus is declared in API.js to track HTTP Response status

const pages = document.querySelectorAll('.page'); // Get all page elements

// Check token
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // If token is expired or invalid (401/403)
            alert('Time out, Please login again');
            localStorage.removeItem('token');
            window.location.href = '../login/login.html';
        }
    } catch (error) {
        console.error('Error verifying token:', error);
    }
}

// checkAuth();


// ===================== Menu Navigation & Page Router =====================
const navItems = document.querySelectorAll('nav li[data-target]'); // Get nav items

/**
 * Function to change page (Page Router)
 * @param {string} target - Target page name (e.g. 'home', 'user', 'vehicle')
 * @param {Object} params - Other parameters for the target page (e.g. { id: 1, carIndex: 0 })
*/
function showPage(target, params) {
    // 1. Hide all pages
    pages.forEach(page => page.classList.remove('active'));

    // 2. Reset nav highlights
    navItems.forEach(li => li.classList.remove('user-select'));

    // 3. Show target page
    const targetPage = document.querySelector(`#page-${target}`);
    if (targetPage) {
        targetPage.classList.add('active');
        renderUserPage(target, params); // Call render data function
    }

    // 4. Highlight active nav item
    const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
    if (activeLi) activeLi.classList.add('user-select');
}

// Click Event to change page
navItems.forEach(li => {
    li.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default behavior
        showPage(li.dataset.target); // Get target from dataset and show page
    });
});

// Show home page first when user logs in
showPage('vehicle');


/**
 * Refresh Current Page
 * Use after fetch API is done
 */
function refreshCurrentPage() {
    // Find active menu and re-render page
    const activeLi = document.querySelector('nav li.user-select');
    if (activeLi) {
        const target = activeLi.dataset.target;
        renderUserPage(target, null);
    }
}

// ===================== Render Router =====================
/**
 * Check data status and render page
 * @param {string} target - Target page
 * @param {Object} params - Parameters
 */
function renderUserPage(target, params) {
    // 1. Find target page element
    const targetPage = document.querySelector(`#page-${target}`);

    // 2. Find loading container in target page
    let loadingContainer = null;
    if (targetPage) {
        loadingContainer = targetPage.querySelector('.dataLoading') || targetPage.querySelector('#UserData');
    }

    // 3. Check loading status: If not done, show loading text
    if (isLoading) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text">Loading data...</p>`;
        }
        return;
    }

    // 4. Check error: If HTTP status is not 200-299, show error text
    if (fetchStatus < 200 || fetchStatus > 299) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text" style="color: red;">Error loading data. Please try again (HTTP Code: ${fetchStatus})</p>`;
        }
        return;
    }

    // 5. If download is complete, show data based on target page
    const renderRoutes = {
        user: () => renderUserList(UsersData),
        userDetail: (params) => renderUserDetail(Number(params.id)),
        editUser: (params) => renderEditUserPage(Number(params.id)),
        vehicleDetail: (params) => renderEachVehicle(Number(params.id), String(params.carPlate)),
        vehicle: () => renderVehicleList(VeLog)
    };

    if (renderRoutes[target]) {
        renderRoutes[target](params);
    } else {
        console.log(`No render function found for target: ${target}`);
    };
}

// ===================== Render VEHICLE DATA Page =====================
/**
 * Function to render vehicle type, plate, and time in/out
 * @param {Array} data - All user data with vehicles
 */
function renderVehicleList(data) {
    const vehicleDataContainer = document.querySelector('#VehicleData');
    if (!vehicleDataContainer) return; // Stop if container not found

    let htmlContent = "";
    let foundCount = 0; // Count found vehicles
    // Loop to check each user data
    data.forEach(d => {
        const plate = d.plate || "-"; // Vehicle plate
        const type = d.type || "-";   // Vehicle type (e.g. car, motorcycle)

        foundCount++;
        // ใช้ Ternary Operator และ Optional Chaining เพื่อกำหนดข้อความในบรรทัดเดียว
        const recordText = d.time_in ? `In: ${d.time_in ?? '-'} | Out: ${d.time_out ?? '-'}` : "No entry/exit records";

        htmlContent += `
        <div class="User VehicleRow">
            <h2>${type}</h2>
            <h2>${plate}</h2>
            <h2>${recordText}</h2>
        </div>
        `;
    });

    // If no vehicles found, show alert
    if (foundCount === 0) {
        htmlContent = `<p class="loading-text">No vehicle data found</p>`;
    }

    // Write HTML to page
    vehicleDataContainer.innerHTML = htmlContent;
}


// ===================== Render USER DATA Page =====================
/**
 * Function to render user numbers and house numbers
 * @param {Array} users - All user data
 */
function renderUserList(users) {
    const userDataContainer = document.querySelector('#UserData');
    if (!userDataContainer) return;

    let htmlContent = "";
    // Loop to create HTML for users
    users.filter(user => user.role === "member").forEach((user, index) => {
        htmlContent += `
        <div class="User" data-id="${user.id}" data-target="userDetail" style="cursor: pointer;">
            <h2>${index + 1}</h2>
            <h2>${user.houseNumber}</h2>
            <!-- Action buttons -->
            <div class="user-actions">
                <button type="button" data-id="${user.id}" data-house-number="${user.houseNumber}" class="delete-user-btn">ลบข้อมูล (Delete)</button>
            </div>
        </div>
        `;
    });
    console.log(users);
    // Add HTML to page at once to reduce reflow/repaint
    userDataContainer.innerHTML = htmlContent;
}

// ===================== Render User Detail Page =====================
/**
 * Function to render user details and vehicles
 * @param {number} userId - User ID
 */
function renderUserDetail(userId) {
    // Find user by ID
    const user = UsersData.find(u => u.id === userId);

    // Find all vehicles of this user
    // Make sure vehiclesData is an array
    const userVehicles = Array.isArray(vehiclesData)
        ? vehiclesData.filter(v => v.user_id === userId)
        : [];

    const userDetailContainer = document.querySelector('#page-userDetail');

    // Prevent app from freezing if user is not found
    if (!user) {
        userDetailContainer.innerHTML = `<p class="loading-text">User not found</p>`;
        return;
    }

    // Loop to get all vehicles and create HTML
    let vehiclesHTML = '';
    if (userVehicles.length > 0) {
        userVehicles.forEach((vehicle, index) => {
            vehiclesHTML += `
            <div class="headVlist">
                <p class="Vlist">${vehicle.plate}</p>
                <p class="Vlist">${vehicle.type}</p>
                <!-- Link to see specific vehicle logs -->
                <a href="#" data-target="vehicleDetail" data-car-plate="${vehicle.plate}" data-id="${user.id}">More info</a>
            </div>`;
        });
    } else {
        // Empty row if no vehicles
        vehiclesHTML = `<div class="headVlist">
                            <p class="Vlist">-</p>
                            <p class="Vlist">-</p>
                            <p></p>
                        </div>`;
    }

    // Update HTML for user details and vehicles
    userDetailContainer.innerHTML = `
            <section class="homeDetail">
                <div class="homeNumber">
                    <p class="homeList">House Number</p>
                    <p class="homeList">${user.houseNumber}</p>
                </div>
                <div class="nameOwner">
                    <p class="homeList">Owner Name</p>
                    <p class="homeList">${user.ownerName}</p>
                </div>
                <div class="TimeData">
                    <p class="homeList">Register Date: ${user.registerDate ?? '-'}</p>
                    <p class="homeList">Member Start Date: ${user.memberStartDate ?? '-'} | Expire Date: ${user.memberExpireDate ?? '-'}</p>
                </div>
            </section>
            <section class="vehicleUser">
                <h1 class="vehicleList">Registered Vehicles</h1>
                <div class="headVlist">
                    <h3 class="Vlist">Plate</h3>
                    <h3 class="Vlist">Type</h3>
                    <h3 class="Vlist">Details</h3>
                </div>
                ${vehiclesHTML}
                </section>
                <div class="edit-user-btn-container">
                <a href="#" data-target="editUser" data-id="${user.id}" class="edit-user-btn">แก้ไขข้อมูลลูกบ้าน (Edit User)</a>
                </div>`;
}


// ===================== Render Vehicle Detail Page =====================
/**
 * Function to render vehicle logs in detail
 * @param {number} userId - User ID
 * @param {number} vehiclePlate - Vehicle plate
 */
function renderEachVehicle(userId, vehiclePlate) {
    // Find user's vehicles
    const vData = vehiclesData.filter(p => p.user_id === userId);
    // Find specific vehicle
    const vehicle = vData.find(v => v.plate === vehiclePlate);
    // Get logs for this vehicle
    const timeStamp = VeLog.filter(t => t.plate === vehiclePlate);

    const vehicleDetailContainer = document.querySelector("#page-vehicleDetail");
    if (!vData) {
        vehicleDetailContainer.innerHTML = `<p class="loading-text">Owner not found</p>`;
        return;
    }

    // Check if vehicle exists
    if (!vehicle) {
        vehicleDetailContainer.innerHTML = `<p class="loading-text">Vehicle not found for this owner</p>`;
        return;
    }

    // Organize in and out times for grid view
    let timeInHTML = '';
    let timeOutHTML = '';

    // Check if there are any logs
    if (timeStamp.length > 0) {
        timeStamp.forEach((timeRecord) => {
            timeInHTML += `
            <span class="time-record">${timeRecord.time_in ?? '-'}</span>
            `;
            timeOutHTML += `
            <span class="time-record">${timeRecord.time_out ?? '-'}</span>
            `;
        });
    } else {
        // If no records found
        timeInHTML += `<span class="time-record">-</span>`;
        timeOutHTML += `<span class="time-record">-</span>`;
    }

    // Create HTML for vehicle card
    let htmlContent = `<div class="vehicle-card">
    <!-- Card header and register date -->
    <div class="v-title">Vehicle Details</div>
    <div class="v-date">Register Date: ${vehicle.registerDate ?? '-'} </div>

    <!-- Details and logs table -->
    <div class="v-grid">
        <div class="v-item">Plate: ${vehicle.plate ?? '-'}</div>
        <div class="v-item">Type: ${vehicle.type ?? '-'}</div>

        <div class="v-item" style="font-weight: bold;">Time In</div>
        <div class="v-item" style="font-weight: bold;">Time Out</div>

        <!-- Time in list (Left) -->
        <div class="v-item v-time" id="time-in-list">
            ${timeInHTML}
        </div>

        <!-- Time out list (Right) -->
        <div class="v-item v-time" id="time-out-list">
            ${timeOutHTML}
        </div>
    </div>
    </div>`;
    vehicleDetailContainer.innerHTML = htmlContent;
}

// ===================== Global Click Event Delegation =====================
// Use event delegation in .main-content to avoid adding new event listeners
document.querySelector('.main-content').addEventListener('click', async (e) => {
    // If clicked on the delete button, prevent default and do not navigate
    const deleteBtn = e.target.closest('.delete-user-btn');
    if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation(); // Stop event bubbling to parent .User div

        const userId = deleteBtn.dataset.id;
        const houseNum = deleteBtn.dataset.houseNumber || userId;

        // Use custom popup instead of native confirm
        showConfirmPopup(
            'ยืนยันการลบข้อมูล',
            `คุณต้องการลบข้อมูลลูกบ้าน เลขที่บ้าน ${houseNum} ใช่หรือไม่?`,
            async () => {
                const result = await deleteUser(userId);
                if (result && result.success) {
                    showToast(`ลบข้อมูลลูกบ้าน "${houseNum}" เรียบร้อยแล้ว`, "สำเร็จ", "success");
                    await getUser(gUsers); // Re-fetch users from API to update UsersData
                    renderUserList(UsersData); // Refresh the list with updated data
                    return true;
                } else {
                    showToast(result?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล', "ข้อผิดพลาด", "error");
                    return false;
                }
            }
        );

        return; // Exit here so it doesn't try to navigate
    }

    // Check if clicked element is an element with data-target
    const link = e.target.closest('[data-target]');
    if (!link) return; // Skip if clicked elsewhere

    e.preventDefault(); // Prevent default behavior

    // Get data from HTML attribute
    const { target, ...params } = link.dataset;

    // Change page and send parameters
    showPage(target, params);
});

function renderEditUserPage(userId) {
    const pageContainer = document.querySelector('#page-editUser');
    if (!pageContainer) return;

    const user = UsersData.find(u => u.id === userId) || {};

    const houseNumber = user.houseNumber || "ERROR";
    const ownerName = user.ownerName || "ERROR";
    const registerDate = user.registerDate || "ERROR";
    const memberStartDate = user.memberStartDate || "ERROR";
    const memberExpireDate = user.memberExpireDate || "ERROR";

    pageContainer.innerHTML = `
        <div class="edit-user-container">
            <h2 class="edit-user-title">แก้ไขข้อมูลลูกบ้าน (Edit User)</h2>
            <form id="editUserForm" class="edit-user-form" data-user-id="${user.id || userId || ''}">
                <div class="form-group">
                    <label for="houseNumber" class="form-label">House Number</label>
                    <input type="text" id="houseNumber" name="houseNumber" value="${houseNumber}" class="form-input">
                </div>
                <div class="form-group">
                    <label for="ownerName" class="form-label">Owner Name</label>
                    <input type="text" id="ownerName" name="ownerName" value="${ownerName}" class="form-input">
                </div>
                <div class="form-group">
                    <label for="registerDate" class="form-label">Register Date</label>
                    <input type="date" id="registerDate" name="registerDate" value="${registerDate}" class="form-input">
                </div>
                <div class="form-group">
                    <label for="memberStartDate" class="form-label">Member Start Date</label>
                    <input type="date" id="memberStartDate" name="memberStartDate" value="${memberStartDate}" class="form-input">
                </div>
                <div class="form-group">
                    <label for="memberExpireDate" class="form-label">Member Expire Date</label>
                    <input type="date" id="memberExpireDate" name="memberExpireDate" value="${memberExpireDate}" class="form-input">
                </div>
                <button type="submit" class="submit-btn">บันทึกข้อมูล (Save)</button>
            </form>
        </div>
    `;

    const form = document.querySelector("#editUserForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Convert YYYY-MM-DD to DD-MM-YYYY for API payload
        const formatDate = (dateStr) => {
            if (!dateStr || dateStr === "ERROR") return "";
            if (dateStr.includes("-")) {
                const [y, m, d] = dateStr.split("-");
                return `${d}-${m}-${y}`;
            }
            return dateStr;
        };

        const targetUserId = form.dataset.userId || userId;
        const updateData = {
            houseNumber: form.houseNumber.value,
            ownerName: form.ownerName.value,
            registerDate: formatDate(form.registerDate.value),
            memberStartDate: formatDate(form.memberStartDate.value),
            memberExpireDate: formatDate(form.memberExpireDate.value),
            role: "member"
        };

        console.log("PUT payload to API:", updateData);

        const result = await updateUser(targetUserId, updateData);

        if (result && result.success) {
            showToast(result.message || "อัปเดตข้อมูลสำเร็จแล้ว", "สำเร็จ", "success");
            await initData(); // Re-fetch updated data
            showPage("userDetail", { id: Number(targetUserId) }); // Back to user detail
        } else {
            showToast(result?.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล", "ข้อผิดพลาด", "error");
        }
    });
}

async function initData() {
    isLoading = true;
    refreshCurrentPage(); // Show loading UI while fetching

    try {
        // Wait for all data to load
        await Promise.all([
            getUser(gUsers),
            getVehicles(gVehicles),
            getVeLog(pVeLog)
        ]);
    } catch (error) {
        console.error("Error loading initial data:", error);
    } finally {
        // When done, stop loading and update UI
        isLoading = false;
        refreshCurrentPage();
    }
}

// Start loading data when app starts
initData();

// ===================== Logout System =====================
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Remove token and data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('role');

        // Redirect to login page
        window.location.href = '../../index.html';
    });
}

// ===================== Custom Confirm Popup =====================
function showConfirmPopup(title, message, onConfirm) {
    const popup = document.getElementById('custom-confirm-popup');
    if (!popup) return;

    const popupTitle = document.getElementById('popup-title');
    const popupMessage = document.getElementById('popup-message');
    const confirmBtn = document.getElementById('popup-confirm-btn');
    const cancelBtn = document.getElementById('popup-cancel-btn');

    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popup.classList.add('active');

    // Remove old event listeners by cloning
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener('click', () => {
        popup.classList.remove('active');
        if (onConfirm) onConfirm();
    });

    newCancelBtn.addEventListener('click', () => {
        popup.classList.remove('active');
    });
}

// ===================== Modern Custom Toast Alert (Uiverse.io by kyle1dev) =====================
/**
 * Show modern success/error toast message
 * @param {string} message - Message body
 * @param {string} title - Message title (Default: "Success")
 * @param {string} type - "success" or "error"
 * @param {number} duration - Auto close timeout in ms
 */
function showToast(message, title = "Success", type = "success", duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `modern-success-message ${type === 'error' ? 'error-type' : ''}`;

    const iconSvg = type === 'error'
        ? `<svg stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="success-icon">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
            <circle r="10" cy="12" cx="12"></circle>
           </svg>`
        : `<svg stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="success-icon">
            <path d="M9 12l2 2 4-4"></path>
            <circle r="10" cy="12" cx="12"></circle>
           </svg>`;

    toast.innerHTML = `
        <!-- From Uiverse.io by kyle1dev -->
        <button class="close-btn">&times;</button>
        <div class="icon-wrapper">
            ${iconSvg}
        </div>
        <div class="text-wrapper">
            <div class="title">${title}</div>
            <div class="message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    const removeToast = () => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        });
    };

    toast.querySelector('.close-btn').addEventListener('click', removeToast);

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
}