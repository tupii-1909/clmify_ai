// Calmify AI Premium Dashboard & Remedy Controller

const API_BASE = "http://localhost:5000/api";
let currentYear = 2026;
let currentMonth = 5; // May (1-indexed)
let selectedDateStr = ""; // YYYY-MM-DD format
let monthLogs = {}; // Stores logs for the current active month, keyed by date string
let isDbConnected = false;
let currentUser = null;
let stressChartInstance = null;

// Monthly Names Array
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// --- 1. DOM SELECTORS ---
// Navigation Sidebar Buttons
const navCalendar = document.getElementById("navCalendar");
const navRemedy = document.getElementById("navRemedy");
const navAITherapist = document.getElementById("navAITherapist");
const navStressGraph = document.getElementById("navStressGraph");
const navSettings = document.getElementById("navSettings");

// Primary Page Views
const insightsView = document.getElementById("insightsView");
const remedyView = document.getElementById("remedyView");
const timerView = document.getElementById("timerView");
const settingsView = document.getElementById("settingsView");
const stressGraphView = document.getElementById("stressGraphView");

// Calendar View Elements
const monthYearDisplay = document.getElementById("monthYearDisplay");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const calendarGrid = document.getElementById("calendarGrid");
const dbStatus = document.getElementById("dbStatus");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const symptomsInput = document.getElementById("symptomsInput");
const notesInput = document.getElementById("notesInput");
const sleepSlider = document.getElementById("sleepSlider");
const sleepDisplayValue = document.getElementById("sleepDisplayValue");
const sleepProgressBar = document.getElementById("sleepProgressBar");
const hrvSlider = document.getElementById("hrvSlider");
const hrvDisplayValue = document.getElementById("hrvDisplayValue");
const hrvProgressBar = document.getElementById("hrvProgressBar");
const saveLogBtn = document.getElementById("saveLogBtn");
const harmonyScoreDisplay = document.getElementById("harmonyScore");
const monthlyFlowDescDisplay = document.getElementById("monthlyFlowDesc");
const guidedMomentDesc = document.getElementById("guidedMomentDesc");

// Sidebar Profile Elena Vance Button
const profileBtn = document.getElementById("profileBtn");

// --- 2. BREATHING TIMER STATE VARIABLES ---
let selectedTechnique = "box"; // "box", "478", "balanced"
let selectedDuration = 600; // default 10 minutes (600 seconds)
let timerRemainingSeconds = 600;
let breathingElapsedSeconds = 0;
let mainTimerInterval = null;
let isTimerRunning = false;
let audioContext = null; // Web Audio API Context for beeps

// Timer Elements
const timerMinutesSeconds = document.getElementById("timerMinutesSeconds");
const timerPhaseStatus = document.getElementById("timerPhaseStatus");
const timerPulsingGlow = document.getElementById("timerPulsingGlow");
const btnStartBreathingTimer = document.getElementById("btnStartBreathingTimer");
const timerBackBtn = document.getElementById("timerBackBtn");
const timerTechList = document.getElementById("timerTechList");
const timerDurList = document.getElementById("timerDurList");

