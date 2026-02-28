const express = require("express");
const path = require("path");
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

function layout(contenido) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="/style.css">
        <title>Sistema Biblioteca</title>
    </head>
    <body>
        <div class="page-container">
            ${contenido}
        </div>
    </body>
    </html>
    `;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: 'mi_secreto',
    resave: false,
    saveUninitialized: false
}));

function verificarLogin(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login.html');
    }
}

function formatearFecha() {
    return new Date().toLocaleString("es-ES", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}

function soloAdmin(req, res, next) {
    if (req.session.usuario && req.session.usuario.rol === "admin") {
        next();
    } else {
        res.send("Acceso restringido solo para administradores.");
    }
}

// Base de datos temporal en memoria
let usuarios = [
    {
        id: 1,
        nombre: "Administrador",
        email: "admin@lectured.com",
        usuario: "admin",
        clave: "admin123",
        rol: "admin"
    }
];

let libros = [];
let resenas = [];
let grupos = [];
let notificaciones = [];

// Listas de palabras prohibidas
   const palabrasProhibidas = [
    "idiota",
    "estupido",
    "estúpido",
    "tonto",
    "imbecil",
    "imbécil",
    "inutil",
    "inútil",
    "ignorante",
    "patetico",
    "patético",
    "basura",
    "asqueroso",
    "asquerosa",
    "horrible",
    "repugnante",
    "ridiculo",
    "ridículo",
    "despreciable",
    "maldito",
    "maldita",
    "malparido",
    "malparida",
    "estupidez",
    "porqueria",
    "porquería",
    "odiar",
    "odio",
    "mierda"
];

// Función para detectar lenguaje ofensivo
function contieneLenguajeOfensivo(texto) {

    const textoNormalizado = texto
        .toLowerCase()
        .replace(/4/g, "a")
        .replace(/1/g, "i")
        .replace(/3/g, "e")
        .replace(/0/g, "o")
        .replace(/5/g, "s");

    return palabrasProhibidas.some(palabra => {
        const regex = new RegExp(`\\b${palabra}\\b`, "i");
        return regex.test(textoNormalizado);
    });
}

// Registrar
app.post("/registro", (req, res) => {

    const { nombre, email, usuario, clave } = req.body;

    const existeUsuario = usuarios.find(u => u.usuario === usuario);
    if (existeUsuario) {
        return res.send("El usuario ya existe.");
    }

    const existeEmail = usuarios.find(u => u.email === email);
    if (existeEmail) {
        return res.send("El correo ya está registrado.");
    }

    let nuevoId = 1;

    if (usuarios.length > 0) {
        const ultimoId = Math.max(...usuarios.map(u => u.id || 0));
        nuevoId = ultimoId + 1;
    }

    const nuevoUsuario = {
        id: nuevoId,
        nombre,
        email,
        usuario,
        clave,
        rol: "usuario"
    };

    usuarios.push(nuevoUsuario);

    req.session.usuario = nuevoUsuario;

    res.redirect("/panel");
});

// Crear usuario
app.get("/crear-usuario", verificarLogin, soloAdmin, (req, res) => {
    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Crear Nuevo Usuario</h2>
        <form action="/crear-usuario" method="POST">
            <input type="text" name="nombre" placeholder="Nombre" required><br><br>
            <input type="email" name="email" placeholder="Email" required><br><br>
            <input type="text" name="usuario" placeholder="Usuario" required><br><br>
            <input type="password" name="clave" placeholder="Contraseña" required><br><br>

            <select name="rol">
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
            </select><br><br>

            <button type="submit">Crear Usuario</button>
        </form>

        <br>
        <a href="/panel">Volver al panel</a>
        
        </div>
    `);
});

