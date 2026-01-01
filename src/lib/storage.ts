import { Person, Resident, Visit, VehicleTrip, ResidentExit, User, Vehicle, InstitutionSettings } from '@/types';

const STORAGE_KEYS = {
  PERSONS: 'asilo_dom_bosco_persons',
  RESIDENTS: 'asilo_dom_bosco_residents',
  VISITS: 'asilo_dom_bosco_visits',
  VEHICLE_TRIPS: 'asilo_dom_bosco_vehicle_trips',
  RESIDENT_EXITS: 'asilo_dom_bosco_resident_exits',
  USERS: 'asilo_dom_bosco_users',
  CURRENT_USER: 'asilo_dom_bosco_current_user',
  VEHICLES: 'asilo_dom_bosco_vehicles',
  INSTITUTION: 'asilo_dom_bosco_institution',
};

// Generic storage helpers
function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Simple hash for offline password storage
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Users
export function getUsers(): User[] {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function deleteUser(id: string): void {
  const users = getUsers().filter(u => u.id !== id);
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function getUserByUsername(username: string): User | undefined {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

export function authenticateUser(username: string, password: string): User | null {
  const user = getUserByUsername(username);
  if (user && user.ativo && user.password === simpleHash(password)) {
    return user;
  }
  return null;
}

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function initializeAdminUser(): void {
  const users = getUsers();
  if (users.length === 0) {
    const adminUser: User = {
      id: crypto.randomUUID(),
      username: 'admin',
      password: simpleHash('admin123'),
      nome: 'Administrador',
      role: 'admin',
      ativo: true,
      createdAt: new Date().toISOString(),
    };
    saveUser(adminUser);
  }
}

// Institution Settings
export function getInstitutionSettings(): InstitutionSettings | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INSTITUTION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function saveInstitutionSettings(settings: InstitutionSettings): void {
  localStorage.setItem(STORAGE_KEYS.INSTITUTION, JSON.stringify(settings));
}

// Vehicles
export function getVehicles(): Vehicle[] {
  return getFromStorage<Vehicle>(STORAGE_KEYS.VEHICLES);
}

export function saveVehicle(vehicle: Vehicle): void {
  const vehicles = getVehicles();
  const index = vehicles.findIndex(v => v.id === vehicle.id);
  if (index >= 0) {
    vehicles[index] = vehicle;
  } else {
    vehicles.push(vehicle);
  }
  saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
}

export function deleteVehicle(id: string): void {
  const vehicles = getVehicles().filter(v => v.id !== id);
  saveToStorage(STORAGE_KEYS.VEHICLES, vehicles);
}

export function getVehicleById(id: string): Vehicle | undefined {
  return getVehicles().find(v => v.id === id);
}

export function getActiveVehicles(): Vehicle[] {
  return getVehicles().filter(v => v.ativo);
}

// Persons
export function getPersons(): Person[] {
  return getFromStorage<Person>(STORAGE_KEYS.PERSONS);
}

export function savePerson(person: Person): void {
  const persons = getPersons();
  const index = persons.findIndex(p => p.id === person.id);
  if (index >= 0) {
    persons[index] = { ...person, updatedAt: new Date().toISOString() };
  } else {
    persons.push(person);
  }
  saveToStorage(STORAGE_KEYS.PERSONS, persons);
}

export function deletePerson(id: string): void {
  const persons = getPersons().filter(p => p.id !== id);
  saveToStorage(STORAGE_KEYS.PERSONS, persons);
}

export function getPersonById(id: string): Person | undefined {
  return getPersons().find(p => p.id === id);
}

export function searchPersons(query: string): Person[] {
  const q = query.toLowerCase();
  return getPersons().filter(p => 
    p.nome.toLowerCase().includes(q) || 
    p.cpf.includes(q) ||
    p.rg.includes(q)
  );
}

// Residents
export function getResidents(): Resident[] {
  return getFromStorage<Resident>(STORAGE_KEYS.RESIDENTS);
}

export function saveResident(resident: Resident): void {
  const residents = getResidents();
  const index = residents.findIndex(r => r.id === resident.id);
  if (index >= 0) {
    residents[index] = resident;
  } else {
    residents.push(resident);
  }
  saveToStorage(STORAGE_KEYS.RESIDENTS, residents);
}

export function deleteResident(id: string): void {
  const residents = getResidents().filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.RESIDENTS, residents);
}

export function getResidentById(id: string): Resident | undefined {
  return getResidents().find(r => r.id === id);
}

export function importResidentsFromJSON(jsonData: string): { success: number; errors: number } {
  try {
    const data = JSON.parse(jsonData);
    const residents = Array.isArray(data) ? data : data.residents || [];
    let success = 0;
    let errors = 0;
    
    residents.forEach((r: Partial<Resident>) => {
      try {
        if (r.nome) {
          const resident: Resident = {
            id: r.id || crypto.randomUUID(),
            nome: r.nome,
            quarto: r.quarto || '',
            foto: r.foto,
            observacoes: r.observacoes,
            ativo: r.ativo !== undefined ? r.ativo : true,
            autorizadoSaidaTemporaria: r.autorizadoSaidaTemporaria || false,
            diasSaidaPermitidos: r.diasSaidaPermitidos,
            horarioSaidaPermitido: r.horarioSaidaPermitido,
            horarioRetornoPermitido: r.horarioRetornoPermitido,
            createdAt: r.createdAt || new Date().toISOString(),
          };
          saveResident(resident);
          success++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    });
    
    return { success, errors };
  } catch {
    return { success: 0, errors: 1 };
  }
}

export function importResidentsFromCSV(csvData: string): { success: number; errors: number } {
  try {
    const lines = csvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { success: 0, errors: 0 };
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    let success = 0;
    let errors = 0;
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => {
          record[h] = values[idx] || '';
        });
        
        const nome = record.nome || record.name || record['nome completo'];
        if (nome) {
          const resident: Resident = {
            id: crypto.randomUUID(),
            nome,
            quarto: record.quarto || record.room || '',
            observacoes: record.observacoes || record.obs || '',
            ativo: true,
            autorizadoSaidaTemporaria: false,
            createdAt: new Date().toISOString(),
          };
          saveResident(resident);
          success++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
    
    return { success, errors };
  } catch {
    return { success: 0, errors: 1 };
  }
}

// Visits
export function getVisits(): Visit[] {
  const visits = getFromStorage<Visit>(STORAGE_KEYS.VISITS);
  return visits.map(v => ({
    ...v,
    pessoa: getPersonById(v.pessoaId),
    idoso: v.idosoId ? getResidentById(v.idosoId) : undefined,
  }));
}

export function saveVisit(visit: Visit): void {
  const visits = getFromStorage<Visit>(STORAGE_KEYS.VISITS);
  const index = visits.findIndex(v => v.id === visit.id);
  const { pessoa, idoso, ...visitData } = visit;
  if (index >= 0) {
    visits[index] = visitData as Visit;
  } else {
    visits.push(visitData as Visit);
  }
  saveToStorage(STORAGE_KEYS.VISITS, visits);
}

export function deleteVisit(id: string): void {
  const visits = getFromStorage<Visit>(STORAGE_KEYS.VISITS).filter(v => v.id !== id);
  saveToStorage(STORAGE_KEYS.VISITS, visits);
}

export function getVisitById(id: string): Visit | undefined {
  const visits = getVisits();
  return visits.find(v => v.id === id);
}

export function getActiveVisits(): Visit[] {
  return getVisits().filter(v => !v.horaSaida);
}

export function getVisitsByDate(date: string): Visit[] {
  return getVisits().filter(v => v.dataEntrada === date);
}

export function getVisitsByPeriod(startDate: string, endDate: string): Visit[] {
  return getVisits().filter(v => v.dataEntrada >= startDate && v.dataEntrada <= endDate);
}

export function getVisitsByResident(residentId: string, startDate?: string, endDate?: string): Visit[] {
  let visits = getVisits().filter(v => v.idosoId === residentId);
  if (startDate && endDate) {
    visits = visits.filter(v => v.dataEntrada >= startDate && v.dataEntrada <= endDate);
  }
  return visits;
}

// Vehicle Trips
export function getVehicleTrips(): VehicleTrip[] {
  return getFromStorage<VehicleTrip>(STORAGE_KEYS.VEHICLE_TRIPS);
}

export function saveVehicleTrip(trip: VehicleTrip): void {
  const trips = getVehicleTrips();
  const index = trips.findIndex(t => t.id === trip.id);
  if (index >= 0) {
    trips[index] = trip;
  } else {
    trips.push(trip);
  }
  saveToStorage(STORAGE_KEYS.VEHICLE_TRIPS, trips);
}

export function deleteVehicleTrip(id: string): void {
  const trips = getVehicleTrips().filter(t => t.id !== id);
  saveToStorage(STORAGE_KEYS.VEHICLE_TRIPS, trips);
}

export function getActiveVehicleTrips(): VehicleTrip[] {
  return getVehicleTrips().filter(t => !t.horaChegada);
}

export function getVehicleTripsByPeriod(startDate: string, endDate: string): VehicleTrip[] {
  return getVehicleTrips().filter(t => t.dataSaida >= startDate && t.dataSaida <= endDate);
}

// Resident Exits
export function getResidentExits(): ResidentExit[] {
  const exits = getFromStorage<ResidentExit>(STORAGE_KEYS.RESIDENT_EXITS);
  return exits.map(e => ({
    ...e,
    resident: getResidentById(e.residentId),
  }));
}

export function saveResidentExit(exit: ResidentExit): void {
  const exits = getFromStorage<ResidentExit>(STORAGE_KEYS.RESIDENT_EXITS);
  const index = exits.findIndex(e => e.id === exit.id);
  const { resident, ...exitData } = exit;
  if (index >= 0) {
    exits[index] = exitData as ResidentExit;
  } else {
    exits.push(exitData as ResidentExit);
  }
  saveToStorage(STORAGE_KEYS.RESIDENT_EXITS, exits);
}

export function deleteResidentExit(id: string): void {
  const exits = getFromStorage<ResidentExit>(STORAGE_KEYS.RESIDENT_EXITS).filter(e => e.id !== id);
  saveToStorage(STORAGE_KEYS.RESIDENT_EXITS, exits);
}

export function getActiveResidentExits(): ResidentExit[] {
  return getResidentExits().filter(e => !e.horaRetornoReal);
}

export function getResidentExitsByPeriod(startDate: string, endDate: string): ResidentExit[] {
  return getResidentExits().filter(e => e.dataSaida >= startDate && e.dataSaida <= endDate);
}

// Backup & Export
export function exportAllData(): string {
  const data = {
    persons: getPersons(),
    residents: getResidents(),
    visits: getFromStorage<Visit>(STORAGE_KEYS.VISITS),
    vehicleTrips: getVehicleTrips(),
    residentExits: getFromStorage<ResidentExit>(STORAGE_KEYS.RESIDENT_EXITS),
    vehicles: getVehicles(),
    users: getUsers().map(u => ({ ...u, password: '[PROTEGIDO]' })),
    institution: getInstitutionSettings(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    if (data.persons) saveToStorage(STORAGE_KEYS.PERSONS, data.persons);
    if (data.residents) saveToStorage(STORAGE_KEYS.RESIDENTS, data.residents);
    if (data.visits) saveToStorage(STORAGE_KEYS.VISITS, data.visits);
    if (data.vehicleTrips) saveToStorage(STORAGE_KEYS.VEHICLE_TRIPS, data.vehicleTrips);
    if (data.residentExits) saveToStorage(STORAGE_KEYS.RESIDENT_EXITS, data.residentExits);
    if (data.vehicles) saveToStorage(STORAGE_KEYS.VEHICLES, data.vehicles);
    if (data.institution) saveInstitutionSettings(data.institution);
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (key !== STORAGE_KEYS.USERS && key !== STORAGE_KEYS.CURRENT_USER && key !== STORAGE_KEYS.INSTITUTION) {
      localStorage.removeItem(key);
    }
  });
}

// Initialize with sample residents if empty
export function initializeSampleData(): void {
  initializeAdminUser();
  
  const residents = getResidents();
  if (residents.length === 0) {
    const sampleResidents: Resident[] = [
      { id: crypto.randomUUID(), nome: 'Maria da Silva', quarto: '101', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'José Santos', quarto: '102', ativo: true, autorizadoSaidaTemporaria: false, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Ana Oliveira', quarto: '103', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Pedro Costa', quarto: '201', ativo: true, autorizadoSaidaTemporaria: false, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Francisca Lima', quarto: '202', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
    ];
    sampleResidents.forEach(saveResident);
  }
}
