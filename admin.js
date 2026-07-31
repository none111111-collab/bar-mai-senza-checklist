// Conferma dentro la pagina invece del popup nativo confirm(), che su
// alcuni browser mobili non si apre correttamente e blocca l'azione.
function armDeleteButton(btn, onConfirm) {
  let armed = false;
  const originalText = btn.textContent;
  btn.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      btn.textContent = 'Conferma?';
      btn.style.background = 'var(--red)';
      btn.style.color = '#fff';
      setTimeout(() => {
        if (armed) { armed = false; btn.textContent = originalText; btn.style.background = ''; btn.style.color = ''; }
      }, 3000);
      return;
    }
    armed = false;
    btn.disabled = true;
    await onConfirm();
  });
}

const adminScreen = document.getElementById('adminScreen');
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn.onclick = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};

const hoursMonthPicker = document.getElementById('hoursMonthPicker');
function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
hoursMonthPicker.value = currentYearMonth();
hoursMonthPicker.onchange = () => loadEmployees();

async function showAdmin() {
  employeeScreen.style.display = 'none';
  checklistScreen.style.display = 'none';
  adminScreen.style.display = 'block';
  logoutBtn.style.display = 'inline';
  await loadEmployees();
  await loadTasks();
}

async function loadEmployees() {
  const yearMonth = hoursMonthPicker.value || currentYearMonth();
  const { data, error } = await supabaseClient.from('employees').select('*').order('sort_order');
  const { data: hoursRows } = await supabaseClient.from('employee_hours').select('*').eq('year_month', yearMonth);
  const hoursByEmp = {};
  (hoursRows || []).forEach(h => { hoursByEmp[h.employee_id] = h.hours; });

  const tbody = document.querySelector('#employeeTable tbody');
  tbody.innerHTML = '';
  if (error) { tbody.innerHTML = `<tr><td colspan="5">Errore: ${error.message}</td></tr>`; return; }

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

    const hoursTd = document.createElement('td');
    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.step = '0.5';
    hoursInput.min = '0';
    hoursInput.value = hoursByEmp[emp.id] || 0;
    hoursInput.className = 'inline-input';
    hoursInput.onchange = async () => {
      await supabaseClient.from('employee_hours').upsert({
        employee_id: emp.id,
        year_month: yearMonth,
        hours: parseFloat(hoursInput.value) || 0
      }, { onConflict: 'employee_id,year_month' });
    };
    hoursTd.appendChild(hoursInput);

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
    armDeleteButton(delBtn, async () => {
      const { error } = await supabaseClient.from('employees').delete().eq('id', emp.id);
      if (error) { alert('Errore: ' + error.message); return; }
      await loadEmployees();
    });
    actionTd.appendChild(delBtn);

    tr.appendChild(nameTd);
    tr.appendChild(codeTd);
    tr.appendChild(hoursTd);
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
const newTaskDays = document.getElementById('newTaskDays');
newTaskSection.onchange = () => {
  newTaskDays.style.display = newTaskSection.value === 'settimanale' ? 'flex' : 'none';
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
    dayTd.textContent = (task.days_of_week && task.days_of_week.length)
      ? task.days_of_week.map(d => WEEKDAY_LABEL[d] || d).join(', ')
      : '-';

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
    armDeleteButton(delBtn, async () => {
      const { error } = await supabaseClient.from('tasks').delete().eq('id', task.id);
      if (error) { alert('Errore: ' + error.message); return; }
      await loadTasks();
    });
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
  const days = Array.from(newTaskDays.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
  if (section === 'settimanale' && days.length === 0) {
    alert('Seleziona almeno un giorno per una mansione settimanale');
    return;
  }
  const { data: existing } = await supabaseClient.from('tasks').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextSort = existing && existing.length ? existing[0].sort_order + 1 : 1;
  const { error } = await supabaseClient.from('tasks').insert({
    section,
    days_of_week: section === 'settimanale' ? days : null,
    label: labelInput.value.trim(),
    sort_order: nextSort,
    active: true
  });
  if (error) { alert('Errore: ' + error.message); return; }
  labelInput.value = '';
  newTaskDays.querySelectorAll('input[type=checkbox]').forEach(cb => { cb.checked = false; });
  await loadTasks();
};
