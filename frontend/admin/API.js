// API URL Configuration
// Get main URL for API connection from CONFIG in config.js
const API_BASE_URL = CONFIG.API_BASE_URL;



// Variable to store HTTP status from latest fetch (0 = never fetched)
let fetchStatus = 0;

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