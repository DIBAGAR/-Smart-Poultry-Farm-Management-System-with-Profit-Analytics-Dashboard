import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBAc1rzlPwX_d_0g4geehNWkuYriG5UelI",
    authDomain: "my-cloud-webapp-8eead.firebaseapp.com",
    projectId: "my-cloud-webapp-8eead",
    storageBucket: "my-cloud-webapp-8eead.firebasestorage.app",
    messagingSenderId: "459385966902",
    appId: "1:459385966902:web:6f265711b9c8ac74c7e397",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const allowedUsers = ["dibagar66@gmail.com", "skabin5677@gmail.com"];

/* =========================================
   1. STYLES & UI
   ========================================= */
const injectStyles = () => {
    const s = document.createElement('style');
    s.innerHTML = `
        .parent-wrapper { text-align: center; margin-right: 15px; flex-shrink: 0; }
        .parent-box { width: 75px; height: 75px; background: #1a1a1a; border-radius: 12px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; overflow: hidden; transition: 0.3s; cursor: pointer; }
        .parent-box:hover { border-color: #ffd700; transform: translateY(-3px); box-shadow: 0 5px 15px rgba(255, 215, 0, 0.2); }
        .parent-box img { width: 100%; height: 100%; object-fit: cover; }
        .parent-name { font-size: 11px; margin-top: 5px; color: #fff; }
        .add-btn-box { background: #ffd700 !important; color: #000; font-size: 30px; border: none !important; }
        
        .action-icon-btn { 
            background: none; border: 1.2px solid #ffd700; border-radius: 8px; padding: 6px; 
            margin: 2px; cursor: pointer; transition: 0.3s; color: #ffd700;
        }
        .action-icon-btn:hover { background: #ffd700; color: #000; transform: scale(1.1); }
        
        .portal-input { width: 100%; padding: 12px; margin-bottom: 10px; background: #222; border: 1px solid #444; color: white; border-radius: 8px; box-sizing: border-box; }
        .v-card { background: #1a1a1a; padding: 15px; border-radius: 10px; border-left: 4px solid #ffd700; margin-bottom: 10px; cursor: pointer; position: relative; }
        .v-card:hover { background: #252525; }

        .toast-notification {
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: #ffd700; color: #000; padding: 12px 25px; border-radius: 50px;
            font-weight: bold; font-size: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            z-index: 999999; animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slideUp { from { bottom: -60px; opacity: 0; } to { bottom: 30px; opacity: 1; } }
    `;
    document.head.appendChild(s);
};
injectStyles();

/* =========================================
   2. HELPERS (TOAST, CONFIRM, PORTAL)
   ========================================= */
const showToast = (msg) => {
    const t = document.createElement('div');
    t.className = "toast-notification";
    t.innerText = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity="0"; t.style.transition="0.5s"; setTimeout(()=>t.remove(),500); }, 3000);
};

const smartConfirm = (title, msg, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.95); display:flex; align-items:center; justify-content:center; z-index:200000; backdrop-filter:blur(5px);";
    overlay.innerHTML = `<div style="background:#111; padding:25px; border-radius:15px; border:1px solid #ffd700; width:300px; text-align:center; color:white;">
        <h3 style="color:#ffd700; margin-top:0;">${title}</h3><p style="font-size:14px; color:#ccc;">${msg}</p>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button id="cN" style="flex:1; padding:10px; background:#333; color:white; border:none; border-radius:8px;">Cancel</button>
            <button id="cY" style="flex:1; padding:10px; background:#ff4757; color:white; border:none; border-radius:8px; font-weight:bold;">Confirm</button>
        </div></div>`;
    document.body.appendChild(overlay);
    document.getElementById('cN').onclick = () => overlay.remove();
    document.getElementById('cY').onclick = () => { onConfirm(); overlay.remove(); };
};

const openPortal = (title, html) => {
    const old = document.getElementById('p-overlay'); if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'p-overlay';
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:150000; padding:15px;";
    overlay.innerHTML = `<div style="background:#111; width:100%; max-width:400px; border-radius:15px; border:1px solid #333; overflow:hidden; color:white;">
        <div style="background:#ffd700; color:#000; padding:15px; font-weight:bold; display:flex; justify-content:space-between;">
            <span>${title}</span><button onclick="document.getElementById('p-overlay').remove()" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
        </div><div style="padding:20px; max-height:80vh; overflow-y:auto;">${html}</div></div>`;
    document.body.appendChild(overlay);
};

