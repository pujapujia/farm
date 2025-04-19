// Firebase configuration (hardcoded untuk simpel, nanti pindah ke Vercel env vars)
const firebaseConfig = {
    apiKey: "AIzaSyCTYu51tAUlNS_11gcIA6yzNS1ziUzmglU",
    authDomain: "lfarm-e11ad.firebaseapp.com",
    projectId: "lfarm-e11ad",
    storageBucket: "lfarm-e11ad.firebasestorage.app",
    messagingSenderId: "240256024936",
    appId: "1:240256024936:web:b50a13187c05102c0e56dd",
    measurementId: "G-SYCJT5KJW9"
  };

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// State variables
let isAdmin = false;
let currentUser = '';
let projects = [];
let editingProjectId = null;
let currentUserData = null;
let historyStack = [];
let visitorCount = 0;

// Sanitize input to prevent basic XSS
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Load visitor count and public projects on page load
window.onload = async function () {
    const savedUser = localStorage.getItem('currentUser');
    const savedVisitorCount = localStorage.getItem('visitorCount');
    if (savedVisitorCount) {
        visitorCount = parseInt(savedVisitorCount);
    }
    visitorCount++;
    localStorage.setItem('visitorCount', visitorCount);
    document.getElementById('visitorCounter').textContent = `Visitors: ${visitorCount}`;

    // Load projects from Firestore
    await loadProjects();

    // Display public projects on page load
    await displayPublicProjectsPreview();

    if (savedUser) {
        const q = db.collection('users').where('username', '==', savedUser);
        const userSnapshot = await q.get();
        if (!userSnapshot.empty) {
            const user = userSnapshot.docs[0].data();
            currentUser = user.username;
            isAdmin = user.isAdmin;
            currentUserData = { ...user, id: userSnapshot.docs[0].id };
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('publicProjectsPreview').style.display = 'none';
            document.getElementById('actionsContainer').style.display = 'block';
            document.getElementById('backButton').style.display = 'block';
            document.getElementById('profile').style.display = 'block';
            document.getElementById('logoutButton').style.display = 'block';
            document.getElementById('profileUsername').textContent = currentUser;

            if (currentUser === "admin") {
                document.getElementById('pendingUsersButton').style.display = 'inline-block';
            }

            updateToolsFilterButton();
            historyStack.push('actions');
        }
    }
};

// Function to load projects from Firestore
async function loadProjects() {
    projects = [];
    const snapshot = await db.collection('projects').get();
    snapshot.forEach(doc => {
        projects.push({ id: doc.id, ...doc.data() });
    });
}

// Function to update the Tools filter button state
function updateToolsFilterButton() {
    const toolsBox = document.getElementById('toolsBox');
    if (!currentUserData || !currentUserData.allowedTools) {
        toolsBox.classList.add('disabled');
    } else {
        toolsBox.classList.remove('disabled');
    }
}

// Function to hide all containers
function hideAllContainers() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('registerContainer').style.display = 'none';
    document.getElementById('resetPasswordContainer').style.display = 'none';
    document.getElementById('actionsContainer').style.display = 'none';
    document.getElementById('addProjectForm').style.display = 'none';
    document.getElementById('editProjectForm').style.display = 'none';
    document.getElementById('tutorialContainer').style.display = 'none';
    document.getElementById('typeFilterContainer').style.display = 'none';
    document.getElementById('projectsContainer').style.display = 'none';
    document.getElementById('pendingUsersContainer').style.display = 'none';
    document.getElementById('publicContainer').style.display = 'none';
    document.getElementById('userProjectsContainer').style.display = 'none';
    document.getElementById('publicProjectsPreview').style.display = 'none';
}

