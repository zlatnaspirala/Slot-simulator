export type SymbolType = "normal" | "wild" | "scatter";
export interface SymbolDef {
  id: string;
  name: string;
  type: SymbolType;
}
export interface Reel {
  id: string;
  strip: string[];
}
export interface Paytable {
  [symbol: string]: {[count: string]: number};
}
export interface Payline {
  id: string;
  rows: number[];
}
export interface FreeSpins {
  enabled: boolean;
  triggerSymbol: string;
  triggerCount: number;
  spinsAwarded: number;
  retrigger: boolean;
  multiplier: number;
}
export interface SlotConfig {
  name: string;
  targetRtp: number;
  betPerSpin: number;
  symbols: SymbolDef[];
  reels: Reel[];
  paylines: Payline[];
  paytable: Paytable;
  freeSpins: FreeSpins;
}