// --- 3. INITIALIZE APPLICATION ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Dynamic Header Date info
    initHeaderDate();

    // 2. Set default load date (May 2026)
    currentYear = 2026;
    currentMonth = 5;
    selectedDateStr = "2026-05-25";

    updateMonthHeaderDisplay();

    // --- AUTHENTICATION STATE & FORM HANDLERS ---
    const landingLoginContainer = document.getElementById("landingLoginContainer");
    const appDashboard = document.getElementById("appDashboard");
    const signUpView = document.getElementById("signUpView");
    const signInView = document.getElementById("signInView");
    const headerAuthToggleBtn = document.getElementById("headerAuthToggleBtn");
    const switchToSignInBtn = document.getElementById("switchToSignInBtn");
    const switchToSignUpBtn = document.getElementById("switchToSignUpBtn");
    const signUpForm = document.getElementById("signUpForm");
    const signInForm = document.getElementById("signInForm");
    const navSignOut = document.getElementById("navSignOut");

    // Toggle to Sign In
    function showSignIn() {
        signUpView.classList.remove("active");
        signInView.classList.add("active");
        if (headerAuthToggleBtn) {
            headerAuthToggleBtn.innerText = "Sign Up";
        }
    }

    // Toggle to Sign Up
    function showSignUp() {
        signInView.classList.remove("active");
        signUpView.classList.add("active");
        if (headerAuthToggleBtn) {
            headerAuthToggleBtn.innerText = "Sign In";
        }
    }

    if (switchToSignInBtn) {
        switchToSignInBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showSignIn();
        });
    }

    if (switchToSignUpBtn) {
        switchToSignUpBtn.addEventListener("click", (e) => {
            e.preventDefault();
            showSignUp();
        });
    }

    if (headerAuthToggleBtn) {
        headerAuthToggleBtn.addEventListener("click", () => {
            if (signUpView.classList.contains("active")) {
                showSignIn();
            } else {
                showSignUp();
            }
        });
    }

    // Handle Sign Up Submission
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = signUpForm.querySelector(".btn-enter-sanctuary");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Entering Sanctuary...";
            submitBtn.disabled = true;

            const name = document.getElementById("signUpName").value.trim();
            const age = parseInt(document.getElementById("signUpAge").value.trim());
            const profession = document.getElementById("signUpProfession").value.trim();
            const contact = document.getElementById("signUpContact").value.trim();
            const email = document.getElementById("signUpEmail").value.trim().toLowerCase();
            const password = document.getElementById("signUpPassword").value;

            const payload = {
                full_name: name,
                age: age,
                profession: profession,
                contact_number: contact,
                email: email,
                password: password
            };

            let success = false;
            let userData = null;

            if (isDbConnected) {
                try {
                    const response = await fetch(`${API_BASE}/users/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const resData = await response.json();
                    if (response.ok && resData.success) {
                        success = true;
                        userData = resData.user;
                    } else {
                        alert(resData.error || "Registration failed");
                    }
                } catch (err) {
                    console.error("Register API error, falling back to local storage", err);
                }
            }

            // Fallback to local storage
            if (!success && !isDbConnected) {
                try {
                    // Check if email already exists locally
                    const existingUser = localStorage.getItem(`user_${email}`);
                    if (existingUser) {
                        alert("Email address already registered");
                    } else {
                        userData = {
                            full_name: name,
                            age: age,
                            profession: profession,
                            contact_number: contact,
                            email: email,
                            password_plain: password // store plain for local mock auth
                        };
                        localStorage.setItem(`user_${email}`, JSON.stringify(userData));
                        success = true;
                    }
                } catch (err) {
                    console.error("Local register error", err);
                    alert("An error occurred during local registration");
                }
            }

            submitBtn.innerText = originalText;
            submitBtn.disabled = false;

            if (success && userData) {
                delete userData.password_plain;
                currentUser = userData;
                localStorage.setItem("calmify_user", JSON.stringify(currentUser));
                
                // Show dashboard
                landingLoginContainer.style.display = "none";
                appDashboard.style.display = "grid";
                
                // Clear form
                signUpForm.reset();
                
                updateSidebarUserProfile();
                loadMonthLogs();
            }
        });
    }

    // Handle Sign In Submission
    if (signInForm) {
        signInForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitBtn = signInForm.querySelector(".btn-enter-sanctuary");
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "Verifying...";
            submitBtn.disabled = true;

            const email = document.getElementById("signInEmail").value.trim().toLowerCase();
            const password = document.getElementById("signInPassword").value;

            const payload = {
                email: email,
                password: password
            };

            let success = false;
            let userData = null;

            if (isDbConnected) {
                try {
                    const response = await fetch(`${API_BASE}/users/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const resData = await response.json();
                    if (response.ok && resData.success) {
                        success = true;
                        userData = resData.user;
                    } else {
                        alert(resData.error || "Login failed");
                    }
                } catch (err) {
                    console.error("Login API error, falling back to local storage", err);
                }
            }

            // Fallback to local storage
            if (!success && !isDbConnected) {
                try {
                    const storedUserStr = localStorage.getItem(`user_${email}`);
                    if (storedUserStr) {
                        const storedUser = JSON.parse(storedUserStr);
                        if (storedUser.password_plain === password) {
                            success = true;
                            userData = storedUser;
                        } else {
                            alert("Invalid email address or password");
                        }
                    } else {
                        // Create a default demo user for offline ease of use
                        if (email === "evelyn@serenity.com" && password === "password") {
                            userData = {
                                full_name: "Evelyn Thorne",
                                age: 28,
                                profession: "Creative Director",
                                contact_number: "+1 (555) 000-0000",
                                email: "evelyn@serenity.com"
                            };
                            localStorage.setItem("user_evelyn@serenity.com", JSON.stringify({ ...userData, password_plain: "password" }));
                            success = true;
                        } else {
                            alert("Invalid email address or password. (For offline demo, use: evelyn@serenity.com / password)");
                        }
                    }
                } catch (err) {
                    console.error("Local login error", err);
                    alert("An error occurred during local authentication");
                }
            }

            submitBtn.innerText = originalText;
            submitBtn.disabled = false;

            if (success && userData) {
                delete userData.password_plain;
                currentUser = userData;
                localStorage.setItem("calmify_user", JSON.stringify(currentUser));
                
                // Show dashboard
                landingLoginContainer.style.display = "none";
                appDashboard.style.display = "grid";
                
                // Clear form
                signInForm.reset();
                
                updateSidebarUserProfile();
                loadMonthLogs();
            }
        });
    }

    // Handle Sign Out
    if (navSignOut) {
        navSignOut.addEventListener("click", () => {
            currentUser = null;
            localStorage.removeItem("calmify_user");
            
            // Hide dashboard, show login
            appDashboard.style.display = "none";
            landingLoginContainer.style.display = "flex";
            
            // Default to Sign In screen
            showSignIn();
        });
    }

    // Initial session verify
    const storedUser = localStorage.getItem("calmify_user");
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            updateSidebarUserProfile();
            
            landingLoginContainer.style.display = "none";
            appDashboard.style.display = "grid";
            
            checkBackendConnection().then(() => {
                loadMonthLogs();
            });
        } catch (err) {
            console.error("Failed to parse stored user session", err);
            localStorage.removeItem("calmify_user");
            landingLoginContainer.style.display = "flex";
            appDashboard.style.display = "none";
            checkBackendConnection();
        }
    } else {
        landingLoginContainer.style.display = "flex";
        appDashboard.style.display = "none";
        // Default view inside landing login
        showSignIn();
        checkBackendConnection();
    }

    // 3. EVENT LISTENERS
    
    // Month Nav Arrows
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener("click", () => {
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
            selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            updateMonthHeaderDisplay();
            loadMonthLogs();
        });
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener("click", () => {
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
            selectedDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
            updateMonthHeaderDisplay();
            loadMonthLogs();
        });
    }

    // Sleep slider listener
    if (sleepSlider) {
        sleepSlider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            const hours = Math.floor(val / 60);
            const mins = val % 60;
            sleepDisplayValue.innerText = `${hours}h ${mins}m`;
            const pct = Math.min((val / 480) * 100, 100);
            sleepProgressBar.style.width = `${pct}%`;
        });
    }

    // HRV slider listener
    if (hrvSlider) {
        hrvSlider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            hrvDisplayValue.innerText = `${val}ms`;
            const pct = Math.min(((val - 20) / 130) * 100, 100);
            hrvProgressBar.style.width = `${pct}%`;
        });
    }

    // Save reflection log button
    if (saveLogBtn) {
        saveLogBtn.addEventListener("click", () => {
            saveCurrentLog();
        });
    }

    // TAB VIEW ROUTING SYSTEM (Sidebar Buttons)
    const sidebarNavItems = document.querySelectorAll(".sidebar-nav .nav-item");
    
    if (navCalendar) {
        navCalendar.addEventListener("click", () => {
            sidebarNavItems.forEach(n => n.classList.remove("active"));
            navCalendar.classList.add("active");
            
            // Show Insights View, Hide others
            insightsView.style.display = "block";
            remedyView.style.display = "none";
            if (settingsView) settingsView.style.display = "none";
            if (stressGraphView) stressGraphView.style.display = "none";
            
            // Reset Search Placeholder
            document.getElementById("dashboardSearch").placeholder = "Search sessions or logs...";
        });
    }

    if (navRemedy) {
        navRemedy.addEventListener("click", () => {
            sidebarNavItems.forEach(n => n.classList.remove("active"));
            navRemedy.classList.add("active");
            
            // Show Remedy View, Hide others
            insightsView.style.display = "none";
            remedyView.style.display = "block";
            if (settingsView) settingsView.style.display = "none";
            if (stressGraphView) stressGraphView.style.display = "none";
            
            // Change Search Placeholder
            document.getElementById("dashboardSearch").placeholder = "Search soundscapes...";
        });
    }

    if (navSettings) {
        navSettings.addEventListener("click", () => {
            sidebarNavItems.forEach(n => n.classList.remove("active"));
            navSettings.classList.add("active");
            
            // Show Settings View, Hide others
            insightsView.style.display = "none";
            remedyView.style.display = "none";
            if (timerView) timerView.style.display = "none";
            if (settingsView) {
                settingsView.style.display = "block";
                initSettingsView();
            }
            if (stressGraphView) stressGraphView.style.display = "none";
            
            // Change Search Placeholder
            document.getElementById("dashboardSearch").placeholder = "Search settings...";
        });
    }

    if (navStressGraph) {
        navStressGraph.addEventListener("click", () => {
            sidebarNavItems.forEach(n => n.classList.remove("active"));
            navStressGraph.classList.add("active");
            
            // Show Stress Graph View, Hide others
            insightsView.style.display = "none";
            remedyView.style.display = "none";
            if (settingsView) settingsView.style.display = "none";
            if (timerView) timerView.style.display = "none";
            if (stressGraphView) {
                stressGraphView.style.display = "block";
                loadAndRenderStressGraph();
            }
            
            // Change Search Placeholder
            document.getElementById("dashboardSearch").placeholder = "Search stress trends...";
        });
    }

    // Settings Sub-Tabs Navigation
    const btnSettingsConnectivity = document.getElementById("btnSettingsConnectivity");
    const btnSettingsEmergency = document.getElementById("btnSettingsEmergency");
    const settingsConnectivityPanel = document.getElementById("settingsConnectivityPanel");
    const settingsEmergencyPanel = document.getElementById("settingsEmergencyPanel");

    if (btnSettingsConnectivity && btnSettingsEmergency) {
        btnSettingsConnectivity.addEventListener("click", () => {
            btnSettingsConnectivity.classList.add("active");
            btnSettingsEmergency.classList.remove("active");
            if (settingsConnectivityPanel) settingsConnectivityPanel.style.display = "flex";
            if (settingsEmergencyPanel) settingsEmergencyPanel.style.display = "none";
        });

        btnSettingsEmergency.addEventListener("click", () => {
            btnSettingsEmergency.classList.add("active");
            btnSettingsConnectivity.classList.remove("active");
            if (settingsEmergencyPanel) settingsEmergencyPanel.style.display = "flex";
            if (settingsConnectivityPanel) settingsConnectivityPanel.style.display = "none";
            fetchEmergencyContacts();
        });
    }

    // Bluetooth Switch Listener
    const bluetoothSwitch = document.getElementById("bluetoothSwitch");
    if (bluetoothSwitch) {
        bluetoothSwitch.addEventListener("change", (e) => {
            handleBluetoothToggle(e.target.checked);
        });
    }

    // Connect ESP32 Button Listener
    const btnConnectESP = document.getElementById("btnConnectESP");
    if (btnConnectESP) {
        btnConnectESP.addEventListener("click", () => {
            handleESP32Connect();
        });
    }

    // Add Emergency Contact Form Listener
    const addContactForm = document.getElementById("addContactForm");
    if (addContactForm) {
        addContactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleContactSubmit();
        });
    }

    // Alerts for coming soon sidebar tabs
    const handleComingSoonTab = (btn, name) => {
        if (btn) {
            btn.addEventListener("click", () => {
                alert(`The premium ${name} feature is coming soon to Calmify AI!`);
            });
        }
    };
    if (navAITherapist) {
        navAITherapist.addEventListener("click", () => {
            window.open("https://cdn.botpress.cloud/webchat/v3.6/shareable.html?configUrl=https://files.bpcontent.cloud/2026/02/02/13/20260202135910-50T3Z3K1.json", "_blank");
        });
    }

    // Profile Capsule click handler
    if (profileBtn) {
        profileBtn.addEventListener("click", () => {
            if (currentUser) {
                alert(`Calmify AI Profile Menu\n\nName: ${currentUser.full_name}\nAge: ${currentUser.age}\nProfession: ${currentUser.profession}\nContact: ${currentUser.contact_number}\nEmail: ${currentUser.email}\n\nRunning in ${isDbConnected ? 'MySQL Database Mode' : 'Local Storage Mode'}.`);
            } else {
                alert("Calmify AI Profile Menu\nUser details and database configuration are active.");
            }
        });
    }

    // View Journal Entries action click
    const viewJournalLink = document.getElementById("viewJournalLink");
    if (viewJournalLink) {
        viewJournalLink.addEventListener("click", (e) => {
            e.preventDefault();
            const log = monthLogs[selectedDateStr];
            if (log && log.notes) {
                alert(`Journal entry for ${selectedDateStr}:\n\nPhysical Symptoms: ${log.symptoms || 'None logged'}\nNotes: ${log.notes}`);
            } else {
                alert(`No detailed notes logged for ${selectedDateStr}. Log an evening note below to get started!`);
            }
        });
    }

    // --- 4. REMEDY SCREEN USER FLOW HANDLERS ---
    
    // Play/Pause mock audio soundscape player controls
    const playPauseBtn = document.getElementById("playerPlayPauseBtn");
    const progressFill = document.getElementById("playerProgressFill");
    const elapsedLabel = document.getElementById("playerTimeElapsed");
    let isPlayingSoundscape = false;
    let soundscapeProgressInterval = null;
    let soundscapeElapsedSeconds = 12 * 60 + 45; // Starts at 12:45 as shown in visual

    if (playPauseBtn) {
        playPauseBtn.addEventListener("click", () => {
            const playIcon = playPauseBtn.querySelector("i");
            if (isPlayingSoundscape) {
                // Pause it
                isPlayingSoundscape = false;
                playIcon.className = "fa-solid fa-circle-play";
                clearInterval(soundscapeProgressInterval);
            } else {
                // Play it
                isPlayingSoundscape = true;
                playIcon.className = "fa-solid fa-circle-pause";
                
                // Animate progress fill bar dynamically
                soundscapeProgressInterval = setInterval(() => {
                    soundscapeElapsedSeconds++;
                    const progressPct = (soundscapeElapsedSeconds / (45 * 60)) * 100;
                    if (progressFill) progressFill.style.width = `${progressPct}%`;
                    
                    const m = Math.floor(soundscapeElapsedSeconds / 60);
                    const s = soundscapeElapsedSeconds % 60;
                    if (elapsedLabel) elapsedLabel.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    
                    if (soundscapeElapsedSeconds >= 45 * 60) {
                        clearInterval(soundscapeProgressInterval);
                    }
                }, 1000);
            }
        });
    }

    // Action clicks inside the "Quiet Your Mind" grid
    const cardMeditation = document.getElementById("cardMeditation");
    const cardDeepSleep = document.getElementById("cardDeepSleep");
    const cardDeepWork = document.getElementById("cardDeepWork");
    const cardRelaxation = document.getElementById("cardRelaxation");

    // Meditation Card -> Open Breathing Timer Screen
    if (cardMeditation) {
        cardMeditation.addEventListener("click", () => {
            openBreathingTimerScreen();
        });
    }
    
    // Remedy Hero "Begin Journey" -> Open Breathing Timer Screen as well
    const btnBeginJourney = document.getElementById("btnBeginJourney");
    if (btnBeginJourney) {
        btnBeginJourney.addEventListener("click", () => {
            openBreathingTimerScreen();
        });
    }

    // Deep Sleep Card -> Open YouTube lullabies video in a new tab
    if (cardDeepSleep) {
        cardDeepSleep.addEventListener("click", () => {
            window.open("https://youtu.be/rA7m3iKpuko?si=3sfY3oleve6ObpLr", "_blank");
        });
    }

    // Deep Work Card -> Open YouTube binaural focus beats video in a new tab
    if (cardDeepWork) {
        cardDeepWork.addEventListener("click", () => {
            window.open("https://youtu.be/f-i_nJLG2Is?si=ZNnAArDg3d5ZjvF0", "_blank");
        });
    }

    // Relaxation Card -> Show custom mock notice
    if (cardRelaxation) {
        cardRelaxation.addEventListener("click", () => {
            alert("Playing Nature mountain soundscapes on your device.");
            if (playPauseBtn && !isPlayingSoundscape) {
                playPauseBtn.click(); // Mock play
            }
        });
    }

    // Recommended items clicks
    const recRain = document.getElementById("recRain");
    const recAlpine = document.getElementById("recAlpine");
    const recOcean = document.getElementById("recOcean");

    if (recRain) {
        recRain.addEventListener("click", () => {
            window.open("https://youtu.be/rA7m3iKpuko?si=3sfY3oleve6ObpLr", "_blank");
        });
    }
    
    if (recAlpine) {
        recAlpine.addEventListener("click", () => {
            openBreathingTimerScreen();
        });
    }
    
    if (recOcean) {
        recOcean.addEventListener("click", () => {
            alert("Streaming Ocean Breath relaxation frequencies.");
        });
    }

    // --- 5. BREATHING TIMER SELECTIONS & TRIGGERS ---
    
    // Back Button from Timer View
    if (timerBackBtn) {
        timerBackBtn.addEventListener("click", () => {
            closeBreathingTimerScreen();
        });
    }

    // Technique Selector Pills
    if (timerTechList) {
        const pills = timerTechList.querySelectorAll(".timer-pill");
        pills.forEach(p => {
            p.addEventListener("click", () => {
                // If running, stop session first
                if (isTimerRunning) {
                    stopBreathingTimerSession();
                }
                
                pills.forEach(p => {
                    p.classList.remove("active");
                    const icon = p.querySelector("i");
                    if (icon) icon.remove();
                });
                p.classList.add("active");
                p.innerHTML += ` <i class="fa-solid fa-circle-check"></i>`;
                
                selectedTechnique = p.dataset.tech;
                resetTimerStateText();
            });
        });
    }

    // Duration Selector Pills
    if (timerDurList) {
        const pills = timerDurList.querySelectorAll(".timer-pill");
        pills.forEach(p => {
            p.addEventListener("click", () => {
                if (isTimerRunning) {
                    stopBreathingTimerSession();
                }
                
                pills.forEach(p => p.classList.remove("active"));
                p.classList.add("active");
                
                selectedDuration = parseInt(p.dataset.dur);
                timerRemainingSeconds = selectedDuration;
                
                updateTimerDisplayNumbers();
            });
        });
    }

    // Start / Stop Breathing Timer Control Button
    if (btnStartBreathingTimer) {
        btnStartBreathingTimer.addEventListener("click", () => {
            // Initialize audio context on first user click (browser security rules)
            initAudioContext();
            
            if (isTimerRunning) {
                stopBreathingTimerSession();
            } else {
                startBreathingTimerSession();
            }
        });
    }

    // Graph Download Button Listener
    const btnDownloadGraph = document.getElementById("btnDownloadGraph");
    if (btnDownloadGraph) {
        btnDownloadGraph.addEventListener("click", () => {
            const chartCanvas = document.getElementById("stressHistoryChart");
            if (chartCanvas) {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = chartCanvas.width;
                tempCanvas.height = chartCanvas.height;
                const tempCtx = tempCanvas.getContext("2d");
                
                // Draw white background
                tempCtx.fillStyle = "#ffffff";
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                // Draw original chart
                tempCtx.drawImage(chartCanvas, 0, 0);
                
                const link = document.createElement("a");
                link.download = `Calmify_Stress_Graph_${currentYear}_${currentMonth}.png`;
                link.href = tempCanvas.toDataURL("image/png");
                link.click();
            }
        });
    }
});