// Guarda Usuario
app.post("/crear-usuario", verificarLogin, soloAdmin, (req, res) => {

    const { nombre, email, usuario, clave, rol } = req.body;

    const existe = usuarios.find(u => u.usuario === usuario);
    if (existe) {
        return res.send("El usuario ya existe.");
    }

    let nuevoId = 1;

    if (usuarios.length > 0) {
        const ultimoId = Math.max(...usuarios.map(u => u.id || 0));
        nuevoId = ultimoId + 1;
    }

    const nuevoUsuario = {
        id: nuevoId,
        nombre,
        email,
        usuario,
        clave,
        rol
    };

    usuarios.push(nuevoUsuario);

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Usuario creado correctamente ✅</h2>
        <a href="/usuarios">Volver a gestión de usuarios</a>

        </div>
    `);
});

// Ruta para login
app.post("/login", (req, res) => {
    const { usuario, clave } = req.body;

    // Buscar usuario SOLO por nombre de usuario
    const usuarioEncontrado = usuarios.find(u => u.usuario === usuario);

    // Si no existe el usuario
    if (!usuarioEncontrado) {
        return res.redirect("/login.html?error=noexiste");
    }

    // Si la contraseña es incorrecta
    if (usuarioEncontrado.clave !== clave) {
        return res.redirect("/login.html?error=claveincorrecta");
    }

    // Si todo está correcto
    req.session.usuario = usuarioEncontrado;
    res.redirect("/panel");
});

// Mostrar lista de usuarios
app.get("/usuarios", verificarLogin, soloAdmin, (req, res) => {

    let tabla = `
    <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

    <h2>Gestión de Usuarios</h2>
    <table border="1" style="margin:auto; border-collapse:collapse;">
        <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Acciones</th>
        </tr>
        
        </div>
    `;

    usuarios.forEach(u => {
        tabla += `
        <tr>
            <td>${u.id}</td>
            <td>${u.nombre}</td>
            <td>${u.email}</td>
            <td>${u.usuario}</td>
            <td>${u.rol}</td>
            <td>
                <a href="/editar/${u.id}">Editar</a> |
                <a href="/eliminar/${u.id}" 
   onclick="return confirm('Está seguro que desea eliminar este usuario?');">
   Eliminar
</a>
            </td>
        </tr>
        `;
    });

    tabla += "</table><br><a href='/panel'>Volver al panel</a>";

    res.send(tabla);
});


// Eliminar usuario
app.get("/eliminar/:id", verificarLogin, soloAdmin, (req, res) => {
    const id = parseInt(req.params.id);

    usuarios = usuarios.filter(u => u.id !== id);

    res.redirect("/usuarios");
});

// Muestra el formulario
   app.get("/agregar-libro", verificarLogin, soloAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "agregar-libro.html"));
});


// Agregar libro
app.post("/agregar-libro", verificarLogin, soloAdmin, (req, res) => {

    const { titulo, autor, precio } = req.body;

    const nuevoLibro = {
        id: libros.length + 1,
        titulo,
        autor,
        precio
    };

    libros.push(nuevoLibro);

    res.send("Libro agregado correctamente 📚 <a href='/catalogo'>Ver catálogo</a>");
});

// Mostrar catálogo
app.get("/catalogo", verificarLogin, (req, res) => {

    let contenido = `
    <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

    <h2>Catálogo de Libros</h2>
    <table border="1" style="margin:auto; border-collapse:collapse;">
        <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Autor</th>
            <th>Precio (COP)</th>
            <th>Acción</th>
        </tr>

        </div>
    `;

    libros.forEach(libro => {
        contenido += `
        <tr>
            <td>${libro.id}</td>
            <td>${libro.titulo}</td>
            <td>${libro.autor}</td>
            <td>${libro.precio}</td>
            <td>
                <a href="/comprar/${libro.id}">Comprar</a> |
                <a href="/eliminar-libro/${libro.id}">Eliminar</a>
            </td>
        </tr>
        `;
    });

    contenido += "</table><br><div style='text-align:center;'><a href='/panel'>Volver al panel</a></div>";

    res.send(contenido);
});

// Eliminar libro
app.get("/eliminar-libro/:id", verificarLogin, soloAdmin, (req, res) => {
    const id = parseInt(req.params.id);

    libros = libros.filter(l => l.id !== id);

    res.redirect("/catalogo");
});

// Comprar libro
app.get("/comprar/:id", verificarLogin, (req, res) => {
    const id = parseInt(req.params.id);

    const libro = libros.find(l => l.id === id);

    if (libro) {
        res.send(`
            <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

            <h2>Compra realizada con éxito 🎉</h2>
            <p>Has comprado: <strong>${libro.titulo}</strong></p>
            <p>Precio: $${libro.precio} COP</p>
            <a href="/catalogo">Volver al catálogo</a>
            
            </div>
        `);
    } else {
        res.send("Libro no encontrado.");
    }
});

// Crear Reseña
app.post("/crear-resena", verificarLogin, (req, res) => {
    const { libro, genero, autor, opinion, calificacion } = req.body;

    // Verificar lenguaje ofensivo
    if (contieneLenguajeOfensivo(opinion)) {
        return res.send(`
            <h2>⚠️ Lenguaje inapropiado detectado</h2>
            <p>Tu reseña contiene palabras ofensivas y no puede ser publicada.</p>
            <a href="/crear-resena">Volver</a>
        `);
    }

    const nuevaResena = {
    id: Date.now(),
    usuario: req.session.usuario,
    libro,
    genero,
    autor,
    opinion,
    calificacion: parseInt(calificacion),
    fechaPublicacion: new Date().toLocaleString("es-CO"),
    fechaEdicion: null,
    comentarios: [],
    calificacionesUsuarios: [],
    reacciones: []
};

    resenas.push(nuevaResena);

    res.redirect("/ver-resenas");
});

// Comentar reseña
app.post("/comentar/:id", verificarLogin, (req, res) => {

    const resena = resenas.find(r => r.id == req.params.id);

    if (!resena) {
        return res.send("Reseña no encontrada");
    }

    const texto = req.body.comentario;

    if (contieneLenguajeOfensivo(texto)) {
        return res.send(`
            <h2>⚠️ Lenguaje inapropiado detectado</h2>
            <p>Tu comentario contiene palabras ofensivas y no puede ser publicado.</p>
            <a href="/ver-resenas">Volver</a>
        `);
    }

    const nuevoComentario = {
        usuario: req.session.usuario,
        texto,
        fecha: new Date().toLocaleString("es-CO"),
    };

    resena.comentarios.push(nuevoComentario);

   if (resena.usuario.usuario !== req.session.usuario.usuario) {
    notificaciones.push({
        usuarioDestino: resena.usuario.usuario,
        mensaje: `${req.session.usuario.usuario} comentó tu reseña "${resena.libro}"`,
        leida: false,
        fecha: new Date().toLocaleString("es-CO"),
    });
}

    res.redirect("/ver-resenas");
});

// Calificar reseña
app.post("/calificar-resena/:id", verificarLogin, (req, res) => {

    const resena = resenas.find(r => r.id == req.params.id);

    if (!resena) {
        return res.send("Reseña no encontrada.");
    }

    const puntuacion = parseInt(req.body.puntuacion);
    const usuarioActual = req.session.usuario.usuario;

    const calificacionExistente = resena.calificacionesUsuarios.find(c => c.usuario === usuarioActual);

    if (calificacionExistente) {
    
        calificacionExistente.puntuacion = puntuacion;
    } else {
    
        resena.calificacionesUsuarios.push({
            usuario: usuarioActual,
            puntuacion
        });
    }

    res.redirect("/ver-resenas");
});

// Visualizar Reseñas
app.get("/ver-resenas", verificarLogin, (req, res) => {

    const busqueda = req.query.buscar ? req.query.buscar.toLowerCase() : "";

    let html = `
        <h1>Reseñas de Libros</h1>
        <a href="/panel">Volver al panel</a>

        <form method="GET" action="/ver-resenas">
        <input type="text" name="buscar" placeholder="Buscar por título, autor o género...">
        <button type="submit">Buscar</button>
        </form>

        <hr>
    `;

    resenas
    .filter(r =>
    r.libro.toLowerCase().includes(busqueda) ||
    r.autor.toLowerCase().includes(busqueda) ||
    r.genero.toLowerCase().includes(busqueda)
)

.forEach(r => {

    let botones = "";

    if (
        req.session.usuario.rol === "admin" ||
        r.usuario.usuario === req.session.usuario.usuario
    ) {
        botones = `
            <a href="/editar-resena/${r.id}">Editar</a> |
            <a href="/eliminar-resena/${r.id}" 
               onclick="return confirm('Está seguro que desea eliminar esta reseña?');">
               Eliminar
            </a>
        `;
    }

    let promedio = 0;

    if (r.calificacionesUsuarios && r.calificacionesUsuarios.length > 0) {
        const suma = r.calificacionesUsuarios.reduce((acc, c) => acc + c.puntuacion, 0);
        promedio = (suma / r.calificacionesUsuarios.length).toFixed(1);
    }

    const likes = r.reacciones?.filter(x => x.tipo === "like").length || 0;
    const dislikes = r.reacciones?.filter(x => x.tipo === "dislike").length || 0;
    const love = r.reacciones?.filter(x => x.tipo === "love").length || 0;

    let comentariosHtml = "";
    r.comentarios.forEach(c => {
        comentariosHtml += `
        <div style="margin-left:20px; padding:5px; border-left:2px solid gray;">
        <strong>${c.usuario.usuario}</strong>: ${c.texto}<br>
        <small>${c.fecha}</small>
        </div>
        `;
    });

    html += `
        <div style="border:1px solid #ccc; padding:10px; margin:10px;">
            <strong>Libro:</strong> ${r.libro}<br>
            <strong>Género:</strong> ${r.genero}<br>
            <strong>Autor:</strong> ${r.autor}<br>
            <strong>Opinión:</strong> ${r.opinion}<br>
            <strong>Publicado:</strong> ${r.fechaPublicacion}<br>
            <strong>Editado:</strong> ${r.fechaEdicion ? r.fechaEdicion : "No editado"}<br>
            <strong></strong> ${"⭐".repeat(r.calificacion)}<br>
            <strong>Promedio usuarios:</strong> ${promedio > 0 ? promedio + " ⭐" : "Sin calificaciones"}<br><br>
            
            <div>
            <a href="/reaccion-resena/${r.id}/like">👍 ${likes}</a>
            <a href="/reaccion-resena/${r.id}/dislike">👎 ${dislikes}</a>
            <a href="/reaccion-resena/${r.id}/love">❤️ ${love}</a>
            </div>
            
            ${botones}

            <hr>
            <strong>Comentarios:</strong><br>
            ${comentariosHtml}

            <form method="POST" action="/comentar/${r.id}">
                <input name="comentario" placeholder="Escribe un comentario..." required>
                <button type="submit">Comentar</button>
            </form>

            <br>

            <form method="POST" action="/calificar-resena/${r.id}">
                <label>Calificar esta reseña:</label>
                <select name="puntuacion" required>
                    <option value="1">1 ⭐</option>
                    <option value="2">2 ⭐⭐</option>
                    <option value="3">3 ⭐⭐⭐</option>
                    <option value="4">4 ⭐⭐⭐⭐</option>
                    <option value="5">5 ⭐⭐⭐⭐⭐</option>
                </select>
                <button type="submit">Calificar</button>
            </form>

        </div>
    `;
});

    res.send(layout(html));
});

// Reaccionar Reseña
app.get("/reaccion-resena/:id/:tipo", verificarLogin, (req, res) => {

    const resena = resenas.find(r => r.id == req.params.id);

    if (!resena) return res.send("Reseña no encontrada.");

    const usuarioActual = req.session.usuario.usuario;
    const tipo = req.params.tipo; // like, dislike, love

    if (!resena.reacciones) {
        resena.reacciones = [];
    }

    const reaccionExistente = resena.reacciones.find(
        r => r.usuario === usuarioActual
    );

    if (reaccionExistente) {

        reaccionExistente.tipo = tipo;
    } else {

        resena.reacciones.push({
            usuario: usuarioActual,
            tipo: tipo
        });
    }

    if (resena.usuario.usuario !== usuarioActual) {
    notificaciones.push({
        usuarioDestino: resena.usuario.usuario,
        mensaje: `${usuarioActual} reaccionó a tu reseña "${resena.libro}"`,
        leida: false,
        fecha: new Date().toLocaleString()
    });
}
    res.redirect("/ver-resenas");
});

// Editar Reseña get
app.get("/editar-resena/:id", verificarLogin, (req, res) => {
    const resena = resenas.find(r => r.id == req.params.id);

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Editar Reseña</h2>
        <form method="POST" action="/editar-resena/${resena.id}">
            Libro: <input name="libro" value="${resena.libro}"><br>
            Género: <input name="genero" value="${resena.genero}"><br>
            Autor: <input name="autor" value="${resena.autor}"><br>
            Opinión:<br>
            <textarea name="opinion">${resena.opinion}</textarea><br>
            <button type="submit">Guardar cambios</button>
        </form>
        
        </div>
    `);
});

