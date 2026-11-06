// =====================================================================
// AEREOSUR FRONTEND APPLICATION LOGIC
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
    // API base URL (empty for relative requests served by same host)
    const API_BASE = "";

    // Application state
    let flights = [];
    let selectedFlightId = null;
    let selectedSeat = null;

    // Reglas de negocio y capacidades
    const ROLE_LIMITS = {
        "Capitán": 1,
        "Primer Oficial": 1,
        "Segundo Oficial": 1,
        "Comisario de Bordo": 1,
        "Azafata": 4
    };
    const MAX_TOTAL_CREW = 8;
    const MAX_PASSENGERS = 30;

    // DOM Elements
    const flightsListContainer = document.getElementById("flights-list-container");
    const flightSearchInput = document.getElementById("flight-search");
    const btnOpenFlightModal = document.getElementById("btn-open-flight-modal");

    // Stats elements
    const statTotalFlights = document.getElementById("stat-total-flights");
    const statTotalPassengers = document.getElementById("stat-total-passengers");
    const statTotalCrew = document.getElementById("stat-total-crew");
    const statTotalDestinations = document.getElementById("stat-total-destinations");

    // Details elements
    const detailsEmptyState = document.getElementById("details-empty-state");
    const flightDetailsContent = document.getElementById("flight-details-content");

    // Flight banner detail fields
    const detailFlightNumber = document.getElementById("detail-flight-number");
    const detailFlightStatus = document.getElementById("detail-flight-status");
    const detailOriginCode = document.getElementById("detail-origin-code");
    const detailOriginName = document.getElementById("detail-origin-name");
    const detailDestCode = document.getElementById("detail-dest-code");
    const detailDestName = document.getElementById("detail-dest-name");
    const detailAirline = document.getElementById("detail-airline");
    const detailDeparture = document.getElementById("detail-departure");
    const detailArrival = document.getElementById("detail-arrival");


    // Tabs
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    const crewTableBody = document.getElementById("crew-table-body");
    const passengerTableBody = document.getElementById("passenger-table-body");

    // Seat map
    const cabinSeatsGrid = document.getElementById("cabin-seats-grid");

    // Modal elements
    const modalFlight = document.getElementById("modal-flight");
    const modalCrew = document.getElementById("modal-crew");
    const modalPassenger = document.getElementById("modal-passenger");
    const modalPdf = document.getElementById("modal-pdf");

    const formNewFlight = document.getElementById("form-new-flight");
    const formNewCrew = document.getElementById("form-new-crew");
    const formNewPassenger = document.getElementById("form-new-passenger");

    const btnAddCrew = document.getElementById("btn-add-crew");
    const btnAddPassenger = document.getElementById("btn-add-passenger");

    // =====================================================================
    // CORE INITIALIZATION
    // =====================================================================

    loadFlights();
    setupEventListeners();

    // Re-initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // =====================================================================
    // EVENT LISTENERS Setup
    // =====================================================================
    function setupEventListeners() {
        // Search functionality
        flightSearchInput.addEventListener("input", filterFlights);

        // Modal Open Buttons
        const btnExportPdf = document.getElementById("btn-export-pdf");
        if (btnExportPdf) {
            btnExportPdf.addEventListener("click", openPdfModal);
        }

        const btnDoDownloadPdf = document.getElementById("btn-do-download-pdf");
        if (btnDoDownloadPdf) {
            btnDoDownloadPdf.addEventListener("click", executePdfDownload);
        }

        const btnPrintPdf = document.getElementById("btn-print-pdf");
        if (btnPrintPdf) {
            btnPrintPdf.addEventListener("click", () => window.print());
        }

        btnOpenFlightModal.addEventListener("click", () => openModal(modalFlight));
        
        btnAddCrew.addEventListener("click", () => {
            if (!selectedFlightId) {
                showToast("Selecciona un vuelo primero.", "warning");
                return;
            }
            const currentFlight = flights.find(f => f.id === selectedFlightId);
            if (!currentFlight) return;

            const now = new Date();
            const depDate = new Date(currentFlight.departure_time);
            const arrDate = new Date(currentFlight.arrival_time);
            if (now >= depDate && now <= arrDate) {
                showToast("No se pueden agregar tripulantes: el vuelo ya despegó y está en curso.", "warning");
                return;
            } else if (now > arrDate) {
                showToast("No se pueden agregar tripulantes: el vuelo ya finalizó su recorrido.", "warning");
                return;
            }

            if (currentFlight.crew.length >= MAX_TOTAL_CREW) {
                showToast(`Este vuelo ya tiene la tripulación completa (máximo ${MAX_TOTAL_CREW} tripulantes).`, "warning");
                return;
            }
            refreshCrewRoleSelect(currentFlight);
            openModal(modalCrew);
        });

        btnAddPassenger.addEventListener("click", () => {
            if (!selectedFlightId) {
                showToast("Selecciona un vuelo primero.", "warning");
                return;
            }
            const currentFlight = flights.find(f => f.id === selectedFlightId);
            if (!currentFlight) return;

            const now = new Date();
            const depDate = new Date(currentFlight.departure_time);
            const arrDate = new Date(currentFlight.arrival_time);
            if (now >= depDate && now <= arrDate) {
                showToast("No se pueden registrar pasajeros: el vuelo ya despegó y está en curso.", "warning");
                return;
            } else if (now > arrDate) {
                showToast("No se pueden registrar pasajeros: el vuelo ya finalizó su recorrido.", "warning");
                return;
            }

            if (currentFlight.passengers.length >= MAX_PASSENGERS) {
                showToast(`El vuelo ha alcanzado su capacidad máxima (${MAX_PASSENGERS} pasajeros).`, "warning");
                return;
            }
            // Auto fill the seat if selected, or warn
            const seatInput = document.getElementById("pass_seat");
            if (selectedSeat) {
                seatInput.value = selectedSeat;
            } else {
                seatInput.value = "";
                showToast("Sugerencia: Haz clic en un asiento disponible del mapa de cabina.", "info");
            }
            openModal(modalPassenger);
        });

        // Close Modal buttons (any element with class btn-close-modal)
        document.querySelectorAll(".btn-close-modal").forEach(btn => {
            btn.addEventListener("click", () => {
                closeModal(modalFlight);
                closeModal(modalCrew);
                closeModal(modalPassenger);
                if (modalPdf) closeModal(modalPdf);
            });
        });

        // Tab selection
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                const targetTab = button.getAttribute("data-tab");

                tabButtons.forEach(btn => btn.classList.remove("active"));
                tabContents.forEach(content => content.classList.remove("active"));

                button.classList.add("active");
                document.getElementById(`tab-${targetTab}`).classList.add("active");
            });
        });

        // Form Submissions
        formNewFlight.addEventListener("submit", handleFlightSubmit);
        formNewCrew.addEventListener("submit", handleCrewSubmit);
        formNewPassenger.addEventListener("submit", handlePassengerSubmit);
    }

    // =====================================================================
    // CORE API CALLS & DATA RENDERING
    // =====================================================================

    async function loadFlights() {
        try {
            const response = await fetch(`${API_BASE}/api/flights`);
            if (!response.ok) throw new Error("Error loading flights");

            flights = await response.json();
            renderStats();
            renderFlightsList();

            // If a flight was previously selected, re-select it to refresh details
            if (selectedFlightId) {
                const stillExists = flights.find(f => f.id === selectedFlightId);
                if (stillExists) {
                    selectFlight(selectedFlightId);
                } else {
                    selectedFlightId = null;
                    showDefaultState();
                }
            } else if (flights.length > 0) {
                // Select first flight by default on initial load
                selectFlight(flights[0].id);
            } else {
                showDefaultState();
            }

        } catch (error) {
            console.error(error);
            showToast("No se pudo conectar con el servidor.", "error");
        }
    }

    function renderStats() {
        let totalPassengers = 0;
        let totalCrew = 0;
        const destinationsSet = new Set();

        flights.forEach(f => {
            totalPassengers += f.passengers.length;
            totalCrew += f.crew.length;
            destinationsSet.add(f.destination);
        });

        statTotalFlights.textContent = flights.length;
        statTotalPassengers.textContent = totalPassengers;
        statTotalCrew.textContent = totalCrew;
        statTotalDestinations.textContent = destinationsSet.size;
    }

    function renderFlightsList() {
        flightsListContainer.innerHTML = "";

        if (flights.length === 0) {
            flightsListContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="plane"></i>
                    <p>No hay vuelos registrados.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const query = flightSearchInput.value.toLowerCase().trim();

        flights.forEach(flight => {
            // Filter search
            if (query) {
                const matchNumber = flight.flight_number.toLowerCase().includes(query);
                const matchAirline = flight.airline.toLowerCase().includes(query);
                const matchOrigin = flight.origin.toLowerCase().includes(query);
                const matchDest = flight.destination.toLowerCase().includes(query);
                if (!matchNumber && !matchAirline && !matchOrigin && !matchDest) {
                    return; // Skip
                }
            }

            const isSelected = flight.id === selectedFlightId;
            const flightItem = document.createElement("div");
            flightItem.className = `flight-item ${isSelected ? 'selected' : ''}`;
            flightItem.setAttribute("data-id", flight.id);

            const fNow = new Date();
            const fDep = new Date(flight.departure_time);
            const fArr = new Date(flight.arrival_time);
            let fStatusText = "Programado";
            let fStatusClass = "scheduled";
            if (fNow >= fDep && fNow <= fArr) {
                fStatusText = "En Vuelo";
                fStatusClass = "active";
            } else if (fNow > fArr) {
                fStatusText = "Finalizado";
                fStatusClass = "arrived";
            }

            flightItem.innerHTML = `
                <div class="flight-item-header">
                    <span class="flight-number-badge">${flight.flight_number}</span>
                    <span class="status-badge ${fStatusClass}" style="font-size: 0.65rem; padding: 2px 7px; margin-left: auto; margin-right: 6px;">${fStatusText}</span>
                    <span class="airline-tag">${flight.airline}</span>
                </div>
                <div class="flight-item-route">
                    <span class="route-text">${flight.origin}</span>
                    <i data-lucide="arrow-right" class="route-arrow"></i>
                    <span class="route-text">${flight.destination}</span>
                </div>
                <div class="flight-item-time">
                    <span>${formatDateShort(flight.departure_time)}</span>
                    <span class="btn-delete-row delete-flight-btn" title="Eliminar Vuelo" data-id="${flight.id}">
                        <i data-lucide="trash-2"></i>
                    </span>
                </div>
            `;

            // Click flight item to select
            flightItem.addEventListener("click", (e) => {
                // If clicked trash icon, don't select flight
                if (e.target.closest(".delete-flight-btn")) {
                    e.stopPropagation();
                    const flightId = parseInt(e.target.closest(".delete-flight-btn").getAttribute("data-id"));
                    confirmDeleteFlight(flightId);
                    return;
                }
                selectFlight(flight.id);
            });

            flightsListContainer.appendChild(flightItem);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function selectFlight(id) {
        selectedFlightId = id;
        selectedSeat = null; // Reset seat selection when changing flights

        // Highlight selected item in sidebar list
        document.querySelectorAll(".flight-item").forEach(item => {
            if (parseInt(item.getAttribute("data-id")) === id) {
                item.classList.add("selected");
            } else {
                item.classList.remove("selected");
            }
        });

        const flight = flights.find(f => f.id === id);
        if (!flight) return;

        // Hide empty state, show content wrapper
        detailsEmptyState.classList.add("hide");
        flightDetailsContent.classList.remove("hide");

        // Fill banner details
        detailFlightNumber.textContent = flight.flight_number;
        detailAirline.textContent = flight.airline;
        if (detailOriginName) detailOriginName.textContent = flight.origin;
        if (detailDestName) detailDestName.textContent = flight.destination;
        detailDeparture.textContent = formatDateTime(flight.departure_time);
        detailArrival.textContent = formatDateTime(flight.arrival_time);

        // Flight Status Calculation
        const now = new Date();
        const departureDate = new Date(flight.departure_time);
        const arrivalDate = new Date(flight.arrival_time);

        const statusBadge = detailFlightStatus;
        statusBadge.className = "status-badge"; // Reset classes
        let isClosed = false;
        let closedReason = "";

        if (now < departureDate) {
            statusBadge.textContent = "Programado";
            statusBadge.classList.add("scheduled");
            isClosed = false;
        } else if (now >= departureDate && now <= arrivalDate) {
            statusBadge.textContent = "En Vuelo";
            statusBadge.classList.add("active");
            isClosed = true;
            closedReason = "Vuelo en curso: Manifiesto cerrado y puertas bloqueadas.";
        } else {
            statusBadge.textContent = "Finalizado (Aterrizó)";
            statusBadge.classList.add("arrived");
            isClosed = true;
            closedReason = "Vuelo finalizado: Este vuelo ya completó su recorrido y está cerrado.";
        }

        // Lock / Unlock Action Buttons
        if (isClosed) {
            btnAddCrew.disabled = true;
            btnAddCrew.classList.add("disabled-action");
            btnAddCrew.setAttribute("title", closedReason);

            btnAddPassenger.disabled = true;
            btnAddPassenger.classList.add("disabled-action");
            btnAddPassenger.setAttribute("title", closedReason);
        } else {
            btnAddCrew.disabled = false;
            btnAddCrew.classList.remove("disabled-action");
            btnAddCrew.removeAttribute("title");

            btnAddPassenger.disabled = false;
            btnAddPassenger.classList.remove("disabled-action");
            btnAddPassenger.removeAttribute("title");
        }

        // Render Crew Table
        renderCrewTable(flight.crew, isClosed);

        // Render Passengers Table
        renderPassengerTable(flight.passengers, isClosed);

        // Update count badges
        const crewBadge = document.getElementById("crew-count-badge");
        if (crewBadge) {
            crewBadge.textContent = `(${flight.crew.length}/${MAX_TOTAL_CREW})`;
        }
        const passengerBadge = document.getElementById("passenger-count-badge");
        if (passengerBadge) {
            passengerBadge.textContent = `(${flight.passengers.length}/${MAX_PASSENGERS})`;
        }

        // Refresh crew roles in modal
        refreshCrewRoleSelect(flight);

        // Render Cabin Seat Map
        renderSeatMap(flight.passengers, isClosed);
    }

    function refreshCrewRoleSelect(flight) {
        const select = document.getElementById("crew_role");
        const tip = document.getElementById("crew-role-tip");
        if (!select || !flight) return;

        const crewRoles = flight.crew.map(c => c.role.trim());

        Array.from(select.options).forEach(opt => {
            if (!opt.value) return; // skip placeholder
            const role = opt.value;
            const limit = ROLE_LIMITS[role] || 1;
            const currentCount = crewRoles.filter(r => r.toLowerCase() === role.toLowerCase()).length;

            if (currentCount >= limit) {
                opt.disabled = true;
                opt.textContent = `${role} (Cupo Lleno: ${currentCount}/${limit})`;
            } else {
                opt.disabled = false;
                opt.textContent = `${role} (Disponible: ${currentCount}/${limit})`;
            }
        });

        if (select.selectedOptions.length > 0 && select.selectedOptions[0].disabled) {
            select.value = "";
        }

        const capitanCount = crewRoles.filter(r => r.toLowerCase() === "capitán").length;
        if (tip) {
            if (capitanCount >= 1) {
                tip.textContent = "Capitán ya asignado para este vuelo (1/1).";
            } else {
                tip.textContent = "Solo se permite 1 Capitán por vuelo.";
            }
        }
    }

    function showDefaultState() {
        detailsEmptyState.classList.remove("hide");
        flightDetailsContent.classList.add("hide");
        selectedFlightId = null;
    }

    function filterFlights() {
        renderFlightsList();
    }

    // =====================================================================
    // RENDER CREW & PASSENGERS TABLES
    // =====================================================================

    function renderCrewTable(crewList, isClosed = false) {
        crewTableBody.innerHTML = "";

        if (crewList.length === 0) {
            crewTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        No hay tripulantes registrados en este vuelo.
                    </td>
                </tr>
            `;
            return;
        }

        crewList.forEach(member => {
            const tr = document.createElement("tr");
            const actionHtml = isClosed ? `
                <span class="lock-indicator" title="Vuelo cerrado: No se pueden eliminar tripulantes">
                    <i data-lucide="lock" style="width: 15px; height: 15px;"></i>
                </span>
            ` : `
                <button class="btn-delete-row delete-crew-btn" data-id="${member.id}" title="Eliminar Tripulante">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            tr.innerHTML = `
                <td><strong>${member.passport}</strong></td>
                <td>${member.name}</td>
                <td>${member.nationality}</td>
                <td><span class="airline-tag">${member.role}</span></td>
                <td>${actionHtml}</td>
            `;

            if (!isClosed) {
                tr.querySelector(".delete-crew-btn").addEventListener("click", () => {
                    deleteCrewMember(member.id);
                });
            }

            crewTableBody.appendChild(tr);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function renderPassengerTable(passengerList, isClosed = false) {
        passengerTableBody.innerHTML = "";

        if (passengerList.length === 0) {
            passengerTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
                        No hay pasajeros registrados en este vuelo.
                    </td>
                </tr>
            `;
            return;
        }

        passengerList.forEach(pass => {
            const tr = document.createElement("tr");
            const actionHtml = isClosed ? `
                <span class="lock-indicator" title="Vuelo cerrado: No se pueden eliminar pasajeros">
                    <i data-lucide="lock" style="width: 15px; height: 15px;"></i>
                </span>
            ` : `
                <button class="btn-delete-row delete-pass-btn" data-id="${pass.id}" title="Eliminar Pasajero">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            tr.innerHTML = `
                <td><strong>${pass.passport}</strong></td>
                <td>${pass.first_name} ${pass.last_name}</td>
                <td>${pass.nationality}</td>
                <td><span class="flight-number-badge">Asiento ${pass.seat}</span></td>
                <td>${actionHtml}</td>
            `;

            if (!isClosed) {
                tr.querySelector(".delete-pass-btn").addEventListener("click", () => {
                    deletePassenger(pass.id);
                });
            }

            passengerTableBody.appendChild(tr);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =====================================================================
    // CABIN SEAT MAP RENDER
    // =====================================================================

    function renderSeatMap(passengers, isClosed = false) {
        cabinSeatsGrid.innerHTML = "";

        // Create dictionary of occupied seats for quick lookup
        const occupiedSeats = {};
        passengers.forEach(p => {
            occupiedSeats[p.seat.toString()] = `${p.first_name} ${p.last_name}`;
        });

        // Generate 5 rows of 6 seats each, making a total of 30 seats:
        const rows = 5;
        const colsPerRow = 6;

        for (let r = 0; r < rows; r++) {
            const seatRowDiv = document.createElement("div");
            seatRowDiv.className = "seat-row";

            // Row Label
            const rowLabel = document.createElement("span");
            rowLabel.className = "row-num";
            rowLabel.textContent = `F${r + 1}`;
            seatRowDiv.appendChild(rowLabel);

            // 6 Seats per row with an aisle in the middle (after 3 seats)
            for (let c = 0; c < colsPerRow; c++) {
                if (c === 3) {
                    const aisle = document.createElement("div");
                    aisle.className = "seat-aisle";
                    seatRowDiv.appendChild(aisle);
                }

                const seatNum = (r * colsPerRow + c + 1).toString();
                const seatButton = document.createElement("div");

                const isOccupied = seatNum in occupiedSeats;
                seatButton.className = `seat ${isOccupied ? 'occupied' : ''}`;

                if (selectedSeat === seatNum) {
                    seatButton.classList.add("selected");
                }

                seatButton.textContent = seatNum;

                if (isOccupied) {
                    seatButton.setAttribute("title", `Ocupado por: ${occupiedSeats[seatNum]}`);
                } else if (isClosed) {
                    seatButton.setAttribute("title", `Asiento ${seatNum} (Vuelo cerrado: asignación no disponible)`);
                    seatButton.style.cursor = "not-allowed";
                    seatButton.style.opacity = "0.45";
                } else {
                    seatButton.setAttribute("title", `Asiento ${seatNum} disponible`);

                    // Click handler for available seats
                    seatButton.addEventListener("click", () => {
                        // De-select previous
                        document.querySelectorAll(".seat").forEach(s => s.classList.remove("selected"));

                        if (selectedSeat === seatNum) {
                            // Toggle off
                            selectedSeat = null;
                        } else {
                            // Select new
                            selectedSeat = seatNum;
                            seatButton.classList.add("selected");
                            showToast(`Asiento ${seatNum} seleccionado. Abre "Agregar Pasajero" para registrarlo.`, "success");

                            // If modal is open, auto update seat input
                            const seatInput = document.getElementById("pass_seat");
                            if (seatInput) seatInput.value = seatNum;
                        }
                    });
                }

                seatRowDiv.appendChild(seatButton);
            }

            cabinSeatsGrid.appendChild(seatRowDiv);
        }
    }

    // =====================================================================
    // ACTIONS & SUBMISSIONS
    // =====================================================================

    async function handleFlightSubmit(e) {
        e.preventDefault();
        const formData = new FormData(formNewFlight);

        const flightNum = formData.get("flight_number").trim();
        const airline = formData.get("airline").trim();
        const origin = formData.get("origin").trim();
        const destination = formData.get("destination").trim();
        const depStr = formData.get("departure_time");
        const arrStr = formData.get("arrival_time");

        if (origin.toLowerCase() === destination.toLowerCase()) {
            showToast("El país de destino no puede ser igual al de origen.", "warning");
            return;
        }

        const depTime = new Date(depStr);
        const arrTime = new Date(arrStr);
        if (isNaN(depTime.getTime()) || isNaN(arrTime.getTime())) {
            showToast("Fechas u horas ingresadas no válidas.", "warning");
            return;
        }

        if (arrTime <= depTime) {
            showToast("La fecha y hora de llegada debe ser posterior a la de salida.", "warning");
            return;
        }

        const payload = {
            flight_number: flightNum,
            airline: airline,
            origin: origin,
            destination: destination,
            departure_time: depTime.toISOString(),
            arrival_time: arrTime.toISOString(),
            crew: [],
            passengers: []
        };

        try {
            const response = await fetch(`${API_BASE}/api/flights`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Error registrando el vuelo");
            }

            const created = await response.json();
            showToast("Vuelo registrado correctamente.", "success");
            closeModal(modalFlight);
            formNewFlight.reset();

            // Set the new flight as active
            selectedFlightId = created.id;
            loadFlights();

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    async function handleCrewSubmit(e) {
        e.preventDefault();
        if (!selectedFlightId) return;

        const currentFlight = flights.find(f => f.id === selectedFlightId);
        if (!currentFlight) return;

        const formData = new FormData(formNewCrew);
        const role = (formData.get("role") || "").trim();
        const passport = (formData.get("passport") || "").trim();
        const name = (formData.get("name") || "").trim();
        const nationality = (formData.get("nationality") || "").trim();

        if (!role) {
            showToast("Por favor selecciona un puesto/rol.", "warning");
            return;
        }

        const roleLimit = ROLE_LIMITS[role] || 1;
        const currentRoleCount = currentFlight.crew.filter(c => c.role.trim().toLowerCase() === role.toLowerCase()).length;
        if (currentRoleCount >= roleLimit) {
            showToast(`Límite alcanzado: este vuelo ya cuenta con ${currentRoleCount} ${role} (máximo permitido: ${roleLimit}).`, "error");
            return;
        }

        if (currentFlight.crew.length >= MAX_TOTAL_CREW) {
            showToast(`La tripulación de este vuelo está completa (máximo ${MAX_TOTAL_CREW} tripulantes).`, "error");
            return;
        }

        if (currentFlight.crew.some(c => c.passport.trim() === passport)) {
            showToast(`El pasaporte ${passport} ya pertenece a un tripulante en este vuelo.`, "warning");
            return;
        }
        if (currentFlight.passengers.some(p => p.passport.trim() === passport)) {
            showToast(`El pasaporte ${passport} ya está registrado como pasajero en este vuelo.`, "warning");
            return;
        }

        const payload = {
            passport: passport,
            name: name,
            nationality: nationality,
            role: role
        };

        try {
            const response = await fetch(`${API_BASE}/api/flights/${selectedFlightId}/crew`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Error registrando tripulante");
            }

            showToast("Miembro de tripulación agregado.", "success");
            closeModal(modalCrew);
            formNewCrew.reset();
            loadFlights(); // Reload all flight data

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    async function handlePassengerSubmit(e) {
        e.preventDefault();
        if (!selectedFlightId) return;

        const currentFlight = flights.find(f => f.id === selectedFlightId);
        if (!currentFlight) return;

        if (currentFlight.passengers.length >= MAX_PASSENGERS) {
            showToast(`El vuelo está completo (máximo ${MAX_PASSENGERS} pasajeros).`, "warning");
            return;
        }

        const formData = new FormData(formNewPassenger);
        const seatVal = (formData.get("seat") || "").trim();
        if (!seatVal) {
            showToast("Debes seleccionar un asiento disponible en el mapa.", "error");
            return;
        }

        const seatNum = parseInt(seatVal, 10);
        if (isNaN(seatNum) || seatNum < 1 || seatNum > MAX_PASSENGERS) {
            showToast(`El asiento debe ser un número entre 1 y ${MAX_PASSENGERS}.`, "error");
            return;
        }

        if (currentFlight.passengers.some(p => String(p.seat).trim() === seatVal)) {
            showToast(`El asiento ${seatVal} ya está ocupado en este vuelo.`, "error");
            return;
        }

        const passport = (formData.get("passport") || "").trim();
        if (currentFlight.passengers.some(p => p.passport.trim() === passport)) {
            showToast(`El pasaporte ${passport} ya pertenece a un pasajero en este vuelo.`, "warning");
            return;
        }
        if (currentFlight.crew.some(c => c.passport.trim() === passport)) {
            showToast(`El pasaporte ${passport} ya pertenece a un miembro de la tripulación en este vuelo.`, "warning");
            return;
        }

        const payload = {
            first_name: (formData.get("first_name") || "").trim(),
            last_name: (formData.get("last_name") || "").trim(),
            passport: passport,
            nationality: (formData.get("nationality") || "").trim(),
            seat: seatVal
        };

        try {
            const response = await fetch(`${API_BASE}/api/flights/${selectedFlightId}/passengers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Error registrando pasajero");
            }

            showToast("Pasajero registrado a bordo.", "success");
            closeModal(modalPassenger);
            formNewPassenger.reset();
            selectedSeat = null; // Clear seat selection
            loadFlights(); // Reload all flight data

        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    async function deleteCrewMember(id) {
        if (!confirm("¿Seguro que deseas remover este tripulante del vuelo?")) return;
        try {
            const response = await fetch(`${API_BASE}/api/crew/${id}`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error("Error removiendo tripulante");
            showToast("Tripulante removido del vuelo.", "success");
            loadFlights();
        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    async function deletePassenger(id) {
        if (!confirm("¿Seguro que deseas remover este pasajero del vuelo?")) return;
        try {
            const response = await fetch(`${API_BASE}/api/passengers/${id}`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error("Error removiendo pasajero");
            showToast("Pasajero removido del vuelo.", "success");
            selectedSeat = null; // Clear
            loadFlights();
        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    function confirmDeleteFlight(id) {
        if (!confirm("¿Estás seguro de que deseas eliminar permanentemente este vuelo, incluyendo su tripulación y pasajeros?")) return;
        deleteFlight(id);
    }

    async function deleteFlight(id) {
        try {
            const response = await fetch(`${API_BASE}/api/flights/${id}`, {
                method: "DELETE"
            });
            if (!response.ok) throw new Error("Error eliminando vuelo");

            showToast("Vuelo eliminado permanentemente.", "success");
            if (selectedFlightId === id) {
                selectedFlightId = null;
            }
            loadFlights();
        } catch (error) {
            console.error(error);
            showToast(error.message, "error");
        }
    }

    // =====================================================================
    // UI ANIMATION AND COMPONENT HELPERS
    // =====================================================================

    function openModal(modal) {
        modal.classList.remove("hide");
    }

    function closeModal(modal) {
        modal.classList.add("hide");
    }

    function showToast(message, type = "info") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;

        let icon = "info";
        if (type === "success") icon = "check-circle";
        if (type === "error") icon = "alert-circle";
        if (type === "warning") icon = "alert-triangle";

        toast.innerHTML = `
            <i data-lucide="${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Auto remove toast
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    // Helper functions for date formatting
    function formatDateShort(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function formatDateTime(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        const datePart = date.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${datePart} ${hours}:${minutes}`;
    }

    // =====================================================================
    // MANIFIESTO PDF (CASO 4): VISTA PREVIA Y DESCARGA
    // =====================================================================
    function openPdfModal() {
        if (!selectedFlightId) {
            showToast("Selecciona un vuelo de la lista primero.", "warning");
            return;
        }

        const flight = flights.find(f => f.id === selectedFlightId);
        if (!flight) return;

        // Cargar datos en la hoja del manifiesto
        const elFlight = document.getElementById("pdf-val-flight");
        const elAirline = document.getElementById("pdf-val-airline");
        const elOrigin = document.getElementById("pdf-val-origin");
        const elDest = document.getElementById("pdf-val-dest");
        const elDep = document.getElementById("pdf-val-dep");
        const elArr = document.getElementById("pdf-val-arr");

        if (elFlight) elFlight.textContent = flight.flight_number;
        if (elAirline) elAirline.textContent = flight.airline;
        if (elOrigin) elOrigin.textContent = flight.origin;
        if (elDest) elDest.textContent = flight.destination;
        if (elDep) elDep.textContent = formatDateTime(flight.departure_time);
        if (elArr) elArr.textContent = formatDateTime(flight.arrival_time);

        // Cargar tripulación
        const crewBody = document.getElementById("pdf-crew-body");
        if (crewBody) {
            if (flight.crew.length === 0) {
                crewBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #666;">Sin tripulación registrada</td></tr>`;
            } else {
                crewBody.innerHTML = flight.crew.map(c => `
                    <tr>
                        <td>${c.passport}</td>
                        <td style="text-align: left;">${c.name}</td>
                        <td>${c.nationality}</td>
                        <td>${c.role}</td>
                    </tr>
                `).join("");
            }
        }

        // Cargar pasajeros
        const passBody = document.getElementById("pdf-pass-body");
        if (passBody) {
            if (flight.passengers.length === 0) {
                passBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #666;">Sin pasajeros registrados</td></tr>`;
            } else {
                passBody.innerHTML = flight.passengers.map(p => `
                    <tr>
                        <td style="text-align: left;">${p.first_name}</td>
                        <td style="text-align: left;">${p.last_name}</td>
                        <td>${p.nationality}</td>
                        <td>${p.seat}</td>
                        <td>${p.passport}</td>
                    </tr>
                `).join("");
            }
        }

        // Abrir modal y refrescar íconos
        openModal(modalPdf);
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function executePdfDownload() {
        if (!selectedFlightId) return;
        const flight = flights.find(f => f.id === selectedFlightId);
        if (!flight) return;

        const renderArea = document.getElementById("pdf-render-area");
        if (!renderArea) {
            showToast("No se encontró el área de impresión.", "error");
            return;
        }

        if (typeof html2pdf === "undefined") {
            showToast("Librería html2pdf no disponible. Abriendo diálogo de impresión...", "warning");
            window.print();
            return;
        }

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Manifiesto_Vuelo_${flight.flight_number}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        showToast("Generando archivo PDF...", "info");

        html2pdf().set(opt).from(renderArea).save().then(() => {
            showToast("¡PDF descargado con éxito!", "success");
        }).catch(err => {
            console.error("Error html2pdf:", err);
            showToast("Hubo un detalle al guardar. Abriendo menú de impresión...", "warning");
            window.print();
        });
    }

    // Exponer globalmente si es necesario
    window.openPdfModal = openPdfModal;
    window.executePdfDownload = executePdfDownload;
});