// Certificates module for PyGateway Admin UI

// Use shared state - local helper functions
const getCertificatesFromState = () => window.AppState.certificates || [];
const setCertificatesInState = (data) => { window.AppState.certificates = data; };

// Certificates functions
function loadCertificates() {
    fetch(`${API_BASE_URL}/api/v1/certificates`)
        .then(response => response.json())
        .then(data => {
            setCertificatesInState(data);
            displayCertificates();
        })
        .catch(error => {
            document.getElementById('certificates-content').innerHTML = `
                <div class="error">Failed to load certificates: ${error.message}</div>
            `;
        });
}

function displayCertificates() {
    const content = document.getElementById('certificates-content');
    const certificates = getCertificatesFromState();

    // Normal certificates view - update header
    const certificatesSection = document.getElementById('certificates');
    const cardHeader = certificatesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <h2>Certificates</h2>
        <button class="btn btn-success" onclick="showCreateCertificateModal()">Add Certificate</button>
    `;

    if (certificates.length === 0) {
        content.innerHTML = '<p>No certificates found. Create your first certificate to get started.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Valid To</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${certificates.map(cert => {
                    return `
                        <tr>
                            <td>${cert.name}</td>
                            <td>${cert.date ? new Date(cert.date).toLocaleDateString() : ''}</td>
                            <td>
                                <button class="btn btn-primary" onclick="editCertificate('${cert.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteCertificate('${cert.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function deleteCertificate(certId) {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/certificates/${certId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        loadCertificates(); // Reload certificates list
    })
    .catch(error => {
        console.error('Error deleting certificate:', error);
        alert('Failed to delete certificate: ' + error.message);
    });
}

function editCertificate(certId) {
    const certificates = getCertificatesFromState();
    const cert = certificates.find(c => c.id === certId);

    if (!cert) {
        alert('Certificate not found');
        return;
    }

    // Pre-fill the form with certificate data
    const form = document.getElementById('createCertificateForm');
    if (form) {
        form.setAttribute('data-certificate-id', certId);
        document.getElementById('certificateName').value = cert.name;
        document.getElementById('certificateData').value = cert.data;
    }

    // Update modal title and button
    const modalTitle = document.querySelector('#createCertificateModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Certificate';
    }

    const submitButton = document.querySelector('#createCertificateForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Certificate';
    }

    // Show the modal
    const modal = document.getElementById('createCertificateModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Handle certificate form submission
function handleCertificateFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Remove date field so backend extracts it from certificate data
    delete data.date;

    // Validate certificate data presence
    if (!data.data || !data.data.includes('BEGIN CERTIFICATE')) {
        alert('Invalid certificate data. Please provide a valid PEM certificate.');
        return;
    }

    const certId = form.getAttribute('data-certificate-id');
    const isUpdate = !!certId;

    const url = isUpdate
        ? `${API_BASE_URL}/api/v1/certificates/${certId}`
        : `${API_BASE_URL}/api/v1/certificates/`;

    const method = isUpdate ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(() => {
        const modal = document.getElementById('createCertificateModal');
        if (modal) {
            modal.style.display = 'none';
        }
        loadCertificates(); // Reload certificates list
    })
    .catch(error => {
        console.error('Error creating/updating certificate:', error);
        alert(`Failed to ${isUpdate ? 'update' : 'create'} certificate: ${error.detail || error.message || 'Unknown error'}`);
    });
}

function showCreateCertificateModal() {
    // Reset the form and modal state
    const form = document.getElementById('createCertificateForm');
    if (form) {
        form.reset();
        form.removeAttribute('data-certificate-id');
    }

    // Reset modal title and button text
    const modalTitle = document.querySelector('#createCertificateModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create Certificate';
    }

    const submitButton = document.querySelector('#createCertificateForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Certificate';
    }

    // Show the modal
    const modal = document.getElementById('createCertificateModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Initialize form handler when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createCertificateForm');
    if (form) {
        form.addEventListener('submit', handleCertificateFormSubmit);
    }
});

// Export functions to global scope
window.loadCertificates = loadCertificates;
window.displayCertificates = displayCertificates;
window.deleteCertificate = deleteCertificate;
window.editCertificate = editCertificate;
window.showCreateCertificateModal = showCreateCertificateModal;

// Debug log
console.log('Certificates module loaded. showCreateCertificateModal available:', typeof window.showCreateCertificateModal);

// Register with module registry if available
if (window.ModuleRegistry) {
    window.ModuleRegistry.register('certificates', {
        loadCertificates: loadCertificates,
        displayCertificates: displayCertificates,
        deleteCertificate: deleteCertificate,
        editCertificate: editCertificate,
        showCreateCertificateModal: showCreateCertificateModal
    });
}