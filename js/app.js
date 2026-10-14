let ramoActivoId = null;

// Registro del Service Worker para funcionalidades PWA y notificaciones
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registrado con éxito:', registration.scope))
            .catch(err => console.log('Fallo al registrar el ServiceWorker:', err));
    });
}

// Lógica para el botón de instalar PWA
let promptInstalacion;
const btnInstalar = document.getElementById('btn-instalar');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacion = e;
    if(btnInstalar) btnInstalar.hidden = false;
});

if(btnInstalar) {
    btnInstalar.addEventListener('click', () => {
        if (promptInstalacion) {
            promptInstalacion.prompt();
            promptInstalacion.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('El usuario aceptó la instalación');
                }
                promptInstalacion = null;
                btnInstalar.hidden = true;
            });
        }
    });
}

// Función para traer el estado del ramo (Demo Inicial)
async function cargarEstadoRamo() {
    try {
        const respuesta = await fetch('http://127.0.0.1:8000/asignaturas/1/estado');
        const datos = await respuesta.json();
        
        const uiRamoNombre = document.getElementById('ui-ramo-nombre');
        const uiPromedio = document.getElementById('ui-promedio');
        const uiNotaNecesaria = document.getElementById('ui-nota-necesaria');
        
        if(uiRamoNombre) uiRamoNombre.innerText = datos.ramo || "Ramo";
        if(uiPromedio) uiPromedio.innerText = `Promedio actual: ${datos.promedio_actual || 0}`;
        
        if (uiNotaNecesaria) {
            if (datos.nota_para_aprobar !== null && datos.nota_para_aprobar !== undefined) {
                if (datos.nota_para_aprobar <= 1.0) {
                    uiNotaNecesaria.innerHTML = `<strong>¡Ya aprobaste el ramo!</strong> 🎉 Solo ve a firmar la prueba.`;
                } else {
                    uiNotaNecesaria.innerHTML = `Nota que necesitas: <strong>${datos.nota_para_aprobar}</strong> para aprobar 🎯`;
                }
            } else {
                uiNotaNecesaria.innerHTML = `<strong>¡Ya rendiste todo!</strong> 🏆`;
            }
        }
    } catch (error) {
        console.error("Error conectando al backend:", error);
    }
}
cargarEstadoRamo();

// Botón para generar PDF específico
const btnGenerarGuia = document.getElementById('btn-generar-guia');
if(btnGenerarGuia) {
    btnGenerarGuia.addEventListener('click', async () => {
        const evalSelect = document.getElementById('ia-select-eval');
        if(!evalSelect) return;
        
        const evalId = evalSelect.value;
        const contenedorResultado = document.getElementById('resultado-ia');
        const boton = document.getElementById('btn-generar-guia');

        if (!evalId) {
            alert("Por favor selecciona un ramo y una prueba para generar la guía.");
            return;
        }

        boton.innerText = "Generando PDF... ⏳";
        contenedorResultado.innerText = "Analizando temas y creando documento...";

        try {
            const respuesta = await fetch(`http://127.0.0.1:8000/ia/guia/evaluacion/${evalId}/pdf`);
            if (!respuesta.ok) throw new Error("Error en el servidor");
            
            const blob = await respuesta.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            a.download = "Guia_Estudio.pdf"; 
            document.body.appendChild(a);
            a.click(); 
            a.remove(); 
            window.URL.revokeObjectURL(url);
            
            contenedorResultado.innerText = "¡PDF descargado con éxito! 📄✨";
            contenedorResultado.style.color = "#4caf50";
        } catch (error) {
            contenedorResultado.innerText = "Error generando el archivo PDF.";
            contenedorResultado.style.color = "#d32f2f";
        } finally {
            boton.innerText = "Generar PDF de Estudio ✨";
        }
    });
}

