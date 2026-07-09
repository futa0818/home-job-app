// app.js

// --- 状態管理 (State) ---
let currentRole = null; // 'child' or 'parent'
let currentTab = 'main'; // 'main', 'notifications', 'report', 'settings'
let parentPassword = 'fuu18'; // 追加: 親アカウントの初期パスワード

// 親と子それぞれのテーマカラーを保持する変数
let childTheme = 'default';
let parentTheme = 'default';

// 本日完了したお手伝いのタイトルを保持する配列 (0時リセット用)
let completedToday = [];
let lastActiveDate = ""; // 日付リセット判定用

// 1. 初期のお手伝いメニュー設定 (10個)
let availableJobs = [
    { title: '風呂洗い', price: 50, icon: 'fa-bath' },
    { title: '洗濯物たたみ', price: 50, icon: 'fa-shirt' },
    { title: '洗濯物干し', price: 50, icon: 'fa-socks' },
    { title: '靴並べ・チェーン', price: 30, icon: 'fa-shoe-prints' },
    { title: '家庭教師', price: 300, icon: 'fa-graduation-cap' },
    { title: '食器洗い', price: 50, icon: 'fa-utensils' },
    { title: '米を炊く', price: 30, icon: 'fa-bowl-rice' },
    { title: '米をつぎ分ける', price: 30, icon: 'fa-spoon' },
    { title: '食器だし', price: 30, icon: 'fa-kitchen-set' },
    { title: '玄関はわき', price: 50, icon: 'fa-broom' }
];

// 模擬データ
let totalAmount = 0;
let confirmedHistory = [];
let pendingRequests = [];
let pendingProposals = [];
let notifications = []; // 新規追加: 通知リストを保持

// --- リアルタイム時計機能 (JST) ---
function updateClock() {
    const now = new Date();
    // 日本時間 (JST) での文字列表現を取得
    const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstString);

    const year = jstDate.getFullYear();
    const month = jstDate.getMonth() + 1;
    const date = jstDate.getDate();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
    const dayStr = days[jstDate.getDay()];
    const hours = String(jstDate.getHours()).padStart(2, '0');
    const minutes = String(jstDate.getMinutes()).padStart(2, '0');

    // 指定されたフォーマット: 2026/7/2(Thur) 11:55
    const timeString = `${year}/${month}/${date}(${dayStr}) ${hours}:${minutes}`;

    // 時計要素の更新
    const clockEl = document.getElementById('realtime-clock');
    const clockMobileEl = document.getElementById('realtime-clock-mobile');
    if(clockEl) clockEl.innerText = timeString;
    if(clockMobileEl) clockMobileEl.innerText = timeString;

    // 0時(日付変更)を跨いだ場合の自動リセット処理
    const currentDateStr = `${year}/${month}/${date}`;
    if (!lastActiveDate) {
        lastActiveDate = currentDateStr; // 初回起動時の記録
    } else if (lastActiveDate !== currentDateStr) {
        lastActiveDate = currentDateStr; // 日付を更新
        completedToday = []; // 完了済みリストをクリアして再利用可能にする
        if (currentRole === 'child') {
            updateUI(); // 画面を更新して完了済みを元に戻す
        }
    }
}
// 時計の初期化と1秒毎の自動更新
updateClock();
setInterval(updateClock, 1000);

// --- 通知追加機能 ---
function addNotification(message) {
    const now = new Date();
    const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstString);
    const year = jstDate.getFullYear();
    const month = jstDate.getMonth() + 1;
    const date = jstDate.getDate();
    const hours = String(jstDate.getHours()).padStart(2, '0');
    const minutes = String(jstDate.getMinutes()).padStart(2, '0');
    
    // 日付と時間を小さく付けるためのタイムスタンプ生成
    const timestamp = `${year}/${month}/${date} ${hours}:${minutes}`;

    notifications.unshift({
        id: Date.now(),
        message: message,
        timestamp: timestamp
    });
}

// --- 画面初期化・切り替え ---
// 追加: 親アカウントログイン時のパスワード入力処理
function promptParentLogin() {
    const input = prompt('親アカウントのパスワードを入力してください:');
    if (input === parentPassword) {
        loginAs('parent');
    } else if (input !== null) {
        alert('パスワードが間違っています。');
    }
}

