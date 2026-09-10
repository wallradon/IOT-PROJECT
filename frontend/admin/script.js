"use strict"

// ===================== Security Utilities =====================
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


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

let currentPageParams = null; // Store current params for refreshing

/**
 * Function to change page (Page Router)
 * @param {string} target - Target page name (e.g. 'home', 'user', 'vehicle')
 * @param {Object} params - Other parameters for the target page (e.g. { id: 1, carIndex: 0 })
*/
function showPage(target, params) {
    if (params !== undefined) {
        currentPageParams = params || null;
    }

    // 1. Hide all pages
    pages.forEach(page => page.classList.remove('active'));

    // 2. Reset nav highlights
    navItems.forEach(li => li.classList.remove('user-select'));

    // 3. Show target page
    const targetPage = document.querySelector(`#page-${target}`);
    if (targetPage) {
        targetPage.classList.add('active');
        renderUserPage(target, currentPageParams); // Call render data function
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
        renderUserPage(target, currentPageParams);
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
        loadingContainer = targetPage.querySelector('.dataLoading') || targetPage.querySelector('#UserData') || targetPage.querySelector('#VehicleData');
        if (!loadingContainer) {
            loadingContainer = targetPage;
        }
    }

    // 3. Check loading status: If not done, show loading text
    if (isLoading) {
        if (loadingContainer) {
            loadingContainer.replaceChildren();
            const p = document.createElement('p');
            p.className = 'loading-text';
            p.textContent = 'Loading data...';
            loadingContainer.append(p);
        }
        return;
    }

    // 4. Check error: If HTTP status is not 200-299, show error text
    if (fetchStatus < 200 || fetchStatus > 299) {
        if (loadingContainer) {
            loadingContainer.replaceChildren();
            const p = document.createElement('p');
            p.className = 'loading-text';
            p.style.color = 'red';
            p.textContent = `Error loading data. Please try again (HTTP Code: ${fetchStatus})`;
            loadingContainer.append(p);
        }
        return;
    }

    // 5. If download is complete, show data based on target page
    const renderRoutes = {
        user: () => renderUserList(UsersData),
        userDetail: (params) => renderUserDetail(Number(params?.id)),
        editUser: (params) => renderEditUserPage(Number(params?.id)),
        vehicleDetail: (params) => renderEachVehicle(Number(params?.id), String(params?.carPlate)),
        vehicle: () => renderVehicleList(VeLog)
    };

    if (renderRoutes[target]) {
        renderRoutes[target](params);
    } else {
        console.log(`No render function found for target: ${target}`);
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

    vehicleDataContainer.replaceChildren(); // Clear previous content
    let foundCount = 0; // Count found vehicles

    // Loop to check each user data
    data.forEach(d => {
        const plate = d.plate || "-"; // Vehicle plate
        const type = d.type || "-";   // Vehicle type (e.g. car, motorcycle)

        foundCount++;
        const recordText = d.time_in ? `In: ${d.time_in ?? '-'} | Out: ${d.time_out ?? '-'}` : "No entry/exit records";

        const row = document.createElement('div');
        row.className = 'User VehicleRow';

        const h2Type = document.createElement('h2');
        h2Type.textContent = type;

        const h2Plate = document.createElement('h2');
        h2Plate.textContent = plate;

        const h2Record = document.createElement('h2');
        h2Record.textContent = recordText;

        row.append(h2Type, h2Plate, h2Record);
        vehicleDataContainer.append(row);
    });

    // If no vehicles found, show alert
    if (foundCount === 0) {
        const p = document.createElement('p');
        p.className = 'loading-text';
        p.textContent = 'No vehicle data found';
        vehicleDataContainer.append(p);
    }
}


// ===================== Render USER DATA Page =====================
/**
 * Function to render user numbers and house numbers
 * @param {Array} users - All user data
 */
function renderUserList(users) {
    const userDataContainer = document.querySelector('#UserData');
    if (!userDataContainer) return;

    userDataContainer.replaceChildren(); // Clear previous content

    // Loop to create HTML for users
    users.filter(user => user.role === "member").forEach((user, index) => {
        const userDiv = document.createElement('div');
        userDiv.className = 'User';
        userDiv.dataset.id = user.id;
        userDiv.dataset.target = 'userDetail';
        userDiv.style.cursor = 'pointer';

        const h2Index = document.createElement('h2');
        h2Index.textContent = index + 1;

        const h2House = document.createElement('h2');
        h2House.textContent = user.houseNumber;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'user-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.dataset.id = user.id;
        deleteBtn.dataset.houseNumber = user.houseNumber;
        deleteBtn.className = 'delete-user-btn';
        deleteBtn.textContent = 'ลบข้อมูล (Delete)';

        actionsDiv.append(deleteBtn);
        userDiv.append(h2Index, h2House, actionsDiv);
        userDataContainer.append(userDiv);
    });
    console.log(users);
}

// ===================== Render User Detail Page =====================
/**
 * Function to render user details and vehicles
 * @param {number} userId - User ID
 */
function renderUserDetail(userId) {
    // Find user by ID
    const user = UsersData.find(u => u.id === userId);
    console.log(user);
    // Find all vehicles of this user
    const userVehicles = Array.isArray(vehiclesData)
        ? vehiclesData.filter(v => v.user_id === userId)
        : [];

    const userDetailContainer = document.querySelector('#page-userDetail');
    userDetailContainer.replaceChildren();

    // Prevent app from freezing if user is not found
    if (!user) {
        const p = document.createElement('p');
        p.className = 'loading-text';
        p.textContent = 'User not found';
        userDetailContainer.append(p);
        return;
    }

    // Home detail section
    const homeDetail = document.createElement('section');
    homeDetail.className = 'homeDetail';

    const createHomeRow = (containerClass, labelText, valueText) => {
        const div = document.createElement('div');
        div.className = containerClass;
        const pLabel = document.createElement('p');
        pLabel.className = 'homeList';
        pLabel.textContent = labelText;
        const pValue = document.createElement('p');
        pValue.className = 'homeList';
        pValue.textContent = valueText;
        div.append(pLabel, pValue);
        return div;
    };

    homeDetail.append(
        createHomeRow('homeNumber', 'House Number', user.houseNumber),
        createHomeRow('nameOwner', 'Owner Name', user.ownerName)
    );

    const timeData = document.createElement('div');
    timeData.className = 'TimeData';
    const pRegDate = document.createElement('p');
    pRegDate.className = 'homeList';
    pRegDate.textContent = `Register Date: ${user.registerDate ?? '-'}`;
    const pMemDate = document.createElement('p');
    pMemDate.className = 'homeList';
    pMemDate.textContent = `Member Start Date: ${user.memberStartDate ?? '-'} | Expire Date: ${user.memberExpireDate ?? '-'}`;
    timeData.append(pRegDate, pMemDate);
    homeDetail.append(timeData);

    // Vehicle section
    const vehicleUser = document.createElement('section');
    vehicleUser.className = 'vehicleUser';

    const h1 = document.createElement('h1');
    h1.className = 'vehicleList';
    h1.textContent = 'Registered Vehicles';
    vehicleUser.append(h1);

    const headRow = document.createElement('div');
    headRow.className = 'headVlist';
    ['Plate', 'Type', 'Details'].forEach(text => {
        const h3 = document.createElement('h3');
        h3.className = 'Vlist';
        h3.textContent = text;
        headRow.append(h3);
    });
    vehicleUser.append(headRow);

    if (userVehicles.length > 0) {
        userVehicles.forEach(vehicle => {
            const row = document.createElement('div');
            row.className = 'headVlist';

            const pPlate = document.createElement('p');
            pPlate.className = 'Vlist';
            pPlate.textContent = vehicle.plate;

            const pType = document.createElement('p');
            pType.className = 'Vlist';
            pType.textContent = vehicle.type;

            const aMore = document.createElement('a');
            aMore.href = '#';
            aMore.dataset.target = 'vehicleDetail';
            aMore.dataset.carPlate = vehicle.plate;
            aMore.dataset.id = user.id;
            aMore.textContent = 'More info';

            row.append(pPlate, pType, aMore);
            vehicleUser.append(row);
        });
    } else {
        const row = document.createElement('div');
        row.className = 'headVlist';
        const empty1 = document.createElement('p');
        empty1.className = 'Vlist';
        empty1.textContent = '-';
        const empty2 = document.createElement('p');
        empty2.className = 'Vlist';
        empty2.textContent = '-';
        const empty3 = document.createElement('p');
        row.append(empty1, empty2, empty3);
        vehicleUser.append(row);
    }

    const editBtnContainer = document.createElement('div');
    editBtnContainer.className = 'edit-user-btn-container';
    const editBtn = document.createElement('a');
    editBtn.href = '#';
    editBtn.dataset.target = 'editUser';
    editBtn.dataset.id = user.id;
    editBtn.className = 'edit-user-btn';
    editBtn.textContent = 'แก้ไขข้อมูลลูกบ้าน (Edit User)';
    editBtnContainer.append(editBtn);

    userDetailContainer.append(homeDetail, vehicleUser, editBtnContainer);
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
    vehicleDetailContainer.replaceChildren();

    if (vData.length === 0) {
        const p = document.createElement('p');
        p.className = 'loading-text';
        p.textContent = 'Owner not found';
        vehicleDetailContainer.append(p);
        return;
    }

    if (!vehicle) {
        const p = document.createElement('p');
        p.className = 'loading-text';
        p.textContent = 'Vehicle not found for this owner';
        vehicleDetailContainer.append(p);
        return;
    }

    const card = document.createElement('div');
    card.className = 'vehicle-card';

    const vTitle = document.createElement('div');
    vTitle.className = 'v-title';
    vTitle.textContent = 'Vehicle Details';

    const vDate = document.createElement('div');
    vDate.className = 'v-date';
    vDate.textContent = `Register Date: ${vehicle.registerDate ?? '-'}`;

    const vGrid = document.createElement('div');
    vGrid.className = 'v-grid';

    const createItem = (text, isBold = false) => {
        const div = document.createElement('div');
        div.className = 'v-item';
        div.textContent = text;
        if (isBold) div.style.fontWeight = 'bold';
        return div;
    };

    vGrid.append(
        createItem(`Plate: ${vehicle.plate ?? '-'}`),
        createItem(`Type: ${vehicle.type ?? '-'}`),
        createItem('Time In', true),
        createItem('Time Out', true)
    );

    const timeInList = document.createElement('div');
    timeInList.className = 'v-item v-time';
    timeInList.id = 'time-in-list';

    const timeOutList = document.createElement('div');
    timeOutList.className = 'v-item v-time';
    timeOutList.id = 'time-out-list';

    if (timeStamp.length > 0) {
        timeStamp.forEach((timeRecord) => {
            const spanIn = document.createElement('span');
            spanIn.className = 'time-record';
            spanIn.textContent = timeRecord.time_in ?? '-';
            timeInList.append(spanIn);

            const spanOut = document.createElement('span');
            spanOut.className = 'time-record';
            spanOut.textContent = timeRecord.time_out ?? '-';
            timeOutList.append(spanOut);
        });
    } else {
        const spanIn = document.createElement('span');
        spanIn.className = 'time-record';
        spanIn.textContent = '-';
        timeInList.append(spanIn);

        const spanOut = document.createElement('span');
        spanOut.className = 'time-record';
        spanOut.textContent = '-';
        timeOutList.append(spanOut);
    }

    vGrid.append(timeInList, timeOutList);
    card.append(vTitle, vDate, vGrid);
    vehicleDetailContainer.append(card);
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

    const deleteVehicleBtn = e.target.closest('.delete-vehicle-btn');
    if (deleteVehicleBtn) {
        e.preventDefault();
        e.stopPropagation();

        const vehicleId = deleteVehicleBtn.dataset.id;
        const plate = deleteVehicleBtn.dataset.plate;

        showConfirmPopup(
            'ยืนยันการนำรถออก',
            `คุณต้องการนำรถทะเบียน ${plate} ออกจากรายการหรือไม่? (ข้อมูลจะถูกลบจริงเมื่อกดยืนยันบันทึกข้อมูล)`,
            () => {
                const form = document.querySelector("#editUserForm");
                if (form) {
                    let pending = form.dataset.pendingDeletes ? JSON.parse(form.dataset.pendingDeletes) : [];
                    pending.push(vehicleId);
                    form.dataset.pendingDeletes = JSON.stringify(pending);

                    const row = deleteVehicleBtn.closest('.edit-vehicle-row');
                    if (row) row.remove();
                }
            }
        );
        return;
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

    pageContainer.replaceChildren();

    const user = UsersData.find(u => u.id === userId) || {};

    const houseNumber = user.houseNumber || "ERROR";
    const ownerName = user.ownerName || "ERROR";
    const formatDateForInput = (dateStr) => {
        if (!dateStr || dateStr === "ERROR" || dateStr.trim() === "") return "";
        if (dateStr.includes("-")) {
            const parts = dateStr.split("-");
            if (parts[0].length === 2 && parts[2].length === 4) { // DD-MM-YYYY -> YYYY-MM-DD
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
            if (parts[0].length === 4 && parts[2].length === 2) { // Already YYYY-MM-DD
                return dateStr;
            }
        }
        return "";
    };

    const registerDate = formatDateForInput(user.registerDate || "ERROR");
    const memberStartDate = formatDateForInput(user.memberStartDate || "ERROR");
    const memberExpireDate = formatDateForInput(user.memberExpireDate || "ERROR");

    const userVehicles = Array.isArray(vehiclesData)
        ? vehiclesData.filter(v => v.user_id === userId)
        : [];

    const container = document.createElement('div');
    container.className = 'edit-user-container';

    const title = document.createElement('h2');
    title.className = 'edit-user-title';
    title.textContent = 'แก้ไขข้อมูลลูกบ้าน (Edit User)';

    const form = document.createElement('form');
    form.id = 'editUserForm';
    form.className = 'edit-user-form';
    form.dataset.userId = user.id || userId || '';

    const createFormGroup = (id, labelText, type, value, placeholder, autocomplete) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        const label = document.createElement('label');
        label.htmlFor = id;
        label.className = 'form-label';
        label.textContent = labelText;
        const input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.name = id;
        input.className = 'form-input';
        if (value !== undefined) input.value = value;
        if (placeholder) input.placeholder = placeholder;
        if (autocomplete) input.autocomplete = autocomplete;
        group.append(label, input);
        return group;
    };

    form.append(
        createFormGroup('houseNumber', 'House Number', 'text', houseNumber),
        createFormGroup('ownerName', 'Owner Name', 'text', ownerName),
        createFormGroup('username', 'Username', 'text', user.username || '', 'ใส่ Username ใหม่...', 'username'),
        createFormGroup('password', 'New Password (ปล่อยว่างหากไม่ต้องการเปลี่ยน)', 'password', '', 'ใส่รหัสผ่านใหม่...', 'new-password'),
        createFormGroup('confirmPassword', 'Confirm New Password (ปล่อยว่างหากไม่เปลี่ยน)', 'password', '', 'ยืนยันรหัสผ่านใหม่...', 'new-password'),
        createFormGroup('registerDate', 'Register Date', 'date', registerDate),
        createFormGroup('memberStartDate', 'Member Start Date', 'date', memberStartDate),
        createFormGroup('memberExpireDate', 'Member Expire Date', 'date', memberExpireDate)
    );

    const vehiclesContainer = document.createElement('div');
    vehiclesContainer.className = 'edit-vehicles-container';

    const vTitle = document.createElement('h3');
    vTitle.className = 'edit-vehicles-title';
    vTitle.textContent = 'ข้อมูลรถ (Vehicles)';
    vehiclesContainer.append(vTitle);

    const vHeader = document.createElement('div');
    vHeader.className = 'edit-vehicles-header';
    ['Plate', 'Type', 'Actions'].forEach((text, i) => {
        const div = document.createElement('div');
        div.className = i === 2 ? 'Vlist actions-col' : 'Vlist';
        div.textContent = text;
        vHeader.append(div);
    });
    vehiclesContainer.append(vHeader);

    if (userVehicles.length > 0) {
        userVehicles.forEach((vehicle) => {
            const row = document.createElement('div');
            row.className = 'edit-vehicle-row';

            const pPlate = document.createElement('div');
            pPlate.className = 'Vlist';
            pPlate.textContent = vehicle.plate;

            const pType = document.createElement('div');
            pType.className = 'Vlist';
            pType.textContent = vehicle.type;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'vehicle-actions';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'delete-vehicle-btn';
            btn.dataset.id = vehicle.id;
            btn.dataset.plate = vehicle.plate;
            btn.textContent = 'ลบ';
            actionsDiv.append(btn);

            row.append(pPlate, pType, actionsDiv);
            vehiclesContainer.append(row);
        });
    } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'edit-vehicle-empty';
        emptyDiv.textContent = '- ไม่มีข้อมูลรถ (No vehicles found) -';
        vehiclesContainer.append(emptyDiv);
    }

    form.append(vehiclesContainer);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'submit-btn';
    submitBtn.style.marginTop = '20px';
    submitBtn.textContent = 'บันทึกข้อมูล (Save)';
    form.append(submitBtn);

    container.append(title, form);
    pageContainer.append(container);

    const createdForm = document.querySelector("#editUserForm");
    if (!createdForm) return;

    createdForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Convert YYYY-MM-DD to DD-MM-YYYY for API payload
        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            if (dateStr.includes("-")) {
                const parts = dateStr.split("-");
                if (parts[0].length === 4 && parts[2].length === 2) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            return dateStr;
        };

        const ID_USER = form.dataset.userId || userId;

        // Ensure passwords match if entered
        if (form.password.value !== form.confirmPassword.value) {
            showToast("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน", "ข้อผิดพลาด", "error");
            return;
        }

        const updateData = {
            houseNumber: form.houseNumber.value,
            ownerName: form.ownerName.value,
            role: "member",
            Telegram_ID: user.Telegram_ID || ""
        };

        if (form.registerDate.value) updateData.registerDate = formatDate(form.registerDate.value);
        if (form.memberStartDate.value) updateData.memberStartDate = formatDate(form.memberStartDate.value);
        if (form.memberExpireDate.value) updateData.memberExpireDate = formatDate(form.memberExpireDate.value);

        console.log("PUT payload to API:", updateData);

        const result = await updateUser(ID_USER, updateData);

        let accountError = false;
        if (form.username.value || form.password.value) {
            const accountData = {};
            if (form.username.value) accountData.username = form.username.value;
            if (form.password.value) accountData.password = form.password.value;

            if (Object.keys(accountData).length > 0) {
                const accountResult = await updateAccount(ID_USER, accountData);
                if (!accountResult || !accountResult.success) {
                    accountError = true;
                }
            }
        }

        if (result && result.success) {
            const pendingDeletes = form.dataset.pendingDeletes ? JSON.parse(form.dataset.pendingDeletes) : [];
            let deleteErrors = 0;

            for (const vId of pendingDeletes) {
                const delRes = await deleteVehicle(vId);
                if (!delRes || !delRes.success) deleteErrors++;
            }

            if (deleteErrors > 0 && accountError) {
                showToast(`อัปเดตข้อมูลสำเร็จ แต่มีข้อผิดพลาดในการลบรถและแก้ไขบัญชี`, "เตือน", "error");
            } else if (deleteErrors > 0) {
                showToast(`อัปเดตข้อมูลสำเร็จ แต่มีข้อผิดพลาดในการลบรถบางคัน`, "เตือน", "error");
            } else if (accountError) {
                showToast(`อัปเดตข้อมูลสำเร็จ แต่มีข้อผิดพลาดในการแก้ไขรหัสผ่าน/Username`, "เตือน", "error");
            } else {
                showToast(result.message || "บันทึกข้อมูลสำเร็จแล้ว", "สำเร็จ", "success");
            }

            await initData(); // Re-fetch updated data
            console.log("usersData", usersData);
            showPage("userDetail", { id: Number(ID_USER) }); // Back to user detail
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

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×'; // Changed to textContent and used Unicode character instead of HTML entity

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'icon-wrapper';

    // Parse SVG string to DOM element to avoid using innerHTML
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(iconSvg, 'image/svg+xml');
    iconWrapper.append(svgDoc.documentElement);

    const textWrapper = document.createElement('div');
    textWrapper.className = 'text-wrapper';

    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = title;

    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.textContent = message;

    textWrapper.append(titleEl, messageEl);
    toast.append(closeBtn, iconWrapper, textWrapper);

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

    closeBtn.addEventListener('click', removeToast);

    if (duration > 0) {
        setTimeout(removeToast, duration);
    }
}
