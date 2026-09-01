"use strict"

// ===================== ตัวแปรสถานะหลักของแอป (Global App State) =====================
const gUsers = "users/getUsers"; // pathข้อมูลลูกบ้าน
const gVehicles = "vehicles/getVehicles"; // pathข้อมูลรถ
const pVeLog = "logs/getLogs"; // pathข้อมูลรถเข้าออก
let UsersData = [];       // ตัวแปรส่วนกลาง (Global Variable) เก็บข้อมูลลูกบ้าน
let vehiclesData = [];    // ตัวแปรส่วนกลาง (Global Variable) เก็บข้อมูลยานพาหนะ
let VeLog = [];    // ตัวแปรส่วนกลาง (Global Variable) เก็บข้อมูลเข้าออกยานพาหนะทั้งหมด
let isLoading = true;     // สถานะการโหลด (Loading State)
// fetchStatus ได้ถูกประกาศใช้ใน API.js เพื่อติดตามสถานะ HTTP Response ล่าสุด

// ===================== เมนู / การสลับหน้า (Menu Navigation & Page Router) =====================
const navItems = document.querySelectorAll('nav li[data-target]'); // ดึงปุ่มเมนู (Nav Items)
const pages = document.querySelectorAll('.page');                  // ดึงหน้าเนื้อหาทั้งหมด (Page Elements)


/**
 * ฟังก์ชันสลับการแสดงผลของหน้าเพจ (Page Router)
 * @param {string} target - ชื่อหน้าปลายทางที่ต้องการสลับไปแสดงผล (ตรงกับส่วนต่อท้าย id ของหน้า เช่น 'home', 'user', 'vehicle')
 * @param {Object} params - พารามิเตอร์อื่นๆ ที่ต้องการส่งต่อไปให้หน้าเพจปลายทาง (เช่น { id: 1, carIndex: 0 })
 */
function showPage(target, params) {
    // 1. ซ่อนหน้าทั้งหมด (Hide all pages)
    pages.forEach(page => page.classList.remove('active'));

    // 2. ยกเลิกไฮไลต์เมนู (Reset nav highlights)
    navItems.forEach(li => li.classList.remove('user-select'));

    // 3. แสดงหน้าเป้าหมาย (Show target page)
    const targetPage = document.querySelector(`#page-${target}`);
    if (targetPage) {
        targetPage.classList.add('active');
        renderUserPage(target, params);       // เรียกใช้ฟังก์ชันแสดงผล (Render Data)
    }

    // 4. ไฮไลต์เมนูปัจจุบัน (Highlight active nav item)
    const activeLi = document.querySelector(`nav li[data-target="${target}"]`);
    if (activeLi) activeLi.classList.add('user-select');
}

// ดักจับเหตุการณ์คลิก (Click Event) เพื่อสลับหน้า
navItems.forEach(li => {
    li.addEventListener('click', (e) => {
        e.preventDefault(); // ป้องกันพฤติกรรมเริ่มต้น (Prevent Default)
        showPage(li.dataset.target); // เข้าถึงชื่อหน้าปลายทางผ่าน dataset.target และเปิดหน้านั้น
    });
});

// เปิดหน้าแรก (หน้า home) ทันทีที่ผู้ใช้งานเข้าสู่ระบบเป็นค่าเริ่มต้น
showPage('vehicle');


/**
 * อัปเดตข้อมูลในหน้าปัจจุบัน (Refresh Current Page)
 * ใช้หลังจากดึงข้อมูลจาก API (Fetch API) เสร็จแล้ว
 */
function refreshCurrentPage() {
    // หาเมนูที่เปิดอยู่และอัปเดตหน้า (Re-render Active Page)
    const activeLi = document.querySelector('nav li.user-select');
    if (activeLi) {
        const target = activeLi.dataset.target;
        renderUserPage(target, null);
    }
}

// ===================== ตัวจัดการแสดงผล (Render Router) =====================
/**
 * ตรวจสอบสถานะข้อมูลและแสดงผล (Render Page based on Data Status)
 * @param {string} target - หน้าปลายทาง
 * @param {Object} params - พารามิเตอร์
 */
