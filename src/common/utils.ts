/**
 * Extrae y normaliza un número de teléfono de un JID de WhatsApp
 * IMPORTANTE: El JID NO es un número de teléfono directamente, puede contener información adicional
 * 
 * @param jid - JID completo de WhatsApp (ej: "59171234567@s.whatsapp.net" o "59171234567:1@s.whatsapp.net")
 * @returns Número de teléfono normalizado (solo dígitos) o string vacío si no es válido
 */
export function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  
  // El JID puede tener diferentes formatos:
  // - "59171234567@s.whatsapp.net" (usuario normal)
  // - "59171234567:1@s.whatsapp.net" (con información de dispositivo)
  // - "59171234567-1234567890@g.us" (grupo, no es un número de teléfono)
  
  // Primero, verificar si es un grupo (no deberíamos procesar grupos como números de teléfono)
  if (jid.includes('@g.us')) {
    return '';
  }
  
  // Extraer la parte antes del @
  let phone = jid.split('@')[0];
  
  // Si hay un : (dos puntos), tomar solo la parte antes del :
  // Esto es porque WhatsApp puede incluir información del dispositivo como ":1"
  // También puede haber múltiples : en algunos casos
  if (phone.includes(':')) {
    phone = phone.split(':')[0];
  }
  
  // Si hay un - (guión), tomar solo la parte antes del -
  // Esto puede ocurrir en algunos formatos de JID
  if (phone.includes('-')) {
    phone = phone.split('-')[0];
  }
  
  // Eliminar todos los caracteres no numéricos
  phone = phone.replace(/\D/g, '');
  
  // Validar que el número tenga una longitud razonable
  // Los números de teléfono internacionales pueden tener entre 7 y 15 dígitos según ITU-T E.164
  // Pero en la práctica, la mayoría tienen entre 8 y 12 dígitos
  // Si tiene más de 15 dígitos, es probable que haya un error en el formato
  if (phone.length > 15) {
    // Usar console.warn para logging en desarrollo
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[extractPhoneFromJid] Warning: Phone number seems too long (${phone.length} digits) from JID: ${jid}`);
      console.warn(`[extractPhoneFromJid] Extracted phone before truncation: ${phone}`);
    }
    
    // Intentar detectar si hay algún patrón que indique dónde termina el número real
    // Por ejemplo, si el número tiene más de 15 dígitos, podría ser que se concatenó algo
    // Por ahora, limitamos a 15 dígitos como máximo según el estándar E.164
    phone = phone.substring(0, 15);
  }
  
  // Validación adicional: si el número tiene exactamente 15 dígitos pero parece incorrecto
  // (por ejemplo, si todos los dígitos son iguales o tiene un patrón sospechoso)
  if (phone.length === 15) {
    // Verificar si todos los dígitos son iguales (probablemente un error)
    const firstDigit = phone[0];
    if (phone.split('').every(d => d === firstDigit)) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[extractPhoneFromJid] Warning: Phone number has all same digits, might be invalid: ${phone}`);
      }
    }
  }
  
  return phone;
}

/**
 * Normaliza un número de teléfono eliminando todos los caracteres no numéricos
 * Esto asegura que el número se guarde y se use de forma consistente
 * 
 * @param phone - Número de teléfono en cualquier formato
 * @returns Número de teléfono normalizado (solo dígitos)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Si el phone parece ser un JID, extraer el número primero
  if (phone.includes('@')) {
    return extractPhoneFromJid(phone);
  }
  
  // Eliminar todos los caracteres no numéricos
  const normalized = phone.replace(/\D/g, '');
  
  return normalized;
}

