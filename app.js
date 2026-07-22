// app.js

// --- 初期ジョブの定義 ---
const INITIAL_JOBS = [
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

// --- 状態管理 (State) ---
let currentRole = null; 
let currentUserId = null; 
let viewingChildId = null; 
let currentTab = 'main'; 
let reportSelectedTarget = 'all';

// 保存されるデータ群
let parentPassword = 'fuu18'; 
let parentTheme = 'default';
let children = [];
let lastActiveDate = ""; 
let notifications = []; 
let availableJobs = [];

// --- ローカルストレージ機能 ---
function loadState() {
    const saved = localStorage.getItem('familyApp_state');
    if (saved) {
        const state = JSON.parse(saved);
        children = state.children || [];
        availableJobs = state.availableJobs || [...INITIAL_JOBS];
        notifications = state.notifications || [];
        lastActiveDate = state.lastActiveDate || "";
        parentPassword = state.parentPassword || 'fuu18';
        parentTheme = state.parentTheme || 'default';
    } else {
        // 初回アクセス時の初期データ
        children = [
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
        availableJobs = [...INITIAL_JOBS];
    }
}

function saveState() {
    const state = {
        children,
        availableJobs,
        notifications,
        lastActiveDate,
        parentPassword,
        parentTheme
    };
    localStorage.setItem('familyApp_state', JSON.stringify(state));
}

// アプリ起動時にデータをロード
loadState();


// --- ログイン画面の動的生成 ---
function renderLoginScreen() {
    const container = document.getElementById('login-cards-container');
    container.className = "flex flex-wrap justify-center gap-3 sm:gap-4 mt-2";
    
    let html = '';

    html += `
        <button onclick="promptParentLogin()" class="w-24 sm:w-28 aspect-square shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl transition duration-200 flex flex-col items-center justify-center p-3 shadow-lg shadow-indigo-600/20">
            <i class="fa-solid fa-user-tie text-3xl mb-2"></i>
            <span class="text-xs sm:text-sm">親</span>
        </button>
    `;

    children.forEach(child => {
        html += `
            <button onclick="loginAsChild('${child.id}')" class="w-24 sm:w-28 aspect-square shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl transition duration-200 flex flex-col items-center justify-center p-3 border border-slate-700 shadow-md">
                <i class="fa-solid fa-child text-3xl mb-2 text-indigo-400"></i>
                <span class="text-xs sm:text-sm line-clamp-1 w-full text-center">${child.name}</span>
            </button>
        `;
    });

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
        saveState(); // ★保存
        showToast(`${name.trim()}のアカウントを追加しました！`);
        renderLoginScreen();
    }
}

renderLoginScreen();

// --- リアルタイム時計機能 ---
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

    const currentDateStr = `${year}/${month}/${date}`;
    if (!lastActiveDate) {
        lastActiveDate = currentDateStr; 
        saveState(); // ★保存
    } else if (lastActiveDate !== currentDateStr) {
        lastActiveDate = currentDateStr; 
        children.forEach(c => c.completedToday = []); 
        saveState(); // ★保存
        if (currentRole) updateUI();
    }
}
updateClock();
setInterval(updateClock, 1000);

// --- 通知機能 ---
function addNotification(childId, childName, message) {
    const now = new Date();
    const jstString = now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
    const jstDate = new Date(jstString);
    const timestamp = `${jstDate.getFullYear()}/${jstDate.getMonth() + 1}/${jstDate.getDate()} ${String(jstDate.getHours()).padStart(2, '0')}:${String(jstDate.getMinutes()).padStart(2, '0')}`;

    notifications.unshift({ 
        id: Date.now(), 
        childId: childId, 
        childName: childName,
        message: message, 
        timestamp: timestamp 
    });
    saveState(); // ★保存
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
    reportSelectedTarget = 'all'; 
    
    applyTheme('default'); 
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    
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
            backToParentList();
        }
    } else {
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    }
    updateUI();
}

function changeReportTarget(target) {
    reportSelectedTarget = target;
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
    saveState(); // ★保存
    showToast('パスワードを正常に変更しました！');
    currentInput.value = ''; newInput.value = ''; confirmInput.value = '';
}

