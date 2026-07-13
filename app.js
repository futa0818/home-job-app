// app.js

// --- 状態管理 (State) ---
let currentRole = null; // 'child' or 'parent'
let currentUserId = null; // どの子アカウントでログインしているか
let viewingChildId = null; // 親がどの子アカウントの詳細を見ているか
let currentTab = 'main'; // 'main', 'notifications', 'report', 'settings'

let parentPassword = 'fuu18'; // 親アカウントの初期パスワード
let parentTheme = 'default';

// 子アカウントの配列（最大4人）。初期状態から「親・子・追加」の3枚のカードを見せるため、デフォルトで1人セット
let children = [
    {
        id: 'child_1',
        name: '子供',
        theme: 'default',
        totalAmount: 0,
        completedToday: [],
        pendingRequests: [],
        pendingProposals: [],
        confirmedHistory: []
    }
];

let lastActiveDate = ""; // 日付リセット判定用
let notifications = []; // グローバルな通知リスト

// 初期のお手伝いメニュー設定 (10個)
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

// --- ログイン画面の動的生成 ---
function renderLoginScreen() {
    const container = document.getElementById('login-cards-container');
    
    // ★ ここでHTML側の縦並び設定(space-y-4)を上書きし、強制的に横並びにします
    container.className = "flex flex-wrap justify-center gap-3 sm:gap-4 mt-2";
    
    let html = '';

    // 1. 親として入るボタン (青色・正方形)
    html += `
        <button onclick="promptParentLogin()" class="w-24 sm:w-28 aspect-square shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition duration-200 flex flex-col items-center justify-center p-3 shadow-lg shadow-indigo-600/20">
            <i class="fa-solid fa-user-tie text-3xl mb-2"></i>
            <span class="text-xs sm:text-sm">親</span>
        </button>
    `;

    // 2. 作成された子アカウントのボタン (無色・正方形)
    children.forEach(child => {
        html += `
            <button onclick="loginAsChild('${child.id}')" class="w-24 sm:w-28 aspect-square shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl transition duration-200 flex flex-col items-center justify-center p-3 border border-slate-700 shadow-md">
                <i class="fa-solid fa-child text-3xl mb-2 text-indigo-400"></i>
                <span class="text-xs sm:text-sm line-clamp-1 w-full text-center">${child.name}</span>
            </button>
        `;
    });

    // 3. 子アカウントの追加ボタン (無色・正方形)
    if (children.length < 4) {
        html += `
            <button onclick="promptAddChild()" class="w-24 sm:w-28 aspect-square shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-2xl transition duration-200 flex flex-col items-center justify-center p-3 border border-slate-700 border-dashed hover:border-slate-500">
                <i class="fa-solid fa-plus text-2xl mb-2 opacity-80"></i>
                <span class="text-[10px] sm:text-xs opacity-80 mt-1">追加 (${children.length}/4)</span>
            </button>
        `;
    }

    container.innerHTML = html;
}

function promptAddChild() {
    if (children.length >= 4) return;
    const name = prompt("お子様の名前を入力してください:");
    if (name && name.trim() !== "") {
        children.push({
            id: 'child_' + Date.now(),
            name: name.trim(),
            theme: 'default',
            totalAmount: 0,
            completedToday: [],
            pendingRequests: [],
            pendingProposals: [],
            confirmedHistory: []
        });
        showToast(`${name.trim()}のアカウントを追加しました！`);
        renderLoginScreen();
    }
}

// 初期描画
renderLoginScreen();

// --- リアルタイム時計機能 (JST) ---
function updateClock() {
    const now = new Date();
    const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstString);

    const year = jstDate.getFullYear();
    const month = jstDate.getMonth() + 1;
    const date = jstDate.getDate();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
    const dayStr = days[jstDate.getDay()];
    const hours = String(jstDate.getHours()).padStart(2, '0');
    const minutes = String(jstDate.getMinutes()).padStart(2, '0');

    const timeString = `${year}/${month}/${date}(${dayStr}) ${hours}:${minutes}`;

    const clockEl = document.getElementById('realtime-clock');
    const clockMobileEl = document.getElementById('realtime-clock-mobile');
    if(clockEl) clockEl.innerText = timeString;
    if(clockMobileEl) clockMobileEl.innerText = timeString;

    // 0時(日付変更)を跨いだ場合の自動リセット処理
    const currentDateStr = `${year}/${month}/${date}`;
    if (!lastActiveDate) {
        lastActiveDate = currentDateStr; 
    } else if (lastActiveDate !== currentDateStr) {
        lastActiveDate = currentDateStr; 
        children.forEach(c => c.completedToday = []); // 全ての子の完了済みをクリア
        if (currentRole) updateUI();
    }
}
updateClock();
setInterval(updateClock, 1000);

