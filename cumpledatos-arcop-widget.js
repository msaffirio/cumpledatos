/*!
 * CumpleDatos · Widget de Captura de Solicitudes ARCO-P
 * ARTION — snippet embebible para el sitio web del Cliente
 * ------------------------------------------------------------------
 * USO EN EL SITIO DEL CLIENTE (una sola línea):
 *
 *   <script src="https://cdn.artion.cl/cumpledatos-arcop-widget.js"
 *           data-client="ACME"
 *           data-endpoint="https://puente.artion.cl/api/arcop"
 *           data-privacy-url="https://acme.cl/politica-privacidad"
 *           data-position="bottom-right"
 *           data-offset="20"
 *           data-font-size="14"
 *           defer></script>
 *
 * data-position acepta: bottom-right (por defecto), bottom-left, top-right, top-left
 * data-offset: separación en px desde el borde de la pantalla (por defecto 20)
 * data-font-size: tamaño en px del texto del botón flotante (por defecto 14)
 *
 * Por defecto inyecta un botón flotante "Ejercer mis derechos ARCO-P".
 * Si el Cliente ya tiene su propio botón, basta con agregarle el atributo
 * data-cdt-arcop-open y el widget se enlaza a él en vez de crear uno nuevo:
 *
 *   <button data-cdt-arcop-open>Ejercer mis derechos ARCO-P</button>
 *
 * ------------------------------------------------------------------
 * CONTRATO CON EL PUENTE ARTION (backend, no lo cubre este snippet)
 *
 *   POST {data-endpoint}   Content-Type: multipart/form-data
 *   Campos enviados: client_id, canal, nombre, rut, email, telefono,
 *                    tipo_derecho, descripcion, origen_url, sitio_web (honeypot),
 *                    adjunto_identidad (file, opcional)
 *
 *   Respuesta esperada (JSON):
 *     200 OK   { "ok": true,  "folio": "ARC-2026-000123", "fecha_limite": "2026-08-18" }
 *     4xx/5xx  { "ok": false, "error": "mensaje para el titular" }
 *
 *   El widget NUNCA lee ni recibe datos ya registrados en CumpleDatos:
 *   solo envía la solicitud y muestra folio + fecha límite de vuelta.
 * ------------------------------------------------------------------
 */
