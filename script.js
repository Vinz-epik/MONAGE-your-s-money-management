document.addEventListener('DOMContentLoaded', () => {

    const db = new Localbase('bukuKasDb');
    db.config.debug = false;

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = '#334155';

    const getTodayDate = () => {
        const todayDateObj = new Date();
        const year = todayDateObj.getFullYear();
        const month = (todayDateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = todayDateObj.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const showCustomNotification = (message, type = 'success') => {
        const notifId = 'custom-notification';
        let existingNotif = document.getElementById(notifId);
        if (existingNotif) existingNotif.remove();

        const notif = document.createElement('div');
        notif.id = notifId;
        notif.style.position = 'fixed';
        notif.style.top = '20px';
        notif.style.left = '50%';
        notif.style.transform = 'translateX(-50%) translateY(-20px)';
        notif.style.opacity = '0';
        notif.style.padding = '14px 24px';
        notif.style.borderRadius = '50px'; 
        
        if (type === 'success') {
            notif.style.background = '#ffffff';
            notif.style.color = '#064e3b';
            notif.style.border = '1px solid #34d399';
        } else {
            notif.style.background = '#ffffff';
            notif.style.color = '#b91c1c';
            notif.style.border = '1px solid #f87171';
        }

        notif.style.fontWeight = '600';
        notif.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        notif.style.zIndex = '2000';
        notif.style.transition = 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)';
        notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        
        document.body.appendChild(notif);

        requestAnimationFrame(() => {
            notif.style.transform = 'translateX(-50%) translateY(0)';
            notif.style.opacity = '1';
        });

        setTimeout(() => {
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    };
    
    let transactions = [];
    let categories = [];
    let recurring = [];
    let userProfile = { name: 'Pengguna Baru', avatar: '' };
    
    let arusKasPieInstance = null;
    let lineChartInstance = null;
    let selectedDateForCharts = getTodayDate();

    const saldoEl = document.getElementById('saldo-saat-ini');
    const pemasukanHarianEl = document.getElementById('pemasukan-harian');
    const pengeluaranHarianEl = document.getElementById('pengeluaran-harian');
    const saranEl = document.getElementById('saran-bulanan');

    const transaksiForm = document.getElementById('transaksiForm');
    const tglTransaksiEl = document.getElementById('tgl-transaksi');
    const jumlahTransaksiEl = document.getElementById('jumlah-transaksi');
    const ketTransaksiEl = document.getElementById('ket-transaksi');
    const katTransaksiEl = document.getElementById('kat-transaksi');
    const listTransaksiEl = document.getElementById('list-transaksi');

    const arusKasPieCtx = document.getElementById('arusKasHarianPieChart')?.getContext('2d');
    const lineChartCtx = document.getElementById('arusKasTahunanLineChart')?.getContext('2d');
    const tglLaporanHarianEl = document.getElementById('tgl-laporan-harian');

    const settingsBtn = document.getElementById('openSettingsBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const closeModalBtn = document.getElementById('closeSettingsBtn');
    const appContent = document.getElementById('app-content');
    const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
    const pageContents = document.querySelectorAll('.page-content');
    
    const kategoriForm = document.getElementById('kategoriForm');
    const namaKategoriEl = document.getElementById('nama-kategori');
    const kategoriListEl = document.getElementById('kategori-list');

    const berulangForm = document.getElementById('berulangForm');
    const ketBerulangEl = document.getElementById('ket-berulang');
    const jumlahBerulangEl = document.getElementById('jumlah-berulang');
    const katBerulangEl = document.getElementById('kat-berulang');
    const tipeBerulangEl = document.getElementById('tipe-berulang');
    const tglBerulangEl = document.getElementById('tgl-berulang');
    const berulangListEl = document.getElementById('berulang-list');

    const sidebarAvatarEl = document.getElementById('sidebar-avatar');
    const sidebarNameEl = document.getElementById('sidebar-name');
    const profilForm = document.getElementById('profilForm');
    const profilPreviewEl = document.getElementById('profil-preview');
    const fotoProfilInputEl = document.getElementById('foto-profil-input');
    const namaProfilInputEl = document.getElementById('nama-profil-input');
    const simpanProfilBtn = document.getElementById('simpan-profil-btn');
    
    const hapusDataBtn = document.getElementById('hapus-semua-data-btn');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const generateId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

    const saveDataToLocalbase = () => {
        const data = {
            transactions, 
            categories, 
            recurring, 
            userProfile,
            lastRecurringCheck: localStorage.getItem('lastRecurringCheck') || getTodayDate()
        };
        db.collection('storage').doc('data').set(data).catch(err => console.error('Gagal simpan:', err));
    };

    const loadDataFromLocalbase = async () => {
        try {
            const data = await db.collection('storage').doc('data').get();
            
            if (data) {
                transactions = data.transactions || [];
                categories = data.categories || [];
                recurring = data.recurring || [];
                userProfile = data.userProfile || { name: 'Pengguna Baru', avatar: '' };
                localStorage.setItem('lastRecurringCheck', data.lastRecurringCheck || getTodayDate());
            } else {
                if (categories.length === 0) {
                    categories = [
                        { id: 'cat-1', name: 'Gaji', type: 'pemasukan' },
                        { id: 'cat-2', name: 'Hadiah', type: 'pemasukan' },
                        { id: 'cat-3', name: 'Lainnya (In)', type: 'pemasukan' },
                        { id: 'cat-4', name: 'Makan', type: 'pengeluaran' },
                        { id: 'cat-5', name: 'Transportasi', type: 'pengeluaran' },
                        { id: 'cat-6', name: 'Tagihan', type: 'pengeluaran' },
                        { id: 'cat-7', name: 'Jajan', type: 'pengeluaran' },
                        { id: 'cat-8', name: 'Lainnya (Out)', type: 'pengeluaran' },
                    ];
                }
            }
        } catch (error) {
            console.error('Gagal memuat data dari Localbase:', error);
        }
    };
    
    const updateUI = () => {
        renderProfileUI();
        renderDynamicSelects();
        updateDashboard();
        renderTransactions();
        renderCharts(); 
        renderKategoriList();
        renderBerulangList();
    };

    const renderProfileUI = () => {
        sidebarNameEl.textContent = userProfile.name;
        if (userProfile.avatar) {
            sidebarAvatarEl.innerHTML = `<img src="${userProfile.avatar}" alt="Avatar">`;
            profilPreviewEl.innerHTML = `<img src="${userProfile.avatar}" alt="Preview">`;
        } else {
            sidebarAvatarEl.innerHTML = `<i class="fas fa-user"></i>`;
            profilPreviewEl.innerHTML = `<i class="fas fa-user"></i>`;
        }
        namaProfilInputEl.value = userProfile.name;
    };

    const renderDynamicSelects = () => {
        const katPemasukan = categories.filter(c => c.type === 'pemasukan');
        const katPengeluaran = categories.filter(c => c.type === 'pengeluaran');

        const tipeForm = document.querySelector('input[name="tipe-transaksi"]:checked').value;
        const targetList = (tipeForm === 'pemasukan') ? katPemasukan : katPengeluaran;

        katTransaksiEl.innerHTML = '';
        targetList.forEach(cat => {
            katTransaksiEl.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
        
        const tipeBerulang = tipeBerulangEl.value; 
        const targetListBerulang = (tipeBerulang === 'pemasukan') ? katPemasukan : katPengeluaran;

        katBerulangEl.innerHTML = '';
        targetListBerulang.forEach(cat => {
            katBerulangEl.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    };

    const updateDashboard = () => {
        const today = getTodayDate();
        const currentMonth = today.substring(0, 7); 
        
        const totalPemasukan = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
        const totalPengeluaran = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
        const saldo = totalPemasukan - totalPengeluaran;
        
        const pemasukanHarian = transactions.filter(t => t.type === 'pemasukan' && t.date === today).reduce((acc, t) => acc + t.amount, 0);
        const pengeluaranHarian = transactions.filter(t => t.type === 'pengeluaran' && t.date === today).reduce((acc, t) => acc + t.amount, 0);

        const pemasukanBulanan = transactions.filter(t => t.type === 'pemasukan' && t.date.startsWith(currentMonth)).reduce((acc, t) => acc + t.amount, 0);
        const pengeluaranBulanan = transactions.filter(t => t.type === 'pengeluaran' && t.date.startsWith(currentMonth)).reduce((acc, t) => acc + t.amount, 0);
        
        let saran = "Data belum cukup.";
        if (pemasukanBulanan > 0) {
            const rasio = (pengeluaranBulanan / pemasukanBulanan) * 100;
            if (rasio <= 50) saran = "Keuangan sangat sehat! Pengeluaran di bawah 50%.";
            else if (rasio <= 80) saran = "Keuangan aman. Pertahankan pola ini.";
            else if (rasio <= 100) saran = "Waspada! Pengeluaran hampir menyamai pemasukan.";
            else saran = "Bahaya! Pengeluaran melebihi pemasukan (Defisit).";
        } else if (pengeluaranBulanan > 0) {
            saran = "Pengeluaran tercatat, tapi belum ada pemasukan bulan ini.";
        }

        saldoEl.textContent = formatCurrency(saldo);
        pemasukanHarianEl.textContent = formatCurrency(pemasukanHarian);
        pengeluaranHarianEl.textContent = formatCurrency(pengeluaranHarian);
        saranEl.textContent = saran; 
    };

    const renderTransactions = () => {
        listTransaksiEl.innerHTML = ''; 
        if (transactions.length === 0) {
            listTransaksiEl.innerHTML = '<li class="no-data" style="justify-content:center; color:#6b7280;">Belum ada riwayat transaksi</li>';
            return;
        }
        const recentTransactions = transactions.slice().reverse().slice(0, 10);
        recentTransactions.forEach(trx => {
            const kategori = categories.find(c => c.id === trx.categoryId) || { name: 'Umum' };
            const dateObj = new Date(trx.date);
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            
            const li = document.createElement('li');
            li.className = `transaksi-item ${trx.type}`;
            li.innerHTML = `
                <div class="details">
                    <div class="keterangan">${trx.desc}</div>
                    <div class="info">
                        <span>${kategori.name}</span>
                        <span style="background:transparent; color:#94a3b8; padding:0;"><i class="far fa-calendar"></i> ${dateStr}</span>
                    </div>
                </div>
                <div class="amount">
                    ${trx.type === 'pengeluaran' ? '-' : '+'} ${formatCurrency(trx.amount)}
                </div>
                <button class="delete-btn" data-id="${trx.id}" title="Hapus">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            listTransaksiEl.appendChild(li);
        });
    };

    const renderArusKasHarianPieChart = () => {
        if (arusKasPieCtx) {
            const targetDate = selectedDateForCharts;
            const dailyTransactions = transactions.filter(t => t.date === targetDate);
            const descTotals = {};
            
            dailyTransactions.forEach(t => {
                const cat = categories.find(c => c.id === t.categoryId) || { name: 'Umum' };
                const labelKey = t.desc ? t.desc : cat.name; 
                const key = labelKey + '-' + t.type; 

                if (!descTotals[key]) {
                    descTotals[key] = { label: labelKey, type: t.type, amount: 0 };
                }
                descTotals[key].amount += t.amount;
            });

            const labels = [];
            const dataPoints = [];
            const backgroundColors = [];
            const sortedItems = Object.values(descTotals).sort((a, b) => b.amount - a.amount);

            sortedItems.forEach(item => {
                labels.push(`${item.label}`);
                dataPoints.push(item.amount);
                if (item.type === 'pemasukan') {
                    backgroundColors.push('#34d399'); 
                } else {
                    backgroundColors.push('#f87171'); 
                }
            });

            const hasData = dataPoints.length > 0;
            const finalLabels = hasData ? labels : ['Belum ada data'];
            const finalData = hasData ? dataPoints : [1]; 
            const finalColors = hasData ? backgroundColors : ['#334155']; 

            if (arusKasPieInstance) arusKasPieInstance.destroy();

            arusKasPieInstance = new Chart(arusKasPieCtx, {
                type: 'doughnut',
                data: {
                    labels: finalLabels,
                    datasets: [{
                        data: finalData,
                        backgroundColor: finalColors,
                        borderColor: '#1e293b',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    cutout: '60%',
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { usePointStyle: true, color: '#94a3b8', font: { size: 11 }, boxWidth: 8 } 
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (!hasData) return 'Tidak ada data';
                                    const val = formatCurrency(context.raw);
                                    const type = context.dataset.backgroundColor[context.dataIndex] === '#34d399' ? '(Masuk)' : '(Keluar)';
                                    return ` ${context.label} ${type}: ${val}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    };

    const renderArusKasTahunanLineChart = () => {
        if (lineChartCtx) {
            const currentYear = new Date().getFullYear();
            let dataIn = new Array(12).fill(0);
            let dataOut = new Array(12).fill(0);
            transactions.forEach(t => {
                const d = new Date(t.date);
                if (d.getFullYear() === currentYear) {
                    if (t.type === 'pemasukan') dataIn[d.getMonth()] += t.amount;
                    else dataOut[d.getMonth()] += t.amount;
                }
            });
            
            if (lineChartInstance) lineChartInstance.destroy();
            lineChartInstance = new Chart(lineChartCtx, {
                type: 'line',
                data: {
                    labels: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],
                    datasets: [
                        { label: 'Masuk', data: dataIn, borderColor: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', tension: 0.4, fill: true },
                        { label: 'Keluar', data: dataOut, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)', tension: 0.4, fill: true }
                    ]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } },
                    plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10 } } }
                }
            });
        }
    };
    
    const renderCharts = () => {
        renderArusKasHarianPieChart();
        renderArusKasTahunanLineChart();
    };

    const checkRecurringTransactions = () => {
        const today = new Date();
        const todayDay = today.getDate();
        const currentMonthYear = today.getFullYear() + '-' + (today.getMonth() + 1).toString().padStart(2, '0');
        
        let added = false;
        recurring.forEach(item => {
            if (item.day === todayDay) {
                const exists = transactions.some(trx => trx.recurringId === item.id && trx.date.startsWith(currentMonthYear));
                if (!exists) {
                    const cat = categories.find(c => c.id === item.categoryId);
                    transactions.push({
                        id: generateId(), date: getTodayDate(), amount: item.amount,
                        desc: item.desc, categoryId: item.categoryId,
                        type: cat ? cat.type : item.type, recurringId: item.id
                    });
                    added = true;
                }
            }
        });

        localStorage.setItem('lastRecurringCheck', getTodayDate());
        if (added) {
            saveDataToLocalbase(); 
            showCustomNotification("Transaksi rutin otomatis ditambahkan!", "success");
            updateUI(); 
        }
    };

    const renderKategoriList = () => {
        kategoriListEl.innerHTML = '';
        if (categories.length === 0) return;
        categories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span style="font-weight:500;">
                    <i class="fas ${cat.type === 'pemasukan' ? 'fa-arrow-down style="color:var(--success-color)"' : 'fa-arrow-up style="color:var(--danger-color)"'}"></i> 
                    ${cat.name}
                </span>
                <button class="delete-btn" data-id="${cat.id}" data-action="delete-kategori"><i class="fas fa-times"></i></button>
            `;
            kategoriListEl.appendChild(li);
        });
    };

    const renderBerulangList = () => {
        berulangListEl.innerHTML = '';
        if (recurring.length === 0) return;
        recurring.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div style="flex-grow:1;">
                    <div style="font-weight:600;">${item.desc}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">
                        ${formatCurrency(item.amount)} • Tgl ${item.day}
                    </div>
                </div>
                <button class="delete-btn" data-id="${item.id}" data-action="delete-berulang"><i class="fas fa-times"></i></button>
            `;
            berulangListEl.appendChild(li);
        });
    };

    const openModal = () => { sidebarBackdrop.classList.add('show'); sidebarMenu.classList.add('show'); };
    const closeModal = () => { sidebarBackdrop.classList.remove('show'); sidebarMenu.classList.remove('show'); };
    
    settingsBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    sidebarBackdrop.addEventListener('click', closeModal);

    const navigateTo = (pageId) => {
        pageContents.forEach(page => page.classList.remove('active'));
        const target = document.getElementById(`page-${pageId}`);
        if (target) target.classList.add('active');
        else document.getElementById('page-dasbor').classList.add('active');
        closeModal();
        window.scrollTo(0, 0);
    };

    sidebarNavItems.forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
    appContent.addEventListener('click', (e) => {
        if (e.target.closest('.back-btn')) navigateTo('dasbor');
    });

    transaksiForm.addEventListener('submit', (e) => {
        e.preventDefault();
        transactions.push({
            id: generateId(),
            date: tglTransaksiEl.value,
            amount: +jumlahTransaksiEl.value,
            desc: ketTransaksiEl.value,
            categoryId: katTransaksiEl.value,
            type: document.querySelector('input[name="tipe-transaksi"]:checked').value
        });
        saveDataToLocalbase(); 
        updateUI();
        transaksiForm.reset();
        tglTransaksiEl.value = getTodayDate();
        renderDynamicSelects(); 
        showCustomNotification('Transaksi berhasil disimpan!', 'success');
    });

    document.querySelectorAll('input[name="tipe-transaksi"]').forEach(r => r.addEventListener('change', renderDynamicSelects));

    kategoriForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="tipe-kategori-baru"]:checked').value;
        categories.push({ id: 'cat-' + generateId(), name: namaKategoriEl.value.trim(), type: type });
        saveDataToLocalbase(); 
        updateUI();
        namaKategoriEl.value = '';
        showCustomNotification('Kategori berhasil ditambahkan.', 'success');
    });
    
    kategoriListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn && btn.dataset.action === 'delete-kategori') {
            categories = categories.filter(c => c.id !== btn.dataset.id);
            saveDataToLocalbase(); 
            updateUI();
            showCustomNotification('Kategori dihapus.', 'danger');
        }
    });

    berulangForm.addEventListener('submit', (e) => {
        e.preventDefault();
        recurring.push({
            id: 'rec-' + generateId(),
            desc: ketBerulangEl.value,
            amount: +jumlahBerulangEl.value,
            categoryId: katBerulangEl.value,
            type: tipeBerulangEl.value,
            day: +tglBerulangEl.value
        });
        saveDataToLocalbase(); 
        
        checkRecurringTransactions(); 
        
        updateUI();
        berulangForm.reset();
        showCustomNotification('Jadwal rutin disimpan.', 'success');
    });
    
    berulangListEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn && btn.dataset.action === 'delete-berulang') {
            recurring = recurring.filter(i => i.id !== btn.dataset.id);
            saveDataToLocalbase(); 
            updateUI();
            showCustomNotification('Jadwal rutin dihapus.', 'danger');
        }
    });

    tipeBerulangEl.addEventListener('change', renderDynamicSelects);

    listTransaksiEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.delete-btn');
        if (btn) {
            transactions = transactions.filter(t => t.id !== btn.dataset.id);
            saveDataToLocalbase(); 
            updateUI();
            showCustomNotification('Transaksi dihapus.', 'danger');
        }
    });

    profilForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userProfile.name = namaProfilInputEl.value.trim();
        const img = profilPreviewEl.querySelector('img');
        if (img && img.src.startsWith('data:')) userProfile.avatar = img.src;
        saveDataToLocalbase(); 
        updateUI();
        showCustomNotification('Profil diperbarui!', 'success');
    });

    fotoProfilInputEl.addEventListener('change', () => {
        const file = fotoProfilInputEl.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => profilPreviewEl.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            reader.readAsDataURL(file);
        }
    });
    
    hapusDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        deleteConfirmModal.classList.add('show');
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('show');
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        try {
            await db.delete();
            localStorage.clear();
            deleteConfirmModal.classList.remove('show');
            showCustomNotification("Semua data telah dihapus. Memulai ulang...", "danger");
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (err) {
            console.error("Gagal menghapus data:", err);
            showCustomNotification("Gagal menghapus data: " + err.message, "danger");
            deleteConfirmModal.classList.remove('show');
        }
    });

    deleteConfirmModal.addEventListener('click', (e) => {
        if (e.target === deleteConfirmModal) {
            deleteConfirmModal.classList.remove('show');
        }
    });

    tglLaporanHarianEl.addEventListener('change', () => {
        selectedDateForCharts = tglLaporanHarianEl.value;
        renderArusKasHarianPieChart();
    });

    const initApp = async () => {
        await loadDataFromLocalbase(); 
        checkRecurringTransactions();
        updateUI();
        tglTransaksiEl.value = getTodayDate();
        tglLaporanHarianEl.value = selectedDateForCharts;
        document.getElementById('page-dasbor').classList.add('active');
    };

    initApp();
});