// --- 通知機能 ---
function addNotification(message) {
    const now = new Date();
    const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstString);
    const timestamp = `${jstDate.getFullYear()}/${jstDate.getMonth() + 1}/${jstDate.getDate()} ${String(jstDate.getHours()).padStart(2, '0')}:${String(jstDate.getMinutes()).padStart(2, '0')}`;

    notifications.unshift({ id: Date.now(), message: message, timestamp: timestamp });
}

// --- ログイン・画面切り替え処理 ---
function promptParentLogin() {
    const input = prompt('親アカウントのパスワードを入力してください:');
    if (input === parentPassword) {
        currentRole = 'parent';
        currentUserId = null;
        viewingChildId = null;
        
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
        
        applyTheme(parentTheme);
        const badge = document.getElementById('role-badge');
        badge.innerText = '親モード';
        badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block';
        
        switchTab('main');
    } else if (input !== null) {
        alert('パスワードが間違っています。');
    }
}

function loginAsChild(id) {
    const child = children.find(c => c.id === id);
    if (!child) return;

    currentRole = 'child';
    currentUserId = id;
    
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    
    applyTheme(child.theme);
    const badge = document.getElementById('role-badge');
    badge.innerText = `子モード (${child.name})`;
    badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block';
    
    switchTab('main');
}

function logout() {
    currentRole = null;
    currentUserId = null;
    viewingChildId = null;
    applyTheme('default'); 
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    
    // ↓この1行を追加して、ログイン画面を最新の状態に再描画します
    renderLoginScreen();
}

function switchTab(tabName) {
    currentTab = tabName;
    ['tab-child-main', 'tab-parent-main', 'tab-notifications', 'tab-report', 'tab-settings'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    
    ['main', 'notifications', 'report', 'settings'].forEach(t => {
        const navEl = document.getElementById(`nav-${t}`);
        if(navEl) navEl.className = "text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";
    });

    const activeNav = document.getElementById(`nav-${tabName}`);
    if(activeNav) activeNav.className = "bg-slate-800 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";

    if (tabName === 'main') {
        if (currentRole === 'child') {
            document.getElementById('tab-child-main').classList.remove('hidden');
        } else {
            document.getElementById('tab-parent-main').classList.remove('hidden');
            // 親タブを開いたときはリスト画面にリセット
            backToParentList();
        }
    } else {
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    }
    updateUI();
}

function goHome() { switchTab('main'); }
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('accordion-icon');
    if (content.style.maxHeight && content.style.maxHeight !== '0px') {
        content.style.maxHeight = '0px'; content.style.opacity = '0'; icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + 'px'; content.style.opacity = '1'; icon.style.transform = 'rotate(180deg)';
    }
}
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').innerText = message;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-20', 'opacity-0'); }, 2500);
}

function updateParentPassword() {
    const currentInput = document.getElementById('current-password-input');
    const newInput = document.getElementById('new-password-input');
    const confirmInput = document.getElementById('confirm-password-input');

    if (currentInput.value !== parentPassword) { showToast('現在のパスワードが間違っています。'); return; }
    if (!newInput.value) { showToast('新しいパスワードを入力してください。'); return; }
    if (newInput.value !== confirmInput.value) { showToast('新しいパスワードと確認用パスワードが一致しません。'); return; }

    parentPassword = newInput.value;
    showToast('パスワードを正常に変更しました！');
    currentInput.value = ''; newInput.value = ''; confirmInput.value = '';
}