function renderUserPage(target, params) {
    // 1. ค้นหา element ของหน้าเพจที่ผู้ใช้เปิดอยู่
    const targetPage = document.querySelector(`#page-${target}`);

    // 2. ค้นหาพื้นที่แสดงผลข้อความสถานะโหลด/ข้อผิดพลาดในหน้าเฉพาะนั้นๆ เพื่อไม่ให้กระทบต่อโครงสร้างหน้าอื่น
    let loadingContainer = null;
    if (targetPage) {
        loadingContainer = targetPage.querySelector('.dataLoading') || targetPage.querySelector('#UserData');
    }

    // 3. ตรวจสอบสถานะการดาวน์โหลด: หากยังดาวน์โหลดข้อมูลไม่สำเร็จ ให้แสดงข้อความสถานะกำลังโหลด (Loading)
    if (isLoading) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text">กำลังดาวน์โหลดข้อมูล (Loading data...)</p>`;
        }
        return;
    }

    // 4. ตรวจสอบข้อผิดพลาดในการโหลด: หากรหัส HTTP Status ไม่ถูกต้อง (ไม่อยู่ในช่วง 200-299) ให้แจ้งเตือนข้อผิดพลาด
    if (fetchStatus < 200 || fetchStatus > 299) {
        if (loadingContainer) {
            loadingContainer.innerHTML = `<p class="loading-text" style="color: red;">เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง (HTTP Code: ${fetchStatus})</p>`;
        }
        return;
    }

    // 5. หากดาวน์โหลดข้อมูลเสร็จสมบูรณ์ ให้นำข้อมูลมาแสดงผลแยกตามชื่อหน้า (target)
    if (target === "user") {
        console.log(`เปิดหน้าแสดงรายการข้อมูลลูกบ้านทั้งหมด`);
        renderUserList(UsersData);
    } else if (target === "userDetail") {
        console.log(`เปิดหน้าแสดงรายละเอียดของลูกบ้าน ID:`, params.id);
        renderUserDetail(Number(params.id));
    } else if (target === "vehicleDetail") {
        console.log(`เปิดหน้าแสดงรายละเอียดประวัติเข้า-ออกของยานพาหนะ ID: ${params.id}, ทะเบียน: ${params.carPlate}`);
        renderEachVehicle(Number(params.id), String(params.carPlate));
    } else if (target === "vehicle") {
        console.log(`เปิดหน้าแสดงประวัติยานพาหนะเข้า-ออกทั้งหมด`);
        renderVehicleList(VeLog);
    } else if (target === "home") {
        // สามารถเพิ่มการเรนเดอร์หน้าแรก Dashboard หรือสถิติที่นี่ในอนาคต
    }
}

// ===================== Render หน้า VEHICLE DATA (รายการประวัติการเข้า-ออกของรถยนต์) =====================
/**
 * ฟังก์ชันจัดการ Render รายชื่อประเภทรถ, ป้ายทะเบียน และเวลาเข้า-ออกทั้งหมดที่มีในระบบลงในหน้า VEHICLE DATA
 * @param {Array} users - ชุดข้อมูลลูกบ้านทั้งหมดพร้อมรายการยานพาหนะ
 */
