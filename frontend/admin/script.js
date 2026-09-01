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

checkAuth();


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
    if (target === "user") {
        renderUserList(UsersData);
    } else if (target === "userDetail") {
        renderUserDetail(Number(params.id));
    } else if (target === "vehicleDetail") {
        renderEachVehicle(Number(params.id), String(params.carPlate));
    } else if (target === "vehicle") {
        renderVehicleList(VeLog);
    }
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
        // Filter only users with registered vehicles
        const plate = d.plate || "-"; // Vehicle plate
        const type = d.type || "-";   // Vehicle type (e.g. car, motorcycle)
        if (d.time_in) {
            foundCount++;
            const recordText = `In: ${d.time_in ?? '-'} | Out: ${d.time_out ?? '-'}`;
            htmlContent += `
                        <div class="User VehicleRow">
                            <h2>${type}</h2>
                            <h2>${plate}</h2>
                            <h2>${recordText}</h2>
                        </div>
                        `;
        } else {
            // If no in/out records, show vehicle details and alert
            foundCount++;
            htmlContent += `
                    <div class="User VehicleRow">
                        <h2>${type}</h2>
                        <h2>${plate}</h2>
                        <h2>No entry/exit records</h2>
                    </div>
                    `;
        }

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
        <div class="User">
            <h2>${index + 1}</h2>
            <h2>${user.houseNumber}</h2>
            <!-- Link to see user details using data-id -->
            <a href="#" data-id="${user.id}" data-target="userDetail" >More info</a>
        </div>
        `;
    });
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
            </section>`;
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
document.querySelector('.main-content').addEventListener('click', (e) => {
    // Check if clicked element is a link/button with data-target
    const link = e.target.closest('a[data-target]');
    if (!link) return; // Skip if clicked elsewhere

    e.preventDefault(); // Prevent default behavior

    // Get data from HTML attribute
    const { target, ...params } = link.dataset;

    // Change page and send parameters
    showPage(target, params);
});


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
        window.location.href = '../login/index.html';
    });
}