// --- 子のアクション ---
function requestJob(title, price, icon) {
    const child = children.find(c => c.id === currentUserId);
    if (!child || child.completedToday.includes(title)) return;

    child.pendingRequests.unshift({ id: Date.now(), title: title, price: price, icon: icon, time: 'たった今' });
    child.completedToday.push(title);
    
    saveState(); // ★保存
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
    
    saveState(); // ★保存
    showToast(`新メニュー「${titleInput.value}」を提案しました！`);
    
    titleInput.value = ''; priceInput.value = '';
    updateUI();
}

// --- 親のアクション ---

// --- 重複申請アラート用の状態管理 ---
let pendingDuplicateCheck = null;

// 重複チェックを行い、問題なければ承認、重複があればアラートを出す関数
function checkDuplicateAndHandleRequest(childId, reqId) {
    const child = children.find(c => c.id === childId);
    if (!child) return;

    const req = child.pendingRequests.find(r => r.id === reqId);
    if (!req) return;

    const jobTitle = req.title;
    const todayStr = new Date().toLocaleDateString('ja-JP');
    let isDuplicated = false;

    // 他の子アカウントをループして同じジョブがないか確認
    for (const otherChild of children) {
        if (otherChild.id === childId) continue; // 自分自身はスキップ

        // 条件1: 他の子が同じジョブを現在「申請中」かどうか
        const hasPending = otherChild.pendingRequests.some(r => r.title === jobTitle);
        
        // 条件2: 他の子が今日すでに同じジョブを「承認済み」かどうか
        const hasConfirmedToday = otherChild.confirmedHistory.some(h => h.title === jobTitle && h.date === todayStr);

        if (hasPending || hasConfirmedToday) {
            isDuplicated = true;
            break;
        }
    }

    if (isDuplicated) {
        // 重複している場合は情報を保持してモーダルを表示
        pendingDuplicateCheck = { childId, reqId };
        document.getElementById('duplicate-alert-modal').classList.remove('hidden');
    } else {
        // 重複していなければ通常通りそのまま承認処理へ
        handleRequest(childId, reqId, true);
    }
}

