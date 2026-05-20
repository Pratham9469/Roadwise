import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCLqpE2lSlor9X55Cfold-5ozfDp25Sm3s",
    authDomain: "roadwise-eb377.firebaseapp.com",
    projectId: "roadwise-eb377",
    storageBucket: "roadwise-eb377.firebasestorage.app",
    messagingSenderId: "49371864924",
    appId: "1:49371864924:web:ab0815f16a8f3df94deb99"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

let isLoginMode = true;

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "index.html"; // Go to dashboard if already logged in
    }
});

function showError(msg) {
    const err = document.getElementById('error-msg');
    err.innerText = msg;
    err.style.display = 'block';
}

window.toggleMode = () => {
    isLoginMode = !isLoginMode;
    document.getElementById('error-msg').style.display = 'none';
    const title = document.getElementById('form-title');
    const subtitle = document.getElementById('form-subtitle');
    const btn = document.getElementById('submit-btn');
    const toggleContainer = document.getElementById('toggle-container');

    if (isLoginMode) {
        title.innerText = "Welcome Back";
        subtitle.innerText = "Log in to the Civic Maintenance Dashboard";
        btn.innerText = "Sign In";
        toggleContainer.innerHTML = `Don't have an account? <a onclick="toggleMode()">Sign up here</a>`;
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Join the Civic Maintenance Dashboard";
        btn.innerText = "Sign Up";
        toggleContainer.innerHTML = `Already have an account? <a onclick="toggleMode()">Log in here</a>`;
    }
};

window.handleAuth = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('submit-btn');

    try {
        btn.disabled = true;
        btn.innerText = isLoginMode ? "Signing In..." : "Creating Account...";
        document.getElementById('error-msg').style.display = 'none';

        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }

        // Let onAuthStateChanged handle the redirect
    } catch (error) {
        showError(error.message.replace("Firebase: ", ""));
        btn.disabled = false;
        btn.innerText = isLoginMode ? "Sign In" : "Sign Up";
    }
};

window.signInWithGoogle = async () => {
    try {
        document.getElementById('error-msg').style.display = 'none';
        await signInWithPopup(auth, googleProvider);
        // Let onAuthStateChanged handle the redirect
    } catch (error) {
        showError(error.message.replace("Firebase: ", ""));
    }
};

window.togglePasswordVisibility = () => {
    const pwdInput = document.getElementById('password');
    const eyeIconBox = document.getElementById('toggle-password');
    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIconBox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
        pwdInput.type = 'password';
        eyeIconBox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
};