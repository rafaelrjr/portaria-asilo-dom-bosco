import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Person, Resident, Visit, VehicleTrip, ResidentExit, User, Vehicle, InstitutionSettings } from '@/types';

interface AppDB extends DBSchema {
  persons: {
    key: string;
    value: Person;
    indexes: { 'by-nome': string; 'by-cpf': string };
  };
  residents: {
    key: string;
    value: Resident;
    indexes: { 'by-nome': string };
  };
  visits: {
    key: string;
    value: Visit;
    indexes: { 'by-date': string; 'by-pessoa': string };
  };
  vehicleTrips: {
    key: string;
    value: VehicleTrip;
    indexes: { 'by-date': string };
  };
  residentExits: {
    key: string;
    value: ResidentExit;
    indexes: { 'by-date': string; 'by-resident': string };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-username': string };
  };
  vehicles: {
    key: string;
    value: Vehicle;
    indexes: { 'by-placa': string };
  };
  settings: {
    key: string;
    value: { id: string; data: InstitutionSettings | User | null };
  };
}

let dbInstance: IDBPDatabase<AppDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AppDB>('asilo-dom-bosco', 1, {
    upgrade(db) {
      // Persons store
      if (!db.objectStoreNames.contains('persons')) {
        const personStore = db.createObjectStore('persons', { keyPath: 'id' });
        personStore.createIndex('by-nome', 'nome');
        personStore.createIndex('by-cpf', 'cpf');
      }

      // Residents store
      if (!db.objectStoreNames.contains('residents')) {
        const residentStore = db.createObjectStore('residents', { keyPath: 'id' });
        residentStore.createIndex('by-nome', 'nome');
      }

      // Visits store
      if (!db.objectStoreNames.contains('visits')) {
        const visitStore = db.createObjectStore('visits', { keyPath: 'id' });
        visitStore.createIndex('by-date', 'dataEntrada');
        visitStore.createIndex('by-pessoa', 'pessoaId');
      }

      // Vehicle Trips store
      if (!db.objectStoreNames.contains('vehicleTrips')) {
        const tripStore = db.createObjectStore('vehicleTrips', { keyPath: 'id' });
        tripStore.createIndex('by-date', 'dataSaida');
      }

      // Resident Exits store
      if (!db.objectStoreNames.contains('residentExits')) {
        const exitStore = db.createObjectStore('residentExits', { keyPath: 'id' });
        exitStore.createIndex('by-date', 'dataSaida');
        exitStore.createIndex('by-resident', 'residentId');
      }

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-username', 'username');
      }

      // Vehicles store
      if (!db.objectStoreNames.contains('vehicles')) {
        const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id' });
        vehicleStore.createIndex('by-placa', 'placa');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
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

// ==================== USERS ====================
export async function getUsers(): Promise<User[]> {
  const db = await getDB();
  return db.getAll('users');
}

export async function saveUser(user: User): Promise<void> {
  const db = await getDB();
  await db.put('users', user);
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('users', id);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDB();
  const users = await db.getAllFromIndex('users', 'by-username', username.toLowerCase());
  return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (user && user.ativo && user.password === simpleHash(password)) {
    return user;
  }
  return null;
}

export async function getCurrentUser(): Promise<User | null> {
  const db = await getDB();
  const setting = await db.get('settings', 'currentUser');
  return setting?.data as User | null;
}

export async function setCurrentUser(user: User | null): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: 'currentUser', data: user });
}

export async function initializeAdminUser(): Promise<void> {
  const users = await getUsers();
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
    await saveUser(adminUser);
  }
}

// ==================== INSTITUTION SETTINGS ====================
export async function getInstitutionSettings(): Promise<InstitutionSettings | null> {
  const db = await getDB();
  const setting = await db.get('settings', 'institution');
  return setting?.data as InstitutionSettings | null;
}

export async function saveInstitutionSettings(settings: InstitutionSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: 'institution', data: settings });
}

// ==================== VEHICLES ====================
export async function getVehicles(): Promise<Vehicle[]> {
  const db = await getDB();
  return db.getAll('vehicles');
}

