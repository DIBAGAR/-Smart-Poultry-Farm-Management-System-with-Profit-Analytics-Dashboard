import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. DATABASE CONFIGURATION
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

// Context Detection
const currentPage = window.location.pathname.split("/").pop() || "index.html";
const collectionName = document.body.getAttribute('data-collection');
let masterData = []; // To hold data for filtering

/* =========================================
   2. SECURITY & ROUTING
   ========================================= */
setPersistence(auth, browserSessionPersistence);

onAuthStateChanged(auth, (user) => {
    const isLoginPath = currentPage === "login.html";

    if (user && allowedUsers.includes(user.email)) {
        if (isLoginPath) {
            window.location.replace("index.html");
        } else {
            const secCheck = document.getElementById('security-check');
            const appContent = document.getElementById('app-content');
            if (secCheck) secCheck.style.display = 'none';
            if (appContent) appContent.style.display = 'block';
            
            // Trigger Page Specific Logic
            if (currentPage === "index.html") runDashboard();
            if (currentPage === "edit.html") runEditLogic();
            if (currentPage === "delete.html") runDeletePageLogic();
            if (collectionName) runUniversalLedger();
        }
    } else {
        if (!isLoginPath) window.location.replace("login.html");
    }
});

/* =========================================
   3. LOGIN LOGIC
   ========================================= */
if (currentPage === "login.html") {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const msg = document.getElementById("loginMsg");
            const userIn = document.getElementById("username").value.trim().toLowerCase();
            const email = userIn.includes("@") ? userIn : userIn + "@gmail.com";
            const pass = document.getElementById("password").value.trim();

            if (msg) msg.innerText = "Verifying Credentials...";
            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                if (msg) msg.innerHTML = `<span style='color:#ff4757'>Access Denied</span>`;
            }
        };
    }
}

/* =========================================
   4. LEDGER & FILTER LOGIC
   ========================================= */
function runUniversalLedger() {
    const dataForm = document.getElementById('dataForm');
    const filterBtn = document.getElementById('filterBtn');

    if (dataForm) {
        dataForm.onsubmit = async (e) => {
            e.preventDefault();
            const entry = Object.fromEntries(new FormData(dataForm).entries());
            if (entry.totalAmount && entry.paidAmount) {
                entry.dueAmount = (parseFloat(entry.totalAmount) - parseFloat(entry.paidAmount)).toFixed(2);
            }
            entry.createdAt = Date.now();
            await addDoc(collection(db, collectionName), entry);
            dataForm.reset();
        };
    }

    onSnapshot(query(collection(db, collectionName), orderBy("date", "desc")), (snap) => {
        masterData = [];
        snap.forEach(doc => masterData.push({ id: doc.id, ...doc.data() }));
        renderTable(masterData);
    });

    if (filterBtn) {
        filterBtn.onclick = () => {
            const from = document.getElementById('fromDate').value;
            const to = document.getElementById('toDate').value;
            if (!from || !to) return alert("Select Date Range");
            const filtered = masterData.filter(d => d.date >= from && d.date <= to);
            renderTable(filtered);
        };
    }
}