// Function to go back to the previous page
function goBack() {
    if (historyStack.length <= 1) {
        return;
    }
    historyStack.pop();
    const previousPage = historyStack[historyStack.length - 1];
    hideAllContainers();
    document.getElementById('backButton').style.display = historyStack.length > 1 ? 'block' : 'none';

    switch (previousPage) {
        case 'login':
            showLogin();
            break;
        case 'register':
            showRegisterForm();
            break;
        case 'forgotPassword':
            showForgotPassword();
            break;
        case 'actions':
            document.getElementById('actionsContainer').style.display = 'block';
            document.getElementById('profile').style.display = 'block';
            document.getElementById('logoutButton').style.display = 'block';
            break;
        case 'addProject':
            showAddProjectForm();
            break;
        case 'editProject':
            document.getElementById('editProjectForm').style.display = 'block';
            break;
        case 'tutorial':
            document.getElementById('tutorialContainer').style.display = 'block';
            break;
        case 'projects':
            showProjects();
            break;
        case 'pendingUsers':
            showPendingUsers();
            break;
        case 'public':
            showPublicProjects();
            break;
        case 'userProjects':
            showUserProjects();
            break;
    }
}

// Function to show login form
function showLogin() {
    hideAllContainers();
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('publicProjectsPreview').style.display = 'block';
    document.getElementById('backButton').style.display = 'none';
    document.getElementById('profile').style.display = 'none';
    document.getElementById('logoutButton').style.display = 'none';
    currentUser = '';
    isAdmin = false;
    currentUserData = null;
    localStorage.removeItem('currentUser');
    historyStack = ['login'];
    displayPublicProjectsPreview();
}

