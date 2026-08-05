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
            fileNameDisplay.textContent = 'الملف المرفق: ' + e.target.files[0].name;
            fileUploadText.textContent = 'تم اختيار الإيصال ✓';
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
        
        const formData = new FormData(form);

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