function renderVehicleList(data) {
    const vehicleDataContainer = document.querySelector('#VehicleData');
    if (!vehicleDataContainer) return; // ยุติหากไม่พบ container บนหน้าเว็บ

    let htmlContent = "";
    let foundCount = 0; // ตัวแปรสำหรับนับจำนวนข้อมูลรถที่ประมวลผล
    // วนลูปตรวจสอบข้อมูลผู้ใช้แต่ละราย
    data.forEach(d => {
        // คัดกรองเฉพาะผู้ใช้ที่มีข้อมูลยานพาหนะลงทะเบียนไว้
        console.log("datavehicle", d);
        const plate = d.plate || "-"; // ป้ายทะเบียนรถ
        const type = d.type || "-";    // ประเภทรถ (เช่น รถยนต์, จักรยานยนต์)
        if (d.time_in) {
            foundCount++;
            const recordText = `เข้า: ${d.time_in ?? '-'} | ออก: ${d.time_out ?? '-'}`;
            htmlContent += `
                        <div class="User VehicleRow">
                            <h2>${type}</h2>
                            <h2>${plate}</h2>
                            <h2>${recordText}</h2>
                        </div>
                        `;
        } else {
            // หากยังไม่มีประวัติการเข้า-ออกเลย ให้แสดงรายละเอียดข้อมูลรถพร้อมแจ้งเตือนว่ายังไม่มีประวัติ
            foundCount++;
            htmlContent += `
                    <div class="User VehicleRow">
                        <h2>${type}</h2>
                        <h2>${plate}</h2>
                        <h2>ยังไม่มีประวัติเข้า-ออกในระบบ</h2>
                    </div>
                    `;
        }

    });

    // หากไม่พบรถของใครที่มีประวัติหรือลงทะเบียนไว้ในหมู่บ้านเลย ให้ขึ้นแจ้งเตือน
    if (foundCount === 0) {
        htmlContent = `<p class="loading-text">ไม่พบข้อมูลยานพาหนะในระบบeiei</p>`;
    }

    // // เขียนโครงสร้าง HTML ลงหน้าแสดงผล
    vehicleDataContainer.innerHTML = htmlContent;
}


// ===================== Render หน้า USER DATA (รายการข้อมูลลูกบ้าน) =====================
/**
 * ฟังก์ชันสำหรับ Render ลำดับและเลขที่บ้านของผู้ใช้งานทั้งหมด
 * @param {Array} users - ข้อมูลรายชื่อผู้ใช้งานระบบทั้งหมด
 */
function renderUserList(users) {
    const userDataContainer = document.querySelector('#UserData');
    if (!userDataContainer) return;

    let htmlContent = "";
    // วนลูปสร้าง HTML รายชื่อลูกบ้าน
    users.forEach((user, index) => {
        htmlContent += `
        <div class="User">
            <h2>${index + 1}</h2>
            <h2>${user.houseNumber}</h2>
            <!-- ลิงก์สำหรับกดเข้าไปดูรายละเอียดข้อมูลบ้านและผู้พักอาศัยเพิ่มเติม โดยอ้างอิง data-id -->
            <a href="#" data-id="${user.id}" data-target="userDetail" >แสดงข้อมูลเพิ่มเติม</a>
        </div>
        `;
    });
    // นำ HTML ไปแปะในหน้าเว็บรวดเดียว เพื่อลด Reflow / Repaint ช่วยเพิ่มประสิทธิภาพความเร็ว
    userDataContainer.innerHTML = htmlContent;
}

// ===================== Render หน้ารายละเอียดผู้ใช้งานและยานพาหนะที่ลงทะเบียนไว้ (User Detail) =====================
/**
 * ฟังก์ชันสร้างและเรนเดอร์ข้อมูลรายละเอียดเจ้าบ้านและรถยนต์ทุกคันที่เป็นเจ้าของ
 * @param {number} userId - รหัสประจำตัว (ID) ของลูกบ้านที่เลือก
 */
