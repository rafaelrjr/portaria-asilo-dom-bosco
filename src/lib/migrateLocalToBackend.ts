import {
  getPersons as getLocalPersons,
  getResidents as getLocalResidents,
  getVisits as getLocalVisits,
  getResidentExits as getLocalResidentExits,
} from '@/lib/db';

import {
  savePerson,
  saveResident,
  saveVisit,
  saveResidentExit,
} from '@/lib/supabaseDb';

export type LocalDataCounts = {
  persons: number;
  residents: number;
  visits: number;
  residentExits: number;
};

export async function getLocalDataCounts(): Promise<LocalDataCounts> {
  const [persons, residents, visits, residentExits] = await Promise.all([
    getLocalPersons(),
    getLocalResidents(),
    getLocalVisits(),
    getLocalResidentExits(),
  ]);

  return {
    persons: persons.length,
    residents: residents.length,
    visits: visits.length,
    residentExits: residentExits.length,
  };
}

export async function migrateLocalDataToBackend(): Promise<LocalDataCounts> {
  const [persons, residents, visits, residentExits] = await Promise.all([
    getLocalPersons(),
    getLocalResidents(),
    getLocalVisits(),
    getLocalResidentExits(),
  ]);

  let personsOk = 0;
  let residentsOk = 0;
  let visitsOk = 0;
  let exitsOk = 0;

  // 1) Residents first (used by persons linkage and exits)
  for (const resident of residents) {
    try {
      await saveResident(resident);
      residentsOk++;
    } catch {
      // continue
    }
  }

  // 2) Persons (used by visits)
  for (const person of persons) {
    try {
      await savePerson(person);
      personsOk++;
    } catch {
      // continue
    }
  }

  // 3) Resident exits
  for (const exit of residentExits) {
    try {
      await saveResidentExit(exit);
      exitsOk++;
    } catch {
      // continue
    }
  }

  // 4) Visits
  for (const visit of visits) {
    try {
      await saveVisit(visit);
      visitsOk++;
    } catch {
      // continue
    }
  }

  return {
    persons: personsOk,
    residents: residentsOk,
    visits: visitsOk,
    residentExits: exitsOk,
  };
}
