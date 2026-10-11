require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

if (!process.env.MP_ACCESS_TOKEN) {
    console.warn("ADVERTENCIA: falta MP_ACCESS_TOKEN en el archivo .env");
}

const mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

const preference = new Preference(mercadopago);

function generarCodigo(prefijo) {
    return prefijo + "-" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

app.post("/api/create-preference", async (req, res) => {

    try {

        const { cliente, items } = req.body;

        if (!cliente || !cliente.nombre || !cliente.email) {
            return res.status(400).json({
                error: "Faltan los datos del comprador."
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                error: "El carrito esta vacio."
            });
        }

        const itemsMercadoPago = items.map(item => ({
            id: String(item.id),
            title: String(item.nombre),
            quantity: Number(item.cantidad),
            unit_price: Number(item.precio),
            currency_id: "ARS"
        }));

        const referencia = generarCodigo("ORD");

        const body = {
            items: itemsMercadoPago,

            payer: {
                name: cliente.nombre,
                email: cliente.email
            },

            external_reference: referencia,

            back_urls: {
                success: `${process.env.PUBLIC_BASE_URL}/pago-exitoso.html`,
                failure: `${process.env.PUBLIC_BASE_URL}/pago-fallido.html`,
                pending: `${process.env.PUBLIC_BASE_URL}/pago-pendiente.html`
            },

            auto_return: "approved",

            notification_url:
                `${process.env.PUBLIC_BASE_URL}/api/webhook/mercadopago`
        };

        const resultado = await preference.create({
            body: body
        });

        res.json({
            id: resultado.id,
            init_point: resultado.init_point,
            external_reference: referencia
        });

    } catch (error) {

        console.error("Error Mercado Pago:", error);

        res.status(500).json({
            error: "No se pudo crear el pago."
        });
    }
});

app.post("/api/webhook/mercadopago", async (req, res) => {

    console.log("Webhook recibido:");

    console.log(
        JSON.stringify(req.body, null, 2)
    );

    res.sendStatus(200);
});

app.get("/api/health", (req, res) => {

    res.json({
        ok: true,
        mensaje: "Servidor funcionando correctamente."
    });
});

app.listen(PORT, () => {

    console.log(
        `Tienda funcionando en http://localhost:${PORT}`
    );

});