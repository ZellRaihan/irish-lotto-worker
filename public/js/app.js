// Set timezone to Irish time
moment.tz.setDefault('Europe/Dublin');

// Global state
let currentPage = 1;
const resultsPerPage = 10;

// Elements
const resultsBody = document.getElementById('results-body');
const pagination = document.getElementById('pagination');
const statsContainer = document.getElementById('stats-container');
const resultsCount = document.getElementById('results-count');
const modalContent = document.getElementById('modal-content');
const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
const fetchResultsBtn = document.getElementById('fetchResultsBtn');

// Fetch results from API
async function fetchResults(page = 1) {
    try {
        const response = await fetch(`/api/results?page=${page}&limit=10`);
        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching results:', error);
        showAlert('danger', 'Error fetching results: ' + error.message);
        return null;
    }
}

// Display results in table
function displayResults(results) {
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = '';

    if (!results || !results.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No results found</td></tr>';
        return;
    }

    results.forEach(result => {
        const drawDate = new Date(result.draw_date);
        const winningNumbers = JSON.parse(result.winning_numbers);
        const mainNumbers = JSON.parse(winningNumbers[0].numbers).join(', ');
        const bonusNumber = winningNumbers[0].bonus_number;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${drawDate.toLocaleDateString('en-IE', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            })}</td>
            <td>${mainNumbers}</td>
            <td>${bonusNumber}</td>
            <td>€${(result.jackpot_amount / 100).toLocaleString('en-IE', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}</td>
            <td>
                <button class="btn btn-sm btn-primary view-details" data-result-id="${result.id}">
                    View Details
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load results and update UI
async function loadResults(page = 1) {
    console.log('Loading results for page:', page);
    const resultsTable = document.querySelector('#results-table tbody');
    resultsTable.innerHTML = '<tr><td colspan="5" class="text-center">Loading results...</td></tr>';

    try {
        const data = await fetchResults(page);
        console.log('Results data:', data);
        
        if (!data) {
            showAlert('danger', 'Failed to load results');
            return;
        }

        displayResults(data.results);
        updatePagination(data.pagination);
        updateStats(data.results);
    } catch (error) {
        console.error('Error loading results:', error);
        showAlert('danger', 'Error loading results: ' + error.message);
    }
}

// Render stats cards
function updateStats(stats) {
    const { total, latest } = stats;
    statsContainer.innerHTML = `
        <div class="col-md-4">
            <div class="card stats-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-chart-bar text-primary fa-2x me-3"></i>
                        <h5 class="card-title mb-0">Total Draws</h5>
                    </div>
                    <p class="display-6 mb-0 text-primary">${total.toLocaleString()}</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card stats-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-euro-sign text-success fa-2x me-3"></i>
                        <h5 class="card-title mb-0">Latest Jackpot</h5>
                    </div>
                    <p class="display-6 mb-0 text-success">${latest.jackpot_amount}</p>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card stats-card shadow-sm h-100">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <i class="fas fa-calendar text-info fa-2x me-3"></i>
                        <h5 class="card-title mb-0">Last Draw Date</h5>
                    </div>
                    <p class="display-6 mb-0 text-info">${moment(latest.draw_date).format('DD MMM YYYY')}</p>
                </div>
            </div>
        </div>
    `;
}

// Render pagination
function updatePagination(pagination) {
    const { page, totalPages } = pagination;
    let paginationHtml = '';

    // Previous button
    paginationHtml += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${page - 1})">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= page - 2 && i <= page + 2)
        ) {
            paginationHtml += `
                <li class="page-item ${page === i ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (
            i === page - 3 || 
            i === page + 3
        ) {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }

    // Next button
    paginationHtml += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${page + 1})">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    pagination.innerHTML = paginationHtml;
}

// Show result details in modal
async function showDetails(resultId) {
    try {
        const response = await fetch(`/api/results/${resultId}`);
        const result = await response.json();
        
        modalContent.innerHTML = `
            <div class="mb-4">
                <h6 class="text-muted mb-2">Draw Date</h6>
                <p class="h4">${moment(result.draw_date).format('DD MMM YYYY HH:mm')}</p>
            </div>
            
            <div class="mb-4">
                <h6 class="text-muted mb-2">Winning Numbers</h6>
                <div class="d-flex gap-2 mb-3">
                    ${JSON.parse(result.winning_numbers)[0].numbers.split(',').map(num => 
                        `<span class="badge rounded-pill bg-primary">${num}</span>`
                    ).join('')}
                    <span class="badge rounded-pill bg-success">
                        ${JSON.parse(result.winning_numbers)[0].bonus_number}
                    </span>
                </div>
            </div>

            <div class="mb-4">
                <h6 class="text-muted mb-2">Prize Breakdown</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Match</th>
                                <th>Winners</th>
                                <th>Prize</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${JSON.parse(result.prize_breakdown).map(prize => `
                                <tr>
                                    <td>${prize.match_type}</td>
                                    <td>${prize.winners}</td>
                                    <td>${prize.prize_amount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        resultModal.show();
    } catch (error) {
        console.error('Error fetching result details:', error);
    }
}

// Change page
async function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    await loadResults();
}

// Fetch Results Button Handler
fetchResultsBtn.addEventListener('click', async () => {
    console.log('Fetch button clicked');
    try {
        fetchResultsBtn.disabled = true;
        fetchResultsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
        
        console.log('Making fetch request...');
        const response = await fetch('/api/fetch-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Response received:', response.status);
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            showAlert('success', data.message);
            console.log('Refreshing results...');
            currentPage = 1;
            await loadResults();
        } else {
            showAlert('danger', data.message || 'Failed to fetch results');
        }
    } catch (error) {
        console.error('Error in fetch button handler:', error);
        showAlert('danger', 'Error fetching results: ' + error.message);
    } finally {
        fetchResultsBtn.disabled = false;
        fetchResultsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Fetch Latest Results';
    }
});

// Alert function
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

// Initial load
loadResults();
