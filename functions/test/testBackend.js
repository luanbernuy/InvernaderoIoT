/* test/testBackend.js */
require("dotenv").config();
const admin = require("firebase-admin");
const unit   = require("unit.js");
const request = require("supertest");
const app    = require("../index"); // app de Express exportada en index.js

describe("🔧 Pruebas Unitarias del Backend IoT", function () {
  this.timeout(10000); // tiempo global

  /* ===== GET /getDatos ===== */
  describe("GET /getDatos", () => {
    it("✅ devuelve 200 y un objeto con datos", async () => {
      const res = await request(app).get("/getDatos");
      unit.number(res.status).is(200);
      unit.object(res.body).isNotEmpty();
    });

    it("❌ rechaza POST con 405", async () => {
      const res = await request(app).post("/getDatos");
      unit.number(res.status).is(405);
    });
  });

  /* ===== POST /setControl ===== */
  describe("POST /setControl", () => {
    it("✅ actualiza control válido", async () => {
      const res = await request(app)
        .post("/setControl")
        .send({ control: "bomba_manual", valor: true });
      unit.number(res.status).is(200);
      unit.string(res.body.message).contains("bomba_manual actualizado");
    });

    it("❌ rechaza control desconocido", async () => {
      const res = await request(app)
        .post("/setControl")
        .send({ control: "foo", valor: true });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza valor no-booleano", async () => {
      const res = await request(app)
        .post("/setControl")
        .send({ control: "bomba_manual", valor: "true" });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza GET con 405", async () => {
      const res = await request(app).get("/setControl");
      unit.number(res.status).is(405);
    });
  });

  /* ===== POST /setValoresIdeales ===== */
  describe("POST /setValoresIdeales", () => {
    it("✅ actualiza temp_min válido", async () => {
      const res = await request(app)
        .post("/setValoresIdeales")
        .send({ temp_min: 20 });
      unit.number(res.status).is(200);
      unit.string(res.body.message).contains("Valores actualizados");
    });

    it("❌ rechaza temp_min fuera de rango", async () => {
      const res = await request(app)
        .post("/setValoresIdeales")
        .send({ temp_min: -5 });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza temp_min mayor que temp_max", async () => {
      const res = await request(app)
        .post("/setValoresIdeales")
        .send({ temp_min: 80, temp_max: 60 });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza suelo_min mayor que suelo_max", async () => {
      const res = await request(app)
        .post("/setValoresIdeales")
        .send({ suelo_min: 90, suelo_max: 20 });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza tipo no numérico", async () => {
      const res = await request(app)
        .post("/setValoresIdeales")
        .send({ temp_min: "veinte" });
      unit.number(res.status).is(400);
    });
  });

  /* ===== POST /setDatos ===== */
  describe("POST /setDatos", () => {
    it("✅ acepta datos numéricos correctos", async () => {
      const res = await request(app)
        .post("/setDatos")
        .send({
          temperatura: 25,
          humedad_aire: 60,
          humedad_suelo: 70,
          co2: 500,
          presion: 1010,
          luz: 3000
        });
      unit.number(res.status).is(200);
      unit.string(res.body.message).contains("Datos actualizados");
    });

    it("❌ rechaza campo no numérico", async () => {
      const res = await request(app)
        .post("/setDatos")
        .send({
          temperatura: "caliente",
          humedad_aire: 60,
          humedad_suelo: 70,
          co2: 500,
          presion: 1010,
          luz: 3000
        });
      unit.number(res.status).is(400);
    });

    it("❌ rechaza temperatura fuera de rango", async () => {
      const res = await request(app)
        .post("/setDatos")
        .send({
          temperatura: 120,
          humedad_aire: 60,
          humedad_suelo: 70,
          co2: 500,
          presion: 1010,
          luz: 3000
        });
      unit.number(res.status).is(400);
    });
  });

  /* ===== Cierre de Firebase ===== */
  after(() => {
    if (admin.apps.length) {
      admin.app().delete().finally(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
});
