const express = require("express");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(express.json());

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.PROJECT_ID,
      clientEmail: process.env.CLIENT_EMAIL,
      privateKey: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.DATABASE_URL,
  });
}

const db = admin.database();

/* ============ GET /getDatos ============ */
app.get("/getDatos", async (req, res) => {
  try {
    const snapshot = await db.ref("/datos").once("value");
    res.status(200).json(snapshot.val());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/getDatos", (req, res) => {
  res.status(405).send("Method Not Allowed");
});

/* ============ POST /setControl ============ */
app.post("/setControl", async (req, res) => {
  try {
    const { control, valor } = req.body;

    const controlesValidos = ["bomba_manual", "ventilador_manual", "modo_automatico"];
    if (!controlesValidos.includes(control)) {
      return res.status(400).json({ error: `Control inválido. Debe ser uno de: ${controlesValidos.join(", ")}` });
    }

    if (typeof valor !== "boolean") {
      return res.status(400).json({ error: "El campo 'valor' debe ser booleano (true/false)." });
    }

    await db.ref(`/controles/${control}`).set(valor);
    res.status(200).json({ message: `${control} actualizado` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/setControl", (req, res) => {
  res.status(405).send("Method Not Allowed");
});

/* ============ POST /setValoresIdeales ============ */
app.post("/setValoresIdeales", async (req, res) => {
  try {
    const { temp_min, temp_max, suelo_min, suelo_max } = req.body;
    const actualizaciones = {};

    // Validar tipos
    if (temp_min !== undefined && typeof temp_min !== "number") {
      return res.status(400).json({ error: "'temp_min' debe ser numérico" });
    }
    if (temp_max !== undefined && typeof temp_max !== "number") {
      return res.status(400).json({ error: "'temp_max' debe ser numérico" });
    }
    if (suelo_min !== undefined && typeof suelo_min !== "number") {
      return res.status(400).json({ error: "'suelo_min' debe ser numérico" });
    }
    if (suelo_max !== undefined && typeof suelo_max !== "number") {
      return res.status(400).json({ error: "'suelo_max' debe ser numérico" });
    }

    // Validar rangos
    if (temp_min < 0 || temp_min > 100 || temp_max < 0 || temp_max > 100) {
      return res.status(400).json({ error: "La temperatura debe estar entre 0 y 100 °C." });
    }
    if (suelo_min < 0 || suelo_min > 100 || suelo_max < 0 || suelo_max > 100) {
      return res.status(400).json({ error: "La humedad debe estar entre 0 y 100%." });
    }

    // Validar consistencia
    if (temp_min !== undefined && temp_max !== undefined && temp_min > temp_max) {
      return res.status(400).json({ error: "temp_min no puede ser mayor que temp_max" });
    }
    if (suelo_min !== undefined && suelo_max !== undefined && suelo_min > suelo_max) {
      return res.status(400).json({ error: "suelo_min no puede ser mayor que suelo_max" });
    }

    if (temp_min !== undefined) actualizaciones.temp_min = temp_min;
    if (temp_max !== undefined) actualizaciones.temp_max = temp_max;
    if (suelo_min !== undefined) actualizaciones.suelo_min = suelo_min;
    if (suelo_max !== undefined) actualizaciones.suelo_max = suelo_max;

    if (Object.keys(actualizaciones).length === 0) {
      return res.status(400).json({ error: "No se enviaron valores válidos para actualizar." });
    }

    await db.ref("/valores_ideales").update(actualizaciones);
    res.status(200).json({ message: "Valores actualizados" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============ POST /setDatos ============ */
app.post("/setDatos", async (req, res) => {
  try {
    const datos = req.body;
    const camposNumericos = ["temperatura", "humedad_aire", "humedad_suelo", "co2", "presion", "luz"];

    for (const campo of camposNumericos) {
      const valor = datos[campo];
      if (typeof valor !== "number" || isNaN(valor)) {
        return res.status(400).json({ error: `El campo '${campo}' debe ser un número válido.` });
      }
    }

    // Validación opcional de rangos razonables
    if (datos.temperatura < 0 || datos.temperatura > 100) {
      return res.status(400).json({ error: "Temperatura fuera de rango (0-100°C)." });
    }

    if (datos.humedad_aire < 0 || datos.humedad_aire > 100) {
      return res.status(400).json({ error: "Humedad del aire fuera de rango (0-100%)." });
    }

    if (datos.humedad_suelo < 0 || datos.humedad_suelo > 100) {
      return res.status(400).json({ error: "Humedad del suelo fuera de rango (0-100%)." });
    }

    await db.ref("/datos").set(datos);
    res.status(200).json({ message: "Datos actualizados" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ============ Exportaciones ============ */
exports.api = functions.https.onRequest(app); // Para deploy
module.exports = app; // Para test