// Initialize Header Dynamic Date info
function initHeaderDate() {
    const today = new Date();
    const dayOptions = { weekday: 'long' };
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    const dayLabel = document.getElementById("headerDayLabel");
    const dateLabel = document.getElementById("headerDateLabel");
    
    if (dayLabel) dayLabel.innerText = today.toLocaleDateString('en-US', dayOptions).toUpperCase();
    if (dateLabel) dateLabel.innerText = today.toLocaleDateString('en-US', dateOptions);
}

// Update Month/Year Header text
function updateMonthHeaderDisplay() {
    if (monthYearDisplay) {
        const monthName = MONTH_NAMES[currentMonth - 1];
        monthYearDisplay.innerHTML = `<span class="month-name">${monthName}</span> <span class="year-name">${currentYear}</span>`;
    }
}

// --- Check Backend Python/MySQL Service Connection ---
async function checkBackendConnection() {
    try {
        const response = await fetch(`${API_BASE}/status`, { method: 'GET' });
        const data = await response.json();
        if (data.status === "online" && data.database.includes("connected")) {
            setDbStatusBanner(true, "Connected to MySQL Database");
            isDbConnected = true;
        } else if (data.status === "online") {
            setDbStatusBanner(false, "MySQL Server Offline");
            isDbConnected = false;
        }
    } catch (e) {
        console.warn("Backend server not running. Falling back to local Storage.", e);
        setDbStatusBanner(false, "Running in Local Storage Mode");
        isDbConnected = false;
    }
}

function setDbStatusBanner(connected, text) {
    if (!dbStatus) return;
    const dot = dbStatus.querySelector(".status-dot");
    const label = dbStatus.querySelector(".status-text");
    if (connected) {
        dot.className = "status-dot online";
        label.innerText = text;
    } else {
        dot.className = "status-dot offline";
        label.innerText = text;
    }
}

