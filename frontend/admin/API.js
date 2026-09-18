// API URL Configuration
// Get main URL for API connection from CONFIG in config.js
const API_BASE_URL = CONFIG.API_BASE_URL;



// Variable to store HTTP status from latest fetch (0 = never fetched)
let fetchStatus = 0;

/**
 * Fetch NTP Time from WorldTimeAPI (Asia/Bangkok)
 */
async function getNtpTime() {
    let ntpTime;
    try {
        const timeRes = await fetch('https://worldtimeapi.org/api/timezone/Asia/Bangkok');
        if (!timeRes.ok) throw new Error('NTP Error');
        const timeData = await timeRes.json();
        ntpTime = new Date(timeData.datetime);
    } catch (e) {
        console.warn("Failed to fetch NTP time, using local time", e);
        ntpTime = new Date();
    }
    return ntpTime;
}

/**
 * Format string or timestamp into YYYY-MM-DD HH:mm:ss (or just YYYY-MM-DD)
 * @param {string|number|Date} dateVal 
 * @param {boolean} includeTime 
 */
function formatToYMD(dateVal, includeTime = false) {
    if (!dateVal || dateVal === '-') return '-';
    let d;
    if (dateVal instanceof Date) {
        d = dateVal;
    } else if (typeof dateVal === 'string' && dateVal.includes('/')) {
        // Assume DD/MM/YYYY
        const parts = dateVal.split(/[\s/:]+/);
        if (parts.length >= 6) {
            d = new Date(parts[2], parts[1] - 1, parts[0], parts[3], parts[4], parts[5]);
        } else {
            d = new Date(parts[2], parts[1] - 1, parts[0]);
        }
    } else {
        d = new Date(dateVal);
    }

    if (isNaN(d.getTime())) return String(dateVal);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    if (includeTime) {
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    return `${year}-${month}-${day}`;
}

/**
 * Function to get all users from JSON file or API (GET Request)
 * @param {string} path - URL or file path (e.g., './dataTest.json')
 */
async function getUser(path) {
    try {

        // Create URL by combining API_BASE_URL and endpoint path
        const fullUrl = new URL(path, API_BASE_URL);

        // Send GET Request to endpoint
        const res = await fetch(fullUrl);

        // Update response status code (e.g. 200, 404, 500)
        fetchStatus = res.status;

        // If HTTP status is not ok, jump to catch block
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // Convert response data to JSON
        const data = await res.json();

        // Save data to UsersData (Global State)
        UsersData = data;


    } catch (err) {
        console.log("Error fetching data:", err);

        // If fetchStatus is 0, request didn't reach server (e.g. no internet)
        // Set error code to 500 to show on UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}


async function getVehicles(path) {
    try {

        // Create URL by combining API_BASE_URL and endpoint path
        const fullUrl = new URL(path, API_BASE_URL);

        // Send GET Request to endpoint
        const res = await fetch(fullUrl);

        // Update response status code (e.g. 200, 404, 500)
        fetchStatus = res.status;

        // If HTTP status is not ok, jump to catch block
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // Convert response data to JSON
        const data = await res.json();

        // Save data to vehiclesData (Global State) 
        // Extract only the data array
        vehiclesData = data.data || [];

    } catch (err) {
        console.log("Error fetching data:", err);

        // If fetchStatus is 0, request didn't reach server (e.g. no internet)
        // Set error code to 500 to show on UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}


async function getVeLog(path) {
    try {
        // Create URL by combining API_BASE_URL and endpoint path
        const fullUrl = new URL(path, API_BASE_URL);

        // Send GET Request to endpoint
        const res = await fetch(fullUrl);

        // Update response status code (e.g. 200, 404, 500)
        fetchStatus = res.status;

        // If HTTP status is not ok, jump to catch block
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // Convert response data to JSON
        const data = await res.json();

        let residentLogs = [];
        if (data.success) {
            residentLogs = data.data || [];
        }

        // Fetch Visitor logs
        let visitorLogs = [];
        try {
            const visitorRes = await fetch('https://api-node-iot.onrender.com/api/access/visitor/logs');
            if (visitorRes.ok) {
                const visitorData = await visitorRes.json();
                // Ensure data is array
                const vDataArray = Array.isArray(visitorData.data) ? visitorData.data : (Array.isArray(visitorData) ? visitorData : []);
                visitorLogs = vDataArray.map(v => ({
                    id: v.id,
                    barcode: v.barcode,
                    plate: v.licenseplate,
                    province: v.province,
                    time_in: v.time_in,
                    time_out: v.time_out,
                    type: 'Visitor', // Default to Visitor or '-' 
                    isVisitor: true,
                    houseNumber: v.houseNumber
                }));
            }
        } catch (visitorErr) {
            console.error("Error fetching visitor logs:", visitorErr);
        }

        // Combine logs
        let combinedLogs = [...residentLogs, ...visitorLogs];

        // Sort by time_in descending (newest first)
        const parseDate = (dateStr) => {
            if (!dateStr || dateStr === '-') return 0;
            // Parse "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY"
            const parts = dateStr.split(/[\s/:]+/);
            if (parts.length >= 6) {
                const [dd, mm, yyyy, h, m, s] = parts;
                return new Date(yyyy, mm - 1, dd, h, m, s).getTime();
            } else if (parts.length === 3) {
                const [dd, mm, yyyy] = parts;
                return new Date(yyyy, mm - 1, dd).getTime();
            }
            return new Date(dateStr).getTime() || 0;
        };

        combinedLogs.sort((a, b) => parseDate(b.time_in) - parseDate(a.time_in));

        // Format dates to YYYY-MM-DD HH:mm:ss
        combinedLogs = combinedLogs.map(log => ({
            ...log,
            time_in: log.time_in ? formatToYMD(parseDate(log.time_in), true) : '-',
            time_out: log.time_out ? formatToYMD(parseDate(log.time_out), true) : '-'
        }));

        // Save data to VeLog (Global State)
        VeLog = combinedLogs;

    } catch (err) {
        console.log("Error fetching data:", err);

        // If fetchStatus is 0, request didn't reach server (e.g. no internet)
        // Set error code to 500 to show on UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}

/**
 * Function to update user details via PUT Request
 * @param {number|string} userId - User ID to update
 * @param {Object} updateData - Data body to update
 */
async function updateUser(userId, updateData) {
    try {
        const fullUrl = new URL(`users/updateUser/${userId}`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error updating user:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}
async function deleteUser(userId) {
    try {
        const fullUrl = new URL(`users/deleteUser/${userId}`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'DELETE',
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error deleting user:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}

async function deleteVehicle(vehicleId) {
    try {
        const fullUrl = new URL(`vehicles/deleteVehicle/${vehicleId}`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'DELETE',
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error deleting vehicle:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}

async function createVehicle(vehicleData) {
    try {
        const fullUrl = new URL(`vehicles/createVehicle`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vehicleData)
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error creating vehicle:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}



async function updateAccount(userId, accountData) {
    try {
        const fullUrl = new URL(`auth/updateAccount/${userId}`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(accountData)
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error updating account:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}

async function getVisitorBarcode(userId) {
    try {
        const token = localStorage.getItem('token');
        const fullUrl = new URL(`visitor-barcode/latest/${userId}`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error fetching visitor barcode:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}

async function postKeyGen(key_gen) {
    try {
        // Send POST request to create generate key
        const fullUrl = new URL(`createGenerateKey`, API_BASE_URL);

        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key_gen: key_gen,
                state: "ACTIVE"
            })
        });

        fetchStatus = res.status;
        const result = await res.json();

        if (!res.ok) throw new Error(result.message || `HTTP error: ${res.status}`);

        return result;
    } catch (err) {
        console.log("Error generating key:", err);
        if (fetchStatus === 0) fetchStatus = 500;
        return null;
    }
}


async function getKeyGen() {
    try {
        // Create URL by combining API_BASE_URL and endpoint path
        const fullUrl = new URL('generate-key/all', API_BASE_URL);

        // Send GET Request to endpoint
        const res = await fetch(fullUrl);

        // Update response status code (e.g. 200, 404, 500)
        fetchStatus = res.status;

        // If HTTP status is not ok, jump to catch block
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // Convert response data to JSON
        const data = await res.json();

        // Return the data to the caller
        return data;

    } catch (err) {
        console.log("Error fetching data:", err);

        // If fetchStatus is 0, request didn't reach server (e.g. no internet)
        // Set error code to 500 to show on UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;

        return null; // Return null on error
    }
}