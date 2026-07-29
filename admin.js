const loginScreen = document.getElementById('loginScreen');
const adminScreen = document.getElementById('adminScreen');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

async function init() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAdmin();
  }
}

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Accesso negato: ' + error.message;
    return;
  }
  showAdmin();
};

logoutBtn.onclick = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};

async function showAdmin() {
  loginScreen.style.display = 'none';
  adminScreen.style.display = 'block';
  logoutBtn.style.display = 'inline';
  await loadEmployees();
  await loadTasks();
}

async function loadEmployees() {
  const { data, error } = await supabaseClient.from('employees').select('*').order('sort_order');
  const tbody = document.querySelector('#employeeTable tbody');
  tbody.innerHTML = '';
  if (error) { tbody.innerHTML = `<tr><td colspan="4">Errore: ${error.message}</td></tr>`; return; }

  data.forEach(emp => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = emp.name;

    const codeTd = document.createElement('td');
    const codeInput = document.createElement('input');
    codeInput.type = 'tel';
    codeInput.maxLength = 4;
    codeInput.value = emp.birth_code || '';
    codeInput.className = 'inline-input';
    codeInput.onchange = async () => {
      await supabaseClient.from('employees').update({ birth_code: codeInput.value.trim() }).eq('id', emp.id);
    };
    codeTd.appendChild(codeInput);

    const activeTd = document.createElement('td');
    const activeCb = document.createElement('input');
    activeCb.type = 'checkbox';
    activeCb.checked = emp.active;
    activeCb.onchange = async () => {
      await supabaseClient.from('employees').update({ active: activeCb.checked }).eq('id', emp.id);
    };
    activeTd.appendChild(activeCb);

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Elimina';
    delBtn.className = 'link-btn';
    delBtn.onclick = async () => {
      if (!confirm(`Eliminare definitivamente ${emp.name}? Lo storico dei controlli passati resterà comunque salvato.`)) return;
      const { error } = await supabaseClient.from('employees').delete().eq('id', emp.id);
      if (error) { alert('Errore: ' + error.message); return; }
      await loadEmployees();
    };
    actionTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(codeTd);
    tr.appendChild(activeTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

document.getElementById('newEmployeeForm').onsubmit = async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('newEmpName');
  const codeInput = document.getElementById('newEmpCode');
  const { data: existing } = await supabaseClient.from('employees').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextSort = existing && existing.length ? existing[0].sort_order + 1 : 1;
  const { error } = await supabaseClient.from('employees').insert({
    name: nameInput.value.trim(),
    birth_code: codeInput.value.trim(),
    sort_order: nextSort,
    active: true
  });
  if (error) { alert('Errore: ' + error.message); return; }
  nameInput.value = '';
  codeInput.value = '';
  await loadEmployees();
};

const newTaskSection = document.getElementById('newTaskSection');
const newTaskDay = document.getElementById('newTaskDay');
newTaskSection.onchange = () => {
  newTaskDay.style.display = newTaskSection.value === 'settimanale' ? 'inline-block' : 'none';
};

async function loadTasks() {
  const { data, error } = await supabaseClient.from('tasks').select('*').order('sort_order');
  const tbody = document.querySelector('#taskTable tbody');
  tbody.innerHTML = '';
  if (error) { tbody.innerHTML = `<tr><td colspan="5">Errore: ${error.message}</td></tr>`; return; }

  data.forEach(task => {
    const tr = document.createElement('tr');

    const sectionTd = document.createElement('td');
    sectionTd.textContent = task.section;

    const dayTd = document.createElement('td');
    dayTd.textContent = task.day_of_week || '-';

    const labelTd = document.createElement('td');
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = task.label || '';
    labelInput.className = 'inline-input-wide';
    labelInput.onchange = async () => {
      await supabaseClient.from('tasks').update({ label: labelInput.value.trim() }).eq('id', task.id);
    };
    labelTd.appendChild(labelInput);

    const activeTd = document.createElement('td');
    const activeCb = document.createElement('input');
    activeCb.type = 'checkbox';
    activeCb.checked = task.active;
    activeCb.onchange = async () => {
      await supabaseClient.from('tasks').update({ active: activeCb.checked }).eq('id', task.id);
    };
    activeTd.appendChild(activeCb);

    const actionTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Elimina';
    delBtn.className = 'link-btn';
    delBtn.onclick = async () => {
      if (!confirm(`Eliminare definitivamente "${task.label}"? Lo storico dei controlli passati resterà comunque salvato.`)) return;
      const { error } = await supabaseClient.from('tasks').delete().eq('id', task.id);
      if (error) { alert('Errore: ' + error.message); return; }
      await loadTasks();
    };
    actionTd.appendChild(delBtn);

    tr.appendChild(sectionTd);
    tr.appendChild(dayTd);
    tr.appendChild(labelTd);
    tr.appendChild(activeTd);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

document.getElementById('newTaskForm').onsubmit = async (e) => {
  e.preventDefault();
  const labelInput = document.getElementById('newTaskLabel');
  const section = newTaskSection.value;
  const day = section === 'settimanale' ? newTaskDay.value : null;
  const { data: existing } = await supabaseClient.from('tasks').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextSort = existing && existing.length ? existing[0].sort_order + 1 : 1;
  const { error } = await supabaseClient.from('tasks').insert({
    section,
    day_of_week: day,
    label: labelInput.value.trim(),
    sort_order: nextSort,
    active: true
  });
  if (error) { alert('Errore: ' + error.message); return; }
  labelInput.value = '';
  await loadTasks();
};

init();
