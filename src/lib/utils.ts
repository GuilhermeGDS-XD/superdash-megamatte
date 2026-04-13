// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export function formatCampaignName(name?: string) {
  if (!name) return 'Sem Nome';
  return name
    // Remove tudo entre colchetes, parênteses ou chaves, ex: [ECOM] ou (Teste)
    .replace(/\[.*?\]|\(.*?\)|{.*?}/g, '')
    // Remove formatos de data, ex: 03/03/2026, 03-03-24, 2026-03-03
    .replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\b/g, '')
    .replace(/\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g, '')
    // Remove horários, ex: 15:30, 15h30
    .replace(/\b\d{2}:\d{2}(:\d{2})?\b/g, '')
    .replace(/\b\d{2}h\d{2}\b/gi, '')
    // Limpa espaços duplos e traços que ficaram sobrando no prefixo/sufixo
    .replace(/^[-\s|]+|[-\s|]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Campanha Desconhecida';
}
