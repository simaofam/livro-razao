/* ============================================================
   LIVRO-RAZÃO — lógica da aplicação
   ============================================================ */

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

let state = {
  month: monthKey(new Date()),
  categoriesExpense: [],
  categoriesSaving: [],
  expenses: [],
  savings: []
};

/* ---------------- utilidades ---------------- */
function monthKey(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function monthLabel(ym){
  const [y,m] = ym.split('-').map(Number);
  return `${MESES[m-1]} de ${y}`;
}
function money(n){
  return (Number(n)||0).toLocaleString('pt-PT',{style:'currency',currency:'EUR'});
}
function prevMonthKey(ym){
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m-2, 1);
  return monthKey(d);
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.add('hidden'), 2600);
}
async function sha256(text){
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ============================================================
   BLOQUEIO / PALAVRA-PASSE
   ============================================================ */
const lockScreen = document.getElementById('lock-screen');
const appEl = document.getElementById('app');
const lockSetup = document.getElementById('lock-setup');
const lockEnter = document.getElementById('lock-enter');
const lockStatus = document.getElementById('lock-status');
const lockError = document.getElementById('lock-error');

async function initAuthAndLock(){
  try{
    await auth.signInAnonymously();
  }catch(e){
    lockStatus.textContent = 'Erro de ligação à Firebase. Verifica js/firebase-config.js.';
    console.error(e);
    return;
  }
  auth.onAuthStateChanged(async (user)=>{
    if(!user) return;
    lockStatus.classList.add('hidden');
    const metaRef = db.collection('meta').doc('app');
    const snap = await metaRef.get();
    if(!snap.exists || !snap.data().passwordHash){
      lockSetup.classList.remove('hidden');
    } else {
      const storedHash = snap.data().passwordHash;
      if(sessionStorage.getItem('unlocked') === storedHash){
        unlockApp();
      } else {
        lockEnter.classList.remove('hidden');
      }
    }
  });
}

document.getElementById('setup-submit').addEventListener('click', async ()=>{
  const p1 = document.getElementById('setup-pass').value;
  const p2 = document.getElementById('setup-pass-confirm').value;
  if(p1.length < 4){ lockError.textContent='A palavra-passe deve ter pelo menos 4 caracteres.'; lockError.classList.remove('hidden'); return; }
  if(p1 !== p2){ lockError.textContent='As palavras-passe não coincidem.'; lockError.classList.remove('hidden'); return; }
  const hash = await sha256(p1);
  await db.collection('meta').doc('app').set({ passwordHash: hash });
  sessionStorage.setItem('unlocked', hash);
  unlockApp();
});

document.getElementById('enter-submit').addEventListener('click', async ()=>{
  const p = document.getElementById('enter-pass').value;
  const hash = await sha256(p);
  const snap = await db.collection('meta').doc('app').get();
  if(snap.exists && snap.data().passwordHash === hash){
    sessionStorage.setItem('unlocked', hash);
    unlockApp();
  } else {
    lockError.textContent = 'Palavra-passe incorreta.';
    lockError.classList.remove('hidden');
  }
});

document.getElementById('lock-btn').addEventListener('click', ()=>{
  sessionStorage.removeItem('unlocked');
  location.reload();
});

function unlockApp(){
  lockScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  lockError.classList.add('hidden');
  startDataListeners();
  populateMonthPicker();
}

/* ============================================================
   NAVEGAÇÃO POR SEPARADORES
   ============================================================ */
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-'+tab.dataset.tab).classList.add('active');
  });
});

/* ============================================================
   SELETOR DE MÊS
   ============================================================ */
function populateMonthPicker(){
  const picker = document.getElementById('month-picker');
  picker.innerHTML = '';
  const now = new Date();
  for(let i=0;i<13;i++){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = monthKey(d);
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = monthLabel(key);
    if(key === state.month) opt.selected = true;
    picker.appendChild(opt);
  }
  picker.addEventListener('change', ()=>{
    state.month = picker.value;
    renderAll();
  });
}

/* ============================================================
   FIRESTORE — LISTENERS EM TEMPO REAL (sincronização entre dispositivos)
   ============================================================ */
function startDataListeners(){
  db.collection('categories').where('type','==','expense').orderBy('name')
    .onSnapshot(snap=>{
      state.categoriesExpense = snap.docs.map(d=>({id:d.id, ...d.data()}));
      renderAll();
    });

  db.collection('categories').where('type','==','saving').orderBy('name')
    .onSnapshot(snap=>{
      state.categoriesSaving = snap.docs.map(d=>({id:d.id, ...d.data()}));
      renderAll();
    });

  db.collection('expenses').orderBy('date','desc')
    .onSnapshot(snap=>{
      state.expenses = snap.docs.map(d=>({id:d.id, ...d.data()}));
      renderAll();
    });

  db.collection('savings').orderBy('date','desc')
    .onSnapshot(snap=>{
      state.savings = snap.docs.map(d=>({id:d.id, ...d.data()}));
      renderAll();
    });
}