function loginAs(role) {
    currentRole = role;
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    
    // ログインしたロールのテーマカラーを適用
    applyTheme(role === 'child' ? childTheme : parentTheme);
    
    const badge = document.getElementById('role-badge');
    if (role === 'child') {
        badge.innerText = '子モード';
        badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block';
    } else {
        badge.innerText = '親モード';
        badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block';
    }
    
    switchTab('main');
    updateUI();
}

function logout() {
    currentRole = null;
    applyTheme('default'); // ログアウト時はデフォルトカラーに戻す
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // 全てのタブを一旦隠す
    document.getElementById('tab-child-main').classList.add('hidden');
    document.getElementById('tab-parent-main').classList.add('hidden');
    document.getElementById('tab-notifications').classList.add('hidden');
    document.getElementById('tab-report').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');
    
    // ナビゲーションのスタイルをリセット
    ['main', 'notifications', 'report', 'settings'].forEach(t => {
        const navEl = document.getElementById(`nav-${t}`);
        if(navEl) navEl.className = "text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";
    });

    // 選択されたナビゲーションをハイライト
    const activeNav = document.getElementById(`nav-${tabName}`);
    if(activeNav) activeNav.className = "bg-slate-800 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";

    // 選択されたタブを表示
    if (tabName === 'main') {
        if (currentRole === 'child') {
            document.getElementById('tab-child-main').classList.remove('hidden');
        } else {
            document.getElementById('tab-parent-main').classList.remove('hidden');
        }
    } else if (tabName === 'notifications') {
        document.getElementById('tab-notifications').classList.remove('hidden');
    } else if (tabName === 'report') {
        document.getElementById('tab-report').classList.remove('hidden');
    } else if (tabName === 'settings') {
        document.getElementById('tab-settings').classList.remove('hidden');
    }
    updateUI();
}

function goHome() {
    switchTab('main');
}

// --- アコーディオン制御 ---
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('accordion-icon');
    
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        content.style.opacity = '1';
        icon.style.transform = 'rotate(180deg)';
    }
}

// --- トースト通知 ---
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 2500);
}

// --- 追加: パスワードの変更処理 ---
function updateParentPassword() {
    const currentInput = document.getElementById('current-password-input');
    const newInput = document.getElementById('new-password-input');
    const confirmInput = document.getElementById('confirm-password-input');

    if (currentInput.value !== parentPassword) {
        showToast('現在のパスワードが間違っています。');
        return;
    }
    if (!newInput.value) {
        showToast('新しいパスワードを入力してください。');
        return;
    }
    if (newInput.value !== confirmInput.value) {
        showToast('新しいパスワードと確認用パスワードが一致しません。');
        return;
    }

    parentPassword = newInput.value;
    showToast('パスワードを正常に変更しました！');

    // 入力欄をクリア
    currentInput.value = '';
    newInput.value = '';
    confirmInput.value = '';
}

// --- 子のアクション ---
function requestJob(title, price, icon) {
    if (completedToday.includes(title)) return;

    const newRequest = {
        id: Date.now(),
        title: title,
        price: price,
        icon: icon,
        time: 'たった今'
    };
    pendingRequests.unshift(newRequest);
    
    completedToday.push(title);
    
    showToast(`「${title}」の実行を親に申請しました！`);
    updateUI();
}

function submitProposal() {
    const titleInput = document.getElementById('proposal-title');
    const priceInput = document.getElementById('proposal-price');
    
    if (!titleInput.value || !priceInput.value) {
        showToast('項目名と金額を入力してください');
        return;
    }

    const newProposal = {
        id: Date.now(),
        title: titleInput.value,
        price: parseInt(priceInput.value),
        time: 'たった今'
    };
    
    pendingProposals.unshift(newProposal);
    showToast(`新メニュー「${titleInput.value}」を提案しました！`);
    
    titleInput.value = '';
    priceInput.value = '';
    updateUI();
}

// --- 親のアクション ---
function handleRequest(id, isApproved) {
    const index = pendingRequests.findIndex(r => r.id === id);
    if (index !== -1) {
        const req = pendingRequests[index];
        pendingRequests.splice(index, 1);
        
        if (isApproved) {
            totalAmount += req.price;
            confirmedHistory.unshift({
                title: req.title,
                price: req.price,
                date: new Date().toLocaleDateString('ja-JP')
            });
            showToast(`「${req.title}」を承認しました。金額が確定しました！`);
            // 通知の追加 (許可)
            addNotification(`お手伝い申請「${req.title}」が許可されました。`);
        } else {
            showToast(`「${req.title}」の申請を却下しました。`);
            completedToday = completedToday.filter(title => title !== req.title);
            // 通知の追加 (拒否)
            addNotification(`お手伝い申請「${req.title}」が拒否されました。`);
        }
        updateUI();
    }
}

