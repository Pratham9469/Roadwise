const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore, collection, onSnapshot, query, orderBy, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        const { getAuth, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        const firebaseConfig = {
            apiKey: "AIzaSyCLqpE2lSlor9X55Cfold-5ozfDp25Sm3s",
            authDomain: "roadwise-eb377.firebaseapp.com",
            projectId: "roadwise-eb377",
            storageBucket: "roadwise-eb377.firebasestorage.app",
            messagingSenderId: "49371864924",
            appId: "1:49371864924:web:ab0815f16a8f3df94deb99"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const auth = getAuth(app);
        const L = window.L;

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = "login.html";
            } else {
                document.getElementById('user-avatar').innerText = user.email.charAt(0).toUpperCase();
            }
        });

        window.toggleDarkMode = () => {
            document.documentElement.classList.toggle('dark-mode');
            const isDark = document.documentElement.classList.contains('dark-mode');
            document.getElementById('dark-mode-toggle').innerText = isDark ? '☀️' : '🌙';
        };

        // Global Search
        const globalSearch = document.getElementById('global-search');
        const globalResults = document.getElementById('global-search-results');

        globalSearch.addEventListener('input', async (e) => {
            const val = e.target.value;
            if (val.length < 3) { globalResults.style.display = 'none'; return; }
            try {
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
                const data = await res.json();
                globalResults.innerHTML = '';
                if (data.features.length > 0) {
                    globalResults.style.display = 'block';
                    data.features.forEach(f => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.innerText = `${f.properties.name || ""} ${f.properties.city || ""} ${f.properties.country || ""}`.trim();
                        div.onclick = () => {
                            map.flyTo([f.geometry.coordinates[1], f.geometry.coordinates[0]], 15);
                            globalSearch.value = div.innerText;
                            globalResults.style.display = 'none';
                        };
                        globalResults.appendChild(div);
                    });
                } else { globalResults.style.display = 'none'; }
            } catch (e) { }
        });

        document.addEventListener('click', (e) => {
            if (e.target !== globalSearch) globalResults.style.display = 'none';
            const dp = document.getElementById('profile-dropdown');
            if (dp && !e.target.closest('#profile-dropdown') && !e.target.closest('[onclick="toggleProfileDropdown(event)"]')) dp.style.display = 'none';
            const ndp = document.getElementById('notifications-dropdown');
            if (ndp && !e.target.closest('#notifications-dropdown') && !e.target.closest('[onclick="toggleNotificationsDropdown(event)"]')) ndp.style.display = 'none';
        });

        window.toggleProfileDropdown = (event) => {
            const dp = document.getElementById('profile-dropdown');
            dp.style.display = (dp.style.display === 'none' || !dp.style.display) ? 'block' : 'none';
            event.stopPropagation();
        };

        window.logOut = async () => { try { await signOut(auth); } catch (e) { } };

        // Map
        const map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
        L.control.zoom({ position: 'topright' }).addTo(map);

        // ── Tile layers ──
        const tileLayers = {
            street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri — Esri, Earthstar Geographics',
                maxZoom: 19
            })
        };

        let currentLayer = 'street';
        tileLayers.street.addTo(map);

        window.setMapLayer = (type) => {
            if (type === currentLayer) return;
            map.removeLayer(tileLayers[currentLayer]);
            tileLayers[type].addTo(map);
            currentLayer = type;
            document.getElementById('btn-street').classList.toggle('active', type === 'street');
            document.getElementById('btn-satellite').classList.toggle('active', type === 'satellite');
        };

        let allData = [], markers = [], heatmapLayer = null, isHeatmapActive = false;
        let isRouteActive = false, routingControl = null, severityChart = null, typeChart = null;
        let filteredData = [], userMarker = null;
        let routePolylines = [], routeEndMarkers = [];

        // ── NOTIFICATION STATE & FUNCTIONS ──
        let notifications = JSON.parse(localStorage.getItem('roadwise_notifications')) || [];

        window.toggleNotificationsDropdown = (event) => {
            const ndp = document.getElementById('notifications-dropdown');
            ndp.style.display = (ndp.style.display === 'none' || !ndp.style.display) ? 'flex' : 'none';
            event.stopPropagation();
            const pdp = document.getElementById('profile-dropdown');
            if (pdp) pdp.style.display = 'none';
        };

        window.markAllNotificationsAsRead = (event) => {
            if (event) event.stopPropagation();
            notifications.forEach(n => n.read = true);
            saveNotifications();
            renderNotifications();
        };

        function saveNotifications() {
            if (notifications.length > 50) {
                notifications = notifications.slice(0, 50);
            }
            localStorage.setItem('roadwise_notifications', JSON.stringify(notifications));
        }

        window.navigatePothole = (lat, lon) => {
            map.flyTo([lat, lon], 17);
            const m = markers.find(mk => {
                const ll = mk.getLatLng();
                return Math.abs(ll.lat - parseFloat(lat)) < 0.0001 && Math.abs(ll.lng - parseFloat(lon)) < 0.0001;
            });
            if (m) m.openPopup();
        };

        window.clickNotification = (id, lat, lon) => {
            const notif = notifications.find(n => n.id === id);
            if (notif) {
                notif.read = true;
                saveNotifications();
                renderNotifications();
            }
            const ndp = document.getElementById('notifications-dropdown');
            if (ndp) ndp.style.display = 'none';
            window.navigatePothole(lat, lon);
        };

        function addNotification(pothole, triggerToast = false) {
            if (notifications.some(n => n.potholeId === pothole.id)) return;

            const notif = {
                id: 'notif_' + pothole.id + '_' + Date.now(),
                potholeId: pothole.id,
                type: pothole.type || 'Pothole',
                severity: pothole.severity || 'LOW',
                lat: pothole.lat,
                lon: pothole.lon,
                timestamp: pothole.timestamp || Date.now(),
                read: false
            };

            notifications.unshift(notif);
            saveNotifications();
            renderNotifications();

            if (triggerToast) {
                showToastNotification(notif);
            }
        }

        function renderNotifications() {
            const listEl = document.getElementById('notifications-list');
            const badgeEl = document.getElementById('notification-badge');

            if (!listEl) return;
            listEl.innerHTML = '';

            const unreadCount = notifications.filter(n => !n.read).length;
            if (unreadCount > 0) {
                badgeEl.innerText = unreadCount;
                badgeEl.style.display = 'flex';
            } else {
                badgeEl.style.display = 'none';
            }

            if (notifications.length === 0) {
                listEl.innerHTML = '<div class="no-notifications">No notifications yet</div>';
                return;
            }

            notifications.forEach(n => {
                const item = document.createElement('div');
                item.className = 'notification-item' + (!n.read ? ' unread' : '');

                const isHigh = n.severity === 'HIGH';
                const isMedium = n.severity === 'MEDIUM';
                const bg = isHigh ? '#fef2f2' : (isMedium ? '#fffbeb' : '#ecfdf5');
                const emoji = isHigh ? '🚨' : (isMedium ? '⚠️' : '🔔');

                item.innerHTML = `
                    <div class="notification-icon-wrapper" style="background:${bg};">
                        ${emoji}
                    </div>
                    <div class="notification-info-body">
                        <div class="notification-title">${n.type} Detected</div>
                        <div class="notification-desc">
                            Severity: <strong style="color:${isHigh ? 'var(--danger)' : (isMedium ? 'var(--warning)' : 'var(--primary)')}">${n.severity}</strong><br>
                            📍 ${parseFloat(n.lat).toFixed(4)}° N, ${parseFloat(n.lon).toFixed(4)}° W
                        </div>
                        <span class="notification-time">${formatDate(n.timestamp)}</span>
                    </div>
                `;
                item.onclick = () => window.clickNotification(n.id, n.lat, n.lon);
                listEl.appendChild(item);
            });
        }

        function showToastNotification(notif) {
            const container = document.getElementById('notification-toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            const sevClass = notif.severity === 'HIGH' ? 'toast-high' : (notif.severity === 'MEDIUM' ? 'toast-medium' : 'toast-low');
            toast.className = `toast-notification ${sevClass}`;

            const isHigh = notif.severity === 'HIGH';
            const isMedium = notif.severity === 'MEDIUM';
            const bg = isHigh ? '#fef2f2' : (isMedium ? '#fffbeb' : '#ecfdf5');
            const emoji = isHigh ? '🚨' : (isMedium ? '⚠️' : '🔔');

            toast.innerHTML = `
                <button class="toast-close-btn" onclick="event.stopPropagation(); this.parentElement.style.animation='slideOutRight 0.3s forwards'; setTimeout(() => this.parentElement.remove(), 300);">✕</button>
                <div class="notification-icon-wrapper" style="background:${bg}; font-size: 16px; width: 36px; height: 36px;">
                    ${emoji}
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:700; font-size:13px; color:var(--dark); margin-bottom:2px;">New ${notif.type} Alert</div>
                    <div style="font-size:11.5px; color:var(--text-muted); line-height:1.3;">
                        Severity: <strong>${notif.severity}</strong><br>
                        📍 ${parseFloat(notif.lat).toFixed(4)}° N, ${parseFloat(notif.lon).toFixed(4)}° W
                    </div>
                </div>
            `;

            toast.onclick = () => {
                toast.style.animation = 'slideOutRight 0.3s forwards';
                setTimeout(() => toast.remove(), 300);
                window.clickNotification(notif.id, notif.lat, notif.lon);
            };

            container.appendChild(toast);

            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOutRight 0.3s forwards';
                    setTimeout(() => {
                        if (toast.parentElement) toast.remove();
                    }, 300);
                }
            }, 6000);
        }

        // Initialize notification UI on load
        renderNotifications();

        // Pagination
        let displayedCount = 10;
        const PAGE_SIZE = 10;

        // Repair status filter
        let activeStatusFilter = '';

        // Track previous snapshot counts for real trend badges
        let prevTotal = 0, prevHigh = 0, prevMedium = 0;
        let isFirstLoad = true;

        function showLoader(msg = "Processing...") {
            document.getElementById('loader-overlay').style.display = 'flex';
            document.getElementById('loader-message').innerText = msg;
        }
        function hideLoader() { document.getElementById('loader-overlay').style.display = 'none'; }

        window.switchTab = (tab) => {
            document.querySelectorAll('.tab-new').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');
            document.getElementById('overview-content').style.display = tab === 'overview' ? 'flex' : 'none';
            document.getElementById('route-content').style.display = tab === 'route' ? 'flex' : 'none';
            document.getElementById('analytics-content').style.display = tab === 'analytics' ? 'flex' : 'none';

            if (tab === 'overview') document.getElementById('overview-content').style.flexDirection = 'column';
            if (tab === 'route') {
                document.getElementById('route-content').style.flexDirection = 'column';
                isRouteActive = false;
                clearRouteLines();
                document.getElementById('safety-indicator').style.display = 'none';
                document.getElementById('route-stats').style.display = 'none';
                document.getElementById('path-potholes').style.display = 'none';
                updateUI(allData);
            }
            if (tab === 'analytics') {
                document.getElementById('analytics-content').style.flexDirection = 'column';
                showLoader("Loading Charts...");
                setTimeout(() => { initCharts(); updateCharts(allData); hideLoader(); }, 400);
            }
            setTimeout(() => map.invalidateSize(), 300);
        };

        window.toggleHeatmap = () => {
            isHeatmapActive = document.getElementById('heatmap-toggle-checkbox').checked;
            if (isHeatmapActive) {
                markers.forEach(m => map.removeLayer(m));
                heatmapLayer = L.heatLayer(allData.map(d => [d.lat, d.lon, 0.6]), { radius: 30, blur: 15 }).addTo(map);
            } else {
                if (heatmapLayer) map.removeLayer(heatmapLayer);
                updateUI(allData);
            }
        };

        const thumbMap = {
            'speed': 'https://static.vecteezy.com/system/resources/previews/021/506/339/large_2x/traffic-sign-regulatory-sign-free-png.png',
            'pothole': 'https://cdn-icons-png.flaticon.com/512/18215/18215529.png'
        };

        function getThumbEmoji(type) {
            const t = (type || '').toLowerCase();
            if (t.includes('speed')) return '🛑';
            if (t.includes('pothole')) return '🕳️';
            if (t.includes('sign')) return '🪧';
            return '🚧';
        }

        function getSevClass(sev) {
            if (sev === 'HIGH') return 'sev-critical';
            if (sev === 'MEDIUM') return 'sev-medium';
            return 'sev-low';
        }

        function getSevLabel(sev) {
            if (sev === 'HIGH') return 'Critical';
            if (sev === 'MEDIUM') return 'Medium Severity';
            return 'Low Severity';
        }

        function formatDate(ts) {
            const d = new Date(ts);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }

        // Helper: returns true if the detection type is a pothole (not a speedbump)
        function isPothole(type) {
            return !(type || '').toLowerCase().includes('speed');
        }

        window.loadMore = () => {
            displayedCount += PAGE_SIZE;
            renderDetectionList(filteredData.length > 0 || hasActiveFilters() ? filteredData : allData);
        };

        function hasActiveFilters() {
            return document.getElementById('filter-severity').value ||
                document.getElementById('filter-type').value ||
                document.getElementById('filter-date').value ||
                activeStatusFilter;
        }

        // ── Repair status helpers ──
        function getStatusClass(status) {
            if (status === 'in_progress') return 'status-progress';
            if (status === 'fixed') return 'status-fixed';
            return 'status-pending';
        }

        function getStatusLabel(status) {
            if (status === 'in_progress') return '🔧 In Progress';
            if (status === 'fixed') return '✅ Fixed';
            return '⏳ Pending';
        }

        // Update status in Firestore
        window.updateRepairStatus = async (docId, newStatus, selectEl) => {
            selectEl.className = 'status-select ' + getStatusClass(newStatus);
            try {
                await updateDoc(doc(db, 'potholes', docId), { repairStatus: newStatus });
            } catch (e) {
                console.error('Status update failed', e);
            }
        };

        // Filter detections by status chip click
        window.filterByStatus = (status) => {
            if (activeStatusFilter === status) {
                activeStatusFilter = '';
            } else {
                activeStatusFilter = status;
            }
            ['pending', 'progress', 'fixed'].forEach(s => {
                const mapKey = s === 'pending' ? 'pending' : s === 'progress' ? 'in_progress' : 'fixed';
                const chip = document.getElementById('chip-' + s);
                if (activeStatusFilter === mapKey) chip.classList.add('active-chip');
                else chip.classList.remove('active-chip');
            });
            displayedCount = PAGE_SIZE;
            applyFilters();
        };

        // Update the 3 status count chips — only counts potholes (speedbumps don't have repair status)
        function updateStatusCounts(dataList) {
            const potholeOnly = dataList.filter(d => isPothole(d.type));
            const pending = potholeOnly.filter(d => !d.repairStatus || d.repairStatus === 'pending').length;
            const inProgress = potholeOnly.filter(d => d.repairStatus === 'in_progress').length;
            const fixed = potholeOnly.filter(d => d.repairStatus === 'fixed').length;
            document.getElementById('count-pending').innerText = pending;
            document.getElementById('count-progress').innerText = inProgress;
            document.getElementById('count-fixed').innerText = fixed;
        }

        function renderDetectionList(dataList) {
            const listEl = document.getElementById('pothole-list');
            listEl.innerHTML = '';
            document.getElementById('showing-count').innerText = `Showing ${Math.min(displayedCount, dataList.length)} entries`;

            // Update status chips counts based on full allData (potholes only)
            updateStatusCounts(allData);

            const shown = dataList.slice(0, displayedCount);

            shown.forEach((data) => {
                const item = document.createElement('div');
                const repairStatus = data.repairStatus || 'pending';
                const isSpeedbump = !isPothole(data.type);

                // Only apply "is-fixed" dimming for potholes
                item.className = 'detection-item' + (!isSpeedbump && repairStatus === 'fixed' ? ' is-fixed' : '');

                const t = (data.type || '').toLowerCase();
                const thumbEmoji = getThumbEmoji(data.type);
                const thumbSrc = t.includes('speed') ? thumbMap.speed : thumbMap.pothole;
                const statusClass = getStatusClass(repairStatus);

                // ── KEY CHANGE: Status dropdown only renders for potholes, not speedbumps ──
                const statusDropdownHTML = !isSpeedbump ? `
                        <select
                            class="status-select ${statusClass}"
                            onchange="updateRepairStatus('${data.id}', this.value, this)"
                            onclick="event.stopPropagation()"
                        >
                            <option value="pending"     ${repairStatus === 'pending' ? 'selected' : ''}>⏳ Pending</option>
                            <option value="in_progress" ${repairStatus === 'in_progress' ? 'selected' : ''}>🔧 In Progress</option>
                            <option value="fixed"       ${repairStatus === 'fixed' ? 'selected' : ''}>✅ Fixed</option>
                        </select>` : '';

                item.innerHTML = `
                    <div class="detection-thumb">
                        <img src="${thumbSrc}" alt="" onerror="this.parentElement.innerHTML='${thumbEmoji}'" />
                    </div>
                    <div class="detection-body">
                        <div class="detection-name">${data.type || 'Unknown'}</div>
                        <div class="detection-meta">
                            <span>📍 ${parseFloat(data.lat).toFixed(4)}° N, ${parseFloat(data.lon).toFixed(4)}° W</span>
                        </div>
                        <div class="detection-meta" style="margin-top:2px;">
                            <span>🕐 ${formatDate(data.timestamp)}</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                        <span class="sev-pill ${getSevClass(data.severity)}">${getSevLabel(data.severity)}</span>
                        ${statusDropdownHTML}
                    </div>
                `;

                item.onclick = () => {
                    window.navigatePothole(data.lat, data.lon);
                };
                listEl.appendChild(item);
            });

            const loadMoreBtn = document.getElementById('load-more-btn');
            loadMoreBtn.style.display = dataList.length > displayedCount ? 'flex' : 'none';
        }

        function updateUI(dataList) {
            markers.forEach(m => map.removeLayer(m));
            markers = [];

            let counts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
            let sumIntensity = 0;

            dataList.forEach((data) => {
                const color = data.severity === "HIGH" ? "#ef4444" : (data.severity === "MEDIUM" ? "#f59e0b" : "#10b981");

                let iconUrl;
                if ((data.type || "").toLowerCase().includes("speed")) {
                    iconUrl = "https://static.vecteezy.com/system/resources/previews/021/506/339/large_2x/traffic-sign-regulatory-sign-free-png.png";
                } else {
                    iconUrl = "https://cdn-icons-png.flaticon.com/512/18215/18215529.png";
                }

                const basePinUrl = data.severity === "HIGH" ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png" :
                    (data.severity === "MEDIUM" ? "https://maps.google.com/mapfiles/ms/icons/orange-dot.png" :
                        "https://maps.google.com/mapfiles/ms/icons/green-dot.png");

                const divIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `
                        <div class="pulse" style="background:${color}"></div>
                        <img src="${basePinUrl}" style="width:32px; height:32px; position:absolute; left:-16px; top:-32px; z-index:1">
                        <img src="${iconUrl}" style="width:42px; height:42px; position:absolute; left:-21px; top:-70px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); z-index:2">
                    `,
                    iconSize: [0, 0]
                });

                if (!isHeatmapActive) {
                    const marker = L.marker([data.lat, data.lon], { icon: divIcon }).addTo(map);
                    const statusLabel = isPothole(data.type) ? getStatusLabel(data.repairStatus || 'pending') : 'N/A';
                    marker.bindPopup(`<b>${data.type}</b><br>Severity: ${data.severity}<br>Intensity: ${parseFloat(data.intensity).toFixed(2)}g${isPothole(data.type) ? '<br>Status: ' + statusLabel : ''}`);
                    markers.push(marker);
                }

                counts[data.severity]++;
                sumIntensity += parseFloat(data.intensity || 0);
            });

            document.getElementById('total-count').innerText = dataList.length;
            document.getElementById('high-count').innerText = counts.HIGH;
            document.getElementById('medium-count').innerText = counts.MEDIUM;
            document.getElementById('avg-intensity').innerText = dataList.length ? (sumIntensity / dataList.length).toFixed(1) + '%' : '0.0%';

            renderDetectionList(dataList);
        }

        // Autocomplete
        async function searchLocation(queryStr, listId) {
            if (queryStr.length < 3) return;
            try {
                const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(queryStr)}&limit=5`);
                const data = await res.json();
                const list = document.getElementById(listId);
                list.innerHTML = '';
                data.features.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = `${f.properties.name || ""} ${f.properties.city || ""} ${f.properties.country || ""}`.trim();
                    list.appendChild(opt);
                });
            } catch (e) { }
        }

        document.getElementById('origin-input').oninput = e => searchLocation(e.target.value, 'origin-list');
        document.getElementById('dest-input').oninput = e => searchLocation(e.target.value, 'dest-list');

        async function getCoords(str) {
            const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(str)}&limit=1`);
            const data = await res.json();
            if (!data.features.length) return null;
            const lat = data.features[0].geometry.coordinates[1];
            const lon = data.features[0].geometry.coordinates[0];
            try {
                const snapRes = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${lon},${lat}`);
                const snapData = await snapRes.json();
                if (snapData.waypoints && snapData.waypoints.length > 0) {
                    return L.latLng(snapData.waypoints[0].location[1], snapData.waypoints[0].location[0]);
                }
            } catch (e) { }
            return L.latLng(lat, lon);
        }

        // ── Route layer cleanup ──
        function clearRouteLines() {
            routePolylines.forEach(p => map.removeLayer(p));
            routePolylines = [];
            routeEndMarkers.forEach(m => map.removeLayer(m));
            routeEndMarkers = [];
            if (routingControl) { try { map.removeControl(routingControl); } catch (e) { } routingControl = null; }
        }

        // Decode OSRM polyline (precision 5)
        function decodePolyline(str) {
            let index = 0, lat = 0, lng = 0;
            const coords = [];
            while (index < str.length) {
                let b, shift = 0, result = 0;
                do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
                lat += (result & 1) ? ~(result >> 1) : (result >> 1);
                shift = 0; result = 0;
                do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
                lng += (result & 1) ? ~(result >> 1) : (result >> 1);
                coords.push(L.latLng(lat / 1e5, lng / 1e5));
            }
            return coords;
        }

        // Find all hazards within RADIUS metres of a decoded route
        const HAZARD_RADIUS = 80; // metres — how close is "on the route"
        function getHazardsOnRoute(coords) {
            const found = [];
            allData.forEach(h => {
                const hLL = L.latLng(h.lat, h.lon);
                for (let i = 0; i < coords.length; i++) {
                    if (hLL.distanceTo(coords[i]) < HAZARD_RADIUS) { found.push(h); break; }
                }
            });
            return found;
        }

        // Given a hazard LatLng and its nearest route point, compute an avoidance
        // waypoint offset ~150 m perpendicular to the road direction.
        function computeAvoidanceWaypoint(hazardLL, routeCoords) {
            // Find the closest route coord index
            let minDist = Infinity, closestIdx = 0;
            routeCoords.forEach((c, i) => {
                const d = hazardLL.distanceTo(c);
                if (d < minDist) { minDist = d; closestIdx = i; }
            });

            // Direction vector of road at that point
            const prev = routeCoords[Math.max(0, closestIdx - 1)];
            const next = routeCoords[Math.min(routeCoords.length - 1, closestIdx + 1)];
            const dLat = next.lat - prev.lat;
            const dLng = next.lng - prev.lng;
            const len = Math.sqrt(dLat * dLat + dLng * dLng) || 1;

            // Perpendicular unit vector (rotate 90°)
            const perpLat = -dLng / len;
            const perpLng = dLat / len;

            // Offset 0.0015° ≈ ~150 m — try both sides, pick farther from hazard
            const OFFSET = 0.0015;
            const c1 = L.latLng(hazardLL.lat + perpLat * OFFSET, hazardLL.lng + perpLng * OFFSET);
            const c2 = L.latLng(hazardLL.lat - perpLat * OFFSET, hazardLL.lng - perpLng * OFFSET);
            return c1.distanceTo(hazardLL) >= c2.distanceTo(hazardLL) ? c1 : c2;
        }

        // Snap a LatLng to the nearest drivable road via OSRM
        async function snapToRoad(ll) {
            try {
                const r = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${ll.lng},${ll.lat}`);
                const d = await r.json();
                if (d.waypoints && d.waypoints.length > 0) {
                    return L.latLng(d.waypoints[0].location[1], d.waypoints[0].location[0]);
                }
            } catch (e) { }
            return ll;
        }

        // Fetch a single OSRM route for an ordered array of LatLng waypoints
        async function fetchOSRMRoute(waypoints) {
            const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=polyline`;
            const res = await fetch(url);
            const data = await res.json();
            if (!data.routes || data.routes.length === 0) return null;
            return {
                coords: decodePolyline(data.routes[0].geometry),
                distance: data.routes[0].distance,
                duration: data.routes[0].duration
            };
        }

        document.getElementById('route-btn').onclick = async () => {
            const log = document.getElementById('status-log');
            const startVal = document.getElementById('origin-input').value;
            const endVal = document.getElementById('dest-input').value;
            if (!startVal || !endVal) { alert("Please enter both locations"); return; }

            showLoader("🔍 Finding safest path...");
            clearRouteLines();

            try {
                const start = await getCoords(startVal);
                const end = await getCoords(endVal);
                if (!start || !end) { hideLoader(); alert("Location not found. Please try a more specific name."); return; }

                log.innerText = "🔄 Calculating initial route...";

                // ── STEP 1: Get initial direct route ──
                let currentWaypoints = [start, end];
                let route = await fetchOSRMRoute(currentWaypoints);
                if (!route) { hideLoader(); log.innerText = "❌ No route found"; alert("No drivable road found."); return; }

                // ── STEP 2: Iteratively push waypoints around hazards (max 4 passes) ──
                const MAX_ITER = 4;
                let avoidedHazardIds = new Set();

                for (let iter = 0; iter < MAX_ITER; iter++) {
                    const hazards = getHazardsOnRoute(route.coords);
                    // Only process hazards not yet avoided
                    const newHazards = hazards.filter(h => !avoidedHazardIds.has(h.id));
                    if (newHazards.length === 0) break; // clean route!

                    log.innerText = `🔄 Pass ${iter + 1}: Avoiding ${newHazards.length} hazard(s)...`;

                    // Build avoidance waypoints for each new hazard
                    const avoidWPs = [];
                    for (const hazard of newHazards) {
                        const rawWP = computeAvoidanceWaypoint(L.latLng(hazard.lat, hazard.lon), route.coords);
                        const snapWP = await snapToRoad(rawWP);
                        avoidWPs.push({ hazard, wp: snapWP });
                        avoidedHazardIds.add(hazard.id);
                    }

                    // Sort avoidance waypoints by their position along the route (order matters for OSRM)
                    avoidWPs.sort((a, b) => {
                        const idxA = route.coords.findIndex(c => L.latLng(a.hazard.lat, a.hazard.lon).distanceTo(c) < HAZARD_RADIUS * 2);
                        const idxB = route.coords.findIndex(c => L.latLng(b.hazard.lat, b.hazard.lon).distanceTo(c) < HAZARD_RADIUS * 2);
                        return idxA - idxB;
                    });

                    // Rebuild waypoints: start → avoidance points → end
                    currentWaypoints = [start, ...avoidWPs.map(a => a.wp), end];

                    const newRoute = await fetchOSRMRoute(currentWaypoints);
                    if (!newRoute) break; // if detour fails, keep current best
                    route = newRoute;
                }

                // ── STEP 3: Final hazard check for the display ──
                const finalHazards = getHazardsOnRoute(route.coords);

                // Draw the route
                const poly = L.polyline(route.coords, { color: '#10b981', weight: 8, opacity: 0.92 }).addTo(map);
                routePolylines.push(poly);

                // Start / end markers
                const startM = L.marker(start, { zIndexOffset: 3000 }).addTo(map).bindPopup('<b>🚦 Start</b>');
                const endM = L.marker(end, { zIndexOffset: 3000 }).addTo(map).bindPopup('<b>🏁 Destination</b>');
                routeEndMarkers.push(startM, endM);

                map.fitBounds(poly.getBounds(), { padding: [40, 40] });

                if (finalHazards.length === 0) {
                    log.innerText = "✅ Hazard-free route found!";
                } else {
                    log.innerText = `⚠️ Best available — ${finalHazards.length} hazard(s) unavoidable`;
                }

                analyzeSafety({ coordinates: route.coords, hazards: finalHazards, summary: { totalDistance: route.distance } });
                hideLoader();

            } catch (err) {
                console.error(err);
                hideLoader();
                log.innerText = "❌ Route failed";
                alert("System error. Please try again.");
            }
        };

        window.recenterMap = () => {
            showLoader("📍 Getting your location...");
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude, lon = pos.coords.longitude;
                        map.setView([lat, lon], 16);
                        if (userMarker) userMarker.setLatLng([lat, lon]);
                        else userMarker = L.marker([lat, lon]).addTo(map);
                        userMarker.bindPopup("📍 You are here").openPopup();
                        hideLoader();
                    },
                    () => { hideLoader(); alert("GPS permission denied."); map.setView([20.5937, 78.9629], 5); }
                );
            } else { hideLoader(); map.setView([20.5937, 78.9629], 5); }
        };

        window.applyFilters = () => {
            displayedCount = PAGE_SIZE;
            const severity = document.getElementById('filter-severity').value;
            const type = document.getElementById('filter-type').value;
            const date = document.getElementById('filter-date').value;
            filteredData = allData.filter(d => {
                let match = true;
                if (severity && d.severity !== severity) match = false;
                if (type && !(d.type || "").toLowerCase().includes(type)) match = false;
                if (date && new Date(d.timestamp).toISOString().split('T')[0] !== date) match = false;
                if (activeStatusFilter) {
                    // Status filter only applies to potholes; speedbumps are excluded when filtering by status
                    if (!isPothole(d.type)) match = false;
                    else {
                        const ds = d.repairStatus || 'pending';
                        if (ds !== activeStatusFilter) match = false;
                    }
                }
                return match;
            });
            updateUI(filteredData);
        };

        window.resetFilters = () => {
            showLoader("🔄 Resetting...");
            document.getElementById('filter-severity').value = "";
            document.getElementById('filter-type').value = "";
            document.getElementById('filter-date').value = "";
            activeStatusFilter = '';
            ['pending', 'progress', 'fixed'].forEach(s => {
                document.getElementById('chip-' + s).classList.remove('active-chip');
            });
            displayedCount = PAGE_SIZE;
            filteredData = [];
            updateUI(allData);
            if (window.updateCharts) updateCharts(allData);
            setTimeout(hideLoader, 300);
        };

        window.initCharts = () => {
            if (severityChart) return;
            const sevCtx = document.getElementById('severityChart').getContext('2d');
            severityChart = new Chart(sevCtx, {
                type: 'doughnut',
                data: { labels: ['High', 'Medium', 'Low'], datasets: [{ data: [0, 0, 0], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, cutout: '65%' }
            });

            const barLabelsPlugin = {
                id: 'barLabels',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    chart.data.datasets.forEach((dataset, i) => {
                        chart.getDatasetMeta(i).data.forEach((bar, index) => {
                            const data = dataset.data[index];
                            if (data > 0) {
                                ctx.save(); ctx.fillStyle = '#1f2937'; ctx.font = 'bold 12px DM Sans';
                                ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
                                ctx.fillText(data, bar.x, bar.y - 5); ctx.restore();
                            }
                        });
                    });
                }
            };

            const typeCtx = document.getElementById('typeChart').getContext('2d');
            typeChart = new Chart(typeCtx, {
                type: 'bar',
                data: { labels: ['Pothole', 'Speedbump'], datasets: [{ label: 'Count', data: [0, 0], backgroundColor: ['#ef4444', '#3b82f6'], borderRadius: 6, borderWidth: 0 }] },
                options: { layout: { padding: { top: 20 } }, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } },
                plugins: [barLabelsPlugin]
            });
        };

        window.updateCharts = (dataList) => {
            if (!dataList) dataList = hasActiveFilters() ? filteredData : allData;
            if (!severityChart || !typeChart) return;
            let h = 0, m = 0, l = 0, potholes = 0, speedbumps = 0;
            dataList.forEach(d => {
                if (d.severity === 'HIGH') h++;
                else if (d.severity === 'MEDIUM') m++;
                else l++;
                if ((d.type || "").toLowerCase().includes("speed")) speedbumps++;
                else potholes++;
            });
            severityChart.data.datasets[0].data = [h, m, l];
            severityChart.data.labels = [`High: ${h}`, `Medium: ${m}`, `Low: ${l}`];
            severityChart.update();
            typeChart.data.datasets[0].data = [potholes, speedbumps];
            typeChart.update();
        };

        window.analyzeSafety = (route) => {
            if (!route || !route.coordinates) return;
            // Use pre-computed hazards if passed from multi-route picker, else scan live
            const routePotholes = route.hazards || (() => {
                const found = [];
                const dataToAnalyze = hasActiveFilters() ? filteredData : allData;
                dataToAnalyze.forEach(p => {
                    const pLL = L.latLng(p.lat, p.lon);
                    for (let i = 0; i < route.coordinates.length; i += 5) {
                        if (pLL.distanceTo(route.coordinates[i]) < 60) { found.push(p); break; }
                    }
                });
                return found;
            })();
            let high = 0, med = 0, low = 0;
            routePotholes.forEach(p => {
                if (p.severity === 'HIGH') high++;
                else if (p.severity === 'MEDIUM') med++;
                else low++;
            });

            document.getElementById('safety-indicator').style.display = 'block';
            document.getElementById('route-stats').style.display = 'block';
            document.getElementById('path-hazard-count').innerText = routePotholes.length;
            document.getElementById('path-distance').innerText = (route.summary.totalDistance / 1000).toFixed(1) + " km";
            document.getElementById('hazard-breakdown').style.display = 'flex';
            document.getElementById('path-high').innerText = high;
            document.getElementById('path-med').innerText = med;
            document.getElementById('path-low').innerText = low;

            let score = Math.max(0, 100 - (high * 10) - (med * 5) - (low * 2));
            document.getElementById('safety-score').innerText = score;
            const sInd = document.getElementById('safety-indicator');
            const sStat = document.getElementById('safety-status');
            const accTag = document.getElementById('accident-tag');
            sInd.className = 'safety-card';
            if (score >= 80) { sInd.classList.add('safety-safe'); sStat.innerText = 'Safe Route'; accTag.innerText = 'LOW PROBABILITY'; }
            else if (score >= 50) { sInd.classList.add('safety-moderate'); sStat.innerText = 'Moderate Risk'; accTag.innerText = 'MODERATE PROBABILITY'; }
            else { sInd.classList.add('safety-danger'); sStat.innerText = 'High Risk Route'; accTag.innerText = 'HIGH PROBABILITY'; }

            const pathDiv = document.getElementById('path-potholes');
            const pathList = document.getElementById('route-pothole-list');
            pathList.innerHTML = '';
            if (routePotholes.length > 0) {
                pathDiv.style.display = 'block';
                routePotholes.forEach(data => {
                    const item = document.createElement('div');
                    item.className = 'detection-item';
                    item.innerHTML = `
                        <div class="detection-thumb">${getThumbEmoji(data.type)}</div>
                        <div class="detection-body">
                            <div class="detection-name">${data.type}</div>
                            <div class="detection-meta">📍 ${parseFloat(data.lat).toFixed(4)}, ${parseFloat(data.lon).toFixed(4)}</div>
                        </div>
                        <span class="sev-pill ${getSevClass(data.severity)}">${getSevLabel(data.severity)}</span>
                    `;
                    pathList.appendChild(item);
                });
            } else { pathDiv.style.display = 'none'; }
        };

        window.exportData = () => {
            let csv = 'Type,Severity,Latitude,Longitude,Intensity,Timestamp\n';
            const dataToExport = hasActiveFilters() ? filteredData : allData;
            dataToExport.forEach(d => { csv += `${d.type},${d.severity},${d.lat},${d.lon},${d.intensity},${new Date(d.timestamp).toISOString()}\n`; });
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `roadwise_data_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        };

        // Trend badge helper
        function pctChange(curr, prev) {
            if (prev === 0) return null;
            const diff = curr - prev;
            const pct = Math.round((diff / prev) * 100);
            return (pct >= 0 ? '+' : '') + pct + '%';
        }

        function updateTrendBadge(elId, curr, prev) {
            const el = document.getElementById(elId);
            if (isFirstLoad) {
                el.innerText = curr > 0 ? `${curr} total` : 'No data';
                el.className = 'trend-badge trend-neutral';
            } else {
                const pct = pctChange(curr, prev);
                if (pct === null) {
                    el.innerText = curr > 0 ? `+${curr} new` : '–';
                    el.className = 'trend-badge trend-neutral';
                } else {
                    el.innerText = pct;
                    const isUp = curr >= prev;
                    el.className = 'trend-badge ' + (isUp ? 'trend-up' : 'trend-down');
                }
            }
        }

        // Firebase sync
        const q = query(collection(db, "potholes"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            const newData = [];
            snapshot.forEach(doc => newData.push({ id: doc.id, ...doc.data() }));

            // Process document changes for notifications
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = { id: change.doc.id, ...change.doc.data() };
                    if (isPothole(data.type)) {
                        addNotification(data, !isFirstLoad);
                    }
                }
            });

            const newTotal = newData.length;
            const newHigh = newData.filter(d => d.severity === 'HIGH').length;
            const newMedium = newData.filter(d => d.severity === 'MEDIUM').length;

            updateTrendBadge('total-trend', newTotal, prevTotal);
            updateTrendBadge('critical-trend', newHigh, prevHigh);
            updateTrendBadge('medium-trend', newMedium, prevMedium);

            prevTotal = newTotal;
            prevHigh = newHigh;
            prevMedium = newMedium;
            isFirstLoad = false;

            allData = newData;
            if (!isRouteActive) applyFilters();
            if (severityChart && !isRouteActive) updateCharts(allData);
        });