/* ============================================================
   CATEGORIAS
   ============================================================ */
document.getElementById('cat-expense-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('cat-expense-name').value.trim();
  const goal = parseFloat(document.getElementById('cat-expense-goal').value) || 0;
  if(!name) return;
  await db.collection('categories').add({name, type:'expense', goal});
  e.target.reset();
  showToast('Categoria de gasto adicionada.');
});

document.getElementById('cat-saving-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = document.getElementById('cat-saving-name').value.trim();
  const goal = parseFloat(document.getElementById('cat-saving-goal').value) || 0;
  if(!name) return;
  await db.collection('categories').add({name, type:'saving', goal});
  e.target.reset();
  showToast('Categoria de poupança adicionada.');
});

async function deleteCategory(id){
  if(!confirm('Remover esta categoria? Os registos existentes mantêm-se mas ficam sem categoria associada.')) return;
  await db.collection('categories').doc(id).delete();
}

function renderCatLists(){
  const elE = document.getElementById('cat-expense-list');
  elE.innerHTML = '';
  state.categoriesExpense.forEach(c=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${c.name}</span><span class="cat-goal">${c.goal? 'meta '+money(c.goal):''}</span>`;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', ()=>deleteCategory(c.id));
    li.appendChild(btn);
    elE.appendChild(li);
  });

  const elS = document.getElementById('cat-saving-list');
  elS.innerHTML = '';
  state.categoriesSaving.forEach(c=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${c.name}</span><span class="cat-goal">${c.goal? 'meta '+money(c.goal):''}</span>`;
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.addEventListener('click', ()=>deleteCategory(c.id));
    li.appendChild(btn);
    elS.appendChild(li);
  });
}

function renderCategorySelects(){
  const expSel = document.getElementById('expense-category');
  expSel.innerHTML = state.categoriesExpense.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  const savSel = document.getElementById('saving-category');
  savSel.innerHTML = state.categoriesSaving.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

/* ============================================================
   GASTOS
   ============================================================ */
document.getElementById('expense-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const date = document.getElementById('expense-date').value;
  const categoryId = document.getElementById('expense-category').value;
  const amount = parseFloat(document.getElementById('expense-amount').value);
  const note = document.getElementById('expense-note').value.trim();
  if(!date || !categoryId || !amount) return;
  await db.collection('expenses').add({ date, categoryId, amount, note, month: date.slice(0,7) });
  e.target.reset();
  document.getElementById('expense-date').value = new Date().toISOString().slice(0,10);
  showToast('Gasto adicionado.');
});

async function deleteExpense(id){
  await db.collection('expenses').doc(id).delete();
}

function renderExpensesTable(){
  const monthExpenses = state.expenses.filter(e=>e.month === state.month);
  const tbody = document.querySelector('#expenses-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  monthExpenses.forEach(e=>{
    total += Number(e.amount)||0;
    const cat = state.categoriesExpense.find(c=>c.id===e.categoryId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date}</td>
      <td class="cat-name">${cat? cat.name : '—'}</td>
      <td>${e.note||''}</td>
      <td class="num">${money(e.amount)}</td>
      <td></td>`;
    const delBtn = document.createElement('button');
    delBtn.className = 'row-delete';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', ()=>deleteExpense(e.id));
    tr.lastElementChild.appendChild(delBtn);
    tbody.appendChild(tr);
  });
  document.getElementById('gastos-total').textContent = money(total);
  document.getElementById('gastos-month-name').textContent = monthLabel(state.month);
}

/* ============================================================
   POUPANÇAS
   ============================================================ */
document.getElementById('saving-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const date = document.getElementById('saving-date').value;
  const categoryId = document.getElementById('saving-category').value;
  const amount = parseFloat(document.getElementById('saving-amount').value);
  if(!date || !categoryId || !amount) return;
  await db.collection('savings').add({ date, categoryId, amount, month: date.slice(0,7) });
  e.target.reset();
  document.getElementById('saving-date').value = new Date().toISOString().slice(0,10);
  showToast('Poupança registada.');
});

async function deleteSaving(id){
  await db.collection('savings').doc(id).delete();
}

function renderSavingsTable(){
  const monthSavings = state.savings.filter(s=>s.month === state.month);
  const tbody = document.querySelector('#savings-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  monthSavings.forEach(s=>{
    total += Number(s.amount)||0;
    const cat = state.categoriesSaving.find(c=>c.id===s.categoryId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.date}</td>
      <td class="cat-name">${cat? cat.name : '—'}</td>
      <td class="num">${money(s.amount)}</td>
      <td></td>`;
    const delBtn = document.createElement('button');
    delBtn.className = 'row-delete';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', ()=>deleteSaving(s.id));
    tr.lastElementChild.appendChild(delBtn);
    tbody.appendChild(tr);
  });
  document.getElementById('poupancas-total').textContent = money(total);
  document.getElementById('poupancas-month-name').textContent = monthLabel(state.month);
}

