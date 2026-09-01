

/**
 * Switch between Login and Register tabs
 * @param {string} tabName - 'login' or 'register'
 */
function switchTab(tabName) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const indicator = document.getElementById('tab-indicator');

    if (tabName === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');

        formLogin.classList.add('active');
        formRegister.classList.remove('active');

        indicator.style.transform = 'translateX(0%)';
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');

        formRegister.classList.add('active');
        formLogin.classList.remove('active');

        indicator.style.transform = 'translateX(100%)';
    }
}

/**
 * Toggle Password Visibility (Eye Icon)
 * @param {string} inputId - ID of the password input
 * @param {HTMLElement} btnElement - Toggle button element
 */
function togglePasswordVisibility(inputId, btnElement) {
    const pwdInput = document.getElementById(inputId);
    const icon = btnElement.querySelector('i');

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Handle Registration Submission
 * @param {Event} e 
 */
async function handleRegister(e) {
    e.preventDefault();

    const fullname = document.getElementById('reg-fullname').value.trim();
    const houseno = document.getElementById('reg-houseno').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;

    // Validations (ตรวจความถูกต้อง)
    if (!fullname || !houseno || !username || !password) {
        return alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
    }
    if (username.length < 4) return alert('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
    if (password.length < 6) return alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');

    // เตรียมเรื่องวันที่
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    const formatDate = (date) => date.toISOString().split('T')[0];

    // 📦 Payload 1: สำหรับระบบ Login (เก็บแค่ Username / Password)
    const authPayload = {
        username: username,
        password: password
    };

    // 📦 Payload 2: สำหรับเก็บข้อมูลลูกบ้าน (ข้อมูลอื่นๆ)
    const dataPayload = {
        houseNumber: houseno,
        ownerName: fullname,
        username: username, // ส่ง username ไปด้วยเพื่อไว้เชื่อมข้อมูลกับระบบ Login
        role: "member",
        registerDate: formatDate(today),
        memberStartDate: formatDate(today),
        memberExpireDate: formatDate(nextYear)
    };

    try {

        // 🚀 ยิง POST ที่ 1 : บันทึกข้อมูลลูกบ้านลง Cloud (Onrender)
        const dataResponse = await fetch('https://api-node-iot.onrender.com/api/users/createUser', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPayload)
        });
        const dataResult = await dataResponse.json();

        if (!dataResponse.ok) {
            throw new Error(dataResult.message || 'สร้างบัญชี Login สำเร็จ แต่ไม่สามารถบันทึกข้อมูลลูกบ้านได้');
        } else {
            // ดึงข้อมูลจาก getUsers เพื่อหา ID ของลูกบ้านที่เพิ่งสร้าง
            const usersRes = await fetch('https://api-node-iot.onrender.com/api/users/getUsers');
            const usersList = await usersRes.json();

            // หาข้อมูลที่ตรงกับบ้านเลขที่และชื่อ (reverse เพื่อหาข้อมูลที่เพิ่งสร้างล่าสุด)
            const createdUser = [...usersList].reverse().find(u => u.houseNumber === houseno && u.ownerName === fullname);

            if (!createdUser) {
                throw new Error('บันทึกข้อมูลลูกบ้านสำเร็จ แต่ไม่สามารถดึง ID ของผู้ใช้งานได้');
            }

            // นำ ID ที่ได้ใส่ลงไปใน authPayload
            authPayload.user_id = createdUser.id;

            // 🚀 ยิง POST ที่ 2 : สร้างบัญชีสำหรับ Login
            const authResponse = await fetch('https://api-node-iot.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authPayload)
            });
            const authResult = await authResponse.json();
            // ถ้าสร้างบัญชีล็อกอินไม่สำเร็จ ให้หยุดการทำงานและแจ้งเตือนเลย
            if (!authResponse.ok) {
                throw new Error(authResult.message || 'ไม่สามารถสร้างบัญชีผู้ใช้ (Login) ได้');
            }
            alert('ลงทะเบียนสมาชิกสำเร็จ!');
            document.getElementById('form-register').reset();
            switchTab('login');
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').focus();
        }

        // ถ้ายิงผ่านทั้ง 2 POST

    } catch (error) {
        console.error("Registration Error:", error);
        alert(error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}
/**
 * Handle Login Submission
 * @param {Event} e 
 */
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        // ส่งข้อมูลไปตรวจสอบที่หลังบ้าน (Backend API)
        const response = await fetch(`https://api-node-iot.onrender.com/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('เข้าสู่ระบบสำเร็จ!');
            // เก็บ Token และ ID ที่หลังบ้านส่งกลับมา
            console.log('token:', data.token);
            localStorage.setItem('token', data.token);
            // ส่ง ID
            if (data.id) localStorage.setItem('userId', data.id);

            try {
                // ดึงข้อมูล users จาก Cloud API
                const usersResponse = await fetch('https://api-node-iot.onrender.com/api/users/getUsers');
                const usersList = await usersResponse.json();
                console.log(usersList);
                // หา user ที่ตรงกับ ID ที่ได้มาตอนล็อกอิน
                const currentUser = usersList.find(u => String(u.id) === String(data.id));
                if (currentUser) {
                    if (currentUser.role === 'admin') {
                        window.location.href = '../admin/admin.html';
                    } else {
                        window.location.href = '../user/user.html';
                    }
                } else {
                    // ถ้าหาไม่เจอใน Cloud ให้กลับไปหน้า index.html
                    window.location.href = '../../index.html';
                }
            } catch (err) {
                console.error('Error fetching users:', err);
                window.location.href = '../../index.html';
            }
        } else {
            alert(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
    } catch (error) {
        alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
}


/**
 * Handle Forgot Password Link
 * @param {Event} e 
 */
function handleForgotPassword(e) {
    e.preventDefault();
    alert('กรุณาติดต่อนิติบุคคล Smart Village VCCES เพื่อขอรีเซ็ตรหัสผ่าน');
}
