const db = require('../data/db.json');
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '../data/db.json');

// Modelo de Localização Geográfica
class GeoLocation {
  // Calcular distância entre duas coordenadas (em km) usando fórmula de Haversine
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  static toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Geocoding aproximado (conversão de endereço para coordenadas)
  // Em produção, usar serviço como Google Maps Geocoding API
  static async geocodeAddress(address) {
    // Banco de dados simplificado de cidades brasileiras
    const brazilianCities = {
      'São Paulo': { lat: -23.5505, lng: -46.6333 },
      'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
      'Brasília': { lat: -15.8267, lng: -47.9218 },
      'Salvador': { lat: -12.9714, lng: -38.5014 },
      'Fortaleza': { lat: -3.7172, lng: -38.5433 },
      'Belo Horizonte': { lat: -19.9167, lng: -43.9345 },
      'Manaus': { lat: -3.1190, lng: -60.0217 },
      'Curitiba': { lat: -25.4284, lng: -49.2733 },
      'Recife': { lat: -8.0476, lng: -34.8770 },
      'Porto Alegre': { lat: -30.0346, lng: -51.2177 },
      'Goiânia': { lat: -16.6869, lng: -49.2648 },
      'Belém': { lat: -1.4558, lng: -48.5039 },
      'Guarulhos': { lat: -23.4538, lng: -46.5333 },
      'Campinas': { lat: -22.9099, lng: -47.0626 },
      'São Luís': { lat: -2.5307, lng: -44.3068 },
      'São Gonçalo': { lat: -22.8268, lng: -43.0539 },
      'Maceió': { lat: -9.6658, lng: -35.7353 },
      'Duque de Caxias': { lat: -22.7858, lng: -43.3054 },
      'Natal': { lat: -5.7945, lng: -35.2110 },
      'Campo Grande': { lat: -20.4697, lng: -54.6201 }
    };

    // Procurar cidade no endereço
    const addressUpper = address.toUpperCase();
    for (const [city, coords] of Object.entries(brazilianCities)) {
      if (addressUpper.includes(city.toUpperCase())) {
        return { ...coords, city };
      }
    }

    // Se não encontrar, retornar coordenadas padrão (São Paulo)
    return { lat: -23.5505, lng: -46.6333, city: 'Localização não especificada' };
  }