/* ============================================================
   DASHBOARD
   ============================================================ */
let chartCategories, chartTrend;

function renderStamps(){
  const row = document.getElementById('stamp-row');
  row.innerHTML = '';

  const monthExpenses = state.expenses.filter(e=>e.month === state.month);
  const totalSpent = monthExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalGoal = state.categoriesExpense.reduce((s,c)=>s+Number(c.goal||0),0);
  const monthSavings = state.savings.filter(s=>s.month === state.month);
  const totalSaved = monthSavings.reduce((s,e)=>s+Number(e.amount||0),0);

  const overBudget = totalGoal>0 && totalSpent > totalGoal;

  const stamps = [
    { label:'Total gasto', value: money(totalSpent), status: totalGoal? (overBudget?'over':'ok') : '' },
    { label:'Orçamento definido', value: money(totalGoal), status:'' },
    { label:'Total poupado', value: money(totalSaved), status:'ok' },
  ];

  stamps.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'stamp' + (s.status? ' '+s.status : '');
    div.innerHTML = `<div class="stamp-label">${s.label}</div><div class="stamp-value">${s.value}</div>`;
    if(s.status==='over'){
      const badge = document.createElement('span');
      badge.className='badge';
      badge.textContent='ACIMA DO ORÇAMENTO';
      div.appendChild(badge);
    } else if(s.status==='ok' && s.label==='Total gasto'){
      const badge = document.createElement('span');
      badge.className='badge';
      badge.textContent='DENTRO DO ORÇAMENTO';
      div.appendChild(badge);
    }
    row.appendChild(div);
  });

  // alertas por categoria
  state.categoriesExpense.forEach(c=>{
    if(!c.goal) return;
    const spent = monthExpenses.filter(e=>e.categoryId===c.id).reduce((s,e)=>s+Number(e.amount||0),0);
    if(spent > c.goal){
      showAlertOnce(`over-${c.id}-${state.month}`, `⚠ Ultrapassaste o objetivo em "${c.name}" (${money(spent)} de ${money(c.goal)}).`);
    }
  });
}

const alertedKeys = new Set();
function showAlertOnce(key, msg){
  if(alertedKeys.has(key)) return;
  alertedKeys.add(key);
  showToast(msg);
}

function renderCategoryChart(){
  const monthExpenses = state.expenses.filter(e=>e.month === state.month);
  const totals = state.categoriesExpense.map(c=>({
    name:c.name,
    total: monthExpenses.filter(e=>e.categoryId===c.id).reduce((s,e)=>s+Number(e.amount||0),0)
  })).filter(t=>t.total>0);

  const ctx = document.getElementById('chart-categories').getContext('2d');
  if(chartCategories) chartCategories.destroy();
  chartCategories = new Chart(ctx, {
    type:'doughnut',
    data:{
      labels: totals.map(t=>t.name),
      datasets:[{
        data: totals.map(t=>t.total),
        backgroundColor:['#1F7A5C','#A7822E','#B5432B','#16233F','#2C3B5C','#5B6373','#7C8BAE','#C9A227'],
        borderWidth:0
      }]
    },
    options:{ plugins:{ legend:{ position:'bottom', labels:{ font:{family:"'Inter'", size:11} } } } }
  });
  document.getElementById('dash-month-name').textContent = monthLabel(state.month);
}

function renderTrendChart(){
  const months = [];
  for(let i=5;i>=0;i--){
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    months.push(monthKey(d));
  }
  const spentByMonth = months.map(m=>
    state.expenses.filter(e=>e.month===m).reduce((s,e)=>s+Number(e.amount||0),0)
  );
  const savedByMonth = months.map(m=>
    state.savings.filter(e=>e.month===m).reduce((s,e)=>s+Number(e.amount||0),0)
  );

  const ctx = document.getElementById('chart-trend').getContext('2d');
  if(chartTrend) chartTrend.destroy();
  chartTrend = new Chart(ctx, {
    type:'line',
    data:{
      labels: months.map(m=>monthLabel(m)),
      datasets:[
        { label:'Gastos', data: spentByMonth, borderColor:'#B5432B', backgroundColor:'#B5432B', tension:.3 },
        { label:'Poupanças', data: savedByMonth, borderColor:'#1F7A5C', backgroundColor:'#1F7A5C', tension:.3 }
      ]
    },
    options:{ plugins:{ legend:{ position:'bottom', labels:{ font:{family:"'Inter'", size:11} } } } }
  });
}

