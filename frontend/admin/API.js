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

        // Save data to VeLog (Global State)
        if (data.success) {
            VeLog = data.data || [];
        }

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