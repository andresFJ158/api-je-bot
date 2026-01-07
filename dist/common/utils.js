"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPhoneFromJid = extractPhoneFromJid;
exports.normalizePhoneNumber = normalizePhoneNumber;
function extractPhoneFromJid(jid) {
    if (!jid)
        return '';
    if (jid.includes('@g.us')) {
        return '';
    }
    let phone = jid.split('@')[0];
    if (phone.includes(':')) {
        phone = phone.split(':')[0];
    }
    if (phone.includes('-')) {
        phone = phone.split('-')[0];
    }
    phone = phone.replace(/\D/g, '');
    if (phone.length > 15) {
        if (typeof console !== 'undefined' && console.warn) {
            console.warn(`[extractPhoneFromJid] Warning: Phone number seems too long (${phone.length} digits) from JID: ${jid}`);
            console.warn(`[extractPhoneFromJid] Extracted phone before truncation: ${phone}`);
        }
        phone = phone.substring(0, 15);
    }
    if (phone.length === 15) {
        const firstDigit = phone[0];
        if (phone.split('').every(d => d === firstDigit)) {
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`[extractPhoneFromJid] Warning: Phone number has all same digits, might be invalid: ${phone}`);
            }
        }
    }
    return phone;
}
function normalizePhoneNumber(phone) {
    if (!phone)
        return '';
    if (phone.includes('@')) {
        return extractPhoneFromJid(phone);
    }
    const normalized = phone.replace(/\D/g, '');
    return normalized;
}
//# sourceMappingURL=utils.js.map