/* =========================================
   3. BUY BACK (LEDGER SYNC)
   ========================================= */
window.openBuyBack = async (bid) => {
    const html = `<div id="bb-list"></div><hr style="border-color:#333; margin:15px 0;">
        <p style="color:#ffd700; font-weight:bold;">New Purchase Record</p>
        <input type="date" id="n_date" value="${new Date().toISOString().split('T')[0]}" class="portal-input">
        <input type="text" id="n_item" placeholder="Product Name" class="portal-input">
        <div style="display:flex; gap:5px;"><input type="number" id="n_qty" placeholder="Qty" class="portal-input"><input type="number" id="n_wt" placeholder="Wt(kg)" class="portal-input"></div>
        <input type="text" id="n_supp" placeholder="Supplier" class="portal-input">
        <div style="display:flex; gap:5px;"><input type="number" id="n_tot" placeholder="Total" class="portal-input"><input type="number" id="n_paid" placeholder="Paid" class="portal-input"></div>
        <button id="addBB" style="width:100%; background:#ffd700; padding:15px; border:none; border-radius:10px; font-weight:bold;">SAVE TO PURCHASE LOG</button>`;
    openPortal("BUY BACK LEDGER", html);
    refreshBB(bid);
    document.getElementById('addBB').onclick = async () => {
        const payload = { batchId: bid, date: document.getElementById('n_date').value, product: document.getElementById('n_item').value, qty: Number(document.getElementById('n_qty').value), weight: Number(document.getElementById('n_wt').value), party: document.getElementById('n_supp').value, totalAmount: Number(document.getElementById('n_tot').value), paidAmount: Number(document.getElementById('n_paid').value) };
        const ref = await addDoc(collection(db, 'purchase'), payload);
        const pS = await getDoc(doc(db, 'chicks', bid));
        let ids = pS.data().buyBackIds || []; ids.push(ref.id);
        await updateDoc(doc(db, 'chicks', bid), { buyBackIds: ids });
        showToast("✅ Recorded"); refreshBB(bid);
    };
};

async function refreshBB(bid) {
    const list = document.getElementById('bb-list');
    const snap = await getDoc(doc(db, 'chicks', bid));
    const ids = snap.data().buyBackIds || [];
    list.innerHTML = ids.length === 0 ? "<p style='text-align:center; color:#555;'>No records yet</p>" : "";
    for (let id of ids) {
        const s = await getDoc(doc(db, 'purchase', id));
        if (s.exists()) {
            const d = s.data();
            const card = document.createElement('div'); card.className = "v-card";
            card.innerHTML = `<div style="font-size:11px; color:#888;">${d.date}</div><div style="font-weight:bold;">${d.party}</div><div style="font-size:13px; color:#ccc;">${d.product} | ${d.weight}kg</div><div style="color:#ffd700; font-weight:bold;">₹${d.totalAmount}</div>`;
            card.onclick = () => editBBEntry(id, bid, d);
            list.appendChild(card);
        }
    }
}

function editBBEntry(pid, bid, d) {
    const html = `<input type="date" id="u_date" value="${d.date}" class="portal-input"><input type="text" id="u_item" value="${d.product}" class="portal-input"><div style="display:flex; gap:5px;"><input type="number" id="u_qty" value="${d.qty}" class="portal-input"><input type="number" id="u_wt" value="${d.weight}" class="portal-input"></div><input type="text" id="u_supp" value="${d.party}" class="portal-input"><div style="display:flex; gap:5px;"><input type="number" id="u_tot" value="${d.totalAmount}" class="portal-input"><input type="number" id="u_paid" value="${d.paidAmount}" class="portal-input"></div><div style="display:flex; gap:10px;"><button id="upBB" style="flex:1; background:#ffd700; padding:12px; border:none; border-radius:8px; font-weight:bold;">Update</button><button id="delBB" style="flex:1; background:#ff4757; color:white; padding:12px; border:none; border-radius:8px; font-weight:bold;">Delete</button></div>`;
    openPortal("EDIT PURCHASE", html);
    document.getElementById('upBB').onclick = async () => {
        await updateDoc(doc(db, 'purchase', pid), { date: document.getElementById('u_date').value, product: document.getElementById('u_item').value, qty: Number(document.getElementById('u_qty').value), weight: Number(document.getElementById('u_wt').value), party: document.getElementById('u_supp').value, totalAmount: Number(document.getElementById('u_tot').value), paidAmount: Number(document.getElementById('u_paid').value) });
        showToast("✅ Updated"); window.openBuyBack(bid);
    };
    document.getElementById('delBB').onclick = () => smartConfirm("Delete?", "Remove permanently?", async () => {
        await deleteDoc(doc(db, 'purchase', pid));
        const pS = await getDoc(doc(db, 'chicks', bid));
        let ids = pS.data().buyBackIds.filter(i => i !== pid);
        await updateDoc(doc(db, 'chicks', bid), { buyBackIds: ids });
        showToast("🗑️ Deleted"); window.openBuyBack(bid);
    });
}

