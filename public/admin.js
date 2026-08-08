document.addEventListener('DOMContentLoaded', async () => {
    // Read ID from URL hash for better visual security
    const ticketId = window.location.hash.substring(1);

    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const ticketData = document.getElementById('ticketData');
    const scanBtn = document.getElementById('scanBtn');

    const loginState = document.getElementById('loginState');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    if (!ticketId) {
        // If no ticket ID, hide scan error and just let them login to see matches
        errorState.style.display = 'none';
        scanBtn.style.display = 'none';
        document.querySelector('[data-tab="scan"]').style.display = 'none';
        // Auto switch to matches tab
        document.getElementById('scanTab').classList.remove('active');
        document.getElementById('matchesTab').classList.add('active');
        document.querySelector('[data-tab="matches"]').classList.add('active');
    }

    // Check if logged in previously
    let adminUser = sessionStorage.getItem('adminUser');
    let adminPass = sessionStorage.getItem('adminPass');

    if (adminUser && adminPass) {
        loginState.style.display = 'none';
        if (ticketId) {
            fetchTicketData();
        } else {
            ticketData.style.display = 'block';
        }
        loadMatches();
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

        if (ticketId) {
            fetchTicketData();
        } else {
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
            loginState.style.display = 'none';
            ticketData.style.display = 'block';
            sessionStorage.setItem('adminUser', adminUser);
            sessionStorage.setItem('adminPass', adminPass);
        }
        loadMatches();
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

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
        });
    });

    // Matches Management
    const loadMatches = async () => {
        const matchesList = document.getElementById('adminMatchesList');
        try {
            const response = await fetch('/api/matches');
            const data = await response.json();
            
            if (data.success && data.matches.length > 0) {
                matchesList.innerHTML = data.matches.map(m => `
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="color: white;">${m.teamA} VS ${m.teamB}</strong>
                            <div style="color: #aaa; font-size: 0.9rem; margin-top: 5px;">${m.date} | ${m.time} | ${m.location}</div>
                        </div>
                        <div>
                            ${m.status === 'Active' 
                                ? `<button onclick="toggleMatchStatus('${m.id}', 'Closed')" class="btn" style="background: var(--danger); padding: 5px 10px; font-size: 0.9rem;">إغلاق الحجز</button>`
                                : `<button onclick="toggleMatchStatus('${m.id}', 'Active')" class="btn" style="background: var(--success); padding: 5px 10px; font-size: 0.9rem;">فتح الحجز</button>`
                            }
                        </div>
                    </div>
                `).join('');
            } else {
                matchesList.innerHTML = '<p style="color: #aaa; text-align: center;">لا توجد مباريات مضافة بعد.</p>';
            }
        } catch (error) {
            console.error('Error loading matches:', error);
            matchesList.innerHTML = '<p style="color: var(--danger); text-align: center;">خطأ في تحميل المباريات</p>';
        }
    };

    window.toggleMatchStatus = async (matchId, status) => {
        try {
            const response = await fetch(`/api/matches/${matchId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-user': adminUser,
                    'x-admin-pass': adminPass
                },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (data.success) {
                loadMatches();
            } else {
                alert('خطأ: ' + data.message);
            }
        } catch (error) {
            alert('حدث خطأ في الاتصال');
        }
    };

    document.getElementById('addMatchBtn').addEventListener('click', async (e) => {
        const teamA = document.getElementById('newTeamA').value.trim();
        const teamB = document.getElementById('newTeamB').value.trim();
        const date = document.getElementById('newDate').value;
        const time = document.getElementById('newTime').value;
        const location = document.getElementById('newLocation').value.trim();
        
        if (!teamA || !teamB || !date || !time || !location) {
            alert('الرجاء إدخال جميع بيانات المباراة');
            return;
        }

        const btn = e.target;
        btn.disabled = true;
        btn.textContent = 'جاري الإضافة...';

        try {
            const response = await fetch('/api/matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-user': adminUser,
                    'x-admin-pass': adminPass
                },
                body: JSON.stringify({ teamA, teamB, date, time, location })
            });
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('newTeamA').value = '';
                document.getElementById('newTeamB').value = '';
                document.getElementById('newDate').value = '';
                document.getElementById('newTime').value = '';
                document.getElementById('newLocation').value = '';
                loadMatches();
            } else {
                alert('خطأ: ' + data.message);
            }
        } catch (error) {
            alert('حدث خطأ في الاتصال');
        } finally {
            btn.disabled = false;
            btn.textContent = 'إضافة المباراة';
        }
    });
});
