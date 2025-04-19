// Nonaktifkan Metamask untuk hindari error inpage.js
window.ethereum = null;

// Firebase Config (ganti dengan config dari proyek Firebase lfarm-e11ad)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "lfarm-e11ad.firebaseapp.com",
  projectId: "lfarm-e11ad",
  storageBucket: "lfarm-e11ad.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Cek koneksi Firestore
db.collection('users').get().then(snapshot => {
  console.log('Firestore connected, collections size:', snapshot.size);
}).catch(error => {
  console.error('Firestore connection error:', error);
});

// Fungsi Login
window.login = async function login() {
  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginMessage = document.getElementById('loginMessage');
    loginMessage.textContent = '';

    if (!email || !password) {
      loginMessage.textContent = 'Please enter email and password';
      return;
    }

    console.log('Login attempt:', { email });
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    console.log('Firebase Auth user:', user.uid);

    // Ambil data user dari Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      loginMessage.textContent = 'User data not found';
      await auth.signOut();
      return;
    }

    const userData = { id: user.uid, ...userDoc.data() };
    localStorage.setItem('user', JSON.stringify(userData));
    document.getElementById('profileUsername').textContent = userData.username;
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('profile').style.display = 'block';
    document.getElementById('logoutButton').style.display = 'block';
    document.getElementById('actionsContainer').style.display = 'block';
    if (userData.isAdmin) {
      document.getElementById('pendingUsersButton').style.display = 'block';
    }
    window.location.href = userData.isAdmin ? '/admin.html' : '/user.html';
  } catch (error) {
    console.error('Error logging in:', error);
    let message = 'Login failed: ';
    switch (error.code) {
      case 'auth/invalid-email':
        message += 'Invalid email format';
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        message += 'Incorrect email or password';
        break;
      case 'auth/too-many-requests':
        message += 'Too many attempts, try again later';
        break;
      default:
        message += error.message;
    }
    document.getElementById('loginMessage').textContent = message;
  }
};

// Fungsi Logout
window.logout = async function logout() {
  try {
    await auth.signOut();
    localStorage.removeItem('user');
    document.getElementById('profile').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'none';
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('pendingUsersButton').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'block';
    window.location.href = '/';
  } catch (error) {
    console.error('Error logging out:', error);
    alert('Error logging out: ' + error.message);
  }
};

