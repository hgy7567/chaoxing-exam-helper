const API = 'http://127.0.0.1:8767/api';
let database = { courses: [], tasks: [], logs: [] };

async function request(url, options = {}) {
  const response = await fetch(API + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error('操作失败：' + response.status);
  return response.json();
}

async function loadData() {
  try {
    database = await request('/data');
    database.courses ||= [];
    database.tasks ||= [];
    database.logs ||= [];

    document.getElementById('courseCount').textContent = database.courses.length;
    document.getElementById('taskCount').textContent = database.tasks.length;
  } catch (error) {
    console.error(error);
  }
}

function element(tag, text, parent) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

function button(parent, text, action) {
  const b = element('button', text, parent);
  b.type = 'button';
  b.style.margin = '5px';
  b.onclick = action;
  return b;
}

function input(parent, placeholder, value = '') {
  const node = element('input', undefined, parent);
  node.placeholder = placeholder;
  node.value = value || '';
  node.style.cssText = 'display:block;width:95%;padding:12px;margin:10px 0;box-sizing:border-box;';
  return node;
}

async function showPage(page) {
  await loadData();

  const box = document.getElementById('pageContent');
  box.innerHTML = '';

  const title = {
    home: '首页',
    courses: '课程管理',
    tasks: '任务管理',
    ai: 'AI学习助手',
    settings: '模型配置',
    logs: '运行日志',
    about: '关于软件'
  }[page] || '首页';

  element('h3', title, box);

  if (page === 'home') {
    element('p', '📚 我的课程：' + database.courses.length, box);
    element('p', '📋 学习任务：' + database.tasks.length, box);
    element('p', '📱 手机本地管理模式', box);
    button(box, '进入课程管理', () => showPage('courses'));
    button(box, '进入任务管理', () => showPage('tasks'));
  }

  if (page === 'courses') renderCourses(box);
  if (page === 'tasks') renderTasks(box);
  if (page === 'ai') renderAI(box);
  if (page === 'settings') renderSettings(box);
  if (page === 'logs') {
    element('p', '系统运行正常', box);
    database.logs.forEach(x => element('p', String(x.message || x), box));
  }
  if (page === 'about') {
    element('p', '超星学习助手 · Android 本地管理版', box);
    element('p', '用于课程整理、学习计划和任务管理。', box);
  }
}

function renderCourses(box) {
  button(box, '＋ 添加课程', () => editCourse());

  database.courses.forEach(course => {
    const card = element('div', undefined, box);
    card.style.cssText = 'padding:14px;margin:12px 0;border:1px solid #888;border-radius:12px;';
    element('h4', '📚 ' + (course.name || '未命名课程'), card);
    element('p', '教师：' + (course.teacher || '未填写'), card);
    element('p', '备注：' + (course.note || '无'), card);
    button(card, '编辑', () => editCourse(course));
    button(card, '删除', () => deleteItem('courses', course.id));
  });
}

async function editCourse(course = null) {
  const name = prompt('课程名称', course?.name || '');
  if (name === null || !name.trim()) return;

  const teacher = prompt('教师名称', course?.teacher || '');
  if (teacher === null) return;

  const note = prompt('课程备注', course?.note || '');
  if (note === null) return;

  const data = { name: name.trim(), teacher, note };

  try {
    if (course) {
      await request('/courses/' + course.id, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } else {
      await request('/courses', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
    await showPage('courses');
  } catch (e) {
    alert(e.message);
  }
}

function renderTasks(box) {
  button(box, '＋ 添加任务', () => editTask());

  database.tasks.forEach(task => {
    const card = element('div', undefined, box);
    card.style.cssText = 'padding:14px;margin:12px 0;border:1px solid #888;border-radius:12px;';
    element('h4', (task.done ? '✅ ' : '📋 ') + (task.name || '未命名任务'), card);
    element('p', '所属课程：' + (task.course || '未指定'), card);
    element('p', '截止日期：' + (task.due || '未设置'), card);

    button(card, task.done ? '标记未完成' : '标记完成', async () => {
      await request('/tasks/' + task.id, {
        method: 'PUT',
        body: JSON.stringify({ done: !task.done })
      });
      showPage('tasks');
    });

    button(card, '编辑', () => editTask(task));
    button(card, '删除', () => deleteItem('tasks', task.id));
  });
}

async function editTask(task = null) {
  const name = prompt('任务名称', task?.name || '');
  if (name === null || !name.trim()) return;

  const course = prompt('所属课程', task?.course || '');
  if (course === null) return;

  const due = prompt('截止日期', task?.due || '');
  if (due === null) return;

  const data = {
    name: name.trim(),
    course,
    due,
    done: task?.done || false
  };

  try {
    await request('/tasks' + (task ? '/' + task.id : ''), {
      method: task ? 'PUT' : 'POST',
      body: JSON.stringify(data)
    });
    await showPage('tasks');
  } catch (e) {
    alert(e.message);
  }
}

async function deleteItem(type, id) {
  if (!confirm('确定删除这条记录吗？')) return;

  try {
    await request('/' + type + '/' + id, { method: 'DELETE' });
    await showPage(type);
  } catch (e) {
    alert(e.message);
  }
}

function renderAI(box) {
  element('p', 'AI学习助手配置', box);
  element('p', 'API Key 仅保存在当前手机浏览器本地。', box);
  renderSettings(box);
}

function renderSettings(box) {
  const inputBox = input(box, '请输入 AI API Key');
  inputBox.type = 'password';
  inputBox.value = localStorage.getItem('ai_key') || '';

  button(box, '保存配置', () => {
    localStorage.setItem('ai_key', inputBox.value);
    alert('配置已保存在本机');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  showPage('home');
});