function renderUserDetail(userId) {
    // ค้นหาข้อมูลลูกบ้านโดยใช้ ID
    const user = UsersData.find(u => u.id === userId);

    // ค้นหารถทุกคันของลูกบ้าน (ใช้ filter เพื่อดึงมาเป็น Array เพราะอาจมีหลายคัน)
    // ก่อนใช้งาน vehiclesData อย่าลืมเช็คว่ามันเป็น Array หรือไม่
    const userVehicles = Array.isArray(vehiclesData)
        ? vehiclesData.filter(v => v.user_id === userId)
        : [];

    const userDetailContainer = document.querySelector('#page-userDetail');

    // ป้องกันแอปพลิเคชันค้างกรณีหากค้นหาผู้ใช้งานคนนี้ไม่พบในระบบ
    if (!user) {
        userDetailContainer.innerHTML = `<p class="loading-text">ไม่พบข้อมูลผู้ใช้งาน</p>`;
        return;
    }
    console.log("กำลังเรนเดอร์ข้อมูลลูกบ้าน:", user);

    // วนลูปดึงข้อมูลรถทั้งหมดของบ้านหลังนี้มาจัดทำรายการ HTML
    let vehiclesHTML = '';
    if (userVehicles.length > 0) {
        userVehicles.forEach((vehicle, index) => {
            vehiclesHTML += `
            <div class="headVlist">
                <p class="Vlist">${vehicle.plate}</p>
                <p class="Vlist">${vehicle.type}</p>
                <!-- ลิงก์สำหรับขอดูเวลาเข้า-ออกโดยเฉพาะของรถคันนี้ โดยส่ง id ลูกบ้าน และ index ของรถไปใน dataset -->
                <a href="" data-target="vehicleDetail" data-car-plate="${vehicle.plate}" data-id="${user.id}">แสดงข้อมูลเพิ่มเติม</a>
            </div>`;
        });
    } else {
        // แถวว่างกรณีบ้านหลังนี้ไม่มีการลงทะเบียนยานพาหนะไว้
        vehiclesHTML = `<div class="headVlist">
                            <p class="Vlist">-</p>
                            <p class="Vlist">-</p>
                            <p></p>
                        </div>`;
    }

    // อัปเดต HTML ของหน้าข้อมูลส่วนบุคคลและข้อมูลรถ
    userDetailContainer.innerHTML = `
            <section class="homeDetail">
                <div class="homeNumber">
                    <p class="homeList">เลขที่บ้าน</p>
                    <p class="homeList">${user.houseNumber}</p>
                </div>
                <div class="nameOwner">
                    <p class="homeList">ชื่อเจ้าบ้าน</p>
                    <p class="homeList">${user.ownerName}</p>
                </div>
                <div class="TimeData">
                    <p class="homeList">วันที่เข้าอยู่: ${user.registerDate ?? '-'}</p>
                    <p class="homeList">วันที่สมัครสมาชิก: ${user.memberStartDate ?? '-'} | วันหมดอายุการใช้งาน: ${user.memberExpireDate ?? '-'}</p>
                </div>
            </section>
            <section class="vehicleUser">
                <h1 class="vehicleList">รายละเอียดยานพาหนะที่ลงทะเบียน</h1>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภทยานพาหนะ</h3>
                    <h3 class="Vlist">ดูข้อมูลเจาะลึก</h3>
                </div>
                ${vehiclesHTML}
            </section>`;
}


// ===================== Render รายละเอียดรถคันเฉพาะและการจัดกลุ่มประวัติเวลาเข้า-ออก (Vehicle Detail) =====================
/**
 * ฟังก์ชันสำหรับ Render ประวัติการเข้า-ออกของรถแต่ละคันอย่างละเอียดในรูปแบบของการ์ดตารางประวัติเวลา
 * @param {number} userId - รหัส ID ของเจ้าบ้านผู้ถือกรรมสิทธิ์รถ
 * @param {number} vehicleIndex - ลำดับของรถที่ระบุในรายการ Array (เช่น คันแรก = 0, คันสอง = 1)
 */
