document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const ticketData = document.getElementById('ticketData');
    const scanBtn = document.getElementById('scanBtn');

    const loginState = document.getElementById('loginState');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    if (!ticketId) {
        loginState.style.display = 'none';
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorMessage.textContent = 'رابط غير صالح: مفقود رقم التذكرة';
        return;
    }

    // Check if logged in previously
    let adminUser = sessionStorage.getItem('adminUser');
    let adminPass = sessionStorage.getItem('adminPass');

    if (adminUser && adminPass) {
        loginState.style.display = 'none';
        fetchTicketData();
    }

    loginBtn.addEventListener('click', () => {
        const user = document.getElementById('adminUser').value.trim();
        const pass = document.getElementById('adminPass').value.trim();

        if (!user || !pass) {
            loginError.textContent = 'الرجاء إدخال اسم المستخدم وكلمة المرور';
            loginError.style.display = 'block';
            return;
        }

        adminUser = user;
        adminPass = pass;
        
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
        loginError.style.display = 'none';

        fetchTicketData();
    });

    async function fetchTicketData() {
        loginState.style.display = 'none';
        loadingState.style.display = 'block';

        try {
            const response = await fetch(`/api/ticket/${ticketId}`, {
                headers: {
                    'x-admin-user': adminUser,
                    'x-admin-pass': adminPass
                }
            });
        const data = await response.json();

        if (data.success) {
            const t = data.ticket;
            
            document.getElementById('t-name').textContent = t.fullName;
            document.getElementById('t-phone').textContent = t.phone;
            document.getElementById('t-fanid').textContent = t.fanId;
            document.getElementById('t-location').textContent = t.location;
            document.getElementById('t-payment').textContent = t.paymentOption;
            document.getElementById('t-notes').textContent = t.notes || 'لا يوجد';
            
            document.getElementById('t-receipt').src = t.receiptUrl;
            document.getElementById('receiptLink').href = t.receiptUrl;

            const statusEl = document.getElementById('t-status');
            if (t.status === 'Valid') {
                statusEl.textContent = 'صالحة';
                statusEl.className = 'status-badge status-valid';
                scanBtn.style.display = 'block';
            } else {
                statusEl.textContent = 'تم استخدامها مسبقاً';
                statusEl.className = 'status-badge status-scanned';
                scanBtn.style.display = 'none';
            }

            loadingState.style.display = 'none';
            ticketData.style.display = 'block';
            // Save credentials on successful fetch
            sessionStorage.setItem('adminUser', adminUser);
            sessionStorage.setItem('adminPass', adminPass);

        } else {
            loadingState.style.display = 'none';
            if (response.status === 401) {
                loginState.style.display = 'block';
                loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة!';
                loginError.style.display = 'block';
                sessionStorage.removeItem('adminUser');
                sessionStorage.removeItem('adminPass');
                if(loginBtn) {
                    loginBtn.classList.remove('loading');
                    loginBtn.disabled = false;
                }
            } else {
                errorState.style.display = 'block';
                errorMessage.textContent = data.message || 'التذكرة غير موجودة';
            }
        }
    } catch (error) {
        console.error('Error fetching ticket:', error);
        loadingState.style.display = 'none';
        errorState.style.display = 'block';
        errorMessage.textContent = 'حدث خطأ في الاتصال بالخادم';
    }
    }

    scanBtn.addEventListener('click', async () => {
        const confirmScan = confirm('هل أنت متأكد من تأكيد حضور هذا الراكب؟ لا يمكن التراجع عن هذه الخطوة.');
        if (!confirmScan) return;

        scanBtn.disabled = true;
        scanBtn.classList.add('loading');

        try {
            const response = await fetch(`/api/ticket/${ticketId}/scan`, {
                method: 'POST',
                headers: {
                    'x-admin-user': adminUser,
                    'x-admin-pass': adminPass
                }
            });
            const data = await response.json();

            if (data.success) {
                alert('تم تسجيل الحضور بنجاح!');
                window.location.reload();
            } else {
                alert('خطأ: ' + (data.message || 'تعذر تحديث الحالة'));
                scanBtn.disabled = false;
                scanBtn.classList.remove('loading');
            }
        } catch (error) {
            console.error('Error scanning ticket:', error);
            alert('حدث خطأ في الاتصال بالخادم');
            scanBtn.disabled = false;
            scanBtn.classList.remove('loading');
        }
    });
});
