import { initialState } from '../lib/initial'
import { parseBackup } from '../lib/normalize'
import type { AppState } from '../types'

const STORAGE_KEY = 'forja.db.v1'

/**
 * Único ponto que toca o armazenamento do aparelho.
 * O estado inteiro é um documento JSON: imagens ficam como link, então
 * localStorage aguenta o histórico de um uso pessoal e o backup é o próprio arquivo.
 * Se um dia o histórico crescer demais, esta é a camada que migra para IndexedDB.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = parseBackup(JSON.parse(raw))
    return parsed.ok ? parsed.state : initialState()
  } catch {
    return initialState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportDocument(state: AppState): string {
  return JSON.stringify(state, null, 2)
}