// --- 子のアクション ---
function requestJob(title, price, icon) {
    const child = children.find(c => c.id === currentUserId);
    if (!child || child.completedToday.includes(title)) return;

    child.pendingRequests.unshift({ id: Date.now(), title: title, price: price, icon: icon, time: 'たった今' });
    child.completedToday.push(title);
    
    showToast(`「${title}」の実行を親に申請しました！`);
    updateUI();
}

function submitProposal() {
    const child = children.find(c => c.id === currentUserId);
    if (!child) return;

    const titleInput = document.getElementById('proposal-title');
    const priceInput = document.getElementById('proposal-price');
    
    if (!titleInput.value || !priceInput.value) { showToast('項目名と金額を入力してください'); return; }

    child.pendingProposals.unshift({ id: Date.now(), title: titleInput.value, price: parseInt(priceInput.value), time: 'たった今' });
    showToast(`新メニュー「${titleInput.value}」を提案しました！`);
    
    titleInput.value = ''; priceInput.value = '';
    updateUI();
}

// --- 親のアクション (特定の子に対する処理) ---
function handleRequest(childId, id, isApproved) {
    const child = children.find(c => c.id === childId);
    if (!child) return;

    const index = child.pendingRequests.findIndex(r => r.id === id);
    if (index !== -1) {
        const req = child.pendingRequests[index];
        child.pendingRequests.splice(index, 1);
        
        if (isApproved) {
            child.totalAmount += req.price;
            child.confirmedHistory.unshift({ title: req.title, price: req.price, date: new Date().toLocaleDateString('ja-JP') });
            showToast(`「${req.title}」を承認しました！`);
            addNotification(`【${child.name}】お手伝い申請「${req.title}」が許可されました。`);
        } else {
            showToast(`「${req.title}」の申請を却下しました。`);
            child.completedToday = child.completedToday.filter(title => title !== req.title);
            addNotification(`【${child.name}】お手伝い申請「${req.title}」が拒否されました。`);
        }
        updateUI();
    }
}

function handleProposal(childId, id, isApproved) {
    const child = children.find(c => c.id === childId);
    if (!child) return;

    const index = child.pendingProposals.findIndex(p => p.id === id);
    if (index !== -1) {
        const prop = child.pendingProposals[index];
        child.pendingProposals.splice(index, 1);
        
        if (isApproved) {
            availableJobs.push({ title: prop.title, price: prop.price, icon: 'fa-star' });
            showToast(`提案「${prop.title}」を採用し、リストに追加しました！`);
            addNotification(`【${child.name}】新メニュー「${prop.title}」の追加が許可されました。`);
        } else {
            showToast(`提案「${prop.title}」を見送りました。`);
            addNotification(`【${child.name}】新メニュー「${prop.title}」の追加が見送られました。`);
        }
        updateUI();
    }
}

// --- 親の画面制御 ---
function viewChildDetail(childId) {
    viewingChildId = childId;
    document.getElementById('parent-child-list-section').classList.add('hidden');
    document.getElementById('parent-child-detail-section').classList.remove('hidden');
    updateUI();
}

function backToParentList() {
    viewingChildId = null;
    document.getElementById('parent-child-list-section').classList.remove('hidden');
    document.getElementById('parent-child-detail-section').classList.add('hidden');
    updateUI();
}