// Editar Reseña post
app.post("/editar-resena/:id", verificarLogin, (req, res) => {

    const resena = resenas.find(r => r.id == req.params.id);

    if (!resena) {
        return res.send("Reseña no encontrada.");
    }

    // Validar lenguaje ofensivo antes de actualizar
    if (contieneLenguajeOfensivo(req.body.opinion)) {
        return res.send(`
            <h2>⚠️ Lenguaje inapropiado detectado</h2>
            <p>No puedes actualizar la reseña con lenguaje ofensivo.</p>
            <a href="/editar-resena/${resena.id}">Volver</a>
        `);
    }

    resena.libro = req.body.libro;
    resena.genero = req.body.genero;
    resena.autor = req.body.autor;
    resena.opinion = req.body.opinion;
    resena.fechaEdicion = formatearFecha();

    res.redirect("/ver-resenas");
});

app.get("/crear-resena", verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "crear-resena.html"));
});

// Panel
app.get("/panel", verificarLogin, (req, res) => {

    const usuario = req.session.usuario;

    let opcionesAdmin = "";

    if (usuario.rol === "admin") {
        opcionesAdmin = `
            <a href="/usuarios">Gestionar usuarios</a><br><br>
            <a href="/crear-usuario">Crear usuario</a><br><br>
            <a href="/agregar-libro">Agregar libro</a><br><br>
        `;
    }

    const usuarioActual = req.session.usuario.usuario;

    const misNotificaciones = notificaciones.filter(
        n => n.usuarioDestino === usuarioActual
    );

    const noLeidas = misNotificaciones.filter(n => !n.leida).length;

    res.send(`
<link rel="stylesheet" href="/style.css">

<div class="panel-container">

    <h2 class="panel-title">Bienvenido ${usuario.usuario}</h2>
    <p class="panel-role">Rol: ${usuario.rol}</p>

    <div class="notification">
        <a href="/notificaciones">
            🔔 ${noLeidas > 0 ? `(${noLeidas})` : ""}
        </a>
    </div>

    <div class="dashboard">

        ${opcionesAdmin}

        <a href="/crear-resena">Crear reseña</a>
        <a href="/ver-resenas">Ver reseñas</a>
        <a href="/ver-grupos">Ver grupos de lectura</a>
        <a href="/crear-grupo">Crear grupo</a>
        <a href="/catalogo">Ver catálogo</a>
        <a href="/logout" class="logout">Cerrar sesión</a>

    </div>

</div>
`);

});


