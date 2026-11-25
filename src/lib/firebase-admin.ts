'use server';

import * as admin from 'firebase-admin';

/*
 * =============================================================================
 *   ATENCIÓN: SE REQUIERE ACCIÓN MANUAL PARA SOLUCIONAR UN ERROR CRÍTICO
 * =============================================================================
 *
 * El error "Invalid PEM formatted message" o "UNAUTHENTICATED" se debe a que la
 * clave privada en el objeto `serviceAccount` a continuación está corrupta o
 * es inválida.
 *
 * Para resolverlo, debes generar una NUEVA CLAVE y reemplazarla.
 *
 * SIGUE ESTOS PASOS:
 *
 * 1. VE A LA CONSOLA DE FIREBASE:
 *    - Abre tu proyecto de Firebase.
 *    - Haz clic en el ícono de engranaje (Configuración del proyecto).
 *    - Ve a la pestaña "Cuentas de servicio".
 *
 * 2. GENERA UNA NUEVA CLAVE PRIVADA:
 *    - Busca la cuenta de servicio que empieza con "firebase-adminsdk-".
 *    - Haz clic en "Generar nueva clave privada".
 *    - Se descargará un archivo JSON.
 *
 * 3. REEMPLAZA LAS CREDENCIALES A CONTINUACIÓN:
 *    - Abre el archivo JSON que descargaste.
 *    - Copia el valor completo del campo `private_key` (es una cadena larga
 *      que empieza con "-----BEGIN PRIVATE KEY-----").
 *    - Pega esa nueva clave como valor de `private_key` en el objeto de abajo,
 *      reemplazando la clave actual.
 *    - Asegúrate también de que los valores de `project_id`, `private_key_id`,
 *      y `client_email` coincidan con los de tu nuevo archivo JSON.
 *
 * Una vez reemplazadas las credenciales, el error se resolverá.
 * =============================================================================
 */
const serviceAccount = {
  "type": "service_account",
  "project_id": "proyectum",
  "private_key_id": "90b16f6583565403561a3371424b450531557025",
  "private_key": `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCEncKND4l+V1LO\nSzxNcuOdJrUl90B+v8CKKMVnKRTJt0RsEdeTtyGPCNQVoRvLaAxxDrZVhiWOtpcC\nnboPsLzkiDIiHkaYFdKpt27Pocp6/BlpdpQ4Kj0Szh73rItXPDKGqay75d64K13k\nxypDaNNYbafuZFQM6whVxM6LY6G7d7wlQwI7Ww8la9Q4LCrvuBDP7P6tdiMIL64k\nnFDwXGru3Oqfj74bn/kW42jAAjLasRf4GRdy4A3KIqb9i/3ycz9AMODd1Q1tPDe5\nZAkbmzRezqhjf0LJHjE/QMmJsNWDn07Rp/mkQuj9k+usFJ/newlAZ9s/booab+Cr\nOGDEw2QPAgMBAAECggEAE+Gs4EX4iHg3TKsrLAycgsZh+QJOPnz+ihfzrvQR5EM1\nSaMLzTRIHoVQemT6tu4Z6LyFFGGgnCUpPYtU8MjqgLPJxE4Cqlv3Ma9zjZhFXqu7\nHucCm0BQg1MN1yFx4GRWH38s4Mc6XST563RPvzxmFvHq77VF2Tab5h6JEoz0xcHF\n3hcgaijx/8HhcvipAWFPQ/q42Zxbu6+7A0C5ohqdXLQDV8FTjvVObN8lfdE5qM4P\nt4AWbHZmhM8le3IvJKmQzIfLMNGQxrZMuf5eRFmVghbBPXqDp3fHpzN9T4UleikQ\n9qAqt4r6/8aVKUAmndOGgJ+DpahRVEePXN6qX6zm8QKBgQC6FlYKWixZ2a2uDTxs\neJxtBOcXiRjaMrivOK+Xei3fY2D2HiR4VxJDuWiaBaMjbJPdBwAi0NTRmal8TcwY\n52ET8XgOzxLMXC5Cf7sV1M5kmv/mLsjq38wa3Q8ixKrRiRFGTucOYwMu/KcY5uHA\nsFkdwn+kv2iRxfXSldfweJ24XwKBgQC2cKSL+eZX7eO3PpV4ijLO3kzVuVPAk0NT\nqc6SjnalX/8VLk5fhCpHet9yPqz63xx9zrADuf059eIUmQMFJuogjYE0HV+mG2sW\nGqEzXzEhDJ8mop71ngsoIdm1mFA1cQc5FzS6FkLGI4mpdHUfIVQ5fVMiKMXeklFx\nmaEpt5ayUQKBgESw+hHYN4bzU6lsOWHRI+0aYjPN596j2ojT4/2GnGhZxvETL2M8\nwQE+793rNs1cxzhP3Tz82ZKFpoq8LRsETlGOUUMmLUpCvNDPVcA5TfbVQKE3o/MP\nqchA0dWDw4qVjkrl1WT6J7KwkP4gPDVk44CYy4WFIpSs/pE9vviFjbMBAoGADpFG\nAktNAj5jjXE43CwkzHHhrrsineDkYlzPutIXVTMqGhXdejECczyzdNreUxXXn5AO\na+3A84zXpY9mN1YZIcpKw8+IoKnVzikIMCLsuFfaqWoYyUH6YBT73k0wMmQ5EGzy\n79zxLgMObfJ3m6m8oO6J4dNhoVkLmceLn9oh9VECgYAcCVME1KNTcummqi3X2HgF\nU3dTHU/Ij63glZSilPbIJ3lCznWezBljj2bHdBdQGBaPQ16Z+SsDQMgJy9LJPAkp\nd9CL7Wk65+KNQz9soeSZCkR/BrOWjLDNpI6nDadgCa0Ajx2plNa0H5pZBR9xZe3S\noJrJK2DqomPld0V+BmDpRQ==\n-----END PRIVATE KEY-----\n`,
  "client_email": "firebase-adminsdk-34j43@proyectum.iam.gserviceaccount.com",
  "client_id": "106884351639088663805",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-34j43%40proyectum.iam.gserviceaccount.com"
};

// This function ensures Firebase Admin is initialized only once.
export async function getAdminDb() {
  if (!admin.apps.length) {
    try {
      // This handles potential formatting issues with the private key.
      const formattedServiceAccount = {
        ...serviceAccount,
        private_key: serviceAccount.private_key.replace(/\\n/g, '\n')
      }
      admin.initializeApp({
        credential: admin.credential.cert(formattedServiceAccount)
      });
    } catch (error: any) {
      console.error('Firebase Admin Initialization Error:', error.message);
      // Throw a more specific error to help with debugging
      throw new Error(`Error fatal al inicializar Firebase Admin SDK: ${error.message}`);
    }
  }
  return admin.firestore();
}