// --- UIの動的更新レンダリング ---
function updateUI() {
    // 1. 子アカウント画面の描画
    if (currentRole === 'child' && currentTab === 'main') {
        const child = children.find(c => c.id === currentUserId);
        if (!child) return;

        document.getElementById('child-total-amount').innerText = `¥${child.totalAmount.toLocaleString()}`;
        
        const childHistoryList = document.getElementById('child-history-list');
        if (child.confirmedHistory.length === 0) {
            childHistoryList.innerHTML = `<div class="text-xs text-slate-500 py-2 text-center">履歴がまだありません</div>`;
        } else {
            childHistoryList.innerHTML = child.confirmedHistory.map(item => `
                <div class="flex items-center justify-between bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
                    <span class="text-xs text-slate-300">${item.title}</span>
                    <span class="text-xs font-bold text-emerald-400">+¥${item.price}</span>
                </div>
            `).join('');
        }

        const activeJobs = availableJobs.filter(job => !child.completedToday.includes(job.title));
        const completedJobs = availableJobs.filter(job => child.completedToday.includes(job.title));

        const jobListContainer = document.getElementById('job-list-container');
        if (jobListContainer) {
            jobListContainer.innerHTML = activeJobs.map(job => `
                <div class="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition group relative">
                    <div class="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onclick="promptEditJob('${job.title}')" class="text-slate-400 hover:text-indigo-400 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition" title="編集"><i class="fa-solid fa-pen text-xs"></i></button>
                        <button onclick="promptDeleteJob('${job.title}')" class="text-slate-400 hover:text-rose-400 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition" title="削除"><i class="fa-solid fa-trash text-xs"></i></button>
                    </div>
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

        const completedSection = document.getElementById('completed-section');
        const completedListContainer = document.getElementById('completed-job-list-container');
        if (completedSection && completedListContainer) {
            if (completedJobs.length > 0) {
                completedSection.style.display = 'block';
                completedListContainer.innerHTML = completedJobs.map(job => {
                    const isPending = child.pendingRequests.some(req => req.title === job.title);
                    return `
                    <div class="bg-slate-900/50 border border-slate-800/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center opacity-50 cursor-not-allowed">
                        <div class="w-12 h-12 rounded-xl bg-slate-800/50 text-slate-500 flex items-center justify-center text-xl mb-3"><i class="fa-solid ${job.icon}"></i></div>
                        <span class="font-medium text-sm text-slate-400 mb-1 line-through">${job.title}</span>
                        <span class="text-xs font-bold text-slate-500">${isPending ? '申請待ち' : '完了済み'}</span>
                    </div>
                    `
                }).join('');
            } else {
                completedSection.style.display = 'none';
            }
        }
    }

    // 2. 親アカウント画面の描画
    if (currentRole === 'parent' && currentTab === 'main') {
        const listContainer = document.getElementById('parent-child-list');
        
        if (children.length === 0) {
            listContainer.innerHTML = `<p class="text-slate-400 text-sm">現在、登録されている子アカウントはありません。</p>`;
        } else {
            listContainer.innerHTML = children.map(c => `
                <div onclick="viewChildDetail('${c.id}')" class="bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:bg-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between group">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition">
                            <i class="fa-solid fa-child"></i>
                        </div>
                        <div>
                            <p class="font-bold text-slate-200">${c.name}</p>
                            <p class="text-xs mt-1">
                                <span class="${c.pendingRequests.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}">申請: ${c.pendingRequests.length}件</span> <span class="text-slate-600 mx-1">|</span> 
                                <span class="${c.pendingProposals.length > 0 ? 'text-indigo-400 font-bold' : 'text-slate-400'}">提案: ${c.pendingProposals.length}件</span>
                            </p>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-500 group-hover:text-indigo-400 transition"></i>
                </div>
            `).join('');
        }

        if (viewingChildId) {
            const child = children.find(c => c.id === viewingChildId);
            if (child) {
                document.getElementById('parent-detail-title').innerHTML = `${child.name} からの通知`;

                const parentReqList = document.getElementById('parent-request-list');
                if (child.pendingRequests.length === 0) {
                    parentReqList.innerHTML = `<div class="text-sm text-slate-500 bg-slate-900 rounded-2xl p-6 text-center border border-slate-800">承認待ちの申請はありません。</div>`;
                } else {
                    parentReqList.innerHTML = child.pendingRequests.map(req => `
                        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 bg-indigo-600/10 text-indigo-400 rounded-lg flex items-center justify-center"><i class="fa-solid ${req.icon || 'fa-star'}"></i></div>
                                <div>
                                    <p class="text-sm font-medium">${req.title}</p>
                                    <p class="text-xs text-slate-400">${req.time} · <span class="text-indigo-400 font-bold">¥${req.price}</span></p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="handleRequest('${child.id}', ${req.id}, false)" class="bg-slate-800 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold px-3 py-2 rounded-lg transition">却下</button>
                                <button onclick="handleRequest('${child.id}', ${req.id}, true)" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">承認</button>
                            </div>
                        </div>
                    `).join('');
                }

                const parentPropList = document.getElementById('parent-proposal-list');
                if (child.pendingProposals.length === 0) {
                    parentPropList.innerHTML = `<div class="text-sm text-slate-500 bg-slate-900 rounded-2xl p-6 text-center border border-slate-800">新しい提案はありません。</div>`;
                } else {
                    parentPropList.innerHTML = child.pendingProposals.map(prop => `
                        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-amber-400"><i class="fa-solid fa-lightbulb mr-1.5"></i>${prop.title}</p>
                                <p class="text-xs text-slate-400 mt-0.5">希望金額: <span class="text-slate-200 font-bold">¥${prop.price}</span> · ${prop.time}</p>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button onclick="handleProposal('${child.id}', ${prop.id}, false)" class="bg-slate-800 text-slate-400 text-xs font-semibold px-3 py-2 rounded-lg transition">見送り</button>
                                <button onclick="handleProposal('${child.id}', ${prop.id}, true)" class="bg-slate-200 hover:bg-white text-slate-950 text-xs font-semibold px-3 py-2 rounded-lg transition">採用</button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    }

    // 3. レポートタブ (全員の合算と履歴を展開)
    if (currentTab === 'report') {
        let grandTotal = 0;
        let allHistory = [];
        children.forEach(c => {
            grandTotal += c.totalAmount;
            c.confirmedHistory.forEach(h => allHistory.push({...h, childName: c.name}));
        });

        document.getElementById('report-total-amount').innerText = `¥${grandTotal.toLocaleString()}`;
        document.getElementById('report-total-count').innerText = `${allHistory.length}回`;

        const reportHistoryList = document.getElementById('report-history-list');
        if (allHistory.length === 0) {
            reportHistoryList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">承認されたデータがここに表示されます</p>`;
        } else {
            reportHistoryList.innerHTML = allHistory.map(item => `
                <div class="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0 last:pb-0 mt-2">
                    <div>
                        <p class="text-sm font-medium text-slate-200">${item.title} <span class="text-xs text-indigo-400 ml-1">(${item.childName})</span></p>
                        <p class="text-[10px] text-slate-500">${item.date}</p>
                    </div>
                    <span class="text-sm font-bold text-emerald-400">¥${item.price}</span>
                </div>
            `).join('');
        }
    }

    // 4. 通知タブ
    if (currentTab === 'notifications') {
        const notificationsList = document.getElementById('notifications-list');
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
    
    // 5. 設定タブ (親専用・子専用メニューの切り替え)
    const passwordSettings = document.getElementById('parent-password-settings');
    if (passwordSettings) {
        if (currentRole === 'parent') {
            passwordSettings.classList.remove('hidden');
        } else {
            passwordSettings.classList.add('hidden');
        }
    }

    const childAccountSettings = document.getElementById('child-account-settings');
    if (childAccountSettings) {
        if (currentRole === 'child') {
            childAccountSettings.classList.remove('hidden');
            const child = children.find(c => c.id === currentUserId);
            if (child) {
                document.getElementById('child-name-input').value = child.name;
            }
        } else {
            childAccountSettings.classList.add('hidden');
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
        palette.style.maxHeight = '0px'; palette.style.opacity = '0';
        changeTheme('default');
    }
}

// --- お手伝いの編集・削除機能 ---
function verifyParentPassword() { return prompt('親権限が必要です。親アカウントのパスワードを入力してください:') === parentPassword; }

function promptDeleteJob(title) {
    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }
    if (confirm(`本当に「${title}」を削除しますか？`)) {
        availableJobs = availableJobs.filter(job => job.title !== title);
        showToast(`「${title}」を削除しました。`);
        updateUI();
    }
}

let currentEditJobTitle = "";

function promptEditJob(title) {
    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }
    const job = availableJobs.find(j => j.title === title);
    if (!job) return;
    
    currentEditJobTitle = title;
    document.getElementById('edit-job-title-input').value = job.title;
    document.getElementById('edit-job-price-input').value = job.price;
    document.getElementById('edit-job-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-job-modal').classList.add('hidden');
    currentEditJobTitle = "";
}

function saveEditedJob() {
    const newTitle = document.getElementById('edit-job-title-input').value.trim();
    const newPrice = parseInt(document.getElementById('edit-job-price-input').value);
    
    if (!newTitle || isNaN(newPrice)) { alert('正しい名前と金額を入力してください。'); return; }
    
    const jobIndex = availableJobs.findIndex(j => j.title === currentEditJobTitle);
    if (jobIndex !== -1) {
        availableJobs[jobIndex].title = newTitle;
        availableJobs[jobIndex].price = newPrice;
        showToast(`「${newTitle}」に更新しました。`);
    }
    closeEditModal();
    updateUI();
}

function changeTheme(color) {
    if (currentRole === 'child') {
        const child = children.find(c => c.id === currentUserId);
        if (child) child.theme = color;
    } else if (currentRole === 'parent') {
        parentTheme = color;
    }
    applyTheme(color);
}

function applyTheme(color) {
    let styleTag = document.getElementById('dynamic-theme');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme';
        document.head.appendChild(styleTag);
    }
    let css = '';
    switch (color) {
        case 'black': css = `body { background-color: #000 !important; color: #fff !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #111 !important; border-color: #333 !important; }`; break;
        case 'white': css = `body { background-color: #f8fafc !important; color: #0f172a !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #ffffff !important; border-color: #e2e8f0 !important; color: #0f172a !important; } .bg-slate-800 { background-color: #f1f5f9 !important; color: #0f172a !important; border-color: #cbd5e1 !important; } .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400, .text-slate-500, .text-slate-300 i, .text-slate-400 i { color: #334155 !important; } .border-slate-800, .border-slate-700 { border-color: #cbd5e1 !important; }`; break;
        case 'blue': css = `body { background-color: #082f49 !important; color: #e0f2fe !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #0c4a6e !important; border-color: #0284c7 !important; }`; break;
        case 'green': css = `body { background-color: #052e16 !important; color: #dcfce7 !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #14532d !important; border-color: #16a34a !important; }`; break;
        case 'yellow': css = `body { background-color: #422006 !important; color: #fef08a !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #713f12 !important; border-color: #eab308 !important; }`; break;
        case 'red': css = `body { background-color: #450a0a !important; color: #fee2e2 !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #7f1d1d !important; border-color: #dc2626 !important; }`; break;
        case 'pink': css = `body { background-color: #500724 !important; color: #fce7f3 !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #831843 !important; border-color: #db2777 !important; }`; break;
        case 'orange': css = `body { background-color: #431407 !important; color: #ffedd5 !important; } .bg-slate-900, .bg-slate-950, .bg-slate-900\\/50 { background-color: #7c2d12 !important; border-color: #ea580c !important; }`; break;
        default: css = '';
    }
    styleTag.innerHTML = css;
}

// --- 子アカウントの名称変更と削除 ---
function updateChildName() {
    const child = children.find(c => c.id === currentUserId);
    if (!child) return;

    const input = document.getElementById('child-name-input');
    const newName = input.value.trim();

    if (!newName) { showToast('名前を入力してください。'); return; }

    // 先に親パスワード認証
    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }

    const oldName = child.name;
    child.name = newName;
    
    showToast(`名前を「${newName}」に変更しました！`);
    addNotification(`【${oldName}】の名前が「${newName}」に変更されました。`);
    
    // バッジ等の再表示
    const badge = document.getElementById('role-badge');
    if (badge) badge.innerText = `子モード (${child.name})`;
    
    updateUI();
}

function deleteChildAccount() {
    const child = children.find(c => c.id === currentUserId);
    if (!child) return;

    // 先に親パスワード認証
    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }

    // 2回確認する
    if (confirm(`本当にアカウント「${child.name}」を削除しますか？\nこの操作は取り消せません。`)) {
        if (confirm(`【最終確認】本当に削除してよろしいですか？\nこれまでの獲得金額（¥${child.totalAmount.toLocaleString()}）や履歴データもすべて消去されます。`)) {
            const name = child.name;
            children = children.filter(c => c.id !== currentUserId);
            
            showToast(`「${name}」のアカウントを削除しました。`);
            addNotification(`アカウント「${name}」が削除されました。`);
            
            logout();
            renderLoginScreen();
        }
    }
}