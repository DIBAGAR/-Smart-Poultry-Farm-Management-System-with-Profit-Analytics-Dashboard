import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, deleteDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

const dataTable = document.getElementById('dataTable');
const popup = document.getElementById('popup-center');
const deleteModal = document.getElementById('deleteModal');
let lastTap = 0;

/* =========================================
   1. AUTH & SECURITY
   ========================================= */
onAuthStateChanged(auth, (user) => {
    if (user && allowedUsers.includes(user.email)) {
        document.getElementById('security-check').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        loadArchive();
    } else {
        window.location.replace("login.html");
    }
});

function showMsg(text, isError = false) {
    if(!popup) return;
    popup.innerText = text;
    popup.style.display = "block";
    popup.style.background = isError ? "var(--danger)" : "var(--accent-gold)"; 
    popup.style.color = isError ? "white" : "#000";
    setTimeout(() => { popup.style.display = "none"; }, 3000);
}

window.secureAction = (actionFn) => {
    const now = Date.now();
    if (now - lastTap < 350) { actionFn(); } 
    else { showMsg("Double-tap to confirm!"); }
    lastTap = now;
};

/* =========================================
   2. REFRESH UI (THE FIX FOR DELETE BUTTON)
   ========================================= */
function refreshUI() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const count = checkedBoxes.length;
    const delBtn = document.getElementById('bulkDeleteBtn');
    const countLabel = document.getElementById('selectedCount');

    if (delBtn) {
        // Explicitly setting display to show button
        if (count > 0) {
            delBtn.style.setProperty('display', 'inline-block', 'important');
        } else {
            delBtn.style.setProperty('display', 'none', 'important');
        }
    }
    if (countLabel) countLabel.innerText = count;
}

/* =========================================
   3. DATA RENDERING
   ========================================= */
async function loadArchive(start = null, end = null) {
    try {
        const q = query(collection(db, "chicks_backup"), orderBy("hatchDate", "desc"));
        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (start && end) {
            docs = docs.filter(d => d.hatchDate >= start && d.hatchDate <= end);
        }
        renderTable(docs);
    } catch (e) { showMsg("Load Failed", true); }
}

async function renderTable(data) {
    let rows = "";
    if (data.length === 0) {
        dataTable.innerHTML = "<tr><td colspan='9' style='text-align:center;'>No Records Found</td></tr>";
        refreshUI(); // Hide delete button if no data
        return;
    }

    data.forEach(item => {
        const id = item.id;
        const v = (done) => done ? `<span style="color:var(--success)">✅</span>` : `<span style="color:var(--danger)">❌</span>`;

        rows += `
            <tr style="border-bottom: 1px solid var(--border-glass);">
                <td style="padding:15px;"><input type="checkbox" class="row-checkbox" value="${id}"></td>
                <td>${item.hatchDate}</td>
                <td style="color:var(--accent-primary)"><strong>${item.cock}×${item.hen}</strong></td>
                <td>${item.count || 0}</td>
                <td>${v(item.v1Done)}${v(item.v2Done)}${v(item.v3Done)}</td>
                <td id="wt-${id}" style="color:var(--accent-gold); font-weight:800;">...</td>
                <td id="sqty-${id}" style="color:var(--accent-primary);">...</td>
                <td id="rqty-${id}" style="color:var(--success);">...</td>
                <td>
                    <button onclick="secureAction(() => restoreBatch('${id}'))" class="edit-btn">RESTORE</button>
                </td>
            </tr>`;
        fetchWeights(item);
    });
    dataTable.innerHTML = rows;
    
    // Auto-attach listeners to new checkboxes
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.addEventListener('change', refreshUI);
    });
}

async function fetchWeights(item) {
    let totalBB = 0; let recQty = 0;
    if (item.buyBackIds) { 
        for (let bId of item.buyBackIds) { 
            const bS = await getDoc(doc(db, 'purchase', bId)); 
            if (bS.exists()) {
                totalBB += (Number(bS.data().weight) || 0); 
                recQty += (Number(bS.data().qty) || 0);
            }
        } 
    }
    let totalJW = 0; let sendQty = 0;
    if (item.jobWorkId) { 
        const jS = await getDoc(doc(db, 'sales', item.jobWorkId)); 
        if (jS.exists()) {
            totalJW = (Number(jS.data().weight) || 0); 
            sendQty = (Number(jS.data().qty) || 0);
        }
    }
    const wtEl = document.getElementById(`wt-${item.id}`);
    const sqEl = document.getElementById(`sqty-${item.id}`);
    const rqEl = document.getElementById(`rqty-${item.id}`);
    if(wtEl) wtEl.innerText = (totalBB - totalJW).toFixed(2) + " kg";
    if(sqEl) sqEl.innerText = sendQty;
    if(rqEl) rqEl.innerText = recQty;
}

/* =========================================
   4. FILTERS & EXCEL
   ========================================= */
document.getElementById('clearBtn').onclick = () => {
    document.getElementById('fromDate').value = "";
    document.getElementById('toDate').value = "";
    loadArchive();
    showMsg("Filters Cleared");
};

document.getElementById('filterBtn').onclick = () => {
    const f = document.getElementById('fromDate').value;
    const t = document.getElementById('toDate').value;
    if(!f || !t) return showMsg("Select date range", true);
    
    // Reset selection UI
    const selectAllBox = document.getElementById('selectAll');
    if(selectAllBox) selectAllBox.checked = false;
    
    loadArchive(f, t);
    setTimeout(refreshUI, 500); // Give table time to render then refresh UI
};

/* =========================================
   5. BATCH DELETE & RESTORE
   ========================================= */
document.getElementById('confirmDeleteBtn').onclick = async () => {
    const selectedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const idsToDelete = Array.from(selectedBoxes).map(cb => cb.value);

    try {
        const batch = writeBatch(db);
        idsToDelete.forEach(id => batch.delete(doc(db, "chicks_backup", id)));
        await batch.commit();
        
        deleteModal.style.display = 'none';
        showMsg(`Deleted ${idsToDelete.length} items`, true);
        
        document.getElementById('selectAll').checked = false;
        loadArchive(document.getElementById('fromDate').value || null, document.getElementById('toDate').value || null);
        setTimeout(refreshUI, 500);
    } catch (e) { showMsg("Delete Failed", true); }
};

window.restoreBatch = async (id) => {
    try {
        const ref = doc(db, "chicks_backup", id);
        const snap = await getDoc(ref);
        if(snap.exists()){
            await setDoc(doc(db, "chicks", id), snap.data());
            await deleteDoc(ref);
            showMsg("Restored!");
            loadArchive();
            setTimeout(refreshUI, 500);
        }
    } catch (e) { showMsg("Restore Failed", true); }
};

document.getElementById('selectAll').onchange = (e) => {
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = e.target.checked);
    refreshUI();
};

document.getElementById('bulkDeleteBtn').onclick = () => secureAction(() => {
    document.getElementById('modalCount').innerText = document.querySelectorAll('.row-checkbox:checked').length;
    deleteModal.style.display = 'flex';
});

document.getElementById('cancelDelete').onclick = () => deleteModal.style.display = 'none';
document.getElementById('exportBtn').onclick = () => {
    const wb = XLSX.utils.table_to_book(document.querySelector("table"));
    XLSX.writeFile(wb, "DKS_Archive.xlsx");
};
document.getElementById('logoutBtn').onclick = () => signOut(auth);

// Exporting refreshUI to window to ensure global access
window.refreshUI = refreshUI;