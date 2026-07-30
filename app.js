let currentEmployee = null;
let allTasks = [];

const dateLabel = document.getElementById('dateLabel');
const employeeScreen = document.getElementById('employeeScreen');
const shiftScreen = document.getElementById('shiftScreen');
const checklistScreen = document.getElementById('checklistScreen');
const codeForm = document.getElementById('codeForm');
const codeInput = document.getElementById('codeInput');
const codeError = document.getElementById('codeError');
const shiftForm = document.getElementById('shiftForm');
const shiftStart = document.getElementById('shiftStart');
const shiftEnd = document.getElementById('shiftEnd');
const shiftError = document.getElementById('shiftError');
const switchBtn = document.getElementById('switchEmployeeBtn');
const taskContainer = document.getElementById('taskContainer');

dateLabel.textContent = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

async function init() {
  // Re-verify against the database on every load: never trust a bare id
  // sitting in localStorage without confirming the account is still active,
  // and never store the birth code itself, only the resolved employee id.
  const savedId = localStorage.getItem('employee_id');
  if (savedId) {
    const { data, error } = await supabaseClient
      .from('employees')
      .select('id,name,sort_order')
      .eq('id', savedId)
      .eq('active', true)
      .maybeSingle();
    if (!error && data) { await selectEmployee(data); return; }
    localStorage.removeItem('employee_id');
  }
}

codeForm.onsubmit = async (e) => {
  e.preventDefault();
  codeError.textContent = '';
  const code = codeInput.value.trim();
  if (!code) return;
  try {
    const emp = await fetchEmployeeByCode(code);
    if (!emp) {
      codeError.textContent = 'Codice non riconosciuto';
      codeInput.value = '';
      codeInput.focus();
      return;
    }
    await selectEmployee(emp);
  } catch (err) {
    codeError.textContent = 'Errore: ' + err.message;
  }
};

async function selectEmployee(emp) {
  currentEmployee = emp;
  localStorage.setItem('employee_id', emp.id);
  switchBtn.style.display = 'inline';

  const { data: existingShift } = await supabaseClient
    .from('employee_shifts')
    .select('*')
    .eq('employee_id', emp.id)
    .eq('work_date', todayISO())
    .maybeSingle();

  employeeScreen.style.display = 'none';
  if (existingShift) {
    shiftScreen.style.display = 'none';
    checklistScreen.style.display = 'block';
    await loadChecklist();
  } else {
    checklistScreen.style.display = 'none';
    shiftScreen.style.display = 'block';
    shiftStart.value = '';
    shiftEnd.value = '';
    shiftError.textContent = '';
  }
}

shiftForm.onsubmit = async (e) => {
  e.preventDefault();
  shiftError.textContent = '';
  if (shiftEnd.value <= shiftStart.value) {
    shiftError.textContent = 'L\'orario di fine deve essere dopo quello di inizio';
    return;
  }
  const { error } = await supabaseClient.from('employee_shifts').upsert({
    employee_id: currentEmployee.id,
    work_date: todayISO(),
    start_time: shiftStart.value,
    end_time: shiftEnd.value
  }, { onConflict: 'employee_id,work_date' });
  if (error) { shiftError.textContent = 'Errore: ' + error.message; return; }
  shiftScreen.style.display = 'none';
  checklistScreen.style.display = 'block';
  await loadChecklist();
};

switchBtn.onclick = () => {
  currentEmployee = null;
  localStorage.removeItem('employee_id');
  checklistScreen.style.display = 'none';
  shiftScreen.style.display = 'none';
  employeeScreen.style.display = 'block';
  codeInput.value = '';
  codeError.textContent = '';
  codeInput.focus();
};

async function loadChecklist() {
  allTasks = await fetchTodayTasks();
  const today = todayISO();

  const { data: existingChecks } = await supabaseClient
    .from('checks')
    .select('*')
    .eq('employee_id', currentEmployee.id)
    .eq('check_date', today);

  const checksByTask = {};
  (existingChecks || []).forEach(c => { checksByTask[c.task_id] = c; });

  const sections = ['apertura', 'pranzo', 'chiusura', 'settimanale'];
  taskContainer.innerHTML = '';

  sections.forEach(section => {
    const tasksInSection = allTasks.filter(t => t.section === section);
    if (tasksInSection.length === 0) return;

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = SECTION_LABEL[section];
    taskContainer.appendChild(title);

    tasksInSection.forEach(task => {
      taskContainer.appendChild(renderTaskCard(task, checksByTask[task.id]));
    });
  });
}

function renderTaskCard(task, existing) {
  const card = document.createElement('div');
  card.className = 'task-card';

  const label = document.createElement('div');
  label.className = 'task-label';
  label.textContent = task.label || '(voce senza nome)';
  card.appendChild(label);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const okBtn = document.createElement('button');
  okBtn.className = 'btn-ok';
  okBtn.textContent = 'OK';

  const nonOkBtn = document.createElement('button');
  nonOkBtn.className = 'btn-nonok';
  nonOkBtn.textContent = 'NON OK';

  const reasonInput = document.createElement('input');
  reasonInput.type = 'text';
  reasonInput.className = 'reason-input';
  reasonInput.placeholder = 'Motivo (se non fatta)';
  reasonInput.style.display = 'none';

  const status = document.createElement('div');
  status.className = 'save-status';

  function setActive(value) {
    okBtn.classList.toggle('active', value === 'OK');
    nonOkBtn.classList.toggle('active', value === 'NON OK');
    reasonInput.style.display = value === 'NON OK' ? 'block' : 'none';
  }

  if (existing) {
    setActive(existing.status);
    reasonInput.value = existing.reason || '';
  }

  async function save(statusValue) {
    setActive(statusValue);
    status.textContent = 'salvataggio...';
    const payload = {
      task_id: task.id,
      employee_id: currentEmployee.id,
      check_date: todayISO(),
      status: statusValue,
      reason: statusValue === 'NON OK' ? (reasonInput.value || null) : null
    };
    const { error } = await supabaseClient
      .from('checks')
      .upsert(payload, { onConflict: 'task_id,employee_id,check_date' });
    status.textContent = error ? ('errore: ' + error.message) : 'salvato';
    if (!error) {
      await supabaseClient.from('shifts').upsert({ check_date: todayISO() }, { onConflict: 'check_date' });
    }
  }

  okBtn.onclick = () => save('OK');
  nonOkBtn.onclick = () => save('NON OK');
  reasonInput.onchange = () => { if (nonOkBtn.classList.contains('active')) save('NON OK'); };

  actions.appendChild(okBtn);
  actions.appendChild(nonOkBtn);
  card.appendChild(actions);
  card.appendChild(reasonInput);
  card.appendChild(status);
  return card;
}

init();