(function () {
  "use strict";

  var SCRIPT = document.currentScript;
  var CFG = {
    clientId: SCRIPT.getAttribute("data-client") || "",
    endpoint: SCRIPT.getAttribute("data-endpoint") || "",
    privacyUrl: SCRIPT.getAttribute("data-privacy-url") || "",
    autoButton: SCRIPT.getAttribute("data-auto-button") !== "false",
    colorPrimary: SCRIPT.getAttribute("data-color-primary") || "#FFFFFF",
    colorAccent: SCRIPT.getAttribute("data-color-accent") || "#1F5C8B",
    colorSuccess: SCRIPT.getAttribute("data-color-success") || "#0F766E",
    label: SCRIPT.getAttribute("data-label") || "Ejercer mis derechos ARCO-P",
    position: SCRIPT.getAttribute("data-position") || "bottom-right",
    offset: parseInt(SCRIPT.getAttribute("data-offset"), 10) || 20,
    fontSize: parseInt(SCRIPT.getAttribute("data-font-size"), 10) || 14,
  };

  var POSITION_CSS = {
    "bottom-right": "right:" + CFG.offset + "px;bottom:" + CFG.offset + "px;",
    "bottom-left": "left:" + CFG.offset + "px;bottom:" + CFG.offset + "px;",
    "top-right": "right:" + CFG.offset + "px;top:" + CFG.offset + "px;",
    "top-left": "left:" + CFG.offset + "px;top:" + CFG.offset + "px;",
  }[CFG.position] || "right:" + CFG.offset + "px;bottom:" + CFG.offset + "px;";

  if (!CFG.endpoint || !CFG.clientId) {
    console.error("[CumpleDatos ARCO-P] Faltan data-client y/o data-endpoint en el <script>.");
    return;
  }

  var NS = "cdt-arcop";
  if (document.getElementById(NS + "-styles")) return; // evita doble inyección

  /* ---------- Estilos (namespaced, no interfieren con el sitio host) ---------- */
  var style = document.createElement("style");
  style.id = NS + "-styles";
  style.textContent = [
    "." + NS + "-fab{position:fixed;" + POSITION_CSS + "z-index:999998;",
    "background:" + CFG.colorPrimary + ";color:#fff;border:none;border-radius:999px;",
    "padding:12px 18px;font:600 " + CFG.fontSize + "px/1.2 Arial,sans-serif;cursor:pointer;",
    "box-shadow:0 4px 14px rgba(0,0,0,.25);}",
    "." + NS + "-overlay{position:fixed;inset:0;background:rgba(14,40,65,.55);",
    "z-index:999999;display:none;align-items:center;justify-content:center;padding:16px;}",
    "." + NS + "-overlay.is-open{display:flex;}",
    "." + NS + "-modal{background:#fff;max-width:480px;width:100%;border-radius:12px;",
    "padding:24px;font:14px/1.5 Arial,sans-serif;color:#222;max-height:90vh;overflow:auto;",
    "position:relative;}",
    "." + NS + "-modal h3{margin:0 0 4px;color:" + CFG.colorPrimary + ";font-size:18px;}",
    "." + NS + "-modal p.sub{margin:0 0 16px;color:#666;font-size:12.5px;}",
    "." + NS + "-close{position:absolute;top:14px;right:16px;border:none;background:none;",
    "font-size:20px;line-height:1;cursor:pointer;color:#888;}",
    "." + NS + "-field{margin-bottom:12px;}",
    "." + NS + "-field label{display:block;font-weight:600;margin-bottom:4px;font-size:12.5px;}",
    "." + NS + "-field input,." + NS + "-field select,." + NS + "-field textarea{",
    "width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #ccc;border-radius:6px;font:13px Arial,sans-serif;}",
    "." + NS + "-field textarea{min-height:70px;resize:vertical;}",
    "." + NS + "-hp{position:absolute;left:-9999px;}",
    "." + NS + "-terms{font-size:12px;display:flex;gap:8px;align-items:flex-start;margin:14px 0;}",
    "." + NS + "-submit{width:100%;background:" + CFG.colorAccent + ";color:#fff;border:none;",
    "border-radius:6px;padding:11px;font:600 14px Arial,sans-serif;cursor:pointer;}",
    "." + NS + "-submit:disabled{opacity:.6;cursor:default;}",
    "." + NS + "-error{color:#B3261E;font-size:12.5px;margin-top:8px;}",
    "." + NS + "-success{text-align:center;padding:8px 0;}",
    "." + NS + "-success .folio{display:inline-block;margin-top:10px;padding:8px 14px;",
    "border-radius:6px;background:" + CFG.colorSuccess + "1A;color:" + CFG.colorSuccess + ";font-weight:700;}",
  ].join("");
  document.head.appendChild(style);

  /* ---------- Marcado del modal ---------- */
  var overlay = document.createElement("div");
  overlay.className = NS + "-overlay";
  overlay.innerHTML =
    '<div class="' + NS + '-modal" role="dialog" aria-modal="true" aria-labelledby="' + NS + '-title">' +
      '<button type="button" class="' + NS + '-close" aria-label="Cerrar">&times;</button>' +
      '<h3 id="' + NS + '-title">Ejercer un derecho ARCO-P</h3>' +
      '<p class="sub">Acceso, Rectificación, Cancelación, Oposición o Portabilidad de tus datos personales.</p>' +
      '<form id="' + NS + '-form" novalidate>' +
        '<input type="text" name="sitio_web" class="' + NS + '-hp" tabindex="-1" autocomplete="off">' +
        '<div class="' + NS + '-field"><label>Nombre completo *</label><input type="text" name="nombre" required></div>' +
        '<div class="' + NS + '-field"><label>RUT *</label><input type="text" name="rut" placeholder="12345678-9" required></div>' +
        '<div class="' + NS + '-field"><label>Correo electrónico *</label><input type="email" name="email" required></div>' +
        '<div class="' + NS + '-field"><label>Teléfono</label><input type="tel" name="telefono"></div>' +
        '<div class="' + NS + '-field"><label>Derecho que deseas ejercer *</label>' +
          '<select name="tipo_derecho" required>' +
            '<option value="">Selecciona una opción</option>' +
            '<option value="Acceso">Acceso</option>' +
            '<option value="Rectificacion">Rectificación</option>' +
            '<option value="Cancelacion">Cancelación / Supresión</option>' +
            '<option value="Oposicion">Oposición</option>' +
            '<option value="Portabilidad">Portabilidad</option>' +
          '</select></div>' +
        '<div class="' + NS + '-field"><label>Describe tu solicitud *</label><textarea name="descripcion" required></textarea></div>' +
        '<div class="' + NS + '-field"><label>Documento de identidad (opcional)</label><input type="file" name="adjunto_identidad" accept=".pdf,.jpg,.jpeg,.png"></div>' +
        '<label class="' + NS + '-terms"><input type="checkbox" name="acepto" required>' +
          '<span>He leído y acepto el tratamiento de estos datos para gestionar mi solicitud' +
          (CFG.privacyUrl ? ' según la <a href="' + CFG.privacyUrl + '" target="_blank" rel="noopener">política de privacidad</a>.' : '.') +
          '</span></label>' +
        '<button type="submit" class="' + NS + '-submit">Enviar solicitud</button>' +
        '<div class="' + NS + '-error" hidden></div>' +
      '</form>' +
    '</div>';
  document.body.appendChild(overlay);

  var form = overlay.querySelector("#" + NS + "-form");
  var modalBody = overlay.querySelector("." + NS + "-modal");
  var errorBox = overlay.querySelector("." + NS + "-error");

  function openModal() {
    overlay.classList.add("is-open");
  }
  function closeModal() {
    overlay.classList.remove("is-open");
  }
  overlay.querySelector("." + NS + "-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  /* ---------- Validación de RUT chileno (módulo 11) ---------- */
  function validaRut(rutInput) {
    var rut = rutInput.replace(/\./g, "").replace("-", "").toUpperCase().trim();
    if (!/^[0-9]+[0-9K]$/.test(rut)) return false;
    var cuerpo = rut.slice(0, -1);
    var dv = rut.slice(-1);
    var suma = 0, mult = 2;
    for (var i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    var resto = 11 - (suma % 11);
    var dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
    return dv === dvEsperado;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  /* ---------- Enlazar disparadores ---------- */
  var triggers = document.querySelectorAll("[data-cdt-arcop-open]");
  triggers.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });

  if (CFG.autoButton && triggers.length === 0) {
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = NS + "-fab";
    fab.textContent = CFG.label;
    fab.addEventListener("click", openModal);
    document.body.appendChild(fab);
  }

  // API pública: útil en Webflow/Squarespace/HTML propio, donde se puede
  // llamar directamente window.cdtArcop.open() desde el onClick del botón.
  window.cdtArcop = { open: openModal, close: closeModal };

  // Puente por postMessage: en Wix, el código de página de Velo corre en un
  // Web Worker sin acceso al window real, así que no puede llamar
  // window.cdtArcop directamente. En su lugar, un elemento "Embed HTML" de
  // Wix (que SÍ vive en un iframe normal del navegador) puede enviar este
  // mensaje para abrir el modal, sin pasar por Velo.
  window.addEventListener("message", function (e) {
    if (e && e.data && e.data.type === "cdt-arcop-open") openModal();
  });

  /* ---------- Envío ---------- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    var data = new FormData(form);

    if (data.get("sitio_web")) return; // honeypot: probable bot, se descarta en silencio

    if (!validaRut(String(data.get("rut") || ""))) {
      showError("El RUT ingresado no es válido.");
      return;
    }
    if (!data.get("acepto")) {
      showError("Debes aceptar el tratamiento de tus datos para continuar.");
      return;
    }

    data.set("client_id", CFG.clientId);
    data.set("canal", "web");
    data.set("origen_url", window.location.href);
    data.delete("sitio_web");

    var submitBtn = form.querySelector("." + NS + "-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    fetch(CFG.endpoint, { method: "POST", body: data })
      .then(function (res) {
        return res.json().then(function (json) {
          return { ok: res.ok, json: json };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.json.ok) {
          throw new Error((result.json && result.json.error) || "No pudimos enviar tu solicitud. Intenta nuevamente.");
        }
        modalBody.innerHTML =
          '<button type="button" class="' + NS + '-close" aria-label="Cerrar">&times;</button>' +
          '<div class="' + NS + '-success">' +
            '<h3>Solicitud recibida</h3>' +
            '<p class="sub">Te responderemos dentro del plazo legal establecido por la Ley 21.719.</p>' +
            '<div class="folio">Folio: ' + result.json.folio + '</div>' +
            '<p class="sub" style="margin-top:10px;">Fecha límite de respuesta: ' + result.json.fecha_limite + '</p>' +
          '</div>';
        modalBody.querySelector("." + NS + "-close").addEventListener("click", closeModal);
      })
      .catch(function (err) {
        showError(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar solicitud";
      });
  });
})();