// Función para obtener y mostrar los ramos desde el backend
async function cargarRamos() {
    const lista = document.getElementById('lista-ramos');
    const select = document.getElementById('select-ramo'); 
    const selectIA = document.getElementById('ia-select-ramo'); 
    
    if(lista) lista.innerHTML = "<li style='color: #888;'>Cargando ramos... ⏳</li>";
    if(select) select.innerHTML = '<option value="">Selecciona un ramo...</option>'; 
    if(selectIA) selectIA.innerHTML = '<option value="">1. Elige un ramo...</option>';

    try {
        const respuesta = await fetch('http://127.0.0.1:8000/asignaturas/');
        if (!respuesta.ok) throw new Error("Error al obtener los datos");
        
        const ramos = await respuesta.json();
        if(lista) lista.innerHTML = ""; 
        
        if (ramos.length === 0 && lista) {
            lista.innerHTML = "<li style='color: #888;'>No hay ramos guardados aún.</li>";
            return;
        }

        ramos.forEach(ramo => {
            if (lista) {
                const li = document.createElement('li');
                li.style.padding = "12px";
                li.style.background = "#2a2a2a";
                li.style.marginBottom = "10px";
                li.style.borderRadius = "6px";
                li.style.borderLeft = "4px solid #9c27b0"; 
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                
                li.innerHTML = `
                    <div>
                        <strong>${ramo.nombre}</strong> 
                        <span style="color: #aaa; font-size: 0.85em; margin-left: 10px;">${ramo.semestre}</span>
                    </div>
                    <div>
                        <button onclick="calcularSupervivencia(${ramo.id}, '${ramo.nombre}')" style="background: #ff9800; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; transition: 0.3s; margin-right: 5px;" title="Alerta de Supervivencia">⚠️</button>
                        <button onclick="verNotas(${ramo.id}, '${ramo.nombre}')" style="background: #2196f3; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; transition: 0.3s; margin-right: 5px;">👁️</button>
                        <button onclick="eliminarRamo(${ramo.id})" style="background: #d32f2f; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; transition: 0.3s;">🗑️</button>
                    </div>
                `;
                lista.appendChild(li);
            }
            if (select) {
                const option = document.createElement('option');
                option.value = ramo.id;
                option.innerText = ramo.nombre;
                select.appendChild(option);
            }
            if (selectIA) {
                const optionIA = document.createElement('option');
                optionIA.value = ramo.id;
                optionIA.innerText = ramo.nombre;
                selectIA.appendChild(optionIA);
            }
        });
    } catch (error) {
        console.error("Error al cargar ramos:", error);
        if(lista) lista.innerHTML = "<li style='color: #d32f2f;'>Error al cargar la lista de ramos.</li>";
    }
}