function renderEachVehicle(userId, vehiclePlate) {
    // หาข้อมูลรถของลูกบ้านหลัง
    const vData = vehiclesData.filter(p => p.user_id === userId);
    console.log("vData:", vData);
    // ดึงเฉพาะคันนั้นมาแสดง
    const vehicle = vData.find(v => v.plate === vehiclePlate);
    console.log("vehicle:", vehicle);
    // ดึงเวลาเข้าออก
    // const timeStamp = VeLog.filter(t => t.plate === vehiclePlate && t.user_id === userId);
    const timeStamp = VeLog.filter(t => t.plate === vehiclePlate);
    console.log("timeStamp:", timeStamp);

    const vehicleDetailContainer = document.querySelector("#page-vehicleDetail");
    if (!vData) {
        vehicleDetailContainer.innerHTML = `<p class="loading-text">ไม่พบข้อมูลเจ้าบ้าน</p>`;
        return;
    }

    // คัดกรองตัวรถยนต์โดยอ้างอิงลำดับดัชนีของ array รถ
    if (!vehicle) {
        vehicleDetailContainer.innerHTML = `<p class="loading-text">ไม่พบข้อมูลยานพาหนะของเจ้าบ้านหลังนี้</p>`;
        return;
    }

    // จัดระเบียบชุดเวลาเข้า และ เวลาออก เพื่อแยกแสดงผลเป็นคนละฝั่งในแบบกริด (Grid Column)
    let timeInHTML = '';
    let timeOutHTML = '';

    // // ตรวจสอบว่ามีข้อมูลเวลาบันทึกเข้าออกบ้างหรือไม่
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
        // หากไม่มีข้อมูลประวัติใดๆ ในทะเบียนเลย
        timeInHTML += `<span class="time-record">-</span>`;
        timeOutHTML += `<span class="time-record">-</span>`;
    }

    // สร้างเนื้อหาการ์ดข้อมูลประวัติรถยนต์แบบกริด
    let htmlContent = `<div class="vehicle-card">
    <!-- ส่วนแสดงหัวข้อการ์ดและวันลงทะเบียน -->
    <div class="v-title">รายละเอียดข้อมูลยานพาหนะ (Vehicle Details)</div>
    <div class="v-date">ลงทะเบียนเข้าระบบ: ${vehicle.registerDate ?? '-'} </div>

    <!-- ตารางแสดงรายละเอียดรถยนต์และบันทึกเวลา -->
    <div class="v-grid">
        <div class="v-item">ป้ายทะเบียน: ${vehicle.plate ?? '-'}</div>
        <div class="v-item">ประเภทยานพาหนะ: ${vehicle.type ?? '-'}</div>

        <div class="v-item" style="font-weight: bold;">ประวัติเวลาเข้า</div>
        <div class="v-item" style="font-weight: bold;">ประวัติเวลาออก</div>

        <!-- รายการเวลาเข้า (ฝั่งซ้าย) -->
        <div class="v-item v-time" id="time-in-list">
            ${timeInHTML}
        </div>

        <!-- รายการเวลาออก (ฝั่งขวา) -->
        <div class="v-item v-time" id="time-out-list">
            ${timeOutHTML}
        </div>
    </div>
    </div>`;
    vehicleDetailContainer.innerHTML = htmlContent;
}

// ===================== ระบบดักจับเหตุการณ์คลิกแบบสากล (Event Delegation) =====================
// ใช้ Event Delegation เพื่อดักจับคลิกใน .main-content ทำให้ไม่ต้องผูก Event (Event Listener) ใหม่ให้ปุ่มที่เพิ่งสร้าง
document.querySelector('.main-content').addEventListener('click', (e) => {
    // ตรวจสอบว่าสิ่งที่คลิกคือปุ่ม/ลิงก์ที่มี attribute data-target หรือไม่
    const link = e.target.closest('a[data-target]');
    if (!link) return; // หากเป็นการคลิกพื้นที่อื่นๆ ให้ข้ามการทำงานนี้ไป

    e.preventDefault(); // ยกเลิกพฤติกรรมของลิงก์ (Prevent Default)

    // ดึงข้อมูลที่เก็บใน HTML attribute (Destructuring Dataset)
    const { target, ...params } = link.dataset;

    console.log(`การทำงานนำทาง: สลับไปยังหน้า ${target}`);
    console.log(`ข้อมูลพารามิเตอร์เสริม:`, params);

    // สั่งสลับหน้าตามการควบคุมเส้นทางหน้าจอ พร้อมส่งพารามิเตอร์ไปด้วย
    showPage(target, params);
});


async function initData() {
    isLoading = true;
    refreshCurrentPage(); // แสดง UI แบบ Loading ระหว่างรอข้อมูล

    try {
        // รอให้ทั้งข้อมูลลูกบ้านและข้อมูลรถโหลดเสร็จสมบูรณ์ทั้งคู่
        await Promise.all([
            getUser(gUsers),
            getVehicles(gVehicles),
            getVeLog(pVeLog)
        ]);
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น:", error);
    } finally {
        // เมื่อโหลดเสร็จ (ไม่ว่าจะสำเร็จหรือล้มเหลว) ค่อยปิดสถานะ Loading และอัปเดต UI ครั้งเดียว
        isLoading = false;
        refreshCurrentPage();
    }
}

// เริ่มโหลดข้อมูลเมื่อโปรแกรมเริ่มทำงาน (Initialization)
initData();