function handleProposal(id, isApproved) {
    const index = pendingProposals.findIndex(p => p.id === id);
    if (index !== -1) {
        const prop = pendingProposals[index];
        pendingProposals.splice(index, 1);
        
        if (isApproved) {
            availableJobs.push({
                title: prop.title,
                price: prop.price,
                icon: 'fa-star' 
            });
            showToast(`提案「${prop.title}」を採用しました！お手伝いリストに追加されました。`);
            // 通知の追加 (提案の許可)
            addNotification(`新しいお手伝い「${prop.title}」の追加が許可されました。`);
        } else {
            showToast(`提案「${prop.title}」を見送りました。`);
            // 通知の追加 (提案の見送り)
            addNotification(`新しいお手伝い「${prop.title}」の追加が見送られました。`);
        }
        updateUI();
    }
}

// --- UIの動的更新レンダリング ---
function updateUI() {
    document.getElementById('child-total-amount').innerText = `¥${totalAmount.toLocaleString()}`;
    document.getElementById('report-total-amount').innerText = `¥${totalAmount.toLocaleString()}`;
    document.getElementById('report-total-count').innerText = `${confirmedHistory.length}回`;

    // 0. お手伝い申請カードの仕分け (本日の未実施 / 実施済み)
    const activeJobs = availableJobs.filter(job => !completedToday.includes(job.title));
    const completedJobs = availableJobs.filter(job => completedToday.includes(job.title));

    // 未実施のカード生成
    const jobListContainer = document.getElementById('job-list-container');
    if (jobListContainer) {
        jobListContainer.innerHTML = activeJobs.map(job => `
            <div class="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition group relative">
                
                <!-- 追加: 編集・削除ボタン (右上にホバー時のみ表示) -->
                <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onclick="promptEditJob('${job.title}')" class="text-slate-400 hover:text-indigo-400 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition" title="編集">
                        <i class="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button onclick="promptDeleteJob('${job.title}')" class="text-slate-400 hover:text-rose-400 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition" title="削除">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
                
                <!-- 既存の申請用ボタン部分 (独立したボタンに変更) -->
                <button onclick="requestJob('${job.title}', ${job.price}, '${job.icon}')" class="flex flex-col items-center justify-center w-full active:scale-95 pt-2">
                    <div class="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-indigo-600/10 text-slate-300 group-hover:text-indigo-400 flex items-center justify-center text-xl mb-3 transition">
                        <i class="fa-solid ${job.icon}"></i>
                    </div>
                    <span class="font-medium text-sm text-slate-200 mb-1">${job.title}</span>
                    <span class="text-xs font-bold text-indigo-400">¥${job.price}</span>
                </button>
            </div>
        `).join('');
    }

    // 完了済みのカード生成（一番下用・クリック不可のグレーアウトUI）
    const completedSection = document.getElementById('completed-section');
    const completedListContainer = document.getElementById('completed-job-list-container');
    
    if (completedSection && completedListContainer) {
        if (completedJobs.length > 0) {
            completedSection.style.display = 'block';
            completedListContainer.innerHTML = completedJobs.map(job => {
                const isPending = pendingRequests.some(req => req.title === job.title);
                const statusText = isPending ? '申請待ち' : '完了済み';
                
                return `
                <div class="bg-slate-900/50 border border-slate-800/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed">
                    <div class="w-12 h-12 rounded-xl bg-slate-800/50 text-slate-500 flex items-center justify-center text-xl mb-3">
                        <i class="fa-solid ${job.icon}"></i>
                    </div>
                    <span class="font-medium text-sm text-slate-400 mb-1 line-through">${job.title}</span>
                    <span class="text-xs font-bold text-slate-500">${statusText}</span>
                </div>
                `
            }).join('');
        } else {
            completedSection.style.display = 'none';
        }
    }

    // 1. 子の履歴アコーディオンの中身
    const childHistoryList = document.getElementById('child-history-list');
    if (confirmedHistory.length === 0) {
        childHistoryList.innerHTML = `<div class="text-xs text-slate-500 py-2 text-center">履歴がまだありません</div>`;
    } else {
        childHistoryList.innerHTML = confirmedHistory.map(item => `
            <div class="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-300">${item.title}</span>
                <span class="text-xs font-bold text-emerald-400">+¥${item.price}</span>
            </div>
        `).join('');
    }

    // 2. 親の承認待ちリスト
    const parentReqList = document.getElementById('parent-request-list');
    if (pendingRequests.length === 0) {
        parentReqList.innerHTML = `
            <div class="text-sm text-slate-500 bg-slate-900 rounded-2xl p-6 text-center border border-slate-800">
                現在、承認待ちの申請はありません。
            </div>`;
    } else {
        parentReqList.innerHTML = pendingRequests.map(req => `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-indigo-600/10 text-indigo-400 rounded-lg flex items-center justify-center">
                        <i class="fa-solid ${req.icon || 'fa-star'}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-medium">${req.title}</p>
                        <p class="text-xs text-slate-400">${req.time} · <span class="text-indigo-400 font-bold">¥${req.price}</span></p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="handleRequest(${req.id}, false)" class="bg-slate-800 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold px-3 py-2 rounded-lg transition">却下</button>
                    <button onclick="handleRequest(${req.id}, true)" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition shadow-md shadow-indigo-600/10">承認</button>
                </div>
            </div>
        `).join('');
    }

    // 3. 親の提案リスト
    const parentPropList = document.getElementById('parent-proposal-list');
    if (pendingProposals.length === 0) {
        parentPropList.innerHTML = `
            <div class="text-sm text-slate-500 bg-slate-900 rounded-2xl p-6 text-center border border-slate-800">
                現在、新しい提案はありません。
            </div>`;
    } else {
        parentPropList.innerHTML = pendingProposals.map(prop => `
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-amber-400"><i class="fa-solid fa-lightbulb mr-1.5"></i>${prop.title}</p>
                    <p class="text-xs text-slate-400 mt-0.5">希望金額: <span class="text-slate-200 font-bold">¥${prop.price}</span> · ${prop.time}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="handleProposal(${prop.id}, false)" class="bg-slate-800 text-slate-400 text-xs font-semibold px-3 py-2 rounded-lg transition">見送り</button>
                    <button onclick="handleProposal(${prop.id}, true)" class="bg-slate-200 hover:bg-white text-slate-950 text-xs font-semibold px-3 py-2 rounded-lg transition">採用</button>
                </div>
            </div>
        `).join('');
    }

    // 4. 月末レポートの承認履歴一覧
    const reportHistoryList = document.getElementById('report-history-list');
    if (confirmedHistory.length === 0) {
        reportHistoryList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">承認されたデータがここに表示されます</p>`;
    } else {
        reportHistoryList.innerHTML = confirmedHistory.map(item => `
            <div class="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0 last:pb-0">
                <div>
                    <p class="text-sm font-medium text-slate-200">${item.title}</p>
                    <p class="text-[10px] text-slate-500">${item.date}</p>
                </div>
                <span class="text-sm font-bold text-emerald-400">¥${item.price}</span>
            </div>
        `).join('');
    }

    // 5. 通知リストのレンダリング
    const notificationsList = document.getElementById('notifications-list');
    if (notificationsList) {
        if (notifications.length === 0) {
            notificationsList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">通知はまだありません</p>`;
        } else {
            notificationsList.innerHTML = notifications.map(notif => `
                <div class="flex flex-col bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-sm">
                    <span class="text-sm text-slate-300 font-medium">${notif.message}</span>
                    <span class="text-[10px] text-slate-500 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${notif.timestamp}</span>
                </div>
            `).join('');
        }
    }
    
    // 6. 追加: 設定画面の親専用メニュー（パスワード変更）の表示切り替え
    const passwordSettings = document.getElementById('parent-password-settings');
    if (passwordSettings) {
        if (currentRole === 'parent') {
            passwordSettings.classList.remove('hidden');
        } else {
            passwordSettings.classList.add('hidden');
        }
    }
}