// --- Data Layer: Load & Sync Logs ---
async function loadMonthLogs() {
    monthLogs = {};
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const userEmail = currentUser ? currentUser.email : "";

    if (isDbConnected && userEmail) {
        try {
            const response = await fetch(`${API_BASE}/logs?month=${monthStr}&email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                const logsList = await response.json();
                logsList.forEach(log => {
                    monthLogs[log.log_date] = log;
                });
            }
        } catch (e) {
            console.error("Error reading database logs. Using local storage instead.", e);
            loadLocalLogs(monthStr);
        }
    } else {
        loadLocalLogs(monthStr);
    }

    renderCalendar();
    selectDay(selectedDateStr);
    updateHarmonyScore();
}

function loadLocalLogs(monthStr) {
    const emailPrefix = currentUser ? `${currentUser.email}_` : "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`${emailPrefix}${monthStr}`)) {
            try {
                const logDate = key.substring(emailPrefix.length);
                monthLogs[logDate] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                console.error("Local storage read error", e);
            }
        }
    }
}

// --- Render Calendar Grid ---
function renderCalendar() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = "";

    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // Sunday-first
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    let emptyCells = firstDayIndex;

    // 1. Add spacer day cards
    for (let i = 0; i < emptyCells; i++) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "calendar-day empty-day";
        const numSpan = document.createElement("span");
        numSpan.className = "day-number";
        numSpan.innerText = "";
        emptyDiv.appendChild(numSpan);
        calendarGrid.appendChild(emptyDiv);
    }

    // 2. Add calendar dates
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day";
        dayDiv.dataset.date = dateStr;

        if (dateStr === selectedDateStr) {
            dayDiv.classList.add("selected-day");
        }

        const numSpan = document.createElement("span");
        numSpan.className = "day-number";
        numSpan.innerText = day;
        dayDiv.appendChild(numSpan);

        // Add mood dot
        const dotSpan = document.createElement("span");
        dotSpan.className = "mood-dot";
        
        if (monthLogs[dateStr] && monthLogs[dateStr].mood) {
            dotSpan.classList.add(monthLogs[dateStr].mood);
        }
        
        dayDiv.appendChild(dotSpan);

        // Click to Select Day
        dayDiv.addEventListener("click", () => {
            selectDay(dateStr);
        });

        // Double-click or click twice to cycle mood state
        dayDiv.addEventListener("dblclick", () => {
            cycleMood(dateStr, dayDiv);
        });

        dayDiv.addEventListener("click", () => {
            if (selectedDateStr === dateStr) {
                cycleMood(dateStr, dayDiv);
            }
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// Select a date card
function selectDay(dateStr) {
    selectedDateStr = dateStr;
    
    const dayDivs = document.querySelectorAll(".calendar-day");
    dayDivs.forEach(div => div.classList.remove("selected-day"));

    const selectedDiv = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
    if (selectedDiv) {
        selectedDiv.classList.add("selected-day");
    }

    const dateObj = new Date(dateStr);
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    if (selectedDateLabel) {
        selectedDateLabel.innerText = dateObj.toLocaleDateString('en-US', options);
    }

    const log = monthLogs[dateStr] || {
        mood: "neutral",
        sleep_duration: "6h 40m",
        hrv: 82,
        symptoms: "",
        notes: ""
    };

    if (symptomsInput) symptomsInput.value = log.symptoms || "";
    if (notesInput) notesInput.value = log.notes || "";

    // Sync sleep inputs
    let sleepMin = 400; // default 6h 40m
    if (log.sleep_duration) {
        const parts = log.sleep_duration.match(/(\d+)h\s*(\d+)m/);
        if (parts) {
            sleepMin = parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
    }
    if (sleepSlider) sleepSlider.value = sleepMin;
    if (sleepDisplayValue) sleepDisplayValue.innerText = log.sleep_duration || "6h 40m";
    const sleepPct = Math.min((sleepMin / 480) * 100, 100);
    if (sleepProgressBar) sleepProgressBar.style.width = `${sleepPct}%`;

    // Sync HRV inputs
    const hrvVal = log.hrv || 82;
    if (hrvSlider) hrvSlider.value = hrvVal;
    if (hrvDisplayValue) hrvDisplayValue.innerText = `${hrvVal}ms`;
    const hrvPct = Math.min(((hrvVal - 20) / 130) * 100, 100);
    if (hrvProgressBar) hrvProgressBar.style.width = `${hrvPct}%`;

    updateRecommendations(log.mood);
}

// Cycle mood status on date click/tap
async function cycleMood(dateStr, element) {
    const currentLog = monthLogs[dateStr] || {
        log_date: dateStr,
        mood: "neutral",
        sleep_duration: "6h 40m",
        hrv: 82,
        symptoms: "",
        notes: ""
    };

    let newMood = "neutral";
    if (currentLog.mood === "neutral" || !currentLog.mood) {
        newMood = "relax"; // Meditated (Green)
    } else if (currentLog.mood === "relax") {
        newMood = "mild";  // Mild Stress (Yellow)
    } else if (currentLog.mood === "mild") {
        newMood = "extreme"; // High Stress (Red)
    } else if (currentLog.mood === "extreme") {
        newMood = "neutral"; // Reset (Gray)
    }

    currentLog.mood = newMood;
    monthLogs[dateStr] = currentLog;

    const dot = element.querySelector(".mood-dot");
    if (dot) {
        dot.className = "mood-dot";
        if (newMood !== "neutral") {
            dot.classList.add(newMood);
        }
    }

    await saveLogToBackendOrLocal(currentLog);
    updateHarmonyScore();
    updateRecommendations(newMood);
}

function updateRecommendations(mood) {
    if (!guidedMomentDesc) return;
    if (mood === "extreme") {
        guidedMomentDesc.innerText = "Recommended to relieve extreme tension & slow heartbeat.";
    } else if (mood === "mild") {
        guidedMomentDesc.innerText = "Recommended to restore calm energy levels today.";
    } else {
        guidedMomentDesc.innerText = "Recommended to sustain relaxation and harmony today.";
    }
}

// --- Calculation: Harmony / Resilience Score & averages ---
function updateHarmonyScore() {
    let totalLoggedDays = 0;
    let relaxDays = 0;
    let mildDays = 0;
    let extremeDays = 0;

    let totalSleepMin = 0;
    let totalHrv = 0;
    let sleepLoggedDays = 0;
    let hrvLoggedDays = 0;

    Object.keys(monthLogs).forEach(dateKey => {
        const log = monthLogs[dateKey];
        if (log && log.mood) {
            totalLoggedDays++;
            if (log.mood === "relax") {
                relaxDays++;
            } else if (log.mood === "mild") {
                mildDays++;
            } else if (log.mood === "extreme") {
                extremeDays++;
            }
        }
        if (log) {
            if (log.sleep_duration) {
                const parts = log.sleep_duration.match(/(\d+)h\s*(\d+)m/);
                if (parts) {
                    totalSleepMin += parseInt(parts[1]) * 60 + parseInt(parts[2]);
                    sleepLoggedDays++;
                }
            }
            if (log.hrv) {
                totalHrv += parseInt(log.hrv);
                hrvLoggedDays++;
            }
        }
    });

    let harmonyPct = 84; 
    if (totalLoggedDays > 0) {
        const totalPoints = (relaxDays * 100) + (mildDays * 50);
        harmonyPct = Math.round(totalPoints / totalLoggedDays);
    }

    if (harmonyScoreDisplay) {
        harmonyScoreDisplay.innerText = harmonyPct;
    }

    // Animate SVG Radial Progress ring (circumference = 176)
    const radialCircle = document.getElementById("radialProgressCircle");
    if (radialCircle) {
        const strokeOffset = 176 - (harmonyPct / 100) * 176;
        radialCircle.style.strokeDashoffset = strokeOffset;
    }

    // Dynamic averages inside Widgets
    const widgetSleep = document.getElementById("widgetSleepValue");
    if (widgetSleep) {
        if (sleepLoggedDays > 0) {
            const avgMin = Math.round(totalSleepMin / sleepLoggedDays);
            const h = Math.floor(avgMin / 60);
            const m = avgMin % 60;
            widgetSleep.innerText = `${h}h ${m}m`;
        } else {
            widgetSleep.innerText = "7h 42m";
        }
    }

    const widgetHrv = document.getElementById("widgetHrvValue");
    if (widgetHrv) {
        if (hrvLoggedDays > 0) {
            const avgHrv = Math.round(totalHrv / hrvLoggedDays);
            widgetHrv.innerText = `${avgHrv} ms`;
        } else {
            widgetHrv.innerText = "64 ms";
        }
    }

    // Dominant states ratios
    const stateTotal = relaxDays + mildDays + extremeDays;
    let relaxPct = 65;
    let mildPct = 20;
    let extremePct = 15;

    if (stateTotal > 0) {
        relaxPct = Math.round((relaxDays / stateTotal) * 100);
        mildPct = Math.round((mildDays / stateTotal) * 100);
        extremePct = 100 - relaxPct - mildPct;
        if (extremePct < 0) extremePct = 0;
    }

    const focusedPctLabel = document.getElementById("stateFocusedPct");
    const focusedBar = document.getElementById("stateFocusedBar");
    if (focusedPctLabel && focusedBar) {
        focusedPctLabel.innerText = `${relaxPct}%`;
        focusedBar.style.width = `${relaxPct}%`;
    }

    const anxietyPctLabel = document.getElementById("stateAnxietyPct");
    const anxietyBar = document.getElementById("stateAnxietyBar");
    if (anxietyPctLabel && anxietyBar) {
        anxietyPctLabel.innerText = `${mildPct}%`;
        anxietyBar.style.width = `${mildPct}%`;
    }

    const stressPctLabel = document.getElementById("stateStressPct");
    const stressBar = document.getElementById("stateStressBar");
    if (stressPctLabel && stressBar) {
        stressPctLabel.innerText = `${extremePct}%`;
        stressBar.style.width = `${extremePct}%`;
    }

    if (monthlyFlowDescDisplay) {
        if (relaxDays > 0) {
            monthlyFlowDescDisplay.innerHTML = `You've reached your relaxation goals <strong>${relaxDays} days</strong> this month. Keep it up!`;
        } else {
            monthlyFlowDescDisplay.innerHTML = "Tap days on the calendar to mark your mental health status and see your harmony report.";
        }
    }
}

// --- Submit & Save Reflection Form Logs ---
async function saveCurrentLog() {
    if (!selectedDateStr) {
        alert("Please select a calendar day to save a reflection log.");
        return;
    }

    const currentLog = monthLogs[selectedDateStr] || {
        log_date: selectedDateStr,
        mood: "neutral"
    };

    if (symptomsInput) currentLog.symptoms = symptomsInput.value.trim();
    if (notesInput) currentLog.notes = notesInput.value.trim();
    if (sleepDisplayValue) currentLog.sleep_duration = sleepDisplayValue.innerText;
    if (hrvSlider) currentLog.hrv = parseInt(hrvSlider.value);

    if (saveLogBtn) saveLogBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    
    // Fetch calculated stress index from Railway API
    try {
        const ageVal = (currentUser && currentUser.age) ? parseInt(currentUser.age) : 28;
        const hrvVal = currentLog.hrv || 82;
        // Simulate normal variations for HR & Temp if not active
        const simulatedHR = Math.round(Math.max(50, Math.min(180, 110 - (hrvVal * 0.4) + (Math.random() * 6 - 3))));
        const simulatedTemp = 36.8 + (Math.random() * 0.4 - 0.2);
        
        // Use live ESP32 HR if connected
        const hrVal = (esp32ConnectionState === "connected") ? heartRateBpm : simulatedHR;
        
        const railwayRes = await fetch("https://calmifyai-production.up.railway.app/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                hr: hrVal,
                hrv: hrvVal,
                temp: parseFloat(simulatedTemp.toFixed(1)),
                age: ageVal
            })
        });
        
        if (railwayRes.ok) {
            const data = await railwayRes.json();
            currentLog.stress_index = data.stress_index;
            console.log("Fetched stress index from Railway:", data.stress_index);
        } else {
            currentLog.stress_index = calculateLocalStressIndex(hrVal, hrvVal, simulatedTemp);
            console.warn("Railway API error, computed locally:", currentLog.stress_index);
        }
    } catch (err) {
        const ageVal = (currentUser && currentUser.age) ? parseInt(currentUser.age) : 28;
        const hrvVal = currentLog.hrv || 82;
        const simulatedHR = Math.round(Math.max(50, Math.min(180, 110 - (hrvVal * 0.4))));
        const simulatedTemp = 36.8;
        currentLog.stress_index = calculateLocalStressIndex(simulatedHR, hrvVal, simulatedTemp);
        console.warn("Railway API offline, computed locally:", currentLog.stress_index);
    }

    const success = await saveLogToBackendOrLocal(currentLog);
    
    setTimeout(() => {
        if (saveLogBtn) {
            saveLogBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Daily Log';
            if (success) {
                saveLogBtn.style.backgroundColor = "#245531";
                setTimeout(() => {
                    saveLogBtn.style.backgroundColor = "";
                }, 1000);
            }
        }
    }, 400);
}

