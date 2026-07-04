export interface Risk {
  id: string;
  description: string;
  measures: string[];
  classification?: 'Baixo' | 'Médio' | 'Alto';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  signature: string;
}

export interface AccidentRecord {
  id: string;
  month: string; // YYYY-MM
  employeeCount: number;
  workingDays: number;
  hoursPerDay: number; // Default 8.48
  accidentsWithLostTime: number;
  accidentsWithoutLostTime: number;
  fatalAccidents: number;
  daysLost: number;
  htt: number; // Calculated: employeeCount * workingDays * hoursPerDay
  frequencyRate: number; // (accidentsWithLostTime * 1,000,000) / htt
  severityRate: number; // (daysLost * 1,000,000) / htt
}

export interface APR {
  id: string;
  company: string;
  osNumber: string;
  date: string;
  location: string;
  task: string;
  risks: Risk[];
  responsible: string;
  signature: string;
  safetyTechnicians: Employee[];
  executors: Employee[];
  photos: string[];
  createdAt: string;
  uid?: string;
}
