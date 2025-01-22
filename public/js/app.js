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

// Fetch results from API
async function fetchResults(page = 1) {
    try {
        const response = await fetch(`/api/results?page=${page}&limit=${resultsPerPage}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching results:', error);
        return null;
    }
}

// Render stats cards
function renderStats(stats) {
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

// Render results table
function renderResults(results) {
    resultsBody.innerHTML = results.map(result => `
        <tr>
            <td class="px-4">
                <strong>${moment(result.draw_date).format('DD MMM YYYY HH:mm')}</strong>
            </td>
            <td>
                <div class="d-flex gap-1">
                    ${JSON.parse(result.winning_numbers)[0].numbers.split(',').map(num => 
                        `<span class="badge rounded-pill bg-primary">${num}</span>`
                    ).join('')}
                </div>
            </td>
            <td>
                <span class="badge rounded-pill bg-success">
                    ${JSON.parse(result.winning_numbers)[0].bonus_number}
                </span>
            </td>
            <td>${result.jackpot_amount}</td>
            <td class="text-end px-4">
                <button class="btn btn-sm btn-outline-primary" onclick="showDetails('${result.id}')">
                    <i class="fas fa-eye me-1"></i>
                    View Details
                </button>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderPagination(pagination) {
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

// Load results
async function loadResults() {
    const data = await fetchResults(currentPage);
    if (data) {
        renderResults(data.results);
        renderPagination(data.pagination);
        renderStats({
            total: data.pagination.total,
            latest: data.results[0]
        });
        resultsCount.textContent = `Showing ${data.results.length} of ${data.pagination.total} results`;
    }
}

// Initial load
loadResults();