async function saveLogToBackendOrLocal(log) {
    if (currentUser) {
        log.user_email = currentUser.email;
    } else {
        log.user_email = 'evelyn@serenity.com';
    }
    monthLogs[log.log_date] = log;

    if (isDbConnected) {
        try {
            const response = await fetch(`${API_BASE}/logs`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "X-User-Email": log.user_email
                },
                body: JSON.stringify(log)
            });
            if (response.ok) {
                return true;
            }
        } catch (e) {
            console.error("Backend offline. Saving locally to localStorage.", e);
        }
    }

    try {
        const localKey = currentUser ? `${currentUser.email}_${log.log_date}` : log.log_date;
        localStorage.setItem(localKey, JSON.stringify(log));
        updateHarmonyScore();
        return true;
    } catch (e) {
        console.error("Local storage save failed", e);
        return false;
    }
}

// --- 6. CORE BREATHING TIMER VIEW LOGIC ---

// Open fixed fullscreen timer view
function openBreathingTimerScreen() {
    if (timerView) {
        timerView.style.display = "flex";
        document.body.style.overflow = "hidden"; // block background scrolling
    }
}

// Close and stop fixed fullscreen timer view
function closeBreathingTimerScreen() {
    if (timerView) {
        stopBreathingTimerSession();
        timerView.style.display = "none";
        document.body.style.overflow = "";
    }
}

// Reset text parameters of timer visual
function resetTimerStateText() {
    if (timerPhaseStatus) {
        timerPhaseStatus.innerText = "READY";
        timerPhaseStatus.style.color = "var(--primary-color)";
    }
    if (timerPulsingGlow) {
        timerPulsingGlow.style.transform = "scale(1)";
    }
}