// モーダルで3つのボタンのいずれかが押された時の処理
function handleDuplicateChoice(choice) {
    if (!pendingDuplicateCheck) return;
    const { childId, reqId } = pendingDuplicateCheck;

    if (choice === 'approve') {
        // 承認：そのまま承認する
        handleRequest(childId, reqId, true);
    } else if (choice === 'reject') {
        // 拒否：申請を却下する
        handleRequest(childId, reqId, false);
    }
    // choice === 'pending' (保留) の場合は何もしない

    // モーダルを閉じて状態をリセット
    document.getElementById('duplicate-alert-modal').classList.add('hidden');
    pendingDuplicateCheck = null;
}

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
            addNotification(child.id, child.name, `【${child.name}】お手伝い申請「${req.title}」が許可されました。`);
        } else {
            showToast(`「${req.title}」の申請を却下しました。`);
            child.completedToday = child.completedToday.filter(title => title !== req.title);
            addNotification(child.id, child.name, `【${child.name}】お手伝い申請「${req.title}」が拒否されました。`);
        }
        saveState(); // ★保存
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
            addNotification(child.id, child.name, `【${child.name}】新メニュー「${prop.title}」の追加が許可されました。`);
        } else {
            showToast(`提案「${prop.title}」を見送りました。`);
            addNotification(child.id, child.name, `【${child.name}】新メニュー「${prop.title}」の追加が見送られました。`);
        }
        saveState(); // ★保存
        updateUI();
    }
}

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
                            <button onclick="checkDuplicateAndHandleRequest('${child.id}', ${req.id})" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">承認</button>    
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

    // 3. レポートタブ 
    if (currentTab === 'report') {
        const selectorContainer = document.getElementById('report-child-selector');
        const reportTitle = document.getElementById('report-title');

        let targetChildren = [];
        
        if (currentRole === 'child') {
            if (selectorContainer) selectorContainer.classList.add('hidden');
            const child = children.find(c => c.id === currentUserId);
            if (child) {
                targetChildren = [child];
                if (reportTitle) reportTitle.innerHTML = `<i class="fa-solid fa-chart-simple mr-1.5 text-indigo-400"></i>お手伝いレポート`;
            }
        } else if (currentRole === 'parent') {
            if (selectorContainer) {
                selectorContainer.classList.remove('hidden');
                let selectorHtml = `<button onclick="changeReportTarget('all')" class="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${reportSelectedTarget === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'}">全員</button>`;
                children.forEach(c => {
                    selectorHtml += `<button onclick="changeReportTarget('${c.id}')" class="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition ${reportSelectedTarget === c.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'}">${c.name}</button>`;
                });
                selectorContainer.innerHTML = selectorHtml;
            }

            if (reportSelectedTarget === 'all') {
                targetChildren = children;
                if (reportTitle) reportTitle.innerHTML = `<i class="fa-solid fa-users mr-1.5 text-indigo-400"></i>お手伝いレポート (全体)`;
            } else {
                const child = children.find(c => c.id === reportSelectedTarget);
                if (child) {
                    targetChildren = [child];
                    if (reportTitle) reportTitle.innerHTML = `<i class="fa-solid fa-child mr-1.5 text-indigo-400"></i>${child.name} のレポート`;
                } else {
                    targetChildren = children;
                    reportSelectedTarget = 'all';
                    if (reportTitle) reportTitle.innerHTML = `<i class="fa-solid fa-users mr-1.5 text-indigo-400"></i>お手伝いレポート (全体)`;
                }
            }
        }

        let allHistory = [];
        targetChildren.forEach(c => {
            c.confirmedHistory.forEach(h => allHistory.push({...h, childName: c.name}));
        });

        // 成果の集計処理（今月と今日）
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        const currentMonthPrefix = `${currentYear}/${currentMonth}`;

        let monthTotalAmount = 0;
        let monthTotalCount = 0;
        let todayTotalAmount = 0;
        let todayTotalCount = 0;

        // グラフ用の日別データ
        const dailyData = {}; 

        allHistory.forEach(item => {
            const dateParts = item.date.split('/');
            if (dateParts.length === 3) {
                const itemYear = parseInt(dateParts[0], 10);
                const itemMonth = parseInt(dateParts[1], 10);
                const itemDay = parseInt(dateParts[2], 10);
                const itemMonthPrefix = `${itemYear}/${itemMonth}`;

                if (itemMonthPrefix === currentMonthPrefix) {
                    monthTotalAmount += item.price;
                    monthTotalCount++;

                    if (!dailyData[itemDay]) {
                        dailyData[itemDay] = { amount: 0, count: 0 };
                    }
                    dailyData[itemDay].amount += item.price;
                    dailyData[itemDay].count++;
                }
                if (itemYear === currentYear && itemMonth === currentMonth && itemDay === currentDay) {
                    todayTotalAmount += item.price;
                    todayTotalCount++;
                }
            }
        });

        // UIに数値を反映
        document.getElementById('report-month-total').innerText = `¥${monthTotalAmount.toLocaleString()}`;
        document.getElementById('report-month-count').innerText = `${monthTotalCount}回`;
        document.getElementById('report-today-total').innerText = `¥${todayTotalAmount.toLocaleString()}`;
        document.getElementById('report-today-count').innerText = `${todayTotalCount}回`;

        // --- グラフデータの作成と描画 ---
        const lastDay = new Date(currentYear, currentMonth, 0).getDate();
        const labels = [];
        const amountData = [];
        const countData = [];

        for (let i = 1; i <= lastDay; i++) {
            labels.push(`${i}日`);
            if (dailyData[i]) {
                amountData.push(dailyData[i].amount);
                countData.push(dailyData[i].count);
            } else {
                amountData.push(0);
                countData.push(0);
            }
        }

        const ctx = document.getElementById('monthlyChart').getContext('2d');
        if (window.myReportChart) {
            window.myReportChart.destroy();
        }

        const textColor = '#94a3b8';
        const gridColor = 'rgba(51, 65, 85, 0.5)';

        window.myReportChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'line',
                        label: '合計額 (¥)',
                        data: amountData,
                        borderColor: '#34d399', 
                        backgroundColor: '#34d399',
                        borderWidth: 2,
                        yAxisID: 'y-amount',
                        tension: 0.1,
                        pointRadius: 3
                    },
                    {
                        type: 'bar',
                        label: '合計回数 (回)',
                        data: countData,
                        backgroundColor: 'rgba(129, 140, 248, 0.8)', 
                        borderColor: '#818cf8',
                        borderWidth: 1,
                        yAxisID: 'y-count',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    'y-amount': {
                        type: 'linear',
                        position: 'left',
                        title: { display: true, text: '金額 (¥)', color: textColor, font: { size: 10 } },
                        ticks: { color: textColor, font: { size: 10 } },
                        grid: { color: gridColor }
                    },
                    'y-count': {
                        type: 'linear',
                        position: 'right',
                        title: { display: true, text: '回数 (回)', color: textColor, font: { size: 10 } },
                        ticks: { color: textColor, stepSize: 1, font: { size: 10 } },
                        grid: { drawOnChartArea: false } 
                    },
                    x: {
                        ticks: { color: textColor, font: { size: 10 }, maxRotation: 45 },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 11 }, boxWidth: 12 }
                    }
                }
            }
        });

        // --- 承認済みお手伝い一覧の描画 ---
        const reportHistoryList = document.getElementById('report-history-list');
        if (allHistory.length === 0) {
            reportHistoryList.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">承認されたデータがここに表示されます</p>`;
        } else {
            reportHistoryList.innerHTML = allHistory.map(item => `
                <div class="flex items-center justify-between border-b border-slate-800/60 pb-2 last:border-0 last:pb-0 mt-2">
                    <div>
                        <p class="text-sm font-medium text-slate-200">${item.title} ${targetChildren.length > 1 ? `<span class="text-xs text-indigo-400 ml-1">(${item.childName})</span>` : ''}</p>
                        <p class="text-[10px] text-slate-500">${item.date}</p>
                    </div>
                    <span class="text-sm font-bold text-emerald-400">¥${item.price}</span>
                </div>
            `).join('');
        }
    }

    // 4. 通知タブ
    if (currentTab === 'notifications') {
        const tabContainer = document.getElementById('tab-notifications');
        
        let html = `
            <div class="flex flex-col h-[75vh] gap-4">
                <div class="flex items-center justify-between shrink-0">
                    <h2 class="text-lg font-bold"><i class="fa-solid fa-bell text-indigo-400 mr-1.5"></i>通知box</h2>
                </div>
        `;

        if (currentRole === 'child') {
            const childNotifs = notifications.filter(n => n.childId === currentUserId);
            html += `
                <div class="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-y-auto">
                    <div class="space-y-3">
                        ${childNotifs.length === 0 ? `<p class="text-xs text-slate-500 text-center py-4">通知はまだありません</p>` : childNotifs.map(notif => `
                            <div class="flex flex-col bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-sm">
                                <span class="text-sm text-slate-300 font-medium">${notif.message}</span>
                                <span class="text-[10px] text-slate-500 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${notif.timestamp}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else if (currentRole === 'parent') {
            html += `<div class="flex-1 flex flex-row gap-4 overflow-x-auto pb-2">`;
            
            if (children.length === 0 && notifications.filter(n => n.childId === 'deleted').length === 0) {
                html += `<div class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center text-slate-500 text-xs flex items-center justify-center">通知はまだありません</div>`;
            } else {
                children.forEach(child => {
                    const childNotifs = notifications.filter(n => n.childId === child.id);
                    html += `
                        <div class="w-80 shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full">
                            <h3 class="text-sm font-bold text-indigo-400 mb-3 shrink-0 border-b border-slate-800 pb-2 flex items-center justify-between">
                                <span><i class="fa-solid fa-child mr-1.5"></i>${child.name} の通知</span>
                                <span class="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">${childNotifs.length}件</span>
                            </h3>
                            <div class="flex-1 overflow-y-auto space-y-3 pr-1">
                                ${childNotifs.length === 0 ? `<p class="text-xs text-slate-500 py-2 text-center">通知はありません</p>` : childNotifs.map(notif => `
                                    <div class="flex flex-col bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-sm">
                                        <span class="text-sm text-slate-300 font-medium">${notif.message}</span>
                                        <span class="text-[10px] text-slate-500 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${notif.timestamp}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });
                
                const otherNotifs = notifications.filter(n => n.childId === 'deleted');
                if (otherNotifs.length > 0) {
                    html += `
                        <div class="w-80 shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full">
                            <h3 class="text-sm font-bold text-slate-400 mb-3 shrink-0 border-b border-slate-800 pb-2 flex items-center justify-between">
                                <span><i class="fa-solid fa-triangle-exclamation mr-1.5"></i>システム・その他</span>
                                <span class="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">${otherNotifs.length}件</span>
                            </h3>
                            <div class="flex-1 overflow-y-auto space-y-3 pr-1">
                                ${otherNotifs.map(notif => `
                                    <div class="flex flex-col bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-sm">
                                        <span class="text-sm text-slate-300 font-medium">${notif.message}</span>
                                        <span class="text-[10px] text-slate-500 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${notif.timestamp}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            }
            html += `</div>`; 
        }
        
        html += `
            </div>
        `;
        tabContainer.innerHTML = html;
    }
    
    // 5. 設定タブ
    const passwordSettings = document.getElementById('parent-password-settings');
    const resetSettings = document.getElementById('parent-reset-settings'); // ★追加: リセット設定の表示制御

    if (passwordSettings) {
        if (currentRole === 'parent') {
            passwordSettings.classList.remove('hidden');
        } else {
            passwordSettings.classList.add('hidden');
        }
    }
    if (resetSettings) {
        if (currentRole === 'parent') {
            resetSettings.classList.remove('hidden');
        } else {
            resetSettings.classList.add('hidden');
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
        saveState(); // ★保存
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
        saveState(); // ★保存
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
    saveState(); // ★保存
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

function updateChildName() {
    const child = children.find(c => c.id === currentUserId);
    if (!child) return;

    const input = document.getElementById('child-name-input');
    const newName = input.value.trim();

    if (!newName) { showToast('名前を入力してください。'); return; }

    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }

    const oldName = child.name;
    child.name = newName;
    
    saveState(); // ★保存
    showToast(`名前を「${newName}」に変更しました！`);
    addNotification(child.id, newName, `【${oldName}】の名前が「${newName}」に変更されました。`);
    
    const badge = document.getElementById('role-badge');
    if (badge) badge.innerText = `子モード (${child.name})`;
    
    updateUI();
}

function deleteChildAccount() {
    const child = children.find(c => c.id === currentUserId);
    if (!child) return;

    if (!verifyParentPassword()) { alert('パスワードが間違っているか、キャンセルされました。'); return; }

    if (confirm(`本当にアカウント「${child.name}」を削除しますか？\nこの操作は取り消せません。`)) {
        if (confirm(`【最終確認】本当に削除してよろしいですか？\nこれまでの獲得金額（¥${child.totalAmount.toLocaleString()}）や履歴データもすべて消去されます。`)) {
            const name = child.name;
            children = children.filter(c => c.id !== currentUserId);
            
            saveState(); // ★保存
            showToast(`「${name}」のアカウントを削除しました。`);
            addNotification('deleted', name, `アカウント「${name}」が削除されました。`);
            
            logout();
            renderLoginScreen();
        }
    }
}

// ★追加：すべてのデータをリセットする機能（子アカウントのガワは残す）
function resetAllData() {
    if (!verifyParentPassword()) { 
        alert('パスワードが間違っているか、キャンセルされました。'); 
        return; 
    }
    
    if (confirm('【警告】本当に全てのデータをリセットしますか？\n子供アカウントの名前は残りますが、残高や履歴、提案されたメニューなどのデータは全て初期化されます。')) {
        
        // 子アカウントのID、名前、テーマだけを残し、中身を全てリセット
        children = children.map(child => ({
            id: child.id,
            name: child.name,
            theme: child.theme, 
            totalAmount: 0,
            completedToday: [],
            pendingRequests: [],
            pendingProposals: [],
            confirmedHistory: []
        }));
        
        // その他のデータを初期状態に戻す
        availableJobs = [...INITIAL_JOBS];
        notifications = [];
        parentPassword = 'fuu18';
        parentTheme = 'default';
        lastActiveDate = ""; 

        // リセットした状態を保存
        saveState();
        showToast('全てのデータをリセットしました。');
        
        // ログアウトしてトップに戻る
        logout();
    }
}