// Fungsi Register
window.register = async function register() {
  try {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const registerMessage = document.getElementById('registerMessage');
    registerMessage.textContent = '';

    if (!username || !email || !password) {
      registerMessage.textContent = 'Please fill all fields';
      return;
    }

    if (username.length < 3) {
      registerMessage.textContent = 'Username must be at least 3 characters';
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      registerMessage.textContent = 'Please enter a valid email';
      return;
    }

    if (password.length < 6) {
      registerMessage.textContent = 'Password must be at least 6 characters';
      return;
    }

    console.log('Register attempt:', { username, email });
    // Tambah ke pendingUsers
    await db.collection('pendingUsers').add({
      username,
      email,
      password,
      isAdmin: false,
      allowedTools: false,
      createdAt: { timestamp: new Date().toISOString() }
    });
    alert('Registration submitted, awaiting admin approval');
    showLogin();
  } catch (error) {
    console.error('Error registering:', error);
    document.getElementById('registerMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Reset Password
window.resetPassword = async function resetPassword() {
  try {
    const email = document.getElementById('resetEmail').value.trim();
    const resetMessage = document.getElementById('resetMessage');
    resetMessage.textContent = '';

    if (!email) {
      resetMessage.textContent = 'Please enter your email';
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      resetMessage.textContent = 'Please enter a valid email';
      return;
    }

    console.log('Reset password attempt:', { email });
    await auth.sendPasswordResetEmail(email);
    alert('Password reset email sent. Check your inbox.');
    showLogin();
  } catch (error) {
    console.error('Error resetting password:', error);
    let message = 'Error: ';
    switch (error.code) {
      case 'auth/invalid-email':
        message += 'Invalid email format';
        break;
      case 'auth/user-not-found':
        message += 'Email not found';
        break;
      default:
        message += error.message;
    }
    document.getElementById('resetMessage').textContent = message;
  }
};

// Fungsi Show/Hide Form
window.showRegisterForm = function showRegisterForm() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('registerContainer').style.display = 'block';
  document.getElementById('resetPasswordContainer').style.display = 'none';
  document.getElementById('loginMessage').textContent = '';
};

window.showForgotPassword = function showForgotPassword() {
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('registerContainer').style.display = 'none';
  document.getElementById('resetPasswordContainer').style.display = 'block';
  document.getElementById('loginMessage').textContent = '';
};

window.showLogin = function showLogin() {
  document.getElementById('loginContainer').style.display = 'block';
  document.getElementById('registerContainer').style.display = 'none';
  document.getElementById('resetPasswordContainer').style.display = 'none';
  document.getElementById('registerMessage').textContent = '';
  document.getElementById('resetMessage').textContent = '';
};

// Fungsi Add Project
window.addProject = async function addProject() {
  try {
    const projectName = document.getElementById('projectName').value.trim();
    const projectType = document.getElementById('projectType').value;
    const projectLink = document.getElementById('projectLink').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const addProjectMessage = document.getElementById('addProjectMessage');
    addProjectMessage.textContent = '';

    const user = auth.currentUser;
    if (!user) {
      addProjectMessage.textContent = 'Please login first';
      showLogin();
      return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      addProjectMessage.textContent = 'User data not found';
      await auth.signOut();
      return;
    }

    const userData = userDoc.data();
    if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate) {
      addProjectMessage.textContent = 'Please fill all fields';
      return;
    }

    if (!projectLink.match(/^https?:\/\/.+/)) {
      addProjectMessage.textContent = 'Please enter a valid URL';
      return;
    }

    const projectData = {
      name: projectName,
      type: projectType,
      link: projectLink,
      description: projectDescription,
      startDate,
      endDate,
      status: 'Berjalan',
      addedBy: userData.username,
      createdAt: { timestamp: new Date().toISOString() }
    };

    await db.collection('projects').add(projectData);
    alert('Project added successfully');
    showProjects();
  } catch (error) {
    console.error('Error adding project:', error);
    document.getElementById('addProjectMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Show Projects
window.showProjects = function showProjects() {
  document.getElementById('actionsContainer').style.display = 'block';
  document.getElementById('addProjectForm').style.display = 'none';
  document.getElementById('editProjectForm').style.display = 'none';
  document.getElementById('tutorialContainer').style.display = 'none';
  document.getElementById('publicContainer').style.display = 'none';
  document.getElementById('userProjectsContainer').style.display = 'none';
  document.getElementById('pendingUsersContainer').style.display = 'none';
  document.getElementById('typeFilterContainer').style.display = 'block';
  document.getElementById('projectsContainer').style.display = 'grid';
  loadProjects();
};

// Fungsi Load Projects
async function loadProjects(type = '') {
  try {
    const projectsContainer = document.getElementById('projectsContainer');
    projectsContainer.innerHTML = '';
    let q = db.collection('projects');
    if (type) {
      q = q.where('type', '==', type);
    }
    const snapshot = await q.get();
    if (snapshot.empty) {
      projectsContainer.innerHTML = '<p>No projects found</p>';
      return;
    }
    snapshot.forEach(doc => {
      const project = doc.data();
      const div = document.createElement('div');
      div.className = 'box';
      div.innerHTML = `
        <h3>${project.name}</h3>
        <div class="project-details">
          <div><label>Type:</label><span class="value">${project.type}</span></div>
          <div><label>Status:</label><span class="value">${project.status}</span></div>
          <div><label>Added By:</label><span class="value">${project.addedBy}</span></div>
        </div>
        <button class="edit-button" onclick="showEditProjectForm('${doc.id}')">Edit</button>
        <button class="delete-button" onclick="deleteProject('${doc.id}')">Delete</button>
        <button class="button" onclick="showTutorial('${doc.id}')">View Tutorial</button>
      `;
      projectsContainer.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    alert('Failed to load projects: ' + error.message);
  }
}

// Fungsi Filter Projects by Type
window.filterProjectsByType = function filterProjectsByType(type) {
  loadProjects(type);
};

// Fungsi Show Edit Project Form
window.showEditProjectForm = async function showEditProjectForm(projectId) {
  try {
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) {
      alert('Project not found');
      return;
    }
    const project = doc.data();
    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectType').value = project.type;
    document.getElementById('editProjectLink').value = project.link;
    document.getElementById('editProjectDescription').value = project.description;
    document.getElementById('editStartDate').value = project.startDate;
    document.getElementById('editEndDate').value = project.endDate;
    document.getElementById('editProjectStatus').value = project.status;
    document.getElementById('editProjectForm').dataset.projectId = projectId;
    document.getElementById('projectsContainer').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'block';
    document.getElementById('editProjectMessage').textContent = '';
  } catch (error) {
    console.error('Error loading project:', error);
    alert('Failed to load project: ' + error.message);
  }
};

// Fungsi Update Project
window.updateProject = async function updateProject() {
  try {
    const projectId = document.getElementById('editProjectForm').dataset.projectId;
    const projectName = document.getElementById('editProjectName').value.trim();
    const projectType = document.getElementById('editProjectType').value;
    const projectLink = document.getElementById('editProjectLink').value.trim();
    const projectDescription = document.getElementById('editProjectDescription').value.trim();
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;
    const status = document.getElementById('editProjectStatus').value;
    const editProjectMessage = document.getElementById('editProjectMessage');
    editProjectMessage.textContent = '';

    if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate) {
      editProjectMessage.textContent = 'Please fill all fields';
      return;
    }

    if (!projectLink.match(/^https?:\/\/.+/)) {
      editProjectMessage.textContent = 'Please enter a valid URL';
      return;
    }

    await db.collection('projects').doc(projectId).update({
      name: projectName,
      type: projectType,
      link: projectLink,
      description: projectDescription,
      startDate,
      endDate,
      status
    });
    alert('Project updated successfully');
    showProjects();
  } catch (error) {
    console.error('Error updating project:', error);
    document.getElementById('editProjectMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Delete Project
window.deleteProject = async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  try {
    await db.collection('projects').doc(projectId).delete();
    alert('Project deleted successfully');
    loadProjects();
  } catch (error) {
    console.error('Error deleting project:', error);
    alert('Error deleting project: ' + error.message);
  }
};

// Fungsi Show Tutorial
window.showTutorial = async function showTutorial(projectId) {
  try {
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) {
      alert('Project not found');
      return;
    }
    const project = doc.data();
    document.getElementById('tutorialProjectName').textContent = project.name;
    document.getElementById('tutorialProjectLink').href = project.link;
    document.getElementById('tutorialProjectLink').textContent = project.link;
    document.getElementById('tutorialDescription').textContent = project.description;
    document.getElementById('projectsContainer').style.display = 'none';
    document.getElementById('tutorialContainer').style.display = 'block';
  } catch (error) {
    console.error('Error loading tutorial:', error);
    alert('Failed to load tutorial: ' + error.message);
  }
};

// Fungsi Show Pending Users
window.showPendingUsers = async function showPendingUsers() {
  try {
    const user = auth.currentUser;
    const manageUsersMessage = document.getElementById('manageUsersMessage');
    manageUsersMessage.textContent = '';

    if (!user) {
      manageUsersMessage.textContent = 'Please login first';
      showLogin();
      return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists || !userDoc.data().isAdmin) {
      console.error('Access denied: Not an admin or user data not found');
      manageUsersMessage.textContent = 'Access denied: Admins only';
      showProjects();
      return;
    }

    console.log('Fetching pending users for admin:', userDoc.data().username);
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('pendingUsersContainer').style.display = 'block';
    const pendingUsersList = document.getElementById('pendingUsersList');
    const approvedUsersList = document.getElementById('approvedUsersList');
    pendingUsersList.innerHTML = '';
    approvedUsersList.innerHTML = '';

    // Load pending users
    const pendingSnapshot = await db.collection('pendingUsers').get();
    console.log('Pending users snapshot size:', pendingSnapshot.size);
    if (pendingSnapshot.empty) {
      pendingUsersList.innerHTML = '<p>No pending users</p>';
    } else {
      pendingSnapshot.forEach(doc => {
        const userData = doc.data();
        const div = document.createElement('div');
        div.className = 'pending-user';
        div.innerHTML = `
          <span>${userData.username} (${userData.email})</span>
          <div>
            <button class="approve-button" onclick="approveUser('${doc.id}')">Approve</button>
            <button class="reject-button" onclick="rejectUser('${doc.id}')">Reject</button>
          </div>
        `;
        pendingUsersList.appendChild(div);
      });
    }

    // Load approved users
    const approvedSnapshot = await db.collection('users').get();
    console.log('Approved users snapshot size:', approvedSnapshot.size);
    if (approvedSnapshot.empty) {
      approvedUsersList.innerHTML = '<p>No approved users</p>';
    } else {
      approvedSnapshot.forEach(doc => {
        const userData = doc.data();
        const div = document.createElement('div');
        div.className = 'approved-user';
        div.innerHTML = `
          <span>${userData.username} (${userData.email})</span>
          <div>
            <button class="button" onclick="toggleToolsAccess('${doc.id}', ${!userData.allowedTools})">
              ${userData.allowedTools ? 'Disable Tools' : 'Enable Tools'}
            </button>
            <button class="remove-button" onclick="removeUser('${doc.id}', '${userData.username}')">Remove</button>
          </div>
        `;
        approvedUsersList.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error showing pending users:', error);
    document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Approve User
window.approveUser = async function approveUser(pendingUserId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      return;
    }

    const adminDoc = await db.collection('users').doc(user.uid).get();
    if (!adminDoc.exists || !adminDoc.data().isAdmin) {
      alert('Access denied: Admins only');
      return;
    }

    const doc = await db.collection('pendingUsers').doc(pendingUserId).get();
    if (!doc.exists) {
      alert('User not found');
      return;
    }

    const userData = doc.data();
    // Buat user di Firebase Authentication
    const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
    const newUser = userCredential.user;

    // Simpan data user ke Firestore
    await db.collection('users').doc(newUser.uid).set({
      username: userData.username,
      email: userData.email,
      isAdmin: false,
      allowedTools: false,
      createdAt: userData.createdAt
    });

    // Hapus dari pendingUsers
    await db.collection('pendingUsers').doc(pendingUserId).delete();
    alert('User approved successfully');
    showPendingUsers();
  } catch (error) {
    console.error('Error approving user:', error);
    document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Reject User
window.rejectUser = async function rejectUser(pendingUserId) {
  if (!confirm('Are you sure you want to reject this user?')) return;
  try {
    await db.collection('pendingUsers').doc(pendingUserId).delete();
    alert('User rejected successfully');
    showPendingUsers();
  } catch (error) {
    console.error('Error rejecting user:', error);
    document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Remove User
window.removeUser = async function removeUser(userId, username) {
  if (!confirm(`Are you sure you want to remove user ${username}? This action cannot be undone.`)) return;
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      return;
    }

    const adminDoc = await db.collection('users').doc(user.uid).get();
    if (!adminDoc.exists || !adminDoc.data().isAdmin) {
      alert('Access denied: Admins only');
      return;
    }

    if (user.uid === userId) {
      alert('You cannot remove your own account');
      return;
    }

    // Hapus data user dari Firestore
    await db.collection('users').doc(userId).delete();
    alert(`User ${username} removed successfully`);

    // Catatan: Menghapus user dari Firebase Authentication memerlukan Admin SDK.
    // Untuk keamanan, kita hanya hapus dari Firestore di sini.
    // Jika ingin hapus dari Auth, gunakan Firebase Admin SDK di backend.
    showPendingUsers();
  } catch (error) {
    console.error('Error removing user:', error);
    document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Toggle Tools Access
window.toggleToolsAccess = async function toggleToolsAccess(userId, allowedTools) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      return;
    }

    const adminDoc = await db.collection('users').doc(user.uid).get();
    if (!adminDoc.exists || !adminDoc.data().isAdmin) {
      alert('Access denied: Admins only');
      return;
    }

    await db.collection('users').doc(userId).update({ allowedTools });
    alert('Tools access updated successfully');
    showPendingUsers();
  } catch (error) {
    console.error('Error updating tools access:', error);
    document.getElementById('manageUsersMessage').textContent = 'Error: ' + error.message;
  }
};

// Fungsi Show User Projects
window.showUserProjects = async function showUserProjects() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('Please login first');
      showLogin();
      return;
    }

    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
      alert('User data not found');
      await auth.signOut();
      return;
    }

    const userData = userDoc.data();
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('userProjectsContainer').style.display = 'block';
    const userProjectsList = document.getElementById('userProjectsList');
    userProjectsList.innerHTML = '';
    const snapshot = await db.collection('projects').where('addedBy', '==', userData.username).get();
    if (snapshot.empty) {
      userProjectsList.innerHTML = '<p>No projects found</p>';
      return;
    }
    snapshot.forEach(doc => {
      const project = doc.data();
      const div = document.createElement('div');
      div.className = 'box';
      div.innerHTML = `
        <h3>${project.name}</h3>
        <div class="project-details">
          <div><label>Type:</label><span class="value">${project.type}</span></div>
          <div><label>Status:</label><span class="value">${project.status}</span></div>
        </div>
        <button class="button" onclick="showTutorial('${doc.id}')">View Tutorial</button>
      `;
      userProjectsList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading user projects:', error);
    alert('Failed to load user projects: ' + error.message);
  }
};

// Fungsi Go Back
window.goBack = function goBack() {
  showProjects();
};

// Fungsi Show Add Project Form
window.showAddProjectForm = function showAddProjectForm() {
  document.getElementById('actionsContainer').style.display = 'none';
  document.getElementById('addProjectForm').style.display = 'block';
  document.getElementById('addProjectMessage').textContent = '';
};

// Load Public Projects on Page Load
async function loadPublicProjects() {
  try {
    const publicProjectsList = document.getElementById('publicProjectsList');
    publicProjectsList.innerHTML = '';
    const snapshot = await db.collection('projects').where('status', '==', 'Berjalan').get();
    if (snapshot.empty) {
      publicProjectsList.innerHTML = '<p>No public projects</p>';
      return;
    }
    snapshot.forEach(doc => {
      const project = doc.data();
      const div = document.createElement('div');
      div.className = 'box';
      div.innerHTML = `
        <h3>${project.name}</h3>
        <div class="project-details">
          <div><label>Type:</label><span class="value">${project.type}</span></div>
          <div><label>Added By:</label><span class="value">${project.addedBy}</span></div>
        </div>
        <button class="button" onclick="showTutorial('${doc.id}')">View Tutorial</button>
      `;
      publicProjectsList.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading public projects:', error);
    alert('Failed to load public projects: ' + error.message);
  }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Cek status autentikasi
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
          console.error('User data not found in Firestore');
          await auth.signOut();
          localStorage.removeItem('user');
          showLogin();
          return;
        }

        const userData = { id: user.uid, ...userDoc.data() };
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User loaded:', userData);
        document.getElementById('profileUsername').textContent = userData.username;
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('profile').style.display = 'block';
        document.getElementById('logoutButton').style.display = 'block';
        document.getElementById('actionsContainer').style.display = 'block';
        if (userData.isAdmin) {
          document.getElementById('pendingUsersButton').style.display = 'block';
        }
      } else {
        console.log('No user signed in');
        localStorage.removeItem('user');
        showLogin();
      }
      loadPublicProjects();
    });
  } catch (error) {
    console.error('Error initializing page:', error);
    alert('Failed to initialize page: ' + error.message);
  }
});