// Sync clock number display
function updateTimerDisplayNumbers() {
    if (timerMinutesSeconds) {
        const m = Math.floor(timerRemainingSeconds / 60);
        const s = timerRemainingSeconds % 60;
        timerMinutesSeconds.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

// Web Audio API Pleasant Beep Synthesizer (Zero asset dependencies!)
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playPleasantBeep() {
    try {
        if (!audioContext) return;
        
        // Resume if suspended by browser security policy
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
        
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        // Cozy high pitch bell-like soft beep
        osc.type = "sine";
        osc.frequency.setValueAtTime(620, audioContext.currentTime); // pleasant 620Hz
        
        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        // Clean exponential decay
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
        
        osc.start();
        osc.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.error("Audio Synthesis error:", e);
    }
}

// Start Breathing Timer Countdown & transition loop
function startBreathingTimerSession() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    breathingElapsedSeconds = 0;
    
    if (btnStartBreathingTimer) {
        btnStartBreathingTimer.innerHTML = `<i class="fa-solid fa-pause"></i> Stop Session`;
        btnStartBreathingTimer.style.backgroundColor = "var(--color-extreme)";
    }
    
    // Play initial starting beep
    playPleasantBeep();
    runBreathingSessionTicker();
    
    // Overall 1-second interval ticker
    mainTimerInterval = setInterval(() => {
        timerRemainingSeconds--;
        breathingElapsedSeconds++;
        
        updateTimerDisplayNumbers();
        runBreathingSessionTicker();
        
        // Session complete trigger
        if (timerRemainingSeconds <= 0) {
            stopBreathingTimerSession();
            alert("Breathing Session Completed successfully! Relax and cherish this present moment.");
        }
    }, 1000);
}

// Core Breathing cycle calculations & beep loops
function runBreathingSessionTicker() {
    if (!timerPhaseStatus || !timerPulsingGlow) return;
    
    if (selectedTechnique === "box") {
        // --- BOX BREATHING CYCLE: 4s Inhale -> 4s Hold -> 4s Exhale -> 4s Hold (16s cycle) ---
        const phaseTime = breathingElapsedSeconds % 16;
        
        if (phaseTime === 0) {
            // Start of cycle: Inhale
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE IN";
            timerPhaseStatus.style.color = "var(--primary-light)";
            timerPulsingGlow.style.transform = "scale(1.35)"; // expand visual ring halo
        } 
        else if (phaseTime === 4) {
            // Hold
            playPleasantBeep();
            timerPhaseStatus.innerText = "HOLD";
            timerPhaseStatus.style.color = "var(--primary-color)";
            timerPulsingGlow.style.transform = "scale(1.35)"; // maintain large size
        } 
        else if (phaseTime === 8) {
            // Exhale
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE OUT";
            timerPhaseStatus.style.color = "#a85d30";
            timerPulsingGlow.style.transform = "scale(0.75)"; // shrink visual ring halo
        } 
        else if (phaseTime === 12) {
            // Hold
            playPleasantBeep();
            timerPhaseStatus.innerText = "HOLD";
            timerPhaseStatus.style.color = "var(--primary-color)";
            timerPulsingGlow.style.transform = "scale(0.75)"; // maintain small size
        }
    } 
    else if (selectedTechnique === "478") {
        // --- 4-7-8 RELAX BREATHING: 4s Inhale -> 7s Hold -> 8s Exhale (19s cycle) ---
        const phaseTime = breathingElapsedSeconds % 19;
        
        if (phaseTime === 0) {
            // Inhale (0 to 4s)
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE IN";
            timerPhaseStatus.style.color = "var(--primary-light)";
            timerPulsingGlow.style.transform = "scale(1.35)";
        } 
        else if (phaseTime === 4) {
            // Hold (4 to 11s)
            playPleasantBeep();
            timerPhaseStatus.innerText = "HOLD";
            timerPhaseStatus.style.color = "var(--primary-color)";
            timerPulsingGlow.style.transform = "scale(1.35)";
        } 
        else if (phaseTime === 11) {
            // Exhale (11 to 19s)
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE OUT";
            timerPhaseStatus.style.color = "#a85d30";
            timerPulsingGlow.style.transform = "scale(0.75)";
        }
    } 
    else if (selectedTechnique === "balanced") {
        // --- BALANCED BREATHING: 5s Inhale -> 5s Exhale (10s cycle) ---
        const phaseTime = breathingElapsedSeconds % 10;
        
        if (phaseTime === 0) {
            // Inhale
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE IN";
            timerPhaseStatus.style.color = "var(--primary-light)";
            timerPulsingGlow.style.transform = "scale(1.35)";
        } 
        else if (phaseTime === 5) {
            // Exhale
            playPleasantBeep();
            timerPhaseStatus.innerText = "BREATHE OUT";
            timerPhaseStatus.style.color = "#a85d30";
            timerPulsingGlow.style.transform = "scale(0.75)";
        }
    }
}

// Stop session and reset timer visuals
function stopBreathingTimerSession() {
    isTimerRunning = false;
    
    if (mainTimerInterval) {
        clearInterval(mainTimerInterval);
        mainTimerInterval = null;
    }
    
    if (btnStartBreathingTimer) {
        btnStartBreathingTimer.innerHTML = `<i class="fa-solid fa-play"></i> Begin Session`;
        btnStartBreathingTimer.style.backgroundColor = "";
    }
    
    timerRemainingSeconds = selectedDuration;
    
    updateTimerDisplayNumbers();
    resetTimerStateText();
}

// --- Interactive Breathing Simulator Application (Old Guided Moment Modal Fallback) ---
const breathingCircle = document.getElementById("breathingCircle");
const breathingText = document.getElementById("breathingText");
const breathingStartStopBtn = document.getElementById("breathingStartStopBtn");
const closeBreathingBtn = document.getElementById("closeBreathingBtn");

let breathingModalInterval = null;
let breathingModalPhase = 0;
let isBreathingModalActive = false;

function openBreathingModal() {
    const modal = document.getElementById("breathingModal");
    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeBreathingModal() {
    const modal = document.getElementById("breathingModal");
    if (!modal) return;
    stopBreathingModalExercise();
    modal.style.display = "none";
    document.body.style.overflow = "";
}

function toggleBreathingExercise() {
    if (isBreathingModalActive) {
        stopBreathingModalExercise();
    } else {
        startBreathingModalExercise();
    }
}

function startBreathingModalExercise() {
    if (!breathingStartStopBtn) return;
    isBreathingModalActive = true;
    breathingStartStopBtn.innerText = "Stop Session";
    breathingStartStopBtn.style.backgroundColor = "#a83d3d";
    
    breathingModalPhase = 0;
    runBreathingModalCycle();
    
    breathingModalInterval = setInterval(() => {
        breathingModalPhase = (breathingModalPhase + 1) % 3;
        runBreathingModalCycle();
    }, 4000);
}

function runBreathingModalCycle() {
    if (!breathingCircle || !breathingText) return;
    breathingCircle.className = "breathing-circle";

    if (breathingModalPhase === 0) {
        breathingCircle.classList.add("inhale");
        breathingText.innerText = "Breathe In...";
    } else if (breathingModalPhase === 1) {
        breathingCircle.classList.add("hold");
        breathingText.innerText = "Hold...";
    } else {
        breathingCircle.classList.add("exhale");
        breathingText.innerText = "Breathe Out...";
    }
}

function stopBreathingModalExercise() {
    isBreathingModalActive = false;
    if (breathingModalInterval) {
        clearInterval(breathingModalInterval);
        breathingModalInterval = null;
    }
    
    if (breathingCircle) breathingCircle.className = "breathing-circle";
    if (breathingText) breathingText.innerText = "Session Complete";
    if (breathingStartStopBtn) {
        breathingStartStopBtn.innerText = "Start";
        breathingStartStopBtn.style.backgroundColor = "";
    }
}

function updateSidebarUserProfile() {
    if (!currentUser) return;
    const userNameEl = document.querySelector(".sidebar .user-name");
    const userStatusEl = document.querySelector(".sidebar .user-status");
    const userAvatarEl = document.querySelector(".sidebar .user-avatar");
    
    if (userNameEl) userNameEl.innerText = currentUser.full_name;
    if (userStatusEl) userStatusEl.innerText = currentUser.profession || "Premium Member";
    
    if (userAvatarEl) {
        userAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.full_name)}&background=5a9b73&color=fff&bold=true`;
    }
}

// --- 7. SYSTEM SETTINGS LOGIC (Connectivity & Emergency Contacts) ---

let isBluetoothActive = false;
let esp32ConnectionState = "disconnected"; // "disconnected", "connecting", "connected"
let esp32TelemetryInterval = null;
let ecgAnimationId = null;
let ecgHistoryBuffer = [];
let heartRateBpm = 75;
let hrvMs = 82;
let ecgPatternIdx = 0;
let localEmergencyContacts = [];

// ECG heartbeat shape pattern
const ecgHeartBeatPattern = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0.02, 0.05, 0.08, 0.05, 0.02, 0, 0, 0, -0.05, -0.1,
    0.6, 0.9, 0.3, -0.25, -0.3, -0.1, 0, 0, 0, 0.05,
    0.1, 0.15, 0.18, 0.15, 0.1, 0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0
];

function initSettingsView() {
    const bluetoothSwitch = document.getElementById("bluetoothSwitch");
    const espConnectionCard = document.getElementById("espConnectionCard");
    const btnConnectESP = document.getElementById("btnConnectESP");
    const espVisualizerCard = document.getElementById("espVisualizerCard");
    
    // Set initial toggle switch state
    if (bluetoothSwitch) {
        bluetoothSwitch.checked = isBluetoothActive;
    }
    
    // Update container states based on current state
    if (isBluetoothActive) {
        if (espConnectionCard) espConnectionCard.classList.remove("disabled-opacity");
        if (btnConnectESP) btnConnectESP.removeAttribute("disabled");
    } else {
        if (espConnectionCard) espConnectionCard.classList.add("disabled-opacity");
        if (btnConnectESP) btnConnectESP.setAttribute("disabled", "true");
        if (espVisualizerCard) espVisualizerCard.classList.add("disabled-opacity");
    }
    
    // Set panel display based on active tab
    const btnSettingsConnectivity = document.getElementById("btnSettingsConnectivity");
    const btnSettingsEmergency = document.getElementById("btnSettingsEmergency");
    const settingsConnectivityPanel = document.getElementById("settingsConnectivityPanel");
    const settingsEmergencyPanel = document.getElementById("settingsEmergencyPanel");
    
    if (btnSettingsConnectivity && btnSettingsConnectivity.classList.contains("active")) {
        if (settingsConnectivityPanel) settingsConnectivityPanel.style.display = "flex";
        if (settingsEmergencyPanel) settingsEmergencyPanel.style.display = "none";
    } else if (btnSettingsEmergency && btnSettingsEmergency.classList.contains("active")) {
        if (settingsEmergencyPanel) settingsEmergencyPanel.style.display = "flex";
        if (settingsConnectivityPanel) settingsConnectivityPanel.style.display = "none";
        fetchEmergencyContacts();
    }
}

let bluetoothAvailabilityListenerAttached = false;

// Enable/Disable Bluetooth Receiver
async function handleBluetoothToggle(enabled) {
    isBluetoothActive = enabled;
    
    const bluetoothStatusPill = document.getElementById("bluetoothStatusPill");
    const bluetoothStatusText = document.getElementById("bluetoothStatusText");
    const espConnectionCard = document.getElementById("espConnectionCard");
    const btnConnectESP = document.getElementById("btnConnectESP");
    const espVisualizerCard = document.getElementById("espVisualizerCard");
    const bluetoothWarningBanner = document.getElementById("bluetoothWarningBanner");
    const bluetoothWarningText = document.getElementById("bluetoothWarningText");
    
    if (enabled) {
        // 1. Browser check for Web Bluetooth
        if (!navigator.bluetooth) {
            if (bluetoothStatusPill) {
                bluetoothStatusPill.className = "status-pill status-connecting";
            }
            if (bluetoothStatusText) bluetoothStatusText.innerText = "SIMULATED ON";
            if (bluetoothWarningBanner) {
                if (bluetoothWarningText) {
                    bluetoothWarningText.innerHTML = "<strong>Web Bluetooth API not supported</strong> by this browser. Running in Simulation mode for demonstration.";
                }
                bluetoothWarningBanner.style.display = "flex";
            }
            if (espConnectionCard) espConnectionCard.classList.remove("disabled-opacity");
            if (btnConnectESP) btnConnectESP.removeAttribute("disabled");
            return;
        }

        // 2. Hardware state check
        try {
            const isAvail = await navigator.bluetooth.getAvailability();
            handleSystemBluetoothStatus(isAvail);
        } catch (err) {
            console.warn("Bluetooth API check failed", err);
            handleSystemBluetoothStatus(true); // Fallback to simulated availability
        }

        // 3. Hardware state event listener
        if (!bluetoothAvailabilityListenerAttached) {
            navigator.bluetooth.addEventListener('availabilitychanged', (e) => {
                if (isBluetoothActive) {
                    handleSystemBluetoothStatus(e.value);
                }
            });
            bluetoothAvailabilityListenerAttached = true;
        }
    } else {
        if (bluetoothStatusPill) {
            bluetoothStatusPill.className = "status-pill status-off";
        }
        if (bluetoothStatusText) bluetoothStatusText.innerText = "OFF";
        if (espConnectionCard) espConnectionCard.classList.add("disabled-opacity");
        if (btnConnectESP) btnConnectESP.setAttribute("disabled", "true");
        if (espVisualizerCard) espVisualizerCard.classList.add("disabled-opacity");
        if (bluetoothWarningBanner) bluetoothWarningBanner.style.display = "none";
        
        // If ESP32 is connected/connecting, force disconnect
        if (esp32ConnectionState !== "disconnected") {
            disconnectESP32();
        }
    }
}

function handleSystemBluetoothStatus(available) {
    const bluetoothStatusPill = document.getElementById("bluetoothStatusPill");
    const bluetoothStatusText = document.getElementById("bluetoothStatusText");
    const bluetoothWarningBanner = document.getElementById("bluetoothWarningBanner");
    const bluetoothWarningText = document.getElementById("bluetoothWarningText");
    const espConnectionCard = document.getElementById("espConnectionCard");
    const btnConnectESP = document.getElementById("btnConnectESP");
    
    if (available) {
        // System bluetooth is ON!
        if (bluetoothStatusPill) {
            bluetoothStatusPill.className = "status-pill status-on";
        }
        if (bluetoothStatusText) bluetoothStatusText.innerText = "ON";
        if (bluetoothWarningBanner) bluetoothWarningBanner.style.display = "none";
        
        // Allow connecting
        if (espConnectionCard) espConnectionCard.classList.remove("disabled-opacity");
        if (btnConnectESP) btnConnectESP.removeAttribute("disabled");
    } else {
        // System bluetooth is OFF!
        if (bluetoothStatusPill) {
            bluetoothStatusPill.className = "status-pill status-off";
        }
        if (bluetoothStatusText) bluetoothStatusText.innerText = "DISABLED";
        if (bluetoothWarningBanner) {
            if (bluetoothWarningText) {
                bluetoothWarningText.innerHTML = "<strong>System Bluetooth is turned off.</strong> Please enable Bluetooth in your device settings (e.g. Windows Settings > Bluetooth) to connect your ESP32.";
            }
            bluetoothWarningBanner.style.display = "flex";
        }
        
        // Prevent connecting
        if (espConnectionCard) espConnectionCard.classList.add("disabled-opacity");
        if (btnConnectESP) btnConnectESP.setAttribute("disabled", "true");
        
        // Force disconnect if active
        if (esp32ConnectionState !== "disconnected") {
            disconnectESP32();
        }
    }
}

// Connect / Disconnect ESP32
function handleESP32Connect() {
    const btnConnectESP = document.getElementById("btnConnectESP");
    const espSpinner = document.getElementById("espSpinner");
    const espStatusPill = document.getElementById("espStatusPill");
    const espStatusText = document.getElementById("espStatusText");
    const espVisualizerCard = document.getElementById("espVisualizerCard");
    const syncToggleWrapper = document.getElementById("syncToggleWrapper");
    
    if (esp32ConnectionState === "disconnected") {
        // Start connecting
        esp32ConnectionState = "connecting";
        if (btnConnectESP) {
            btnConnectESP.setAttribute("disabled", "true");
            if (espSpinner) espSpinner.style.display = "inline-block";
        }
        if (espStatusPill) {
            espStatusPill.className = "status-pill status-connecting";
        }
        if (espStatusText) espStatusText.innerText = "CONNECTING...";
        
        // Simulate scanning for BLE device
        setTimeout(() => {
            if (esp32ConnectionState !== "connecting") return; // Cancelled
            
            esp32ConnectionState = "connected";
            if (btnConnectESP) {
                btnConnectESP.removeAttribute("disabled");
                btnConnectESP.innerHTML = `<i class="fa-solid fa-circle-minus"></i> Disconnect`;
                btnConnectESP.className = "btn-settings-action disconnect-style";
            }
            if (espSpinner) espSpinner.style.display = "none";
            if (espStatusPill) {
                espStatusPill.className = "status-pill status-connected";
            }
            if (espStatusText) espStatusText.innerText = "CONNECTED (ESP32-HRV-SENSOR)";
            
            if (espVisualizerCard) espVisualizerCard.classList.remove("disabled-opacity");
            if (syncToggleWrapper) syncToggleWrapper.style.display = "flex";
            
            // Start streaming data
            startEcgAnimation();
            startTelemetrySimulation();
        }, 1500);
    } else if (esp32ConnectionState === "connected") {
        disconnectESP32();
    }
}

// Disconnect helper
function disconnectESP32() {
    esp32ConnectionState = "disconnected";
    
    const btnConnectESP = document.getElementById("btnConnectESP");
    const espSpinner = document.getElementById("espSpinner");
    const espStatusPill = document.getElementById("espStatusPill");
    const espStatusText = document.getElementById("espStatusText");
    const espVisualizerCard = document.getElementById("espVisualizerCard");
    const syncToggleWrapper = document.getElementById("syncToggleWrapper");
    const streamStatusLabel = document.getElementById("streamStatusLabel");
    
    if (btnConnectESP) {
        btnConnectESP.removeAttribute("disabled");
        btnConnectESP.innerHTML = `<i class="fa-solid fa-wifi"></i> Scan & Connect`;
        btnConnectESP.className = "btn-settings-action";
    }
    if (espSpinner) espSpinner.style.display = "none";
    if (espStatusPill) {
        espStatusPill.className = "status-pill status-off";
    }
    if (espStatusText) espStatusText.innerText = "DISCONNECTED";
    
    if (espVisualizerCard) espVisualizerCard.classList.add("disabled-opacity");
    if (syncToggleWrapper) syncToggleWrapper.style.display = "none";
    if (streamStatusLabel) streamStatusLabel.innerText = "Stream inactive. Connect your ESP32 to start receiving biometric telemetry.";
    
    stopEcgAnimation();
    stopTelemetrySimulation();
    
    // Clear metrics
    document.getElementById("metricBPM").innerHTML = `-- <span class="metric-unit">BPM</span>`;
    document.getElementById("metricHRV").innerHTML = `-- <span class="metric-unit">ms</span>`;
    document.getElementById("metricSignal").innerText = `--`;
}

// ECG Animation Functions
function startEcgAnimation() {
    const canvas = document.getElementById("ecgCanvas");
    if (!canvas) return;
    
    // Setup history buffer
    ecgHistoryBuffer = [];
    for (let i = 0; i < 200; i++) {
        ecgHistoryBuffer.push(0);
    }
    
    ecgPatternIdx = 0;
    
    // Set physical canvas width matching its display width
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 120;
    
    // Start animation loop
    stopEcgAnimation();
    animateEcg();
}

function stopEcgAnimation() {
    if (ecgAnimationId) {
        cancelAnimationFrame(ecgAnimationId);
        ecgAnimationId = null;
    }
}

function animateEcg() {
    const canvas = document.getElementById("ecgCanvas");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Fetch next data point based on BPM frequency
    // Higher heartRateBpm = faster completion of cycle
    const increment = (heartRateBpm / 60) * (ecgHeartBeatPattern.length / 60); // approx 60 FPS
    ecgPatternIdx = (ecgPatternIdx + increment) % ecgHeartBeatPattern.length;
    
    const currentPatternVal = ecgHeartBeatPattern[Math.floor(ecgPatternIdx)];
    
    // Shift and push to buffer
    ecgHistoryBuffer.shift();
    ecgHistoryBuffer.push(currentPatternVal);
    
    // Draw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Grid Lines (oscilloscope look)
    ctx.strokeStyle = "rgba(46, 111, 64, 0.06)";
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    // Horizontal grid lines
    for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw Center Baseline
    ctx.beginPath();
    ctx.strokeStyle = "rgba(46, 111, 64, 0.12)";
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Draw Waveform Line
    ctx.beginPath();
    ctx.strokeStyle = "#5a9b73"; // Calmify Sage
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    // Add glowing shadow
    ctx.shadowColor = "rgba(90, 155, 115, 0.7)";
    ctx.shadowBlur = 6;
    
    const length = ecgHistoryBuffer.length;
    const step = canvas.width / length;
    const centerY = canvas.height / 2;
    const amp = canvas.height * 0.4; // Max amplitude (40% of height)
    
    for (let i = 0; i < length; i++) {
        const x = i * step;
        const y = centerY - (ecgHistoryBuffer[i] * amp);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
    
    ecgAnimationId = requestAnimationFrame(animateEcg);
}

// Telemetry Simulation Update Loop
function startTelemetrySimulation() {
    stopTelemetrySimulation();
    
    const streamStatusLabel = document.getElementById("streamStatusLabel");
    if (streamStatusLabel) {
        streamStatusLabel.innerHTML = `<span class="pulse-dot" style="color:var(--primary-color);"></span> Streaming Live (taking input data)`;
    }
    
    esp32TelemetryInterval = setInterval(() => {
        // Simulate heart rate variability
        heartRateBpm = 74 + Math.floor(Math.sin(Date.now() / 6000) * 5) + Math.floor(Math.random() * 3);
        hrvMs = 78 + Math.floor(Math.cos(Date.now() / 9000) * 10) + Math.floor(Math.random() * 4);
        const signalStrength = -60 - Math.floor(Math.random() * 8);
        
        const metricBPM = document.getElementById("metricBPM");
        const metricHRV = document.getElementById("metricHRV");
        const metricSignal = document.getElementById("metricSignal");
        
        if (metricBPM) metricBPM.innerHTML = `${heartRateBpm} <span class="metric-unit">BPM</span>`;
        if (metricHRV) metricHRV.innerHTML = `${hrvMs} <span class="metric-unit">ms</span>`;
        if (metricSignal) {
            let quality = "Excellent";
            if (signalStrength < -70) quality = "Fair";
            else if (signalStrength < -60) quality = "Good";
            metricSignal.innerHTML = `${quality} <span class="metric-unit">${signalStrength} dBm</span>`;
        }
        
        // Sync check
        const syncHrvSwitch = document.getElementById("syncHrvSwitch");
        if (syncHrvSwitch && syncHrvSwitch.checked) {
            syncTelemetryToDashboard(heartRateBpm, hrvMs);
        }
    }, 1200);
}

function stopTelemetrySimulation() {
    if (esp32TelemetryInterval) {
        clearInterval(esp32TelemetryInterval);
        esp32TelemetryInterval = null;
    }
}

// Sync values to the main dashboard reflection sliders & widgets in real time
function syncTelemetryToDashboard(bpm, hrvVal) {
    const widgetHrvValue = document.getElementById("widgetHrvValue");
    if (widgetHrvValue) {
        widgetHrvValue.innerText = hrvVal + " ms";
    }
    
    const hrvSlider = document.getElementById("hrvSlider");
    const hrvDisplayValue = document.getElementById("hrvDisplayValue");
    const hrvProgressBar = document.getElementById("hrvProgressBar");
    
    if (hrvSlider) {
        hrvSlider.value = hrvVal;
        if (hrvDisplayValue) hrvDisplayValue.innerText = hrvVal + "ms";
        if (hrvProgressBar) {
            const pct = Math.min(((hrvVal - 20) / 130) * 100, 100);
            hrvProgressBar.style.width = pct + "%";
        }
    }
    
    const harmonyScore = document.getElementById("harmonyScore");
    if (harmonyScore) {
        const score = Math.min(65 + Math.floor((hrvVal - 30) / 2.5), 100);
        harmonyScore.innerText = score;
        
        const circle = document.getElementById("radialProgressCircle");
        if (circle) {
            const radius = 28;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (score / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }
}

// Fetch emergency contacts from DB or LocalStorage
async function fetchEmergencyContacts() {
    const userEmail = currentUser ? currentUser.email : "evelyn@serenity.com";
    localEmergencyContacts = [];
    
    if (isDbConnected) {
        try {
            const response = await fetch(`${API_BASE}/emergency-contacts?email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                localEmergencyContacts = await response.json();
                renderEmergencyContactsList();
                return;
            }
        } catch (e) {
            console.error("Failed to read emergency contacts from API. Falling back to local storage.", e);
        }
    }
    
    // LocalStorage Fallback
    try {
        const stored = localStorage.getItem(`emergency_contacts_${userEmail}`);
        if (stored) {
            localEmergencyContacts = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Local storage error reading emergency contacts", e);
    }
    renderEmergencyContactsList();
}

