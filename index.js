const axios = require('axios');
const { exec } = require('child_process');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const collectionPath = 'API-testing.postman_collection.json';
const reportPath = './newman/';
const webhookUrl = 'https://periferiaitgroup.webhook.office.com/webhookb2/fb971db9-c266-4869-858e-53f48c509b0d@e1bdfea1-5fcd-44c1-8196-dfa7afddd8c5/IncomingWebhook/24afe1ded301403892dfb5888a25aa09/7adc61c4-381e-41c6-a5de-4f97c9700f08/V2Q4UOSpdslc-dF1hinynktbL6tCCJNeY-hUAaBEostM01'; // URL del Webhook de Teams

const holidaysUrl = 'https://date.nager.at/api/v3/publicholidays/2024/CO';

async function isHolidayToday() {
    try {
        const response = await axios.get(holidaysUrl);
        const holidays = response.data;
        
        const today = new Date().toISOString().split('T')[0]; // Fecha actual en formato YYYY-MM-DD
        const holidayToday = holidays.find(holiday => holiday.date === today);
        
        return holidayToday ? true : false; // Retorna true si hoy es festivo, de lo contrario false
    } catch (error) {
        console.error('Error al obtener los festivos:', error);
        return false; // En caso de error, asumimos que no es festivo
    }
}

async function ejecutarColeccion() {
    const holiday = await isHolidayToday();
    if (holiday) {
        console.log('Hoy es festivo en Colombia, ejecutando reporte y notificando a Teams.');
    } else {
        console.log('Hoy no es festivo, ejecutando reporte de Newman.');
    }

    exec(`newman run ${collectionPath} -r htmlextra`, (error, stdout, stderr) => {
        if (error) {
            console.error('Error ejecutando Newman:', error);
            return;
        }
        console.log('Colección ejecutada exitosamente.');

        // Buscar el archivo más reciente en la carpeta de reportes
        const latestReport = getLatestReport(reportPath);
        if (latestReport) {
            // Leer el contenido del reporte HTML
            const reportLink = uploadReportToServer(latestReport); // Implementa una función para subir el archivo a un servidor

            if (reportLink) {
                // Enviar el enlace del reporte a Teams
                sendToTeams(reportLink, holiday);
            }
        }
    });
}

// Función para enviar el enlace del reporte a Teams
function sendToTeams(link, isHoliday) {
    const message = {
        text: `El reporte de los estados de Experiences team, periticket y Periferia IT Group está disponible en el siguiente enlace: [Ver Reporte](${link}). ${isHoliday ? 'Hoy es un día festivo en Colombia.' : ''}`
    };

    axios.post(webhookUrl, message)
        .then(() => console.log('Mensaje enviado a Teams.'))
        .catch(err => console.error('Error enviando mensaje a Teams:', err));
}

// Función para buscar el archivo más reciente en la carpeta de reportes
function getLatestReport(directory) {
    const files = fs.readdirSync(directory);
    const reportFiles = files.filter(file => file.endsWith('.html')); // Filtra solo los archivos .html
    if (reportFiles.length === 0) {
        console.log('No se encontraron archivos de reporte.');
        return null;
    }

    // Ordenar los archivos por la fecha de creación (el archivo más reciente primero)
    const latestFile = reportFiles.sort((a, b) => {
        const aTime = fs.statSync(path.join(directory, a)).mtime;
        const bTime = fs.statSync(path.join(directory, b)).mtime;
        return bTime - aTime; // Si bTime > aTime, b será primero (archivo más reciente)
    })[0];

    console.log(`Último reporte generado: ${latestFile}`);
    return path.join(directory, latestFile); // Devuelve la ruta completa del archivo más reciente
}

// Función simulada para subir el archivo a un servidor
function uploadReportToServer(filePath) {
    console.log(`Simulación de subida del archivo: ${filePath}`);
    // Aquí debes implementar la lógica para subir el archivo al servidor
    return 'https://example.com/path/to/report.html'; // Reemplaza con la URL pública
}

// Programar las tareas usando cron

// Ejecutar el viernes a las 9:00 AM
cron.schedule('0 9 * * 5', () => {
    console.log('Ejecutando reporte el viernes a las 9:00 AM');
    ejecutarColeccion();
});

// Ejecutar el viernes a las 9:00 PM
cron.schedule('0 21 * * 5', () => {
    console.log('Ejecutando reporte el viernes a las 9:00 PM');
    ejecutarColeccion();
});

// Ejecutar los sábados y domingos a las 9:00 AM y 9:00 PM
cron.schedule('0 9 * * 6,0', () => {
    console.log('Ejecutando reporte el sábado o domingo a las 9:00 AM');
    ejecutarColeccion();
});

cron.schedule('0 21 * * 6,0', () => {
    console.log('Ejecutando reporte el sábado o domingo a las 9:00 PM');
    ejecutarColeccion();
});

// Ejecutar el jueves a las 6:25 PM (y enviar reporte si es necesario)
cron.schedule('30 8 * * 1', () => {
    console.log('Ejecutando reporte el jueves a las 6:25 PM');
    ejecutarColeccion();
});

cron.schedule('18 11 * * 5', () => {
    console.log('Ejecutando reporte el jueves a las 6:25 PM');
    ejecutarColeccion();
});