export async function saveVehicle(vehicle: Vehicle): Promise<void> {
  const db = await getDB();
  await db.put('vehicles', vehicle);
}

export async function deleteVehicle(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vehicles', id);
}

export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  const db = await getDB();
  return db.get('vehicles', id);
}

export async function getActiveVehicles(): Promise<Vehicle[]> {
  const vehicles = await getVehicles();
  return vehicles.filter(v => v.ativo);
}

// ==================== PERSONS ====================
export async function getPersons(): Promise<Person[]> {
  const db = await getDB();
  return db.getAll('persons');
}

export async function savePerson(person: Person): Promise<void> {
  const db = await getDB();
  await db.put('persons', { ...person, updatedAt: new Date().toISOString() });
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('persons', id);
}

export async function getPersonById(id: string): Promise<Person | undefined> {
  const db = await getDB();
  return db.get('persons', id);
}

export async function searchPersons(query: string): Promise<Person[]> {
  const persons = await getPersons();
  const q = query.toLowerCase();
  return persons.filter(p => 
    p.nome.toLowerCase().includes(q) || 
    p.cpf.includes(q) ||
    p.rg.includes(q)
  );
}

// ==================== RESIDENTS ====================
export async function getResidents(): Promise<Resident[]> {
  const db = await getDB();
  return db.getAll('residents');
}

export async function saveResident(resident: Resident): Promise<void> {
  const db = await getDB();
  await db.put('residents', resident);
}

export async function deleteResident(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('residents', id);
}

export async function getResidentById(id: string): Promise<Resident | undefined> {
  const db = await getDB();
  return db.get('residents', id);
}