/* =========================================
   4. JOB WORK (SALES SYNC)
   ========================================= */
window.openJobWork = async (id) => {
    const snap = await getDoc(doc(db, 'chicks', id)); const p = snap.data();
    let jData = null; if(p.jobWorkId) { const s = await getDoc(doc(db, 'sales', p.jobWorkId)); if(s.exists()) jData = s.data(); }
    if(!jData) renderJWForm(id, null, null);
    else {
        const html = `<div class="v-card" style="border-left-color: #27ae60;"><p><b>Date:</b> ${jData.date}</p><p><b>Product:</b> ${jData.product}</p><p><b>Customer:</b> ${jData.party}</p><p style="color:#ffd700;"><b>Total:</b> ₹${jData.totalAmount}</p></div><button id="editJW" style="width:100%; background:#ffd700; padding:12px; border:none; border-radius:8px; font-weight:bold; margin-top:10px;">EDIT SALES INFO</button>`;
        openPortal("JOB WORK (SAVED)", html);
        document.getElementById('editJW').onclick = () => renderJWForm(id, p.jobWorkId, jData);
    }
};

function renderJWForm(batchId, jwId, d) {
    const html = `<input type="date" id="j_date" value="${d?d.date:new Date().toISOString().split('T')[0]}" class="portal-input"><input type="text" id="j_prod" value="${d?d.product:''}" placeholder="Product Name" class="portal-input"><div style="display:flex; gap:5px;"><input type="number" id="j_qty" value="${d?d.qty:''}" placeholder="Qty" class="portal-input"><input type="number" id="j_wt" value="${d?d.weight:''}" placeholder="Weight" class="portal-input"></div><input type="text" id="j_party" value="${d?d.party:''}" placeholder="Customer" class="portal-input"><div style="display:flex; gap:5px;"><input type="number" id="j_total" value="${d?d.totalAmount:''}" placeholder="Total" class="portal-input"><input type="number" id="j_paid" value="${d?d.paidAmount:''}" placeholder="Paid" class="portal-input"></div><button id="saveJW" style="width:100%; background:#ffd700; padding:15px; border-radius:10px; font-weight:bold;">SAVE & SYNC</button>`;
    openPortal("JOB WORK FORM", html);
    document.getElementById('saveJW').onclick = async () => {
        const payload = { batchId, date: document.getElementById('j_date').value, product: document.getElementById('j_prod').value, qty: Number(document.getElementById('j_qty').value), weight: Number(document.getElementById('j_wt').value), party: document.getElementById('j_party').value, totalAmount: Number(document.getElementById('j_total').value), paidAmount: Number(document.getElementById('j_paid').value) };
        if(jwId) await updateDoc(doc(db, 'sales', jwId), payload);
        else { const r = await addDoc(collection(db, 'sales'), payload); await updateDoc(doc(db, 'chicks', batchId), { jobWorkId: r.id }); }
        showToast("✅ Synced to Sales"); document.getElementById('p-overlay').remove();
    };
}

/* =========================================
   5. MONITORING & TABLE
   ========================================= */