app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/index.html");
    });
});

// Eliminar Reseña
app.get("/eliminar-resena/:id", verificarLogin, (req, res) => {

    const id = parseInt(req.params.id);

    const resena = resenas.find(r => r.id === id);

    if (!resena) {
        return res.send("Reseña no encontrada.");
    }

    // Solo el autor o admin puede borrar
    if (
        req.session.usuario.rol !== "admin" &&
        resena.usuario.usuario !== req.session.usuario.usuario
    ) {
        return res.send("No tienes permiso para eliminar esta reseña.");
    }

    resenas = resenas.filter(r => r.id !== id);

    res.redirect("/ver-resenas");
});

// Crear Grupo
app.get("/crear-grupo", verificarLogin, (req, res) => {
    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Crear Grupo de Lectura</h2>
        <form method="POST" action="/crear-grupo">
            <input name="nombre" placeholder="Nombre del grupo" required><br><br>

            <select name="tipo">
                <option value="publico">Público</option>
                <option value="privado">Privado</option>
            </select><br><br>

            <button type="submit">Crear Grupo</button>
        </form>
        <br>
        <a href="/panel">Volver al panel</a>
        
        </div>
        
        `);
});

// Guardar Grupo
app.post("/crear-grupo", verificarLogin, (req, res) => {

    const nuevoGrupo = {
        id: Date.now(),
        nombre: req.body.nombre,
        tipo: req.body.tipo,
        creador: req.session.usuario.usuario,
        admins: [req.session.usuario.usuario],
        miembros: [req.session.usuario.usuario],
        fechaCreacion: new Date().toLocaleString("es-CO"),
        mensajes: [],
        solicitudes: [],
        actividades: []
    };

    grupos.push(nuevoGrupo);

    res.redirect("/ver-grupos");
});

// Ver grupos
app.get("/ver-grupos", verificarLogin, (req, res) => {

    let html = `
        <h1>Grupos de Lectura</h1>
        <a href="/crear-grupo">Crear nuevo grupo</a><br><br>
        <a href="/panel">Volver al panel</a>
        <hr>
    `;

    grupos.forEach(g => {

        const esMiembro = g.miembros.includes(req.session.usuario.usuario);

            html += `
                <div style="border:1px solid gray; padding:10px; margin:10px;">
                <strong><a href="/grupo/${g.id}">${g.nombre}</a></strong><br>
                Tipo: ${g.tipo}<br>
                    Creador: ${g.creador}<br>
                    Miembros: ${g.miembros.length}<br><br>
                    Fecha de creación: ${g.fechaCreacion}<br>
            `;
            
            if (esMiembro) {
                
            }
            else if (g.tipo === "publico") {
                html += `<a href="/unirse-grupo/${g.id}">Unirse al grupo</a>`;
            }
            else if (g.tipo === "privado") {
                if (g.solicitudes.includes(req.session.usuario.usuario)) {
                    html += `<span>Solicitud pendiente</span>`;
                } else {
                html += `<a href="/solicitar-grupo/${g.id}">Solicitar acceso</a>`;
            }

            }

            html += `</div>`;
        });

    res.send(layout(html));
});

// Unirse a grupo
app.get("/unirse-grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    const usuario = req.session.usuario.usuario;

    if (!grupo.miembros.includes(usuario)) {
        grupo.miembros.push(usuario);
    }

    res.redirect("/ver-grupos");
});

// Solicitar grupo
app.get("/solicitar-grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    const usuarioActual = req.session.usuario.usuario;

    // Si ya es miembro, redirigir
    if (grupo.miembros.includes(usuarioActual)) {
        return res.redirect("/grupo/" + grupo.id);
    }

    // Si no existe solicitudes, crearla
    if (!grupo.solicitudes) {
        grupo.solicitudes = [];
    }

    // Evitar solicitudes repetidas
    if (!grupo.solicitudes.includes(usuarioActual)) {
        grupo.solicitudes.push(usuarioActual);
    }

    res.send(`

        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Solicitud enviada</h2>
        <p>Tu solicitud fue enviada al administrador del grupo.</p>
        <a href="/ver-grupos">Volver</a>

        </div>
    `);
});

// Ver grupo individual
app.get("/grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    const usuarioActual = req.session.usuario.usuario;
    const esMiembro = grupo.miembros.includes(usuarioActual);

    if (!esMiembro) {
        return res.send("Debes pertenecer al grupo para ver su contenido.");
    }

    let botonGestion = "";

if (grupo.creador === usuarioActual) {

    botonGestion += `
        <a href="/gestionar-admins/${grupo.id}">
            Gestionar administradores
        </a><br><br>

        <a href="/eliminar-grupo/${grupo.id}"
           onclick="return confirm('Está seguro que desea eliminar este grupo?');">
           Eliminar grupo
        </a><br><br>
    `;

}

else if (
    Array.isArray(grupo.admins) &&
    grupo.admins.includes(usuarioActual)
) {

    botonGestion += `
        <p><strong>🛡️ Eres administrador del grupo</strong></p>
        <a href="/salir-grupo/${grupo.id}">
            Salir del grupo
        </a><br><br>
    `;

}

else {

    botonGestion += `
        <a href="/salir-grupo/${grupo.id}">
            Salir del grupo
        </a><br><br>
    `;
}

    let miembrosHtml = grupo.miembros.map(m => {

    const esAdmin = Array.isArray(grupo.admins) && grupo.admins.includes(m);
    const esCreador = m === grupo.creador;

    let botonEliminar = "";

    const esAdminActual = Array.isArray(grupo.admins) && grupo.admins.includes(usuarioActual);
    const esCreadorActual = usuarioActual === grupo.creador;

    if ((esCreadorActual || esAdminActual) && !esCreador) {

        if (esCreadorActual || !esAdmin) {
            botonEliminar = `
                <a href="/expulsar-miembro/${grupo.id}/${m}"
                   onclick="return confirm('Expulsar usuario del grupo?');">
                   Expulsar
                </a>
            `;
        }
    }

    return `
        <li>
            ${m}
            ${esCreador ? " 👑 (Creador)" : ""}
            ${esAdmin && !esCreador ? " 🛡️ (Admin)" : ""}
            ${botonEliminar}
        </li>
    `;
}).join("");

        let solicitudesHtml = "";

if (
    Array.isArray(grupo.admins) &&
    grupo.admins.includes(usuarioActual) &&
    grupo.solicitudes &&
    grupo.solicitudes.length > 0
) {
    solicitudesHtml = `
        <h3>Solicitudes pendientes</h3>
        ${grupo.solicitudes.map(s => `
            <div style="margin-bottom:5px;">
                ${s}
                <a href="/aceptar-solicitud/${grupo.id}/${s}">Aceptar</a>
                <a href="/rechazar-solicitud/${grupo.id}/${s}">Rechazar</a>
            </div>
        `).join("")}
        <hr>
    `;
}

let actividadesHtml = "";

if (grupo.actividades && grupo.actividades.length > 0) {

    actividadesHtml = `
        <h3>Actividades programadas</h3>
        ${grupo.actividades.map(a => `
            <div style="border:1px solid #ccc; padding:5px; margin:5px;">
                <strong>${a.titulo}</strong><br>
                Fecha: ${a.fecha}<br>
                Hora: ${a.hora}<br>
                Creado por: ${a.creador}
            </div>
        `).join("")}
        <hr>
    `;
}

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Grupo: ${grupo.nombre}</h2>
        <p>Tipo: ${grupo.tipo}</p>
        <p>Creador: ${grupo.creador}</p>
        <p>Fecha de creación: ${grupo.fechaCreacion}</p>

        ${botonGestion}

        <h3>Miembros:</h3>
        <ul>
            ${miembrosHtml}
        </ul>

        ${solicitudesHtml}
        <a href="/crear-actividad/${grupo.id}">Programar actividad</a><br><br>

        ${actividadesHtml}
        <h3>Chat del grupo</h3>
        
        ${grupo.mensajes.map(m => {
            
            let etiqueta = "👤";
            
            if (m.usuario === grupo.creador) {
                etiqueta = "👑";
            } 
            
            else if (Array.isArray(grupo.admins) && grupo.admins.includes(m.usuario)) {
                etiqueta = "🛡️";
            }
            
            return `
            
            <div style="border-bottom:1px solid #ccc; padding:5px;">
            <strong>${m.usuario} ${etiqueta}</strong>: ${m.texto}<br>
            <small>${m.fecha}</small>
            </div>
            `;
        
        }).join("")}
            
            <br>
            
            <form method="POST" action="/mensaje-grupo/${grupo.id}">
            <input name="mensaje" placeholder="Escribe tu mensaje..." required>
            <button type="submit">Enviar</button>
            
            </form>

            <hr>

        <a href="/ver-grupos">Volver</a>

        </div>
    `);
});