// Add contact form submission handler
async function handleContactSubmit() {
    const nameInput = document.getElementById("contactName");
    const numInput = document.getElementById("contactNumber");
    if (!nameInput || !numInput) return;
    
    const name = nameInput.value.trim();
    const number = numInput.value.trim();
    const userEmail = currentUser ? currentUser.email : "evelyn@serenity.com";
    
    const btnSubmit = document.getElementById("btnAddContactSubmit");
    const originalHTML = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Adding...`;
    btnSubmit.disabled = true;
    
    let addedContact = null;
    let success = false;
    
    if (isDbConnected) {
        try {
            const response = await fetch(`${API_BASE}/emergency-contacts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-User-Email": userEmail
                },
                body: JSON.stringify({
                    contact_name: name,
                    contact_number: number,
                    user_email: userEmail
                })
            });
            const resData = await response.json();
            if (response.ok && resData.success) {
                addedContact = resData.contact;
                success = true;
            } else {
                alert(resData.error || "Failed to add emergency contact");
            }
        } catch (err) {
            console.error("API error adding emergency contact", err);
        }
    }
    
    // Local storage fallback
    if (!success) {
        addedContact = {
            id: Date.now(),
            contact_name: name,
            contact_number: number,
            user_email: userEmail
        };
        localEmergencyContacts.unshift(addedContact);
        try {
            localStorage.setItem(`emergency_contacts_${userEmail}`, JSON.stringify(localEmergencyContacts));
            success = true;
        } catch (err) {
            console.error("Local storage error saving emergency contacts", err);
        }
    } else {
        localEmergencyContacts.unshift(addedContact);
    }
    
    btnSubmit.innerHTML = originalHTML;
    btnSubmit.removeAttribute("disabled");
    
    if (success) {
        nameInput.value = "";
        numInput.value = "";
        renderEmergencyContactsList();
    }
}