  // Buscar vagas próximas
  static async findNearbyJobs(latitude, longitude, maxDistance = 50, filters = {}) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.jobs) return [];

    // Considerar vários valores de status que representam vagas ativas
    const activeStatuses = ['active', 'aberta', 'open', 'available', 'ativo'];
    let jobs = dbData.jobs.filter(j => activeStatuses.includes((j.status || '').toString().toLowerCase()));

    // Aplicar filtros adicionais
    if (filters.title) {
      jobs = jobs.filter(j => 
        j.title.toLowerCase().includes(filters.title.toLowerCase())
      );
    }

    if (filters.category) {
      jobs = jobs.filter(j => j.category === filters.category);
    }

    if (filters.type) {
      jobs = jobs.filter(j => j.type === filters.type);
    }

    // Adicionar informações de distância para cada vaga
    const jobsWithDistance = await Promise.all(jobs.map(async (job) => {
      let jobLocation;
      
      if (job.latitude && job.longitude) {
        jobLocation = { lat: job.latitude, lng: job.longitude };
      } else if (job.location) {
        jobLocation = await this.geocodeAddress(job.location);
      } else {
        return null;
      }

      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        jobLocation.lat, 
        jobLocation.lng
      );

      return {
        ...job,
        distance: Math.round(distance * 10) / 10, // Arredondar para 1 casa decimal
        coordinates: jobLocation
      };
    }));

    // Filtrar vagas dentro do raio e remover nulos
    const nearbyJobs = jobsWithDistance
      .filter(j => j && j.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return nearbyJobs;
  }

  // Buscar candidatos próximos (para empresas)
  static async findNearbyCandidates(latitude, longitude, maxDistance = 50, filters = {}) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.users) return [];

    // Aceitar status em português/inglês para candidatos ativos
    const activeUserStatuses = ['active', 'ativo', 'available'];
    let candidates = dbData.users.filter(u => u.type === 'candidato' && activeUserStatuses.includes((u.status || '').toString().toLowerCase()));

    // Aplicar filtros
    if (filters.skills && filters.skills.length > 0) {
      candidates = candidates.filter(c => 
        c.skills && c.skills.some(skill => 
          filters.skills.some(fs => fs.toLowerCase() === skill.toLowerCase())
        )
      );
    }

    if (filters.experience) {
      candidates = candidates.filter(c => c.experience === filters.experience);
    }

    // Adicionar informações de distância
    const candidatesWithDistance = await Promise.all(candidates.map(async (candidate) => {
      let candidateLocation;
      
      if (candidate.latitude && candidate.longitude) {
        candidateLocation = { lat: candidate.latitude, lng: candidate.longitude };
      } else if (candidate.location) {
        candidateLocation = await this.geocodeAddress(candidate.location);
      } else {
        return null;
      }

      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        candidateLocation.lat, 
        candidateLocation.lng
      );

      return {
        id: candidate._id || candidate.id,
        name: candidate.name,
        profilePhoto: candidate.profilePhoto,
        skills: candidate.skills,
        experience: candidate.experience,
        bio: candidate.bio,
        rating: candidate.rating,
        distance: Math.round(distance * 10) / 10,
        coordinates: candidateLocation
      };
    }));

    // Filtrar candidatos dentro do raio
    const nearbyCandidates = candidatesWithDistance
      .filter(c => c && c.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return nearbyCandidates;
  }

  // Atualizar coordenadas de uma vaga
  static async updateJobLocation(jobId, latitude, longitude) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const jobIndex = dbData.jobs?.findIndex(j => j._id?.toString() === jobId || j.id === jobId);
    
    if (jobIndex === -1) return null;

    dbData.jobs[jobIndex].latitude = latitude;
    dbData.jobs[jobIndex].longitude = longitude;

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.jobs[jobIndex];
  }

  // Atualizar coordenadas de um usuário
  static async updateUserLocation(userId, latitude, longitude) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    const userIndex = dbData.users?.findIndex(u => u._id?.toString() === userId || u.id === userId);
    
    if (userIndex === -1) return null;

    dbData.users[userIndex].latitude = latitude;
    dbData.users[userIndex].longitude = longitude;

    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2));
    return dbData.users[userIndex];
  }

  // Obter pontos para mapa (clusters de vagas)
  static async getJobClusters(bounds, zoom = 10) {
    const dbData = JSON.parse(await fs.readFile(dbPath, 'utf8'));
    if (!dbData.jobs) return [];

    const activeStatuses2 = ['active', 'aberta', 'open', 'available', 'ativo'];
    let jobs = dbData.jobs.filter(j => activeStatuses2.includes((j.status || '').toString().toLowerCase()));

    // Filtrar por bounds se fornecido
    if (bounds) {
      jobs = jobs.filter(j => {
        if (!j.latitude || !j.longitude) return false;
        return j.latitude >= bounds.south && j.latitude <= bounds.north &&
               j.longitude >= bounds.west && j.longitude <= bounds.east;
      });
    }

    // Adicionar coordenadas para vagas que não têm
    const jobsWithCoords = await Promise.all(jobs.map(async (job) => {
      if (job.latitude && job.longitude) {
        return {
          id: job._id || job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          latitude: job.latitude,
          longitude: job.longitude,
          salary: job.salary,
          type: job.type
        };
      } else if (job.location) {
        const coords = await this.geocodeAddress(job.location);
        return {
          id: job._id || job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          latitude: coords.lat,
          longitude: coords.lng,
          salary: job.salary,
          type: job.type
        };
      }
      return null;
    }));

    return jobsWithCoords.filter(j => j !== null);
  }
}

module.exports = GeoLocation;
