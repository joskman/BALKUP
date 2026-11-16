// Jednostavan prijenos odabrane vježbe iz modalnog ekrana natrag u uređivač rutine
// (rutina se sprema u bazu tek kad korisnik pritisne „Spremi“).

let pendingRoutinePick: string | null = null;

export function setRoutinePick(exerciseId: string): void {
  pendingRoutinePick = exerciseId;
}

export function takeRoutinePick(): string | null {
  const id = pendingRoutinePick;
  pendingRoutinePick = null;
  return id;
}