function renderTable(dataArray) {
    const dataTable = document.getElementById('dataTable');
    if (!dataTable) return;

    let rows = "", tPrice = 0, tDue = 0, count = 1;
    const isSimple = (collectionName === "food" || collectionName === "medicine");

    dataArray.forEach((d) => {
        const total = parseFloat(d.price || d.totalAmount || 0);
        const itemName = d.medicine || d.product || d.item || '---';
        tPrice += total;

        if (isSimple) {
            rows += `<tr>
                <td>${count++}</td>
                <td>${d.date}</td>
                <td>${itemName}</td>
                <td>${d.qty || '---'}</td>
                <td>₹${total.toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editRecord('${d.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteRecord('${d.id}')">🗑️</button>
                </td>
            </tr>`;
        } else {
            const paid = parseFloat(d.paidAmount || 0);
            const due = total - paid;
            tDue += due;
            rows += `<tr>
                <td>${count++}</td>
                <td>${d.date}</td>
                <td>${itemName}</td>
                <td>${d.qty || '0'}</td>
                <td>${d.weight || '---'}</td>
                <td>${d.party || '---'}</td>
                <td>₹${total.toFixed(2)}</td>
                <td>₹${paid.toFixed(2)}</td>
                <td style="color:#ff4757; font-weight:bold;">₹${due.toFixed(2)}</td>
                <td>
                    <button class="edit-btn" onclick="editRecord('${d.id}')">✏️</button>
                    <button class="delete-btn" onclick="deleteRecord('${d.id}')">🗑️</button>
                </td>
            </tr>`;
        }
    });

    dataTable.innerHTML = rows;
    if (document.getElementById('totalPrice')) document.getElementById('totalPrice').innerText = tPrice.toFixed(2);
    if (document.getElementById('totalDue')) document.getElementById('totalDue').innerText = tDue.toFixed(2);
}

/* =========================================
   5. DASHBOARD & EDIT & DELETE PAGE LOGIC
   ========================================= */
function runDashboard() {
    let totals = { sales: 0, purchase: 0, medicine: 0, food: 0 };
    const calc = () => {
        const net = totals.sales - (totals.purchase + totals.medicine + totals.food);
        const el = document.getElementById('profitAmount');
        if (el) {
            el.innerText = `₹ ${net.toLocaleString('en-IN')}`;
            el.style.color = net >= 0 ? "#00d1b2" : "#ff4757";
        }
    };
    ["sales", "purchase", "medicine", "food"].forEach(col => {
        onSnapshot(collection(db, col), s => {
            totals[col] = s.docs.reduce((a, d) => a + parseFloat(d.data().totalAmount || d.data().price || 0), 0);
            calc();
        });
    });
}

async function runEditLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'), coll = urlParams.get('coll');
    if (!id || !coll) return;
    const snap = await getDoc(doc(db, coll, id));
    if (snap.exists()) {
        const d = snap.data();
        let html = "";
        const keys = ['date', 'medicine', 'product', 'item', 'qty', 'price', 'totalAmount', 'paidAmount', 'party', 'weight'];
        keys.forEach(k => {
            if (d[k] !== undefined) {
                const type = (k === 'date') ? 'date' : (typeof d[k] === 'number' ? 'number' : 'text');
                html += `<label>${k.toUpperCase()}</label><input type="${type}" name="${k}" value="${d[k]}" required>`;
            }
        });
        document.getElementById('formFields').innerHTML = html;
    }
    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault();
        const updated = Object.fromEntries(new FormData(e.target).entries());
        ['price', 'totalAmount', 'paidAmount', 'qty', 'weight'].forEach(k => { if(updated[k]) updated[k] = parseFloat(updated[k]); });
        await updateDoc(doc(db, coll, id), updated);
        window.location.href = `${coll}.html`;
    };
}

async function runDeletePageLogic() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id'), coll = urlParams.get('coll');
    if (!id || !coll) return;
    
    document.getElementById('displayColl').innerText = coll.toUpperCase();
    document.getElementById('finalDeleteBtn').onclick = async () => {
        await deleteDoc(doc(db, coll, id));
        window.location.replace(`${coll}.html`);
    };
}

/* =========================================
   6. GLOBAL ACTIONS
   ========================================= */
window.editRecord = (id) => window.location.href = `edit.html?id=${id}&coll=${collectionName}`;
window.deleteRecord = (id) => window.location.href = `delete.html?id=${id}&coll=${collectionName}`;
window.logoutSession = () => signOut(auth).then(() => window.location.replace("login.html"));

window.exportToExcel = () => {
    const table = document.querySelector("table");
    if(!table || table.rows.length <= 1) return alert("No data");
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${collectionName}_Report.xlsx`);
};