/**
 * Configuration Module
 * ศูนย์กลางจัดการการตั้งค่า API และ Environment Variables 
 */
var CONFIG = {
    // กำหนดค่า API Base URL สากลสำหรับโปรเจกต์นี้
    API_BASE_URL: `https://api-node-iot.onrender.com/api/`
};

// ป้องกันการแก้ไขค่า CONFIG
Object.freeze(CONFIG);
