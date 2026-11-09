require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { computeScores, fib4, apri, albi } = require("../utils/scores");

const labs = { age: 50, sgot: 40, alt: 36, platelets: 200, bilirubin: 1, albumin: 4 };

test("FIB-4 matches a hand calculation: (50 x 40) / (200 x sqrt(36)) = 1.67", () => {
  const r = fib4(labs);
  assert.equal(r.value, 1.67);
  assert.equal(r.band, "intermediate");
});

test("FIB-4 band boundaries: below 1.3 low, up to 2.67 indeterminate, above high", () => {
  // value = age*AST/(plt*sqrt(ALT)); fix age 40, ALT 25 (sqrt 5), platelets 200 -> value = AST*40/1000
  const at = (sgot) => fib4({ age: 40, sgot, alt: 25, platelets: 200 });
  assert.equal(at(30).band, "low"); // 1.2
  assert.equal(at(33).band, "intermediate"); // 1.32
  assert.equal(at(66).band, "intermediate"); // 2.64
  assert.equal(at(68).band, "high"); // 2.72
});

test("FIB-4 uses the age-adjusted low cut-off of 2.0 from age 65", () => {
  // age 70, AST 40, ALT 25, platelets 200 -> 70*40/(200*5) = 2.8
  const old = fib4({ age: 70, sgot: 20, alt: 25, platelets: 200 }); // 70*20/1000 = 1.4
  assert.equal(old.value, 1.4);
  assert.equal(old.band, "low"); // 1.4 would be intermediate under 65
  assert.equal(fib4({ age: 60, sgot: 23.3, alt: 25, platelets: 200 }).band, "intermediate"); // 1.40 at age 60
});

test("FIB-4 is unavailable without ALT instead of guessing", () => {
  const r = fib4({ ...labs, alt: undefined });
  assert.equal(r.value, null);
  assert.match(r.unavailableReason, /ALT/);
});

test("APRI matches a hand calculation: (80 / 40) / 100 x 100 = 2.0", () => {
  const r = apri({ sgot: 80, platelets: 100 });
  assert.equal(r.value, 2);
  assert.equal(r.band, "intermediate"); // 2.0 is not above 2.0
  assert.equal(apri({ sgot: 84, platelets: 100 }).band, "high");
  assert.equal(apri({ sgot: 20, platelets: 200 }).value, 0.25);
  assert.equal(apri({ sgot: 20, platelets: 200 }).band, "low");
});

test("APRI says it assumed an AST upper limit of normal", () => {
  assert.ok(apri({ sgot: 40, platelets: 200 }).caveats.some((c) => /upper limit/.test(c)));
});

test("ALBI converts units and matches a hand calculation", () => {
  // bilirubin 1 mg/dL = 17.104 umol/L -> log10 = 1.2331 -> x0.66 = 0.8139; albumin 4 g/dL = 40 g/L -> -3.4
  const r = albi({ bilirubin: 1, albumin: 4 });
  assert.equal(r.value, -2.59);
  assert.equal(r.grade, 2); // just above -2.60
  assert.equal(albi({ bilirubin: 0.6, albumin: 4.5 }).grade, 1);
  assert.equal(albi({ bilirubin: 4, albumin: 2.5 }).grade, 3);
});

test("ALBI: the displayed score always agrees with its grade", () => {
  for (let albumin = 2; albumin <= 5; albumin += 0.01) {
    for (const bilirubin of [0.4, 1, 2, 5]) {
      const r = albi({ bilirubin, albumin });
      const expected = r.value <= -2.6 ? 1 : r.value <= -1.39 ? 2 : 3;
      assert.equal(r.grade, expected, `albumin ${albumin.toFixed(2)}, bilirubin ${bilirubin}, shown ${r.value}`);
    }
  }
  assert.equal(albi({ bilirubin: 1, albumin: 4.0 }).grade, 2);
  assert.equal(albi({ bilirubin: 1, albumin: 4.02 }).grade, 1);
});

test("FIB-4 and APRI: the displayed value always agrees with the band", () => {
  for (let sgot = 10; sgot <= 120; sgot += 0.5) {
    const f = fib4({ age: 45, sgot, alt: 30, platelets: 180 });
    assert.equal(f.band, f.value < 1.3 ? "low" : f.value > 2.67 ? "high" : "intermediate", `FIB-4 ${f.value}`);
    const a = apri({ sgot, platelets: 180 });
    assert.equal(a.band, a.value < 0.5 ? "low" : a.value > 2 ? "high" : "intermediate", `APRI ${a.value}`);
  }
});

test("computeScores returns all three with explanation fields for the UI", () => {
  const all = computeScores(labs);
  assert.deepEqual(all.map((s) => s.id), ["fib4", "apri", "albi"]);
  for (const s of all) {
    for (const key of ["purpose", "bandLabel", "meaning", "formula", "cutoffs", "inputs", "caveats", "source"]) {
      assert.ok(s[key], `${s.id}.${key}`);
    }
    assert.ok(["low", "intermediate", "high"].includes(s.band));
  }
});

test("scores never claim a diagnosis", () => {
  for (const s of computeScores(labs)) {
    assert.ok(!/\bdiagnos(is|es|ed)\b/i.test(JSON.stringify(s)) || /not a diagnosis/i.test(JSON.stringify(s)), s.id);
  }
});

test("invalid inputs return unavailable instead of NaN or Infinity", () => {
  assert.equal(apri({ sgot: 40, platelets: 0 }).value, null);
  assert.equal(fib4({ age: 50, sgot: 40, alt: 0, platelets: 200 }).value, null);
  assert.equal(albi({ bilirubin: 0, albumin: 4 }).value, null);
});

test("the explanation text quotes the same thresholds the scoring uses", () => {
  const { SCORE_THRESHOLDS: t } = require("../utils/scores");
  const f = fib4(labs).cutoffs;
  assert.ok(f.includes(String(t.fib4.low)) && f.includes(String(t.fib4.high)));
  assert.ok(fib4({ ...labs, age: 70 }).cutoffs.includes(String(t.fib4.lowFrom65)));
  const a = apri({ sgot: 40, platelets: 200 }).cutoffs;
  assert.ok(a.includes(String(t.apri.low)) && a.includes(t.apri.high.toFixed(1)));
});