export async function importResidentsFromJSON(jsonData: string): Promise<{ success: number; errors: number }> {
  try {
    const data = JSON.parse(jsonData);
    const residents = Array.isArray(data) ? data : data.residents || [];
    let success = 0;
    let errors = 0;
    
    for (const r of residents) {
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
          await saveResident(resident);
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

export async function importResidentsFromCSV(csvData: string): Promise<{ success: number; errors: number }> {
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
          await saveResident(resident);
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

// ==================== VISITS ====================
export async function getVisits(): Promise<Visit[]> {
  const db = await getDB();
  const visits = await db.getAll('visits');
  const enrichedVisits: Visit[] = [];
  
  for (const v of visits) {
    const pessoa = await getPersonById(v.pessoaId);
    const idoso = v.idosoId ? await getResidentById(v.idosoId) : undefined;
    enrichedVisits.push({ ...v, pessoa, idoso });
  }
  
  return enrichedVisits;
}

export async function saveVisit(visit: Visit): Promise<void> {
  const db = await getDB();
  const { pessoa, idoso, ...visitData } = visit;
  await db.put('visits', visitData as Visit);
}

export async function deleteVisit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('visits', id);
}

export async function getVisitById(id: string): Promise<Visit | undefined> {
  const visits = await getVisits();
  return visits.find(v => v.id === id);
}

export async function getActiveVisits(): Promise<Visit[]> {
  const visits = await getVisits();
  return visits.filter(v => !v.horaSaida);
}

export async function getVisitsByDate(date: string): Promise<Visit[]> {
  const visits = await getVisits();
  return visits.filter(v => v.dataEntrada === date);
}

export async function getVisitsByPeriod(startDate: string, endDate: string): Promise<Visit[]> {
  const visits = await getVisits();
  return visits.filter(v => v.dataEntrada >= startDate && v.dataEntrada <= endDate);
}

export async function getVisitsByResident(residentId: string, startDate?: string, endDate?: string): Promise<Visit[]> {
  let visits = await getVisits();
  visits = visits.filter(v => v.idosoId === residentId);
  if (startDate && endDate) {
    visits = visits.filter(v => v.dataEntrada >= startDate && v.dataEntrada <= endDate);
  }
  return visits;
}

// ==================== VEHICLE TRIPS ====================
export async function getVehicleTrips(): Promise<VehicleTrip[]> {
  const db = await getDB();
  return db.getAll('vehicleTrips');
}

export async function saveVehicleTrip(trip: VehicleTrip): Promise<void> {
  const db = await getDB();
  await db.put('vehicleTrips', trip);
}

export async function deleteVehicleTrip(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vehicleTrips', id);
}

export async function getActiveVehicleTrips(): Promise<VehicleTrip[]> {
  const trips = await getVehicleTrips();
  return trips.filter(t => !t.horaChegada);
}

export async function getVehicleTripsByPeriod(startDate: string, endDate: string): Promise<VehicleTrip[]> {
  const trips = await getVehicleTrips();
  return trips.filter(t => t.dataSaida >= startDate && t.dataSaida <= endDate);
}

// ==================== RESIDENT EXITS ====================
export async function getResidentExits(): Promise<ResidentExit[]> {
  const db = await getDB();
  const exits = await db.getAll('residentExits');
  const enrichedExits: ResidentExit[] = [];
  
  for (const e of exits) {
    const resident = await getResidentById(e.residentId);
    enrichedExits.push({ ...e, resident });
  }
  
  return enrichedExits;
}

export async function saveResidentExit(exit: ResidentExit): Promise<void> {
  const db = await getDB();
  const { resident, ...exitData } = exit;
  await db.put('residentExits', exitData as ResidentExit);
}

export async function deleteResidentExit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('residentExits', id);
}

export async function getActiveResidentExits(): Promise<ResidentExit[]> {
  const exits = await getResidentExits();
  return exits.filter(e => !e.horaRetornoReal);
}

export async function getResidentExitsByPeriod(startDate: string, endDate: string): Promise<ResidentExit[]> {
  const exits = await getResidentExits();
  return exits.filter(e => e.dataSaida >= startDate && e.dataSaida <= endDate);
}

// ==================== BACKUP & EXPORT ====================
export async function exportAllData(): Promise<string> {
  const [persons, residents, visits, vehicleTrips, residentExits, vehicles, users, institution] = await Promise.all([
    getPersons(),
    getResidents(),
    getVehicleTrips(),
    getVehicleTrips(),
    getResidentExits(),
    getVehicles(),
    getUsers(),
    getInstitutionSettings(),
  ]);

  const db = await getDB();
  const rawVisits = await db.getAll('visits');
  const rawExits = await db.getAll('residentExits');

  const data = {
    persons,
    residents,
    visits: rawVisits,
    vehicleTrips,
    residentExits: rawExits,
    vehicles,
    users: users.map(u => ({ ...u, password: '[PROTEGIDO]' })),
    institution,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonData: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonData);
    const db = await getDB();

    if (data.persons) {
      for (const p of data.persons) await db.put('persons', p);
    }
    if (data.residents) {
      for (const r of data.residents) await db.put('residents', r);
    }
    if (data.visits) {
      for (const v of data.visits) await db.put('visits', v);
    }
    if (data.vehicleTrips) {
      for (const t of data.vehicleTrips) await db.put('vehicleTrips', t);
    }
    if (data.residentExits) {
      for (const e of data.residentExits) await db.put('residentExits', e);
    }
    if (data.vehicles) {
      for (const v of data.vehicles) await db.put('vehicles', v);
    }
    if (data.institution) {
      await db.put('settings', { id: 'institution', data: data.institution });
    }
    return true;
  } catch {
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('persons');
  await db.clear('residents');
  await db.clear('visits');
  await db.clear('vehicleTrips');
  await db.clear('residentExits');
  await db.clear('vehicles');
}

// Initialize with sample residents if empty
export async function initializeSampleData(): Promise<void> {
  await initializeAdminUser();
  
  const residents = await getResidents();
  if (residents.length === 0) {
    const sampleResidents: Resident[] = [
      { id: crypto.randomUUID(), nome: 'Maria da Silva', quarto: '101', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'José Santos', quarto: '102', ativo: true, autorizadoSaidaTemporaria: false, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Ana Oliveira', quarto: '103', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Pedro Costa', quarto: '201', ativo: true, autorizadoSaidaTemporaria: false, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Francisca Lima', quarto: '202', ativo: true, autorizadoSaidaTemporaria: true, createdAt: new Date().toISOString() },
    ];
    for (const r of sampleResidents) {
      await saveResident(r);
    }
  }
}