// Lógica para guardar un nuevo ramo (Ahora envuelto para que cargue seguro)
document.addEventListener('DOMContentLoaded', () => {
    cargarRamos(); // Cargamos la lista al iniciar

    const btnGuardarRamo = document.getElementById('btn-guardar-ramo');
    if(btnGuardarRamo) {
        btnGuardarRamo.addEventListener('click', async () => {
            const inputRamo = document.getElementById('input-nombre-ramo');
            const mensaje = document.getElementById('mensaje-guardado');
            const nombreRamo = inputRamo.value.trim();

            if (nombreRamo === "") {
                mensaje.style.color = "#d32f2f";
                mensaje.innerText = "Por favor, escribe el nombre del ramo.";
                return;
            }

            mensaje.style.color = "#e0e0e0";
            mensaje.innerText = "Guardando... ⏳";

            try {
                const respuesta = await fetch('http://127.0.0.1:8000/asignaturas/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nombre: nombreRamo, 
                        semestre: "Segundo Semestre 2026" 
                    }) 
                });

                if (respuesta.ok) {
                    mensaje.style.color = "#4caf50";
                    mensaje.innerText = "¡Ramo guardado con éxito! 🚀";
                    inputRamo.value = ""; 
                    cargarRamos(); 
                } else {
                    throw new Error("Error en el servidor");
                }
            } catch (error) {
                console.error("Error al guardar:", error);
                mensaje.style.color = "#d32f2f";
                mensaje.innerText = "Error de conexión al guardar el ramo.";
            }
        });
    }
    
    // Lógica para guardar nota
    const btnGuardarNota = document.getElementById('btn-guardar-nota');
    if(btnGuardarNota) {
        btnGuardarNota.addEventListener('click', async () => {
            const ramoId = document.getElementById('select-ramo').value;
            const nombreEval = document.getElementById('input-nombre-eval').value.trim();
            const descEvalElement = document.getElementById('input-desc-eval');
            const descEval = descEvalElement ? descEvalElement.value.trim() : ""; 
            const valorNota = parseFloat(document.getElementById('input-nota').value);
            const valorPorcentaje = parseFloat(document.getElementById('input-ponderacion').value);
            const mensaje = document.getElementById('mensaje-nota');

            if (!ramoId || nombreEval === "" || isNaN(valorNota) || isNaN(valorPorcentaje)) {
                mensaje.style.color = "#d32f2f";
                mensaje.innerText = "Por favor, completa los campos obligatorios.";
                return;
            }

            const descripcionFinal = descEval === "" ? "Sin descripción detallada" : descEval;

            mensaje.style.color = "#e0e0e0";
            mensaje.innerText = "Guardando nota... ⏳";

            try {
                const respuesta = await fetch('http://127.0.0.1:8000/evaluaciones/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        asignatura_id: parseInt(ramoId),
                        titulo: nombreEval,
                        descripcion: descripcionFinal, 
                        fecha: new Date().toISOString(),
                        porcentaje: valorPorcentaje,
                        nota_obtenida: valorNota
                    })
                });

                if (respuesta.ok) {
                    mensaje.style.color = "#4caf50";
                    mensaje.innerText = "¡Nota guardada con éxito! 🚀";
                    document.getElementById('input-nombre-eval').value = "";
                    if(descEvalElement) descEvalElement.value = ""; 
                    document.getElementById('input-nota').value = "";
                    document.getElementById('input-ponderacion').value = "";
                } else {
                    throw new Error("Error del servidor");
                }
            } catch (error) {
                console.error("Error al guardar nota:", error);
                mensaje.style.color = "#d32f2f";
                mensaje.innerText = "Error al guardar. Revisa la consola.";
            }
        });
    }

    // Cargar pruebas cuando se selecciona un ramo en la tarjeta de IA
    const selectIARamo = document.getElementById('ia-select-ramo');
    if(selectIARamo) {
        selectIARamo.addEventListener('change', async (e) => {
            const ramoId = e.target.value;
            const selectEval = document.getElementById('ia-select-eval');
            if(!selectEval) return;

            selectEval.innerHTML = '<option value="">2. Elige una prueba...</option>';
            selectEval.disabled = true;

            if (!ramoId) return;

            try {
                const respuesta = await fetch(`http://127.0.0.1:8000/asignaturas/${ramoId}/evaluaciones`);
                const notas = await respuesta.json();
                
                if (notas.length > 0) {
                    notas.forEach(nota => {
                        const opt = document.createElement('option');
                        opt.value = nota.id;
                        opt.innerText = nota.titulo;
                        selectEval.appendChild(opt);
                    });
                    selectEval.disabled = false; 
                } else {
                    selectEval.innerHTML = '<option value="">Sin pruebas registradas</option>';
                }
            } catch (error) {
                console.error("Error cargando pruebas:", error);
            }
        });
    }
});

// Función para eliminar un ramo
async function eliminarRamo(id) {
    if (!confirm("¿Seguro que quieres eliminar este ramo y todas sus notas?")) {
        return;
    }
    try {
        const respuesta = await fetch(`http://127.0.0.1:8000/asignaturas/${id}`, { method: 'DELETE' });
        if (respuesta.ok) cargarRamos();
        else alert("Error al intentar eliminar el ramo.");
    } catch (error) {
        console.error("Error al eliminar:", error);
        alert("Error de conexión.");
    }
}

