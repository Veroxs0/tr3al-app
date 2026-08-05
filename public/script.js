document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const fileInput = document.getElementById('receipt');
    const fileNameDisplay = document.getElementById('fileName');
    const fileUploadText = document.getElementById('fileUploadText');
    const submitBtn = document.getElementById('submitBtn');
    
    // UI Elements for success state
    const formSection = document.getElementById('formSection');
    const successSection = document.getElementById('successSection');
    const qrCodeImage = document.getElementById('qrCodeImage');
    const ticketIdDisplay = document.getElementById('ticketIdDisplay');

    // Location radio buttons logic
    const locationRadios = document.querySelectorAll('input[name="location"]');
    const locationDetailsLabel = document.getElementById('locationDetailsLabel');
    const locationDetailsInput = document.getElementById('locationDetails');

    locationRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'بنها') {
                locationDetailsLabel.textContent = 'منين من بنها؟';
                locationDetailsInput.placeholder = 'أدخل منطقتك بالتفصيل';
            } else {
                locationDetailsLabel.textContent = 'منين من خارج بنها؟';
                locationDetailsInput.placeholder = 'أدخل محافظتك ومنطقتك بالتفصيل';
            }
        });
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            if (!file.type.startsWith('image/')) {
                alert('الرجاء رفع صورة فقط (لا يمكن رفع ملفات أو فيديوهات).');
                e.target.value = '';
                fileNameDisplay.textContent = '';
                fileUploadText.textContent = 'اضغط هنا لرفع صورة الإيصال';
                fileUploadText.style.color = '';
                return;
            }

            if (file.size > 200 * 1024) {
                alert('حجم الصورة كبير جداً. الحد الأقصى هو 200 كيلوبايت.');
                e.target.value = '';
                fileNameDisplay.textContent = '';
                fileUploadText.textContent = 'اضغط هنا لرفع صورة الإيصال';
                fileUploadText.style.color = '';
                return;
            }

            fileNameDisplay.textContent = 'الملف المرفق: ' + file.name;
            fileUploadText.textContent = 'تم اختيار الصورة بنجاح ✔';
            fileUploadText.style.color = 'var(--success)';
        } else {
            fileNameDisplay.textContent = '';
            fileUploadText.textContent = 'اضغط هنا لرفع صورة الإيصال';
            fileUploadText.style.color = '';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Disable button & show loader
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        
        // Get matchId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const matchId = urlParams.get('matchId');
        if (!matchId) {
            alert('الرجاء اختيار مباراة أولاً من الصفحة الرئيسية.');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }

        const formData = new FormData(e.target);
        formData.append('matchId', matchId);

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Show QR Code and success section
                qrCodeImage.src = data.qrCodeDataUrl;
                ticketIdDisplay.textContent = data.ticketId;
                
                formSection.style.display = 'none';
                successSection.classList.add('active');
            } else {
                alert('حدث خطأ: ' + (data.message || 'يرجى المحاولة مرة أخرى'));
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('حدث خطأ في الاتصال بالخادم. تأكد من اتصالك بالإنترنت.');
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });
});