function renderCompareTable(){
  const prev = prevMonthKey(state.month);
  const tbody = document.querySelector('#compare-table tbody');
  tbody.innerHTML = '';
  state.categoriesExpense.forEach(c=>{
    const cur = state.expenses.filter(e=>e.categoryId===c.id && e.month===state.month).reduce((s,e)=>s+Number(e.amount||0),0);
    const pr = state.expenses.filter(e=>e.categoryId===c.id && e.month===prev).reduce((s,e)=>s+Number(e.amount||0),0);
    if(cur===0 && pr===0) return;
    const diff = pr>0 ? ((cur-pr)/pr*100) : (cur>0?100:0);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="cat-name">${c.name}</td>
      <td class="num">${money(cur)}</td>
      <td class="num">${money(pr)}</td>
      <td class="num ${diff>0?'variation-up':'variation-down'}">${diff>0?'+':''}${diff.toFixed(0)}%</td>`;
    tbody.appendChild(tr);
  });
}

/* ============================================================
   EXPORTAÇÃO
   ============================================================ */
document.getElementById('export-pdf').addEventListener('click', ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFont('helvetica','bold');
  doc.setFontSize(16);
  doc.text(`Livro-Razão — ${monthLabel(state.month)}`, 14, 18);

  const expenseRows = state.expenses.filter(e=>e.month===state.month).map(e=>{
    const cat = state.categoriesExpense.find(c=>c.id===e.categoryId);
    return [e.date, cat?cat.name:'—', e.note||'', money(e.amount)];
  });
  doc.setFontSize(12);
  doc.text('Gastos', 14, 30);
  doc.autoTable({ startY:34, head:[['Data','Categoria','Nota','Valor']], body: expenseRows, styles:{fontSize:9} });

  const savingRows = state.savings.filter(s=>s.month===state.month).map(s=>{
    const cat = state.categoriesSaving.find(c=>c.id===s.categoryId);
    return [s.date, cat?cat.name:'—', money(s.amount)];
  });
  const y = doc.lastAutoTable.finalY + 12;
  doc.text('Poupanças', 14, y);
  doc.autoTable({ startY:y+4, head:[['Data','Categoria','Valor']], body: savingRows, styles:{fontSize:9} });

  doc.save(`livro-razao-${state.month}.pdf`);
});

document.getElementById('export-excel').addEventListener('click', ()=>{
  const wb = XLSX.utils.book_new();

  const expenseRows = state.expenses.filter(e=>e.month===state.month).map(e=>{
    const cat = state.categoriesExpense.find(c=>c.id===e.categoryId);
    return { Data:e.date, Categoria:cat?cat.name:'—', Nota:e.note||'', Valor:Number(e.amount) };
  });
  const savingRows = state.savings.filter(s=>s.month===state.month).map(s=>{
    const cat = state.categoriesSaving.find(c=>c.id===s.categoryId);
    return { Data:s.date, Categoria:cat?cat.name:'—', Valor:Number(s.amount) };
  });

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), 'Gastos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savingRows), 'Poupanças');
  XLSX.writeFile(wb, `livro-razao-${state.month}.xlsx`);
});

/* ============================================================
   ALTERAR PALAVRA-PASSE
   ============================================================ */
document.getElementById('change-pass-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const newPass = document.getElementById('new-pass').value;
  if(newPass.length < 4){ showToast('A palavra-passe deve ter pelo menos 4 caracteres.'); return; }
  const hash = await sha256(newPass);
  await db.collection('meta').doc('app').set({ passwordHash: hash });
  sessionStorage.setItem('unlocked', hash);
  e.target.reset();
  showToast('Palavra-passe alterada.');
});

/* ============================================================
   RENDER GERAL
   ============================================================ */
function renderAll(){
  document.getElementById('month-label').textContent = monthLabel(state.month);
  renderCategorySelects();
  renderCatLists();
  renderExpensesTable();
  renderSavingsTable();
  renderStamps();
  renderCategoryChart();
  renderTrendChart();
  renderCompareTable();
}

/* ============================================================
   ARRANQUE
   ============================================================ */
document.getElementById('expense-date').value = new Date().toISOString().slice(0,10);
document.getElementById('saving-date').value = new Date().toISOString().slice(0,10);
initAuthAndLock();