async function renderChicksTable(snap) {
    const container = document.getElementById('chickTableBody');
    if(!container) return; container.innerHTML = "";
    const today = new Date().toISOString().split('T')[0];

    for (const d of snap.docs) {
        const p = d.data(); const id = d.id;
        let totalBB = 0; if (p.buyBackIds) { for (let bId of p.buyBackIds) { const bS = await getDoc(doc(db, 'purchase', bId)); if (bS.exists()) totalBB += (Number(bS.data().weight) || 0); } }
        let totalJW = 0; if (p.jobWorkId) { const jS = await getDoc(doc(db, 'sales', p.jobWorkId)); if (jS.exists()) totalJW = (Number(jS.data().weight) || 0); }

        container.innerHTML += `<tr>
            <td>${p.hatchDate}</td><td>${p.cock}/${p.hen}</td><td>${p.count}</td>
            ${renderVac(id, p.vac1, p.v1Done, 1, today)}
            ${renderVac(id, p.vac2, p.v2Done, 2, today)}
            ${renderVac(id, p.vac3, p.v3Done, 3, today)}
            <td style="color:#ffd700; font-weight:bold;">${(totalBB - totalJW).toFixed(2)} kg</td>
            <td style="white-space:nowrap;">
                <button onclick="openBuyBack('${id}')" class="action-icon-btn" title="Buy Back" style="color:${p.buyBackIds?.length ? '#ffd700':'#666'}">🛒</button>
                <button onclick="openJobWork('${id}')" class="action-icon-btn" title="Job Work" style="color:${p.jobWorkId ? '#ffd700':'#666'}">🛠️</button>
                <button onclick="archiveBatch('${id}')" class="action-icon-btn" title="Archive">✅</button>
                <button onclick="deleteBatch('${id}')" class="action-icon-btn" style="color:#ff4757;">🗑️</button>
            </td></tr>`;
    }
}

function renderVac(id, dateStr, isDone, n, today) {
    let btnColor = isDone ? "#2ed573" : (dateStr < today ? "#ff4757" : (dateStr === today ? "#3498db" : "#ffa500"));
    let emailIcon = (dateStr === today && !isDone) ? "📩" : "";
    return `<td><div style="font-size:10px; color:#888;">${dateStr} ${emailIcon}</div>
        <button onclick="mobileFriendlyDoubleClick(event, '${id}', ${n}, ${isDone})" style="width:70px; height:26px; border:none; border-radius:4px; font-weight:800; font-size:9px; background:${btnColor}; color:white;">
        ${isDone ? 'DONE' : (dateStr === today ? 'TODAY' : 'MARK')}</button></td>`;
}

/* =========================================
   6. PARENTS & AUTH
   ========================================= */
function renderParents(snap, rowId, selectId) {
    const row = document.getElementById(rowId);
    const select = document.getElementById(selectId);
    if(!row || !select) return;
    row.innerHTML = ""; select.innerHTML = `<option value="">Select Parent</option>`;
    const addWrap = document.createElement('div'); addWrap.className = "parent-wrapper";
    addWrap.innerHTML = `<div class="parent-box add-btn-box" onclick="window.triggerUpload('${rowId === 'maleRow' ? 'male' : 'female'}')">+</div><div class="parent-name">Add New</div>`;
    row.appendChild(addWrap);
    snap.forEach(d => {
        const p = d.data();
        const wrap = document.createElement('div'); wrap.className = "parent-wrapper";
        wrap.innerHTML = `<div class="parent-box"><img src="${p.imgData}"></div><div class="parent-name">${p.name}</div>`;
        const box = wrap.querySelector('.parent-box');
        box.ondblclick = () => window.zoomParent(d.id, p.name, p.imgData, rowId);
        let lt = 0; box.addEventListener('touchend', (e) => { let nw = Date.now(); if(nw - lt < 300) window.zoomParent(d.id, p.name, p.imgData, rowId); lt = nw; });
        row.appendChild(wrap); select.innerHTML += `<option value="${p.name}">${p.name}</option>`;
    });
}

