/* global ol, window, document, navigator, alert */
// --- Mapa de Vagas OpenLayers ---
let map, currentLocation = { lat: -23.55052, lng: -46.633308 };

function displayMarkersOnMap(jobs) {
    // Remove existing markers
    if (window._olMarkersLayer) {
        map.removeLayer(window._olMarkersLayer);
    }
    const features = [];
    // Add user location marker
    const userFeature = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([currentLocation.lng, currentLocation.lat]))
    });
    userFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: '#1976d2' }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
    }));
    features.push(userFeature);
    // Add job markers
    jobs.forEach(job => {
        if (!job.coordinates) return;
        const jobFeature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([job.coordinates.lng, job.coordinates.lat])),
            name: job.title,
            company: job.company,
            distance: job.distance,
            id: job._id || job.id
        });
        jobFeature.setStyle(new ol.style.Style({
            image: new ol.style.Icon({
                src: 'https://cdn.jsdelivr.net/npm/ol@v7.4.0/examples/data/icon.png',
                scale: 0.7
            })
        }));
        features.push(jobFeature);
    });
    const vectorSource = new ol.source.Vector({ features });
    const vectorLayer = new ol.layer.Vector({ source: vectorSource });
    map.addLayer(vectorLayer);
    window._olMarkersLayer = vectorLayer;
}

function initMap() {
    map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([currentLocation.lng, currentLocation.lat]),
            zoom: 12
        })
    });
}

window.useMyLocation = function useMyLocation() {
    const btn = document.getElementById('btnUseLocation');
    if (!navigator.geolocation) {
        alert('Geolocalização não suportada.');
        return;
    }

    let watchId = null;
    let best = null; // store best position by accuracy
    const start = Date.now();
    const maxTime = 12000; // 12s max to try for better accuracy
    const maxSamples = 6;
    let samples = 0;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Obtendo localização...';
    }

    const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
    };

    function finish(position) {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
        };
        map.getView().setCenter(ol.proj.fromLonLat([currentLocation.lng, currentLocation.lat]));
        map.getView().setZoom(13);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-dot"></i> Usar Minha Localização';
        }
        updateNearbyJobs();
    }

    function success(pos) {
        samples++;
        // prefer positions with smaller accuracy
        if (!best || (pos.coords.accuracy && pos.coords.accuracy < (best.coords.accuracy || Infinity))) {
            best = pos;
        }

        const accuracy = pos.coords.accuracy || Infinity;
        // If accuracy is good enough (<100m) or we have collected enough samples or timed out, finish
        if (accuracy <= 100 || samples >= maxSamples || (Date.now() - start) > maxTime) {
            finish(best || pos);
        }
        // otherwise keep watching until conditions met
    }

    function error(err) {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-location-dot"></i> Usar Minha Localização';
        }
        console.warn('Geolocation error', err);
        alert('Não foi possível obter sua localização. Verifique permissões e tente novamente.');
    }

    // First try a one-time request with high accuracy and a short timeout
    navigator.geolocation.getCurrentPosition(function(pos) {
        // if the single read is accurate enough, finish immediately
        if (pos.coords.accuracy && pos.coords.accuracy <= 100) {
            finish(pos);
            return;
        }
        // else start watching for improvements
        best = pos;
        watchId = navigator.geolocation.watchPosition(success, error, options);
    }, function() {
        // fallback to watch (some browsers may fail getCurrentPosition if permissions dialog open)
        best = null;
        watchId = navigator.geolocation.watchPosition(success, error, options);
    }, options);
}

window.searchAddress = function searchAddress() {
    const address = document.getElementById('searchAddress').value;
    if (!address) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                currentLocation = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
                map.getView().setCenter(ol.proj.fromLonLat([currentLocation.lng, currentLocation.lat]));
                map.getView().setZoom(13);
                updateNearbyJobs();
            } else {
                alert('Endereço não encontrado.');
            }
        });
}

function updateNearbyJobs() {
    const maxDistance = document.getElementById('maxDistance').value;
    fetch(`/api/geo/jobs/nearby?latitude=${currentLocation.lat}&longitude=${currentLocation.lng}&maxDistance=${maxDistance}`)
        .then(async response => {
            if (!response.ok) {
                throw new Error('Erro na API: ' + response.status);
            }
            return response.json();
        })
        .then(jobs => {
            displayJobs(jobs);
            displayMarkersOnMap(jobs);
        })
        .catch((err) => {
            console.error('Erro ao buscar vagas próximas:', err);
            displayJobs([]);
            displayMarkersOnMap([]);
            const mapDiv = document.getElementById('map');
            if (mapDiv && !document.getElementById('map-error')) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'map-error';
                errorDiv.style.color = 'red';
                errorDiv.style.padding = '20px';
                errorDiv.textContent = 'Erro ao buscar vagas próximas. O mapa será exibido, mas sem vagas.';
                mapDiv.appendChild(errorDiv);
            }
        });
}

function displayJobs(jobs) {
    const container = document.getElementById('jobsList');
    container.innerHTML = '';
    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p style="color: #666;">Nenhuma vaga encontrada nas proximidades</p>';
        return;
    }
    jobs.forEach(job => {
        const div = document.createElement('div');
        div.className = 'job-list-item';
        div.onclick = () => focusOnJob(job);
        div.innerHTML = `
            <h4>${job.title}</h4>
            <p style="margin: 5px 0; color: #666;">${job.company || 'Empresa'}</p>
            <p style="margin: 5px 0; font-size: 0.9em;">${job.location}</p>
            <div class="job-distance">📍 ${job.distance} km de distância</div>
        `;
        container.appendChild(div);
    });
}



function focusOnJob(job) {
    if (job.coordinates) {
        map.getView().setCenter(ol.proj.fromLonLat([job.coordinates.lng, job.coordinates.lat]));
        map.getView().setZoom(15);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    try {
        initMap();
        updateNearbyJobs();
    } catch (e) {
        console.error('Erro ao inicializar o mapa:', e);
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerHTML = '<div style="color:red;padding:20px;">Erro ao carregar o mapa. Tente recarregar a página.</div>';
        }
    }
});