// Salir del grupo
app.get("/salir-grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    const usuario = req.session.usuario.usuario;

    grupo.miembros = grupo.miembros.filter(m => m !== usuario);

    res.redirect("/ver-grupos");
});

// Eliminar grupo
app.get("/eliminar-grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    if (grupo.creador !== req.session.usuario.usuario) {
        return res.send("Solo el creador puede eliminar el grupo.");
    }

    grupos = grupos.filter(g => g.id != req.params.id);

    res.redirect("/ver-grupos");
});

// Mensaje grupo
app.post("/mensaje-grupo/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) {
        return res.send("Grupo no encontrado.");
    }

    const usuarioActual = req.session.usuario.usuario;

    if (!grupo.miembros.includes(usuarioActual)) {
        return res.send("No perteneces a este grupo.");
    }

    if (contieneLenguajeOfensivo(req.body.mensaje)) {
    return res.send(`
        <h2>⚠️ Lenguaje inapropiado detectado</h2>
        <p>Tu mensaje contiene palabras ofensivas y no puede ser publicado.</p>
        <a href="/grupo/${grupo.id}">Volver al grupo</a>
    `);
}

    grupo.mensajes.push({
        usuario: usuarioActual,
        texto: req.body.mensaje,
        fecha: new Date().toLocaleString()
    });

    res.redirect("/grupo/" + grupo.id);
});