window.zoomParent = (id, name, img, rowId) => {
    const html = `<div style="text-align:center;"><img src="${img}" style="width:180px; height:180px; border-radius:12px; object-fit:cover; border:3px solid #ffd700;"><input type="text" id="ePName" value="${name}" class="portal-input" style="margin-top:15px; text-align:center;"><div style="display:flex; gap:10px;"><button id="upP" style="flex:1; background:#ffd700; padding:12px; border-radius:8px; font-weight:bold;">Rename</button><button id="delP" style="flex:1; background:#ff4757; color:white; padding:12px; border-radius:8px; font-weight:bold;">Delete</button></div></div>`;
    openPortal("BREEDER INFO", html);
    document.getElementById('upP').onclick = async () => { const col = rowId === 'maleRow' ? 'parents_male' : 'parents_female'; await updateDoc(doc(db, col, id), { name: document.getElementById('ePName').value }); showToast("✅ Updated"); document.getElementById('p-overlay').remove(); };
    document.getElementById('delP').onclick = () => smartConfirm("Delete?", "Remove breeder?", async () => { const col = rowId === 'maleRow' ? 'parents_male' : 'parents_female'; await deleteDoc(doc(db, col, id)); showToast("🗑️ Removed"); document.getElementById('p-overlay').remove(); });
};

onAuthStateChanged(auth, (user) => {
    if (user && allowedUsers.includes(user.email)) {
        document.getElementById('security-check').style.display = 'none'; document.getElementById('app-content').style.display = 'block';
        onSnapshot(query(collection(db, 'chicks'), orderBy("hatchDate", "desc")), renderChicksTable);
        onSnapshot(collection(db, 'parents_male'), s => renderParents(s, 'maleRow', 'cockSelect'));
        onSnapshot(collection(db, 'parents_female'), s => renderParents(s, 'femaleRow', 'henSelect'));
    } else { window.location.replace("login.html"); }
});

let activeG = '';
window.triggerUpload = (g) => { activeG = g; document.getElementById('parentImgInput').click(); };
document.getElementById('parentImgInput').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = () => {
        const html = `<div style="text-align:center;"><img src="${reader.result}" style="width:100px; height:100px; border-radius:10px; border:2px solid #ffd700; margin-bottom:15px;"></div><input type="text" id="newName" placeholder="Unique Parent Name" class="portal-input"><button id="saveP" style="width:100%; background:#ffd700; padding:15px; border-radius:10px; font-weight:bold;">SAVE BREEDER</button>`;
        openPortal("NEW PARENT", html);
        document.getElementById('saveP').onclick = async () => { if(!document.getElementById('newName').value) return; const col = activeG === 'male' ? 'parents_male' : 'parents_female'; await addDoc(collection(db, col), { name: document.getElementById('newName').value, imgData: reader.result }); showToast("✅ Added"); document.getElementById('p-overlay').remove(); };
    };
};

document.getElementById('patchForm').onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const btn = e.target.querySelector('button[type="submit"]'); if(btn) btn.disabled = true;
    const addDays = (d, i) => { let r = new Date(d); r.setDate(r.getDate() + i); return r.toISOString().split('T')[0]; };
    try {
        await addDoc(collection(db, 'chicks'), { hatchDate: fd.get('hatchDate'), cock: fd.get('cockName').trim(), hen: fd.get('henName').trim(), count: Number(fd.get('count')), vac1: addDays(fd.get('hatchDate'), 7), v1Done: false, vac2: addDays(fd.get('hatchDate'), 14), v2Done: false, vac3: addDays(fd.get('hatchDate'), 21), v3Done: false, buyBackIds: [], jobWorkId: null, createdAt: new Date().toISOString() });
        showToast("✅ Batch Added!"); e.target.reset();
    } catch (err) { showToast("❌ Error"); } finally { if(btn) btn.disabled = false; }
};

window.toggleVac = async (id, n, cur) => { const u = {}; u[`v${n}Done`] = !cur; await updateDoc(doc(db, 'chicks', id), u); showToast(!cur ? "✅ Done" : "🔄 Reset"); };
window.archiveBatch = (id) => smartConfirm("Archive?", "Move to backup?", async () => { const s = await getDoc(doc(db, 'chicks', id)); await addDoc(collection(db, 'chicks_backup'), s.data()); await deleteDoc(doc(db, 'chicks', id)); showToast("📁 Archived"); });
window.deleteBatch = (id) => smartConfirm("Delete?", "Remove permanently?", async () => { await deleteDoc(doc(db, 'chicks', id)); showToast("🗑️ Deleted"); });
window.logoutSession = () => signOut(auth);
let lastTap = 0; window.mobileFriendlyDoubleClick = (event, id, n, cur) => { const now = Date.now(); if (now - lastTap < 300) { event.preventDefault(); window.toggleVac(id, n, cur); } lastTap = now; };