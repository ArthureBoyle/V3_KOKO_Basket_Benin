// ================================================
// TESTS UNITAIRES — schemas de dates partages (aucune DB)
// Le bug corrige : z.coerce.date() transformait null en 1er janvier 1970.
// ================================================
import { describe, it, expect } from "vitest";
import { jourSchema, instantSchema } from "../../src/utils/validation/dates";

describe("jourSchema (YYYY-MM-DD)", () => {
  it("accepte un jour valide et le convertit en Date", () => {
    const r = jourSchema.safeParse("2027-06-01");
    expect(r.success).toBe(true);
    expect(r.success && r.data.toISOString()).toBe("2027-06-01T00:00:00.000Z");
  });

  it("refuse null (ne devient plus 1970)", () => {
    expect(jourSchema.safeParse(null).success).toBe(false);
  });

  it("refuse un nombre (timestamp)", () => {
    expect(jourSchema.safeParse(0).success).toBe(false);
  });

  it("refuse un jour impossible (30 fevrier)", () => {
    expect(jourSchema.safeParse("2027-02-30").success).toBe(false);
  });

  it("accepte un 29 fevrier d'annee bissextile, refuse sinon", () => {
    expect(jourSchema.safeParse("2028-02-29").success).toBe(true);
    expect(jourSchema.safeParse("2027-02-29").success).toBe(false);
  });

  it("refuse une date avec heure, ou un format local", () => {
    expect(jourSchema.safeParse("2027-06-01T10:00:00Z").success).toBe(false);
    expect(jourSchema.safeParse("01/06/2027").success).toBe(false);
    expect(jourSchema.safeParse("").success).toBe(false);
  });
});

describe("instantSchema (date + heure + fuseau)", () => {
  it("accepte UTC (Z)", () => {
    const r = instantSchema.safeParse("2027-08-05T18:00:00Z");
    expect(r.success && r.data.toISOString()).toBe("2027-08-05T18:00:00.000Z");
  });

  it("accepte un decalage et le ramene au bon instant (+01:00 = heure du Benin)", () => {
    const r = instantSchema.safeParse("2027-08-05T19:00:00+01:00");
    expect(r.success && r.data.toISOString()).toBe("2027-08-05T18:00:00.000Z");
  });

  it("refuse null", () => {
    expect(instantSchema.safeParse(null).success).toBe(false);
  });

  it("refuse une heure sans fuseau (ambigue)", () => {
    expect(instantSchema.safeParse("2027-08-05T18:00:00").success).toBe(false);
  });

  it("refuse un jour seul et un nombre", () => {
    expect(instantSchema.safeParse("2027-08-05").success).toBe(false);
    expect(instantSchema.safeParse(1786000000000).success).toBe(false);
  });
});
