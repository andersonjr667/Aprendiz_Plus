document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('postJobForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            title: document.getElementById('jobTitle').value,
            salary: parseFloat(document.getElementById('salary').value),
            workload: parseInt(document.getElementById('workload').value),
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            address: document.getElementById('address').value,
            education: document.getElementById('education').value,
            requirements: document.getElementById('requirements').value,
            description: document.getElementById('description').value,
            deadline: document.getElementById('deadline').value,
            startDate: document.getElementById('startDate').value,
            benefits: document.getElementById('benefits').value,
            status: 'aberta'
        };

        try {
            const response = await fetch('/api/jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao publicar vaga');
            }

            alert('Vaga publicada com sucesso!');
            window.location.href = '/empresas';
        } catch (error) {
            alert(error.message);
        }
    });

    // Formatação do campo de salário
    const salaryInput = document.getElementById('salary');
    salaryInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = (parseFloat(value) / 100).toFixed(2);
        e.target.value = value;
    });

    // Validação de datas
    const deadlineInput = document.getElementById('deadline');
    const startDateInput = document.getElementById('startDate');
    const today = new Date().toISOString().split('T')[0];
    
    deadlineInput.setAttribute('min', today);
    startDateInput.setAttribute('min', today);

    deadlineInput.addEventListener('change', () => {
        startDateInput.setAttribute('min', deadlineInput.value);
    });
});