// Función para obtener y mostrar las notas de un ramo específico
async function verNotas(idRamo, nombreRamo) {
    const tarjeta = document.getElementById('tarjeta-detalle-notas');
    const titulo = document.getElementById('titulo-detalle-notas');
    const lista = document.getElementById('lista-notas');

    if(tarjeta) tarjeta.style.display = 'block'; 
    if(titulo) titulo.innerText = `Notas: ${nombreRamo}`;
    if(lista) lista.innerHTML = "<li style='color: #888;'>Cargando notas... ⏳</li>";

    try {
        const respuesta = await fetch(`http://127.0.0.1:8000/asignaturas/${idRamo}/evaluaciones`);
        if (!respuesta.ok) throw new Error("Error al obtener notas");

        const notas = await respuesta.json();
        if(lista) lista.innerHTML = ""; 

        if (notas.length === 0 && lista) {
            lista.innerHTML = "<li style='color: #888;'>No hay notas registradas aún.</li>";
            return;
        }

        if(lista) {
            notas.forEach(nota => {
                const li = document.createElement('li');
                li.style.padding = "10px";
                li.style.borderBottom = "1px solid #444";
                li.style.display = "flex";
                li.style.justifyContent = "space-between";
                li.style.alignItems = "center";
                
                const colorNota = nota.nota_obtenida >= 4.0 ? '#4caf50' : '#d32f2f';

                li.innerHTML = `
                    <span>${nota.titulo} <small style="color: #aaa;">(${nota.porcentaje}%)</small></span>
                    <strong style="color: ${colorNota}; font-size: 1.1em;">${nota.nota_obtenida}</strong>
                `;
                lista.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error:", error);
        if(lista) lista.innerHTML = "<li style='color: #d32f2f;'>Error de conexión.</li>";
    }
}

// Función para calcular y mostrar el estado de supervivencia
async function calcularSupervivencia(idRamo, nombreRamo) {
    ramoActivoId = idRamo;
    
    const alertaNombreRamo = document.getElementById('alerta-nombre-ramo');
    const alertaMensaje = document.getElementById('alerta-mensaje');
    const alertaPromedio = document.getElementById('alerta-promedio');
    const alertaPorcentaje = document.getElementById('alerta-porcentaje');

    if(alertaNombreRamo) alertaNombreRamo.innerText = nombreRamo;
    if(alertaMensaje) {
        alertaMensaje.innerText = "Calculando tu futuro... ⏳";
        alertaMensaje.style.color = "#aaa";
    }
    if(alertaPromedio) alertaPromedio.innerText = "-";
    if(alertaPorcentaje) alertaPorcentaje.innerText = "-";

    try {
        const respuesta = await fetch(`http://127.0.0.1:8000/asignaturas/${idRamo}/estado`);
        if (!respuesta.ok) throw new Error("Error de cálculo");
        
        const datos = await respuesta.json();
        
        if(alertaPromedio) alertaPromedio.innerText = datos.promedio_actual;
        if(alertaPorcentaje) alertaPorcentaje.innerText = `${datos.porcentaje_evaluado}% Evaluado`;
        
        if (alertaMensaje) {
            if (datos.estado === "Sin notas") {
                alertaMensaje.innerText = "Aún no tienes notas registradas en este ramo.";
                alertaMensaje.style.color = "#aaa";
            } else if (datos.estado === "Aprobado") {
                alertaMensaje.innerHTML = "¡Ya aprobaste el ramo! 🎉 Solo ve a firmar la prueba.";
                alertaMensaje.style.color = "#4caf50";
            } else if (datos.estado === "Reprobado") {
                alertaMensaje.innerHTML = "Matemáticamente reprobado. 💔";
                alertaMensaje.style.color = "#d32f2f";
            } else {
                alertaMensaje.innerHTML = `Necesitas un <strong style="color: #ff9800; font-size: 1.3em;">${datos.nota_necesaria}</strong> en el ${datos.porcentaje_restante}% restante para aprobar.`;
                alertaMensaje.style.color = "#e0e0e0";
            }
        }
    } catch (error) {
        console.error("Error:", error);
        if(alertaMensaje) {
            alertaMensaje.innerText = "Error al conectar con el motor de cálculo.";
            alertaMensaje.style.color = "#d32f2f";
        }
    }
}

// --- LÓGICA DEL SIMULADOR DE QUIZ ---
let quizActual = []; // Memoria para guardar las respuestas correctas

const btnSimularQuiz = document.getElementById('btn-simular-quiz');
if (btnSimularQuiz) {
    btnSimularQuiz.addEventListener('click', async () => {
        const evalSelect = document.getElementById('ia-select-eval');
        
        if(!evalSelect || !evalSelect.value) {
            alert("Primero elige un ramo y una prueba en la tarjeta del Asistente IA.");
            return;
        }

        const evalId = evalSelect.value;
        const modal = document.getElementById('modal-quiz');
        const contenido = document.getElementById('contenido-quiz');
        
        modal.style.display = 'flex'; // Mostramos la ventana
        contenido.innerHTML = "<div style='text-align: center; color: #aaa; padding: 30px;'>Generando preguntas con Inteligencia Artificial... ⏳<br><small>Esto puede tomar unos 10 segundos</small></div>";

        try {
            const respuesta = await fetch(`http://127.0.0.1:8000/ia/quiz/${evalId}`);
            if (!respuesta.ok) throw new Error("Error conectando con la IA");
            
            const datos = await respuesta.json();
            
            if (datos.error) {
                contenido.innerHTML = `<p style="color: #ff5252; text-align: center;">${datos.error}</p>`;
                return;
            }

            quizActual = datos.quiz;
            dibujarQuiz(quizActual);
            
        } catch (error) {
            console.error(error);
            contenido.innerHTML = "<p style='color: #ff5252; text-align: center;'>Error al generar el Quiz. Revisa la consola.</p>";
        }
    });
}

// Función para pintar las alternativas en pantalla
function dibujarQuiz(preguntas) {
    const contenido = document.getElementById('contenido-quiz');
    let html = "";

    preguntas.forEach((p, indexPregunta) => {
        html += `
            <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px dashed #444;">
                <p style="font-size: 1.1em; color: #e0e0e0;"><strong>${indexPregunta + 1}. ${p.pregunta}</strong></p>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    ${p.opciones.map((opcion, indexOpcion) => `
                        <button id="btn-quiz-${indexPregunta}-${indexOpcion}" onclick="verificarRespuesta(${indexPregunta},${indexOpcion})" style="text-align: left; padding: 12px; background: #2a2a2a; color: white; border: 1px solid #555; border-radius: 6px; cursor: pointer; transition: 0.2s; font-size: 0.95em;">
                            ${opcion}
                        </button>
                    `).join('')}
                </div>
                <div id="explicacion-${indexPregunta}" style="display: none; margin-top: 15px; font-size: 0.9em; padding: 12px; border-radius: 6px; line-height: 1.5;"></div>
            </div>
        `;
    });

    contenido.innerHTML = html;
}

// Función que corrige al hacer clic
function verificarRespuesta(indexPregunta, indexOpcionClick) {
    const pregunta = quizActual[indexPregunta];
    const esCorrecta = (pregunta.respuesta_correcta === indexOpcionClick);
    
    // 1. Bloqueamos todas las opciones para que no haga doble clic
    pregunta.opciones.forEach((_, i) => {
        const btn = document.getElementById(`btn-quiz-${indexPregunta}-${i}`);
        btn.disabled = true;
        btn.style.cursor = "default";
        
        // Pintamos la correcta de verde
        if (i === pregunta.respuesta_correcta) {
            btn.style.background = "#1b5e20"; 
            btn.style.borderColor = "#4caf50";
        }
    });

    // 2. Si se equivocó, pintamos la que eligió de rojo
    if (!esCorrecta) {
        const btnError = document.getElementById(`btn-quiz-${indexPregunta}-${indexOpcionClick}`);
        btnError.style.background = "#b71c1c"; 
        btnError.style.borderColor = "#ff5252";
    }

    // 3. Mostramos la explicación de la IA
    const divExplicacion = document.getElementById(`explicacion-${indexPregunta}`);
    divExplicacion.style.display = "block";
    divExplicacion.style.background = esCorrecta ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)";
    divExplicacion.style.borderLeft = esCorrecta ? "4px solid #4caf50" : "4px solid #f44336";
    divExplicacion.innerHTML = `<strong>${esCorrecta ? '¡Excelente! 🎉' : 'Fallaste ❌'}</strong><br>${pregunta.explicacion}`;
}

// Función para cerrar la ventana
function cerrarQuiz() {
    document.getElementById('modal-quiz').style.display = 'none';
}