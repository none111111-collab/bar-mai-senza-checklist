const datePicker = document.getElementById('datePicker');
datePicker.value = todayISO();
datePicker.onchange = () => loadDashboard(datePicker.value);

let employeesCache = null;
let tasksCache = null;

async function loadDashboard(dateStr) {
  if (!employeesCache) employeesCache = await fetchEmployees();
  if (!tasksCache) tasksCache = await fetchAllTasks();

  const tasksToday = tasksForDate(tasksCache, dateStr);
  const taskIds = tasksToday.map(t => t.id);

  const { data: checks, error } = await supabaseClient
    .from('checks')
    .select('*')
    .eq('check_date', dateStr)
    .in('task_id', taskIds.length ? taskIds : [-1]);

  if (error) { console.error(error); return; }

  renderStats(checks, tasksToday);
  renderTaskTable(checks, tasksToday);
  renderEmployeeTable(checks, employeesCache, tasksToday);
}

function renderStats(checks, tasksToday) {
  const totalAvailable = tasksToday.length * employeesCache.length;
  const okCount = checks.filter(c => c.status === 'OK').length;
  const nonOkCount = checks.filter(c => c.status === 'NON OK').length;
  const compiled = okCount + nonOkCount;
  const pct = compiled === 0 ? '-' : Math.round((okCount / compiled) * 100) + '%';

  document.getElementById('statCompilati').textContent = compiled;
  document.getElementById('statDisponibili').textContent = totalAvailable;
  document.getElementById('statOk').textContent = okCount;
  document.getElementById('statNonOk').textContent = nonOkCount;
  document.getElementById('statPct').textContent = pct;
}

function renderTaskTable(checks, tasksToday) {
  const tbody = document.querySelector('#taskTable tbody');
  tbody.innerHTML = '';
  tasksToday.forEach(task => {
    const rowsForTask = checks.filter(c => c.task_id === task.id);
    const ok = rowsForTask.filter(c => c.status === 'OK').length;
    const nonOk = rowsForTask.filter(c => c.status === 'NON OK').length;
    const pct = (ok + nonOk) === 0 ? '-' : Math.round((ok / (ok + nonOk)) * 100) + '%';
    const reasons = rowsForTask.filter(c => c.status === 'NON OK' && c.reason).map(c => c.reason).join('; ');

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${task.label || '(voce senza nome)'}</td>
      <td class="pill-ok">${ok}</td>
      <td class="pill-nonok">${nonOk}</td>
      <td>${pct}</td>
      <td>${reasons || ''}</td>`;
    tbody.appendChild(tr);
  });
}

function renderEmployeeTable(checks, employees, tasksToday) {
  const tbody = document.querySelector('#empTable tbody');
  tbody.innerHTML = '';

  const rows = employees.map(emp => {
    const rowsForEmp = checks.filter(c => c.employee_id === emp.id);
    const ok = rowsForEmp.filter(c => c.status === 'OK').length;
    const nonOk = rowsForEmp.filter(c => c.status === 'NON OK').length;
    const compiled = ok + nonOk;
    const pct = compiled === 0 ? -1 : Math.round((ok / compiled) * 100);
    return { name: emp.name, compiled, ok, nonOk, pct };
  });

  const ranked = [...rows].sort((a, b) => b.compiled - a.compiled);
  const rankOf = {};
  ranked.forEach((r, i) => { rankOf[r.name] = i + 1; });

  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.name}</td>
      <td>${r.compiled}</td>
      <td class="pill-ok">${r.ok}</td>
      <td class="pill-nonok">${r.nonOk}</td>
      <td>${r.pct < 0 ? '-' : r.pct + '%'}</td>
      <td>${rankOf[r.name]}&deg;</td>`;
    tbody.appendChild(tr);
  });
}

// Aggiornamento in tempo reale: quando qualcuno salva una voce, la dashboard si aggiorna da sola
supabaseClient
  .channel('checks-live')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'checks' }, () => {
    loadDashboard(datePicker.value);
  })
  .subscribe();

loadDashboard(datePicker.value);
