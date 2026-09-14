// ================================================
// TESTS UNITAIRES — calculerAge (fonction pure, aucune DB)
// ================================================
import { describe, it, expect } from "vitest";
import { calculerAge } from "../../src/utils/age";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("calculerAge", () => {
  it("le jour de l'anniversaire, l'annee est comptee", () => {
    expect(calculerAge(utc("2000-05-17"), utc("2026-05-17"))).toBe(26);
  });

  it("la veille de l'anniversaire, pas encore", () => {
    expect(calculerAge(utc("2000-05-17"), utc("2026-05-16"))).toBe(25);
  });

  it("mois de naissance deja passe dans l'annee -> annee comptee", () => {
    expect(calculerAge(utc("2000-05-17"), utc("2026-09-14"))).toBe(26);
  });

  it("mois de naissance pas encore arrive -> annee pas comptee", () => {
    expect(calculerAge(utc("2000-12-01"), utc("2026-09-14"))).toBe(25);
  });

  it("ne dans l'annee en cours, avant sa date -> 0", () => {
    expect(calculerAge(utc("2026-03-01"), utc("2026-09-14"))).toBe(0);
  });

  it("ne un 29 fevrier : l'annee est comptee le 1er mars des annees non bissextiles", () => {
    expect(calculerAge(utc("2004-02-29"), utc("2025-02-28"))).toBe(20);
    expect(calculerAge(utc("2004-02-29"), utc("2025-03-01"))).toBe(21);
  });

  it("l'heure dans la journee ne change rien (calcul en UTC)", () => {
    expect(calculerAge(utc("2000-05-17"), new Date("2026-05-17T23:59:59Z"))).toBe(26);
  });
});
