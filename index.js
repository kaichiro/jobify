// region Express and Application
const express = require("express");
const app = express();
// endregion

// region BodyParser
const bodyParser = require("body-parser");
// endregion

const path = require("path");

// region SQLite
const sqllite = require("sqlite");
const dbConnection = sqllite.open(path.resolve(__dirname, "banco.sqlite"), {
  Promise
});
// endregion

// region Global Variables
const PORT = process.env.PORT || 3000;
// endregion

app.use("/admin", (req, res, next) => {
  if (req.hostname === "localhost") {
    next();
  } else {
    res.send("Not allowed");
  }
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// region Routes
app.get("/", async (request, response) => {
  const db = await dbConnection;
  const categoriasDb = await db.all("select * from categorias;");
  const vagas = await db.all("select * from vagas;");
  const categorias = categoriasDb.map(categoria => {
    return {
      ...categoria,
      vagas: vagas.filter(vaga => vaga.categoria === categoria.id)
    };
  });
  response.render("home", { categorias });
});

app.get("/vaga/:id", async (request, response) => {
  const db = await dbConnection;
  const vaga = await db.get(
    `select * from vagas where id = ${request.params.id}`
  );
  response.render("vaga", { vaga });
});

app.get("/admin", (req, res) => {
  res.render("admin/home");
});

//region CRUD categorias
app.get("/admin/categorias", async (req, res) => {
  const db = await dbConnection;
  const categorias = await db.all(
    "SELECT " +
      "c.id, c.categoria, count(v.id) quantidadeVagas " +
      "from categorias c " +
      "left join vagas v on c.id = v.categoria " +
      "group by c.id, c.categoria " +
      "order by count(v.id) desc "
  );
  res.render("admin/categorias", { categorias });
});

app.get("/admin/categorias/nova", async (req, res) => {
  res.render("admin/nova-categoria");
});
app.post("/admin/categorias/nova", async (req, res) => {
  const { categoria } = req.body;
  const db = await dbConnection;
  await db.run(`insert into categorias (categoria) values ('${categoria}');`);
  res.redirect("/admin/categorias");
});

app.get("/admin/categorias/editar/:id", async (req, res) => {
  const db = await dbConnection;
  const categoria = await db.get(
    `select c.id, c.categoria from categorias c where c.id = ${req.params.id}`
  );
  const { id } = req.params;
  const vagas = await db.all(
    `select v.titulo from vagas v where v.categoria = ${id}`
  );
  res.render("admin/editar-categoria", { categoria, vagas });
});
app.post("/admin/categorias/editar/:id", async (req, res) => {
  const { categoria } = req.body;
  const { id } = req.params;
  const db = await dbConnection;
  await db.run(
    `update categorias set categoria = '${categoria}' where id = ${id};`
  );
  res.redirect("/admin/categorias");
});

app.get("/admin/categorias/delete/:id", async (req, res) => {
  const db = await dbConnection;
  await db.run(`delete from categorias where id = ${req.params.id};`);
  res.redirect("/admin/categorias");
});
//endregion

// region CRUD Vagas
app.get("/admin/vagas", async (req, res) => {
  const db = await dbConnection;
  const vagas = await db.all(
    "select " +
      "vagas.id, vagas.categoria, vagas.titulo, categorias.categoria categoriaDescricao " +
      "from vagas " +
      "left join categorias on vagas.categoria = categorias.id;"
  );
  res.render("admin/vagas", { vagas });
});

app.get("/admin/vagas/delete/:id", async (req, res) => {
  const db = await dbConnection;
  await db.run(`delete from vagas where id = ${req.params.id};`);
  res.redirect("/admin/vagas");
});

app.get("/admin/vagas/nova", async (req, res) => {
  const db = await dbConnection;
  const categorias = await db.all("select c.* from categorias c");
  res.render("admin/nova-vaga", { categorias });
});
app.post("/admin/vagas/nova", async (req, res) => {
  const { titulo, descricao, categoria } = req.body;
  const db = await dbConnection;
  await db.run(
    `insert into vagas (categoria, titulo, descricao) values (${categoria}, '${titulo}', '${descricao}');`
  );
  res.redirect("/admin/vagas");
});

app.get("/admin/vagas/editar/:id", async (req, res) => {
  const db = await dbConnection;
  const categorias = await db.all("select c.* from categorias c");
  const vaga = await db.get(
    `select v.* from vagas v where v.id = ${req.params.id}`
  );
  res.render("admin/editar-vaga", { categorias, vaga });
});
app.post("/admin/vagas/editar/:id", async (req, res) => {
  const { titulo, descricao, categoria } = req.body;
  const { id } = req.params;
  const db = await dbConnection;
  await db.run(
    `update vagas set categoria = ${categoria}, descricao = '${descricao}', titulo = '${titulo}' where id = ${id};`
  );
  res.redirect("/admin/vagas");
});
// endregion

const init = async () => {
  const db = await dbConnection;
  await db.run(
    "create table if not exists categorias (id INTEGER PRIMARY KEY, categoria TEXT);"
  );
  await db.run(
    "create table if not exists vagas (id INTEGER PRIMARY KEY, categoria INTEGER, titulo TEXT, descricao TEXT);"
  );

  // await db.run("delete from categorias;");
  // await db.run("delete from vagas;");

  // // inserindo uma carga inicial na base de dados
  // const categorias = ["Engineering team", "Marketing team"];
  // await categorias.map(categoria => {
  //   db.run(`insert into categorias (categoria) values ('${categoria}')`);
  // });

  // const vagas = [
  //   {
  //     categoria: 1,
  //     titulo: "Fullstack Developer (Remote)",
  //     descricao: "vaga para fullstack developer que fez o Fullstack Lab"
  //   },
  //   {
  //     categoria: 2,
  //     titulo: "Marketing Digital (San Francisco)",
  //     descricao: ""
  //   },
  //   { categoria: 2, titulo: "Social Media", descricao: "" }
  // ];
  // await vagas.map(vaga => {
  //   db.run(
  //     `insert into vagas (categoria, titulo, descricao) values (${
  //       vaga.categoria
  //     }, '${vaga.titulo}', '${vaga.descricao}');`
  //   );
  // });
};

init();

app.listen(PORT, err => {
  if (err) {
    console.log("Não foi possível iniciar o servidor");
  } else {
    console.log("Jobify server is running.", `(http://localhost:${PORT})`);
  }
});
