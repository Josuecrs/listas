const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = 3000;

// Configuración EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Conectar a la base de datos SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) console.error(err.message);
  else console.log("✅ Conectado a SQLite");
});

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    usuario TEXT UNIQUE,
    password TEXT,
    rol TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    grupo TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS asistencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alumno_id INTEGER,
    fecha TEXT,
    estado TEXT,
    FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
  )`);

  // Insertar usuarios de prueba
  db.run(`INSERT OR IGNORE INTO usuarios (nombre, usuario, password, rol) 
          VALUES ('Armando Caamal', 'maestro', 'arjes123', 'maestro')`);
  db.run(`INSERT OR IGNORE INTO usuarios (nombre, usuario, password, rol) 
          VALUES ('GlorMed', 'directora', 'subdc123', 'directora')`);
});

// 👉 Rutas
// Login
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { usuario, password } = req.body;
  db.get("SELECT * FROM usuarios WHERE usuario=? AND password=?", [usuario, password], (err, row) => {
    if (err) return res.send("Error en login");
    if (!row) return res.send("Usuario o contraseña incorrectos");
    if (row.rol === "maestro") {
      res.redirect("/maestro");
    } else {
      res.redirect("/directora");
    }
  });
});

// Panel Maestro
app.get("/maestro", (req, res) => {
  // Mostrar todos los alumnos del grupo 2A
  db.all("SELECT * FROM alumnos WHERE grupo='2A'", [], (err, alumnos) => {
    if (err) {
      console.error(err);
      res.send("Error cargando alumnos");
      return;
    }
    res.render("maestro", { alumnos });
  });
});

app.post("/guardar-asistencias", (req, res) => {
  const fecha = new Date().toISOString().split("T")[0];
  for (let alumnoId in req.body) {
    const estado = req.body[alumnoId];
    db.run("INSERT INTO asistencias (alumno_id, fecha, estado) VALUES (?, ?, ?)", 
           [alumnoId, fecha, estado]);
  }
  res.send("✅ Asistencias guardadas correctamente <br><a href='/maestro'>Volver</a>");
});

// Panel Directora
app.get("/directora", (req, res) => {
  db.all(`SELECT alumnos.nombre, alumnos.grupo, asistencias.fecha, asistencias.estado
          FROM asistencias
          JOIN alumnos ON alumnos.id = asistencias.alumno_id`, [], (err, rows) => {
    if (err) {
      console.error(err);
      res.send("Error cargando asistencias");
      return;
    }
    res.render("directora", { asistencias: rows });
  });
});

// Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
