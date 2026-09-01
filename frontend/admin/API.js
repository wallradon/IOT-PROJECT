// API URL Configuration
// ดึงค่า URL หลักสำหรับการเชื่อมต่อ API มาจากตัวแปร CONFIG ใน config.js
const API_BASE_URL = CONFIG.API_BASE_URL;

/**
 * ฟังก์ชันสำหรับสร้างข้อมูลลูกบ้านใหม่ (POST Request)
 * @param {Object} userData - ข้อมูลผู้ใช้งานที่ต้องการบันทึกเข้าระบบ
 * @returns {Promise<Object>} ข้อมูลผลลัพธ์ตอบกลับจากเซิร์ฟเวอร์
 */
async function createUser(userData) {
    try {
        // ส่งคำร้อง HTTP POST Request ไปยัง API_BASE_URL
        const response = await fetch(`${API_BASE_URL}&field1=123`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData) // แปลงข้อมูล JavaScript Object เป็น JSON String
        });

        // ดึงผลลัพธ์การตอบกลับในรูปแบบ JSON
        const result = await response.json();

        // ตรวจสอบว่าการร้องขอสำเร็จหรือไม่ (HTTP Status อยู่ในช่วง 200-299)
        if (!response.ok) {
            // หากเกิดข้อผิดพลาด เช่น รหัสสถานะ 400 หรือ 409 ให้โยนข้อผิดพลาดพร้อมข้อความที่ได้รับ
            throw new Error(result.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน');
        }

        console.log('สร้างผู้ใช้งานสำเร็จ:', result);
        return result;

    } catch (error) {
        console.error('createUser error:', error.message);
        throw error; // ส่งต่อ Error ให้ฝั่ง UI ไปจัดการต่อ (เช่น แสดง alert)
    }
}

// ตัวแปรสำหรับเก็บ HTTP status จากการ fetch ข้อมูลรอบล่าสุด (0 = ยังไม่เคยลองดึงข้อมูล)
let fetchStatus = 0;

/**
 * ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมดจากไฟล์ JSON หรือ API (GET Request)
 * @param {string} path - URL หรือ Path ของไฟล์ข้อมูล (เช่น './dataTest.json')
 */
async function getUser(path) {
    try {

        // สร้าง URL โดยรวม API_BASE_URL กับ path ที่เป็น Endpoint
        const fullUrl = new URL(path, API_BASE_URL);

        // ส่งคำร้อง GET Request ไปยังปลายทาง
        const res = await fetch(fullUrl);

        // อัปเดตรหัสสถานะการตอบรับ (เช่น 200, 404, 500)
        fetchStatus = res.status;

        // หาก HTTP status ไม่ผ่านเกณฑ์สำเร็จ ให้ข้ามไปทำงานในบล็อก catch
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // แปลงข้อมูลที่ดึงได้ให้อยู่ในรูปของ JSON
        const data = await res.json();

        // บันทึกข้อมูลลงใน getUsers (Global State)
        UsersData = data;

        console.log("getUser : ", UsersData);
        

    } catch (err) {
        console.log("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);

        // หาก fetchStatus เป็น 0 แสดงว่าส่งคำขอไม่ถึงปลายทางเลย (เช่น ขัดข้องที่อินเทอร์เน็ต)
        // ให้กำหนดรหัสผิดพลาดเป็น 500 เพื่อนำไปแสดงผลบน UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}


async function getVehicles(path) {
    try {

        // สร้าง URL โดยรวม API_BASE_URL กับ path ที่เป็น Endpoint
        const fullUrl = new URL(path, API_BASE_URL);

        // ส่งคำร้อง GET Request ไปยังปลายทาง
        const res = await fetch(fullUrl);

        // อัปเดตรหัสสถานะการตอบรับ (เช่น 200, 404, 500)
        fetchStatus = res.status;

        // หาก HTTP status ไม่ผ่านเกณฑ์สำเร็จ ให้ข้ามไปทำงานในบล็อก catch
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // แปลงข้อมูลที่ดึงได้ให้อยู่ในรูปของ JSON
        const data = await res.json();

        // บันทึกข้อมูลลงใน getVehicles (Global State) 
        // สกัดเอาเฉพาะส่วน data ที่เป็น Array มาใช้งาน
        vehiclesData = data.data || [];
        console.log("vehiclesData", vehiclesData)

    } catch (err) {
        console.log("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);

        // หาก fetchStatus เป็น 0 แสดงว่าส่งคำขอไม่ถึงปลายทางเลย (เช่น ขัดข้องที่อินเทอร์เน็ต)
        // ให้กำหนดรหัสผิดพลาดเป็น 500 เพื่อนำไปแสดงผลบน UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}


async function getVeLog(path) {
    try {

        // สร้าง URL โดยรวม API_BASE_URL กับ path ที่เป็น Endpoint
        const fullUrl = new URL(path, API_BASE_URL);

        // ส่งคำร้อง GET Request ไปยังปลายทาง
        const res = await fetch(fullUrl);

        // อัปเดตรหัสสถานะการตอบรับ (เช่น 200, 404, 500)
        fetchStatus = res.status;

        // หาก HTTP status ไม่ผ่านเกณฑ์สำเร็จ ให้ข้ามไปทำงานในบล็อก catch
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

        // แปลงข้อมูลที่ดึงได้ให้อยู่ในรูปของ JSON
        const data = await res.json();

        // บันทึกข้อมูลลงใน getUsers (Global State)
        if(data.success){
            VeLog = data.data || [];
            console.log("VeLog", VeLog);
        }

    } catch (err) {
        console.log("เกิดข้อผิดพลาดในการดึงข้อมูล:", err);

        // หาก fetchStatus เป็น 0 แสดงว่าส่งคำขอไม่ถึงปลายทางเลย (เช่น ขัดข้องที่อินเทอร์เน็ต)
        // ให้กำหนดรหัสผิดพลาดเป็น 500 เพื่อนำไปแสดงผลบน UI (Error State)
        if (fetchStatus === 0) fetchStatus = 500;
    }
}