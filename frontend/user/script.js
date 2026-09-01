"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================
    // ส่วนที่ 1: กำหนด URL เชื่อมต่อ Cloud RESTful API Backend
    // ==========================================================
    const BASE_API_URL = "https://api-node-iot.onrender.com/api";
    const GET_USERS_API = `${BASE_API_URL}/users/getUsers`;                 // ดึงข้อมูลลูกบ้านทั้งหมด (GET)
    const CREATE_USER_API = `${BASE_API_URL}/users/createUser`;             // สร้างสมาชิกลูกบ้านใหม่ (POST)
    const UPDATE_USER_API = `${BASE_API_URL}/users/updateUser`;             // อัปเดตข้อมูล/ต่ออายุสมาชิก (PUT)
    const GET_VEHICLES_API = `${BASE_API_URL}/vehicles/getVehicles`;         // ดึงข้อมูลรถยนต์ทั้งหมด (GET)
    const CREATE_VEHICLE_API = `${BASE_API_URL}/vehicles/createVehicle`;     // เพิ่มรถยนต์เข้าฐานข้อมูล (POST)
    const DELETE_VEHICLE_API = `${BASE_API_URL}/vehicles/deleteVehicle`;     // ลบข้อมูลรถยนต์ (DELETE)
    const GET_LOGS_API = `${BASE_API_URL}/logs/getLogs`;                     // ดึงประวัติการเข้า-ออกของกล้อง LPR (GET)

    // ==========================================================
    // ส่วนที่ 2: ตัวแปรสถานะระบบส่วนกลาง (Global App State)
    // ==========================================================
    let currentUser = null;
    const currentUserId = localStorage.getItem('userId');
    let allUsersData = [];       // เก็บข้อมูลลูกบ้านทั้งหมดจาก Cloud
    let allVehiclesData = [];    // เก็บข้อมูลรถยนต์ทั้งหมดจาก Cloud
    let allLogsData = [];        // เก็บประวัติการเข้า-ออกของรถยนต์จากกล้อง LPR
    let currentActiveBarcode = localStorage.getItem('savedVisitorBarcode') || null;  // ดึงรหัสบาร์โค้ดเดิมที่เคยสร้างค้างไว้ (ถ้ามี)

    // ==========================================================
    // ส่วนที่ 3: ดึง Elements ทั้งหมดจากหน้า HTML
    // ==========================================================
    const logoutBtn = document.getElementById('logoutBtn');
    const navItems = document.querySelectorAll('nav li[data-target]');
    const pages = document.querySelectorAll('.page');

    // Elements ระบบสร้าง Dynamic QR Code สำหรับ Visitor
    const qrModal = document.getElementById('qrModal');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const btnDeleteBarcode = document.getElementById('btnDeleteBarcode');
    const qrImageContainer = document.getElementById('qrImageContainer');
    const qrDataText = document.getElementById('qrDataText');
    const visitorCodeDisplay = document.getElementById('visitorCodeDisplay');
    // Elements ระบบลงทะเบียนรถยนต์
    const addVehicleModal = document.getElementById('addVehicleModal');
    const addVehicleForm = document.getElementById('addVehicleForm');
    const btnCancelAddVehicle = document.getElementById('btnCancelAddVehicle');

    // ==========================================================
    // ส่วนที่ 4: ฟังก์ชันจัดการ Helper และการแปลงข้อความ
    // ==========================================================
    // ฟังก์ชันสุ่มรหัสตัวเลขล้วน 13 หลัก (จำลองรูปแบบบาร์โค้ดบัตร ปชช.)
    function generateRandomVisitorCode(length = 13) {
        const digits = '0123456789';
        let res = digits.charAt(Math.floor(Math.random() * 9) + 1); // หลักแรกไม่เป็น 0
        for (let i = 1; i < length; i++) {
            res += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return res;
    }

    function parseDate(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr.includes('-')) return new Date(dateStr);
        const parts = dateStr.split('/');
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }

    function formatDateDisplay(dateStr) {
        if (!dateStr || dateStr === '-') return '-';
        const d = parseDate(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('th-TH');
    }

    function updateAuthUI() {
        if (localStorage.getItem('userId')) {
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            window.location.href = '../login/frontend/index.html';
        }
    }

    // ==========================================================
    // ส่วนที่ 5: ฟังก์ชันหลักในการดึงข้อมูลสดจาก Cloud Database (Sync Data)
    // ==========================================================
    async function syncDatabase() {
        try {
            const [usersRes, vehRes, logsRes] = await Promise.all([
                fetch(GET_USERS_API),
                fetch(GET_VEHICLES_API),
                fetch(GET_LOGS_API)
            ]);

            const usersData = await usersRes.json();
            const vehData = await vehRes.json();
            const logsData = await logsRes.json();

            allUsersData = Array.isArray(usersData) ? usersData : (usersData.data || []);
            allVehiclesData = Array.isArray(vehData) ? vehData : (vehData.data || []);
            allLogsData = Array.isArray(logsData) ? logsData : (logsData.data || []);

            if (currentUserId) {
                // หา user ที่เปิดหน้านี้
                const matchedUser = allUsersData.find(u => String(u.id) === String(currentUserId));
                if (matchedUser) {
                    currentUser = matchedUser;
                }
            }
        } catch (error) {
            console.error("เชื่อมต่อ Cloud API ผิดพลาด:", error);
        }
    }

    // ==========================================================
    // ส่วนที่ 8: ระบบจัดการรถยนต์ (เพิ่มรถ + ลบรถ + ตัดช่องว่าง)
    // ==========================================================
    if (addVehicleForm) {
        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const plateRaw = document.getElementById('inputPlate').value.trim();
            const provinceRaw = document.getElementById('inputProvince').value.trim();
            if (!plateRaw || !provinceRaw || !currentUser) return;

            const cleanedPlate = sanitizePlate(plateRaw);
            const cleanedProvince = provinceRaw.replace(/\s+/g, '');
            const todayDisplay = new Date().toISOString().split('T')[0];

            const payload = {
                user_id: currentUser.id,
                plate: cleanedPlate,
                province: cleanedProvince,
                type: "Car",
                registerDate: todayDisplay
            };

            try {
                const res = await fetch(CREATE_VEHICLE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert(`ลงทะเบียนรถยนต์ป้ายทะเบียน "${cleanedPlate}" (${cleanedProvince}) เรียบร้อยแล้ว!`);
                    addVehicleModal.style.display = 'none';
                    document.getElementById('inputPlate').value = '';
                    document.getElementById('inputProvince').value = '';
                    await syncDatabase();
                    renderDirectUserDetail();
                } else {
                    alert("เพิ่มรถยนต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                }
            } catch (err) {
                console.error("API Add Vehicle Error:", err);
                alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลรถได้");
            }
        });
    }

    if (btnCancelAddVehicle) {
        btnCancelAddVehicle.addEventListener('click', () => {
            addVehicleModal.style.display = 'none';
        });
    }

    async function deleteVehicle(vehicleId, plateName) {
        if (!confirm(`คุณต้องการลบรถยนต์ป้ายทะเบียน "${plateName}" ออกจากฐานข้อมูลใช่หรือไม่?`)) return;

        try {
            const res = await fetch(`${DELETE_VEHICLE_API}/${vehicleId}`, { method: 'DELETE' });
            if (res.ok) {
                alert("ลบรายการรถยนต์เรียบร้อยแล้ว!");
                await syncDatabase();
                renderDirectUserDetail();
            } else {
                alert("ลบข้อมูลไม่สำเร็จ");
            }
        } catch (err) {
            console.error("API Delete Vehicle Error:", err);
            alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อลบข้อมูลได้");
        }
    }

    // ==========================================================
    // ส่วนที่ 9: ระบบต่ออายุสมาชิก บันทึกลง Database จริง (PUT แบบป้องกันค่า Null)
    // ==========================================================

    async function renewMembership() {
        if (!currentUser) return;

        const today = new Date();
        const newExpObj = new Date(today);
        newExpObj.setFullYear(newExpObj.getFullYear() + 1);
        const newExpStr = newExpObj.toISOString().split('T')[0];

        const updatePayload = {
            houseNumber: currentUser.houseNumber || "",
            ownerName: currentUser.ownerName || "",
            username: currentUser.username || currentUser.houseNumber || "",
            password: currentUser.password || "pass123",
            role: currentUser.role || "member",
            registerDate: currentUser.registerDate || new Date().toISOString().split('T')[0],
            memberStartDate: currentUser.memberStartDate || new Date().toISOString().split('T')[0],
            memberExpireDate: newExpStr
        };

        try {
            const res = await fetch(`${UPDATE_USER_API}/${currentUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });

            if (res.ok) {
                alert(`ต่ออายุสมาชิกสำเร็จสำหรับบ้านเลขที่ ${currentUser.houseNumber}!\nวันหมดอายุใหม่: ${formatDateDisplay(newExpStr)}`);
                await syncDatabase();
                renderDirectUserDetail();
            } else {
                alert("ต่ออายุสมาชิกไม่สำเร็จ กรุณาลองใหม่");
            }
        } catch (err) {
            console.error("API Update User Error:", err);
            alert("ไม่สามารถติดต่อเซิร์ฟเวอร์เพื่อต่ออายุสมาชิกได้");
        }
    }

    // ==========================================================
    // ส่วนที่ 10: การเรนเดอร์หน้าจอ (User Detail, Dashboard, และ Logs)
    // ==========================================================
    function createExpiryProgressBar(startDateStr, timeoutDateStr) {
        const end = parseDate(timeoutDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
        const totalDays = 365;
        let percent = Math.min(100, Math.max(0, (remainingDays / totalDays) * 100));

        let color = '#28a745';
        if (remainingDays <= 0) {
            percent = 0;
            color = '#dc3545';
        } else if (remainingDays <= 30) {
            color = '#dc3545';
        } else if (remainingDays <= 90) {
            color = '#ffc107';
        }

        let statusText = `เหลืออีก ${remainingDays} วัน`;
        if (remainingDays <= 0) {
            statusText = 'หมดอายุแล้ว';
        }

        return `
        <div class="expire-progress-box">
            <div class="expire-info">
                <span>สถานะบัตรสมาชิก (หมดอายุ: ${formatDateDisplay(timeoutDateStr)})</span>
                <span><b>${statusText}</b></span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${percent.toFixed(1)}%; background-color: ${color};"></div>
            </div>
        </div>`;
    }

    function renderDirectUserDetail() {
        const container = document.getElementById('userDirectDetail');
        if (!container || !currentUser) return;

        const myVehicles = allVehiclesData.filter(v => v.user_id === currentUser.id);

        let vehiclesHTML = '';
        if (myVehicles.length > 0) {
            myVehicles.forEach((v) => {
                const typeText = v.type === "Motorcycle" ? "รถจักรยานยนต์" : "รถยนต์";
                vehiclesHTML += `
                <div class="headVlist">
                    <p class="Vlist">${v.plate} ${v.province ? `(${v.province})` : ''}</p>
                    <p class="Vlist">${typeText}</p>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; width: 100%;">
                        <a href="#" data-target="vehicleDetail" data-car-plate="${v.plate}" data-car-id="${v.id}">ดูประวัติ</a>
                        <button type="button" class="btn-delete-v" data-v-id="${v.id}" data-v-plate="${v.plate}">🗑️ ลบ</button>
                    </div>
                </div>`;
            });
        } else {
            vehiclesHTML = `<div class="headVlist">
                                <p class="Vlist">ไม่มีข้อมูลยานพาหนะที่ลงทะเบียน</p>
                                <p class="Vlist">-</p>
                                <p></p>
                            </div>`;
        }

        const progressBar = createExpiryProgressBar(currentUser.memberStartDate, currentUser.memberExpireDate);

        container.innerHTML = `
            <div class="homeNumber">
                <p class="homeList">เลขที่บ้าน</p>
                <p class="homeList">${currentUser.houseNumber || '-'}</p>
            </div>
            <div class="nameOwner">
                <p class="homeList">ชื่อเจ้าบ้าน</p>
                <p class="homeList">${currentUser.ownerName || '-'}</p>
            </div>
            <div class="TimeData">
                <p class="homeList">วันที่เข้าอยู่: ${formatDateDisplay(currentUser.registerDate)}</p>
                <p class="homeList">วันที่เริ่มสมาชิก: ${formatDateDisplay(currentUser.memberStartDate)} | หมดอายุ: ${formatDateDisplay(currentUser.memberExpireDate)}</p>
            </div>
            ${progressBar}
            
            <div style="text-align: center; margin-top: 10px;">
                <button type="button" id="btnRenewMember" style="background-color: #ffc107; color: #212529; border: none; padding: 8px 20px; border-radius: 20px; font-weight: 700; cursor: pointer; font-family: Prompt; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">🔄 ต่ออายุสมาชิก (+1 ปี)</button>
            </div>

            <div class="qr-section">
                <button type="button" class="qr-btn-generate" id="btnGenerateVisitorQR">🎫 สร้าง Barcode สำหรับแขกสแกนเข้าหมู่บ้าน</button>
            </div>

            <section class="vehicleUser">
                <div class="vehicle-header-flex">
                    <h1 class="vehicleList">รายละเอียดยานพาหนะที่ผูกไว้</h1>
                    <button type="button" class="btn-add-vehicle" id="btnOpenAddVehicleModal">＋ ลงทะเบียนรถเพิ่ม</button>
                </div>
                <div class="headVlist">
                    <h3 class="Vlist">ป้ายทะเบียน</h3>
                    <h3 class="Vlist">ประเภท</h3>
                    <h3 class="Vlist">การจัดการ</h3>
                </div>
                ${vehiclesHTML}
            </section>`;

        const btnRenewMember = document.getElementById('btnRenewMember');
        if (btnRenewMember) btnRenewMember.addEventListener('click', renewMembership);

        const btnOpenAddVehicleModal = document.getElementById('btnOpenAddVehicleModal');
        if (btnOpenAddVehicleModal) {
            btnOpenAddVehicleModal.addEventListener('click', () => {
                addVehicleModal.style.display = 'flex';
            });
        }

        container.querySelectorAll('.btn-delete-v').forEach(btn => {
            btn.addEventListener('click', (e) => {
                deleteVehicle(e.target.dataset.vId, e.target.dataset.vPlate);
            });
        });

        const btnGenerateVisitorQR = document.getElementById('btnGenerateVisitorQR');
        if (btnGenerateVisitorQR) {
            btnGenerateVisitorQR.addEventListener('click', async () => {
                if (!currentActiveBarcode) {
                    currentActiveBarcode = generateRandomVisitorCode(13);
                    localStorage.setItem('savedVisitorBarcode', currentActiveBarcode);
                }
                console.log("Generate new barcode:", currentActiveBarcode);
                const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${currentActiveBarcode}&scale=3&height=12&includetext`;

                if (visitorCodeDisplay) visitorCodeDisplay.textContent = currentActiveBarcode;
                if (qrImageContainer) qrImageContainer.innerHTML = `<img src="${barcodeUrl}" alt="Visitor Barcode 13 Digits" style="max-width: 100%; height: auto; border-radius: 4px;">`;
                if (qrDataText) qrDataText.textContent = `Barcode Number: ${currentActiveBarcode} (บ้านเลขที่: ${currentUser.houseNumber || '-'})`;
                if (qrModal) qrModal.style.display = 'flex';
            });
        }
    }

    function renderVehicleDetail(targetPlate, vehicleId) {
        const pVdetail = document.querySelector("#page-vehicleDetail");
        if (!pVdetail) return;

        const vehicle = allVehiclesData.find(v => v.id === Number(vehicleId) || sanitizePlate(v.plate) === sanitizePlate(targetPlate));
        const matchedLogs = getMatchedVehicleLogs(allLogsData, targetPlate);

        let timeIn = '', timeOut = '';
        if (matchedLogs.length > 0) {
            matchedLogs.forEach((log) => {
                timeIn += `<span class="time-record">${log.formattedTimeIn} ${log.cameraInText}</span>`;
                timeOut += `<span class="time-record">${log.formattedTimeOut} ${log.cameraOutText}</span>`;
            });
        } else {
            timeIn = `<span class="time-record">ไม่พบประวัติเข้า</span>`;
            timeOut = `<span class="time-record">ไม่พบประวัติออก</span>`;
        }

        pVdetail.innerHTML = `
        <button type="button" class="back-btn" id="btnBackToDetail">← กลับ</button>
        <div class="vehicle-card">
            <div class="v-title">ประวัติการเข้า-ออก (ดึงข้อมูลจากระบบกล้อง LPR)</div>
            <div class="v-date">วันที่ลงทะเบียนรถ : ${formatDateDisplay(vehicle ? vehicle.registerDate : '')} </div>
            <div class="v-grid">
                <div class="v-item">ป้ายทะเบียน : ${vehicle ? vehicle.plate : targetPlate}</div>
                <div class="v-item">ประเภท : ${vehicle ? vehicle.type : 'รถยนต์'}</div>
                <div class="v-item">เวลาเข้า</div>
                <div class="v-item">เวลาออก</div>
                <div class="v-item v-time">${timeIn}</div>
                <div class="v-item v-time">${timeOut}</div>
            </div>
        </div>`;

        document.getElementById('btnBackToDetail')?.addEventListener('click', () => renderPage('user'));
    }

    // ==========================================================
    // ส่วนที่ 11: การควบคุมระบบ Routing และการเริ่มต้นทำงาน (Initial)
    // ==========================================================
    function renderPage(target, params = null) {
        pages.forEach(page => page.classList.remove('active'));

        const targetPage = document.querySelector(`#page-${target}`);
        if (targetPage) targetPage.classList.add('active');

        if (target === "user") {
            renderDirectUserDetail();
        } else if (target === "vehicleDetail" && params) {
            renderVehicleDetail(params.carPlate, params.carId);
        }
    }

    navItems.forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            renderPage(li.dataset.target);
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            currentUser = null;
            window.location.href = '../login/frontend/index.html';
        });
    }

    // จัดการปุ่มยกเลิก/ลบบาร์โค้ด (Cancel / Delete Barcode)
    if (btnDeleteBarcode) {
        btnDeleteBarcode.addEventListener('click', async () => {
            if (!currentActiveBarcode) return;

            if (confirm(`คุณต้องการยกเลิกและลบบาร์โค้ดรหัส "${currentActiveBarcode}" ออกใช่หรือไม่?`)) {

                // 🚩 จุดเชื่อมต่อ API ยิงลบออกจากฐานข้อมูลหลังบ้าน
                /*
                try {
                    await fetch(`${DELETE_VISITOR_API}/${currentActiveBarcode}`, {
                        method: 'DELETE'
                    });
                } catch (err) {
                    console.error("ลบบาร์โค้ดจาก DB ไม่สำเร็จ:", err);
                }
                */

                alert(`ยกเลิกและลบบาร์โค้ดรหัส ${currentActiveBarcode} เรียบร้อยแล้ว!`);

                // ล้างค่าทิ้งเพื่อให้ครั้งหน้าสุ่มรหัสใหม่
                localStorage.removeItem('savedVisitorBarcode');
                currentActiveBarcode = null;

                qrModal.style.display = 'none';
                qrImageContainer.innerHTML = '';
                visitorCodeDisplay.textContent = '-';
                qrDataText.textContent = '';
            }
        });
    }

    if (btnCloseQr) {
        btnCloseQr.addEventListener('click', () => {
            qrModal.style.display = 'none';
        });
    }

    document.querySelector('.main-content')?.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-target]');
        if (!link) return;
        e.preventDefault();
        const { target, ...params } = link.dataset;
        renderPage(target, params);
    });

    async function init() {
        if (!currentUserId) {
            window.location.href = '../login/frontend/index.html';
            return;
        }

        await syncDatabase();

        if (currentUser) {
            updateAuthUI();
            renderPage('user');
        } else {
            // เซสชั่นไม่ถูกต้อง หรือไม่มีบัญชีผู้ใช้นี้ในฐานข้อมูลแล้ว
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = '../login/frontend/index.html';
        }
    }

    init();
});

// ==========================================================
// ส่วนที่ 12: ฟังก์ชันสำหรับ Sanitization และจัดการค่า Null
// ==========================================================

function sanitizePlate(plateNumber) {
    if (!plateNumber) return '';
    return plateNumber.toString().replace(/\s+/g, '');
}

function formatLogDateTime(dateString) {
    if (!dateString || dateString === 'null') {
        return 'ยังอยู่ภายในโครงการ';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getMatchedVehicleLogs(apiResponseData, targetPlate) {
    if (!Array.isArray(apiResponseData)) return [];

    const cleanTarget = sanitizePlate(targetPlate);

    return apiResponseData
        .filter(log => sanitizePlate(log.plate) === cleanTarget)
        .map(log => ({
            ...log,
            formattedTimeIn: formatLogDateTime(log.time_in),
            formattedTimeOut: formatLogDateTime(log.time_out),
            cameraInText: log.camera_in ? `(${log.camera_in})` : '',
            cameraOutText: log.camera_out ? `(${log.camera_out})` : ''
        }));
}