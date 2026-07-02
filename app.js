// app.js

// --- 状態管理 (State) ---
let currentRole = null; // 'child' or 'parent'
let currentTab = 'main'; // 'main', 'report', 'settings'

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
let pendingRequests = [
    { id: 1, title: '風呂洗い', price: 50, icon: 'fa-bath', time: '10分前' }
];
let pendingProposals = [
    { id: 1, title: '洗車をする', price: 500, time: '昨日' }
];

// --- 画面初期化・切り替え ---
function loginAs(role) {
    currentRole = role;
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    
    // ロールに応じたバッジと画面表示
    const badge = document.getElementById('role-badge');
    if (role === 'child') {
        badge.innerText = '子モード';
        badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    } else {
        badge.innerText = '親モード';
        badge.className = 'text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    }
    
    switchTab('main');
    updateUI();
}

function logout() {
    currentRole = null;
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
}

function switchTab(tabName) {
    currentTab = tabName;
    
    document.getElementById('tab-child-main').classList.add('hidden');
    document.getElementById('tab-parent-main').classList.add('hidden');
    document.getElementById('tab-report').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');
    
    ['main', 'report', 'settings'].forEach(t => {
        document.getElementById(`nav-${t}`).className = "text-slate-400 hover:text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";
    });

    document.getElementById(`nav-${tabName}`).className = "bg-slate-800 text-white px-3 py-1.5 rounded-xl text-sm font-medium transition";

    if (tabName === 'main') {
        if (currentRole === 'child') {
            document.getElementById('tab-child-main').classList.remove('hidden');
        } else {
            document.getElementById('tab-parent-main').classList.remove('hidden');
        }
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

// --- 子のアクション ---
function requestJob(title, price, icon) {
    const newRequest = {
        id: Date.now(),
        title: title,
        price: price,
        icon: icon,
        time: 'たった今'
    };
    pendingRequests.unshift(newRequest);
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
        } else {
            showToast(`「${req.title}」の申請を却下しました。`);
        }
        updateUI();
    }
}

// 【機能強化】新メニューの提案審査処理
function handleProposal(id, isApproved) {
    const index = pendingProposals.findIndex(p => p.id === id);
    if (index !== -1) {
        const prop = pendingProposals[index];
        pendingProposals.splice(index, 1);
        
        if (isApproved) {
            // 採用（許可）された場合、一覧データ(availableJobs)に動的追加
            availableJobs.push({
                title: prop.title,
                price: prop.price,
                icon: 'fa-star' // 新メニューは区別しやすいよう「星アイコン」を自動付与
            });
            showToast(`提案「${prop.title}」を採用しました！お手伝いリストに追加されました。`);
        } else {
            // 拒否された場合は追加せずメッセージのみ表示
            showToast(`提案「${prop.title}」を見送りました。`);
        }
        updateUI();
    }
}

// --- UIの動的更新レンダリング ---
function updateUI() {
    // 金額表示の同期
    document.getElementById('child-total-amount').innerText = `¥${totalAmount.toLocaleString()}`;
    document.getElementById('report-total-amount').innerText = `¥${totalAmount.toLocaleString()}`;
    document.getElementById('report-total-count').innerText = `${confirmedHistory.length}回`;

    // 0. 子のお手伝い申請カード一覧の生成
    const jobListContainer = document.getElementById('job-list-container');
    if (jobListContainer) {
        jobListContainer.innerHTML = availableJobs.map(job => `
            <button onclick="requestJob('${job.title}', ${job.price}, '${job.icon}')" class="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 p-5 rounded-2xl flex flex-col items-center justify-center text-center transition group active:scale-95">
                <div class="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-indigo-600/10 text-slate-300 group-hover:text-indigo-400 flex items-center justify-center text-xl mb-3 transition">
                    <i class="fa-solid ${job.icon}"></i>
                </div>
                <span class="font-medium text-sm text-slate-200 mb-1">${job.title}</span>
                <span class="text-xs font-bold text-indigo-400">¥${job.price}</span>
            </button>
        `).join('');
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
}