// --- テーマカラー設定 ---
function toggleColorPalette() {
    const toggle = document.getElementById('color-toggle');
    const palette = document.getElementById('color-palette');
    
    if (toggle.checked) {
        palette.style.maxHeight = palette.scrollHeight + 50 + 'px'; 
        palette.style.opacity = '1';
    } else {
        palette.style.maxHeight = '0px';
        palette.style.opacity = '0';
        changeTheme('default');
    }
}

function changeTheme(color) {
    // 現在のロールに応じてカラーを保存して独立させる
    if (currentRole === 'child') {
        childTheme = color;
    } else if (currentRole === 'parent') {
        parentTheme = color;
    }
    
    // 選択されたテーマを適用
    applyTheme(color);
}

// 実際のCSS適用処理
function applyTheme(color) {
    let styleTag = document.getElementById('dynamic-theme');
    
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme';
        document.head.appendChild(styleTag);
    }

    let css = '';
    switch (color) {
        case 'black':
            css = `body { background-color: #000 !important; color: #fff !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #111 !important; border-color: #333 !important; }`;
            break;
        case 'white':
            css = `body { background-color: #f8fafc !important; color: #0f172a !important; }
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #ffffff !important; border-color: #e2e8f0 !important; color: #0f172a !important; }
                   .bg-slate-800 { background-color: #f1f5f9 !important; color: #0f172a !important; border-color: #cbd5e1 !important; }
                   .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-300 i, .text-slate-400 i { color: #334155 !important; }
                   .border-slate-800, .border-slate-700 { border-color: #cbd5e1 !important; }`;
            break;
        case 'blue':
            css = `body { background-color: #082f49 !important; color: #e0f2fe !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #0c4a6e !important; border-color: #0284c7 !important; }`;
            break;
        case 'green':
            css = `body { background-color: #052e16 !important; color: #dcfce7 !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #14532d !important; border-color: #16a34a !important; }`;
            break;
        case 'yellow':
            css = `body { background-color: #422006 !important; color: #fef08a !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #713f12 !important; border-color: #eab308 !important; }`;
            break;
        case 'red':
            css = `body { background-color: #450a0a !important; color: #fee2e2 !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #7f1d1d !important; border-color: #dc2626 !important; }`;
            break;
        case 'pink':
            css = `body { background-color: #500724 !important; color: #fce7f3 !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #831843 !important; border-color: #db2777 !important; }`;
            break;
        case 'orange':
            css = `body { background-color: #431407 !important; color: #ffedd5 !important; } 
                   .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #7c2d12 !important; border-color: #ea580c !important; }`;
            break;
        default:
            css = '';
    }
    
    styleTag.innerHTML = css;
}

