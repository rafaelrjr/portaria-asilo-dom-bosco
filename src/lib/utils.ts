import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatRG(value: string): string {
  return value.replace(/\D/g, '').slice(0, 12);
}

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatDate(date: string): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function formatTime(time: string): string {
  return time;
}

export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function getVisitorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    familiar: 'Familiar',
    prestador: 'Prestador de Serviço',
    acao_social: 'Ação Social',
    visita_geral: 'Visita Geral',
    outro: 'Outro',
  };
  return labels[type] || type;
}

export function getVisitPurposeLabel(purpose: string): string {
  const labels: Record<string, string> = {
    idoso_especifico: 'Visita a Idoso',
    acao_social: 'Ação Social',
    visita_geral: 'Visita Geral',
    reuniao: 'Reunião',
    prestacao_servico: 'Prestação de Serviço',
  };
  return labels[purpose] || purpose;
}

export function generateId(): string {
  return crypto.randomUUID();
}