// Delete contact handler
async function handleDeleteContact(id) {
    const userEmail = currentUser ? currentUser.email : "evelyn@serenity.com";
    let success = false;
    
    if (isDbConnected && typeof id === "number" && id < 100000000000) {
        try {
            const response = await fetch(`${API_BASE}/emergency-contacts/${id}`, {
                method: "DELETE",
                headers: {
                    "X-User-Email": userEmail
                }
            });
            if (response.ok) {
                success = true;
            }
        } catch (err) {
            console.error("API error deleting emergency contact", err);
        }
    }
    
    if (!success) {
        localEmergencyContacts = localEmergencyContacts.filter(c => c.id !== id);
        try {
            localStorage.setItem(`emergency_contacts_${userEmail}`, JSON.stringify(localEmergencyContacts));
            success = true;
        } catch (err) {
            console.error("LocalStorage write error deleting contact", err);
        }
    } else {
        localEmergencyContacts = localEmergencyContacts.filter(c => c.id !== id);
    }
    
    if (success) {
        renderEmergencyContactsList();
    }
}

// Render contacts list to the UI
function renderEmergencyContactsList() {
    const listContainer = document.getElementById("emergencyContactsList");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    if (localEmergencyContacts.length === 0) {
        listContainer.innerHTML = `
            <div class="contacts-placeholder">
                <i class="fa-solid fa-address-book"></i>
                <p>No emergency contacts added yet. Enter a contact name and number below to register one.</p>
            </div>
        `;
        return;
    }
    
    localEmergencyContacts.forEach(contact => {
        const item = document.createElement("div");
        item.className = "contact-item-card";
        
        item.innerHTML = `
            <div class="contact-details">
                <span class="contact-item-name">${escapeHTML(contact.contact_name)}</span>
                <span class="contact-item-number">${escapeHTML(contact.contact_number)}</span>
            </div>
            <button class="btn-delete-contact" title="Delete contact">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        
        const btnDelete = item.querySelector(".btn-delete-contact");
        btnDelete.addEventListener("click", () => {
            if (confirm(`Are you sure you want to remove ${contact.contact_name} from emergency contacts?`)) {
                handleDeleteContact(contact.id);
            }
        });
        
        listContainer.appendChild(item);
    });
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- Historical Stress Graph Rendering ---
async function loadAndRenderStressGraph() {
    let logsArray = [];
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const userEmail = currentUser ? currentUser.email : "";

    if (isDbConnected && userEmail) {
        try {
            const response = await fetch(`${API_BASE}/logs?month=${monthStr}&email=${encodeURIComponent(userEmail)}`);
            if (response.ok) {
                logsArray = await response.json();
            }
        } catch (e) {
            console.error("Error reading database logs for graph. Using local storage instead.", e);
            logsArray = getLocalLogsArray(monthStr);
        }
    } else {
        logsArray = getLocalLogsArray(monthStr);
    }

    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const dates = [];
    const stressValues = [];
    const logsByDate = {};

    logsArray.forEach(log => {
        logsByDate[log.log_date] = log;
    });

    let loggedDaysCount = 0;
    let sumStress = 0;
    let maxStress = 0;

    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(`${MONTH_NAMES[currentMonth - 1].substring(0, 3)} ${day}`);

        const log = logsByDate[dateStr];
        let stressIndex = 0;

        if (log) {
            if (log.stress_index && log.stress_index > 0) {
                stressIndex = parseFloat(log.stress_index);
            } else {
                const ageVal = (currentUser && currentUser.age) ? parseInt(currentUser.age) : 28;
                const hrvVal = log.hrv || 82;
                const simulatedHR = Math.round(110 - (hrvVal * 0.4));
                const simulatedTemp = 36.8;
                stressIndex = calculateLocalStressIndex(simulatedHR, hrvVal, simulatedTemp);
            }
            
            loggedDaysCount++;
            sumStress += stressIndex;
            if (stressIndex > maxStress) {
                maxStress = stressIndex;
            }
            stressValues.push(stressIndex);
        } else {
            stressValues.push(null);
        }
    }

    const avgStress = loggedDaysCount > 0 ? (sumStress / loggedDaysCount) : 0;

    const avgDisplay = document.getElementById("avgStressIndex");
    const avgStatusDisplay = document.getElementById("avgStressStatus");
    const peakDisplay = document.getElementById("peakStressIndex");
    const peakStatusDisplay = document.getElementById("peakStressStatus");
    const totalLoggedDisplay = document.getElementById("totalLoggedDays");

    if (avgDisplay) avgDisplay.innerText = avgStress.toFixed(1);
    if (peakDisplay) peakDisplay.innerText = maxStress.toFixed(1);
    if (totalLoggedDisplay) totalLoggedDisplay.innerText = loggedDaysCount;

    const getStatusText = (val) => {
        if (val === 0) return "No Data";
        if (val < 45) return "Low Stress (Calm)";
        if (val < 70) return "Medium Stress";
        return "High Stress";
    };

    const getStatusClass = (val) => {
        if (val === 0) return "gray";
        if (val < 45) return "low";
        if (val < 70) return "medium";
        return "high";
    };

    if (avgStatusDisplay) {
        avgStatusDisplay.innerText = getStatusText(avgStress);
        avgStatusDisplay.className = `metric-status ${getStatusClass(avgStress)}`;
    }
    if (peakStatusDisplay) {
        peakStatusDisplay.innerText = getStatusText(maxStress);
        peakStatusDisplay.className = `metric-status ${getStatusClass(maxStress)}`;
    }

    const ctx = document.getElementById('stressHistoryChart').getContext('2d');
    
    if (stressChartInstance) {
        stressChartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(90, 155, 115, 0.4)');
    gradient.addColorStop(1, 'rgba(90, 155, 115, 0.0)');

    stressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Stress Index',
                data: stressValues,
                borderColor: '#5a9b73',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#2e6f40',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(32, 33, 36, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    titleFont: {
                        family: 'Outfit',
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Inter'
                    },
                    padding: 12,
                    borderRadius: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let value = context.parsed.y;
                            let status = getStatusText(value);
                            return ` Stress Index: ${value.toFixed(1)} (${status})`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9aa0a6',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: '#9aa0a6',
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(232, 234, 237, 0.5)'
                    }
                }
            }
        }
    });
}

function getLocalLogsArray(monthStr) {
    const arr = [];
    const emailPrefix = currentUser ? `${currentUser.email}_` : "";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(`${emailPrefix}${monthStr}`)) {
            try {
                arr.push(JSON.parse(localStorage.getItem(key)));
            } catch (e) {
                console.error("Local storage read error for graph list", e);
            }
        }
    }
    return arr;
}

function calculateLocalStressIndex(hr, hrv, temp) {
    const baseline = 37.0;
    const deviation = Math.abs(temp - baseline);
    const tempNorm = Math.min(deviation * 20, 100);
    const index = (hr * 0.5) + ((100 - hrv) * 0.3) + (tempNorm * 0.2);
    return parseFloat(index.toFixed(2));
}