// Aceptar Solicitud
app.get("/aceptar-solicitud/:grupoId/:usuario", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.grupoId);

    if (!grupo) return res.send("Grupo no encontrado.");

    if (!Array.isArray(grupo.admins) ||
        !grupo.admins.includes(req.session.usuario.usuario)) {
        return res.send("No tienes permisos.");
    }

    grupo.miembros.push(req.params.usuario);

    grupo.solicitudes = grupo.solicitudes.filter(
        s => s !== req.params.usuario
    );

    res.redirect("/grupo/" + grupo.id);
});

// Rechazar solicitud
app.get("/rechazar-solicitud/:grupoId/:usuario", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.grupoId);

    if (!grupo) return res.send("Grupo no encontrado.");

    if (!Array.isArray(grupo.admins) ||
        !grupo.admins.includes(req.session.usuario.usuario)) {
        return res.send("No tienes permisos.");
    }

    grupo.solicitudes = grupo.solicitudes.filter(
        s => s !== req.params.usuario
    );

    res.redirect("/grupo/" + grupo.id);
});

// Gestionar Admins
app.get("/gestionar-admins/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) return res.send("Grupo no encontrado.");

    const usuarioActual = req.session.usuario.usuario;

    if (grupo.creador !== usuarioActual) {
        return res.send("No tienes permiso para gestionar administradores.");
    }

    let listaMiembros = grupo.miembros.map(m => {

        const esAdmin = grupo.admins.includes(m);

        return `
            <div>
                ${m}
                ${esAdmin ? "(Admin)" : ""}
                ${m !== grupo.creador ? `
                    <a href="/toggle-admin/${grupo.id}/${m}">
                        ${esAdmin ? "Quitar admin" : "Hacer admin"}
                    </a>
                ` : "(Creador)"}
            </div>
        `;
    }).join("");

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Gestionar administradores</h2>
        ${listaMiembros}
        <br><br>
        <a href="/grupo/${grupo.id}">Volver al grupo</a>

        </div>
    `);
});

// Quitar admins
app.get("/toggle-admin/:grupoId/:usuario", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.grupoId);
    if (!grupo) return res.send("Grupo no encontrado.");

    const usuarioActual = req.session.usuario.usuario;

    if (grupo.creador !== usuarioActual) {
        return res.send("No tienes permiso.");
    }

    const usuarioObjetivo = req.params.usuario;

    if (!grupo.admins.includes(usuarioObjetivo)) {
        grupo.admins.push(usuarioObjetivo);
    } else {
        grupo.admins = grupo.admins.filter(a => a !== usuarioObjetivo);
    }

    res.redirect(`/gestionar-admins/${grupo.id}`);
});

// Expulsar miembros
app.get("/expulsar-miembro/:id/:usuario", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);
    if (!grupo) return res.send("Grupo no encontrado.");

    const usuarioActual = req.session.usuario.usuario;
    const usuarioExpulsar = req.params.usuario;

    const esCreador = usuarioActual === grupo.creador;
    const esAdmin = Array.isArray(grupo.admins) && grupo.admins.includes(usuarioActual);

    if (!esCreador && !esAdmin) {
        return res.send("No tienes permiso.");
    }

    if (usuarioExpulsar === grupo.creador) {
        return res.send("No se puede expulsar al creador.");
    }

    if (!esCreador && grupo.admins.includes(usuarioExpulsar)) {
        return res.send("Un admin no puede expulsar a otro admin.");
    }

    grupo.miembros = grupo.miembros.filter(m => m !== usuarioExpulsar);
    grupo.admins = grupo.admins.filter(a => a !== usuarioExpulsar);

    res.redirect(`/grupo/${grupo.id}`);
});

// Crear actividad
app.get("/crear-actividad/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) return res.send("Grupo no encontrado.");

    const usuarioActual = req.session.usuario.usuario;

    if (!grupo.miembros.includes(usuarioActual)) {
        return res.send("No tienes acceso.");
    }

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Programar actividad en ${grupo.nombre}</h2>

        <form method="POST" action="/crear-actividad/${grupo.id}">
            <input name="titulo" placeholder="Título de la actividad" required><br><br>
            <input type="date" name="fecha" required><br><br>
            <input type="time" name="hora" required><br><br>
            <button type="submit">Crear actividad</button>
        </form>

        </div>

        <br>
        <a href="/grupo/${grupo.id}">Volver</a>
    `);
});