// Function to logout
function logout() {
    showLogin();
    document.getElementById('loginMessage').textContent = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Function to show register form
function showRegisterForm() {
    hideAllContainers();
    document.getElementById('registerContainer').style.display = 'block';
    document.getElementById('publicProjectsPreview').style.display = 'block';
    historyStack.push('register');
    document.getElementById('backButton').style.display = 'block';
}

// Function to show forgot password form
function showForgotPassword() {
    hideAllContainers();
    document.getElementById('resetPasswordContainer').style.display = 'block';
    document.getElementById('publicProjectsPreview').style.display = 'block';
    historyStack.push('forgotPassword');
    document.getElementById('backButton').style.display = 'block';
}

// Function to register
async function register() {
    const username = sanitizeInput(document.getElementById('registerUsername').value);
    const password = document.getElementById('registerPassword').value;

    if (!username || !password) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        // Cek apakah username sudah ada di users
        let q = db.collection('users').where('username', '==', username);
        let snapshot = await q.get();
        if (!snapshot.empty) {
            alert('Username already taken.');
            return;
        }

        // Cek apakah username sudah ada di pendingUsers
        q = db.collection('pendingUsers').where('username', '==', username);
        snapshot = await q.get();
        if (!snapshot.empty) {
            alert('Username already taken.');
            return;
        }

        // Tambahkan ke pendingUsers
        await db.collection('pendingUsers').add({
            username,
            password,
            allowedTools: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Registration successful! Please wait for admin approval.');
        showLogin();
    } catch (error) {
        console.error('Error registering user:', error);
        alert('Registration failed. Please try again.');
    }
}

// Function to reset password
async function resetPassword() {
    const username = sanitizeInput(document.getElementById('resetUsername').value);
    const newPassword = document.getElementById('newPassword').value;

    if (!username || !newPassword) {
        alert('Please fill in all fields.');
        return;
    }

    try {
        const q = db.collection('users').where('username', '==', username);
        const snapshot = await q.get();
        if (snapshot.empty) {
            alert('Username not found.');
            return;
        }

        const userDoc = snapshot.docs[0];
        await db.collection('users').doc(userDoc.id).update({ password: newPassword });
        alert('Password reset successfully! Please login with your new password.');
        showLogin();
    } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password.');
    }
}

// Function to login
async function login() {
    const username = sanitizeInput(document.getElementById('username').value);
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');

    try {
        const q = db.collection('users').where('username', '==', username).where('password', '==', password);
        const snapshot = await q.get();
        if (!snapshot.empty) {
            const user = snapshot.docs[0].data();
            loginMessage.style.color = "lightgreen";
            loginMessage.textContent = "Login successful!";
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('publicProjectsPreview').style.display = 'none';
            document.getElementById('actionsContainer').style.display = 'block';
            isAdmin = user.isAdmin;
            currentUser = username;
            currentUserData = { ...user, id: snapshot.docs[0].id };

            localStorage.setItem('currentUser', currentUser);
            document.getElementById('profile').style.display = 'block';
            document.getElementById('logoutButton').style.display = 'block';
            document.getElementById('profileUsername').textContent = currentUser;
            document.getElementById('backButton').style.display = 'block';

            if (currentUser === "admin") {
                document.getElementById('pendingUsersButton').style.display = 'inline-block';
            }

            updateToolsFilterButton();
            historyStack.push('actions');
        } else {
            loginMessage.style.color = "red";
            loginMessage.textContent = "Incorrect username or password.";
        }
    } catch (error) {
        console.error('Error logging in:', error);
        loginMessage.style.color = "red";
        loginMessage.textContent = "Login failed. Please try again.";
    }
}

// Function to show pending users and approved users (admin only)
async function showPendingUsers() {
    if (!isAdmin) {
        alert('Access denied. Admin only.');
        return;
    }
    hideAllContainers();
    document.getElementById('pendingUsersContainer').style.display = 'block';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('pendingUsers');

    const pendingUsersList = document.getElementById('pendingUsersList');
    pendingUsersList.innerHTML = '';

    try {
        // Ambil pendingUsers
        const pendingSnapshot = await db.collection('pendingUsers').get();
        if (pendingSnapshot.empty) {
            pendingUsersList.innerHTML = '<p>No pending registrations.</p>';
        } else {
            pendingSnapshot.forEach(doc => {
                const user = doc.data();
                const userDiv = document.createElement('div');
                userDiv.classList.add('pending-user');
                userDiv.innerHTML = `
                    <span>${user.username}</span>
                    <div>
                        <button class="button approve-button" onclick="approveUser('${doc.id}')">Approve</button>
                        <button class="button reject-button" onclick="rejectUser('${doc.id}')">Reject</button>
                    </div>
                `;
                pendingUsersList.appendChild(userDiv);
            });
        }

        // Ambil approved users
        const approvedUsersList = document.getElementById('approvedUsersList');
        approvedUsersList.innerHTML = '';
        const q = db.collection('users').where('username', '!=', 'admin');
        const approvedSnapshot = await q.get();
        if (approvedSnapshot.empty) {
            approvedUsersList.innerHTML = '<p>No approved users.</p>';
        } else {
            approvedSnapshot.forEach(doc => {
                const user = doc.data();
                const userDiv = document.createElement('div');
                userDiv.classList.add('approved-user');
                userDiv.innerHTML = `
                    <span>${user.username} (Tools: ${user.allowedTools ? 'Allowed' : 'Not Allowed'})</span>
                    <div>
                        <button class="button approve-button" onclick="toggleToolsAccess('${doc.id}', true)">Allow Tools</button>
                        <button class="button reject-button" onclick="toggleToolsAccess('${doc.id}', false)">Revoke Tools Access</button>
                    </div>
                `;
                approvedUsersList.appendChild(userDiv);
            });
        }
    } catch (error) {
        console.error('Error showing pending users:', error);
        alert('Failed to load users.');
    }
}

// Function to approve a pending user
async function approveUser(pendingUserId) {
    try {
        const pendingDoc = await db.collection('pendingUsers').doc(pendingUserId).get();
        if (!pendingDoc.exists) {
            alert('User not found.');
            return;
        }
        const user = pendingDoc.data();

        // Tambahkan ke users
        await db.collection('users').add({
            username: user.username,
            password: user.password,
            isAdmin: false,
            allowedTools: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Hapus dari pendingUsers
        await db.collection('pendingUsers').doc(pendingUserId).delete();
        alert(`User ${user.username} has been approved!`);
        await showPendingUsers();
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve user.');
    }
}

// Function to reject a pending user
async function rejectUser(pendingUserId) {
    try {
        const pendingDoc = await db.collection('pendingUsers').doc(pendingUserId).get();
        if (!pendingDoc.exists) {
            alert('User not found.');
            return;
        }
        const user = pendingDoc.data();
        await db.collection('pendingUsers').doc(pendingUserId).delete();
        alert(`User ${user.username} has been rejected.`);
        await showPendingUsers();
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('Failed to reject user.');
    }
}

// Function to toggle tools access for approved users
async function toggleToolsAccess(userId, allow) {
    try {
        await db.collection('users').doc(userId).update({ allowedTools: allow });
        if (currentUserData && userId === currentUserData.id) {
            currentUserData.allowedTools = allow;
            updateToolsFilterButton();
        }
        alert(`Tools access has been ${allow ? 'granted' : 'revoked'}.`);
        await showPendingUsers();
    } catch (error) {
        console.error('Error toggling tools access:', error);
        alert('Failed to toggle tools access.');
    }
}

// Function to calculate days running and project status
function calculateDaysAndStatus(project) {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();

    if (project.status === "Ended") {
        return { daysRunning: 0, status: "Ended" };
    }

    if (today > endDate) {
        return { daysRunning: 0, status: "Ended" };
    }

    if (today >= startDate) {
        const daysRunning = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        return { daysRunning, status: "Ongoing" };
    }

    return { daysRunning: 0, status: "Not Started" };
}

// Function to show add project form
function showAddProjectForm() {
    hideAllContainers();
    document.getElementById('addProjectForm').style.display = 'block';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('addProject');
}

// Function to show projects list
async function showProjects() {
    await loadProjects();
    hideAllContainers();
    document.getElementById('projectsContainer').style.display = 'grid';
    document.getElementById('typeFilterContainer').style.display = 'flex';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('projects');
    displayProjects(projects);
}

// Function to show project tutorial
function showTutorial(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    if (project.type === "Tools" && !currentUserData.allowedTools) {
        alert("You are not authorized to view Tools projects. Please contact the admin to get access.");
        return;
    }
    document.getElementById('tutorialProjectName').textContent = project.name;
    document.getElementById('tutorialProjectLink').href = project.link;
    document.getElementById('tutorialDescription').textContent = project.description;

    hideAllContainers();
    document.getElementById('tutorialContainer').style.display = 'block';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('tutorial');
}

// Function to show user projects
async function showUserProjects() {
    await loadProjects();
    hideAllContainers();
    document.getElementById('userProjectsContainer').style.display = 'grid';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('userProjects');

    const userProjectsList = document.getElementById('userProjectsList');
    userProjectsList.innerHTML = '';

    let userProjects = projects.filter(project => project.addedBy === currentUser);

    if (userProjects.length === 0) {
        userProjectsList.innerHTML = '<p>You have not added any projects.</p>';
        return;
    }

    userProjects.forEach(project => {
        const { daysRunning, status } = calculateDaysAndStatus(project);
        project.daysRunning = daysRunning;
        project.status = status;

        const projectBox = document.createElement('div');
        projectBox.classList.add('box');
        if (project.type === "Tools" && !currentUserData.allowedTools) {
            projectBox.classList.add('disabled');
        } else {
            projectBox.onclick = () => showTutorial(project.id);
        }
        let projectDetails = `
            <img src="${project.image}" alt="${project.name}">
            <h3>${project.name}</h3>
            <div class="project-details">
                <div><label>Type:</label><span class="value">${project.type}</span></div>
                <div><label>Link:</label><a href="#" onclick="showTutorial('${project.id}'); return false;" class="value">Project Link</a></div>
                <div><label>Start Date:</label><span class="value">${project.startDate}</span></div>
                <div><label>End Date:</label><span class="value">${project.endDate}</span></div>
                <div><label>Status:</label><span class="value">${project.status}</span></div>
        `;

        if (project.status !== "Ended") {
            projectDetails += `
                <div><label>Running:</label><span class="value">${project.daysRunning} days</span></div>
            `;
        }

        projectDetails += `
                <div><label>Added by:</label><span class="value">${project.addedBy}</span></div>
                <div><label>Public Status:</label><span class="value">${project.approvedByAdmin ? 'Approved' : 'Not Approved'}</span></div>
            </div>
        `;

        projectBox.innerHTML = projectDetails;

        if (isAdmin || project.addedBy === currentUser) {
            projectBox.innerHTML += `
                <button class="button edit-button" onclick="showEditProjectForm('${project.id}')">Edit</button>
            `;
        }

        if (isAdmin) {
            projectBox.innerHTML += `
                <button class="button delete-button" onclick="deleteProject('${project.id}')">Delete</button>
                ${!project.approvedByAdmin ? `<button class="button approve-button" onclick="approveProjectForPublic('${project.id}')">Approve for Public</button>` : `<button class="button reject-button" onclick="revokeProjectApproval('${project.id}')">Revoke Public Approval</button>`}
            `;
        }

        userProjectsList.appendChild(projectBox);
    });
}

// Function to display public projects preview
async function displayPublicProjectsPreview() {
    await loadProjects();
    const publicProjectsList = document.getElementById('publicProjectsList');
    publicProjectsList.innerHTML = '';

    let publicProjects = projects.filter(project => project.approvedByAdmin);

    if (publicProjects.length === 0) {
        publicProjectsList.innerHTML = '<p>No public projects available.</p>';
        return;
    }

    publicProjects.forEach(project => {
        const { daysRunning, status } = calculateDaysAndStatus(project);
        project.daysRunning = daysRunning;
        project.status = status;

        const projectBox = document.createElement('div');
        projectBox.classList.add('box');
        if (project.type === "Tools" && currentUser && !currentUserData.allowedTools) {
            projectBox.classList.add('disabled');
        } else {
            projectBox.onclick = () => {
                if (!currentUser) {
                    alert('Please login or register to view project details.');
                } else {
                    showTutorial(project.id);
                }
            };
        }
        let projectDetails = `
            <img src="${project.image}" alt="${project.name}">
            <h3>${project.name}</h3>
            <div class="project-details">
                <div><label>Type:</label><span class="value">${project.type}</span></div>
                <div><label>Start Date:</label><span class="value">${project.startDate}</span></div>
                <div><label>End Date:</label><span class="value">${project.endDate}</span></div>
                <div><label>Status:</label><span class="value">${project.status}</span></div>
        `;

        if (project.status !== "Ended") {
            projectDetails += `
                <div><label>Running:</label><span class="value">${project.daysRunning} days</span></div>
            `;
        }

        projectDetails += `
                <div><label>Added by:</label><span class="value">${project.addedBy}</span></div>
            </div>
        `;

        projectBox.innerHTML = projectDetails;
        publicProjectsList.appendChild(projectBox);
    });
}

// Function to show public projects
async function showPublicProjects() {
    await loadProjects();
    hideAllContainers();
    document.getElementById('publicContainer').style.display = 'block';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('public');

    const publicProjectsList = document.getElementById('publicProjectsList');
    publicProjectsList.innerHTML = '';

    let publicProjects = projects.filter(project => project.approvedByAdmin);

    if (publicProjects.length === 0) {
        publicProjectsList.innerHTML = '<p>No public projects available.</p>';
        return;
    }

    publicProjects.forEach(project => {
        const { daysRunning, status } = calculateDaysAndStatus(project);
        project.daysRunning = daysRunning;
        project.status = status;

        const projectBox = document.createElement('div');
        projectBox.classList.add('box');
        if (project.type === "Tools" && !currentUserData.allowedTools) {
            projectBox.classList.add('disabled');
        } else {
            projectBox.onclick = () => showTutorial(project.id);
        }
        let projectDetails = `
            <img src="${project.image}" alt="${project.name}">
            <h3>${project.name}</h3>
            <div class="project-details">
                <div><label>Type:</label><span class="value">${project.type}</span></div>
                <div><label>Link:</label><a href="${project.link}" target="_blank" class="value">Project Link</a></div>
                <div><label>Start Date:</label><span class="value">${project.startDate}</span></div>
                <div><label>End Date:</label><span class="value">${project.endDate}</span></div>
                <div><label>Status:</label><span class="value">${project.status}</span></div>
        `;

        if (project.status !== "Ended") {
            projectDetails += `
                <div><label>Running:</label><span class="value">${project.daysRunning} days</span></div>
            `;
        }

        projectDetails += `
                <div><label>Added by:</label><span class="value">${project.addedBy}</span></div>
            </div>
        `;

        projectBox.innerHTML = projectDetails;
        publicProjectsList.appendChild(projectBox);
    });
}

// Function to add a new project
async function addProject() {
    const projectName = sanitizeInput(document.getElementById('projectName').value);
    const projectType = document.getElementById('projectType').value;
    const projectLink = document.getElementById('projectLink').value;
    const projectDescription = sanitizeInput(document.getElementById('projectDescription').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const projectImage = document.getElementById('projectImage').files[0];

    if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate || !projectImage) {
        alert('Please fill in all fields.');
        return;
    }

    if (projectType === "Tools" && !currentUserData.allowedTools) {
        alert("You are not authorized to create Tools projects. Please contact the admin to get access.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async function () {
        try {
            const newProject = {
                name: projectName,
                type: projectType,
                link: projectLink,
                description: projectDescription,
                startDate: startDate,
                endDate: endDate,
                image: reader.result,
                addedBy: currentUser,
                status: "Not Started",
                daysRunning: 0,
                approvedByAdmin: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('projects').add(newProject);
            alert('Project added successfully!');
            showProjects();
        } catch (error) {
            console.error('Error adding project:', error);
            alert('Failed to add project.');
        }
    };

    reader.readAsDataURL(projectImage);
}

// Function to show edit project form
async function showEditProjectForm(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) {
        alert('Project not found.');
        return;
    }
    if (project.type === "Tools" && !currentUserData.allowedTools) {
        alert("You are not authorized to edit Tools projects. Please contact the admin to get access.");
        return;
    }
    editingProjectId = projectId;

    document.getElementById('editProjectName').value = project.name;
    document.getElementById('editProjectType').value = project.type;
    document.getElementById('editProjectLink').value = project.link;
    document.getElementById('editProjectDescription').value = project.description;
    document.getElementById('editStartDate').value = project.startDate;
    document.getElementById('editEndDate').value = project.endDate;
    document.getElementById('editProjectStatus').value = project.status === "Not Started" || project.status === "Ongoing" ? "Berjalan" : "End";

    hideAllContainers();
    document.getElementById('editProjectForm').style.display = 'block';
    document.getElementById('backButton').style.display = 'block';
    historyStack.push('editProject');
}

// Function to save project changes
async function updateProject() {
    const projectName = sanitizeInput(document.getElementById('editProjectName').value);
    const projectType = document.getElementById('editProjectType').value;
    const projectLink = document.getElementById('editProjectLink').value;
    const projectDescription = sanitizeInput(document.getElementById('editProjectDescription').value);
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;
    const projectStatus = document.getElementById('editProjectStatus').value;
    const projectImage = document.getElementById('editProjectImage').files[0];

    if (!projectName || !projectType || !projectLink || !projectDescription || !startDate || !endDate) {
        alert('Please fill in all fields.');
        return;
    }

    if (projectType === "Tools" && !currentUserData.allowedTools) {
        alert("You are not authorized to create or edit Tools projects. Please contact the admin to get access.");
        return;
    }

    try {
        const projectRef = db.collection('projects').doc(editingProjectId);
        const project = projects.find(p => p.id === editingProjectId);

        const updatedProject = {
            name: projectName,
            type: projectType,
            link: projectLink,
            description: projectDescription,
            startDate: startDate,
            endDate: endDate,
            status: projectStatus === "Berjalan" ? "Ongoing" : "Ended",
            image: project.image,
            addedBy: project.addedBy,
            daysRunning: projectStatus === "End" ? 0 : project.daysRunning,
            approvedByAdmin: project.approvedByAdmin,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (projectImage) {
            const reader = new FileReader();
            reader.onloadend = async function () {
                updatedProject.image = reader.result;
                await projectRef.update(updatedProject);
                alert('Project updated successfully!');
                showProjects();
            };
            reader.readAsDataURL(projectImage);
        } else {
            await projectRef.update(updatedProject);
            alert('Project updated successfully!');
            showProjects();
        }
    } catch (error) {
        console.error('Error updating project:', error);
        alert('Failed to update project.');
    }
}

// Function to delete a project (admin only)
async function deleteProject(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await db.collection('projects').doc(projectId).delete();
            alert('Project deleted successfully!');
            showProjects();
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project.');
        }
    }
}

// Function to approve project for public (admin only)
async function approveProjectForPublic(projectId) {
    try {
        await db.collection('projects').doc(projectId).update({ approvedByAdmin: true });
        alert('Project has been approved for public!');
        showProjects();
    } catch (error) {
        console.error('Error approving project:', error);
        alert('Failed to approve project.');
    }
}

// Function to revoke public approval (admin only)
async function revokeProjectApproval(projectId) {
    try {
        await db.collection('projects').doc(projectId).update({ approvedByAdmin: false });
        alert('Public approval for the project has been revoked!');
        showProjects();
    } catch (error) {
        console.error('Error revoking project approval:', error);
        alert('Failed to revoke project approval.');
    }
}

// Function to display projects
function displayProjects(projectsToDisplay) {
    const projectsContainer = document.getElementById('projectsContainer');
    projectsContainer.innerHTML = '';

    projectsToDisplay.forEach(project => {
        const { daysRunning, status } = calculateDaysAndStatus(project);
        project.daysRunning = daysRunning;
        project.status = status;

        const projectBox = document.createElement('div');
        projectBox.classList.add('box');
        if (project.type === "Tools" && !currentUserData.allowedTools) {
            projectBox.classList.add('disabled');
        } else {
            projectBox.onclick = () => showTutorial(project.id);
        }
        let projectDetails = `
            <img src="${project.image}" alt="${project.name}">
            <h3>${project.name}</h3>
            <div class="project-details">
                <div><label>Type:</label><span class="value">${project.type}</span></div>
                <div><label>Link:</label><a href="#" onclick="showTutorial('${project.id}'); return false;" class="value">Project Link</a></div>
                <div><label>Start Date:</label><span class="value">${project.startDate}</span></div>
                <div><label>End Date:</label><span class="value">${project.endDate}</span></div>
                <div><label>Status:</label><span class="value">${project.status}</span></div>
        `;

        if (project.status !== "Ended") {
            projectDetails += `
                <div><label>Running:</label><span class="value">${project.daysRunning} days</span></div>
            `;
        }

        projectDetails += `
                <div><label>Added by:</label><span class="value">${project.addedBy}</span></div>
                <div><label>Public Status:</label><span class="value">${project.approvedByAdmin ? 'Approved' : 'Not Approved'}</span></div>
            </div>
        `;

        projectBox.innerHTML = projectDetails;

        if (isAdmin || project.addedBy === currentUser) {
            projectBox.innerHTML += `
                <button class="button edit-button" onclick="showEditProjectForm('${project.id}')">Edit</button>
            `;
        }

        if (isAdmin) {
            projectBox.innerHTML += `
                <button class="button delete-button" onclick="deleteProject('${project.id}')">Delete</button>
                ${!project.approvedByAdmin ? `<button class="button approve-button" onclick="approveProjectForPublic('${project.id}')">Approve for Public</button>` : `<button class="button reject-button" onclick="revokeProjectApproval('${project.id}')">Revoke Public Approval</button>`}
            `;
        }

        projectsContainer.appendChild(projectBox);
    });
}

// Function to filter projects by type
async function filterProjectsByType(type) {
    await loadProjects();
    let filteredProjects = projects;

    if (type === "Tools" && !currentUserData.allowedTools) {
        alert("You are not authorized to view Tools projects. Please contact the admin to get access.");
        return;
    }

    if (type !== 'all') {
        filteredProjects = projects.filter(project => project.type === type);
    }

    displayProjects(filteredProjects);
}

// Expose functions to global scope
window.register = register;
window.login = login;
window.logout = logout;
window.showRegisterForm = showRegisterForm;
window.showForgotPassword = showForgotPassword;
window.resetPassword = resetPassword;
window.showPendingUsers = showPendingUsers;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.toggleToolsAccess = toggleToolsAccess;
window.showAddProjectForm = showAddProjectForm;
window.showProjects = showProjects;
window.showTutorial = showTutorial;
window.showUserProjects = showUserProjects;
window.displayPublicProjectsPreview = displayPublicProjectsPreview;
window.showPublicProjects = showPublicProjects;
window.addProject = addProject;
window.showEditProjectForm = showEditProjectForm;
window.updateProject = updateProject;
window.deleteProject = deleteProject;
window.approveProjectForPublic = approveProjectForPublic;
window.revokeProjectApproval = revokeProjectApproval;
window.filterProjectsByType = filterProjectsByType;
window.goBack = goBack;