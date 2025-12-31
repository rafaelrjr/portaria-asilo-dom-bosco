import { Person, Resident, Visit } from '@/types';

const STORAGE_KEYS = {
  PERSONS: 'asilo_dom_bosco_persons',
  RESIDENTS: 'asilo_dom_bosco_residents',
  VISITS: 'asilo_dom_bosco_visits',
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

// Visits
export function getVisits(): Visit[] {
  const visits = getFromStorage<Visit>(STORAGE_KEYS.VISITS);
  // Enrich with person and resident data
  return visits.map(v => ({
    ...v,
    pessoa: getPersonById(v.pessoaId),
    idoso: v.idosoId ? getResidentById(v.idosoId) : undefined,
  }));
}

export function saveVisit(visit: Visit): void {
  const visits = getFromStorage<Visit>(STORAGE_KEYS.VISITS);
  const index = visits.findIndex(v => v.id === visit.id);
  // Remove enriched data before saving
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

// Initialize with sample residents if empty
export function initializeSampleData(): void {
  const residents = getResidents();
  if (residents.length === 0) {
    const sampleResidents: Resident[] = [
      { id: crypto.randomUUID(), nome: 'Maria da Silva', quarto: '101', ativo: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'José Santos', quarto: '102', ativo: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Ana Oliveira', quarto: '103', ativo: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Pedro Costa', quarto: '201', ativo: true, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), nome: 'Francisca Lima', quarto: '202', ativo: true, createdAt: new Date().toISOString() },
    ];
    sampleResidents.forEach(saveResident);
  }
}