// --- お手伝いの編集・削除機能 ---

// 親のパスワードを確認する関数
function verifyParentPassword() {
    const input = prompt('親権限が必要です。親アカウントのパスワードを入力してください:');
    return input === parentPassword;
}

// 削除アクション
function promptDeleteJob(title) {
    if (!verifyParentPassword()) {
        alert('パスワードが間違っているか、キャンセルされました。');
        return;
    }
    
    if (confirm(`本当に「${title}」を削除しますか？`)) {
        availableJobs = availableJobs.filter(job => job.title !== title);
        showToast(`「${title}」を削除しました。`);
        updateUI();
    }
}

let currentEditJobTitle = "";

// 編集アクション（モーダル展開）
function promptEditJob(title) {
    if (!verifyParentPassword()) {
        alert('パスワードが間違っているか、キャンセルされました。');
        return;
    }
    
    const job = availableJobs.find(j => j.title === title);
    if (!job) return;
    
    // 入力欄に現在のデータをセット
    currentEditJobTitle = title;
    document.getElementById('edit-job-title-input').value = job.title;
    document.getElementById('edit-job-price-input').value = job.price;
    
    // モーダルを表示
    document.getElementById('edit-job-modal').classList.remove('hidden');
}

// モーダルを閉じる
function closeEditModal() {
    document.getElementById('edit-job-modal').classList.add('hidden');
    currentEditJobTitle = "";
}

// 編集内容を保存
function saveEditedJob() {
    const newTitle = document.getElementById('edit-job-title-input').value.trim();
    const newPrice = parseInt(document.getElementById('edit-job-price-input').value);
    
    if (!newTitle || isNaN(newPrice)) {
        alert('正しい名前と金額を入力してください。');
        return;
    }
    
    const jobIndex = availableJobs.findIndex(j => j.title === currentEditJobTitle);
    if (jobIndex !== -1) {
        availableJobs[jobIndex].title = newTitle;
        availableJobs[jobIndex].price = newPrice;
        showToast(`「${newTitle}」に更新しました。`);
    }
    
    closeEditModal();
    updateUI();
}