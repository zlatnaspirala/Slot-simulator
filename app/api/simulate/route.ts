import { NextRequest, NextResponse } from "next/server";
import { SlotConfig } from "@/lib/slot/types";

function spin(c: SlotConfig) {
  const grid = c.reels.map((r) => {
    const i = Math.floor(Math.random() * r.strip.length);
    return [0, 1, 2].map((n) => r.strip[(i + n) % r.strip.length]);
  });

  let win = 0;
  let scatter = 0;

  for (const reel of grid) {
    for (const symbol of reel) {
      if (symbol === c.freeSpins.triggerSymbol) scatter++;
    }
  }

  for (const line of c.paylines) {
    const seq = line.rows.map((row, i) => grid[i][row]);
    const wild = c.symbols.find((s) => s.type === "wild")?.id;
    let target = seq[0];

    if (wild && target === wild) {
      target = seq.find((s) => s !== wild) ?? wild;
    }

    let count = 0;
    for (const symbol of seq) {
      if (symbol === target || symbol === wild) count++;
      else break;
    }

    if (count >= 3) {
      win += c.paytable[target]?.[String(count)] ?? 0;
    }
  }

  return { win, scatter };
}

export async function POST(req: NextRequest) {
  try {
    const { config, spins: requested } = await req.json();
    const c = config as SlotConfig;
    const spins = Math.min(
      10_000_000,
      Math.max(1_000, Number(requested) || 100_000),
    );

    let total = 0;
    let wins = 0;
    let max = 0;
    let triggers = 0;
    let free = 0;
    let remaining = 0;

    for (let i = 0; i < spins; i++) {
      const result = spin(c);
      total += result.win;

      if (result.win > 0) {
        wins++;
        max = Math.max(max, result.win);
      }

      if (
        c.freeSpins.enabled &&
        result.scatter >= c.freeSpins.triggerCount
      ) {
        triggers++;
        remaining += c.freeSpins.spinsAwarded;
      }

      while (remaining > 0) {
        remaining--;
        free++;

        const result = spin(c);
        const win = result.win * c.freeSpins.multiplier;
        total += win;

        if (win > 0) {
          wins++;
          max = Math.max(max, win);
        }

        if (
          c.freeSpins.retrigger &&
          result.scatter >= c.freeSpins.triggerCount
        ) {
          remaining += c.freeSpins.spinsAwarded;
        }
      }
    }

    const wager = spins * c.betPerSpin;

    return NextResponse.json({
      spins,
      wager,
      totalWin: total,
      rtp: wager > 0 ? total / wager : 0,
      winSpins: wins,
      hitFrequency: wins / spins,
      averageWin: wins > 0 ? total / wins : 0,
      maxWin: max,
      freeSpinTriggers: triggers,
      freeSpinSpins: free,
    });
  } catch (error) {
    console.error("Simulation failed:", error);
    return NextResponse.json(
      { error: "Invalid slot configuration" },
      { status: 400 },
    );
  }
}