// Guardar actividad
app.post("/crear-actividad/:id", verificarLogin, (req, res) => {

    const grupo = grupos.find(g => g.id == req.params.id);

    if (!grupo) return res.send("Grupo no encontrado.");

    const usuarioActual = req.session.usuario.usuario;

    if (!grupo.miembros.includes(usuarioActual)) {
        return res.send("No tienes acceso.");
    }

    const nuevaActividad = {
        titulo: req.body.titulo,
        fecha: req.body.fecha,
        hora: req.body.hora,
        creador: usuarioActual
    };

    grupo.actividades.push(nuevaActividad);

    res.redirect("/grupo/" + grupo.id);
});

// Notificaciones
app.get("/notificaciones", verificarLogin, (req, res) => {

    const usuarioActual = req.session.usuario.usuario;

    const misNotificaciones = notificaciones.filter(
        n => n.usuarioDestino === usuarioActual
    );

    let html = `
        <h2>Notificaciones</h2>
        <a href="/panel">Volver</a>
        <hr>
    `;

    misNotificaciones.forEach(n => {

        html += `
            <div style="border:1px solid gray; padding:5px; margin:5px;">
                ${n.leida ? "" : "<strong>Nuevo</strong><br>"}
                ${n.mensaje}<br>
                <small>${n.fecha}</small>
            </div>
        `;

        n.leida = true; // marcar como leída
    });

    res.send(html);
});

// Mostrar formulario de edición
app.get("/editar/:id", verificarLogin, soloAdmin, (req, res) => {

    const id = parseInt(req.params.id);
    const usuario = usuarios.find(u => u.id === id);

    if (!usuario) {
        return res.send("Usuario no encontrado.");
    }

    res.send(`
        <link rel="stylesheet" href="/style.css">
        
        <div class="page-container">

        <h2>Editar Usuario</h2>
        <form action="/editar/${usuario.id}" method="POST">
            <input type="text" name="nombre" value="${usuario.nombre}" required><br><br>
            <input type="email" name="email" value="${usuario.email}" required><br><br>
            <button type="submit">Actualizar</button>
        </form>
        
        </div>
    `);
});

// Actualizar usuario
app.post("/editar/:id", verificarLogin, soloAdmin, (req, res) => {

    const id = parseInt(req.params.id);
    const usuario = usuarios.find(u => u.id === id);

    if (usuario) {
        usuario.nombre = req.body.nombre;
        usuario.email = req.body.email;
    }

    res.redirect("/usuarios");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor iniciado");
});